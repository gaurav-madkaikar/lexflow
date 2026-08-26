import { DatabaseSync } from 'node:sqlite';
import { deriveThreadKey } from './conversations.js';
import { backfillLegacyConversations } from './canonical-conversations.js';
import { createVerifiedMigrationBackup } from './database-backup.js';
import { migrateDeliverySchema } from './deliveries.js';
import { migrateLegacyMailboxConnections } from './mailbox-connections.js';
import {
  migrateOrganizations,
  organizationMigrationRequired,
} from './organization-schema.js';

export const EMAIL_RETENTION_LIMIT = 500;

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  keywords TEXT NOT NULL,
  sender_filter TEXT NOT NULL DEFAULT '',
  assignee_id INTEGER NOT NULL REFERENCES users(id),
  priority INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS emails (
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
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS email_thread_owners (
  thread_key TEXT PRIMARY KEY,
  assignee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (
    kind IN ('assignment', 'completion', 'unassigned_overdue', 'assigned_overdue')
  ),
  message TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY,
  actor_id INTEGER REFERENCES users(id),
  email_id INTEGER REFERENCES emails(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('assigned', 'completed')),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS gmail_connection (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  account_email TEXT NOT NULL COLLATE NOCASE,
  encrypted_refresh_token TEXT NOT NULL,
  connected_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS gmail_oauth_states (
  state_digest TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workspace_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  time_unassigned_hours INTEGER NOT NULL
    CHECK (time_unassigned_hours BETWEEN 1 AND 8760),
  time_assigned_unmarked_hours INTEGER NOT NULL
    CHECK (time_assigned_unmarked_hours BETWEEN 1 AND 8760)
);
CREATE TABLE IF NOT EXISTS alert_deliveries (
  email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('unassigned_overdue', 'assigned_overdue')),
  last_notified_at TEXT NOT NULL,
  PRIMARY KEY (email_id, user_id, kind)
);
`;

function tableHasColumn(db, table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(row => row.name === column);
}

function migrateNotifications(db) {
  const definition = String(db.prepare(`
    SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'notifications'
  `).get()?.sql ?? '').toLocaleLowerCase();
  const supportsAllKinds = definition.includes('completion') && definition.includes('assigned_overdue');
  const blocksRepeats = definition.includes('unique(user_id, email_id, kind)');
  if (supportsAllKinds && !blocksRepeats) return;

  db.exec(`
    DROP TABLE IF EXISTS notifications_next;
    CREATE TABLE notifications_next (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (
        kind IN ('assignment', 'completion', 'unassigned_overdue', 'assigned_overdue')
      ),
      message TEXT NOT NULL,
      read_at TEXT,
      created_at TEXT NOT NULL
    );
    INSERT INTO notifications_next
      (id, user_id, email_id, kind, message, read_at, created_at)
    SELECT id, user_id, email_id, kind, message, read_at, created_at
    FROM notifications;
    DROP TABLE notifications;
    ALTER TABLE notifications_next RENAME TO notifications;
  `);
}

function compactOverdueNotifications(db) {
  db.exec(`
    DELETE FROM notifications
    WHERE kind IN ('unassigned_overdue', 'assigned_overdue')
      AND id NOT IN (
        SELECT max(id)
        FROM notifications
        WHERE kind IN ('unassigned_overdue', 'assigned_overdue')
        GROUP BY user_id, email_id, kind
      );
    CREATE UNIQUE INDEX IF NOT EXISTS notifications_overdue_unique
      ON notifications (user_id, email_id, kind)
      WHERE kind IN ('unassigned_overdue', 'assigned_overdue');
    CREATE INDEX IF NOT EXISTS notifications_user_created_idx
      ON notifications (user_id, created_at DESC, id DESC);
  `);
}

export function enforceEmailRetention(
  db,
  limit = EMAIL_RETENTION_LIMIT,
  organizationId = null,
) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('Email retention limit must be a positive integer.');
  }
  if (organizationId !== null && (!Number.isInteger(organizationId) || organizationId < 1)) {
    throw new RangeError('Organization ID must be a positive integer.');
  }
  if (tableHasColumn(db, 'emails', 'organization_id')) {
    if (organizationId !== null) {
      return Number(db.prepare(`
        DELETE FROM emails
        WHERE organization_id = ? AND id IN (
          SELECT id
          FROM emails
          WHERE organization_id = ?
          ORDER BY julianday(received_at) DESC, id DESC
          LIMIT -1 OFFSET ?
        )
      `).run(organizationId, organizationId, limit).changes);
    }
    return Number(db.prepare(`
      DELETE FROM emails
      WHERE id IN (
        SELECT id
        FROM (
          SELECT id,
            row_number() OVER (
              PARTITION BY organization_id
              ORDER BY julianday(received_at) DESC, id DESC
            ) AS retention_rank
          FROM emails
        )
        WHERE retention_rank > ?
      )
    `).run(limit).changes);
  }
  return Number(db.prepare(`
    DELETE FROM emails
    WHERE id IN (
      SELECT id
      FROM emails
      ORDER BY julianday(received_at) DESC, id DESC
      LIMIT -1 OFFSET ?
    )
  `).run(limit).changes);
}

function migrateLegacySchema(db, { now = new Date() } = {}) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(schema);
    if (!tableHasColumn(db, 'emails', 'provider')) {
      db.exec("ALTER TABLE emails ADD COLUMN provider TEXT NOT NULL DEFAULT 'outlook'");
    }
    if (!tableHasColumn(db, 'emails', 'mailbox_address')) {
      db.exec('ALTER TABLE emails ADD COLUMN mailbox_address TEXT');
    }
    if (!tableHasColumn(db, 'emails', 'thread_key')) {
      db.exec("ALTER TABLE emails ADD COLUMN thread_key TEXT NOT NULL DEFAULT ''");
    }
    db.exec(`
      UPDATE emails
      SET provider = 'demo', mailbox_address = NULL
      WHERE provider_id LIKE 'mock-%'
        AND provider = 'outlook'
        AND mailbox_address IS NULL
    `);
    if (!tableHasColumn(db, 'emails', 'assigned_at')) {
      db.exec('ALTER TABLE emails ADD COLUMN assigned_at TEXT');
    }
    db.exec(`
      UPDATE emails
      SET assigned_at = created_at
      WHERE status IN ('assigned', 'completed') AND assigned_at IS NULL
    `);
    const updateThreadKey = db.prepare('UPDATE emails SET thread_key = ? WHERE id = ?');
    for (const email of db.prepare(`
      SELECT id, provider_id, provider, mailbox_address, subject
      FROM emails
      WHERE thread_key = ''
    `).all()) {
      updateThreadKey.run(deriveThreadKey({
        provider: email.provider,
        mailboxAddress: email.mailbox_address,
        subject: email.subject,
        providerId: email.provider_id,
      }), email.id);
    }
    const tenantAwareThreads = tableHasColumn(db, 'email_thread_owners', 'organization_id');
    db.exec(tenantAwareThreads ? `
      INSERT INTO email_thread_owners
        (organization_id, thread_key, assignee_id, updated_at)
      SELECT organization_id, thread_key, assignee_id,
        coalesce(assigned_at, completed_at, created_at)
      FROM (
        SELECT emails.*,
          row_number() OVER (
            PARTITION BY emails.organization_id, emails.thread_key
            ORDER BY
              julianday(emails.assigned_at) DESC,
              julianday(emails.received_at) DESC,
              emails.id DESC
          ) AS thread_rank
        FROM emails
        JOIN users ON users.id = emails.assignee_id
          AND users.organization_id = emails.organization_id
          AND users.role = 'member'
        WHERE emails.assignee_id IS NOT NULL AND emails.thread_key <> ''
      )
      WHERE thread_rank = 1
      ON CONFLICT(organization_id, thread_key) DO UPDATE SET
        assignee_id = excluded.assignee_id,
        updated_at = excluded.updated_at
      WHERE julianday(excluded.updated_at) > julianday(email_thread_owners.updated_at);
    ` : `
      INSERT INTO email_thread_owners (thread_key, assignee_id, updated_at)
      SELECT thread_key, assignee_id, coalesce(assigned_at, completed_at, created_at)
      FROM (
        SELECT emails.*,
          row_number() OVER (
            PARTITION BY emails.thread_key
            ORDER BY
              julianday(emails.assigned_at) DESC,
              julianday(emails.received_at) DESC,
              emails.id DESC
          ) AS thread_rank
        FROM emails
        JOIN users ON users.id = emails.assignee_id AND users.role = 'member'
        WHERE emails.assignee_id IS NOT NULL AND emails.thread_key <> ''
      )
      WHERE thread_rank = 1
      ON CONFLICT(thread_key) DO UPDATE SET
        assignee_id = excluded.assignee_id,
        updated_at = excluded.updated_at
      WHERE julianday(excluded.updated_at) > julianday(email_thread_owners.updated_at);
    `);
    migrateNotifications(db);
    db.exec(`
      CREATE INDEX IF NOT EXISTS emails_received_time_idx
        ON emails (julianday(received_at) DESC, id DESC);
      CREATE INDEX IF NOT EXISTS emails_thread_received_idx
        ON emails (thread_key, julianday(received_at) DESC, id DESC);
    `);
    enforceEmailRetention(db);
    compactOverdueNotifications(db);

    const createdAt = now.toISOString();
    if (tableHasColumn(db, 'departments', 'organization_id')) {
      db.prepare(`
        INSERT OR IGNORE INTO departments (organization_id, name, created_at)
        SELECT organization_id, trim(department), ?
        FROM users
        WHERE trim(department) <> ''
        GROUP BY organization_id, lower(trim(department))
      `).run(createdAt);
    } else {
      db.prepare(`
        INSERT OR IGNORE INTO departments (name, created_at)
        SELECT trim(department), ?
        FROM users
        WHERE trim(department) <> ''
        GROUP BY lower(trim(department))
      `).run(createdAt);
    }
    if (tableHasColumn(db, 'workspace_settings', 'organization_id')) {
      db.prepare(`
        INSERT OR IGNORE INTO workspace_settings
          (organization_id, time_unassigned_hours, time_assigned_unmarked_hours)
        VALUES (1, 1, 24)
      `).run();
    } else {
      db.prepare(`
        INSERT OR IGNORE INTO workspace_settings
          (id, time_unassigned_hours, time_assigned_unmarked_hours)
        VALUES (1, 1, 24)
      `).run();
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function migrate(db, { now = new Date() } = {}) {
  migrateLegacySchema(db, { now });
  migrateOrganizations(db, { now });
  migrateLegacyMailboxConnections(db);
  migrateDeliverySchema(db);
  backfillLegacyConversations(db, { now });
}

export function createDatabase(filename = ':memory:', { now = new Date() } = {}) {
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys = ON');
  const needsPreMigrationBackup = filename !== ':memory:' && organizationMigrationRequired(db);
  try {
    if (needsPreMigrationBackup) {
      createVerifiedMigrationBackup(db, filename, now);
    }
    if (filename !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
    migrateLegacySchema(db, { now });
    migrateOrganizations(db, { now });
    migrateLegacyMailboxConnections(db);
    migrateDeliverySchema(db);
    backfillLegacyConversations(db, { now });
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export function seedDemoData(
  db,
  {
    adminPasswordHash = 'test',
    memberPasswordHash = 'test',
    mayaPasswordHash = memberPasswordHash,
    priyaPasswordHash = memberPasswordHash,
  } = {},
) {
  const existingUsers = db.prepare('SELECT count(*) AS count FROM users').get().count;
  if (existingUsers > 0) return;

  const createdAt = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    const insertUser = db.prepare(`
      INSERT INTO users (email, name, initials, department, role, password_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertUser.run(
      'admin@lexflow.local',
      'LexFlow Admin',
      'LA',
      'Operations',
      'admin',
      adminPasswordHash,
    );
    const maya = insertUser.run(
      'maya@lexflow.local',
      'Maya Shah',
      'MS',
      'Legal',
      'member',
      mayaPasswordHash,
    );
    const priya = insertUser.run(
      'priya@lexflow.local',
      'Priya Menon',
      'PM',
      'Finance',
      'member',
      priyaPasswordHash,
    );

    const insertDepartment = db.prepare(`
      INSERT OR IGNORE INTO departments (name, created_at)
      VALUES (?, ?)
    `);
    for (const name of ['Operations', 'Legal', 'Finance']) {
      insertDepartment.run(name, createdAt);
    }

    const insertRule = db.prepare(`
      INSERT INTO rules
        (name, keywords, sender_filter, assignee_id, priority, enabled, created_at)
      VALUES (?, ?, '', ?, ?, 1, ?)
    `);
    insertRule.run('ACME NDA review', 'ACME,NDA', maya.lastInsertRowid, 10, createdAt);
    insertRule.run('Invoice payment review', 'invoice,payment', priya.lastInsertRowid, 20, createdAt);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
