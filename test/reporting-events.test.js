import assert from 'node:assert/strict';
import test from 'node:test';

import { createDatabase, seedDemoData } from '../src/db.js';
import {
  backfillReportingEvents,
  normalizeTimezone,
  recordTaskEvent,
} from '../src/reporting-events.js';
import {
  createMember,
  createOrganization,
  setOrganizationStatus,
  updateMember,
} from '../src/tenants.js';
import { createDepartment, moveMemberToDepartment } from '../src/workspace.js';
import {
  applyRuleToUnassigned,
  assignEmailManually,
  completeAssignedEmail,
  createSyncRunner,
} from '../src/workflows.js';

const REPORTING_TABLES = [
  'tenant_lifecycle_events',
  'user_lifecycle_events',
  'task_events',
  'rule_assignment_events',
  'graph_sync_runs',
  'graph_sync_department_runs',
  'metrics_completeness',
];

test('metrics reporting schema and UTC organization default are installed', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());

  for (const table of REPORTING_TABLES) {
    assert.equal(
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table)?.name,
      table,
    );
  }
  assert.equal(db.prepare('SELECT timezone FROM organizations WHERE id = 1').get().timezone, 'UTC');
});

test('timezone validation accepts IANA zones and rejects unsafe values', () => {
  assert.equal(normalizeTimezone(' Asia/Kolkata '), 'Asia/Kolkata');
  assert.equal(normalizeTimezone('UTC'), 'UTC');
  assert.throws(
    () => normalizeTimezone('Not/AZone'),
    error => error.code === 'INVALID_TIMEZONE' && error.field === 'timezone',
  );
});

test('bounded reporting backfill is idempotent and does not invent user lifecycle', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  const now = new Date('2026-08-30T12:00:00.000Z');

  const user = db.prepare(`
    INSERT INTO users
      (email, name, initials, department, role, organization_id, auth_provider, account_status)
    VALUES ('worker@lexflow.local', 'Worker', 'W', '', 'member', 1, 'local', 'active')
    RETURNING id
  `).get();
  const department = db.prepare(`
    INSERT INTO departments (name, shared_mailbox, created_at, organization_id)
    VALUES ('Legal', 'legal@lexflow.local', '2026-08-01T00:00:00.000Z', 1)
    RETURNING id
  `).get();
  db.prepare('UPDATE users SET department = ?, department_id = ? WHERE id = ?')
    .run('Legal', department.id, user.id);
  db.prepare('UPDATE departments SET head_user_id = ? WHERE id = ?').run(user.id, department.id);
  db.prepare(`
    INSERT INTO emails
      (provider_id, provider, mailbox_address, subject, sender_name, sender_address,
       preview, received_at, status, assignee_id, assigned_at, completed_by,
       completed_at, created_at, organization_id, department_id)
    VALUES
      ('legacy-completed', 'outlook', 'legal@lexflow.local', 'Legacy subject',
       'Legacy sender', 'sender@example.test', 'Legacy preview',
       '2026-08-10T08:00:00.000Z', 'completed', ?, '2026-08-10T09:00:00.000Z', ?,
       '2026-08-10T10:00:00.000Z', '2026-08-10T08:00:00.000Z', 1, ?)
  `).run(user.id, user.id, department.id);

  backfillReportingEvents(db, now);
  backfillReportingEvents(db, now);

  assert.deepEqual(
    db.prepare(`
      SELECT event_type, source, occurred_at
      FROM task_events
      WHERE dedupe_key LIKE 'backfill:email:%'
      ORDER BY occurred_at
    `).all().map(row => ({ ...row })),
    [
      { event_type: 'assigned', source: 'backfill', occurred_at: '2026-08-10T09:00:00.000Z' },
      { event_type: 'completed', source: 'backfill', occurred_at: '2026-08-10T10:00:00.000Z' },
    ],
  );
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM user_lifecycle_events').get().count, 0);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM metrics_completeness WHERE organization_id = 1").get().count,
    5,
  );
});

test('backfill does not duplicate application-captured tenant or task events', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const user = db.prepare("SELECT id, name FROM users WHERE email = 'maya@lexflow.local'").get();
  const department = db.prepare("SELECT id, name FROM departments WHERE name = 'Legal'").get();
  const email = db.prepare(`
    INSERT INTO emails
      (provider_id, provider, mailbox_address, subject, sender_name, sender_address,
       preview, received_at, status, assignee_id, assigned_at, completed_by,
       completed_at, created_at, organization_id, department_id)
    VALUES
      ('captured-before-backfill', 'outlook', 'legal@lexflow.local', 'Captured',
       'Sender', 'sender@example.test', 'Preview', '2026-08-20T08:00:00.000Z',
       'completed', ?, '2026-08-20T09:00:00.000Z', ?, '2026-08-20T10:00:00.000Z',
       '2026-08-20T08:00:00.000Z', 1, ?)
    RETURNING id
  `).get(user.id, user.id, department.id);

  recordTaskEvent(db, {
    organizationId: 1,
    departmentId: department.id,
    emailId: email.id,
    assigneeId: user.id,
    eventType: 'assigned',
    assignmentSource: 'manual',
    departmentNameSnapshot: department.name,
    assigneeNameSnapshot: user.name,
    receivedAt: '2026-08-20T08:00:00.000Z',
    occurredAt: '2026-08-20T09:00:00.000Z',
  });
  recordTaskEvent(db, {
    organizationId: 1,
    departmentId: department.id,
    emailId: email.id,
    actorId: user.id,
    assigneeId: user.id,
    eventType: 'completed',
    departmentNameSnapshot: department.name,
    assigneeNameSnapshot: user.name,
    receivedAt: '2026-08-20T08:00:00.000Z',
    occurredAt: '2026-08-20T10:00:00.000Z',
  });

  backfillReportingEvents(db, new Date('2026-08-30T12:00:00.000Z'));

  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM tenant_lifecycle_events WHERE organization_id = 1 AND event_type = 'created'").get().count,
    1,
  );
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM task_events WHERE email_id = ?').get(email.id).count, 2);
});

test('tenant and workforce mutations append exact lifecycle events', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  const platform = db.prepare(`
    INSERT INTO users
      (email, name, initials, department, role, organization_id, auth_provider,
       entra_tenant_id, entra_object_id, account_status, is_platform_admin)
    VALUES
      ('platform@example.test', 'Platform', 'P', '', 'admin', NULL, 'entra',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
       'active', 1)
    RETURNING id
  `).get();
  const createdAt = new Date('2026-08-30T08:00:00.000Z');
  const organization = createOrganization({
    db,
    actorId: platform.id,
    now: createdAt,
    input: {
      name: 'Acme',
      domain: 'acme.test',
      entraTenantId: '11111111-1111-4111-8111-111111111111',
      initialAdminEmail: 'admin@acme.test',
      timezone: 'Asia/Kolkata',
    },
  });
  const admin = db.prepare("SELECT id FROM users WHERE organization_id = ? AND role = 'admin'")
    .get(organization.id);
  const addedAt = new Date('2026-08-30T09:00:00.000Z');
  const member = createMember({
    db,
    organizationId: organization.id,
    actorId: admin.id,
    now: addedAt,
    input: { email: 'worker@acme.test' },
  });
  updateMember({
    db,
    organizationId: organization.id,
    memberId: member.id,
    actorId: admin.id,
    now: new Date('2026-08-30T10:00:00.000Z'),
    input: { status: 'disabled' },
  });
  updateMember({
    db,
    organizationId: organization.id,
    memberId: member.id,
    actorId: admin.id,
    now: new Date('2026-08-30T11:00:00.000Z'),
    input: { status: 'active' },
  });
  const legal = createDepartment({
    db,
    organizationId: organization.id,
    name: 'Legal',
    sharedMailbox: 'legal@acme.test',
    now: new Date('2026-08-30T11:30:00.000Z'),
  });
  moveMemberToDepartment({
    db,
    organizationId: organization.id,
    userId: member.id,
    departmentId: legal.id,
    actorId: admin.id,
    now: new Date('2026-08-30T12:00:00.000Z'),
  });
  setOrganizationStatus({
    db,
    organizationId: organization.id,
    status: 'archived',
    actorId: platform.id,
    now: new Date('2026-08-30T13:00:00.000Z'),
  });
  setOrganizationStatus({
    db,
    organizationId: organization.id,
    status: 'active',
    actorId: platform.id,
    now: new Date('2026-08-30T14:00:00.000Z'),
  });

  assert.equal(organization.timezone, 'Asia/Kolkata');
  assert.deepEqual(
    db.prepare(`
      SELECT event_type, actor_id, occurred_at
      FROM tenant_lifecycle_events
      WHERE organization_id = ? AND source = 'application'
      ORDER BY occurred_at
    `).all(organization.id).map(row => ({ ...row })),
    [
      { event_type: 'created', actor_id: platform.id, occurred_at: createdAt.toISOString() },
      { event_type: 'archived', actor_id: platform.id, occurred_at: '2026-08-30T13:00:00.000Z' },
      { event_type: 'restored', actor_id: platform.id, occurred_at: '2026-08-30T14:00:00.000Z' },
    ],
  );
  assert.deepEqual(
    db.prepare(`
      SELECT event_type, department_name_before, department_name_after, role_after
      FROM user_lifecycle_events
      WHERE organization_id = ? AND user_id = ?
      ORDER BY occurred_at, id
    `).all(organization.id, member.id).map(row => ({ ...row })),
    [
      { event_type: 'added', department_name_before: null, department_name_after: null, role_after: 'member' },
      { event_type: 'disabled', department_name_before: null, department_name_after: null, role_after: 'member' },
      { event_type: 'reactivated', department_name_before: null, department_name_after: null, role_after: 'member' },
      { event_type: 'department_moved', department_name_before: null, department_name_after: 'Legal', role_after: 'member' },
      { event_type: 'role_changed', department_name_before: 'Legal', department_name_after: 'Legal', role_after: 'dep_admin' },
    ],
  );
});

test('assignment, reassignment, completion, and rule attribution are append-only', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const legal = db.prepare("SELECT id, head_user_id FROM departments WHERE name = 'Legal'").get();
  const maya = db.prepare("SELECT id FROM users WHERE email = 'maya@lexflow.local'").get();
  const noah = db.prepare(`
    INSERT INTO users
      (email, name, initials, department, role, organization_id, auth_provider,
       account_status, department_id)
    VALUES ('noah@lexflow.local', 'Noah', 'N', 'Legal', 'member', 1, 'local', 'active', ?)
    RETURNING id
  `).get(legal.id);
  const email = db.prepare(`
    INSERT INTO emails
      (provider_id, provider, mailbox_address, subject, sender_name, sender_address,
       preview, received_at, status, created_at, organization_id, department_id)
    VALUES
      ('metrics-task', 'outlook', 'legal@lexflow.local', 'Metrics subject',
       'Sender', 'sender@example.test', 'Preview', '2026-08-30T08:00:00.000Z',
       'unassigned', '2026-08-30T08:00:00.000Z', 1, ?)
    RETURNING id
  `).get(legal.id);
  const rule = db.prepare(`
    INSERT INTO rules
      (name, keywords, sender_filter, assignee_id, priority, enabled, created_at,
       organization_id, department_id)
    VALUES ('Metrics route', 'Metrics', '', ?, 2, 1, '2026-08-30T08:30:00.000Z', 1, ?)
    RETURNING id
  `).get(maya.id, legal.id);

  assert.equal(applyRuleToUnassigned(
    db,
    rule.id,
    1,
    legal.id,
    new Date('2026-08-30T09:00:00.000Z'),
  ).assigned, 1);
  assignEmailManually({
    db,
    emailId: email.id,
    assigneeId: noah.id,
    actorId: legal.head_user_id,
    organizationId: 1,
    departmentId: legal.id,
    now: new Date('2026-08-30T10:00:00.000Z'),
  });
  completeAssignedEmail({
    db,
    emailId: email.id,
    userId: noah.id,
    organizationId: 1,
    now: new Date('2026-08-30T11:00:00.000Z'),
  });

  assert.deepEqual(
    db.prepare(`
      SELECT event_type, assignment_source, assignee_id, previous_assignee_id, occurred_at
      FROM task_events WHERE email_id = ? AND source = 'application'
      ORDER BY occurred_at
    `).all(email.id).map(row => ({ ...row })),
    [
      {
        event_type: 'assigned', assignment_source: 'rule', assignee_id: maya.id,
        previous_assignee_id: null, occurred_at: '2026-08-30T09:00:00.000Z',
      },
      {
        event_type: 'reassigned', assignment_source: 'manual', assignee_id: noah.id,
        previous_assignee_id: maya.id, occurred_at: '2026-08-30T10:00:00.000Z',
      },
      {
        event_type: 'completed', assignment_source: null, assignee_id: noah.id,
        previous_assignee_id: null, occurred_at: '2026-08-30T11:00:00.000Z',
      },
    ],
  );
  assert.deepEqual(
    db.prepare(`
      SELECT rule_name_snapshot, priority_snapshot
      FROM rule_assignment_events
      WHERE organization_id = 1 AND department_id = ?
    `).all(legal.id).map(row => ({ ...row })),
    [{ rule_name_snapshot: 'Metrics route', priority_snapshot: 2 }],
  );
});

test('Graph run history records Outlook sources and excludes Gmail', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const legal = db.prepare("SELECT id, shared_mailbox FROM departments WHERE name = 'Legal'").get();
  const moments = [
    '2026-08-30T09:00:00.000Z',
    '2026-08-30T09:00:02.000Z',
  ];
  let clockIndex = 0;
  const source = provider => ({
    provider,
    organizationId: 1,
    departmentId: legal.id,
    mailboxAddress: provider === 'outlook' ? legal.shared_mailbox : 'owner@gmail.test',
    cursorKey: `metrics:${provider}`,
    async fetchChanges() { return { messages: [], nextCursor: 'cursor' }; },
  });
  const runner = createSyncRunner({
    db,
    sources: [source('outlook'), source('gmail')],
    clock: () => new Date(moments[Math.min(clockIndex++, moments.length - 1)]),
  });

  await runner.run();

  const runs = db.prepare('SELECT * FROM graph_sync_runs').all();
  assert.equal(runs.length, 1);
  assert.equal(runs[0].outcome, 'success');
  assert.equal(runs[0].duration_ms, 2_000);
  assert.deepEqual(
    db.prepare('SELECT mailbox_snapshot, outcome FROM graph_sync_department_runs').all()
      .map(row => ({ ...row })),
    [{ mailbox_snapshot: legal.shared_mailbox, outcome: 'success' }],
  );
});
