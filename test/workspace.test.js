import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import {
  createDatabase,
  EMAIL_RETENTION_LIMIT,
  enforceEmailRetention,
  migrate,
  seedDemoData,
} from '../src/db.js';
import {
  DEFAULT_ORGANIZATION_HANDLE,
  organizationMigrationRequired,
} from '../src/organization-schema.js';
import {
  createDepartment,
  getWorkspaceSettings,
  listDepartments,
  moveMemberToDepartment,
  updateWorkspaceSettings,
} from '../src/workspace.js';

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
    'Operations',
  ]);

  const created = createDepartment({ db, name: '  Compliance  ' });
  const maya = db.prepare("SELECT id FROM users WHERE email = 'maya@lexflow.local'").get();
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
    () => createDepartment({ db, name: 'legal' }),
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
    ['Legal', 'Operations'],
  );
  assert.equal(db.prepare('SELECT count(*) AS count FROM workspace_settings').get().count, 1);
  db.prepare(`
    INSERT INTO notifications (user_id, email_id, kind, message, created_at)
    VALUES (1, 1, 'completion', 'Completed', '2026-08-14T09:00:00.000Z')
  `).run();
  db.close();
});

test('migration compacts repeated overdue notifications and enforces one row per recipient', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    PRAGMA foreign_keys = ON;
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
      provider TEXT NOT NULL DEFAULT 'outlook',
      mailbox_address TEXT,
      subject TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_address TEXT NOT NULL,
      preview TEXT NOT NULL,
      received_at TEXT NOT NULL,
      outlook_url TEXT,
      status TEXT NOT NULL,
      assignee_id INTEGER,
      assigned_at TEXT,
      completed_by INTEGER,
      completed_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE notifications (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      email_id INTEGER NOT NULL,
      kind TEXT NOT NULL CHECK (
        kind IN ('assignment', 'completion', 'unassigned_overdue', 'assigned_overdue')
      ),
      message TEXT NOT NULL,
      read_at TEXT,
      created_at TEXT NOT NULL
    );
    INSERT INTO users VALUES
      (1, 'admin@legacy.test', 'Legacy Admin', 'LA', 'Operations', 'admin', 'hash');
    INSERT INTO emails VALUES
      (1, 'legacy-overdue-1', 'outlook', NULL, 'Legacy overdue email',
       'Sender', 'sender@example.test', 'Preview', '2026-08-14T08:00:00.000Z', NULL,
       'unassigned', NULL, NULL, NULL, NULL, '2026-08-14T08:00:00.000Z');
    INSERT INTO notifications VALUES
      (1, 1, 1, 'unassigned_overdue', 'First unassigned reminder',
       '2026-08-14T09:30:00.000Z', '2026-08-14T09:01:00.000Z'),
      (2, 1, 1, 'unassigned_overdue', 'Latest unassigned reminder',
       NULL, '2026-08-14T10:01:00.000Z'),
      (3, 1, 1, 'assigned_overdue', 'First assigned reminder',
       NULL, '2026-08-14T09:01:00.000Z'),
      (4, 1, 1, 'assigned_overdue', 'Latest assigned reminder',
       NULL, '2026-08-14T10:01:00.000Z'),
      (5, 1, 1, 'assignment', 'Assignment history',
       NULL, '2026-08-14T08:01:00.000Z');
  `);

  migrate(db);
  migrate(db);

  assert.deepEqual(
    db.prepare(`
      SELECT kind, message, read_at, created_at
      FROM notifications
      WHERE kind IN ('unassigned_overdue', 'assigned_overdue')
      ORDER BY kind
    `).all().map(row => ({ ...row })),
    [
      {
        kind: 'assigned_overdue',
        message: 'Latest assigned reminder',
        read_at: null,
        created_at: '2026-08-14T10:01:00.000Z',
      },
      {
        kind: 'unassigned_overdue',
        message: 'Latest unassigned reminder',
        read_at: null,
        created_at: '2026-08-14T10:01:00.000Z',
      },
    ],
  );
  assert.throws(
    () => db.prepare(`
      INSERT INTO notifications (user_id, email_id, kind, message, created_at)
      VALUES (1, 1, 'unassigned_overdue', 'Duplicate reminder',
              '2026-08-14T11:01:00.000Z')
    `).run(),
    /unique/i,
  );
  db.prepare(`
    INSERT INTO notifications (user_id, email_id, kind, message, created_at)
    VALUES (1, 1, 'assignment', 'Second assignment event',
            '2026-08-14T11:01:00.000Z')
  `).run();
  assert.equal(db.prepare(`
    SELECT count(*) AS count FROM notifications WHERE kind = 'assignment'
  `).get().count, 2);
  db.close();
});

test('migration retains the latest 500 emails without changing workspace configuration', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  assert.equal(EMAIL_RETENTION_LIMIT, 500);

  const adminId = Number(db.prepare(`
    SELECT id FROM users WHERE email = 'admin@lexflow.local'
  `).get().id);
  const insertEmail = db.prepare(`
    INSERT INTO emails
      (provider_id, provider, subject, sender_name, sender_address, preview,
       received_at, status, created_at)
    VALUES (?, 'gmail', ?, 'Retention Sender', 'sender@example.test', 'Preview',
            ?, 'unassigned', ?)
  `);
  const insertedIds = [];

  db.exec('BEGIN IMMEDIATE');
  try {
    for (let index = 0; index < 502; index += 1) {
      let receivedAt;
      if (index === 0) receivedAt = '2026-08-14T07:59:59.999Z';
      else if (index === 1) receivedAt = '2026-08-14T08:00:00Z';
      else if (index === 2) receivedAt = '2026-08-14T08:00:00.000Z';
      else receivedAt = new Date(Date.UTC(2026, 7, 14, 8, 0, index - 2)).toISOString();
      const inserted = insertEmail.run(
        `retention-${index}`,
        `Retention email ${index}`,
        receivedAt,
        receivedAt,
      );
      insertedIds.push(Number(inserted.lastInsertRowid));
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  db.prepare(`
    INSERT INTO notifications (user_id, email_id, kind, message, created_at)
    VALUES (?, ?, 'completion', 'Notification for pruned email', ?)
  `).run(adminId, insertedIds[0], '2026-08-14T08:00:00.000Z');
  db.prepare(`
    INSERT INTO alert_deliveries (email_id, user_id, kind, last_notified_at)
    VALUES (?, ?, 'unassigned_overdue', ?)
  `).run(insertedIds[0], adminId, '2026-08-14T09:00:00.000Z');
  db.prepare(`
    INSERT INTO activity (actor_id, email_id, kind, message, created_at)
    VALUES (?, ?, 'assigned', 'Activity for pruned email', ?)
  `).run(adminId, insertedIds[0], '2026-08-14T08:00:00.000Z');
  db.prepare(`
    UPDATE workspace_settings
    SET time_unassigned_hours = 7, time_assigned_unmarked_hours = 19
    WHERE organization_id = 1
  `).run();
  db.prepare(`
    INSERT INTO sync_state (key, value) VALUES ('retention-test-cursor', 'cursor-before-migration')
  `).run();
  const rulesBefore = db.prepare('SELECT * FROM rules ORDER BY id').all();

  migrate(db);
  const retainedAfterFirstMigration = db.prepare(`
    SELECT id, provider_id, received_at
    FROM emails
    ORDER BY julianday(received_at) DESC, id DESC
  `).all();
  migrate(db);

  assert.equal(retainedAfterFirstMigration.length, EMAIL_RETENTION_LIMIT);
  assert.deepEqual(
    db.prepare(`
      SELECT id, provider_id, received_at
      FROM emails
      ORDER BY julianday(received_at) DESC, id DESC
    `).all(),
    retainedAfterFirstMigration,
  );
  assert.equal(
    db.prepare("SELECT count(*) AS count FROM emails WHERE provider_id = 'retention-0'").get().count,
    0,
  );
  assert.equal(
    db.prepare("SELECT count(*) AS count FROM emails WHERE provider_id = 'retention-1'").get().count,
    0,
  );
  assert.equal(
    db.prepare("SELECT count(*) AS count FROM emails WHERE provider_id = 'retention-2'").get().count,
    1,
  );
  assert.equal(retainedAfterFirstMigration.at(-1).provider_id, 'retention-2');

  assert.equal(db.prepare(`
    SELECT count(*) AS count FROM notifications WHERE email_id = ?
  `).get(insertedIds[0]).count, 0);
  assert.equal(db.prepare(`
    SELECT count(*) AS count FROM alert_deliveries WHERE email_id = ?
  `).get(insertedIds[0]).count, 0);
  assert.equal(db.prepare(`
    SELECT email_id FROM activity WHERE message = 'Activity for pruned email'
  `).get().email_id, null);
  assert.deepEqual(
    { ...db.prepare(`
      SELECT time_unassigned_hours, time_assigned_unmarked_hours
      FROM workspace_settings WHERE organization_id = 1
    `).get() },
    { time_unassigned_hours: 7, time_assigned_unmarked_hours: 19 },
  );
  assert.equal(
    db.prepare("SELECT value FROM sync_state WHERE key = 'retention-test-cursor'").get().value,
    'cursor-before-migration',
  );
  assert.deepEqual(db.prepare('SELECT * FROM rules ORDER BY id').all(), rulesBefore);
});

test('migration backfills thread owners by assignment time with deterministic fallbacks', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);

  const maya = db.prepare("SELECT id FROM users WHERE email = 'maya@lexflow.local'").get();
  const priya = db.prepare("SELECT id FROM users WHERE email = 'priya@lexflow.local'").get();
  const insertEmail = db.prepare(`
    INSERT INTO emails
      (provider_id, provider, mailbox_address, subject, thread_key, sender_name,
       sender_address, preview, received_at, status, assignee_id, assigned_at, created_at)
    VALUES (?, 'outlook', 'shared@example.test', ?, ?, 'Sender',
            'sender@example.test', 'Preview', ?, 'assigned', ?, ?, ?)
  `);
  const add = (providerId, threadKey, receivedAt, assigneeId, assignedAt) => {
    insertEmail.run(
      providerId,
      providerId,
      threadKey,
      receivedAt,
      assigneeId,
      assignedAt,
      receivedAt,
    );
  };

  add('assignment-newer-message', 'thread-assignment', '2026-08-12T08:00:00.000Z', maya.id,
    '2026-08-12T09:00:00.000Z');
  add('assignment-later-action', 'thread-assignment', '2026-08-11T08:00:00.000Z', priya.id,
    '2026-08-13T09:00:00.000Z');
  add('received-older', 'thread-received', '2026-08-11T08:00:00.000Z', maya.id,
    '2026-08-13T09:00:00.000Z');
  add('received-newer', 'thread-received', '2026-08-12T08:00:00.000Z', priya.id,
    '2026-08-13T09:00:00.000Z');
  add('id-older', 'thread-id', '2026-08-12T08:00:00.000Z', maya.id,
    '2026-08-13T09:00:00.000Z');
  add('id-newer', 'thread-id', '2026-08-12T08:00:00.000Z', priya.id,
    '2026-08-13T09:00:00.000Z');
  db.prepare(`
    INSERT INTO email_thread_owners (thread_key, assignee_id, updated_at)
    VALUES ('thread-assignment', ?, '2026-08-12T09:00:00.000Z')
  `).run(maya.id);

  migrate(db);
  const owners = db.prepare(`
    SELECT thread_key, assignee_id
    FROM email_thread_owners
    ORDER BY thread_key
  `).all().map(row => ({ ...row }));
  migrate(db);

  assert.deepEqual(owners, [
    { thread_key: 'thread-assignment', assignee_id: priya.id },
    { thread_key: 'thread-id', assignee_id: priya.id },
    { thread_key: 'thread-received', assignee_id: priya.id },
  ]);
  assert.deepEqual(
    db.prepare(`
      SELECT thread_key, assignee_id
      FROM email_thread_owners
      ORDER BY thread_key
    `).all().map(row => ({ ...row })),
    owners,
  );
});

test('organization migration creates a verified pre-migration backup and preserves legacy identity data', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'lexflow-organization-migration-'));
  const filename = join(directory, 'legacy.db');
  context.after(() => rmSync(directory, { recursive: true, force: true }));

  const legacy = new DatabaseSync(filename);
  legacy.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      department TEXT NOT NULL,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL
    );
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE rules (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      keywords TEXT NOT NULL,
      sender_filter TEXT NOT NULL DEFAULT '',
      assignee_id INTEGER NOT NULL REFERENCES users(id),
      priority INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE gmail_connection (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      account_email TEXT NOT NULL COLLATE NOCASE,
      encrypted_refresh_token TEXT NOT NULL,
      connected_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO users VALUES
      (7, 'admin@legacy.test', 'Legacy Admin', 'LA', 'Operations', 'admin', 'admin-hash'),
      (9, 'member@legacy.test', 'Legacy Member', 'LM', 'Legal', 'member', 'member-hash');
    INSERT INTO sessions VALUES
      ('stable-session', 7, '2026-08-27T12:00:00.000Z');
    INSERT INTO rules VALUES
      (11, 'Legacy rule', 'legacy', '', 9, 5, 1, '2026-08-25T08:00:00.000Z');
    INSERT INTO gmail_connection VALUES
      (1, 'admin@gmail.com', 'encrypted-stable-token',
       '2026-08-25T08:00:00.000Z', '2026-08-25T08:00:00.000Z');
  `);
  assert.equal(organizationMigrationRequired(legacy), true);
  legacy.close();

  const now = new Date('2026-08-26T10:11:12.000Z');
  const db = createDatabase(filename, { now });

  assert.deepEqual(
    db.prepare(`
      SELECT id, email, password_hash, organization_id, registration_status
      FROM users ORDER BY id
    `).all().map(row => ({ ...row })),
    [
      {
        id: 7,
        email: 'admin@legacy.test',
        password_hash: 'admin-hash',
        organization_id: 1,
        registration_status: 'active',
      },
      {
        id: 9,
        email: 'member@legacy.test',
        password_hash: 'member-hash',
        organization_id: 1,
        registration_status: 'active',
      },
    ],
  );
  assert.deepEqual(
    { ...db.prepare('SELECT id, user_id, expires_at FROM sessions').get() },
    { id: 'stable-session', user_id: 7, expires_at: '2026-08-27T12:00:00.000Z' },
  );
  assert.equal(db.prepare('SELECT id FROM rules').get().id, 11);
  assert.equal(
    db.prepare('SELECT encrypted_refresh_token FROM gmail_connection').get().encrypted_refresh_token,
    'encrypted-stable-token',
  );
  assert.deepEqual(
    { ...db.prepare(`
      SELECT mailbox_connections.id, mailbox_connections.organization_id,
             mailbox_connections.admin_user_id, mailbox_connections.provider,
             mailbox_connections.encrypted_grant, mailbox_connections.grant_kind,
             mailbox_connections.capabilities_json, mailbox_connections.generation,
             mailbox_identities.normalized_mailbox,
             mailbox_identities.provider_account_id
      FROM mailbox_connections
      JOIN mailbox_identities
        ON mailbox_identities.id = mailbox_connections.mailbox_identity_id
    `).get() },
    {
      id: 1,
      organization_id: 1,
      admin_user_id: 7,
      provider: 'gmail',
      encrypted_grant: 'encrypted-stable-token',
      grant_kind: 'legacy',
      capabilities_json: '["read"]',
      generation: 1,
      normalized_mailbox: 'admin@gmail.com',
      provider_account_id: 'admin@gmail.com',
    },
  );
  assert.deepEqual(
    { ...db.prepare('SELECT id, handle FROM organizations').get() },
    { id: 1, handle: DEFAULT_ORGANIZATION_HANDLE },
  );
  assert.equal(organizationMigrationRequired(db), false);

  const backups = readdirSync(directory)
    .filter(name => name.startsWith('lexflow-before-organizations-'));
  assert.deepEqual(backups, ['lexflow-before-organizations-20260826101112.db']);
  const backup = new DatabaseSync(join(directory, backups[0]), { readOnly: true });
  assert.equal(backup.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.equal(backup.prepare('SELECT count(*) AS count FROM users').get().count, 2);
  assert.equal(backup.prepare('SELECT count(*) AS count FROM sessions').get().count, 1);
  assert.equal(backup.prepare('SELECT count(*) AS count FROM rules').get().count, 1);
  assert.equal(backup.prepare('SELECT count(*) AS count FROM gmail_connection').get().count, 1);
  assert.equal(
    backup.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'organizations'").get().count,
    0,
  );
  backup.close();

  migrate(db, { now });
  db.close();
  const reopened = createDatabase(filename, { now });
  assert.equal(readdirSync(directory).filter(name => name.startsWith('lexflow-before-organizations-')).length, 1);
  assert.equal(reopened.prepare('PRAGMA user_version').get().user_version, 3);
  reopened.close();
});

test('tenant keys permit independent workspace values and constraints reject cross-organization users', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);

  const createdAt = '2026-08-26T10:00:00.000Z';
  const organization = db.prepare(`
    INSERT INTO organizations
      (handle, join_code, name, normalized_domain, domain_verified, created_at, updated_at)
    VALUES ('other-org', 'OTHER-ORG-CODE', 'Other Org', 'example.test', 0, ?, ?)
  `).run(createdAt, createdAt);
  const otherOrganizationId = Number(organization.lastInsertRowid);
  const otherMember = db.prepare(`
    INSERT INTO users
      (organization_id, email, name, initials, department, role, password_hash,
       registration_status, mailbox_provider)
    VALUES (?, 'other.member@example.test', 'Other Member', 'OM', 'Legal', 'member',
            'hash', 'active', 'gmail')
  `).run(otherOrganizationId);
  const otherMemberId = Number(otherMember.lastInsertRowid);
  const localMemberId = Number(db.prepare(
    "SELECT id FROM users WHERE email = 'maya@lexflow.local'",
  ).get().id);

  db.prepare(`
    INSERT INTO departments (organization_id, name, created_at)
    VALUES (?, 'Legal', ?)
  `).run(otherOrganizationId, createdAt);
  db.prepare(`
    INSERT INTO workspace_settings
      (organization_id, time_unassigned_hours, time_assigned_unmarked_hours)
    VALUES (?, 3, 12)
  `).run(otherOrganizationId);
  db.prepare(`
    INSERT INTO sync_state (organization_id, connection_id, key, value)
    VALUES (?, 0, 'shared-cursor', 'other-value')
  `).run(otherOrganizationId);
  db.prepare(`
    INSERT INTO sync_state (organization_id, connection_id, key, value)
    VALUES (1, 0, 'shared-cursor', 'local-value')
  `).run();
  db.prepare(`
    INSERT INTO email_thread_owners (organization_id, thread_key, assignee_id, updated_at)
    VALUES (?, 'shared-thread', ?, ?)
  `).run(otherOrganizationId, otherMemberId, createdAt);
  db.prepare(`
    INSERT INTO email_thread_owners (organization_id, thread_key, assignee_id, updated_at)
    VALUES (1, 'shared-thread', ?, ?)
  `).run(localMemberId, createdAt);

  assert.equal(db.prepare("SELECT count(*) AS count FROM departments WHERE name = 'Legal'").get().count, 2);
  assert.equal(db.prepare("SELECT count(*) AS count FROM sync_state WHERE key = 'shared-cursor'").get().count, 2);
  assert.equal(db.prepare("SELECT count(*) AS count FROM email_thread_owners WHERE thread_key = 'shared-thread'").get().count, 2);

  const email = db.prepare(`
    INSERT INTO emails
      (organization_id, provider_id, provider, subject, sender_name, sender_address,
       preview, received_at, status, assignee_id, created_at)
    VALUES (1, 'tenant-boundary-email', 'demo', 'Boundary', 'Sender',
            'sender@example.test', 'Preview', ?, 'assigned', ?, ?)
  `).run(createdAt, localMemberId, createdAt);
  const emailId = Number(email.lastInsertRowid);

  assert.throws(
    () => db.prepare('UPDATE emails SET assignee_id = ? WHERE id = ?')
      .run(otherMemberId, emailId),
    /organization mismatch/,
  );
  assert.throws(
    () => db.prepare(`
      INSERT INTO rules
        (organization_id, name, keywords, sender_filter, assignee_id, priority, enabled, created_at)
      VALUES (1, 'Cross tenant', 'boundary', '', ?, 1, 1, ?)
    `).run(otherMemberId, createdAt),
    /organization mismatch/,
  );
  assert.throws(
    () => db.prepare(`
      INSERT INTO email_thread_owners
        (organization_id, thread_key, assignee_id, updated_at)
      VALUES (1, 'cross-tenant-thread', ?, ?)
    `).run(otherMemberId, createdAt),
    /organization mismatch/,
  );
  assert.throws(
    () => db.prepare('UPDATE users SET organization_id = ? WHERE id = ?')
      .run(otherOrganizationId, localMemberId),
    /organization mismatch/,
  );
});

test('email retention keeps the newest limit independently for each organization', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());

  const createdAt = '2026-08-26T10:00:00.000Z';
  const organization = db.prepare(`
    INSERT INTO organizations
      (handle, join_code, name, normalized_domain, domain_verified, created_at, updated_at)
    VALUES ('retention-org', 'RETENTION-CODE', 'Retention Org', 'retention.test', 0, ?, ?)
  `).run(createdAt, createdAt);
  const otherOrganizationId = Number(organization.lastInsertRowid);
  const insert = db.prepare(`
    INSERT INTO emails
      (organization_id, provider_id, provider, subject, sender_name, sender_address,
       preview, received_at, status, created_at)
    VALUES (?, ?, 'demo', ?, 'Sender', 'sender@example.test', 'Preview', ?,
            'unassigned', ?)
  `);
  for (const organizationId of [1, otherOrganizationId]) {
    for (let index = 0; index < 3; index += 1) {
      const receivedAt = new Date(Date.UTC(2026, 7, 26, 10, index)).toISOString();
      insert.run(
        organizationId,
        `retention-${organizationId}-${index}`,
        `Retention ${organizationId}-${index}`,
        receivedAt,
        receivedAt,
      );
    }
  }

  assert.equal(enforceEmailRetention(db, 2), 2);
  assert.deepEqual(
    db.prepare(`
      SELECT organization_id, count(*) AS count
      FROM emails GROUP BY organization_id ORDER BY organization_id
    `).all().map(row => ({ ...row })),
    [
      { organization_id: 1, count: 2 },
      { organization_id: otherOrganizationId, count: 2 },
    ],
  );
});

test('canonical migration backs up a Phase 1 database and preserves email rows and references', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'lexflow-canonical-migration-'));
  const filename = join(directory, 'phase-1.db');
  context.after(() => rmSync(directory, { recursive: true, force: true }));

  const phaseOne = createDatabase(filename, {
    now: new Date('2026-08-26T08:00:00.000Z'),
  });
  seedDemoData(phaseOne);
  const adminId = Number(phaseOne.prepare(`
    SELECT id FROM users WHERE email = 'admin@lexflow.local'
  `).get().id);
  const emailId = Number(phaseOne.prepare(`
    INSERT INTO emails
      (organization_id, connection_id, provider_id, provider, mailbox_address,
       subject, thread_key, sender_name, sender_address, preview, received_at,
       status, created_at)
    VALUES (1, 0, 'phase-one-provider-id', 'gmail', 'admin@example.test',
            'Phase one mail', 'phase-one-thread', 'Sender', 'sender@example.test',
            'Preview', '2026-08-26T08:10:00.000Z', 'unassigned',
            '2026-08-26T08:10:00.000Z')
  `).run().lastInsertRowid);
  const notificationId = Number(phaseOne.prepare(`
    INSERT INTO notifications
      (organization_id, user_id, email_id, kind, message, created_at)
    VALUES (1, ?, ?, 'assignment', 'Preserved notification',
            '2026-08-26T08:11:00.000Z')
  `).run(adminId, emailId).lastInsertRowid);
  const activityId = Number(phaseOne.prepare(`
    INSERT INTO activity
      (organization_id, actor_id, email_id, kind, message, created_at)
    VALUES (1, ?, ?, 'assigned', 'Preserved activity',
            '2026-08-26T08:11:00.000Z')
  `).run(adminId, emailId).lastInsertRowid);
  phaseOne.prepare(`
    INSERT INTO alert_deliveries
      (organization_id, email_id, user_id, kind, last_notified_at)
    VALUES (1, ?, ?, 'unassigned_overdue', '2026-08-26T08:12:00.000Z')
  `).run(emailId, adminId);
  phaseOne.exec(`
    PRAGMA foreign_keys = OFF;
    DROP TRIGGER IF EXISTS organization_guard_notifications_email_id_insert;
    DROP TRIGGER IF EXISTS organization_guard_notifications_email_id_update;
    DROP TRIGGER IF EXISTS organization_guard_activity_email_id_insert;
    DROP TRIGGER IF EXISTS organization_guard_activity_email_id_update;
    DROP TRIGGER IF EXISTS organization_guard_alert_deliveries_email_id_insert;
    DROP TRIGGER IF EXISTS organization_guard_alert_deliveries_email_id_update;
    DROP TRIGGER IF EXISTS organization_guard_emails_assignee_id_insert;
    DROP TRIGGER IF EXISTS organization_guard_emails_assignee_id_update;
    DROP TRIGGER IF EXISTS organization_guard_emails_completed_by_insert;
    DROP TRIGGER IF EXISTS organization_guard_emails_completed_by_update;
    DROP TRIGGER IF EXISTS organization_guard_emails_conversation_id_insert;
    DROP TRIGGER IF EXISTS organization_guard_emails_conversation_id_update;
    DROP TRIGGER IF EXISTS organization_guard_emails_immutable;
    CREATE TABLE emails_phase_one (
      id INTEGER PRIMARY KEY,
      provider_id TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL DEFAULT 'outlook',
      mailbox_address TEXT,
      subject TEXT NOT NULL,
      thread_key TEXT NOT NULL DEFAULT '',
      sender_name TEXT NOT NULL,
      sender_address TEXT NOT NULL,
      preview TEXT NOT NULL,
      received_at TEXT NOT NULL,
      outlook_url TEXT,
      status TEXT NOT NULL CHECK (status IN ('unassigned', 'assigned', 'completed')),
      assignee_id INTEGER REFERENCES users(id),
      assigned_at TEXT,
      completed_by INTEGER REFERENCES users(id),
      completed_at TEXT,
      created_at TEXT NOT NULL,
      organization_id INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id),
      connection_id INTEGER NOT NULL DEFAULT 0
    );
    INSERT INTO emails_phase_one
      (id, provider_id, provider, mailbox_address, subject, thread_key,
       sender_name, sender_address, preview, received_at, outlook_url, status,
       assignee_id, assigned_at, completed_by, completed_at, created_at,
       organization_id, connection_id)
    SELECT id, provider_id, provider, mailbox_address, subject, thread_key,
           sender_name, sender_address, preview, received_at, outlook_url, status,
           assignee_id, assigned_at, completed_by, completed_at, created_at,
           organization_id, connection_id
    FROM emails;
    DROP TABLE emails;
    ALTER TABLE emails_phase_one RENAME TO emails;
    DROP TABLE IF EXISTS conversation_sources;
    DROP TABLE IF EXISTS conversations;
    DROP TABLE IF EXISTS mailbox_connections;
    DROP TABLE IF EXISTS mailbox_identities;
    PRAGMA user_version = 2;
    PRAGMA foreign_keys = ON;
  `);
  assert.equal(organizationMigrationRequired(phaseOne), true);
  phaseOne.close();

  const now = new Date('2026-08-26T12:34:56.000Z');
  const migrated = createDatabase(filename, { now });
  assert.equal(Number(migrated.prepare('SELECT id FROM emails').get().id), emailId);
  assert.equal(Number(migrated.prepare('SELECT id FROM notifications').get().id), notificationId);
  assert.equal(Number(migrated.prepare('SELECT id FROM activity').get().id), activityId);
  assert.deepEqual(
    { ...migrated.prepare(`
      SELECT organization_id, email_id, user_id, kind, last_notified_at
      FROM alert_deliveries
    `).get() },
    {
      organization_id: 1,
      email_id: emailId,
      user_id: adminId,
      kind: 'unassigned_overdue',
      last_notified_at: '2026-08-26T08:12:00.000Z',
    },
  );
  assert.ok(migrated.prepare('SELECT conversation_id FROM emails WHERE id = ?')
    .get(emailId).conversation_id);
  assert.deepEqual(migrated.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(migrated.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.equal(organizationMigrationRequired(migrated), false);

  const backups = readdirSync(directory)
    .filter(name => name.startsWith('lexflow-before-organizations-'));
  assert.deepEqual(backups, ['lexflow-before-organizations-20260826123456.db']);
  const backup = new DatabaseSync(join(directory, backups[0]), { readOnly: true });
  assert.equal(backup.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.equal(backup.prepare('SELECT provider_id FROM emails WHERE id = ?')
    .get(emailId).provider_id, 'phase-one-provider-id');
  assert.equal(backup.prepare('SELECT id FROM notifications').get().id, notificationId);
  assert.equal(backup.prepare('SELECT id FROM activity').get().id, activityId);
  assert.equal(backup.prepare('SELECT count(*) AS count FROM alert_deliveries').get().count, 1);
  assert.equal(backup.prepare(`
    SELECT count(*) AS count FROM sqlite_master
    WHERE type = 'table' AND name = 'conversations'
  `).get().count, 0);
  backup.close();

  migrate(migrated, { now });
  assert.equal(Number(migrated.prepare('SELECT id FROM emails').get().id), emailId);
  assert.deepEqual(migrated.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(migrated.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  migrated.close();
  const reopened = createDatabase(filename, { now });
  assert.equal(readdirSync(directory)
    .filter(name => name.startsWith('lexflow-before-organizations-')).length, 1);
  reopened.close();
});

test('email provider identity is scoped by organization and connection after migration', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  const createdAt = '2026-08-26T13:00:00.000Z';
  const secondOrganizationId = Number(db.prepare(`
    INSERT INTO organizations
      (handle, join_code, name, normalized_domain, domain_verified, created_at, updated_at)
    VALUES ('provider-collision-org', 'PROVIDER-COLLISION', 'Provider Collision',
            'collision.test', 0, ?, ?)
  `).run(createdAt, createdAt).lastInsertRowid);
  const insert = db.prepare(`
    INSERT INTO emails
      (organization_id, connection_id, provider_id, provider, subject, sender_name,
       sender_address, preview, received_at, status, created_at)
    VALUES (?, ?, 'same-provider-id', 'outlook', 'Collision safe', 'Sender',
            'sender@example.test', 'Preview', ?, 'unassigned', ?)
  `);

  insert.run(1, 0, createdAt, createdAt);
  assert.doesNotThrow(() => insert.run(secondOrganizationId, 0, createdAt, createdAt));
  assert.doesNotThrow(() => insert.run(1, 1, createdAt, createdAt));
  assert.throws(() => insert.run(1, 0, createdAt, createdAt), /unique/i);
  assert.equal(db.prepare(`
    SELECT count(*) AS count FROM emails WHERE provider_id = 'same-provider-id'
  `).get().count, 3);

  const globalProviderUnique = db.prepare(`
    SELECT il.name
    FROM pragma_index_list('emails') AS il
    WHERE il."unique" = 1
      AND (SELECT group_concat(ii.name, ',')
           FROM pragma_index_info(il.name) AS ii) = 'provider_id'
  `).all();
  assert.deepEqual(globalProviderUnique, []);
});
