import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import { createDatabase, migrate, seedDemoData } from '../src/db.js';
import {
  createDepartment,
  deleteDepartment,
  getWorkspaceSettings,
  listDepartments,
  moveMemberToDepartment,
  updateWorkspaceSettings,
} from '../src/workspace.js';

test('removing a department unassigns members and clears only its mailbox cursor', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);

  const department = createDepartment({ db, name: 'Compliance', sharedMailbox: 'compliance@lexflow.local' });
  const member = db.prepare(`
    INSERT INTO users (email, name, initials, department, role, organization_id, auth_provider)
    VALUES ('sam@lexflow.local', 'Sam Rao', 'SR', '', 'member', 1, 'local')
    RETURNING id
  `).get();
  moveMemberToDepartment({
    db,
    userId: Number(member.id),
    departmentId: department.id,
  });
  for (const key of [
    'mail_cursor:graph:compliance@lexflow.local',
    'last_sync_at:mail_cursor:graph:compliance@lexflow.local',
    'last_sync_error:mail_cursor:graph:compliance@lexflow.local',
  ]) {
    db.prepare('INSERT INTO sync_state (key, value, organization_id) VALUES (?, ?, 1)').run(key, 'saved');
  }
  db.prepare("INSERT INTO sync_state (key, value, organization_id) VALUES ('mail_cursor:graph:legal@lexflow.local', 'keep', 1)").run();

  const removed = deleteDepartment({ db, departmentId: department.id });

  assert.equal(removed.unassignedMemberCount, 1);
  const placement = db.prepare('SELECT department, department_id FROM users WHERE id = ?').get(member.id);
  assert.equal(placement.department, '');
  assert.equal(placement.department_id, null);
  assert.equal(db.prepare('SELECT id FROM departments WHERE id = ?').get(department.id), undefined);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM sync_state WHERE key LIKE '%compliance@lexflow.local'").get().count, 0);
  assert.equal(db.prepare("SELECT value FROM sync_state WHERE key = 'mail_cursor:graph:legal@lexflow.local'").get().value, 'keep');
});

test('workspace defaults and departments are persisted', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);

  assert.deepEqual(getWorkspaceSettings(db), {
    timeUnassignedHours: 1,
    timeAssignedUnmarkedHours: 24,
  });
  assert.deepEqual(listDepartments(db).map(item => item.name), [
    'Finance',
    'Legal',
  ]);

  const created = createDepartment({ db, name: '  Compliance  ', sharedMailbox: 'compliance@lexflow.local' });
  assert.equal('accessStatus' in created, false);
  assert.equal('accessMessage' in created, false);
  const maya = db.prepare(`
    INSERT INTO users (email, name, initials, department, role, organization_id, auth_provider)
    VALUES ('new.member@lexflow.local', 'New Member', 'NM', '', 'member', 1, 'local')
    RETURNING id
  `).get();
  const moved = moveMemberToDepartment({
    db,
    userId: Number(maya.id),
    departmentId: created.id,
  });

  assert.equal(moved.department, 'Compliance');
  assert.equal(
    db.prepare('SELECT department FROM users WHERE id = ?').get(maya.id).department,
    'Compliance',
  );
});

test('workspace validation rejects duplicate departments and invalid limits', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);

  assert.throws(
    () => createDepartment({ db, name: 'legal', sharedMailbox: 'legal@lexflow.local' }),
    error => error.code === 'INVALID_INPUT' && error.field === 'name',
  );
  assert.throws(
    () => updateWorkspaceSettings({
      db,
      timeUnassignedHours: 0,
      timeAssignedUnmarkedHours: 24,
    }),
    error => error.code === 'INVALID_INPUT' && error.field === 'timeUnassignedHours',
  );

  assert.deepEqual(getWorkspaceSettings(db), {
    timeUnassignedHours: 1,
    timeAssignedUnmarkedHours: 24,
  });
});

test('department placement trusts the OrgAdmin assignment without mailbox verification', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);

  const member = db.prepare("SELECT id FROM users WHERE email = 'maya@lexflow.local'").get();
  const department = db.prepare("SELECT id FROM departments WHERE name = 'Legal'").get();

  const moved = moveMemberToDepartment({
    db,
    userId: Number(member.id),
    departmentId: Number(department.id),
  });

  assert.equal(moved.department, 'Legal');
  assert.equal(moved.departmentId, Number(department.id));
  assert.equal('mailboxAccessStatus' in moved, false);
  assert.equal('mailboxAccessMessage' in moved, false);
});

test('migration preserves legacy data and is idempotent', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      department TEXT NOT NULL,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL
    );
    CREATE TABLE emails (
      id INTEGER PRIMARY KEY,
      provider_id TEXT NOT NULL UNIQUE,
      subject TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_address TEXT NOT NULL,
      preview TEXT NOT NULL,
      received_at TEXT NOT NULL,
      outlook_url TEXT,
      status TEXT NOT NULL,
      assignee_id INTEGER,
      completed_by INTEGER,
      completed_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE notifications (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      email_id INTEGER NOT NULL,
      kind TEXT NOT NULL CHECK (kind = 'assignment'),
      message TEXT NOT NULL,
      read_at TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, email_id, kind)
    );
    INSERT INTO users VALUES
      (1, 'admin@legacy.test', 'Legacy Admin', 'LA', 'Operations', 'admin', 'hash'),
      (2, 'member@legacy.test', 'Legacy Member', 'LM', 'Legal', 'member', 'hash');
    INSERT INTO emails VALUES
      (1, 'legacy-1', 'Legacy assignment', 'Sender', 'sender@example.test', 'Preview',
       '2026-08-14T08:00:00.000Z', NULL, 'assigned', 2, NULL, NULL,
       '2026-08-14T08:05:00.000Z');
    INSERT INTO notifications VALUES
      (1, 2, 1, 'assignment', 'New assignment: Legacy assignment', NULL,
       '2026-08-14T08:05:00.000Z');
  `);

  migrate(db);
  migrate(db);

  assert.equal(db.prepare('SELECT count(*) AS count FROM users').get().count, 2);
  assert.equal(db.prepare('SELECT count(*) AS count FROM notifications').get().count, 1);
  assert.equal(
    db.prepare('SELECT assigned_at FROM emails WHERE id = 1').get().assigned_at,
    '2026-08-14T08:05:00.000Z',
  );
  assert.deepEqual(
    db.prepare('SELECT name FROM departments ORDER BY name').all().map(row => row.name),
    ['Legal'],
  );
  assert.equal(
    db.prepare("SELECT head_user_id FROM departments WHERE name = 'Legal'").get().head_user_id,
    2,
  );
  assert.equal(db.prepare('SELECT department_id FROM emails WHERE id = 1').get().department_id, 1);
  assert.equal(db.prepare('SELECT count(*) AS count FROM workspace_settings').get().count, 1);
  db.prepare(`
    INSERT INTO notifications (user_id, email_id, kind, message, created_at)
    VALUES (1, 1, 'completion', 'Completed', '2026-08-14T09:00:00.000Z')
  `).run();
  db.close();
});
