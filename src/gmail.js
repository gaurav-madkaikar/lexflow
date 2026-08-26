import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import {
  disconnectMailboxConnection,
  replaceConnectionGeneration,
  resolveMailboxConnection,
} from './mailbox-connections.js';
import { normalizeMessagePreview } from './message-preview.js';

const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REVOCATION_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1';
const GMAIL_READ_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
export const GMAIL_SCOPES = Object.freeze([
  GMAIL_READ_SCOPE,
  GMAIL_SEND_SCOPE,
  'openid',
  'email',
]);
const GMAIL_SCOPE = GMAIL_SCOPES.join(' ');
const GMAIL_CURSOR_KEY = 'mail_cursor:gmail';
const GMAIL_LAST_SUCCESS_KEY = `last_sync_at:${GMAIL_CURSOR_KEY}`;
const GMAIL_LAST_ERROR_KEY = `last_sync_error:${GMAIL_CURSOR_KEY}`;
const GMAIL_RECONCILIATION_KEY = 'mail_reconciliation:gmail:inbox-membership:v1';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const MESSAGE_BATCH_SIZE = 20;
const MAX_RATE_LIMIT_RETRIES = 2;
const MAX_RETRY_AFTER_MS = 30_000;
const MAX_OUTBOUND_MIME_BYTES = 1024 * 1024;
const MAX_HEADER_METADATA_LENGTH = 8192;
const MAX_CONVERSATION_MESSAGES = 100;
const ENCRYPTION_AAD = Buffer.from('lexflow:gmail-refresh-token:v1');

function defaultDelay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function integrationError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function providerSendError(code, safeMessage, {
  status = 502,
  retryable = false,
  ambiguous = false,
} = {}) {
  return Object.assign(integrationError(status, code, safeMessage), {
    retryable,
    ambiguous,
    safeMessage,
  });
}

function capabilities(value, fallback = { read: true, send: false }) {
  if (Array.isArray(value)) {
    return Object.freeze({ read: value.includes('read'), send: value.includes('send') });
  }
  return Object.freeze({
    read: typeof value?.read === 'boolean' ? value.read : fallback.read,
    send: typeof value?.send === 'boolean' ? value.send : fallback.send,
  });
}

function capabilitiesFromScopes(value, assumeRequested = false) {
  const granted = typeof value === 'string' && value.trim()
    ? new Set(value.trim().split(/\s+/u))
    : new Set(assumeRequested ? GMAIL_SCOPES : []);
  return capabilities({
    read: granted.has(GMAIL_READ_SCOPE),
    send: granted.has(GMAIL_SEND_SCOPE),
  });
}

function requestSignal(requestTimeoutMs, signal) {
  const timeout = AbortSignal.timeout(requestTimeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function rawMimeBytes(rawMime) {
  const bytes = Buffer.isBuffer(rawMime)
    ? Buffer.from(rawMime)
    : rawMime instanceof Uint8Array
      ? Buffer.from(rawMime)
      : typeof rawMime === 'string'
        ? Buffer.from(rawMime, 'utf8')
        : null;
  if (!bytes?.length || bytes.length > MAX_OUTBOUND_MIME_BYTES) {
    throw providerSendError(
      'GMAIL_SEND_INVALID_MESSAGE',
      'The assignment message is empty or too large to send.',
      { status: 400 },
    );
  }
  return bytes;
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
      signal: requestSignal(requestTimeoutMs, options.signal),
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

function normalizedHeaderMetadata(value) {
  if (typeof value !== 'string') return null;
  const normalized = value
    .replace(/\r?\n[\t ]+/gu, ' ')
    .replace(/[\u0000-\u001f\u007f]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  return normalized && normalized.length <= MAX_HEADER_METADATA_LENGTH ? normalized : null;
}

function gmailRawMessageId(providerMessageId, accountEmail) {
  const value = typeof providerMessageId === 'string' ? providerMessageId.trim() : '';
  if (!value) return null;
  const prefix = `gmail:${accountEmail.toLocaleLowerCase()}:`;
  const rawId = value.startsWith(prefix) ? value.slice(prefix.length) : value;
  return rawId && rawId.length <= 1024 && !/[\u0000-\u001f\u007f]/u.test(rawId)
    ? rawId
    : null;
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

function gmailProviderId(messageId, accountEmail) {
  return `gmail:${accountEmail.toLocaleLowerCase()}:${messageId}`;
}

function mapGmailMessage(message, accountEmail) {
  const rawId = typeof message.id === 'string' ? message.id.trim() : '';
  const internalDate = Number(message.internalDate);
  if (!rawId || !validInternalDate(message.internalDate)) {
    throw integrationError(502, 'GMAIL_INVALID_RESPONSE', 'Gmail returned invalid message metadata.');
  }

  const subject = headerValue(message, 'Subject') || '(No subject)';
  const sender = parseSender(normalizedHeaderMetadata(headerValue(message, 'From')) || '');
  const nativeConversationId = normalizedHeaderMetadata(message.threadId);
  const conversationId = nativeConversationId || rawId;
  const webUrl = `https://mail.google.com/mail/?authuser=${encodeURIComponent(accountEmail)}#inbox/${encodeURIComponent(conversationId)}`;
  return {
    providerId: gmailProviderId(rawId, accountEmail),
    provider: 'gmail',
    mailboxAddress: accountEmail,
    subject,
    senderName: sender.name,
    senderAddress: sender.address,
    preview: typeof message.snippet === 'string' ? message.snippet : '',
    receivedAt: new Date(internalDate).toISOString(),
    nativeConversationId,
    internetMessageId: normalizedHeaderMetadata(headerValue(message, 'Message-ID')),
    inReplyTo: normalizedHeaderMetadata(headerValue(message, 'In-Reply-To')),
    references: normalizedHeaderMetadata(headerValue(message, 'References')),
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
    clientId,
    clientSecret,
    refreshToken,
    fetchImpl = fetch,
    requestTimeoutMs = 15_000,
    clock = () => new Date(),
    delay = defaultDelay,
    isCurrentConnection = () => true,
    capabilities: grantedCapabilities,
    organizationId = null,
    connectionId = null,
    mailboxIdentityId = null,
    connectionGeneration = null,
  }) {
    Object.assign(this, {
      accountEmail,
      clientId,
      fetchImpl,
      requestTimeoutMs,
      clock,
      delay,
      isCurrentConnection,
      organizationId,
      connectionId,
      mailboxIdentityId,
      connectionGeneration,
    });
    this.#clientSecret = clientSecret;
    this.#refreshToken = refreshToken;
    this.capabilities = capabilities(grantedCapabilities);
    this.provider = 'gmail';
    this.mailboxAddress = accountEmail;
    this.sourceKey = 'gmail';
    this.cursorKey = GMAIL_CURSOR_KEY;
    this.lastSuccessKey = GMAIL_LAST_SUCCESS_KEY;
    this.lastErrorKey = GMAIL_LAST_ERROR_KEY;
    this.reconciliationKey = GMAIL_RECONCILIATION_KEY;
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
      if (response.status === 400) {
        throw integrationError(
          502,
          'GMAIL_AUTH_FAILED',
          'Gmail authorization needs to be renewed. Reconnect Gmail from Settings.',
        );
      }
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

  async apiResponse(url, { signal } = {}) {
    let authRetried = false;
    let rateLimitRetries = 0;
    while (true) {
      const token = await this.accessToken();
      const response = await externalFetch({
        fetchImpl: this.fetchImpl,
        url,
        options: { headers: { authorization: `Bearer ${token}` }, signal },
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

  async apiJson(url, { allowNotFound = false, signal } = {}) {
    const response = await this.apiResponse(url, { signal });
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

  async message(messageId, { signal } = {}) {
    const url = new URL(`${GMAIL_API}/users/me/messages/${encodeURIComponent(messageId)}`);
    url.searchParams.set('format', 'metadata');
    url.searchParams.append('metadataHeaders', 'Subject');
    url.searchParams.append('metadataHeaders', 'From');
    url.searchParams.append('metadataHeaders', 'Message-ID');
    url.searchParams.append('metadataHeaders', 'In-Reply-To');
    url.searchParams.append('metadataHeaders', 'References');
    return this.apiJson(url, { allowNotFound: true, signal });
  }

  async fetchConversation({
    providerMessageId = null,
    nativeConversationId = null,
    deliveryMessageIds = [],
    signal,
  } = {}) {
    if (!Array.isArray(deliveryMessageIds)) {
      throw new TypeError('Gmail conversation delivery Message-IDs must be an array.');
    }
    let threadId = normalizedHeaderMetadata(nativeConversationId);
    if (providerMessageId !== null) {
      const rawMessageId = gmailRawMessageId(providerMessageId, this.accountEmail);
      if (!rawMessageId) throw new TypeError('Gmail conversation requires a valid provider message.');
      const anchor = await this.message(rawMessageId, { signal });
      const resolvedThreadId = normalizedHeaderMetadata(anchor?.threadId);
      if (!anchor || !resolvedThreadId) {
        throw integrationError(404, 'GMAIL_CONVERSATION_NOT_FOUND', 'The Gmail conversation is unavailable.');
      }
      if (threadId && threadId !== resolvedThreadId) {
        throw integrationError(409, 'GMAIL_CONVERSATION_MISMATCH', 'The Gmail conversation identity changed.');
      }
      threadId = resolvedThreadId;
    }
    if (!threadId) throw new TypeError('Gmail conversation requires a native thread identity.');

    const url = new URL(`${GMAIL_API}/users/me/threads/${encodeURIComponent(threadId)}`);
    url.searchParams.set('format', 'metadata');
    url.searchParams.append('metadataHeaders', 'From');
    url.searchParams.append('metadataHeaders', 'Message-ID');
    const thread = await this.apiJson(url, { signal });
    if (
      normalizedHeaderMetadata(thread?.id) !== threadId
      || !Array.isArray(thread?.messages)
    ) {
      throw integrationError(502, 'GMAIL_INVALID_RESPONSE', 'Gmail returned invalid conversation metadata.');
    }
    const deliveryIds = new Set(deliveryMessageIds
      .map(normalizedHeaderMetadata)
      .filter(Boolean));
    const messages = [];
    for (const message of thread.messages) {
      if (!Array.isArray(message?.labelIds)) {
        throw integrationError(502, 'GMAIL_INVALID_RESPONSE', 'Gmail returned invalid conversation metadata.');
      }
      const labels = new Set(message.labelIds);
      if (
        (!labels.has('INBOX') && !labels.has('SENT'))
        || labels.has('DRAFT')
        || labels.has('SPAM')
        || labels.has('TRASH')
      ) continue;
      const providerId = typeof message.id === 'string' ? message.id.trim() : '';
      if (
        !providerId
        || normalizedHeaderMetadata(message.threadId) !== threadId
        || !validInternalDate(message.internalDate)
      ) {
        throw integrationError(502, 'GMAIL_INVALID_RESPONSE', 'Gmail returned invalid conversation metadata.');
      }
      const internetMessageId = normalizedHeaderMetadata(headerValue(message, 'Message-ID'));
      if (internetMessageId && deliveryIds.has(internetMessageId)) continue;
      const sender = parseSender(normalizedHeaderMetadata(headerValue(message, 'From')) || '');
      messages.push({
        providerMessageId: providerId,
        direction: labels.has('SENT') ? 'sent' : 'received',
        sender: { name: sender.name, address: sender.address },
        occurredAt: new Date(Number(message.internalDate)).toISOString(),
        preview: normalizeMessagePreview(message.snippet).preview,
        internetMessageId,
        webUrl: `https://mail.google.com/mail/?authuser=${encodeURIComponent(this.accountEmail)}#all/${encodeURIComponent(threadId)}`,
      });
    }
    messages.sort((left, right) => (
      left.occurredAt.localeCompare(right.occurredAt)
      || left.providerMessageId.localeCompare(right.providerMessageId)
    ));
    return {
      messages: messages.slice(-MAX_CONVERSATION_MESSAGES),
      truncated: messages.length > MAX_CONVERSATION_MESSAGES,
    };
  }

  async sendAssignmentDigest({ rawMime, signal } = {}) {
    if (!this.capabilities.send) {
      throw providerSendError(
        'GMAIL_SEND_NOT_AUTHORIZED',
        'Reconnect Gmail and approve send access before forwarding assignments.',
        { status: 403 },
      );
    }
    const bytes = rawMimeBytes(rawMime);
    const token = await this.accessToken();
    let response;
    try {
      response = await this.fetchImpl(`${GMAIL_API}/users/me/messages/send`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ raw: bytes.toString('base64url') }),
        signal: requestSignal(this.requestTimeoutMs, signal),
      });
    } catch {
      throw providerSendError(
        'GMAIL_SEND_UNCERTAIN',
        'Gmail did not confirm whether the assignment message was accepted.',
        { ambiguous: true },
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw providerSendError(
        response.status === 401 ? 'GMAIL_SEND_UNAUTHORIZED' : 'GMAIL_SEND_FORBIDDEN',
        'Gmail rejected the assignment message. Reconnect Gmail and confirm send access.',
        { status: response.status },
      );
    }
    if (!response.ok) {
      throw providerSendError(
        'GMAIL_SEND_REJECTED',
        `Gmail rejected the assignment message (${response.status}).`,
        { status: 502, retryable: response.status === 429 || response.status >= 500 },
      );
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      // Acceptance is authoritative even if the optional response resource is malformed.
    }
    const providerMessageId = typeof payload?.id === 'string' && payload.id.trim()
      ? payload.id.trim()
      : null;
    return { providerMessageId };
  }

  async reconcileMessageId({ internetMessageId, signal } = {}) {
    const messageId = normalizedHeaderMetadata(internetMessageId);
    if (!messageId || messageId.length > 998) {
      throw new TypeError('Gmail Message-ID reconciliation requires a valid Message-ID.');
    }
    const token = await this.accessToken();
    const url = new URL(`${GMAIL_API}/users/me/messages`);
    url.searchParams.set('q', `rfc822msgid:${messageId}`);
    url.searchParams.set('maxResults', '1');

    let response;
    try {
      response = await this.fetchImpl(url, {
        headers: { authorization: `Bearer ${token}` },
        signal: requestSignal(this.requestTimeoutMs, signal),
      });
    } catch {
      throw providerSendError(
        'GMAIL_RECONCILIATION_UNCERTAIN',
        'Gmail could not confirm the assignment message status.',
        { ambiguous: true },
      );
    }
    if (!response.ok) {
      throw providerSendError(
        'GMAIL_RECONCILIATION_FAILED',
        `Gmail could not confirm the assignment message status (${response.status}).`,
        { status: 502, retryable: response.status === 429 || response.status >= 500 },
      );
    }
    const payload = await responseJson(
      response,
      'GMAIL_RECONCILIATION_FAILED',
      'Gmail returned invalid assignment-message status.',
    );
    if (payload.messages !== undefined && !Array.isArray(payload.messages)) {
      throw providerSendError(
        'GMAIL_RECONCILIATION_FAILED',
        'Gmail returned invalid assignment-message status.',
      );
    }
    const foundId = payload.messages
      ?.map(item => typeof item?.id === 'string' ? item.id.trim() : '')
      .find(Boolean) ?? null;
    return { found: Boolean(foundId), providerMessageId: foundId };
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

  async currentInboxStateForIds(ids) {
    const messages = [];
    const presentIds = [];
    const removedIds = [];
    for (let offset = 0; offset < ids.length; offset += MESSAGE_BATCH_SIZE) {
      const batch = ids.slice(offset, offset + MESSAGE_BATCH_SIZE);
      const details = await Promise.all(batch.map(async id => ({ id, detail: await this.message(id) })));
      for (const { id, detail } of details) {
        if (!detail) {
          removedIds.push(id);
          continue;
        }
        if (
          typeof detail.id !== 'string'
          || detail.id.trim() !== id
          || !Array.isArray(detail.labelIds)
          || !validInternalDate(detail.internalDate)
        ) {
          throw integrationError(
            502,
            'GMAIL_INVALID_RESPONSE',
            'Gmail returned invalid message metadata.',
          );
        }
        if (!detail.labelIds.includes('INBOX')) {
          removedIds.push(id);
          continue;
        }
        presentIds.push(id);
        messages.push(mapGmailMessage(detail, this.accountEmail));
      }
    }
    return { messages, presentIds, removedIds };
  }

  async inboxChangesForIds(ids) {
    const { messages, removedIds } = await this.currentInboxStateForIds(ids);
    return {
      messages,
      removedProviderIds: removedIds.map(id => gmailProviderId(id, this.accountEmail)),
    };
  }

  async reconcileInbox(providerIds) {
    if (!Array.isArray(providerIds)) {
      throw new TypeError('Gmail reconciliation requires provider IDs');
    }
    const prefix = `gmail:${this.accountEmail.toLocaleLowerCase()}:`;
    const providerIdByRawId = new Map();
    for (const providerId of providerIds) {
      const rawId = typeof providerId === 'string' && providerId.startsWith(prefix)
        ? providerId.slice(prefix.length)
        : '';
      if (!rawId || rawId !== rawId.trim() || providerId !== providerId.trim()) {
        throw integrationError(
          502,
          'GMAIL_INVALID_RESPONSE',
          'Gmail reconciliation received an invalid provider ID.',
        );
      }
      providerIdByRawId.set(rawId, providerId);
    }

    const { presentIds, removedIds } = await this.currentInboxStateForIds([
      ...providerIdByRawId.keys(),
    ]);
    return {
      presentProviderIds: presentIds.map(id => providerIdByRawId.get(id)),
      removedProviderIds: removedIds.map(id => providerIdByRawId.get(id)),
    };
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
      removedProviderIds: [],
      nextCursor: profile.historyId,
    };
  }

  async incrementalSync(cursor) {
    const touchedIds = new Set();
    let pageToken = null;
    let nextCursor = String(cursor);
    do {
      const url = new URL(`${GMAIL_API}/users/me/history`);
      url.searchParams.set('startHistoryId', String(cursor));
      for (const historyType of [
        'messageAdded',
        'messageDeleted',
        'labelAdded',
        'labelRemoved',
      ]) {
        url.searchParams.append('historyTypes', historyType);
      }
      url.searchParams.set('maxResults', '500');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const response = await this.apiResponse(url);
      if (response.status === 404) {
        return {
          ...await this.fullSync(),
          reconciliationRequired: true,
        };
      }
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
        if (!history || typeof history !== 'object') {
          throw integrationError(502, 'GMAIL_INVALID_RESPONSE', 'Gmail returned invalid message history.');
        }
        if (history.messagesAdded !== undefined && !Array.isArray(history.messagesAdded)) {
          throw integrationError(502, 'GMAIL_INVALID_RESPONSE', 'Gmail returned invalid message history.');
        }
        if (history.messagesDeleted !== undefined && !Array.isArray(history.messagesDeleted)) {
          throw integrationError(502, 'GMAIL_INVALID_RESPONSE', 'Gmail returned invalid deleted-message history.');
        }
        if (history.labelsAdded !== undefined && !Array.isArray(history.labelsAdded)) {
          throw integrationError(502, 'GMAIL_INVALID_RESPONSE', 'Gmail returned invalid label history.');
        }
        if (history.labelsRemoved !== undefined && !Array.isArray(history.labelsRemoved)) {
          throw integrationError(502, 'GMAIL_INVALID_RESPONSE', 'Gmail returned invalid removed-label history.');
        }
        for (const addition of history.messagesAdded ?? []) {
          const message = addition.message;
          const messageId = typeof message?.id === 'string' ? message.id.trim() : '';
          if (
            messageId
            && (
              !Array.isArray(message.labelIds)
              || message.labelIds.includes('INBOX')
            )
          ) {
            touchedIds.add(messageId);
          }
        }
        for (const addition of history.labelsAdded ?? []) {
          const message = addition.message;
          const messageId = typeof message?.id === 'string' ? message.id.trim() : '';
          if (
            messageId
            && Array.isArray(addition.labelIds)
            && addition.labelIds.includes('INBOX')
          ) {
            touchedIds.add(messageId);
          }
        }
        for (const deletion of history.messagesDeleted ?? []) {
          const messageId = typeof deletion?.message?.id === 'string'
            ? deletion.message.id.trim()
            : '';
          if (messageId) touchedIds.add(messageId);
        }
        for (const removal of history.labelsRemoved ?? []) {
          const messageId = typeof removal?.message?.id === 'string'
            ? removal.message.id.trim()
            : '';
          if (
            messageId
            && Array.isArray(removal.labelIds)
            && removal.labelIds.includes('INBOX')
          ) {
            touchedIds.add(messageId);
          }
        }
      }
      if (typeof page.historyId === 'string' && page.historyId) nextCursor = page.historyId;
      pageToken = typeof page.nextPageToken === 'string' && page.nextPageToken
        ? page.nextPageToken
        : null;
    } while (pageToken);

    const changes = await this.inboxChangesForIds([...touchedIds]);
    return {
      ...changes,
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
  const cachedSources = new Map();
  const disconnectingOrganizations = new Set();
  let connectionMutationTail = Promise.resolve();

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
          SELECT users.id, users.organization_id, users.role,
                 users.registration_status, sessions.expires_at
          FROM sessions
          JOIN users ON users.id = sessions.user_id
          WHERE sessions.id = ?
        `).get(sessionId)
      : null;
    const now = nowFrom(clock).toISOString();
    if (!session || session.expires_at <= now) {
      throw integrationError(401, 'UNAUTHENTICATED', 'Please sign in again.');
    }
    if (session.role !== 'admin' || session.registration_status !== 'active') {
      throw integrationError(403, 'FORBIDDEN', 'Administrator access is required.');
    }
    return {
      userId: Number(session.id),
      organizationId: Number(session.organization_id),
    };
  }

  function requireAdminIdentity(organizationId, adminUserId) {
    if (adminUserId === null || adminUserId === undefined) return;
    const admin = db.prepare(`
      SELECT 1 FROM users
      WHERE id = ? AND organization_id = ?
        AND role = 'admin' AND registration_status = 'active'
    `).get(Number(adminUserId), organizationId);
    if (!admin) {
      throw integrationError(403, 'FORBIDDEN', 'Administrator access is required.');
    }
  }

  function clearSyncState(organizationId) {
    const remove = db.prepare(`
      DELETE FROM sync_state WHERE organization_id = ? AND key = ?
    `);
    remove.run(organizationId, GMAIL_CURSOR_KEY);
    remove.run(organizationId, GMAIL_LAST_SUCCESS_KEY);
    remove.run(organizationId, GMAIL_LAST_ERROR_KEY);
    remove.run(organizationId, GMAIL_RECONCILIATION_KEY);
  }

  function canonicalConnection(organizationId) {
    return resolveMailboxConnection({ db, organizationId, provider: 'gmail' });
  }

  async function fetchVerifiedIdentity(accessToken) {
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
    if (
      !profile
      || typeof profile !== 'object'
      || typeof profile.emailAddress !== 'string'
      || !profile.emailAddress.trim()
    ) {
      throw integrationError(502, 'GMAIL_AUTHORIZATION_FAILED', 'Gmail returned no account email address.');
    }
    const mailboxAddress = profile.emailAddress.trim().toLocaleLowerCase();

    const identityResponse = await externalFetch({
      fetchImpl,
      url: USERINFO_ENDPOINT,
      options: { headers: { authorization: `Bearer ${accessToken}` } },
      requestTimeoutMs,
      code: 'GMAIL_IDENTITY_VERIFICATION_FAILED',
      message: 'The connected Google account identity could not be verified.',
    });
    if (!identityResponse.ok) {
      throw integrationError(
        502,
        'GMAIL_IDENTITY_VERIFICATION_FAILED',
        'The connected Google account identity could not be verified.',
      );
    }
    const identity = await responseJson(
      identityResponse,
      'GMAIL_IDENTITY_VERIFICATION_FAILED',
      'Google returned an invalid account identity.',
    );
    const providerAccountId = identity && typeof identity === 'object'
      && typeof identity.sub === 'string'
      ? identity.sub
      : '';
    const verifiedEmail = identity && typeof identity === 'object'
      && typeof identity.email === 'string'
      ? identity.email.trim().toLocaleLowerCase()
      : '';
    if (
      !providerAccountId.trim()
      || providerAccountId !== providerAccountId.trim()
      || providerAccountId.length > 255
      || /[\u0000-\u001f\u007f]/u.test(providerAccountId)
      || identity?.email_verified !== true
      || !verifiedEmail
      || verifiedEmail.length > 320
      || !verifiedEmail.includes('@')
      || verifiedEmail !== mailboxAddress
    ) {
      throw integrationError(
        502,
        'GMAIL_IDENTITY_VERIFICATION_FAILED',
        'The connected Google account identity did not match the Gmail mailbox.',
      );
    }
    return { mailboxAddress, providerAccountId };
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

  function invalidateCachedSource(organizationId) {
    cachedSources.delete(organizationId);
  }

  function status({ organizationId = 1 } = {}) {
    const connection = canonicalConnection(organizationId);
    const connected = configured && Boolean(connection);
    const syncValue = key => connected
      ? db.prepare(`
          SELECT value FROM sync_state
          WHERE organization_id = ? AND key = ? AND connection_id IN (0, ?)
          ORDER BY (connection_id = ?) DESC
          LIMIT 1
        `).get(organizationId, key, connection.id, connection.id)?.value
      : null;
    return {
      configured,
      connected,
      accountEmail: connected ? connection.mailboxAddress : null,
      lastSuccessAt: syncValue(GMAIL_LAST_SUCCESS_KEY) ?? null,
      lastError: connected
        ? (safeErrorMessage(syncValue(GMAIL_LAST_ERROR_KEY)) || null)
        : null,
      capabilities: connected
        ? capabilities(connection.capabilities)
        : capabilities({ read: false, send: false }),
    };
  }

  function authorizationUrl({ sessionId } = {}) {
    requireConfigured();
    const admin = requireAdminSession(sessionId);
    const state = randomBytes(32).toString('base64url');
    const digest = createHash('sha256').update(state).digest('hex');
    const now = nowFrom(clock);
    const expiresAt = new Date(now.getTime() + OAUTH_STATE_TTL_MS).toISOString();
    runTransaction(db, () => {
      db.prepare('DELETE FROM gmail_oauth_states WHERE expires_at <= ?').run(now.toISOString());
      db.prepare(`
        DELETE FROM gmail_oauth_states
        WHERE session_id = ? AND state_digest NOT LIKE 'outlook:%'
      `).run(sessionId);
      db.prepare(`
        INSERT INTO gmail_oauth_states
          (organization_id, state_digest, session_id, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(admin.organizationId, digest, sessionId, expiresAt);
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
    const admin = requireAdminSession(sessionId);
    if (typeof state !== 'string' || !state || state.length > 512) {
      throw integrationError(400, 'INVALID_OAUTH_STATE', 'The Gmail authorization request is invalid or expired.');
    }

    const digest = createHash('sha256').update(state).digest('hex');
    const now = nowFrom(clock);
    runTransaction(db, () => {
      const saved = db.prepare(`
        SELECT session_id, expires_at
        FROM gmail_oauth_states
        WHERE organization_id = ? AND state_digest = ?
      `).get(admin.organizationId, digest);
      if (!saved || saved.session_id !== sessionId || saved.expires_at <= now.toISOString()) {
        throw integrationError(400, 'INVALID_OAUTH_STATE', 'The Gmail authorization request is invalid or expired.');
      }
      db.prepare(`
        DELETE FROM gmail_oauth_states
        WHERE organization_id = ? AND state_digest = ?
      `).run(admin.organizationId, digest);
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

    const { mailboxAddress: accountEmail, providerAccountId } = await fetchVerifiedIdentity(
      tokens.access_token,
    );
    const existing = canonicalConnection(admin.organizationId);
    if (
      existing
      && existing.providerAccountId.toLocaleLowerCase()
        === existing.mailboxAddress.toLocaleLowerCase()
    ) {
      throw integrationError(
        409,
        'GMAIL_LEGACY_IDENTITY_UPGRADE_REQUIRED',
        'Disconnect the legacy Gmail connection before reconnecting it with verified identity.',
      );
    }
    if (
      existing
      && (
        existing.mailboxAddress.toLocaleLowerCase() !== accountEmail
        || existing.providerAccountId !== providerAccountId
      )
    ) {
      throw integrationError(
        409,
        'MAILBOX_IDENTITY_MISMATCH',
        'Reconnect the same Gmail account already registered for this organization.',
      );
    }
    let encryptedRefreshToken;
    if (typeof tokens.refresh_token === 'string' && tokens.refresh_token) {
      encryptedRefreshToken = encryptRefreshToken(tokens.refresh_token, encryptionKey);
    } else if (existing?.providerAccountId === providerAccountId) {
      encryptedRefreshToken = existing.encryptedGrant;
    } else {
      throw integrationError(
        502,
        'GMAIL_OFFLINE_ACCESS_REQUIRED',
        'Gmail did not grant offline access. Reconnect and approve mailbox access.',
      );
    }

    const timestamp = nowFrom(clock).toISOString();
    const grantedCapabilities = capabilitiesFromScopes(tokens.scope, true);
    if (!grantedCapabilities.read) {
      throw integrationError(
        502,
        'GMAIL_READ_ACCESS_REQUIRED',
        'Gmail did not grant mailbox read access. Reconnect and approve mailbox access.',
      );
    }
    runTransaction(db, () => {
      replaceConnectionGeneration({
        db,
        organizationId: admin.organizationId,
        provider: 'gmail',
        account: {
          mailboxAddress: accountEmail,
          providerAccountId,
          adminUserId: admin.userId,
          encryptedGrant: encryptedRefreshToken,
          grantKind: 'oauth',
          capabilities: grantedCapabilities,
        },
        now: new Date(timestamp),
      });
      if (admin.organizationId === 1) {
        db.prepare(`
          INSERT INTO gmail_connection
            (id, organization_id, account_email, encrypted_refresh_token, connected_at, updated_at)
          VALUES (1, 1, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            account_email = excluded.account_email,
            encrypted_refresh_token = excluded.encrypted_refresh_token,
            connected_at = excluded.connected_at,
            updated_at = excluded.updated_at
          WHERE gmail_connection.organization_id = 1
        `).run(accountEmail, encryptedRefreshToken, timestamp, timestamp);
      }
      clearSyncState(admin.organizationId);
    });
    invalidateCachedSource(admin.organizationId);
    return status({ organizationId: admin.organizationId });
  }

  function completeAuthorization(options) {
    return mutateConnection(() => completeAuthorizationNow(options));
  }

  async function disconnectNow({ organizationId = 1, adminUserId = null } = {}) {
    requireAdminIdentity(organizationId, adminUserId);
    disconnectingOrganizations.add(organizationId);
    invalidateCachedSource(organizationId);
    try {
      const connection = canonicalConnection(organizationId);
      let refreshToken = null;
      if (configured && connection) {
        try {
          refreshToken = decryptRefreshToken(connection.encryptedGrant, encryptionKey);
        } catch {
          // A damaged local token must not prevent removal of the connection.
        }
      }
      if (refreshToken) await revokeRefreshToken(refreshToken);
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
          DELETE FROM gmail_connection WHERE organization_id = ? AND id = 1
        `).run(organizationId);
        db.prepare(`
          DELETE FROM gmail_oauth_states
          WHERE organization_id = ? AND state_digest NOT LIKE 'outlook:%'
        `).run(organizationId);
        clearSyncState(organizationId);
      });
      return status({ organizationId });
    } finally {
      disconnectingOrganizations.delete(organizationId);
    }
  }

  function disconnect(options) {
    return mutateConnection(() => disconnectNow(options));
  }

  function sources({ organizationId = 1 } = {}) {
    if (!configured || disconnectingOrganizations.has(organizationId)) return [];
    const connection = canonicalConnection(organizationId);
    if (!connection) return [];
    const version = `${connection.id}:${connection.generation}:${connection.updatedAt}`;
    const cached = cachedSources.get(organizationId);
    if (cached?.version === version) return [cached.source];

    const refreshToken = decryptRefreshToken(connection.encryptedGrant, encryptionKey);
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
        && current.mailboxAddress === connection.mailboxAddress
      );
    };
    const source = new GmailMailSource({
      accountEmail: connection.mailboxAddress,
      clientId: settings.clientId,
      clientSecret: settings.clientSecret,
      refreshToken,
      fetchImpl,
      requestTimeoutMs,
      clock,
      delay,
      isCurrentConnection,
      capabilities: connection.capabilities,
      organizationId,
      connectionId: connection.id,
      mailboxIdentityId: connection.mailboxIdentityId,
      connectionGeneration: connection.generation,
    });
    cachedSources.set(organizationId, { version, source });
    return [source];
  }

  return {
    configured,
    authorizationAvailable: configured,
    disconnectAvailable: configured,
    status,
    authorizationUrl,
    completeAuthorization,
    disconnect,
    sources,
  };
}
