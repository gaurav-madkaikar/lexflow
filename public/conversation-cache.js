function anchorKey(anchor) {
  const key = anchor?.conversation?.publicId
    ?? anchor?.conversationPublicId
    ?? anchor?.threadKey
    ?? (anchor?.id ? `email:${anchor.id}` : '');
  if (!key) throw new TypeError('A conversation cache anchor is required.');
  return String(key);
}

function anchorVersion(anchor) {
  const value = Number(anchor?.conversation?.version ?? anchor?.conversationVersion ?? 0);
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function createConversationCache({
  fetchConversation,
  now = () => Date.now(),
  ttlMs = 30_000,
} = {}) {
  if (typeof fetchConversation !== 'function') {
    throw new TypeError('A conversation fetch function is required.');
  }
  if (!Number.isFinite(ttlMs) || ttlMs < 0) {
    throw new RangeError('Conversation cache duration must be non-negative.');
  }

  const entries = new Map();
  const inflight = new Map();

  function entryFor(anchor) {
    const key = anchorKey(anchor);
    const version = anchorVersion(anchor);
    const entry = entries.get(key);
    if (!entry || entry.version !== version) return null;
    return entry;
  }

  function load(anchor, { force = false } = {}) {
    const key = anchorKey(anchor);
    const version = anchorVersion(anchor);
    const cached = entryFor(anchor);
    if (!force && cached && now() - cached.loadedAt < ttlMs) {
      return Promise.resolve(cached.value);
    }
    const pending = inflight.get(key);
    if (!force && pending?.version === version) return pending.promise;

    const promise = Promise.resolve()
      .then(() => fetchConversation(anchor))
      .then(value => {
        entries.set(key, { value, version, loadedAt: now() });
        return value;
      })
      .finally(() => {
        if (inflight.get(key)?.promise === promise) inflight.delete(key);
      });
    inflight.set(key, { promise, version });
    return promise;
  }

  function invalidateVersion(anchor) {
    const key = anchorKey(anchor);
    const version = anchorVersion(anchor);
    const entry = entries.get(key);
    if (entry && entry.version !== version) entries.delete(key);
  }

  function clear() {
    entries.clear();
    inflight.clear();
  }

  return Object.freeze({ load, entryFor, invalidateVersion, clear });
}

export const CONVERSATION_CACHE_TTL_MS = 30_000;
