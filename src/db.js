import { DatabaseSync } from 'node:sqlite';

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'cfo')),
  password_hash TEXT NOT NULL,
  microsoft_principal TEXT COLLATE NOCASE
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
  email_id INTEGER REFERENCES emails(id) ON DELETE CASCADE,
  briefing_id INTEGER REFERENCES return_briefings(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (
    kind IN ('assignment', 'completion', 'unassigned_overdue', 'assigned_overdue', 'return_briefing')
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
CREATE TABLE IF NOT EXISTS vacation_periods (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider = 'microsoft'),
  provider_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'active', 'completed')),
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  first_detected_at TEXT NOT NULL,
  last_detected_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE(user_id, provider_key)
);
CREATE TABLE IF NOT EXISTS vacation_sync_state (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unconfigured'
    CHECK (status IN ('unconfigured', 'current', 'error')),
  last_attempt_at TEXT,
  last_success_at TEXT,
  last_error TEXT
);
CREATE TABLE IF NOT EXISTS vacation_manual_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  starts_at TEXT,
  ends_at TEXT,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS vacation_email_holds (
  id INTEGER PRIMARY KEY,
  vacation_id INTEGER NOT NULL REFERENCES vacation_periods(id) ON DELETE CASCADE,
  email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  intended_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rule_id INTEGER REFERENCES rules(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'held'
    CHECK (status IN ('held', 'released', 'covered')),
  held_at TEXT NOT NULL,
  resolved_at TEXT,
  UNIQUE(vacation_id, email_id)
);
CREATE TABLE IF NOT EXISTS vacation_meetings (
  id INTEGER PRIMARY KEY,
  vacation_id INTEGER NOT NULL REFERENCES vacation_periods(id) ON DELETE CASCADE,
  provider_event_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  organizer_name TEXT NOT NULL,
  organizer_address TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  timezone TEXT NOT NULL,
  response_status TEXT NOT NULL,
  location TEXT NOT NULL,
  web_url TEXT,
  sensitivity TEXT NOT NULL,
  is_organizer INTEGER NOT NULL DEFAULT 0,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  UNIQUE(vacation_id, provider_event_id)
);
CREATE TABLE IF NOT EXISTS return_briefings (
  id INTEGER PRIMARY KEY,
  vacation_id INTEGER NOT NULL UNIQUE REFERENCES vacation_periods(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('ready', 'partial')),
  items_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  retry_until TEXT,
  reviewed_at TEXT
);
`;

function tableHasColumn(db, table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(row => row.name === column);
}

function usersSupportCfo(db) {
  const definition = String(db.prepare(`
    SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'
  `).get()?.sql ?? '').toLocaleLowerCase();
  return definition.includes("'cfo'");
}

function migrateUserRoles(db) {
  if (usersSupportCfo(db)) return;

  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(`
      CREATE TABLE users_next (
        id INTEGER PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        initials TEXT NOT NULL,
        department TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'cfo')),
        password_hash TEXT NOT NULL
      );
      INSERT INTO users_next (id, email, name, initials, department, role, password_hash)
      SELECT id, email, name, initials, department, role, password_hash FROM users;
      DROP TABLE users;
      ALTER TABLE users_next RENAME TO users;
    `);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }

  const violations = db.prepare('PRAGMA foreign_key_check').all();
  if (violations.length) throw new Error('User role migration failed its foreign-key integrity check.');
}

function migrateNotifications(db) {
  const definition = String(db.prepare(`
    SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'notifications'
  `).get()?.sql ?? '').toLocaleLowerCase();
  const supportsAllKinds = definition.includes('return_briefing');
  const blocksRepeats = definition.includes('unique(user_id, email_id, kind)');
  const hasBriefingId = tableHasColumn(db, 'notifications', 'briefing_id');
  if (supportsAllKinds && hasBriefingId && !blocksRepeats) return;

  db.exec(`
    DROP TABLE IF EXISTS notifications_next;
    CREATE TABLE notifications_next (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email_id INTEGER REFERENCES emails(id) ON DELETE CASCADE,
      briefing_id INTEGER REFERENCES return_briefings(id) ON DELETE SET NULL,
      kind TEXT NOT NULL CHECK (
        kind IN ('assignment', 'completion', 'unassigned_overdue', 'assigned_overdue', 'return_briefing')
      ),
      message TEXT NOT NULL,
      read_at TEXT,
      created_at TEXT NOT NULL
    );
    INSERT INTO notifications_next
      (id, user_id, email_id, briefing_id, kind, message, read_at, created_at)
    SELECT id, user_id, email_id, NULL, kind, message, read_at, created_at
    FROM notifications;
    DROP TABLE notifications;
    ALTER TABLE notifications_next RENAME TO notifications;
  `);
}

export function migrate(db) {
  db.exec(schema);
  migrateUserRoles(db);
  db.exec('BEGIN IMMEDIATE');
  try {
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
    if (!tableHasColumn(db, 'users', 'microsoft_principal')) {
      db.exec('ALTER TABLE users ADD COLUMN microsoft_principal TEXT COLLATE NOCASE');
    }
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_microsoft_principal_unique
      ON users(microsoft_principal) WHERE microsoft_principal IS NOT NULL
    `);
    db.exec(`
      UPDATE users
      SET microsoft_principal = lower(email)
      WHERE role = 'member'
        AND microsoft_principal IS NULL
        AND email LIKE '%@%'
        AND email NOT LIKE '%.local'
    `);
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
    cfoPasswordHash = memberPasswordHash,
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
    insertUser.run(
      'cfo@lexflow.local',
      'Aarav Mehta',
      'AM',
      'Finance',
      'cfo',
      cfoPasswordHash,
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

export function ensureCfoUser(db, { passwordHash }) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('cfo@lexflow.local');
  if (existing) {
    db.prepare(`
      UPDATE users
      SET name = ?, initials = ?, department = ?, role = ?, password_hash = ?
      WHERE id = ?
    `).run('Aarav Mehta', 'AM', 'Finance', 'cfo', passwordHash, existing.id);
    return Number(existing.id);
  }
  const result = db.prepare(`
    INSERT INTO users (email, name, initials, department, role, password_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('cfo@lexflow.local', 'Aarav Mehta', 'AM', 'Finance', 'cfo', passwordHash);
  return Number(result.lastInsertRowid);
}
