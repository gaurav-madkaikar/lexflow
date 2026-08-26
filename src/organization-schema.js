export const DEFAULT_ORGANIZATION_HANDLE = 'lexflow-local';

const ORGANIZATION_SCHEMA_VERSION = 3;

function tableExists(db, table) {
  return Boolean(db.prepare(`
    SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?
  `).get(table));
}

function tableHasColumn(db, table, column) {
  return tableExists(db, table)
    && db.prepare(`PRAGMA table_info(${table})`).all().some(row => row.name === column);
}

function addColumn(db, table, column, definition) {
  if (!tableHasColumn(db, table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function emailProviderIdIsGloballyUnique(db) {
  if (!tableExists(db, 'emails')) return false;
  return db.prepare(`PRAGMA index_list(emails)`).all().some(index => {
    if (Number(index.unique) !== 1) return false;
    const columns = db.prepare(`PRAGMA index_info(${JSON.stringify(index.name)})`).all();
    return columns.length === 1 && columns[0].name === 'provider_id';
  });
}

function createOrganizationTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY,
      handle TEXT NOT NULL COLLATE NOCASE UNIQUE,
      join_code TEXT NOT NULL COLLATE NOCASE UNIQUE,
      name TEXT NOT NULL,
      normalized_domain TEXT NOT NULL COLLATE NOCASE,
      domain_verified INTEGER NOT NULL DEFAULT 0 CHECK (domain_verified IN (0, 1)),
      logo_asset_id INTEGER REFERENCES organization_assets(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS organization_assets (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL UNIQUE
        REFERENCES organizations(id) ON DELETE CASCADE,
      mime_type TEXT NOT NULL CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/webp')),
      content BLOB NOT NULL,
      width INTEGER NOT NULL CHECK (width BETWEEN 64 AND 2048),
      height INTEGER NOT NULL CHECK (height BETWEEN 64 AND 2048),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS join_requests (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      email TEXT NOT NULL COLLATE NOCASE,
      mailbox_provider TEXT NOT NULL CHECK (mailbox_provider IN ('gmail', 'outlook')),
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
      source_address TEXT NOT NULL,
      decided_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      decided_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS join_request_attempts (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL COLLATE NOCASE,
      source_address TEXT NOT NULL,
      attempted_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS registration_invites (
      id INTEGER PRIMARY KEY,
      join_request_id INTEGER NOT NULL UNIQUE
        REFERENCES join_requests(id) ON DELETE CASCADE,
      token_digest TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      consumed_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS join_requests_pending_unique
      ON join_requests (organization_id, email COLLATE NOCASE)
      WHERE status = 'pending';
    CREATE INDEX IF NOT EXISTS join_requests_organization_status_idx
      ON join_requests (organization_id, status, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS join_request_attempts_rate_limit_idx
      ON join_request_attempts (email COLLATE NOCASE, source_address, attempted_at DESC);
    CREATE INDEX IF NOT EXISTS registration_invites_expiry_idx
      ON registration_invites (expires_at);
  `);
}

function createCanonicalTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS mailbox_identities (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
      normalized_mailbox TEXT NOT NULL COLLATE NOCASE,
      provider_account_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (organization_id, id),
      UNIQUE (
        organization_id, provider, normalized_mailbox COLLATE NOCASE,
        provider_account_id
      ),
      UNIQUE (organization_id, id, provider),
      UNIQUE (
        organization_id, id, provider, normalized_mailbox COLLATE NOCASE
      )
    );
    CREATE TABLE IF NOT EXISTS mailbox_connections (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
      mailbox_identity_id INTEGER NOT NULL,
      admin_user_id INTEGER NOT NULL,
      provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
      encrypted_grant TEXT NOT NULL,
      grant_kind TEXT NOT NULL DEFAULT 'oauth'
        CHECK (grant_kind IN ('oauth', 'application', 'legacy')),
      capabilities_json TEXT NOT NULL DEFAULT '[]',
      generation INTEGER NOT NULL DEFAULT 1 CHECK (generation >= 1),
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      connected_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      disconnected_at TEXT,
      UNIQUE (organization_id, id),
      UNIQUE (mailbox_identity_id),
      UNIQUE (organization_id, id, mailbox_identity_id),
      FOREIGN KEY (organization_id, mailbox_identity_id, provider)
        REFERENCES mailbox_identities(organization_id, id, provider),
      FOREIGN KEY (organization_id, admin_user_id)
        REFERENCES users(organization_id, id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS mailbox_connections_active_provider_unique
      ON mailbox_connections (organization_id, provider)
      WHERE is_active = 1;
    CREATE INDEX IF NOT EXISTS mailbox_connections_identity_idx
      ON mailbox_connections (organization_id, mailbox_identity_id, is_active);

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
      public_id TEXT NOT NULL UNIQUE,
      current_assignee_id INTEGER,
      completion_state TEXT NOT NULL DEFAULT 'unassigned'
        CHECK (completion_state IN ('unassigned', 'assigned', 'completed')),
      subject TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
      data_conflict TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (organization_id, id),
      FOREIGN KEY (organization_id, current_assignee_id)
        REFERENCES users(organization_id, id)
    );
    CREATE INDEX IF NOT EXISTS conversations_organization_updated_idx
      ON conversations (organization_id, updated_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS conversations_organization_assignee_idx
      ON conversations (organization_id, current_assignee_id, completion_state, id);

    CREATE TABLE IF NOT EXISTS conversation_sources (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
      conversation_id INTEGER NOT NULL,
      mailbox_identity_id INTEGER,
      last_resolved_connection_id INTEGER,
      provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'demo')),
      normalized_mailbox TEXT NOT NULL DEFAULT '' COLLATE NOCASE,
      native_conversation_id TEXT,
      fallback_key TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (organization_id, id),
      FOREIGN KEY (organization_id, conversation_id)
        REFERENCES conversations(organization_id, id) ON DELETE CASCADE,
      FOREIGN KEY (
        organization_id, mailbox_identity_id, provider, normalized_mailbox
      ) REFERENCES mailbox_identities(
        organization_id, id, provider, normalized_mailbox
      ),
      FOREIGN KEY (
        organization_id, last_resolved_connection_id, mailbox_identity_id
      ) REFERENCES mailbox_connections(
        organization_id, id, mailbox_identity_id
      ),
      CHECK (
        (native_conversation_id IS NOT NULL AND native_conversation_id <> ''
          AND fallback_key IS NULL AND mailbox_identity_id IS NOT NULL
          AND last_resolved_connection_id IS NOT NULL
          AND normalized_mailbox <> '')
        OR
        (native_conversation_id IS NULL AND fallback_key IS NOT NULL
          AND fallback_key <> '' AND mailbox_identity_id IS NULL
          AND last_resolved_connection_id IS NULL)
      )
    );
    CREATE UNIQUE INDEX IF NOT EXISTS conversation_sources_native_unique
      ON conversation_sources (
        organization_id, mailbox_identity_id, provider,
        normalized_mailbox COLLATE NOCASE, native_conversation_id
      )
      WHERE native_conversation_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS conversation_sources_fallback_unique
      ON conversation_sources (organization_id, fallback_key)
      WHERE fallback_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS conversation_sources_conversation_idx
      ON conversation_sources (organization_id, conversation_id, id);
  `);
}

function ensureDefaultOrganization(db, createdAt) {
  db.prepare(`
    INSERT OR IGNORE INTO organizations
      (handle, join_code, name, normalized_domain, domain_verified, created_at, updated_at)
    VALUES (?, 'LEXFLOW-LOCAL', 'LexFlow Local', 'lexflow.local', 0, ?, ?)
  `).run(DEFAULT_ORGANIZATION_HANDLE, createdAt, createdAt);
  return Number(db.prepare('SELECT id FROM organizations WHERE handle = ?')
    .get(DEFAULT_ORGANIZATION_HANDLE).id);
}

function addAndBackfillOrganizationColumns(db, organizationId) {
  addColumn(
    db,
    'users',
    'organization_id',
    `INTEGER NOT NULL DEFAULT ${organizationId} REFERENCES organizations(id)`,
  );
  addColumn(
    db,
    'users',
    'registration_status',
    "TEXT NOT NULL DEFAULT 'active' CHECK (registration_status IN ('pending', 'active', 'disabled'))",
  );
  addColumn(
    db,
    'users',
    'mailbox_provider',
    "TEXT CHECK (mailbox_provider IN ('gmail', 'outlook'))",
  );
  db.exec(`
    UPDATE users
    SET mailbox_provider = CASE
      WHEN lower(email) LIKE '%@gmail.com' THEN 'gmail'
      WHEN lower(email) LIKE '%@outlook.com'
        OR lower(email) LIKE '%@hotmail.com'
        OR lower(email) LIKE '%@live.com' THEN 'outlook'
      ELSE mailbox_provider
    END
    WHERE mailbox_provider IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS users_organization_id_unique
      ON users (organization_id, id);
  `);

  for (const table of [
    'rules',
    'emails',
    'notifications',
    'activity',
    'gmail_connection',
    'gmail_oauth_states',
    'alert_deliveries',
  ]) {
    addColumn(
      db,
      table,
      'organization_id',
      `INTEGER NOT NULL DEFAULT ${organizationId} REFERENCES organizations(id)`,
    );
  }
  addColumn(db, 'emails', 'connection_id', 'INTEGER NOT NULL DEFAULT 0');
}

function rebuildDepartments(db, organizationId) {
  if (tableHasColumn(db, 'departments', 'organization_id')) return;
  db.exec(`
    CREATE TABLE departments_next (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL DEFAULT ${organizationId}
        REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL COLLATE NOCASE,
      created_at TEXT NOT NULL,
      UNIQUE (organization_id, name COLLATE NOCASE)
    );
    INSERT INTO departments_next (id, organization_id, name, created_at)
    SELECT id, ${organizationId}, name, created_at FROM departments;
    DROP TABLE departments;
    ALTER TABLE departments_next RENAME TO departments;
  `);
}

function rebuildWorkspaceSettings(db, organizationId) {
  if (tableHasColumn(db, 'workspace_settings', 'organization_id')) return;
  db.exec(`
    CREATE TABLE workspace_settings_next (
      organization_id INTEGER PRIMARY KEY DEFAULT ${organizationId}
        REFERENCES organizations(id) ON DELETE CASCADE,
      time_unassigned_hours INTEGER NOT NULL
        CHECK (time_unassigned_hours BETWEEN 1 AND 8760),
      time_assigned_unmarked_hours INTEGER NOT NULL
        CHECK (time_assigned_unmarked_hours BETWEEN 1 AND 8760)
    );
    INSERT INTO workspace_settings_next
      (organization_id, time_unassigned_hours, time_assigned_unmarked_hours)
    SELECT ${organizationId}, time_unassigned_hours, time_assigned_unmarked_hours
    FROM workspace_settings
    ORDER BY id
    LIMIT 1;
    DROP TABLE workspace_settings;
    ALTER TABLE workspace_settings_next RENAME TO workspace_settings;
  `);
}

function rebuildSyncState(db, organizationId) {
  if (
    tableHasColumn(db, 'sync_state', 'organization_id')
    && tableHasColumn(db, 'sync_state', 'connection_id')
  ) return;
  db.exec(`
    CREATE TABLE sync_state_next (
      organization_id INTEGER NOT NULL DEFAULT ${organizationId}
        REFERENCES organizations(id) ON DELETE CASCADE,
      connection_id INTEGER NOT NULL DEFAULT 0,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (organization_id, connection_id, key)
    );
    INSERT INTO sync_state_next (organization_id, connection_id, key, value)
    SELECT ${organizationId}, 0, key, value FROM sync_state;
    DROP TABLE sync_state;
    ALTER TABLE sync_state_next RENAME TO sync_state;
  `);
}

function rebuildThreadOwners(db, organizationId) {
  if (tableHasColumn(db, 'email_thread_owners', 'organization_id')) return;
  db.exec(`
    CREATE TABLE email_thread_owners_next (
      organization_id INTEGER NOT NULL DEFAULT ${organizationId}
        REFERENCES organizations(id) ON DELETE CASCADE,
      thread_key TEXT NOT NULL,
      assignee_id INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (organization_id, thread_key),
      FOREIGN KEY (organization_id, assignee_id)
        REFERENCES users(organization_id, id) ON DELETE CASCADE
    );
    INSERT INTO email_thread_owners_next
      (organization_id, thread_key, assignee_id, updated_at)
    SELECT ${organizationId}, thread_key, assignee_id, updated_at
    FROM email_thread_owners;
    DROP TABLE email_thread_owners;
    ALTER TABLE email_thread_owners_next RENAME TO email_thread_owners;
  `);
}

function rebuildAlertDeliveries(db, organizationId) {
  const definition = String(db.prepare(`
    SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'alert_deliveries'
  `).get()?.sql ?? '').replace(/\s+/g, ' ').toLocaleLowerCase();
  if (definition.includes('primary key (organization_id, email_id, user_id, kind)')) return;
  db.exec(`
    CREATE TABLE alert_deliveries_next (
      organization_id INTEGER NOT NULL DEFAULT ${organizationId}
        REFERENCES organizations(id) ON DELETE CASCADE,
      email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('unassigned_overdue', 'assigned_overdue')),
      last_notified_at TEXT NOT NULL,
      PRIMARY KEY (organization_id, email_id, user_id, kind)
    );
    INSERT INTO alert_deliveries_next
      (organization_id, email_id, user_id, kind, last_notified_at)
    SELECT organization_id, email_id, user_id, kind, last_notified_at
    FROM alert_deliveries;
    DROP TABLE alert_deliveries;
    ALTER TABLE alert_deliveries_next RENAME TO alert_deliveries;
  `);
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function rebuildEmailsForCanonicalIdentity(db, organizationId) {
  const needsRebuild = !tableHasColumn(db, 'emails', 'conversation_id')
    || emailProviderIdIsGloballyUnique(db);
  if (!needsRebuild) return;

  const indexes = db.prepare(`
    SELECT name, sql
    FROM sqlite_master
    WHERE type = 'index' AND tbl_name = 'emails' AND sql IS NOT NULL
    ORDER BY name
  `).all().filter(index => {
    const columns = db.prepare(`PRAGMA index_info(${JSON.stringify(index.name)})`).all();
    return !(columns.length === 1 && columns[0].name === 'provider_id');
  });
  const triggers = db.prepare(`
    SELECT name, sql
    FROM sqlite_master
    WHERE type = 'trigger' AND sql IS NOT NULL
      AND instr(lower(sql), 'emails') > 0
    ORDER BY name
  `).all();
  for (const trigger of triggers) {
    db.exec(`DROP TRIGGER ${quoteIdentifier(trigger.name)}`);
  }

  const conversationExpression = tableHasColumn(db, 'emails', 'conversation_id')
    ? 'conversation_id'
    : 'NULL';
  db.exec(`
    DROP TABLE IF EXISTS emails_next;
    CREATE TABLE emails_next (
      id INTEGER PRIMARY KEY,
      provider_id TEXT NOT NULL,
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
      organization_id INTEGER NOT NULL DEFAULT ${organizationId}
        REFERENCES organizations(id) ON DELETE CASCADE,
      connection_id INTEGER NOT NULL DEFAULT 0,
      conversation_id INTEGER,
      FOREIGN KEY (organization_id, conversation_id)
        REFERENCES conversations(organization_id, id)
    );
    INSERT INTO emails_next
      (id, provider_id, provider, mailbox_address, subject, thread_key,
       sender_name, sender_address, preview, received_at, outlook_url, status,
       assignee_id, assigned_at, completed_by, completed_at, created_at,
       organization_id, connection_id, conversation_id)
    SELECT id, provider_id, provider, mailbox_address, subject, thread_key,
           sender_name, sender_address, preview, received_at, outlook_url, status,
           assignee_id, assigned_at, completed_by, completed_at, created_at,
           organization_id, connection_id, ${conversationExpression}
    FROM emails;
    DROP TABLE emails;
    ALTER TABLE emails_next RENAME TO emails;
  `);

  for (const index of indexes) db.exec(index.sql);
  for (const trigger of triggers) db.exec(trigger.sql);
}

function rebuildTenantKeyedTables(db, organizationId) {
  rebuildDepartments(db, organizationId);
  rebuildWorkspaceSettings(db, organizationId);
  rebuildSyncState(db, organizationId);
  rebuildThreadOwners(db, organizationId);
  rebuildAlertDeliveries(db, organizationId);
  rebuildEmailsForCanonicalIdentity(db, organizationId);
}

function userReferenceTriggers(table, column) {
  const base = `organization_guard_${table}_${column}`;
  return `
    CREATE TRIGGER IF NOT EXISTS ${base}_insert
    BEFORE INSERT ON ${table}
    WHEN NEW.${column} IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = NEW.${column} AND organization_id = NEW.organization_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'organization mismatch');
    END;
    CREATE TRIGGER IF NOT EXISTS ${base}_update
    BEFORE UPDATE OF organization_id, ${column} ON ${table}
    WHEN NEW.${column} IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = NEW.${column} AND organization_id = NEW.organization_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'organization mismatch');
    END;
  `;
}

function emailReferenceTriggers(table, column) {
  const base = `organization_guard_${table}_${column}`;
  return `
    CREATE TRIGGER IF NOT EXISTS ${base}_insert
    BEFORE INSERT ON ${table}
    WHEN NEW.${column} IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM emails
      WHERE id = NEW.${column} AND organization_id = NEW.organization_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'organization mismatch');
    END;
    CREATE TRIGGER IF NOT EXISTS ${base}_update
    BEFORE UPDATE OF organization_id, ${column} ON ${table}
    WHEN NEW.${column} IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM emails
      WHERE id = NEW.${column} AND organization_id = NEW.organization_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'organization mismatch');
    END;
  `;
}

function conversationReferenceTriggers(table, column) {
  const base = `organization_guard_${table}_${column}`;
  return `
    CREATE TRIGGER IF NOT EXISTS ${base}_insert
    BEFORE INSERT ON ${table}
    WHEN NEW.${column} IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM conversations
      WHERE id = NEW.${column} AND organization_id = NEW.organization_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'organization mismatch');
    END;
    CREATE TRIGGER IF NOT EXISTS ${base}_update
    BEFORE UPDATE OF organization_id, ${column} ON ${table}
    WHEN NEW.${column} IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM conversations
      WHERE id = NEW.${column} AND organization_id = NEW.organization_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'organization mismatch');
    END;
  `;
}

function immutableOrganizationTrigger(table) {
  return `
    CREATE TRIGGER IF NOT EXISTS organization_guard_${table}_immutable
    BEFORE UPDATE OF organization_id ON ${table}
    WHEN NEW.organization_id <> OLD.organization_id
    BEGIN
      SELECT RAISE(ABORT, 'organization mismatch');
    END;
  `;
}

function createTenantIndexesAndTriggers(db) {
  db.exec(`
    DROP INDEX IF EXISTS notifications_overdue_unique;
    CREATE UNIQUE INDEX notifications_overdue_unique
      ON notifications (organization_id, user_id, email_id, kind)
      WHERE kind IN ('unassigned_overdue', 'assigned_overdue');
    CREATE INDEX IF NOT EXISTS users_organization_role_idx
      ON users (organization_id, role, registration_status, name, id);
    CREATE INDEX IF NOT EXISTS rules_organization_priority_idx
      ON rules (organization_id, priority, id);
    CREATE UNIQUE INDEX IF NOT EXISTS emails_organization_provider_unique
      ON emails (organization_id, connection_id, provider_id);
    CREATE INDEX IF NOT EXISTS emails_organization_received_idx
      ON emails (organization_id, julianday(received_at) DESC, id DESC);
    CREATE INDEX IF NOT EXISTS emails_organization_thread_idx
      ON emails (organization_id, thread_key, julianday(received_at) DESC, id DESC);
    CREATE INDEX IF NOT EXISTS notifications_organization_user_idx
      ON notifications (organization_id, user_id, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS activity_organization_created_idx
      ON activity (organization_id, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS gmail_connection_organization_idx
      ON gmail_connection (organization_id, id);
    CREATE INDEX IF NOT EXISTS gmail_oauth_states_organization_idx
      ON gmail_oauth_states (organization_id, expires_at);
    CREATE INDEX IF NOT EXISTS alert_deliveries_organization_idx
      ON alert_deliveries (organization_id, user_id, email_id);
    CREATE INDEX IF NOT EXISTS emails_organization_conversation_idx
      ON emails (organization_id, conversation_id, julianday(received_at) DESC, id DESC);
  `);

  db.exec(userReferenceTriggers('rules', 'assignee_id'));
  db.exec(userReferenceTriggers('emails', 'assignee_id'));
  db.exec(userReferenceTriggers('emails', 'completed_by'));
  db.exec(userReferenceTriggers('email_thread_owners', 'assignee_id'));
  db.exec(userReferenceTriggers('notifications', 'user_id'));
  db.exec(userReferenceTriggers('activity', 'actor_id'));
  db.exec(userReferenceTriggers('alert_deliveries', 'user_id'));
  db.exec(userReferenceTriggers('join_requests', 'decided_by'));
  db.exec(userReferenceTriggers('conversations', 'current_assignee_id'));
  db.exec(emailReferenceTriggers('notifications', 'email_id'));
  db.exec(emailReferenceTriggers('activity', 'email_id'));
  db.exec(emailReferenceTriggers('alert_deliveries', 'email_id'));
  db.exec(conversationReferenceTriggers('emails', 'conversation_id'));
  for (const table of [
    'users',
    'rules',
    'emails',
    'email_thread_owners',
    'notifications',
    'activity',
    'departments',
    'workspace_settings',
    'sync_state',
    'gmail_connection',
    'gmail_oauth_states',
    'alert_deliveries',
    'organization_assets',
    'join_requests',
    'mailbox_identities',
    'mailbox_connections',
    'conversations',
    'conversation_sources',
  ]) {
    db.exec(immutableOrganizationTrigger(table));
  }
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS organization_guard_gmail_oauth_session_insert
    BEFORE INSERT ON gmail_oauth_states
    WHEN NOT EXISTS (
      SELECT 1
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.id = NEW.session_id
        AND users.organization_id = NEW.organization_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'organization mismatch');
    END;
    CREATE TRIGGER IF NOT EXISTS organization_guard_gmail_oauth_session_update
    BEFORE UPDATE OF organization_id, session_id ON gmail_oauth_states
    WHEN NOT EXISTS (
      SELECT 1
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.id = NEW.session_id
        AND users.organization_id = NEW.organization_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'organization mismatch');
    END;
    CREATE TRIGGER IF NOT EXISTS organization_guard_logo_asset_insert
    BEFORE INSERT ON organizations
    WHEN NEW.logo_asset_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM organization_assets
      WHERE id = NEW.logo_asset_id AND organization_id = NEW.id
    )
    BEGIN
      SELECT RAISE(ABORT, 'organization mismatch');
    END;
    CREATE TRIGGER IF NOT EXISTS organization_guard_logo_asset_update
    BEFORE UPDATE OF logo_asset_id ON organizations
    WHEN NEW.logo_asset_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM organization_assets
      WHERE id = NEW.logo_asset_id AND organization_id = NEW.id
    )
    BEGIN
      SELECT RAISE(ABORT, 'organization mismatch');
    END;
  `);
}

export function organizationMigrationRequired(db) {
  if (!tableExists(db, 'users')) return false;
  return !tableExists(db, 'organizations')
    || !tableExists(db, 'mailbox_identities')
    || !tableExists(db, 'mailbox_connections')
    || !tableExists(db, 'conversations')
    || !tableExists(db, 'conversation_sources')
    || !tableHasColumn(db, 'users', 'organization_id')
    || !tableHasColumn(db, 'users', 'registration_status')
    || !tableHasColumn(db, 'users', 'mailbox_provider')
    || !tableHasColumn(db, 'departments', 'organization_id')
    || !tableHasColumn(db, 'workspace_settings', 'organization_id')
    || !tableHasColumn(db, 'sync_state', 'connection_id')
    || !tableHasColumn(db, 'email_thread_owners', 'organization_id')
    || !tableHasColumn(db, 'emails', 'conversation_id')
    || emailProviderIdIsGloballyUnique(db);
}

export function migrateOrganizations(db, { now = new Date() } = {}) {
  const foreignKeysEnabled = Number(db.prepare('PRAGMA foreign_keys').get().foreign_keys) === 1;
  if (foreignKeysEnabled) db.exec('PRAGMA foreign_keys = OFF');
  db.exec('SAVEPOINT organization_migration');
  try {
    createOrganizationTables(db);
    const organizationId = ensureDefaultOrganization(db, now.toISOString());
    addAndBackfillOrganizationColumns(db, organizationId);
    createCanonicalTables(db);
    rebuildTenantKeyedTables(db, organizationId);
    createTenantIndexesAndTriggers(db);
    const currentVersion = Number(db.prepare('PRAGMA user_version').get().user_version);
    if (currentVersion < ORGANIZATION_SCHEMA_VERSION) {
      db.exec(`PRAGMA user_version = ${ORGANIZATION_SCHEMA_VERSION}`);
    }
    const violations = db.prepare('PRAGMA foreign_key_check').all();
    if (violations.length > 0) {
      throw new Error(`Organization migration created ${violations.length} foreign key violation(s).`);
    }
    db.exec('RELEASE organization_migration');
  } catch (error) {
    db.exec('ROLLBACK TO organization_migration');
    db.exec('RELEASE organization_migration');
    throw error;
  } finally {
    if (foreignKeysEnabled) db.exec('PRAGMA foreign_keys = ON');
  }
}
