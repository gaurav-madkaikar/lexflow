import { DatabaseSync } from 'node:sqlite';
import { backfillReportingEvents } from './reporting-events.js';

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  organization_id INTEGER DEFAULT 1 REFERENCES organizations(id) ON DELETE SET NULL,
  auth_provider TEXT NOT NULL DEFAULT 'local' CHECK (auth_provider IN ('local', 'entra')),
  entra_tenant_id TEXT,
  entra_object_id TEXT,
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('pending', 'active', 'disabled')),
  is_platform_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_platform_admin IN (0, 1))
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
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
  created_at TEXT NOT NULL,
  organization_id INTEGER NOT NULL DEFAULT 1,
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE
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
  created_at TEXT NOT NULL,
  organization_id INTEGER NOT NULL DEFAULT 1,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL
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
  created_at TEXT NOT NULL,
  organization_id INTEGER NOT NULL DEFAULT 1,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY,
  actor_id INTEGER REFERENCES users(id),
  email_id INTEGER REFERENCES emails(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('assigned', 'completed')),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  organization_id INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  organization_id INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS gmail_connection (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  account_email TEXT NOT NULL COLLATE NOCASE,
  encrypted_refresh_token TEXT NOT NULL,
  connected_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  organization_id INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS gmail_oauth_states (
  state_digest TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  organization_id INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS outlook_connections (
  organization_id INTEGER PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL COLLATE NOCASE,
  connected_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS outlook_consent_states (
  state_digest TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL COLLATE NOCASE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE,
  shared_mailbox TEXT NOT NULL DEFAULT '',
  access_status TEXT NOT NULL DEFAULT 'not_verified' CHECK (access_status IN ('not_verified', 'confirmed', 'issue')),
  access_message TEXT,
  created_at TEXT NOT NULL,
  organization_id INTEGER NOT NULL DEFAULT 1,
  head_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS department_access_events (
  id INTEGER PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  previous_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  previous_mailbox TEXT,
  new_mailbox TEXT,
  status TEXT NOT NULL CHECK (status IN ('not_verified', 'confirmed', 'issue')),
  message TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workspace_settings (
  id INTEGER PRIMARY KEY,
  time_unassigned_hours INTEGER NOT NULL
    CHECK (time_unassigned_hours BETWEEN 1 AND 8760),
  time_assigned_unmarked_hours INTEGER NOT NULL
    CHECK (time_assigned_unmarked_hours BETWEEN 1 AND 8760),
  organization_id INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS alert_deliveries (
  email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('unassigned_overdue', 'assigned_overdue')),
  last_notified_at TEXT NOT NULL,
  organization_id INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (email_id, user_id, kind)
);
CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY,
  entra_tenant_id TEXT COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL,
  domain TEXT NOT NULL COLLATE NOCASE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  logo_asset_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS organization_assets (
  id INTEGER PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/webp')),
  content BLOB NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_transactions (
  state_digest TEXT PRIMARY KEY,
  nonce_digest TEXT NOT NULL,
  nonce TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  redirect_path TEXT NOT NULL DEFAULT '/',
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tenant_lifecycle_events (
  id INTEGER PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'archived', 'restored')),
  organization_name_snapshot TEXT NOT NULL,
  domain_snapshot TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('application', 'backfill')),
  dedupe_key TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS user_lifecycle_events (
  id INTEGER PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('added', 'disabled', 'reactivated', 'department_moved', 'role_changed')),
  department_id_before INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  department_id_after INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  department_name_before TEXT,
  department_name_after TEXT,
  role_before TEXT,
  role_after TEXT,
  user_name_snapshot TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('application', 'backfill')),
  dedupe_key TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS task_events (
  id INTEGER PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  email_id INTEGER REFERENCES emails(id) ON DELETE SET NULL,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  previous_assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('assigned', 'reassigned', 'completed')),
  assignment_source TEXT CHECK (assignment_source IS NULL OR assignment_source IN ('manual', 'rule')),
  department_name_snapshot TEXT,
  assignee_name_snapshot TEXT,
  previous_assignee_name_snapshot TEXT,
  received_at TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('application', 'backfill')),
  dedupe_key TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS rule_assignment_events (
  id INTEGER PRIMARY KEY,
  task_event_id INTEGER NOT NULL UNIQUE REFERENCES task_events(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  rule_id INTEGER REFERENCES rules(id) ON DELETE SET NULL,
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  rule_name_snapshot TEXT NOT NULL,
  department_name_snapshot TEXT,
  assignee_name_snapshot TEXT,
  priority_snapshot INTEGER NOT NULL,
  occurred_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('application', 'backfill')),
  dedupe_key TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS graph_sync_runs (
  run_id TEXT PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,
  outcome TEXT CHECK (outcome IS NULL OR outcome IN ('success', 'failed', 'skipped_connection_changed')),
  failure_category TEXT
);
CREATE TABLE IF NOT EXISTS graph_sync_department_runs (
  id INTEGER PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES graph_sync_runs(run_id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  department_name_snapshot TEXT,
  mailbox_snapshot TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,
  outcome TEXT CHECK (outcome IS NULL OR outcome IN ('success', 'failed', 'skipped_connection_changed')),
  failure_category TEXT,
  UNIQUE (run_id, mailbox_snapshot)
);
CREATE TABLE IF NOT EXISTS metrics_completeness (
  scope_key TEXT PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  family TEXT NOT NULL CHECK (family IN ('tenantLifecycle', 'userLifecycle', 'tasks', 'rules', 'graph')),
  exact_from TEXT NOT NULL,
  backfilled_at TEXT NOT NULL
);
`;

function tableHasColumn(db, table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(row => row.name === column);
}

function addColumn(db, table, column, definition) {
  if (!tableHasColumn(db, table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function migrationError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function ensureDefaultOrganization(db, now) {
  db.prepare(`
    INSERT OR IGNORE INTO organizations
      (id, entra_tenant_id, name, domain, status, created_at, updated_at)
    VALUES (1, NULL, 'Legacy workspace', 'lexflow.local', 'active', ?, ?)
  `).run(now, now);
}

function rebuildSingletonWorkspaceSettings(db) {
  const definition = String(db.prepare(`
    SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'workspace_settings'
  `).get()?.sql ?? '').toLocaleLowerCase();
  if (!definition.includes('id = 1')) return;
  db.exec(`
    CREATE TABLE workspace_settings_next (
      id INTEGER PRIMARY KEY,
      time_unassigned_hours INTEGER NOT NULL CHECK (time_unassigned_hours BETWEEN 1 AND 8760),
      time_assigned_unmarked_hours INTEGER NOT NULL CHECK (time_assigned_unmarked_hours BETWEEN 1 AND 8760),
      organization_id INTEGER NOT NULL DEFAULT 1
    );
    INSERT INTO workspace_settings_next (id, time_unassigned_hours, time_assigned_unmarked_hours, organization_id)
      SELECT id, time_unassigned_hours, time_assigned_unmarked_hours, organization_id FROM workspace_settings;
    DROP TABLE workspace_settings;
    ALTER TABLE workspace_settings_next RENAME TO workspace_settings;
  `);
}

function rebuildDepartments(db) {
  const definition = String(db.prepare(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'departments'",
  ).get()?.sql ?? '').toLocaleLowerCase();
  if (!definition.includes('unique')) return;
  db.exec(`
    CREATE TABLE departments_next (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL COLLATE NOCASE,
      created_at TEXT NOT NULL,
      organization_id INTEGER NOT NULL DEFAULT 1
    );
    INSERT OR IGNORE INTO departments_next (id, name, created_at, organization_id)
      SELECT id, name, created_at, organization_id FROM departments;
    DROP TABLE departments;
    ALTER TABLE departments_next RENAME TO departments;
    CREATE UNIQUE INDEX IF NOT EXISTS departments_organization_name_unique
      ON departments (organization_id, name COLLATE NOCASE);
  `);
}

function migrateNotifications(db) {
  const definition = String(db.prepare(`
    SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'notifications'
  `).get()?.sql ?? '').toLocaleLowerCase();
  const supportsAllKinds = definition.includes('completion') && definition.includes('assigned_overdue');
  const blocksRepeats = definition.includes('unique(user_id, email_id, kind)');
  if (supportsAllKinds && !blocksRepeats) {
    // A prior organization-aware build created this partial unique index for
    // overdue notifications. Repeating hourly alerts are now tracked by
    // alert_deliveries, so retaining it prevents legitimate repeat alerts.
    db.exec('DROP INDEX IF EXISTS notifications_overdue_unique');
    return;
  }

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

  db.exec('DROP INDEX IF EXISTS notifications_overdue_unique');
}

function migrateWorkspaceSettings(db) {
  if (tableHasColumn(db, 'workspace_settings', 'id')) return;

  // Earlier local builds scoped this singleton row by organization_id. The
  // current app has one workspace, so retain that row under the canonical key
  // rather than requiring users to discard their existing local database.
  db.exec('ALTER TABLE workspace_settings ADD COLUMN id INTEGER CHECK (id = 1)');
  db.exec('UPDATE workspace_settings SET id = 1 WHERE id IS NULL');
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS workspace_settings_id_unique
    ON workspace_settings (id)
  `);
}

function migrateAlertDeliveries(db) {
  // Organization-scoped local databases used a four-column primary key. Keep
  // their rows, while adding the three-column conflict target used by the
  // single-workspace alert runner.
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS alert_deliveries_email_user_kind_unique
    ON alert_deliveries (email_id, user_id, kind)
  `);
}

function syncStateHasKeyPrimaryKey(db) {
  return db.prepare('PRAGMA index_list(sync_state)').all().some(index => {
    if (!index.unique) return false;
    const columns = db.prepare(`PRAGMA index_info(${index.name})`).all();
    return columns.length === 1 && columns[0].name === 'key';
  });
}

function migrateSyncState(db) {
  if (syncStateHasKeyPrimaryKey(db)) return;

  // Older multi-connection builds could hold several values for the same
  // source key. This app has one workspace, so retain the latest connection's
  // value for each key and restore the key-level primary key its sync runner
  // relies on.
  db.exec(`
    CREATE TABLE sync_state_next (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    INSERT INTO sync_state_next (key, value)
    SELECT key, value
    FROM (
      SELECT key, value,
        row_number() OVER (
          PARTITION BY key
          ORDER BY connection_id DESC, organization_id DESC
        ) AS row_number
      FROM sync_state
    )
    WHERE row_number = 1;
    DROP TABLE sync_state;
    ALTER TABLE sync_state_next RENAME TO sync_state;
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
    migrateWorkspaceSettings(db);
    migrateAlertDeliveries(db);
    migrateSyncState(db);

    const createdAt = new Date().toISOString();
    // Compatibility for the previous organization-aware local schema. Keep
    // its records, but add the Entra-era fields before the default-org check
    // and normalize the old domain column into the canonical one.
    addColumn(db, 'organizations', 'entra_tenant_id', 'TEXT');
    addColumn(db, 'organizations', 'domain', 'TEXT');
    addColumn(db, 'organizations', 'status', "TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived'))");
    addColumn(db, 'organizations', 'timezone', "TEXT NOT NULL DEFAULT 'UTC'");
    if (tableHasColumn(db, 'organizations', 'normalized_domain')) {
      db.prepare(`
        UPDATE organizations
        SET domain = normalized_domain
        WHERE domain IS NULL AND normalized_domain IS NOT NULL
      `).run();
    }
    db.prepare(`
      UPDATE organizations
      SET domain = 'lexflow.local'
      WHERE domain IS NULL OR trim(domain) = ''
    `).run();
    ensureDefaultOrganization(db, createdAt);
    addColumn(db, 'users', 'organization_id', 'INTEGER REFERENCES organizations(id) ON DELETE SET NULL');
    addColumn(db, 'users', 'auth_provider', "TEXT NOT NULL DEFAULT 'local' CHECK (auth_provider IN ('local', 'entra'))");
    addColumn(db, 'users', 'entra_tenant_id', 'TEXT');
    addColumn(db, 'users', 'entra_object_id', 'TEXT');
    addColumn(db, 'users', 'account_status', "TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('pending', 'active', 'disabled'))");
    addColumn(db, 'users', 'is_platform_admin', 'INTEGER NOT NULL DEFAULT 0 CHECK (is_platform_admin IN (0, 1))');
    addColumn(db, 'users', 'department_id', 'INTEGER REFERENCES departments(id) ON DELETE SET NULL');
    if (tableHasColumn(db, 'users', 'registration_status')) {
      db.prepare(`
        UPDATE users
        SET account_status = registration_status
        WHERE registration_status IN ('pending', 'active', 'disabled')
      `).run();
    }
    addColumn(db, 'sessions', 'organization_id', 'INTEGER REFERENCES organizations(id) ON DELETE CASCADE');
    for (const table of ['rules', 'emails', 'notifications', 'activity', 'sync_state', 'gmail_connection', 'gmail_oauth_states', 'departments', 'workspace_settings', 'alert_deliveries']) {
      addColumn(db, table, 'organization_id', 'INTEGER NOT NULL DEFAULT 1');
    }
    addColumn(db, 'auth_transactions', 'nonce', "TEXT NOT NULL DEFAULT ''");
    rebuildSingletonWorkspaceSettings(db);
    rebuildDepartments(db);
    addColumn(db, 'departments', 'shared_mailbox', "TEXT NOT NULL DEFAULT ''");
    addColumn(db, 'departments', 'access_status', "TEXT NOT NULL DEFAULT 'not_verified' CHECK (access_status IN ('not_verified', 'confirmed', 'issue'))");
    addColumn(db, 'departments', 'access_message', 'TEXT');
    addColumn(db, 'departments', 'head_user_id', 'INTEGER REFERENCES users(id) ON DELETE RESTRICT');
    addColumn(db, 'rules', 'department_id', 'INTEGER REFERENCES departments(id) ON DELETE CASCADE');
    addColumn(db, 'emails', 'department_id', 'INTEGER REFERENCES departments(id) ON DELETE SET NULL');
    addColumn(db, 'activity', 'department_id', 'INTEGER REFERENCES departments(id) ON DELETE SET NULL');
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS departments_organization_name_unique ON departments (organization_id, name COLLATE NOCASE)');
    db.prepare('UPDATE users SET organization_id = 1 WHERE organization_id IS NULL AND is_platform_admin = 0').run();
    db.prepare(`
      INSERT OR IGNORE INTO departments (name, created_at, organization_id)
      SELECT trim(department), ?, organization_id
      FROM users
      WHERE role = 'member' AND organization_id IS NOT NULL AND trim(department) <> ''
      GROUP BY organization_id, lower(trim(department))
    `).run(createdAt);
    db.prepare(`
      UPDATE users
      SET department_id = (
        SELECT d.id FROM departments d
        WHERE d.organization_id = users.organization_id
          AND lower(d.name) = lower(trim(users.department))
        ORDER BY d.id LIMIT 1
      )
      WHERE role = 'member' AND department_id IS NULL AND trim(department) <> ''
    `).run();
    db.prepare("UPDATE users SET department = '', department_id = NULL WHERE role = 'admin'").run();

    const duplicateMailbox = db.prepare(`
      SELECT organization_id, lower(trim(shared_mailbox)) AS mailbox
      FROM departments
      WHERE trim(shared_mailbox) <> ''
      GROUP BY organization_id, lower(trim(shared_mailbox))
      HAVING COUNT(*) > 1
      LIMIT 1
    `).get();
    if (duplicateMailbox) {
      throw migrationError(
        'DUPLICATE_SHARED_MAILBOX',
        'Two departments in the same organization use the same shared mailbox.',
      );
    }

    db.prepare(`
      UPDATE departments
      SET head_user_id = NULL
      WHERE head_user_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM users
          WHERE users.id = departments.head_user_id
            AND users.organization_id = departments.organization_id
            AND users.department_id = departments.id
            AND users.role = 'member'
            AND users.account_status IN ('pending', 'active')
        )
    `).run();
    db.prepare(`
      UPDATE departments
      SET head_user_id = (
        SELECT users.id
        FROM users
        WHERE users.organization_id = departments.organization_id
          AND users.department_id = departments.id
          AND users.role = 'member'
          AND users.account_status IN ('pending', 'active')
        ORDER BY users.id
        LIMIT 1
      )
      WHERE head_user_id IS NULL
    `).run();

    db.prepare(`
      UPDATE rules
      SET department_id = (
        SELECT users.department_id
        FROM users
        WHERE users.id = rules.assignee_id
          AND users.organization_id = rules.organization_id
          AND users.role = 'member'
      )
      WHERE department_id IS NULL
    `).run();
    if (db.prepare('SELECT 1 FROM rules WHERE department_id IS NULL LIMIT 1').get()) {
      throw migrationError(
        'UNMAPPABLE_DEPARTMENT_RULE',
        'An existing automation rule cannot be mapped to an assignee department.',
      );
    }

    db.prepare(`
      UPDATE emails
      SET department_id = (
        SELECT departments.id
        FROM departments
        WHERE departments.organization_id = emails.organization_id
          AND trim(departments.shared_mailbox) <> ''
          AND lower(trim(departments.shared_mailbox)) = lower(trim(emails.mailbox_address))
        LIMIT 1
      )
      WHERE department_id IS NULL AND mailbox_address IS NOT NULL
    `).run();
    db.prepare(`
      UPDATE emails
      SET department_id = (
        SELECT users.department_id
        FROM users
        WHERE users.id = emails.assignee_id
          AND users.organization_id = emails.organization_id
          AND users.role = 'member'
      )
      WHERE department_id IS NULL
        AND status IN ('assigned', 'completed')
        AND assignee_id IS NOT NULL
    `).run();
    db.prepare(`
      UPDATE activity
      SET department_id = (
        SELECT emails.department_id
        FROM emails
        WHERE emails.id = activity.email_id
          AND emails.organization_id = activity.organization_id
      )
      WHERE department_id IS NULL AND email_id IS NOT NULL
    `).run();

    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS departments_organization_mailbox_unique
      ON departments (organization_id, lower(trim(shared_mailbox)))
      WHERE trim(shared_mailbox) <> '';
      CREATE UNIQUE INDEX IF NOT EXISTS departments_head_user_unique
      ON departments (head_user_id)
      WHERE head_user_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS emails_organization_department_status
      ON emails (organization_id, department_id, status);
      CREATE INDEX IF NOT EXISTS rules_organization_department_priority
      ON rules (organization_id, department_id, enabled, priority, id);
      CREATE INDEX IF NOT EXISTS activity_organization_department_created
      ON activity (organization_id, department_id, created_at, id);
      CREATE INDEX IF NOT EXISTS tenant_events_time
      ON tenant_lifecycle_events (occurred_at, event_type);
      CREATE INDEX IF NOT EXISTS user_events_scope_time
      ON user_lifecycle_events (organization_id, department_id_after, occurred_at, event_type);
      CREATE INDEX IF NOT EXISTS task_events_scope_time
      ON task_events (organization_id, department_id, occurred_at, event_type);
      CREATE INDEX IF NOT EXISTS task_events_user_time
      ON task_events (organization_id, assignee_id, occurred_at, event_type);
      CREATE INDEX IF NOT EXISTS rule_events_scope_time
      ON rule_assignment_events (organization_id, department_id, occurred_at);
      CREATE INDEX IF NOT EXISTS graph_runs_scope_time
      ON graph_sync_runs (organization_id, started_at, outcome);

      CREATE TRIGGER IF NOT EXISTS rules_department_required_insert
      BEFORE INSERT ON rules
      WHEN NEW.department_id IS NULL
      BEGIN
        SELECT RAISE(ABORT, 'RULE_DEPARTMENT_REQUIRED');
      END;

      CREATE TRIGGER IF NOT EXISTS rules_department_required_update
      BEFORE UPDATE OF department_id ON rules
      WHEN NEW.department_id IS NULL
      BEGIN
        SELECT RAISE(ABORT, 'RULE_DEPARTMENT_REQUIRED');
      END;

      CREATE TRIGGER IF NOT EXISTS departments_head_valid_insert
      BEFORE INSERT ON departments
      WHEN NEW.head_user_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM users
        WHERE users.id = NEW.head_user_id
          AND users.organization_id = NEW.organization_id
          AND users.department_id = NEW.id
          AND users.role = 'member'
          AND users.account_status IN ('pending', 'active')
      )
      BEGIN
        SELECT RAISE(ABORT, 'INVALID_DEPARTMENT_HEAD');
      END;

      CREATE TRIGGER IF NOT EXISTS departments_head_valid_update
      BEFORE UPDATE OF head_user_id ON departments
      WHEN NEW.head_user_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM users
        WHERE users.id = NEW.head_user_id
          AND users.organization_id = NEW.organization_id
          AND users.department_id = NEW.id
          AND users.role = 'member'
          AND users.account_status IN ('pending', 'active')
      )
      BEGIN
        SELECT RAISE(ABORT, 'INVALID_DEPARTMENT_HEAD');
      END;

      CREATE TRIGGER IF NOT EXISTS users_protect_department_head_update
      BEFORE UPDATE OF organization_id, department_id, role, account_status ON users
      WHEN EXISTS (SELECT 1 FROM departments WHERE departments.head_user_id = OLD.id)
        AND (
          NEW.organization_id IS NOT OLD.organization_id
          OR NEW.department_id IS NOT OLD.department_id
          OR NEW.role <> 'member'
          OR NEW.account_status = 'disabled'
        )
      BEGIN
        SELECT RAISE(ABORT, 'DEPARTMENT_HEAD_REPLACEMENT_REQUIRED');
      END;

      CREATE TRIGGER IF NOT EXISTS users_protect_department_head_delete
      BEFORE DELETE ON users
      WHEN EXISTS (SELECT 1 FROM departments WHERE departments.head_user_id = OLD.id)
      BEGIN
        SELECT RAISE(ABORT, 'DEPARTMENT_HEAD_REPLACEMENT_REQUIRED');
      END;
    `);
    db.exec('CREATE TABLE IF NOT EXISTS department_access_events (id INTEGER PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, previous_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL, previous_mailbox TEXT, new_mailbox TEXT, status TEXT NOT NULL CHECK (status IN (\'not_verified\', \'confirmed\', \'issue\')), message TEXT, created_at TEXT NOT NULL)');
    db.prepare(`
      UPDATE sessions
      SET organization_id = (SELECT organization_id FROM users WHERE users.id = sessions.user_id)
      WHERE organization_id IS NULL
    `).run();
    db.prepare(`
      INSERT OR IGNORE INTO workspace_settings
        (id, time_unassigned_hours, time_assigned_unmarked_hours, organization_id)
      VALUES (1, 1, 24, 1)
    `).run();
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_entra_identity_unique
      ON users (entra_tenant_id, entra_object_id)
      WHERE entra_tenant_id IS NOT NULL AND entra_object_id IS NOT NULL
    `);
    backfillReportingEvents(db, new Date(createdAt));
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

const KNOWN_DEMO_EMAILS = new Set([
  'admin@lexflow.local',
  'maya@lexflow.local',
  'priya@lexflow.local',
]);

export function assertNoLocalAccounts(db) {
  const localUsers = db.prepare("SELECT email FROM users WHERE auth_provider = 'local'").all();
  if (localUsers.length) {
    const error = new Error(
      'This database still contains local accounts. Local login is disabled; migrate identities or run the explicit demo reset command for a demo-only database.',
    );
    error.code = 'LOCAL_IDENTITY_DATA_REQUIRES_MIGRATION';
    throw error;
  }
}

export function resetKnownDemoData(db) {
  const users = db.prepare('SELECT email, auth_provider, organization_id FROM users').all();
  const organizations = db.prepare('SELECT id, entra_tenant_id FROM organizations').all();
  const isKnownDemo = users.length === KNOWN_DEMO_EMAILS.size
    && users.every(user => KNOWN_DEMO_EMAILS.has(String(user.email).toLocaleLowerCase())
      && user.auth_provider === 'local'
      && (user.organization_id == null || Number(user.organization_id) === 1))
    && organizations.every(organization => Number(organization.id) === 1 && !organization.entra_tenant_id);
  if (!isKnownDemo) {
    const error = new Error('Refusing to reset: the database is not the known local demo workspace.');
    error.code = 'RESET_NOT_SAFE';
    throw error;
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const table of [
      'alert_deliveries', 'notifications', 'activity', 'emails', 'rules', 'sync_state',
      'gmail_oauth_states', 'gmail_connection', 'outlook_consent_states', 'outlook_connections',
      'workspace_settings', 'departments',
      'sessions', 'auth_transactions', 'organization_assets', 'users', 'organizations',
    ]) db.exec(`DELETE FROM ${table}`);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function seedDemoData(
  db,
  {} = {},
) {
  const existingUsers = db.prepare('SELECT count(*) AS count FROM users').get().count;
  if (existingUsers > 0) return;

  const createdAt = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    const insertUser = db.prepare(`
      INSERT INTO users
        (email, name, initials, department, role, organization_id, auth_provider)
      VALUES (?, ?, ?, ?, ?, 1, 'local')
    `);
    insertUser.run(
      'admin@lexflow.local',
      'LexFlow Admin',
      'LA',
      '',
      'admin',
    );
    const maya = insertUser.run(
      'maya@lexflow.local',
      'Maya Shah',
      'MS',
      'Legal',
      'member',
    );
    const priya = insertUser.run(
      'priya@lexflow.local',
      'Priya Menon',
      'PM',
      'Finance',
      'member',
    );

    const insertDepartment = db.prepare(`
      INSERT OR IGNORE INTO departments
        (name, shared_mailbox, access_status, access_message, created_at, organization_id)
      VALUES (?, ?, 'confirmed', 'Mailbox access confirmed.', ?, 1)
    `);
    for (const [name, mailbox] of [
      ['Legal', 'legal@lexflow.local'],
      ['Finance', 'finance@lexflow.local'],
    ]) {
      insertDepartment.run(name, mailbox, createdAt);
    }

    db.prepare(`
      UPDATE users
      SET department_id = (
        SELECT departments.id
        FROM departments
        WHERE departments.organization_id = users.organization_id
          AND lower(departments.name) = lower(users.department)
      )
      WHERE role = 'member'
    `).run();
    db.prepare(`
      UPDATE departments
      SET head_user_id = (
        SELECT users.id
        FROM users
        WHERE users.organization_id = departments.organization_id
          AND users.department_id = departments.id
          AND users.role = 'member'
        ORDER BY users.id
        LIMIT 1
      )
    `).run();

    const insertRule = db.prepare(`
      INSERT INTO rules
        (name, keywords, sender_filter, assignee_id, priority, enabled, created_at, organization_id, department_id)
      VALUES (?, ?, '', ?, ?, 1, ?, 1, ?)
    `);
    const legalId = db.prepare("SELECT id FROM departments WHERE organization_id = 1 AND name = 'Legal'").get().id;
    const financeId = db.prepare("SELECT id FROM departments WHERE organization_id = 1 AND name = 'Finance'").get().id;
    insertRule.run('ACME NDA review', 'ACME,NDA', maya.lastInsertRowid, 10, createdAt, legalId);
    insertRule.run('Invoice payment review', 'invoice,payment', priya.lastInsertRowid, 20, createdAt, financeId);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
