const PROVIDERS = new Set(['gmail', 'outlook']);
const GRANT_KINDS = new Set(['oauth', 'application', 'legacy']);
const CAPABILITIES = new Set(['read', 'send']);

function mailboxError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function normalizedProvider(value) {
  const provider = String(value ?? '').trim().toLocaleLowerCase();
  if (!PROVIDERS.has(provider)) {
    throw mailboxError(400, 'INVALID_MAILBOX_PROVIDER', 'Mailbox provider must be Gmail or Outlook.');
  }
  return provider;
}

function normalizedMailbox(value) {
  const mailbox = String(value ?? '').trim().toLocaleLowerCase();
  if (!mailbox || mailbox.length > 320 || !mailbox.includes('@')) {
    throw mailboxError(400, 'INVALID_MAILBOX_IDENTITY', 'A valid mailbox address is required.');
  }
  return mailbox;
}

function normalizedAccountId(value, provider) {
  const accountId = String(value ?? '').trim();
  if (!accountId || accountId.length > 1024) {
    throw mailboxError(400, 'INVALID_MAILBOX_IDENTITY', 'A confirmed provider account identity is required.');
  }
  return provider === 'gmail' ? accountId.toLocaleLowerCase() : accountId;
}

function normalizedCapabilities(value) {
  const requested = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Object.entries(value).filter(([, enabled]) => Boolean(enabled)).map(([name]) => name)
      : [];
  const capabilities = [...new Set(requested.map(item => String(item).trim().toLocaleLowerCase()))];
  if (capabilities.some(item => !CAPABILITIES.has(item))) {
    throw mailboxError(400, 'INVALID_MAILBOX_CAPABILITIES', 'Mailbox capabilities are invalid.');
  }
  return capabilities.sort();
}

function timestamp(value) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (!Number.isFinite(date.getTime())) {
    throw mailboxError(400, 'INVALID_TIMESTAMP', 'Mailbox connection time is invalid.');
  }
  return date.toISOString();
}

function withSavepoint(db, name, operation) {
  db.exec(`SAVEPOINT ${name}`);
  try {
    const result = operation();
    db.exec(`RELEASE ${name}`);
    return result;
  } catch (error) {
    db.exec(`ROLLBACK TO ${name}`);
    db.exec(`RELEASE ${name}`);
    throw error;
  }
}

function tableExists(db, name) {
  return Boolean(db.prepare(`
    SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?
  `).get(name));
}

function parseCapabilities(value) {
  try {
    return normalizedCapabilities(JSON.parse(value));
  } catch {
    return [];
  }
}

function mappedConnection(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    organizationId: Number(row.organization_id),
    mailboxIdentityId: Number(row.mailbox_identity_id),
    adminUserId: Number(row.admin_user_id),
    provider: row.provider,
    mailboxAddress: row.normalized_mailbox,
    providerAccountId: row.provider_account_id,
    encryptedGrant: row.encrypted_grant,
    grantKind: row.grant_kind,
    capabilities: parseCapabilities(row.capabilities_json),
    generation: Number(row.generation),
    active: Number(row.is_active) === 1,
    connectedAt: row.connected_at,
    updatedAt: row.updated_at,
    disconnectedAt: row.disconnected_at ?? null,
  };
}

function connectionQuery(extraWhere) {
  return `
    SELECT mailbox_connections.*,
           mailbox_identities.normalized_mailbox,
           mailbox_identities.provider_account_id
    FROM mailbox_connections
    JOIN mailbox_identities
      ON mailbox_identities.id = mailbox_connections.mailbox_identity_id
     AND mailbox_identities.organization_id = mailbox_connections.organization_id
    WHERE mailbox_connections.organization_id = ?
      AND mailbox_connections.is_active = 1
      AND ${extraWhere}
  `;
}

export function resolveMailboxConnection({
  db,
  organizationId,
  mailboxIdentityId = null,
  provider = null,
} = {}) {
  if (!db) throw new TypeError('resolveMailboxConnection requires a database');
  if (!Number.isInteger(organizationId) || organizationId < 1) {
    throw mailboxError(400, 'INVALID_ORGANIZATION', 'A valid organization is required.');
  }
  if (mailboxIdentityId !== null) {
    if (!Number.isInteger(mailboxIdentityId) || mailboxIdentityId < 1) {
      throw mailboxError(400, 'INVALID_MAILBOX_IDENTITY', 'A valid mailbox identity is required.');
    }
    return mappedConnection(db.prepare(connectionQuery(
      'mailbox_connections.mailbox_identity_id = ?',
    )).get(organizationId, mailboxIdentityId));
  }
  if (provider !== null) {
    return mappedConnection(db.prepare(connectionQuery(
      'mailbox_connections.provider = ?',
    )).get(organizationId, normalizedProvider(provider)));
  }
  throw mailboxError(
    400,
    'INVALID_MAILBOX_LOOKUP',
    'A mailbox identity or provider is required.',
  );
}

export function replaceConnectionGeneration({
  db,
  organizationId,
  provider: providerValue,
  account = {},
  now = new Date(),
} = {}) {
  if (!db) throw new TypeError('replaceConnectionGeneration requires a database');
  if (!Number.isInteger(organizationId) || organizationId < 1) {
    throw mailboxError(400, 'INVALID_ORGANIZATION', 'A valid organization is required.');
  }
  const provider = normalizedProvider(providerValue);
  const mailboxAddress = normalizedMailbox(
    account.mailboxAddress ?? account.accountEmail ?? account.email,
  );
  const providerAccountId = normalizedAccountId(
    account.providerAccountId ?? account.accountId ?? mailboxAddress,
    provider,
  );
  const adminUserId = Number(account.adminUserId ?? account.ownerUserId);
  if (!Number.isInteger(adminUserId) || adminUserId < 1) {
    throw mailboxError(400, 'INVALID_MAILBOX_ADMIN', 'An organization admin is required.');
  }
  const capabilities = normalizedCapabilities(account.capabilities);
  const grantKind = String(account.grantKind ?? 'oauth').trim().toLocaleLowerCase();
  if (!GRANT_KINDS.has(grantKind)) {
    throw mailboxError(400, 'INVALID_MAILBOX_GRANT', 'Mailbox grant type is invalid.');
  }
  const encryptedGrant = typeof account.encryptedGrant === 'string'
    ? account.encryptedGrant
    : '';
  const changedAt = timestamp(now);

  return withSavepoint(db, 'replace_mailbox_connection', () => {
    const admin = db.prepare(`
      SELECT id FROM users
      WHERE id = ? AND organization_id = ?
        AND role = 'admin' AND registration_status = 'active'
    `).get(adminUserId, organizationId);
    if (!admin) {
      throw mailboxError(403, 'INVALID_MAILBOX_ADMIN', 'An active organization admin is required.');
    }

    const active = resolveMailboxConnection({ db, organizationId, provider });
    if (
      active
      && (
        active.mailboxAddress !== mailboxAddress
        || active.providerAccountId !== providerAccountId
      )
    ) {
      throw mailboxError(
        409,
        'MAILBOX_IDENTITY_MISMATCH',
        'The confirmed mailbox does not match the existing connection.',
      );
    }

    let identity = db.prepare(`
      SELECT id FROM mailbox_identities
      WHERE organization_id = ? AND provider = ?
        AND normalized_mailbox = ? COLLATE NOCASE
        AND provider_account_id = ?
    `).get(organizationId, provider, mailboxAddress, providerAccountId);
    if (!identity) {
      const inserted = db.prepare(`
        INSERT INTO mailbox_identities
          (organization_id, provider, normalized_mailbox, provider_account_id,
           created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        organizationId,
        provider,
        mailboxAddress,
        providerAccountId,
        changedAt,
        changedAt,
      );
      identity = { id: Number(inserted.lastInsertRowid) };
    }
    const mailboxIdentityId = Number(identity.id);
    const existing = db.prepare(`
      SELECT * FROM mailbox_connections WHERE mailbox_identity_id = ?
    `).get(mailboxIdentityId);
    const effectiveGrant = encryptedGrant || existing?.encrypted_grant || '';
    if (!effectiveGrant) {
      throw mailboxError(400, 'INVALID_MAILBOX_GRANT', 'An encrypted mailbox grant is required.');
    }

    let connectionId;
    if (existing) {
      db.prepare(`
        UPDATE mailbox_connections
        SET admin_user_id = ?, provider = ?, encrypted_grant = ?, grant_kind = ?,
            capabilities_json = ?, generation = generation + 1, is_active = 1,
            updated_at = ?, disconnected_at = NULL
        WHERE id = ?
      `).run(
        adminUserId,
        provider,
        effectiveGrant,
        grantKind,
        JSON.stringify(capabilities),
        changedAt,
        existing.id,
      );
      connectionId = Number(existing.id);
    } else {
      const inserted = db.prepare(`
        INSERT INTO mailbox_connections
          (organization_id, mailbox_identity_id, admin_user_id, provider,
           encrypted_grant, grant_kind, capabilities_json, generation, is_active,
           connected_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
      `).run(
        organizationId,
        mailboxIdentityId,
        adminUserId,
        provider,
        effectiveGrant,
        grantKind,
        JSON.stringify(capabilities),
        changedAt,
        changedAt,
      );
      connectionId = Number(inserted.lastInsertRowid);
    }

    db.prepare(`
      UPDATE mailbox_identities SET updated_at = ? WHERE id = ?
    `).run(changedAt, mailboxIdentityId);
    db.prepare(`
      UPDATE conversation_sources
      SET last_resolved_connection_id = ?, updated_at = ?
      WHERE organization_id = ? AND mailbox_identity_id = ?
    `).run(connectionId, changedAt, organizationId, mailboxIdentityId);
    return resolveMailboxConnection({ db, organizationId, mailboxIdentityId });
  });
}

export function disconnectMailboxConnection({
  db,
  organizationId,
  mailboxIdentityId,
  now = new Date(),
} = {}) {
  const current = resolveMailboxConnection({ db, organizationId, mailboxIdentityId });
  if (!current) return null;
  const disconnectedAt = timestamp(now);
  db.prepare(`
    UPDATE mailbox_connections
    SET is_active = 0, generation = generation + 1,
        encrypted_grant = '', disconnected_at = ?, updated_at = ?
    WHERE id = ?
  `).run(disconnectedAt, disconnectedAt, current.id);
  return { ...current, encryptedGrant: '', active: false, generation: current.generation + 1,
    disconnectedAt, updatedAt: disconnectedAt };
}

export function migrateLegacyMailboxConnections(db) {
  if (!tableExists(db, 'gmail_connection')) return;
  const rows = db.prepare(`
    SELECT id, organization_id, account_email, encrypted_refresh_token,
           connected_at, updated_at
    FROM gmail_connection
    ORDER BY organization_id, id
  `).all();
  for (const row of rows) {
    const organizationId = Number(row.organization_id);
    const admin = db.prepare(`
      SELECT id FROM users
      WHERE organization_id = ? AND role = 'admin' AND registration_status = 'active'
      ORDER BY id LIMIT 1
    `).get(organizationId);
    if (!admin) continue;
    const mailboxAddress = normalizedMailbox(row.account_email);
    const current = resolveMailboxConnection({ db, organizationId, provider: 'gmail' });
    if (current) {
      const sameLegacyIdentity = current.mailboxAddress === mailboxAddress
        && current.providerAccountId === mailboxAddress;
      if (!sameLegacyIdentity || current.encryptedGrant === row.encrypted_refresh_token) continue;
    }
    replaceConnectionGeneration({
      db,
      organizationId,
      provider: 'gmail',
      account: {
        mailboxAddress,
        providerAccountId: mailboxAddress,
        adminUserId: Number(admin.id),
        encryptedGrant: row.encrypted_refresh_token,
        grantKind: 'legacy',
        capabilities: ['read'],
      },
      now: new Date(row.updated_at || row.connected_at),
    });
  }
}
