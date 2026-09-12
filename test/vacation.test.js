import assert from 'node:assert/strict';
import test from 'node:test';

import { createDatabase, seedDemoData } from '../src/db.js';
import {
  getVacationPayload,
  setVacationMode,
} from '../src/vacation.js';
import {
  applyRuleToUnassigned,
  assignEmailManually,
} from '../src/workflows.js';

function fixture(context) {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const maya = db.prepare("SELECT * FROM users WHERE email = 'maya@lexflow.local'").get();
  const noah = db.prepare(`
    INSERT INTO users
      (email, name, initials, department, role, organization_id, auth_provider, account_status, department_id)
    VALUES ('noah@lexflow.local', 'Noah Singh', 'NS', 'Legal', 'member', 1, 'local', 'active', ?)
  `).run(maya.department_id);
  return { db, maya, noahId: Number(noah.lastInsertRowid), departmentId: Number(maya.department_id) };
}

function insertEmail(db, { departmentId, assigneeId = null, subject = 'Priority contract review' }) {
  const assigned = assigneeId != null;
  return Number(db.prepare(`
    INSERT INTO emails
      (provider_id, provider, mailbox_address, subject, sender_name, sender_address,
       preview, received_at, status, assignee_id, assigned_at, created_at,
       organization_id, department_id, has_attachments)
    VALUES (?, 'outlook', 'legal@lexflow.local', ?, 'ACME Legal', 'legal@acme.test',
      'Please review this before the deadline.', '2026-09-11T08:00:00.000Z', ?, ?, ?,
      '2026-09-11T08:00:00.000Z', 1, ?, 0)
  `).run(
    `vacation-${Math.random()}`,
    subject,
    assigned ? 'assigned' : 'unassigned',
    assigneeId,
    assigned ? '2026-09-11T08:15:00.000Z' : null,
    departmentId,
  ).lastInsertRowid);
}

test('Vacation Mode validates dates and exposes scheduled and active state', context => {
  const { db, maya } = fixture(context);
  const now = new Date('2026-09-12T06:00:00.000Z');

  assert.throws(() => setVacationMode({
    db, userId: maya.id, organizationId: 1, enabled: true,
    startDate: '2026-09-15', endDate: '2026-09-14', now,
  }), error => error.code === 'INVALID_VACATION_DATES');

  const scheduled = setVacationMode({
    db, userId: maya.id, organizationId: 1, enabled: true,
    startDate: '2026-09-13', endDate: '2026-09-18', now,
  });
  assert.equal(scheduled.status, 'upcoming');
  assert.equal(scheduled.isAway, false);

  const active = getVacationPayload({
    db, userId: maya.id, organizationId: 1,
    now: new Date('2026-09-14T06:00:00.000Z'),
  });
  assert.equal(active.status, 'active');
  assert.equal(active.isAway, true);
});

test('Vacation blocks direct assignment but routes rules to consecutive available coverage', context => {
  const { db, maya, noahId, departmentId } = fixture(context);
  const now = new Date('2026-09-12T06:00:00.000Z');
  setVacationMode({
    db, userId: maya.id, organizationId: 1, enabled: true,
    startDate: '2026-09-12', endDate: '2026-09-18', now,
  });
  const emailId = insertEmail(db, { departmentId });

  assert.throws(() => assignEmailManually({
    db, emailId, assigneeId: maya.id, actorId: maya.id,
    organizationId: 1, departmentId, priority: 20, now,
  }), error => error.code === 'ASSIGNEE_ON_VACATION' && error.status === 409);

  const ruleId = db.prepare("SELECT id FROM rules WHERE name = 'ACME NDA review'").get().id;
  db.prepare("UPDATE emails SET subject = 'ACME NDA priority review', preview = 'ACME NDA' WHERE id = ?").run(emailId);
  assert.deepEqual(applyRuleToUnassigned(db, ruleId, 1, departmentId, now), { assigned: 1 });
  assert.equal(db.prepare('SELECT assignee_id FROM emails WHERE id = ?').get(emailId).assignee_id, noahId);
  assert.equal(db.prepare('SELECT assignee_id FROM rules WHERE id = ?').get(ruleId).assignee_id, maya.id);
  assert.deepEqual(applyRuleToUnassigned(db, ruleId, 1, departmentId, now), { assigned: 0 });
  const returned = setVacationMode({db,userId:maya.id,organizationId:1,enabled:false,now});
  assert.equal(returned.unreviewedBriefing.itemCount, 1);
  assert.equal(returned.unreviewedBriefing.items[0].ruleName, 'ACME NDA review');
  assert.equal(returned.unreviewedBriefing.items[0].workStatus, 'assigned');
  db.prepare("UPDATE emails SET status = 'completed' WHERE id = ?").run(emailId);
  assert.equal(getVacationPayload({db,userId:maya.id,organizationId:1,now}).unreviewedBriefing.items[0].workStatus, 'completed');
});

test('rule coverage wraps within the department and leaves work unassigned when everyone is away', context => {
  const { db, maya, noahId, departmentId } = fixture(context);
  const now = new Date('2026-09-12T06:00:00.000Z');
  const ruleId = db.prepare("SELECT id FROM rules WHERE name = 'ACME NDA review'").get().id;
  db.prepare('UPDATE rules SET assignee_id = ? WHERE id = ?').run(noahId, ruleId);
  setVacationMode({db,userId:noahId,organizationId:1,enabled:true,startDate:'2026-09-12',endDate:'2026-09-18',now});
  const first = insertEmail(db,{departmentId,subject:'ACME NDA'});
  assert.equal(applyRuleToUnassigned(db,ruleId,1,departmentId,now).assigned,1);
  assert.equal(db.prepare('SELECT assignee_id FROM emails WHERE id = ?').get(first).assignee_id,maya.id);
  setVacationMode({db,userId:maya.id,organizationId:1,enabled:true,startDate:'2026-09-12',endDate:'2026-09-18',now});
  const second = insertEmail(db,{departmentId,subject:'ACME NDA'});
  assert.equal(applyRuleToUnassigned(db,ruleId,1,departmentId,now).assigned,0);
  assert.equal(db.prepare('SELECT status FROM emails WHERE id = ?').get(second).status,'unassigned');
});

test('reassigned vacation work becomes a priority-ordered return briefing', context => {
  const { db, maya, noahId, departmentId } = fixture(context);
  const first = insertEmail(db, { departmentId, assigneeId: maya.id, subject: 'Critical renewal approval' });
  const second = insertEmail(db, { departmentId, assigneeId: maya.id, subject: 'Routine account update' });
  const now = new Date('2026-09-12T06:00:00.000Z');
  setVacationMode({
    db, userId: maya.id, organizationId: 1, enabled: true,
    startDate: '2026-09-12', endDate: '2026-09-18', now,
  });

  assignEmailManually({
    db, emailId: second, assigneeId: noahId, actorId: maya.id,
    organizationId: 1, departmentId, priority: 40, now,
  });
  assignEmailManually({
    db, emailId: first, assigneeId: noahId, actorId: maya.id,
    organizationId: 1, departmentId, priority: 10,
    now: new Date('2026-09-12T07:00:00.000Z'),
  });

  const off = setVacationMode({
    db, userId: maya.id, organizationId: 1, enabled: false,
    now: new Date('2026-09-12T08:00:00.000Z'),
  });
  assert.equal(off.status, 'off');
  assert.equal(off.unreviewedBriefing.itemCount, 2);
  assert.deepEqual(
    off.unreviewedBriefing.items.map(item => [item.subject, item.priorityLabel, item.reassignedTo]),
    [
      ['Critical renewal approval', 'Critical', 'Noah Singh'],
      ['Routine account update', 'Low', 'Noah Singh'],
    ],
  );
});
