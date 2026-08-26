import assert from 'node:assert/strict';
import test from 'node:test';

import { createAlertRunner, evaluateOverdueAlerts } from '../src/alerts.js';
import { loadConfig } from '../src/config.js';
import { createDatabase, seedDemoData } from '../src/db.js';
import { assignEmailManually, completeAssignedEmail } from '../src/workflows.js';
import { updateWorkspaceSettings } from '../src/workspace.js';

function user(db, email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function addSecondAdmin(db) {
  db.prepare(`
    INSERT INTO users (email, name, initials, department, role, password_hash)
    VALUES ('ops2@lexflow.local', 'Second Admin', 'SA', 'Operations', 'admin', 'test')
  `).run();
  return user(db, 'ops2@lexflow.local');
}

function insertEmail(db, {
  providerId,
  status,
  assigneeId = null,
  receivedAt,
  assignedAt = null,
  createdAt,
}) {
  return Number(db.prepare(`
    INSERT INTO emails
      (provider_id, subject, sender_name, sender_address, preview, received_at,
       outlook_url, status, assignee_id, assigned_at, created_at)
    VALUES (?, ?, 'Customer', 'customer@example.test', 'Please review.', ?, NULL, ?, ?, ?, ?)
  `).run(
    providerId,
    `Message ${providerId}`,
    receivedAt,
    status,
    assigneeId,
    assignedAt,
    createdAt,
  ).lastInsertRowid);
}

test('unassigned alerts use Outlook received time, repeat hourly, and stop after assignment', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  addSecondAdmin(db);
  const admin = user(db, 'admin@lexflow.local');
  const maya = user(db, 'maya@lexflow.local');
  const emailId = insertEmail(db, {
    providerId: 'unassigned-overdue',
    status: 'unassigned',
    receivedAt: '2026-08-14T08:00:00.000Z',
    createdAt: '2026-08-14T08:59:00.000Z',
  });

  assert.deepEqual(
    evaluateOverdueAlerts({ db, now: new Date('2026-08-14T09:01:00.000Z') }),
    { created: 2 },
  );
  assert.deepEqual(
    evaluateOverdueAlerts({ db, now: new Date('2026-08-14T09:59:00.000Z') }),
    { created: 0 },
  );
  db.prepare(`
    UPDATE notifications
    SET read_at = '2026-08-14T09:30:00.000Z'
    WHERE email_id = ? AND user_id = ? AND kind = 'unassigned_overdue'
  `).run(emailId, admin.id);
  db.prepare('UPDATE emails SET subject = ? WHERE id = ?')
    .run('Updated unassigned subject', emailId);
  assert.deepEqual(
    evaluateOverdueAlerts({ db, now: new Date('2026-08-14T10:01:00.000Z') }),
    { created: 2 },
  );
  const overdueNotifications = db.prepare(`
    SELECT user_id, message, read_at, created_at FROM notifications
    WHERE email_id = ? AND kind = 'unassigned_overdue'
    ORDER BY user_id
  `).all(emailId);
  assert.equal(overdueNotifications.length, 2);
  assert.ok(overdueNotifications.every(notification => (
    notification.message === 'Unassigned for over 1 hour(s): Updated unassigned subject'
      && notification.read_at === null
      && notification.created_at === '2026-08-14T10:01:00.000Z'
  )));

  assignEmailManually({
    db,
    emailId,
    assigneeId: Number(maya.id),
    adminId: Number(admin.id),
    now: new Date('2026-08-14T10:02:00.000Z'),
  });
  assert.deepEqual(
    evaluateOverdueAlerts({ db, now: new Date('2026-08-14T12:30:00.000Z') }),
    { created: 0 },
  );
  assert.equal(db.prepare(`
    SELECT count(*) AS count FROM alert_deliveries
    WHERE email_id = ? AND kind = 'unassigned_overdue'
  `).get(emailId).count, 0);
});

test('assigned alerts reach admins and assignee, reset on reassignment, and stop on completion', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  addSecondAdmin(db);
  updateWorkspaceSettings({
    db,
    timeUnassignedHours: 1,
    timeAssignedUnmarkedHours: 1,
  });
  const admin = user(db, 'admin@lexflow.local');
  const maya = user(db, 'maya@lexflow.local');
  const priya = user(db, 'priya@lexflow.local');
  const emailId = insertEmail(db, {
    providerId: 'assigned-overdue',
    status: 'assigned',
    assigneeId: Number(maya.id),
    receivedAt: '2026-08-14T07:30:00.000Z',
    assignedAt: '2026-08-14T08:00:00.000Z',
    createdAt: '2026-08-14T07:31:00.000Z',
  });

  assert.deepEqual(
    evaluateOverdueAlerts({ db, now: new Date('2026-08-14T09:01:00.000Z') }),
    { created: 3 },
  );
  assert.deepEqual(
    evaluateOverdueAlerts({ db, now: new Date('2026-08-14T09:59:00.000Z') }),
    { created: 0 },
  );
  assert.deepEqual(
    evaluateOverdueAlerts({ db, now: new Date('2026-08-14T10:01:00.000Z') }),
    { created: 3 },
  );
  assert.equal(db.prepare(`
    SELECT count(*) AS count FROM notifications
    WHERE email_id = ? AND kind = 'assigned_overdue'
  `).get(emailId).count, 3);

  assignEmailManually({
    db,
    emailId,
    assigneeId: Number(priya.id),
    adminId: Number(admin.id),
    now: new Date('2026-08-14T10:02:00.000Z'),
  });
  assert.equal(db.prepare(`
    SELECT count(*) AS count FROM notifications
    WHERE email_id = ? AND user_id = ? AND kind = 'assigned_overdue'
  `).get(emailId, maya.id).count, 0);
  assert.deepEqual(
    evaluateOverdueAlerts({ db, now: new Date('2026-08-14T10:30:00.000Z') }),
    { created: 0 },
  );
  assert.deepEqual(
    evaluateOverdueAlerts({ db, now: new Date('2026-08-14T11:03:00.000Z') }),
    { created: 3 },
  );
  assert.equal(db.prepare(`
    SELECT count(*) AS count FROM notifications
    WHERE email_id = ? AND user_id = ? AND kind = 'assigned_overdue'
  `).get(emailId, priya.id).count, 1);

  completeAssignedEmail({
    db,
    emailId,
    userId: Number(priya.id),
    now: new Date('2026-08-14T11:04:00.000Z'),
  });
  assert.deepEqual(
    evaluateOverdueAlerts({ db, now: new Date('2026-08-14T13:30:00.000Z') }),
    { created: 0 },
  );
  assert.equal(db.prepare(`
    SELECT count(*) AS count FROM alert_deliveries
    WHERE email_id = ? AND kind = 'assigned_overdue'
  `).get(emailId).count, 0);
});

test('alert runner coalesces overlapping sweeps and sync defaults to one minute', async () => {
  let calls = 0;
  let release;
  const deferred = new Promise(resolve => { release = resolve; });
  const runner = createAlertRunner({
    db: null,
    clock: () => new Date('2026-08-14T10:00:00.000Z'),
    evaluate() {
      calls += 1;
      return deferred;
    },
  });

  const first = runner.run();
  const second = runner.run();
  assert.equal(first, second);
  release({ created: 0 });
  assert.deepEqual(await first, { created: 0 });
  assert.equal(calls, 1);
  assert.equal(loadConfig({}).syncIntervalSeconds, 60);
});

test('assigned overdue alerts use canonical state and current assignee', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  updateWorkspaceSettings({
    db,
    timeUnassignedHours: 1,
    timeAssignedUnmarkedHours: 1,
  });
  const admin = user(db, 'admin@lexflow.local');
  const maya = user(db, 'maya@lexflow.local');
  const emailId = insertEmail(db, {
    providerId: 'canonical-alert-state',
    status: 'unassigned',
    receivedAt: '2026-08-26T07:00:00.000Z',
    createdAt: '2026-08-26T07:00:00.000Z',
  });
  assignEmailManually({
    db,
    emailId,
    assigneeId: Number(maya.id),
    adminId: Number(admin.id),
    now: new Date('2026-08-26T08:00:00.000Z'),
  });
  db.prepare(`
    UPDATE emails SET status = 'completed', assignee_id = NULL WHERE id = ?
  `).run(emailId);

  assert.deepEqual(
    evaluateOverdueAlerts({ db, now: new Date('2026-08-26T09:01:00.000Z') }),
    { created: 2 },
  );
  assert.deepEqual(
    db.prepare(`
      SELECT user_id FROM notifications
      WHERE email_id = ? AND kind = 'assigned_overdue'
      ORDER BY user_id
    `).all(emailId).map(row => Number(row.user_id)),
    [Number(admin.id), Number(maya.id)].sort((left, right) => left - right),
  );
});
