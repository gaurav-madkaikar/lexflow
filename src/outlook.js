import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { GraphMailSource } from './mail-sources.js';
import {
  disconnectMailboxConnection,
  replaceConnectionGeneration,
  resolveMailboxConnection,
} from './mailbox-connections.js';

export const OUTLOOK_SCOPES = Object.freeze([
  'offline_access',
  'User.Read',
  'Mail.Read',
  'Mail.Send',
]);

const GRAPH_API = 'https://graph.microsoft.com/v1.0';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const OAUTH_STATE_PREFIX = 'outlook:';
const ENCRYPTION_AAD = Buffer.from('lexflow:outlook-refresh-token:v1');

function outlookError(status, code, message) {
  const error = new Error(message);
  Object.assign(error, { status, code });
  return error;
}

function safeErrorMessage(value) {
  return String(value ?? '')
    .replace(/Bearer\s+\S+/giu, 'Bearer [redacted]')
    .replace(
      /(client_secret|access_token|refresh_token|id_token|code)\s*["']?\s*[:=]\s*["']?([^\s&",}]+)/giu,
      '$1=[redacted]',
    )
    .replace(/[\u0000-\u001f\u007f]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 300);
}

function nowFrom(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw outlookError(500, 'OUTLOOK_CLOCK_INVALID', 'Outlook integration time is invalid.');
  }
  return date;
}

function requestSignal(requestTimeoutMs, signal) {
  const timeout = AbortSignal.timeout(requestTimeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function safeJson(response, code, message) {
  try {
    const value = await response.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid');
    return value;
  } catch {
    throw outlookError(502, code, message);
  }
}

function normalizedEncryptionKey(value) {
  const key = Buffer.isBuffer(value)
    ? Buffer.from(value)
    : Buffer.from(String(value ?? ''), 'base64');
  if (key.length !== 32) {
    throw outlookError(
      500,
      'OUTLOOK_CONFIGURATION_INVALID',
      'Outlook token encryption is not configured correctly.',
    );
  }
  return key;
}

function encryptRefreshToken(refreshToken, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(ENCRYPTION_AAD);
  const ciphertext = Buffer.concat([cipher.update(refreshToken, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')]
    .join(':');
}

function decryptRefreshToken(payload, key) {
  try {
    const [version, ivValue, tagValue, ciphertextValue, extra] = String(payload).split(':');
    if (version !== 'v1' || extra !== undefined || !ivValue || !tagValue || !ciphertextValue) {
      throw new Error('invalid');
    }
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'));
    decipher.setAAD(ENCRYPTION_AAD);
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw outlookError(
      500,
      'OUTLOOK_CREDENTIALS_INVALID',
      'The stored Outlook connection cannot be decrypted.',
    );
  }
}

function normalizedCapabilities(value, fallback = { read: true, send: false }) {
  if (Array.isArray(value)) {
    return Object.freeze({ read: value.includes('read'), send: value.includes('send') });
  }
  return Object.freeze({
    read: typeof value?.read === 'boolean' ? value.read : fallback.read,
    send: typeof value?.send === 'boolean' ? value.send : fallback.send,
  });
}

function capabilitiesFromScopes(value, assumeRequested = false) {
  const scopes = typeof value === 'string' && value.trim()
    ? value.trim().split(/\s+/u)
    : assumeRequested
      ? OUTLOOK_SCOPES
      : [];
  const normalized = new Set(scopes.map(scope => scope.split('/').at(-1).toLocaleLowerCase()));
  return normalizedCapabilities({
    read: normalized.has('mail.read'),
    send: normalized.has('mail.send'),
  });
}

function runTransaction(db, operation) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = operation();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function legacyConfigured(graph) {
  return Boolean(
    graph
    && [graph.tenantId, graph.clientId, graph.clientSecret, graph.mailbox].every(value => (
      typeof value === 'string' && value.trim()
    )),
  );
}

export function createOutlookIntegration({
  db,
  outlook,
  graph = null,
  config,
  fetchImpl = fetch,
  requestTimeoutMs = 15_000,
  clock = () => new Date(),
} = {}) {
  if (!db) throw new TypeError('createOutlookIntegration requires a database');
  const settings = outlook ?? config?.outlook ?? { configured: false };
  const legacyGraph = graph ?? config?.graph ?? null;
  const oauthConfigured = Boolean(settings.configured);
  const hasLegacyGraph = legacyConfigured(legacyGraph);
  const encryptionKey = oauthConfigured ? normalizedEncryptionKey(settings.tokenEncryptionKey) : null;
  const cachedSources = new Map();
  const disconnectingOrganizations = new Set();
  let connectionMutationTail = Promise.resolve();

  function mutateConnection(operation) {
    const result = connectionMutationTail.then(operation, operation);
    connectionMutationTail = result.then(() => undefined, () => undefined);
    return result;
  }

  function requireConfigured() {
    if (!oauthConfigured) {
      throw outlookError(503, 'OUTLOOK_NOT_CONFIGURED', 'Outlook OAuth is not configured.');
    }
  }

  function requireAdminSession(sessionId) {
    const session = typeof sessionId === 'string' && sessionId
      ? db.prepare(`
          SELECT users.id, users.organization_id, users.role,
                 users.registration_status, sessions.expires_at
          FROM sessions
          JOIN users ON users.id = sessions.user_id
          WHERE sessions.id = ?
        `).get(sessionId)
      : null;
    if (!session || session.expires_at <= nowFrom(clock).toISOString()) {
      throw outlookError(401, 'UNAUTHENTICATED', 'Please sign in again.');
    }
    if (session.role !== 'admin' || session.registration_status !== 'active') {
      throw outlookError(403, 'FORBIDDEN', 'Administrator access is required.');
    }
    return { userId: Number(session.id), organizationId: Number(session.organization_id) };
  }

  function requireAdminIdentity(organizationId, adminUserId) {
    if (adminUserId === null || adminUserId === undefined) return;
    const admin = db.prepare(`
      SELECT 1 FROM users
      WHERE id = ? AND organization_id = ?
        AND role = 'admin' AND registration_status = 'active'
    `).get(Number(adminUserId), organizationId);
    if (!admin) {
      throw outlookError(403, 'FORBIDDEN', 'Administrator access is required.');
    }
  }

  function canonicalConnection(organizationId) {
    return resolveMailboxConnection({ db, organizationId, provider: 'outlook' });
  }

  function ensureLegacyConnection() {
    if (!hasLegacyGraph || canonicalConnection(1)) return;
    const admin = db.prepare(`
      SELECT id FROM users
      WHERE organization_id = 1 AND role = 'admin' AND registration_status = 'active'
      ORDER BY id
      LIMIT 1
    `).get();
    if (!admin) return;
    const previousIdentity = db.prepare(`
      SELECT mailbox_identities.provider_account_id
      FROM mailbox_identities
      LEFT JOIN mailbox_connections
        ON mailbox_connections.mailbox_identity_id = mailbox_identities.id
       AND mailbox_connections.organization_id = mailbox_identities.organization_id
      WHERE mailbox_identities.organization_id = 1
        AND mailbox_identities.provider = 'outlook'
        AND mailbox_identities.normalized_mailbox = ? COLLATE NOCASE
      ORDER BY mailbox_connections.updated_at DESC,
               mailbox_connections.id DESC,
               mailbox_identities.id DESC
      LIMIT 1
    `).get(legacyGraph.mailbox);
    replaceConnectionGeneration({
      db,
      organizationId: 1,
      provider: 'outlook',
      account: {
        mailboxAddress: legacyGraph.mailbox,
        providerAccountId: previousIdentity?.provider_account_id
          || legacyGraph.mailbox.toLocaleLowerCase(),
        adminUserId: Number(admin.id),
        encryptedGrant: 'legacy:environment',
        grantKind: 'legacy',
        capabilities: legacyGraph.capabilities,
      },
      now: nowFrom(clock),
    });
  }

  ensureLegacyConnection();

  function clearSyncState(organizationId) {
    db.prepare(`
      DELETE FROM sync_state
      WHERE organization_id = ?
        AND (
          key LIKE 'mail_cursor:graph:%'
          OR key LIKE 'last_sync_at:mail_cursor:graph:%'
          OR key LIKE 'last_sync_error:mail_cursor:graph:%'
          OR key LIKE 'mail_reconciliation:outlook:%'
        )
    `).run(organizationId);
  }

  async function fetchProfile(accessToken) {
    let response;
    try {
      const url = new URL(`${GRAPH_API}/me`);
      url.searchParams.set('$select', 'id,mail,userPrincipalName');
      response = await fetchImpl(url, {
        headers: { authorization: `Bearer ${accessToken}` },
        signal: requestSignal(requestTimeoutMs),
      });
    } catch {
      throw outlookError(
        502,
        'OUTLOOK_AUTHORIZATION_FAILED',
        'The connected Outlook account could not be verified.',
      );
    }
    if (!response.ok) {
      throw outlookError(
        502,
        'OUTLOOK_AUTHORIZATION_FAILED',
        'The connected Outlook account could not be verified.',
      );
    }
    const profile = await safeJson(
      response,
      'OUTLOOK_AUTHORIZATION_FAILED',
      'Outlook returned an invalid account profile.',
    );
    const providerAccountId = typeof profile.id === 'string' ? profile.id.trim() : '';
    const mailboxAddress = String(profile.mail || profile.userPrincipalName || '')
      .trim()
      .toLocaleLowerCase();
    if (
      !providerAccountId
      || providerAccountId.length > 1024
      || !mailboxAddress
      || mailboxAddress.length > 320
      || !mailboxAddress.includes('@')
    ) {
      throw outlookError(
        502,
        'OUTLOOK_AUTHORIZATION_FAILED',
        'Outlook returned an invalid account profile.',
      );
    }
    return { providerAccountId, mailboxAddress };
  }

  function status({ organizationId = 1 } = {}) {
    const connection = canonicalConnection(organizationId);
    if (connection) {
      const usable = connection.grantKind === 'legacy'
        ? organizationId === 1 && hasLegacyGraph
        : oauthConfigured;
      const cursorKey = `mail_cursor:graph:${connection.mailboxAddress.toLocaleLowerCase()}`;
      const syncValue = key => usable
        ? db.prepare(`
            SELECT value FROM sync_state
            WHERE organization_id = ? AND key = ? AND connection_id IN (0, ?)
            ORDER BY (connection_id = ?) DESC
            LIMIT 1
          `).get(organizationId, key, connection.id, connection.id)?.value
        : null;
      return {
        configured: oauthConfigured || (organizationId === 1 && hasLegacyGraph),
        connected: usable,
        accountEmail: usable ? connection.mailboxAddress : null,
        authMode: connection.grantKind === 'legacy' ? 'application' : 'delegated',
        capabilities: usable
          ? normalizedCapabilities(connection.capabilities)
          : normalizedCapabilities({ read: false, send: false }),
        connectionId: usable ? connection.id : null,
        connectionGeneration: usable ? connection.generation : null,
        lastSuccessAt: syncValue(`last_sync_at:${cursorKey}`) ?? null,
        lastError: usable
          ? (safeErrorMessage(syncValue(`last_sync_error:${cursorKey}`)) || null)
          : null,
      };
    }
    const legacy = organizationId === 1 && hasLegacyGraph;
    const cursorKey = legacy
      ? `mail_cursor:graph:${legacyGraph.mailbox.toLocaleLowerCase()}`
      : null;
    const syncValue = key => legacy
      ? db.prepare(`
          SELECT value FROM sync_state
          WHERE organization_id = ? AND connection_id = 0 AND key = ?
          LIMIT 1
        `).get(organizationId, key)?.value
      : null;
    return {
      configured: oauthConfigured || legacy,
      connected: legacy,
      accountEmail: legacy ? legacyGraph.mailbox : null,
      authMode: legacy ? 'application' : null,
      capabilities: legacy
        ? normalizedCapabilities(legacyGraph.capabilities)
        : normalizedCapabilities({ read: false, send: false }),
      connectionId: null,
      connectionGeneration: null,
      lastSuccessAt: cursorKey ? (syncValue(`last_sync_at:${cursorKey}`) ?? null) : null,
      lastError: cursorKey
        ? (safeErrorMessage(syncValue(`last_sync_error:${cursorKey}`)) || null)
        : null,
    };
  }

  function authorizationUrl({ sessionId } = {}) {
    requireConfigured();
    const admin = requireAdminSession(sessionId);
    const state = randomBytes(32).toString('base64url');
    const digest = `${OAUTH_STATE_PREFIX}${createHash('sha256').update(state).digest('hex')}`;
    const now = nowFrom(clock);
    const expiresAt = new Date(now.getTime() + OAUTH_STATE_TTL_MS).toISOString();
    runTransaction(db, () => {
      db.prepare('DELETE FROM gmail_oauth_states WHERE expires_at <= ?').run(now.toISOString());
      db.prepare(`
        DELETE FROM gmail_oauth_states
        WHERE session_id = ? AND state_digest LIKE 'outlook:%'
      `).run(sessionId);
      db.prepare(`
        INSERT INTO gmail_oauth_states
          (organization_id, state_digest, session_id, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(admin.organizationId, digest, sessionId, expiresAt);
    });

    const tenant = encodeURIComponent(settings.tenantId);
    const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
    url.searchParams.set('client_id', settings.clientId);
    url.searchParams.set('redirect_uri', settings.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('response_mode', 'query');
    url.searchParams.set('scope', OUTLOOK_SCOPES.join(' '));
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', state);
    return url.toString();
  }

  async function completeAuthorizationNow({ sessionId, state, code } = {}) {
    requireConfigured();
    const admin = requireAdminSession(sessionId);
    if (typeof state !== 'string' || !state || state.length > 512) {
      throw outlookError(400, 'INVALID_OAUTH_STATE', 'The Outlook authorization request is invalid or expired.');
    }
    const digest = `${OAUTH_STATE_PREFIX}${createHash('sha256').update(state).digest('hex')}`;
    const now = nowFrom(clock);
    runTransaction(db, () => {
      const saved = db.prepare(`
        SELECT session_id, expires_at
        FROM gmail_oauth_states
        WHERE organization_id = ? AND state_digest = ?
      `).get(admin.organizationId, digest);
      if (!saved || saved.session_id !== sessionId || saved.expires_at <= now.toISOString()) {
        throw outlookError(400, 'INVALID_OAUTH_STATE', 'The Outlook authorization request is invalid or expired.');
      }
      db.prepare(`
        DELETE FROM gmail_oauth_states
        WHERE organization_id = ? AND state_digest = ?
      `).run(admin.organizationId, digest);
    });
    if (typeof code !== 'string' || !code || code.length > 4096) {
      throw outlookError(400, 'INVALID_AUTHORIZATION_CODE', 'Outlook did not return a valid authorization code.');
    }

    const body = new URLSearchParams({
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: settings.redirectUri,
      scope: OUTLOOK_SCOPES.join(' '),
    });
    let response;
    try {
      response = await fetchImpl(
        `https://login.microsoftonline.com/${encodeURIComponent(settings.tenantId)}/oauth2/v2.0/token`,
        { method: 'POST', body, signal: requestSignal(requestTimeoutMs) },
      );
    } catch {
      throw outlookError(502, 'OUTLOOK_AUTHORIZATION_FAILED', 'Outlook authorization could not be completed.');
    }
    if (!response.ok) {
      throw outlookError(502, 'OUTLOOK_AUTHORIZATION_FAILED', 'Outlook authorization could not be completed.');
    }
    const tokens = await safeJson(
      response,
      'OUTLOOK_AUTHORIZATION_FAILED',
      'Outlook authorization returned an invalid response.',
    );
    if (typeof tokens.access_token !== 'string' || !tokens.access_token) {
      throw outlookError(502, 'OUTLOOK_AUTHORIZATION_FAILED', 'Outlook authorization returned no access token.');
    }
    const profile = await fetchProfile(tokens.access_token);
    const existing = canonicalConnection(admin.organizationId);
    if (existing && existing.mailboxAddress !== profile.mailboxAddress) {
      throw outlookError(
        409,
        'MAILBOX_IDENTITY_MISMATCH',
        'Reconnect the same Outlook mailbox already registered for this organization.',
      );
    }
    if (
      existing
      && existing.grantKind !== 'legacy'
      && existing.providerAccountId !== profile.providerAccountId
    ) {
      throw outlookError(
        409,
        'MAILBOX_IDENTITY_MISMATCH',
        'Reconnect the same Outlook mailbox already registered for this organization.',
      );
    }
    let encryptedGrant;
    if (typeof tokens.refresh_token === 'string' && tokens.refresh_token) {
      encryptedGrant = encryptRefreshToken(tokens.refresh_token, encryptionKey);
    } else if (existing && existing.grantKind === 'oauth') {
      encryptedGrant = existing.encryptedGrant;
    } else {
      throw outlookError(
        502,
        'OUTLOOK_OFFLINE_ACCESS_REQUIRED',
        'Outlook did not grant offline access. Reconnect and approve mailbox access.',
      );
    }
    const grantedCapabilities = capabilitiesFromScopes(tokens.scope, true);
    if (!grantedCapabilities.read) {
      throw outlookError(
        502,
        'OUTLOOK_READ_ACCESS_REQUIRED',
        'Outlook did not grant Mail.Read. Reconnect and approve mailbox access.',
      );
    }
    const timestamp = now.toISOString();
    runTransaction(db, () => {
      if (
        existing?.grantKind === 'legacy'
        && existing.providerAccountId !== profile.providerAccountId
      ) {
        db.prepare(`
          UPDATE mailbox_identities
          SET provider_account_id = ?, updated_at = ?
          WHERE organization_id = ? AND id = ?
        `).run(
          profile.providerAccountId,
          timestamp,
          admin.organizationId,
          existing.mailboxIdentityId,
        );
      }
      replaceConnectionGeneration({
        db,
        organizationId: admin.organizationId,
        provider: 'outlook',
        account: {
          mailboxAddress: profile.mailboxAddress,
          providerAccountId: profile.providerAccountId,
          adminUserId: admin.userId,
          encryptedGrant,
          grantKind: 'oauth',
          capabilities: grantedCapabilities,
        },
        now,
      });
      clearSyncState(admin.organizationId);
    });
    cachedSources.delete(admin.organizationId);
    return status({ organizationId: admin.organizationId });
  }

  function completeAuthorization(options) {
    return mutateConnection(() => completeAuthorizationNow(options));
  }

  async function disconnectNow({ organizationId = 1, adminUserId = null } = {}) {
    requireAdminIdentity(organizationId, adminUserId);
    disconnectingOrganizations.add(organizationId);
    cachedSources.delete(organizationId);
    try {
      const connection = canonicalConnection(organizationId);
      runTransaction(db, () => {
        if (connection) {
          disconnectMailboxConnection({
            db,
            organizationId,
            mailboxIdentityId: connection.mailboxIdentityId,
            now: nowFrom(clock),
          });
        }
        db.prepare(`
          DELETE FROM gmail_oauth_states
          WHERE organization_id = ? AND state_digest LIKE 'outlook:%'
        `).run(organizationId);
        clearSyncState(organizationId);
      });
      if (organizationId === 1 && hasLegacyGraph) ensureLegacyConnection();
      return status({ organizationId });
    } finally {
      disconnectingOrganizations.delete(organizationId);
    }
  }

  function disconnect(options) {
    return mutateConnection(() => disconnectNow(options));
  }

  function delegatedAccessTokenProvider(connection) {
    let cachedToken = null;
    let expiresAt = 0;
    let refreshToken = decryptRefreshToken(connection.encryptedGrant, encryptionKey);
    let refreshInFlight = null;

    async function refreshAccessToken({ signal } = {}) {
      const nowMs = nowFrom(clock).getTime();
      const body = new URLSearchParams({
        client_id: settings.clientId,
        client_secret: settings.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: OUTLOOK_SCOPES.join(' '),
      });
      let response;
      try {
        response = await fetchImpl(
          `https://login.microsoftonline.com/${encodeURIComponent(settings.tenantId)}/oauth2/v2.0/token`,
          { method: 'POST', body, signal: requestSignal(requestTimeoutMs, signal) },
        );
      } catch {
        throw outlookError(502, 'OUTLOOK_AUTH_FAILED', 'Outlook authentication could not be completed.');
      }
      if (!response.ok) {
        throw outlookError(
          502,
          'OUTLOOK_AUTH_FAILED',
          response.status === 400
            ? 'Outlook authorization needs to be renewed. Reconnect Outlook from Settings.'
            : `Outlook authentication failed (${response.status}).`,
        );
      }
      const tokens = await safeJson(
        response,
        'OUTLOOK_AUTH_FAILED',
        'Outlook authentication returned an invalid response.',
      );
      if (typeof tokens.access_token !== 'string' || !tokens.access_token) {
        throw outlookError(502, 'OUTLOOK_AUTH_FAILED', 'Outlook authentication returned no access token.');
      }
      if (typeof tokens.refresh_token === 'string' && tokens.refresh_token) {
        const encryptedGrant = encryptRefreshToken(tokens.refresh_token, encryptionKey);
        const updatedAt = nowFrom(clock).toISOString();
        const persisted = db.prepare(`
          UPDATE mailbox_connections
          SET encrypted_grant = ?, updated_at = ?
          WHERE organization_id = ? AND id = ? AND generation = ? AND is_active = 1
        `).run(
          encryptedGrant,
          updatedAt,
          connection.organizationId,
          connection.id,
          connection.generation,
        );
        if (persisted.changes !== 1) {
          throw outlookError(
            409,
            'OUTLOOK_CONNECTION_CHANGED',
            'The Outlook connection changed while authorization was refreshing.',
          );
        }
        refreshToken = tokens.refresh_token;
        connection.encryptedGrant = encryptedGrant;
        connection.updatedAt = updatedAt;
      }
      const expiresIn = Number(tokens.expires_in);
      cachedToken = tokens.access_token;
      expiresAt = nowMs + (Number.isFinite(expiresIn) && expiresIn > 0
        ? expiresIn * 1000
        : 3_600_000);
      return cachedToken;
    }

    return async ({ signal } = {}) => {
      const nowMs = nowFrom(clock).getTime();
      if (cachedToken && expiresAt - nowMs > 60_000) return cachedToken;
      if (!refreshInFlight) {
        refreshInFlight = refreshAccessToken({ signal })
          .finally(() => { refreshInFlight = null; });
      }
      return refreshInFlight;
    };
  }

  function sources({ organizationId = 1 } = {}) {
    if (disconnectingOrganizations.has(organizationId)) return [];
    const connection = canonicalConnection(organizationId);
    if (!connection) {
      if (organizationId !== 1 || !hasLegacyGraph) return [];
      const version = `legacy:${legacyGraph.mailbox}`;
      const cached = cachedSources.get(organizationId);
      if (cached?.version === version) return [cached.source];
      const source = new GraphMailSource({
        ...legacyGraph,
        authMode: 'application',
        capabilities: legacyGraph.capabilities,
        fetchImpl,
        requestTimeoutMs,
        organizationId,
        isCurrentConnection: () => !canonicalConnection(organizationId),
      });
      cachedSources.set(organizationId, { version, source });
      return [source];
    }

    const legacy = connection.grantKind === 'legacy';
    if ((legacy && (organizationId !== 1 || !hasLegacyGraph)) || (!legacy && !oauthConfigured)) {
      return [];
    }
    const version = `${connection.id}:${connection.generation}:${connection.updatedAt}`;
    const cached = cachedSources.get(organizationId);
    if (cached?.version === version) return [cached.source];
    const isCurrentConnection = () => {
      if (disconnectingOrganizations.has(organizationId)) return false;
      const current = resolveMailboxConnection({
        db,
        organizationId,
        mailboxIdentityId: connection.mailboxIdentityId,
      });
      return Boolean(
        current
        && current.id === connection.id
        && current.generation === connection.generation
        && current.encryptedGrant === connection.encryptedGrant
      );
    };
    const source = new GraphMailSource({
      ...(legacy ? legacyGraph : {
        tenantId: settings.tenantId,
        clientId: settings.clientId,
        clientSecret: settings.clientSecret,
      }),
      mailbox: connection.mailboxAddress,
      authMode: legacy ? 'application' : 'delegated',
      accessTokenProvider: legacy ? null : delegatedAccessTokenProvider(connection),
      capabilities: connection.capabilities,
      fetchImpl,
      requestTimeoutMs,
      organizationId,
      connectionId: connection.id,
      mailboxIdentityId: connection.mailboxIdentityId,
      connectionGeneration: connection.generation,
      isCurrentConnection,
    });
    cachedSources.set(organizationId, { version, source });
    return [source];
  }

  return {
    configured: oauthConfigured || hasLegacyGraph,
    authorizationAvailable: oauthConfigured,
    disconnectAvailable: oauthConfigured,
    status,
    authorizationUrl,
    completeAuthorization,
    disconnect,
    sources,
  };
}
