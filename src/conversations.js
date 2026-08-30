const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function normalizeFallbackSubject(subject) {
  return String(subject || '(No subject)')
    .replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

export function conversationIdentity(message, context) {
  const nativeConversationId = String(message.conversationId ?? '').trim() || null;
  if (nativeConversationId) return { nativeConversationId, fallbackKey: null };

  const receivedAt = Date.parse(context.receivedAt ?? message.receivedAt);
  if (!Number.isFinite(receivedAt)) throw new TypeError('A valid received timestamp is required.');
  const sender = String(message.senderAddress ?? '').trim().toLocaleLowerCase();
  const bucket = Math.floor(receivedAt / THIRTY_DAYS_MS);
  return {
    nativeConversationId: null,
    fallbackKey: `${normalizeFallbackSubject(message.subject)}|${sender}|${bucket}`,
  };
}

function normalizedMailbox(value) {
  return String(value ?? '').trim().toLocaleLowerCase();
}

function resolveConversation(db, email) {
  const nativeConversationId = String(email.provider_conversation_id ?? '').trim() || null;
  const fallbackKey = nativeConversationId ? null : conversationIdentity({
    subject: email.subject,
    senderAddress: email.sender_address,
    receivedAt: email.received_at,
  }, { receivedAt: email.received_at }).fallbackKey;
  const mailbox = normalizedMailbox(email.mailbox_address);
  const identityClause = nativeConversationId
    ? 'native_conversation_id = ?'
    : 'fallback_key = ?';
  const identityValue = nativeConversationId ?? fallbackKey;
  let conversation = db.prepare(`
    SELECT * FROM conversations
    WHERE organization_id = ? AND department_id IS ? AND provider = ?
      AND normalized_mailbox = ? AND ${identityClause}
  `).get(email.organization_id, email.department_id, email.provider, mailbox, identityValue);
  if (conversation) return conversation;

  const now = email.created_at || new Date().toISOString();
  const hasLegacyPublicId = db.prepare("SELECT 1 FROM pragma_table_info('conversations') WHERE name = 'public_id'").get();
  const columns = hasLegacyPublicId ? 'public_id, ' : '';
  const placeholders = hasLegacyPublicId ? '?, ' : '';
  const values = hasLegacyPublicId ? [`conversation-${randomUUID()}`] : [];
  const insertion = db.prepare(`
    INSERT INTO conversations
      (${columns}organization_id, department_id, provider, normalized_mailbox,
       native_conversation_id, fallback_key, subject, status, assignee_id,
       first_received_at, latest_received_at, latest_email_id, message_count,
       completed_at, version, created_at, updated_at)
    VALUES (${placeholders}?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?, ?)
  `).run(
    ...values, email.organization_id, email.department_id, email.provider, mailbox,
    nativeConversationId, fallbackKey, email.subject, email.status, email.assignee_id,
    email.received_at, email.received_at, email.id, email.completed_at, now, now,
  );
  return db.prepare('SELECT * FROM conversations WHERE id = ?').get(Number(insertion.lastInsertRowid));
}

export function backfillConversations(db) {
  const emails = db.prepare('SELECT * FROM emails ORDER BY received_at, id').all();
  const link = db.prepare('UPDATE emails SET conversation_id = ? WHERE id = ? AND conversation_id IS NULL');
  const refresh = db.prepare(`
    UPDATE conversations
    SET first_received_at = MIN(first_received_at, ?),
        latest_received_at = CASE WHEN latest_received_at <= ? THEN ? ELSE latest_received_at END,
        latest_email_id = CASE WHEN latest_received_at <= ? THEN ? ELSE latest_email_id END,
        message_count = (SELECT COUNT(*) FROM emails WHERE conversation_id = conversations.id),
        updated_at = MAX(updated_at, ?)
    WHERE id = ?
  `);
  for (const email of emails) {
    if (email.conversation_id != null) continue;
    const conversation = resolveConversation(db, email);
    link.run(conversation.id, email.id);
    refresh.run(
      email.received_at, email.received_at, email.received_at,
      email.received_at, email.id, email.created_at, conversation.id,
    );
  }
}
import { randomUUID } from 'node:crypto';
