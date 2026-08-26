import { createHash, timingSafeEqual } from 'node:crypto';

const MAX_HEADER_CHARACTERS = 16_384;
const MAX_REFERENCES = 100;
const LEXFLOW_ID = /^lf-([a-f0-9]{32})@([a-z0-9](?:[a-z0-9.-]{0,252}[a-z0-9])?)$/iu;

function outcome(conversationId, reason) {
  return { conversationId, reason };
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function normalizedProvider(value) {
  const provider = String(value ?? '').trim().toLocaleLowerCase('en-US');
  return ['gmail', 'outlook'].includes(provider) ? provider : null;
}

function normalizedAddress(value) {
  const address = String(value ?? '').trim().toLocaleLowerCase('en-US');
  if (
    !address
    || address.length > 320
    || /[\u0000-\u0020\u007f<>]/u.test(address)
    || !/^[^@]+@[^@]+$/u.test(address)
  ) {
    return null;
  }
  return address;
}

function normalizedNativeId(value) {
  const nativeId = String(value ?? '').trim();
  if (
    !nativeId
    || nativeId.length > 2048
    || /[\u0000-\u001f\u007f]/u.test(nativeId)
  ) {
    return null;
  }
  return nativeId;
}

function canonicalLexFlowId(content) {
  const match = LEXFLOW_ID.exec(String(content ?? '').trim());
  return match
    ? `<lf-${match[1].toLocaleLowerCase('en-US')}@${match[2].toLocaleLowerCase('en-US')}>`
    : null;
}

function canonicalStoredMessageId(value) {
  const messageId = String(value ?? '').trim();
  if (!messageId.startsWith('<') || !messageId.endsWith('>')) return null;
  return canonicalLexFlowId(messageId.slice(1, -1));
}

function digest(value) {
  return createHash('sha256').update(value, 'utf8').digest();
}

function headerStrings(message) {
  const values = [];
  let malformed = false;
  function add(value) {
    if (value == null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach(add);
      return;
    }
    if (typeof value !== 'string') {
      malformed = true;
      return;
    }
    values.push(value);
  }
  add(message?.inReplyTo);
  add(message?.references);
  return { values, malformed };
}

function parseReferences(message) {
  const headers = headerStrings(message);
  if (headers.malformed) return { references: [], malformed: true };
  const combinedLength = headers.values.reduce((total, value) => total + value.length, 0);
  if (combinedLength > MAX_HEADER_CHARACTERS) {
    return { references: [], malformed: true };
  }

  const references = [];
  let malformed = false;
  for (const header of headers.values) {
    if (/<<|>>/u.test(header)) malformed = true;
    let remainder = header;
    for (const match of header.matchAll(/<([^<>]*)>/gu)) {
      const content = match[1].trim();
      if (/^lf-/iu.test(content)) {
        const canonical = canonicalLexFlowId(content);
        if (!canonical) malformed = true;
        else references.push({ canonical, digest: digest(canonical) });
      }
      remainder = remainder.replace(match[0], ' ');
    }
    if (/(?:^|[^a-z0-9])lf-/iu.test(remainder)) malformed = true;
  }
  if (references.length > MAX_REFERENCES) malformed = true;

  const unique = new Map();
  for (const reference of references) {
    unique.set(reference.digest.toString('hex'), reference);
  }
  return { references: [...unique.values()], malformed };
}

function senderAddress(message) {
  return normalizedAddress(
    message?.senderAddress
      ?? message?.sender?.address
      ?? message?.sender?.emailAddress?.address
      ?? message?.from?.address
      ?? message?.from?.emailAddress?.address,
  );
}

function attemptTable(db) {
  const rows = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name IN ('delivery_attempts', 'assignment_delivery_attempts')
    ORDER BY CASE name WHEN 'delivery_attempts' THEN 0 ELSE 1 END
  `).all();
  return rows[0]?.name ?? null;
}

function startedAttempt(db, table, deliveryId) {
  if (!table) return false;
  const sql = table === 'delivery_attempts'
    ? `SELECT 1 FROM delivery_attempts
       WHERE delivery_id = ? AND request_started_at IS NOT NULL LIMIT 1`
    : `SELECT 1 FROM assignment_delivery_attempts
       WHERE delivery_id = ? AND request_started_at IS NOT NULL LIMIT 1`;
  return Boolean(db.prepare(sql).get(deliveryId));
}

function scopedDeliveries(db, scope) {
  const attempts = attemptTable(db);
  return db.prepare(`
    SELECT assignment_deliveries.id,
           assignment_deliveries.conversation_id,
           assignment_deliveries.message_id,
           assignment_deliveries.status,
           assignment_deliveries.request_started_at,
           users.email AS recipient_email,
           users.registration_status AS recipient_status
    FROM assignment_deliveries
    JOIN users
      ON users.id = assignment_deliveries.recipient_id
     AND users.organization_id = assignment_deliveries.organization_id
    WHERE assignment_deliveries.organization_id = ?
      AND assignment_deliveries.mailbox_identity_id = ?
      AND lower(assignment_deliveries.provider) = ?
      AND lower(assignment_deliveries.mailbox_address) = ?
    ORDER BY assignment_deliveries.id
  `).all(
    scope.organizationId,
    scope.mailboxIdentityId,
    scope.provider,
    scope.mailboxAddress,
  ).flatMap(row => {
    const canonical = canonicalStoredMessageId(row.message_id);
    if (!canonical) return [];
    return [{
      id: Number(row.id),
      conversationId: Number(row.conversation_id),
      messageDigest: digest(canonical),
      recipientEmail: normalizedAddress(row.recipient_email),
      eligible: ['accepted', 'unknown'].includes(row.status)
        && Boolean(row.request_started_at)
        && row.recipient_status === 'active'
        && startedAttempt(db, attempts, Number(row.id)),
    }];
  });
}

function resolveReferences(references, deliveries) {
  const resolved = [];
  for (const reference of references) {
    const matches = [];
    for (const delivery of deliveries) {
      if (timingSafeEqual(reference.digest, delivery.messageDigest)) matches.push(delivery);
    }
    if (matches.length !== 1) return { deliveries: [], reason: 'unknown_delivery_reference' };
    resolved.push(matches[0]);
  }
  return { deliveries: resolved, reason: null };
}

function sourceAllowsConversation(db, scope, conversationId) {
  const mappings = db.prepare(`
    SELECT DISTINCT conversation_id
    FROM conversation_sources
    WHERE organization_id = ?
      AND mailbox_identity_id = ?
      AND lower(provider) = ?
      AND lower(normalized_mailbox) = ?
      AND native_conversation_id = ?
    ORDER BY conversation_id
  `).all(
    scope.organizationId,
    scope.mailboxIdentityId,
    scope.provider,
    scope.mailboxAddress,
    scope.nativeConversationId,
  ).map(row => Number(row.conversation_id));
  return mappings.length === 0
    || (mappings.length === 1 && mappings[0] === conversationId);
}

export function correlateInboundReplyDetailed({
  db,
  organizationId,
  mailboxIdentityId,
  provider,
  mailboxAddress,
  nativeConversationId,
  message,
} = {}) {
  if (!db) throw new TypeError('Reply correlation requires a database.');
  const scope = {
    organizationId: positiveInteger(organizationId),
    mailboxIdentityId: positiveInteger(mailboxIdentityId),
    provider: normalizedProvider(provider),
    mailboxAddress: normalizedAddress(mailboxAddress),
    nativeConversationId: normalizedNativeId(nativeConversationId),
  };
  if (Object.values(scope).some(value => value == null)) {
    return outcome(null, 'invalid_scope');
  }

  const parsed = parseReferences(message);
  if (parsed.malformed) return outcome(null, 'malformed_lexflow_reference');
  if (parsed.references.length === 0) return outcome(null, 'no_lexflow_reference');

  const resolution = resolveReferences(parsed.references, scopedDeliveries(db, scope));
  if (resolution.reason) return outcome(null, resolution.reason);
  const conversations = new Set(resolution.deliveries.map(delivery => delivery.conversationId));
  if (conversations.size !== 1) return outcome(null, 'multiple_conversations');
  if (resolution.deliveries.some(delivery => !delivery.eligible)) {
    return outcome(null, 'ineligible_delivery');
  }

  const sender = senderAddress(message);
  if (!sender || resolution.deliveries.some(delivery => delivery.recipientEmail !== sender)) {
    return outcome(null, 'sender_mismatch');
  }
  const conversationId = resolution.deliveries[0].conversationId;
  if (!sourceAllowsConversation(db, scope, conversationId)) {
    return outcome(null, 'source_conflict');
  }
  return outcome(conversationId, 'matched');
}

export function correlateInboundReply(input) {
  const result = correlateInboundReplyDetailed(input);
  return result.conversationId == null ? null : { conversationId: result.conversationId };
}
