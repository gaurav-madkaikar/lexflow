import { normalizeMessagePreview } from './message-preview.js';

const MESSAGE_LIMIT = 100;
const DEFAULT_TTL_MS = 30_000;
const MAX_CACHE_ENTRIES = 500;
const DELIVERY_MESSAGE_ID = /^<lf-[a-f0-9]{32}@[a-z0-9.-]+>$/iu;

export class ConversationHistoryError extends Error {
  constructor(message, { status = 500, code = 'conversation_history_error' } = {}) {
    super(message);
    this.name = 'ConversationHistoryError';
    this.status = status;
    this.code = code;
  }
}

function notFound() {
  return new ConversationHistoryError('Conversation not found.', {
    status: 404,
    code: 'conversation_not_found',
  });
}

function unavailable() {
  return new ConversationHistoryError('Conversation history is no longer available.', {
    status: 410,
    code: 'conversation_history_unavailable',
  });
}

function providerUnavailable() {
  return new ConversationHistoryError('Conversation history could not be loaded.', {
    status: 502,
    code: 'conversation_provider_unavailable',
  });
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function clockMilliseconds(clock) {
  const value = clock();
  const milliseconds = (value instanceof Date ? value : new Date(value)).getTime();
  if (!Number.isFinite(milliseconds)) throw new TypeError('History clock returned an invalid date.');
  return milliseconds;
}

function normalizedText(value, maxCharacters = 320) {
  return normalizeMessagePreview(value, maxCharacters).preview;
}

function normalizedMailbox(value) {
  return normalizedText(value, 320).toLocaleLowerCase('en-US');
}

function normalizedMessageId(value) {
  return String(value ?? '')
    .split(/\r\n|\r|\n/, 1)[0]
    .trim()
    .toLocaleLowerCase('en-US');
}

function safeWebUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function capabilitiesInclude(connection, capability) {
  const capabilities = connection?.capabilities;
  if (capabilities instanceof Set) return capabilities.has(capability);
  if (Array.isArray(capabilities)) return capabilities.includes(capability);
  return capabilities?.[capability] === true;
}

function connectionValue(connection, camelCase, snakeCase) {
  return connection?.[camelCase] ?? connection?.[snakeCase] ?? null;
}

function connectionSnapshot(connection) {
  if (!connection) return null;
  return {
    id: positiveInteger(connectionValue(connection, 'id', 'id')),
    organizationId: positiveInteger(connectionValue(
      connection, 'organizationId', 'organization_id',
    )),
    mailboxIdentityId: positiveInteger(connectionValue(
      connection, 'mailboxIdentityId', 'mailbox_identity_id',
    )),
    provider: String(connectionValue(connection, 'provider', 'provider') ?? '')
      .toLocaleLowerCase('en-US'),
    mailboxAddress: normalizedMailbox(connectionValue(
      connection, 'mailboxAddress', 'normalized_mailbox',
    )),
    generation: positiveInteger(connectionValue(connection, 'generation', 'generation')),
    active: connectionValue(connection, 'active', 'is_active') === true
      || Number(connectionValue(connection, 'active', 'is_active')) === 1,
    readCapable: capabilitiesInclude(connection, 'read'),
  };
}

function authorizedAnchor(db, emailId, userId) {
  const row = db.prepare(`
    SELECT emails.id AS email_id,
           emails.organization_id,
           emails.conversation_id,
           conversations.current_assignee_id,
           conversations.subject,
           conversations.version,
           users.id AS user_id,
           users.role
    FROM emails
    JOIN conversations
      ON conversations.id = emails.conversation_id
     AND conversations.organization_id = emails.organization_id
    JOIN users
      ON users.id = ?
     AND users.organization_id = emails.organization_id
     AND users.registration_status = 'active'
    WHERE emails.id = ?
      AND (
        users.role = 'admin'
        OR (
          users.role IN ('member', 'user')
          AND conversations.current_assignee_id = users.id
        )
      )
  `).get(userId, emailId);
  if (!row) throw notFound();
  return {
    emailId: Number(row.email_id),
    organizationId: Number(row.organization_id),
    conversationId: Number(row.conversation_id),
    currentAssigneeId: row.current_assignee_id == null
      ? null
      : Number(row.current_assignee_id),
    subject: row.subject,
    version: Number(row.version),
    userId: Number(row.user_id),
    role: row.role,
  };
}

function nativeSources(db, anchor, resolveMailboxConnection) {
  const rows = db.prepare(`
    SELECT id, organization_id, conversation_id, mailbox_identity_id,
           last_resolved_connection_id, provider, normalized_mailbox,
           native_conversation_id
    FROM conversation_sources
    WHERE organization_id = ? AND conversation_id = ?
      AND native_conversation_id IS NOT NULL
      AND native_conversation_id <> ''
    ORDER BY id
  `).all(anchor.organizationId, anchor.conversationId);
  if (rows.length === 0) throw unavailable();

  return rows.map(row => {
    const source = {
      id: Number(row.id),
      organizationId: Number(row.organization_id),
      conversationId: Number(row.conversation_id),
      mailboxIdentityId: positiveInteger(row.mailbox_identity_id),
      lastResolvedConnectionId: positiveInteger(row.last_resolved_connection_id),
      provider: String(row.provider).toLocaleLowerCase('en-US'),
      mailboxAddress: normalizedMailbox(row.normalized_mailbox),
      nativeConversationId: String(row.native_conversation_id),
    };
    if (!source.mailboxIdentityId || !['gmail', 'outlook'].includes(source.provider)) {
      throw unavailable();
    }
    let resolved;
    try {
      resolved = resolveMailboxConnection({
        db,
        organizationId: anchor.organizationId,
        mailboxIdentityId: source.mailboxIdentityId,
      });
    } catch {
      throw unavailable();
    }
    if (resolved && typeof resolved.then === 'function') {
      throw new TypeError('Mailbox connection resolution must be synchronous.');
    }
    const connection = connectionSnapshot(resolved);
    if (
      !connection?.id
      || !connection.active
      || !connection.readCapable
      || connection.organizationId !== anchor.organizationId
      || connection.mailboxIdentityId !== source.mailboxIdentityId
      || connection.provider !== source.provider
      || connection.mailboxAddress !== source.mailboxAddress
    ) {
      throw unavailable();
    }
    return { ...source, connection, resolvedConnection: resolved };
  });
}

function deliveryMessageIds(db, anchor) {
  return db.prepare(`
    SELECT message_id FROM assignment_deliveries
    WHERE organization_id = ? AND conversation_id = ?
    ORDER BY id
  `).all(anchor.organizationId, anchor.conversationId)
    .map(row => normalizedMessageId(row.message_id))
    .filter(Boolean);
}

function snapshotSignature(snapshot) {
  return JSON.stringify({
    organizationId: snapshot.organizationId,
    conversationId: snapshot.conversationId,
    currentAssigneeId: snapshot.currentAssigneeId,
    version: snapshot.version,
    userId: snapshot.userId,
    role: snapshot.role,
    sources: snapshot.sources.map(source => ({
      id: source.id,
      mailboxIdentityId: source.mailboxIdentityId,
      provider: source.provider,
      mailboxAddress: source.mailboxAddress,
      nativeConversationId: source.nativeConversationId,
      connectionId: source.connection.id,
      generation: source.connection.generation,
    })),
  });
}

function loadAuthorizedSnapshot({ db, emailId, userId, resolveMailboxConnection }) {
  const anchor = authorizedAnchor(db, emailId, userId);
  const sources = nativeSources(db, anchor, resolveMailboxConnection);
  const snapshot = {
    ...anchor,
    sources,
    deliveryMessageIds: deliveryMessageIds(db, anchor),
  };
  snapshot.signature = snapshotSignature(snapshot);
  return snapshot;
}

function sourceCacheKey(snapshot, source) {
  return JSON.stringify([
    snapshot.organizationId,
    source.mailboxIdentityId,
    source.connection.id,
    source.connection.generation,
    source.provider,
    source.mailboxAddress,
    source.nativeConversationId,
  ]);
}

function messageIdentity(message) {
  return normalizedText(
    message?.providerMessageId ?? message?.id ?? message?.internetMessageId,
    1024,
  );
}

function normalizeProviderMessages(result, source, excludedMessageIds) {
  if (!result || !Array.isArray(result.messages)) throw providerUnavailable();
  const knownDigests = new Set(excludedMessageIds.map(normalizedMessageId));
  const messages = [];
  for (const message of result.messages) {
    const direction = String(message?.direction ?? '').toLocaleLowerCase('en-US');
    const id = messageIdentity(message);
    const internetMessageId = normalizedMessageId(message?.internetMessageId);
    const occurred = new Date(message?.occurredAt);
    if (
      !id
      || !['received', 'sent'].includes(direction)
      || !Number.isFinite(occurred.getTime())
      || knownDigests.has(internetMessageId)
      || DELIVERY_MESSAGE_ID.test(internetMessageId)
    ) {
      continue;
    }
    const normalizedPreview = normalizeMessagePreview(message.preview);
    messages.push({
      id,
      dedupeKey: JSON.stringify([
        source.organizationId,
        source.mailboxIdentityId,
        source.provider,
        id,
      ]),
      direction,
      sender: {
        name: normalizedText(message.sender?.name ?? message.senderName ?? 'Unknown sender', 160),
        address: normalizedText(message.sender?.address ?? message.senderAddress ?? '', 320),
      },
      occurredAt: occurred.toISOString(),
      preview: normalizedPreview.preview,
      previewTruncated: normalizedPreview.truncated,
      webUrl: safeWebUrl(message.webUrl),
      provider: source.provider,
      mailboxAddress: source.mailboxAddress,
    });
  }
  messages.sort((left, right) => (
    left.occurredAt.localeCompare(right.occurredAt)
    || left.dedupeKey.localeCompare(right.dedupeKey)
  ));
  const truncated = Boolean(result.truncated) || messages.length > MESSAGE_LIMIT;
  return {
    messages: messages.slice(-MESSAGE_LIMIT),
    truncated,
  };
}

function mergeHistories(histories) {
  const byIdentity = new Map();
  let truncated = false;
  for (const history of histories) {
    truncated ||= history.truncated;
    for (const message of history.messages) {
      const previous = byIdentity.get(message.dedupeKey);
      if (!previous || (
        message.occurredAt.localeCompare(previous.occurredAt) > 0
        || (
          message.occurredAt === previous.occurredAt
          && message.id.localeCompare(previous.id) > 0
        )
      )) {
        byIdentity.set(message.dedupeKey, message);
      }
    }
  }
  const messages = [...byIdentity.values()].sort((left, right) => (
    left.occurredAt.localeCompare(right.occurredAt)
    || left.dedupeKey.localeCompare(right.dedupeKey)
  ));
  truncated ||= messages.length > MESSAGE_LIMIT;
  return { messages: messages.slice(-MESSAGE_LIMIT), truncated };
}

function projectConversation(snapshot, merged) {
  const primary = snapshot.sources[0];
  const admin = snapshot.role === 'admin';
  const messages = merged.messages.map(({ dedupeKey: _dedupeKey, ...message }) => ({
    ...message,
    sender: { ...message.sender },
    webUrl: admin ? message.webUrl : null,
  }));
  return {
    conversation: {
      id: snapshot.conversationId,
      version: snapshot.version,
      subject: normalizedText(snapshot.subject),
      provider: primary.provider,
      mailboxAddress: primary.mailboxAddress,
      messageCount: messages.length,
      truncated: merged.truncated,
      messages,
    },
  };
}

export function createConversationHistoryService({
  db,
  resolveMailboxConnection,
  loadProvider,
  clock = () => new Date(),
  ttlMs = DEFAULT_TTL_MS,
} = {}) {
  if (!db) throw new TypeError('Conversation history requires a database.');
  if (typeof resolveMailboxConnection !== 'function') {
    throw new TypeError('Conversation history requires a mailbox connection resolver.');
  }
  if (typeof loadProvider !== 'function') {
    throw new TypeError('Conversation history requires a provider loader.');
  }
  if (!Number.isInteger(ttlMs) || ttlMs < 1) {
    throw new RangeError('Conversation history cache TTL must be a positive integer.');
  }

  const cache = new Map();
  const inflight = new Map();
  const revisions = new Map();

  function revision(conversationId) {
    return revisions.get(conversationId) ?? 0;
  }

  async function loadSource(snapshot, source) {
    const key = sourceCacheKey(snapshot, source);
    const now = clockMilliseconds(clock);
    for (const [cachedKey, entry] of cache) {
      if (entry.expiresAt <= now) cache.delete(cachedKey);
    }
    const cached = cache.get(key);
    if (
      cached
      && cached.expiresAt > now
      && cached.version === snapshot.version
    ) {
      cache.delete(key);
      cache.set(key, cached);
      return cached.value;
    }
    if (cached) cache.delete(key);

    const currentRevision = revision(snapshot.conversationId);
    const existing = inflight.get(key);
    if (
      existing
      && existing.revision === currentRevision
      && existing.version === snapshot.version
    ) {
      return existing.promise;
    }

    const promise = Promise.resolve()
      .then(() => loadProvider({
        organizationId: snapshot.organizationId,
        connection: source.resolvedConnection,
        connectionSnapshot: source.connection,
        source,
      }))
      .then(provider => {
        if (!provider || typeof provider.fetchConversation !== 'function') {
          throw providerUnavailable();
        }
        return provider.fetchConversation({
          nativeConversationId: source.nativeConversationId,
          deliveryMessageIds: snapshot.deliveryMessageIds,
          signal: undefined,
        });
      })
      .then(result => normalizeProviderMessages(
        result,
        source,
        snapshot.deliveryMessageIds,
      ))
      .catch(error => {
        if (error instanceof ConversationHistoryError) throw error;
        throw providerUnavailable();
      })
      .then(value => {
        if (revision(snapshot.conversationId) === currentRevision) {
          const latestCached = cache.get(key);
          if (latestCached && latestCached.version > snapshot.version) return value;
          if (!latestCached && cache.size >= MAX_CACHE_ENTRIES) {
            cache.delete(cache.keys().next().value);
          }
          cache.set(key, {
            value,
            expiresAt: clockMilliseconds(clock) + ttlMs,
            conversationId: snapshot.conversationId,
            version: snapshot.version,
          });
        }
        return value;
      })
      .finally(() => {
        if (inflight.get(key)?.promise === promise) inflight.delete(key);
      });
    inflight.set(key, {
      promise,
      conversationId: snapshot.conversationId,
      revision: currentRevision,
      version: snapshot.version,
    });
    return promise;
  }

  async function getForEmail({ emailId, userId, user } = {}) {
    const anchorEmailId = positiveInteger(emailId);
    const authenticatedUserId = positiveInteger(userId ?? user?.id);
    if (!anchorEmailId || !authenticatedUserId) throw notFound();
    const before = loadAuthorizedSnapshot({
      db,
      emailId: anchorEmailId,
      userId: authenticatedUserId,
      resolveMailboxConnection,
    });
    const beforeRevision = revision(before.conversationId);
    const histories = await Promise.all(before.sources.map(source => loadSource(before, source)));
    const after = loadAuthorizedSnapshot({
      db,
      emailId: anchorEmailId,
      userId: authenticatedUserId,
      resolveMailboxConnection,
    });
    if (
      after.signature !== before.signature
      || revision(before.conversationId) !== beforeRevision
    ) {
      throw unavailable();
    }
    return projectConversation(after, mergeHistories(histories));
  }

  function invalidateConversation(conversationId, version = null) {
    const id = positiveInteger(conversationId);
    if (!id) throw new TypeError('Conversation ID must be a positive integer.');
    if (version !== null && (!Number.isSafeInteger(Number(version)) || Number(version) < 1)) {
      throw new TypeError('Conversation version must be a positive integer.');
    }
    revisions.set(id, revision(id) + 1);
    let invalidated = 0;
    for (const [key, entry] of cache) {
      if (entry.conversationId === id) {
        cache.delete(key);
        invalidated += 1;
      }
    }
    for (const [key, entry] of inflight) {
      if (entry.conversationId === id) inflight.delete(key);
    }
    return { invalidated, version: version === null ? null : Number(version) };
  }

  return { getForEmail, invalidateConversation };
}

export const CONVERSATION_HISTORY_DEFAULTS = Object.freeze({
  cacheTtlMs: DEFAULT_TTL_MS,
  maxCacheEntries: MAX_CACHE_ENTRIES,
  messageLimit: MESSAGE_LIMIT,
});
