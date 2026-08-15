import { DatabaseSync } from 'node:sqlite';

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

export function migrate(db) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(schema);
    if (!tableHasColumn(db, 'emails', 'provider')) {
      db.exec("ALTER TABLE emails ADD COLUMN provider TEXT NOT NULL DEFAULT 'outlook'");
    }
    if (!tableHasColumn(db, 'emails', 'mailbox_address')) {
      db.exec('ALTER TABLE emails ADD COLUMN mailbox_address TEXT');
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
    migrateNotifications(db);

    const createdAt = new Date().toISOString();
    db.prepare(`
      INSERT OR IGNORE INTO departments (name, created_at)
      SELECT trim(department), ?
      FROM users
      WHERE trim(department) <> ''
      GROUP BY lower(trim(department))
    `).run(createdAt);
    db.prepare(`
      INSERT OR IGNORE INTO workspace_settings
        (id, time_unassigned_hours, time_assigned_unmarked_hours)
      VALUES (1, 1, 24)
    `).run();
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function createDatabase(filename = ':memory:') {
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys = ON');
  if (filename !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  migrate(db);
  return db;
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
