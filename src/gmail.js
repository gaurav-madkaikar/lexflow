import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REVOCATION_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1';
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const GMAIL_CURSOR_KEY = 'mail_cursor:gmail';
const GMAIL_LAST_SUCCESS_KEY = `last_sync_at:${GMAIL_CURSOR_KEY}`;
const GMAIL_LAST_ERROR_KEY = `last_sync_error:${GMAIL_CURSOR_KEY}`;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const MESSAGE_BATCH_SIZE = 20;
const MAX_RATE_LIMIT_RETRIES = 2;
const MAX_RETRY_AFTER_MS = 30_000;
const ENCRYPTION_AAD = Buffer.from('lexflow:gmail-refresh-token:v1');

function scopedKey(key, organizationId = 1) {
  return Number(organizationId) === 1 ? key : `organization:${organizationId}:${key}`;
}

function defaultDelay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function integrationError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function nowFrom(clock) {
  const now = clock();
  const date = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(date.getTime())) {
    throw integrationError(500, 'INVALID_CLOCK', 'The server clock returned an invalid time.');
  }
  return date;
}

function safeErrorMessage(value) {
  return String(value ?? '')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(
      /(client_secret|access_token|refresh_token|id_token|code)\s*["']?\s*[:=]\s*["']?([^\s&",}]+)/gi,
      '$1=[redacted]',
    )
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

async function externalFetch({
  fetchImpl,
  url,
  options = {},
  requestTimeoutMs,
  code,
  message,
}) {
  try {
    return await fetchImpl(url, {
      ...options,
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch {
    throw integrationError(502, code, message);
  }
}

async function responseJson(response, code, message) {
  try {
    return await response.json();
  } catch {
    throw integrationError(502, code, message);
  }
}

function headerValue(message, name) {
  const headers = message.payload?.headers;
  if (!Array.isArray(headers)) return '';
  const header = headers.find(
    item => String(item?.name ?? '').toLocaleLowerCase() === name.toLocaleLowerCase(),
  );
  return typeof header?.value === 'string' ? header.value.trim() : '';
}

function parseSender(value) {
  const bracketed = value.match(/<([^<>]+)>/);
  const emailMatch = (bracketed?.[1] ?? value).match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+/i);
  const address = emailMatch?.[0] ?? '';
  const rawName = bracketed ? value.slice(0, bracketed.index).trim() : '';
  const name = rawName.replace(/^"|"$/g, '').trim() || address || 'Unknown sender';
  return { name, address };
}

function validInternalDate(value) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return false;
  const timestamp = Number(value);
  return Number.isFinite(timestamp)
    && timestamp >= 0
    && Number.isFinite(new Date(timestamp).getTime());
}

function retryAfterMilliseconds(response, clock) {
  const rawValue = response.headers?.get?.('retry-after');
  if (typeof rawValue !== 'string' || !rawValue.trim()) return null;

  const value = rawValue.trim();
  if (/^\d+$/.test(value)) return Number(value) * 1000;

  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt)) return null;
  return Math.max(0, retryAt - nowFrom(clock).getTime());
}

function mapGmailMessage(message, accountEmail) {
  const rawId = typeof message.id === 'string' ? message.id.trim() : '';
  const internalDate = Number(message.internalDate);
  if (!rawId || !validInternalDate(message.internalDate)) {
    throw integrationError(502, 'GMAIL_INVALID_RESPONSE', 'Gmail returned invalid message metadata.');
  }

  const subject = headerValue(message, 'Subject') || '(No subject)';
  const sender = parseSender(headerValue(message, 'From'));
  const mailboxAddress = accountEmail.toLocaleLowerCase();
  const conversationId = message.threadId || rawId;
  const webUrl = `https://mail.google.com/mail/?authuser=${encodeURIComponent(accountEmail)}#inbox/${encodeURIComponent(conversationId)}`;
  return {
    providerId: `gmail:${mailboxAddress}:${rawId}`,
    provider: 'gmail',
    mailboxAddress: accountEmail,
    subject,
    senderName: sender.name,
    senderAddress: sender.address,
    preview: typeof message.snippet === 'string' ? message.snippet : '',
    receivedAt: new Date(internalDate).toISOString(),
    webUrl,
    // Temporary compatibility for the existing provider-specific workflow field.
    outlookUrl: webUrl,
  };
}

function normalizedEncryptionKey(value) {
  const key = Buffer.isBuffer(value)
    ? Buffer.from(value)
    : Buffer.from(String(value ?? ''), 'base64');
  if (key.length !== 32) {
    throw integrationError(500, 'GMAIL_CONFIGURATION_INVALID', 'Gmail token encryption is not configured correctly.');
  }
  return key;
}

function encryptRefreshToken(refreshToken, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(ENCRYPTION_AAD);
  const ciphertext = Buffer.concat([
    cipher.update(refreshToken, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')]
    .join(':');
}

function decryptRefreshToken(payload, key) {
  try {
    const [version, ivValue, tagValue, ciphertextValue, extra] = String(payload).split(':');
    if (version !== 'v1' || extra !== undefined || !ivValue || !tagValue || !ciphertextValue) {
      throw new Error('Invalid encrypted value');
    }
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'));
    decipher.setAAD(ENCRYPTION_AAD);
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw integrationError(500, 'GMAIL_CREDENTIALS_INVALID', 'The stored Gmail connection cannot be decrypted.');
  }
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

export class GmailMailSource {
  #clientSecret;
  #refreshToken;
  #cachedAccessToken = null;
  #accessTokenExpiresAt = 0;

  constructor({
    accountEmail,
    organizationId = 1,
    clientId,
    clientSecret,
    refreshToken,
    fetchImpl = fetch,
    requestTimeoutMs = 15_000,
    clock = () => new Date(),
    delay = defaultDelay,
    isCurrentConnection = () => true,
  }) {
    Object.assign(this, {
      accountEmail,
      organizationId,
      clientId,
      fetchImpl,
      requestTimeoutMs,
      clock,
      delay,
      isCurrentConnection,
    });
    this.#clientSecret = clientSecret;
    this.#refreshToken = refreshToken;
    this.provider = 'gmail';
    this.mailboxAddress = accountEmail;
    this.sourceKey = 'gmail';
    this.cursorKey = GMAIL_CURSOR_KEY;
    this.lastSuccessKey = GMAIL_LAST_SUCCESS_KEY;
    this.lastErrorKey = GMAIL_LAST_ERROR_KEY;
  }

  async accessToken() {
    const nowMs = nowFrom(this.clock).getTime();
    if (this.#cachedAccessToken && this.#accessTokenExpiresAt - nowMs > 60_000) {
      return this.#cachedAccessToken;
    }

    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.#clientSecret,
      refresh_token: this.#refreshToken,
      grant_type: 'refresh_token',
    });
    const response = await externalFetch({
      fetchImpl: this.fetchImpl,
      url: TOKEN_ENDPOINT,
      options: { method: 'POST', body },
      requestTimeoutMs: this.requestTimeoutMs,
      code: 'GMAIL_AUTH_FAILED',
      message: 'Gmail authentication could not be completed.',
    });
    if (!response.ok) {
      throw integrationError(502, 'GMAIL_AUTH_FAILED', `Gmail authentication failed (${response.status}).`);
    }
    const payload = await responseJson(
      response,
      'GMAIL_AUTH_FAILED',
      'Gmail authentication returned an invalid response.',
    );
    if (typeof payload.access_token !== 'string' || !payload.access_token) {
      throw integrationError(502, 'GMAIL_AUTH_FAILED', 'Gmail authentication returned no access token.');
    }

    const expiresIn = Number(payload.expires_in);
    this.#cachedAccessToken = payload.access_token;
    this.#accessTokenExpiresAt = nowMs + (Number.isFinite(expiresIn) && expiresIn > 0
      ? expiresIn * 1000
      : 3_600_000);
    return this.#cachedAccessToken;
  }

  async apiResponse(url) {
    let authRetried = false;
    let rateLimitRetries = 0;
    while (true) {
      const token = await this.accessToken();
      const response = await externalFetch({
        fetchImpl: this.fetchImpl,
        url,
        options: { headers: { authorization: `Bearer ${token}` } },
        requestTimeoutMs: this.requestTimeoutMs,
        code: 'GMAIL_SYNC_FAILED',
        message: 'Gmail could not be reached during synchronization.',
      });

      if (response.status === 401 && !authRetried) {
        authRetried = true;
        this.#cachedAccessToken = null;
        this.#accessTokenExpiresAt = 0;
        continue;
      }
      if (response.status !== 429 || rateLimitRetries >= MAX_RATE_LIMIT_RETRIES) {
        return response;
      }

      const retryAfterMs = retryAfterMilliseconds(response, this.clock);
      if (retryAfterMs !== null && retryAfterMs > MAX_RETRY_AFTER_MS) return response;
      const waitMs = retryAfterMs ?? (1000 * (2 ** rateLimitRetries));
      rateLimitRetries += 1;
      await this.delay(waitMs);
    }
  }

  async apiJson(url, { allowNotFound = false } = {}) {
    const response = await this.apiResponse(url);
    if (allowNotFound && response.status === 404) return null;
    if (!response.ok) {
      throw integrationError(502, 'GMAIL_SYNC_FAILED', `Gmail synchronization failed (${response.status}).`);
    }
    return responseJson(
      response,
      'GMAIL_INVALID_RESPONSE',
      'Gmail returned an invalid synchronization response.',
    );
  }

  async profile() {
    const profile = await this.apiJson(`${GMAIL_API}/users/me/profile`);
    if (
      typeof profile.emailAddress !== 'string'
      || !profile.emailAddress
      || typeof profile.historyId !== 'string'
      || !profile.historyId
    ) {
      throw integrationError(502, 'GMAIL_INVALID_RESPONSE', 'Gmail returned an invalid mailbox profile.');
    }
    return profile;
  }

  async message(messageId) {
    const url = new URL(`${GMAIL_API}/users/me/messages/${encodeURIComponent(messageId)}`);
    url.searchParams.set('format', 'metadata');
    url.searchParams.append('metadataHeaders', 'Subject');
    url.searchParams.append('metadataHeaders', 'From');
    return this.apiJson(url, { allowNotFound: true });
  }

  async messagesForIds(ids) {
    const messages = [];
    for (let offset = 0; offset < ids.length; offset += MESSAGE_BATCH_SIZE) {
      const batch = ids.slice(offset, offset + MESSAGE_BATCH_SIZE);
      const details = await Promise.all(batch.map(id => this.message(id)));
      for (const detail of details) {
        if (
          !detail
          || !Array.isArray(detail.labelIds)
          || !detail.labelIds.includes('INBOX')
          || typeof detail.id !== 'string'
          || !detail.id.trim()
          || !validInternalDate(detail.internalDate)
        ) continue;
        messages.push(mapGmailMessage(detail, this.accountEmail));
      }
    }
    return messages;
  }

  async fullSync() {
    // Capture the cursor first so mail arriving during the listing is picked up next time.
    const profile = await this.profile();
    const ids = new Set();
    const url = new URL(`${GMAIL_API}/users/me/messages`);
    url.searchParams.set('maxResults', '500');
    url.searchParams.append('labelIds', 'INBOX');
    const page = await this.apiJson(url);
    if (page.messages !== undefined && !Array.isArray(page.messages)) {
      throw integrationError(502, 'GMAIL_INVALID_RESPONSE', 'Gmail returned an invalid message list.');
    }
    for (const item of (page.messages ?? []).slice(0, 500)) {
      if (typeof item?.id === 'string' && item.id.trim()) ids.add(item.id.trim());
    }

    return {
      messages: await this.messagesForIds([...ids]),
      nextCursor: profile.historyId,
    };
  }

  async incrementalSync(cursor) {
    const ids = new Set();
    let pageToken = null;
    let nextCursor = String(cursor);
    do {
      const url = new URL(`${GMAIL_API}/users/me/history`);
      url.searchParams.set('startHistoryId', String(cursor));
      url.searchParams.append('historyTypes', 'messageAdded');
      url.searchParams.append('historyTypes', 'labelAdded');
      url.searchParams.set('labelId', 'INBOX');
      url.searchParams.set('maxResults', '500');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const response = await this.apiResponse(url);
      if (response.status === 404) return this.fullSync();
      if (!response.ok) {
        throw integrationError(502, 'GMAIL_SYNC_FAILED', `Gmail synchronization failed (${response.status}).`);
      }
      const page = await responseJson(
        response,
        'GMAIL_INVALID_RESPONSE',
        'Gmail returned an invalid history response.',
      );
      if (page.history !== undefined && !Array.isArray(page.history)) {
        throw integrationError(502, 'GMAIL_INVALID_RESPONSE', 'Gmail returned an invalid mailbox history.');
      }
      for (const history of page.history ?? []) {
        if (history.messagesAdded !== undefined && !Array.isArray(history.messagesAdded)) {
          throw integrationError(502, 'GMAIL_INVALID_RESPONSE', 'Gmail returned invalid message history.');
        }
        if (history.labelsAdded !== undefined && !Array.isArray(history.labelsAdded)) {
          throw integrationError(502, 'GMAIL_INVALID_RESPONSE', 'Gmail returned invalid label history.');
        }
        for (const addition of history.messagesAdded ?? []) {
          const message = addition.message;
          if (
            typeof message?.id === 'string'
            && message.id
            && (!Array.isArray(message.labelIds) || message.labelIds.includes('INBOX'))
          ) {
            ids.add(message.id);
          }
        }
        for (const addition of history.labelsAdded ?? []) {
          const message = addition.message;
          if (
            typeof message?.id === 'string'
            && message.id
            && (
              addition.labelIds?.includes('INBOX')
              || message.labelIds?.includes('INBOX')
            )
          ) {
            ids.add(message.id);
          }
        }
      }
      if (typeof page.historyId === 'string' && page.historyId) nextCursor = page.historyId;
      pageToken = typeof page.nextPageToken === 'string' && page.nextPageToken
        ? page.nextPageToken
        : null;
    } while (pageToken);

    return {
      messages: await this.messagesForIds([...ids]),
      nextCursor,
    };
  }

  async fetchChanges(cursor) {
    return cursor ? this.incrementalSync(cursor) : this.fullSync();
  }
}

export function createGmailIntegration({
  db,
  gmail,
  config,
  fetchImpl = fetch,
  requestTimeoutMs = 15_000,
  clock = () => new Date(),
  delay = defaultDelay,
} = {}) {
  if (!db) throw new TypeError('createGmailIntegration requires a database');
  const settings = gmail ?? config?.gmail ?? config ?? { configured: false };
  const configured = Boolean(settings.configured);
  const encryptionKey = configured ? normalizedEncryptionKey(settings.tokenEncryptionKey) : null;
  let cachedSource = null;
  let cachedSourceVersion = null;
  let connectionGeneration = 0;
  let connectionMutationTail = Promise.resolve();
  let disconnecting = false;

  function mutateConnection(operation) {
    const result = connectionMutationTail.then(operation, operation);
    connectionMutationTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  function requireConfigured() {
    if (!configured) {
      throw integrationError(503, 'GMAIL_NOT_CONFIGURED', 'Gmail integration is not configured.');
    }
  }

  function requireAdminSession(sessionId) {
    const session = typeof sessionId === 'string' && sessionId
      ? db.prepare(`
          SELECT users.role, sessions.organization_id, sessions.expires_at
          FROM sessions
          JOIN users ON users.id = sessions.user_id
          WHERE sessions.id = ?
        `).get(sessionId)
      : null;
    const now = nowFrom(clock).toISOString();
    if (!session || session.expires_at <= now) {
      throw integrationError(401, 'UNAUTHENTICATED', 'Please sign in again.');
    }
    if (session.role !== 'admin') {
      throw integrationError(403, 'FORBIDDEN', 'Administrator access is required.');
    }
    return session;
  }

  function clearSyncState(organizationId = 1) {
    const remove = db.prepare('DELETE FROM sync_state WHERE key = ? AND organization_id = ?');
    remove.run(scopedKey(GMAIL_CURSOR_KEY, organizationId), organizationId);
    remove.run(scopedKey(GMAIL_LAST_SUCCESS_KEY, organizationId), organizationId);
    remove.run(scopedKey(GMAIL_LAST_ERROR_KEY, organizationId), organizationId);
  }

  async function fetchProfile(accessToken) {
    const response = await externalFetch({
      fetchImpl,
      url: `${GMAIL_API}/users/me/profile`,
      options: { headers: { authorization: `Bearer ${accessToken}` } },
      requestTimeoutMs,
      code: 'GMAIL_AUTHORIZATION_FAILED',
      message: 'The connected Gmail account could not be verified.',
    });
    if (!response.ok) {
      throw integrationError(502, 'GMAIL_AUTHORIZATION_FAILED', 'The connected Gmail account could not be verified.');
    }
    const profile = await responseJson(
      response,
      'GMAIL_AUTHORIZATION_FAILED',
      'Gmail returned an invalid account profile.',
    );
    if (typeof profile.emailAddress !== 'string' || !profile.emailAddress.trim()) {
      throw integrationError(502, 'GMAIL_AUTHORIZATION_FAILED', 'Gmail returned no account email address.');
    }
    return profile.emailAddress.trim().toLocaleLowerCase();
  }

  async function revokeRefreshToken(refreshToken) {
    try {
      await externalFetch({
        fetchImpl,
        url: REVOCATION_ENDPOINT,
        options: {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: refreshToken }),
        },
        requestTimeoutMs,
        code: 'GMAIL_REVOCATION_FAILED',
        message: 'The Gmail grant could not be revoked.',
      });
    } catch {
      // Local disconnect must succeed even when Google is unavailable.
    }
  }

  function invalidateCachedSource() {
    connectionGeneration += 1;
    cachedSource = null;
    cachedSourceVersion = null;
  }

  function status(organizationId = null) {
    const scopedOrganizationId = organizationId == null ? null : Number(organizationId);
    const connection = db.prepare(`
      SELECT account_email, connected_at, updated_at, organization_id
      FROM gmail_connection
      WHERE id = 1 ${scopedOrganizationId == null ? '' : 'AND organization_id = ?'}
    `).get(...(scopedOrganizationId == null ? [] : [scopedOrganizationId]));
    const statusOrganizationId = scopedOrganizationId ?? connection?.organization_id ?? 1;
    const syncValues = Object.fromEntries(
      db.prepare(`
        SELECT key, value FROM sync_state
        WHERE organization_id = ? AND key IN (?, ?)
      `).all(statusOrganizationId,
        scopedKey(GMAIL_LAST_SUCCESS_KEY, statusOrganizationId),
        scopedKey(GMAIL_LAST_ERROR_KEY, statusOrganizationId)).map(row => [row.key, row.value]),
    );
    const connected = configured && Boolean(connection);
    return {
      configured,
      connected,
      accountEmail: connected ? connection.account_email : null,
      lastSuccessAt: connected ? (syncValues[scopedKey(GMAIL_LAST_SUCCESS_KEY, statusOrganizationId)] ?? null) : null,
      lastError: connected
        ? (safeErrorMessage(syncValues[scopedKey(GMAIL_LAST_ERROR_KEY, statusOrganizationId)]) || null)
        : null,
    };
  }

  function authorizationUrl({ sessionId } = {}) {
    requireConfigured();
    const session = requireAdminSession(sessionId);
    const state = randomBytes(32).toString('base64url');
    const digest = createHash('sha256').update(state).digest('hex');
    const now = nowFrom(clock);
    const expiresAt = new Date(now.getTime() + OAUTH_STATE_TTL_MS).toISOString();
    runTransaction(db, () => {
      db.prepare('DELETE FROM gmail_oauth_states WHERE expires_at <= ?').run(now.toISOString());
      db.prepare('DELETE FROM gmail_oauth_states WHERE session_id = ?').run(sessionId);
      db.prepare(`
        INSERT INTO gmail_oauth_states (state_digest, session_id, expires_at, organization_id)
        VALUES (?, ?, ?, ?)
      `).run(digest, sessionId, expiresAt, session.organization_id);
    });

    const url = new URL(AUTHORIZATION_ENDPOINT);
    url.searchParams.set('client_id', settings.clientId);
    url.searchParams.set('redirect_uri', settings.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', GMAIL_SCOPE);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', state);
    return url.toString();
  }

  async function completeAuthorizationNow({ sessionId, state, code } = {}) {
    requireConfigured();
    requireAdminSession(sessionId);
    if (typeof state !== 'string' || !state || state.length > 512) {
      throw integrationError(400, 'INVALID_OAUTH_STATE', 'The Gmail authorization request is invalid or expired.');
    }

    const digest = createHash('sha256').update(state).digest('hex');
    const now = nowFrom(clock);
    let savedOrganizationId;
    runTransaction(db, () => {
      const saved = db.prepare(`
        SELECT session_id, expires_at, organization_id
        FROM gmail_oauth_states
        WHERE state_digest = ?
      `).get(digest);
      if (!saved || saved.session_id !== sessionId || saved.expires_at <= now.toISOString()) {
        throw integrationError(400, 'INVALID_OAUTH_STATE', 'The Gmail authorization request is invalid or expired.');
      }
      savedOrganizationId = saved.organization_id;
      db.prepare('DELETE FROM gmail_oauth_states WHERE state_digest = ?').run(digest);
    });
    if (typeof code !== 'string' || !code || code.length > 4096) {
      throw integrationError(400, 'INVALID_AUTHORIZATION_CODE', 'Gmail did not return a valid authorization code.');
    }

    const body = new URLSearchParams({
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: settings.redirectUri,
    });
    const response = await externalFetch({
      fetchImpl,
      url: TOKEN_ENDPOINT,
      options: { method: 'POST', body },
      requestTimeoutMs,
      code: 'GMAIL_AUTHORIZATION_FAILED',
      message: 'Gmail authorization could not be completed.',
    });
    if (!response.ok) {
      throw integrationError(502, 'GMAIL_AUTHORIZATION_FAILED', 'Gmail authorization could not be completed.');
    }
    const tokens = await responseJson(
      response,
      'GMAIL_AUTHORIZATION_FAILED',
      'Gmail authorization returned an invalid response.',
    );
    if (typeof tokens.access_token !== 'string' || !tokens.access_token) {
      throw integrationError(502, 'GMAIL_AUTHORIZATION_FAILED', 'Gmail authorization returned no access token.');
    }

    const accountEmail = await fetchProfile(tokens.access_token);
    const existing = db.prepare(`
      SELECT account_email, encrypted_refresh_token
      FROM gmail_connection
      WHERE id = 1
    `).get();
    let encryptedRefreshToken;
    if (typeof tokens.refresh_token === 'string' && tokens.refresh_token) {
      encryptedRefreshToken = encryptRefreshToken(tokens.refresh_token, encryptionKey);
    } else if (existing?.account_email.toLocaleLowerCase() === accountEmail) {
      encryptedRefreshToken = existing.encrypted_refresh_token;
    } else {
      throw integrationError(
        502,
        'GMAIL_OFFLINE_ACCESS_REQUIRED',
        'Gmail did not grant offline access. Reconnect and approve mailbox access.',
      );
    }

    const timestamp = nowFrom(clock).toISOString();
    runTransaction(db, () => {
      db.prepare(`
        INSERT INTO gmail_connection
          (id, account_email, encrypted_refresh_token, connected_at, updated_at, organization_id)
        VALUES (1, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          account_email = excluded.account_email,
          encrypted_refresh_token = excluded.encrypted_refresh_token,
          connected_at = excluded.connected_at,
          updated_at = excluded.updated_at,
          organization_id = excluded.organization_id
      `).run(accountEmail, encryptedRefreshToken, timestamp, timestamp, savedOrganizationId ?? 1);
      clearSyncState(savedOrganizationId ?? 1);
    });
    invalidateCachedSource();
    return status(savedOrganizationId ?? 1);
  }

  function completeAuthorization(options) {
    return mutateConnection(() => completeAuthorizationNow(options));
  }

  async function disconnectNow({ organizationId = null } = {}) {
    disconnecting = true;
    invalidateCachedSource();
    try {
      const connection = configured
        ? db.prepare(`
            SELECT encrypted_refresh_token, organization_id
            FROM gmail_connection
            WHERE id = 1 ${organizationId == null ? '' : 'AND organization_id = ?'}
          `).get(...(organizationId == null ? [] : [organizationId]))
        : null;
      let refreshToken = null;
      if (connection) {
        try {
          refreshToken = decryptRefreshToken(connection.encrypted_refresh_token, encryptionKey);
        } catch {
          // A damaged local token must not prevent removal of the connection.
        }
      }
      if (refreshToken) await revokeRefreshToken(refreshToken);
      runTransaction(db, () => {
        db.prepare(`DELETE FROM gmail_connection WHERE id = 1 ${organizationId == null ? '' : 'AND organization_id = ?'}`)
          .run(...(organizationId == null ? [] : [organizationId]));
        db.prepare(`DELETE FROM gmail_oauth_states ${organizationId == null ? '' : 'WHERE organization_id = ?'}`)
          .run(...(organizationId == null ? [] : [organizationId]));
        clearSyncState(connection?.organization_id ?? 1);
      });
      return status(connection?.organization_id ?? organizationId ?? 1);
    } finally {
      disconnecting = false;
    }
  }

  function disconnect(options) {
    return mutateConnection(() => disconnectNow(options));
  }

  function sources() {
    if (!configured || disconnecting) return [];
    const connection = db.prepare(`
      SELECT account_email, encrypted_refresh_token, updated_at, organization_id
      FROM gmail_connection
      WHERE id = 1
    `).get();
    if (!connection) return [];
    const version = `${connection.account_email}\n${connection.updated_at}`;
    if (cachedSource && cachedSourceVersion === version) return [cachedSource];

    const refreshToken = decryptRefreshToken(connection.encrypted_refresh_token, encryptionKey);
    const sourceGeneration = connectionGeneration;
    const isCurrentConnection = () => {
      if (sourceGeneration !== connectionGeneration) return false;
      const current = db.prepare(`
        SELECT account_email, encrypted_refresh_token, updated_at, organization_id
        FROM gmail_connection
        WHERE id = 1
      `).get();
      return Boolean(
        current
        && current.account_email.toLocaleLowerCase() === connection.account_email.toLocaleLowerCase()
        && current.encrypted_refresh_token === connection.encrypted_refresh_token
        && current.updated_at === connection.updated_at
        && current.organization_id === connection.organization_id
      );
    };
    cachedSource = new GmailMailSource({
      accountEmail: connection.account_email,
      organizationId: connection.organization_id,
      clientId: settings.clientId,
      clientSecret: settings.clientSecret,
      refreshToken,
      fetchImpl,
      requestTimeoutMs,
      clock,
      delay,
      isCurrentConnection,
    });
    cachedSourceVersion = version;
    return [cachedSource];
  }

  return {
    configured,
    status,
    authorizationUrl,
    completeAuthorization,
    disconnect,
    sources,
  };
}
