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
  subject TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_address TEXT NOT NULL,
  preview TEXT NOT NULL,
  received_at TEXT NOT NULL,
  outlook_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('unassigned', 'assigned', 'completed')),
  assignee_id INTEGER REFERENCES users(id),
  completed_by INTEGER REFERENCES users(id),
  completed_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind = 'assignment'),
  message TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, email_id, kind)
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
`;

export function migrate(db) {
  db.exec(schema);
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
