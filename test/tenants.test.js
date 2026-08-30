import assert from 'node:assert/strict';
import test from 'node:test';

import { createDatabase } from '../src/db.js';
import {
  createMember,
  createOrganization,
  resolvePrincipal,
  updateMember,
  updateOrganization,
} from '../src/tenants.js';
import {
  createDepartment,
  moveMemberToDepartment,
  setDepartmentHead,
} from '../src/workspace.js';

const tenantId = '11111111-1111-4111-8111-111111111111';
const adminObjectId = '22222222-2222-4222-8222-222222222222';
const memberObjectId = '33333333-3333-4333-8333-333333333333';

function organization(db) {
  return createOrganization({
    db,
    input: {
      name: 'Acme Corporation',
      domain: 'acme.test',
      entraTenantId: tenantId,
      initialAdminEmail: 'admin@acme.test',
    },
    now: new Date('2026-08-29T00:00:00.000Z'),
  });
}

test('tenant identities activate pending members and reject object-id mismatches', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  const org = organization(db);
  assert.equal('initialAdminObjectId' in org, false);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM departments WHERE organization_id = ?').get(org.id).count, 0);
  const pendingAdmin = db.prepare('SELECT department, department_id, entra_object_id FROM users WHERE organization_id = ?').get(org.id);
  assert.equal(pendingAdmin.department, '');
  assert.equal(pendingAdmin.entra_object_id, null);
  const member = createMember({
    db,
    organizationId: org.id,
    input: { email: 'member@acme.test' },
  });
  assert.equal('entraObjectId' in member, false);
  assert.equal(db.prepare('SELECT entra_object_id FROM users WHERE id = ?').get(member.id).entra_object_id, null);

  const access = resolvePrincipal({
    db,
    claims: { tid: tenantId, oid: adminObjectId, email: 'admin@acme.test', name: 'Acme Admin' },
  });
  assert.equal(access.role, 'org_admin');
  assert.equal(access.user.account_status, 'active');

  const memberAccess = resolvePrincipal({
    db,
    claims: { tid: tenantId, oid: memberObjectId, email: member.email, name: 'Acme Member' },
  });
  assert.equal(memberAccess.role, 'member');
  assert.equal(memberAccess.user.account_status, 'active');
  assert.equal(db.prepare('SELECT entra_object_id FROM users WHERE id = ?').get(member.id).entra_object_id, memberObjectId);

  assert.throws(
    () => resolvePrincipal({
      db,
      claims: { tid: tenantId, oid: '44444444-4444-4444-8444-444444444444', email: member.email },
    }),
    error => error.code === 'IDENTITY_MISMATCH',
  );
});

test('last active OrgAdmin cannot be demoted or disabled', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  const org = organization(db);
  const admin = db.prepare('SELECT id FROM users WHERE organization_id = ?').get(org.id);
  assert.throws(
    () => updateMember({ db, organizationId: org.id, memberId: admin.id, input: { role: 'member' } }),
    error => error.code === 'LAST_ADMIN',
  );
  assert.throws(
    () => updateMember({ db, organizationId: org.id, memberId: admin.id, input: { status: 'disabled' } }),
    error => error.code === 'LAST_ADMIN',
  );
});

test('organization reporting timezone defaults to Asia/Kolkata and accepts only IANA zones', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  const org = organization(db);
  assert.equal(org.timezone, 'Asia/Kolkata');

  const updated = updateOrganization({
    db,
    organizationId: org.id,
    input: { name: org.name, domain: org.domain, timezone: 'Asia/Kolkata' },
    updateAdmin: false,
  });
  assert.equal(updated.timezone, 'Asia/Kolkata');
  assert.throws(
    () => updateOrganization({
      db,
      organizationId: org.id,
      input: { name: org.name, domain: org.domain, timezone: 'Local/Guess' },
      updateAdmin: false,
    }),
    error => error.code === 'INVALID_TIMEZONE' && error.field === 'timezone',
  );
});

test('department heads require replacement and members with email work cannot become OrgAdmin', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  const org = organization(db);
  const first = createMember({ db, organizationId: org.id, input: { email: 'first@acme.test' } });
  const second = createMember({ db, organizationId: org.id, input: { email: 'second@acme.test' } });
  const department = createDepartment({
    db,
    organizationId: org.id,
    name: 'Legal',
    sharedMailbox: 'legal@acme.test',
  });

  moveMemberToDepartment({
    db,
    organizationId: org.id,
    userId: first.id,
    departmentId: department.id,
  });
  moveMemberToDepartment({
    db,
    organizationId: org.id,
    userId: second.id,
    departmentId: department.id,
  });
  assert.equal(db.prepare('SELECT head_user_id FROM departments WHERE id = ?').get(department.id).head_user_id, first.id);
  assert.throws(
    () => updateMember({
      db,
      organizationId: org.id,
      memberId: first.id,
      input: { status: 'disabled' },
    }),
    error => error.code === 'DEPARTMENT_HEAD_REPLACEMENT_REQUIRED',
  );

  setDepartmentHead({
    db,
    organizationId: org.id,
    departmentId: department.id,
    memberId: second.id,
  });
  const emailId = Number(db.prepare(`
    INSERT INTO emails
      (provider_id, subject, sender_name, sender_address, preview, received_at,
       status, assignee_id, assigned_at, created_at, organization_id, department_id)
    VALUES ('promotion-work', 'Open legal work', 'Sender', 'sender@example.test', 'Review', ?,
      'assigned', ?, ?, ?, ?, ?)
  `).run(
    '2026-08-30T00:00:00.000Z',
    first.id,
    '2026-08-30T00:00:00.000Z',
    '2026-08-30T00:00:00.000Z',
    org.id,
    department.id,
  ).lastInsertRowid);
  db.prepare(`
    INSERT INTO rules
      (name, keywords, assignee_id, priority, enabled, created_at, organization_id, department_id)
    VALUES ('Open legal rule', 'legal', ?, 10, 1, ?, ?, ?)
  `).run(first.id, '2026-08-30T00:00:00.000Z', org.id, department.id);

  assert.throws(
    () => updateMember({
      db,
      organizationId: org.id,
      memberId: first.id,
      input: { role: 'org_admin' },
    }),
    error => error.code === 'MEMBER_HAS_EMAIL_WORK',
  );
  db.prepare('DELETE FROM rules WHERE assignee_id = ? AND organization_id = ?').run(first.id, org.id);
  db.prepare("UPDATE emails SET status = 'completed', completed_by = ?, completed_at = ? WHERE id = ?")
    .run(first.id, '2026-08-30T01:00:00.000Z', emailId);
  const promoted = updateMember({
    db,
    organizationId: org.id,
    memberId: first.id,
    input: { role: 'org_admin' },
  });
  assert.equal(promoted.role, 'org_admin');
  assert.equal(promoted.departmentId, null);
});

test('PlatformAdmin can replace the initial OrgAdmin email and invalidate its identity binding', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  const org = organization(db);
  resolvePrincipal({
    db,
    claims: { tid: tenantId, oid: adminObjectId, email: 'admin@acme.test', name: 'Acme Admin' },
  });
  db.prepare(`
    INSERT INTO sessions (id, user_id, organization_id, expires_at)
    VALUES ('session-1', (SELECT id FROM users WHERE organization_id = ?), ?, ?)
  `).run(org.id, org.id, '2026-08-30T00:00:00.000Z');

  const updated = updateOrganization({
    db,
    organizationId: org.id,
    input: {
      name: org.name,
      domain: org.domain,
      initialAdminEmail: 'new-admin@acme.test',
    },
  });

  assert.equal(updated.entraTenantId, tenantId);
  assert.equal(updated.initialAdminEmail, 'new-admin@acme.test');
  assert.equal('initialAdminObjectId' in updated, false);
  const admin = db.prepare('SELECT role, account_status, email, entra_object_id FROM users WHERE organization_id = ?').get(org.id);
  assert.equal(admin.role, 'admin');
  assert.equal(admin.account_status, 'pending');
  assert.equal(admin.email, 'new-admin@acme.test');
  assert.equal(admin.entra_object_id, null);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM sessions WHERE organization_id = ?').get(org.id).count, 0);
});

test('initial OrgAdmin replacement validates the domain and preserves a binding when email is unchanged', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  const org = organization(db);
  resolvePrincipal({
    db,
    claims: { tid: tenantId, oid: adminObjectId, email: 'admin@acme.test', name: 'Acme Admin' },
  });
  const original = db.prepare('SELECT email, entra_object_id FROM users WHERE organization_id = ? AND role = \'admin\'').get(org.id);

  assert.throws(
    () => updateOrganization({ db, organizationId: org.id, input: { name: org.name, domain: org.domain, initialAdminEmail: 'admin@other.test' } }),
    error => error.code === 'INVALID_INPUT' && error.field === 'initialAdminEmail',
  );
  updateOrganization({ db, organizationId: org.id, input: { name: org.name, domain: org.domain, initialAdminEmail: 'admin@acme.test' } });
  assert.deepEqual(db.prepare('SELECT email, entra_object_id FROM users WHERE organization_id = ? AND role = \'admin\'').get(org.id), original);
});

test('PlatformAdmin claim creates a platform identity without customer membership', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  const access = resolvePrincipal({
    db,
    claims: {
      tid: '55555555-5555-4555-8555-555555555555',
      oid: '66666666-6666-4666-8666-666666666666',
      email: 'developer@platform.test',
      name: 'Platform Developer',
      roles: ['PlatformAdmin'],
    },
  });
  assert.equal(access.role, 'platform_admin');
  assert.equal(access.user.organization_id, null);
  assert.equal(access.user.is_platform_admin, 1);
});
