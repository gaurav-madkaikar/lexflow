import { randomBytes } from 'node:crypto';

import {
  assignmentMessageId,
  buildAssignmentDigest,
  createDigestToken,
} from './assignment-digest.js';
import {
  DeliverySendError,
  normalizeDeliverySender,
  sanitizeDeliveryError,
} from './delivery-senders.js';

export const DELIVERY_STATUSES = Object.freeze([
  'blocked',
  'pending',
  'leased',
  'accepted',
  'failed',
  'unknown',
  'cancelled',
]);

const DEFAULT_LEASE_MS = 2 * 60 * 1000;
const DEFAULT_SEND_TIMEOUT_MS = 30 * 1000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BATCH_SIZE = 25;

export class DeliveryStateError extends Error {
  constructor(message, code = 'invalid_delivery_state') {
    super(message);
    this.name = 'DeliveryStateError';
    this.code = code;
  }
}

function positiveInteger(value, name) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new TypeError(`${name} must be a positive integer.`);
  }
  return number;
}

function instant(value, name = 'Date') {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError(`${name} must be valid.`);
  return date;
}

function iso(value, name) {
  return instant(value, name).toISOString();
}

function nullableText(value) {
  const normalized = String(value ?? '').replace(/\r\n|\r|\n/g, ' ').trim();
  return normalized || null;
}

function transaction(db, operation) {
  const ownsTransaction = !db.isTransaction;
  if (ownsTransaction) db.exec('BEGIN IMMEDIATE');
  try {
    const result = operation();
    if (ownsTransaction) db.exec('COMMIT');
    return result;
  } catch (error) {
    if (ownsTransaction && db.isTransaction) db.exec('ROLLBACK');
    throw error;
  }
}

function deliveryById(db, deliveryId) {
  return db.prepare('SELECT * FROM assignment_deliveries WHERE id = ?')
    .get(positiveInteger(deliveryId, 'Delivery ID')) ?? null;
}

function publicDelivery(row) {
  if (!row) return null;
  return {
    ...row,
    blockReason: row.block_reason ?? null,
  };
}

function synchronousContext(resolver, input) {
  if (typeof resolver !== 'function') {
    throw new TypeError('A synchronous current-delivery context resolver is required.');
  }
  const context = resolver(input);
  if (context && typeof context.then === 'function') {
    throw new TypeError('The current-delivery context resolver must not perform asynchronous I/O.');
  }
  return context ?? {};
}

function contextBlockReason(context) {
  if (context.blockReason) return String(context.blockReason);
  if (
    !context.mailboxIdentityId
    || !context.connectionId
    || !context.connectionGeneration
    || context.connectionActive === false
  ) {
    return 'mailbox_connection_unavailable';
  }
  if (!nullableText(context.provider) || !nullableText(context.mailboxAddress)) {
    return 'mailbox_connection_unavailable';
  }
  if (!nullableText(context.nativeConversationId)) return 'native_source_unavailable';
  if (context.sendCapable !== true && context.capabilities?.send !== true) {
    return 'send_permission_required';
  }
  return null;
}

function contextSnapshot(context) {
  return {
    mailboxIdentityId: context.mailboxIdentityId == null
      ? null
      : positiveInteger(context.mailboxIdentityId, 'Mailbox identity ID'),
    connectionId: context.connectionId == null
      ? null
      : positiveInteger(context.connectionId, 'Connection ID'),
    connectionGeneration: context.connectionGeneration == null
      ? null
      : positiveInteger(context.connectionGeneration, 'Connection generation'),
    provider: nullableText(context.provider)?.toLocaleLowerCase('en-US') ?? null,
    mailboxAddress: nullableText(context.mailboxAddress)?.toLocaleLowerCase('en-US') ?? null,
    nativeConversationId: nullableText(context.nativeConversationId),
  };
}

function validateCurrentContext(delivery, context, preparedContext = null) {
  if (Number(context.currentAssigneeId) !== Number(delivery.recipient_id)) {
    return { status: 'cancelled', reason: 'recipient_changed' };
  }
  const blocked = contextBlockReason(context);
  if (blocked) return { status: 'blocked', reason: blocked };
  if (Number(context.connectionId) !== Number(delivery.connection_id)) {
    return { status: 'blocked', reason: 'mailbox_connection_changed' };
  }
  if (Number(context.mailboxIdentityId) !== Number(delivery.mailbox_identity_id)) {
    return { status: 'blocked', reason: 'mailbox_identity_changed' };
  }
  if (Number(context.connectionGeneration) !== Number(delivery.connection_generation)) {
    return { status: 'blocked', reason: 'stale_connection_generation' };
  }
  if (nullableText(context.nativeConversationId) !== delivery.native_conversation_id) {
    return { status: 'blocked', reason: 'native_source_changed' };
  }
  if (nullableText(context.provider)?.toLocaleLowerCase('en-US') !== delivery.provider) {
    return { status: 'blocked', reason: 'mailbox_provider_changed' };
  }
  if (nullableText(context.mailboxAddress)?.toLocaleLowerCase('en-US') !== delivery.mailbox_address) {
    return { status: 'blocked', reason: 'mailbox_address_changed' };
  }
  if (preparedContext && (
    nullableText(preparedContext.recipientEmail)?.toLocaleLowerCase('en-US')
      !== nullableText(context.recipientEmail)?.toLocaleLowerCase('en-US')
  )) {
    return { status: 'blocked', reason: 'recipient_address_changed' };
  }
  return { status: 'ready', reason: null };
}

/**
 * Creates only delivery-owned tables. Canonical integration supplies organization,
 * conversation, recipient, and mailbox-connection validation through explicit IDs
 * and the synchronous context resolver used by the runner.
 */
export function migrateDeliverySchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS assignment_deliveries (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      conversation_id INTEGER NOT NULL,
      recipient_id INTEGER NOT NULL,
      mailbox_identity_id INTEGER,
      connection_id INTEGER,
      connection_generation INTEGER,
      provider TEXT,
      mailbox_address TEXT,
      native_conversation_id TEXT,
      digest_token TEXT NOT NULL UNIQUE,
      message_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK (
        status IN ('blocked', 'pending', 'leased', 'accepted', 'failed', 'unknown', 'cancelled')
      ),
      block_reason TEXT,
      attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
      next_attempt_at TEXT,
      lease_token TEXT,
      lease_expires_at TEXT,
      request_started_at TEXT,
      accepted_at TEXT,
      cancelled_at TEXT,
      provider_message_id TEXT,
      last_error_code TEXT,
      last_error_summary TEXT,
      last_reconciled_at TEXT,
      duplicate_risk_confirmed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (organization_id, conversation_id, recipient_id),
      FOREIGN KEY (organization_id)
        REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (organization_id, conversation_id)
        REFERENCES conversations(organization_id, id) ON DELETE CASCADE,
      FOREIGN KEY (organization_id, recipient_id)
        REFERENCES users(organization_id, id),
      FOREIGN KEY (organization_id, mailbox_identity_id)
        REFERENCES mailbox_identities(organization_id, id),
      FOREIGN KEY (organization_id, connection_id, mailbox_identity_id)
        REFERENCES mailbox_connections(organization_id, id, mailbox_identity_id)
    );
    CREATE INDEX IF NOT EXISTS assignment_deliveries_pending_idx
      ON assignment_deliveries (status, next_attempt_at, created_at, id);
    CREATE INDEX IF NOT EXISTS assignment_deliveries_conversation_idx
      ON assignment_deliveries (organization_id, conversation_id, recipient_id);

    CREATE TABLE IF NOT EXISTS assignment_delivery_attempts (
      id INTEGER PRIMARY KEY,
      delivery_id INTEGER NOT NULL REFERENCES assignment_deliveries(id) ON DELETE CASCADE,
      attempt_number INTEGER NOT NULL CHECK (attempt_number >= 1),
      lease_token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK (
        status IN ('leased', 'started', 'accepted', 'failed', 'unknown', 'cancelled', 'recovered')
      ),
      request_started_at TEXT,
      finished_at TEXT,
      provider_message_id TEXT,
      error_code TEXT,
      error_summary TEXT,
      created_at TEXT NOT NULL,
      UNIQUE (delivery_id, attempt_number)
    );
    CREATE INDEX IF NOT EXISTS assignment_delivery_attempts_delivery_idx
      ON assignment_delivery_attempts (delivery_id, attempt_number DESC);
  `);
}

/**
 * Must be called inside the canonical assignment transaction. It performs database
 * work only. `context` is the active source snapshot resolved by canonical workflow:
 * connectionId/generation, provider, mailboxAddress, nativeConversationId, and
 * sendCapable. Provider adapters are intentionally not accepted here.
 */
export function ensureAssignmentDelivery({
  db,
  organizationId,
  conversationId,
  recipientId,
  trustedAppOrigin,
  now = new Date(),
  context,
  resolveDeliveryContext,
  tokenFactory = createDigestToken,
}) {
  const organization = positiveInteger(organizationId, 'Organization ID');
  const conversation = positiveInteger(conversationId, 'Conversation ID');
  const recipient = positiveInteger(recipientId, 'Recipient ID');
  const createdAt = iso(now, 'Delivery creation date');
  const resolved = context ?? synchronousContext(resolveDeliveryContext, {
    db, organizationId: organization, conversationId: conversation, recipientId: recipient,
  });
  const blockReason = contextBlockReason(resolved);
  const snapshot = contextSnapshot(resolved);
  const existing = db.prepare(`
    SELECT * FROM assignment_deliveries
    WHERE organization_id = ? AND conversation_id = ? AND recipient_id = ?
  `).get(organization, conversation, recipient);

  if (existing) {
    if (['blocked', 'pending'].includes(existing.status)) {
      const expectedMessageId = assignmentMessageId({
        digestToken: existing.digest_token,
        trustedAppOrigin,
      });
      if (!blockReason) {
        db.prepare(`
          UPDATE assignment_deliveries
          SET mailbox_identity_id = ?, connection_id = ?, connection_generation = ?, provider = ?,
              mailbox_address = ?, native_conversation_id = ?, message_id = ?, status = 'pending',
              block_reason = NULL, next_attempt_at = ?, last_error_code = NULL,
              last_error_summary = NULL, updated_at = ?
          WHERE id = ? AND status IN ('blocked', 'pending')
        `).run(
          snapshot.mailboxIdentityId,
          snapshot.connectionId,
          snapshot.connectionGeneration,
          snapshot.provider,
          snapshot.mailboxAddress,
          snapshot.nativeConversationId,
          expectedMessageId,
          existing.next_attempt_at ?? createdAt,
          createdAt,
          existing.id,
        );
      } else {
        db.prepare(`
          UPDATE assignment_deliveries
          SET mailbox_identity_id = ?, connection_id = ?, connection_generation = ?, provider = ?,
              mailbox_address = ?, native_conversation_id = ?, message_id = ?,
              status = 'blocked', block_reason = ?, next_attempt_at = NULL, updated_at = ?
          WHERE id = ? AND status IN ('blocked', 'pending')
        `).run(
          snapshot.mailboxIdentityId,
          snapshot.connectionId,
          snapshot.connectionGeneration,
          snapshot.provider,
          snapshot.mailboxAddress,
          snapshot.nativeConversationId,
          expectedMessageId,
          blockReason,
          createdAt,
          existing.id,
        );
      }
      return publicDelivery(deliveryById(db, existing.id));
    }
    return publicDelivery(existing);
  }

  const digestToken = tokenFactory();
  const messageId = assignmentMessageId({ digestToken, trustedAppOrigin });
  db.prepare(`
    INSERT OR IGNORE INTO assignment_deliveries (
      organization_id, conversation_id, recipient_id,
      mailbox_identity_id, connection_id, connection_generation, provider, mailbox_address,
      native_conversation_id, digest_token, message_id, status, block_reason,
      next_attempt_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    organization,
    conversation,
    recipient,
    snapshot.mailboxIdentityId,
    snapshot.connectionId,
    snapshot.connectionGeneration,
    snapshot.provider,
    snapshot.mailboxAddress,
    snapshot.nativeConversationId,
    digestToken,
    messageId,
    blockReason ? 'blocked' : 'pending',
    blockReason,
    blockReason ? null : createdAt,
    createdAt,
    createdAt,
  );
  return publicDelivery(db.prepare(`
    SELECT * FROM assignment_deliveries
    WHERE organization_id = ? AND conversation_id = ? AND recipient_id = ?
  `).get(organization, conversation, recipient));
}

export function refreshBlockedDeliveries({
  db,
  organizationId = null,
  trustedAppOrigin,
  resolveDeliveryContext,
  now = new Date(),
} = {}) {
  if (!db) throw new TypeError('A database is required.');
  if (typeof resolveDeliveryContext !== 'function') {
    throw new TypeError('A synchronous delivery context resolver is required.');
  }
  const organization = organizationId == null
    ? null
    : positiveInteger(organizationId, 'Organization ID');
  return transaction(db, () => {
    const rows = organization == null
      ? db.prepare(`
          SELECT assignment_deliveries.*
          FROM assignment_deliveries
          JOIN conversations
            ON conversations.organization_id = assignment_deliveries.organization_id
           AND conversations.id = assignment_deliveries.conversation_id
           AND conversations.current_assignee_id = assignment_deliveries.recipient_id
          WHERE assignment_deliveries.status IN ('blocked', 'pending')
          ORDER BY assignment_deliveries.id
        `).all()
      : db.prepare(`
          SELECT assignment_deliveries.*
          FROM assignment_deliveries
          JOIN conversations
            ON conversations.organization_id = assignment_deliveries.organization_id
           AND conversations.id = assignment_deliveries.conversation_id
           AND conversations.current_assignee_id = assignment_deliveries.recipient_id
          WHERE assignment_deliveries.status IN ('blocked', 'pending')
            AND assignment_deliveries.organization_id = ?
          ORDER BY assignment_deliveries.id
        `).all(organization);
    let promoted = 0;
    for (const delivery of rows) {
      const refreshed = ensureAssignmentDelivery({
        db,
        organizationId: Number(delivery.organization_id),
        conversationId: Number(delivery.conversation_id),
        recipientId: Number(delivery.recipient_id),
        trustedAppOrigin,
        now,
        context: synchronousContext(resolveDeliveryContext, { db, delivery }),
      });
      if (delivery.status === 'blocked' && refreshed?.status === 'pending') promoted += 1;
    }
    return { checked: rows.length, promoted };
  });
}

/** Transaction-neutral so canonical reassignment can cancel in the same commit. */
export function cancelFormerRecipientDeliveries({
  db,
  organizationId,
  conversationId,
  currentRecipientId,
  now = new Date(),
}) {
  const organization = positiveInteger(organizationId, 'Organization ID');
  const conversation = positiveInteger(conversationId, 'Conversation ID');
  const recipient = positiveInteger(currentRecipientId, 'Current recipient ID');
  const cancelledAt = iso(now, 'Cancellation date');
  const cancellableLeases = db.prepare(`
    SELECT id, lease_token FROM assignment_deliveries
    WHERE organization_id = ? AND conversation_id = ? AND recipient_id <> ?
      AND status = 'leased' AND request_started_at IS NULL
  `).all(organization, conversation, recipient);
  const result = db.prepare(`
    UPDATE assignment_deliveries
    SET status = 'cancelled', block_reason = 'recipient_changed',
        cancelled_at = ?, lease_token = NULL, lease_expires_at = NULL,
        next_attempt_at = NULL, updated_at = ?
    WHERE organization_id = ? AND conversation_id = ? AND recipient_id <> ?
      AND (
        status IN ('blocked', 'pending', 'failed')
        OR (status = 'leased' AND request_started_at IS NULL)
      )
  `).run(cancelledAt, cancelledAt, organization, conversation, recipient);
  const cancelAttempt = db.prepare(`
    UPDATE assignment_delivery_attempts
    SET status = 'cancelled', finished_at = ?, error_code = 'recipient_changed',
        error_summary = 'The conversation was reassigned before delivery started.'
    WHERE delivery_id = ? AND lease_token = ? AND status = 'leased'
  `);
  cancellableLeases.forEach(lease => {
    cancelAttempt.run(cancelledAt, lease.id, lease.lease_token);
  });
  return { cancelled: Number(result.changes) };
}

export function claimPendingDelivery({
  db,
  deliveryId = null,
  now = new Date(),
  leaseMs = DEFAULT_LEASE_MS,
  leaseTokenFactory = () => randomBytes(16).toString('hex'),
}) {
  const claimedAt = instant(now, 'Claim date');
  if (!Number.isInteger(leaseMs) || leaseMs < 1) {
    throw new RangeError('Lease duration must be a positive integer.');
  }
  const requestedId = deliveryId == null ? null : positiveInteger(deliveryId, 'Delivery ID');
  return transaction(db, () => {
    const candidate = requestedId == null
      ? db.prepare(`
          SELECT id FROM assignment_deliveries
          WHERE status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
          ORDER BY coalesce(next_attempt_at, created_at), created_at, id
          LIMIT 1
        `).get(claimedAt.toISOString())
      : db.prepare(`
          SELECT id FROM assignment_deliveries
          WHERE id = ? AND status = 'pending'
            AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
        `).get(requestedId, claimedAt.toISOString());
    if (!candidate) return null;

    const leaseToken = String(leaseTokenFactory());
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(leaseToken)) {
      throw new TypeError('Lease token generator returned an invalid token.');
    }
    const leaseExpiresAt = new Date(claimedAt.getTime() + leaseMs).toISOString();
    const updated = db.prepare(`
      UPDATE assignment_deliveries
      SET status = 'leased', attempt_count = attempt_count + 1,
          lease_token = ?, lease_expires_at = ?, request_started_at = NULL,
          next_attempt_at = NULL, updated_at = ?
      WHERE id = ? AND status = 'pending'
    `).run(leaseToken, leaseExpiresAt, claimedAt.toISOString(), candidate.id);
    if (updated.changes !== 1) return null;
    const delivery = deliveryById(db, candidate.id);
    db.prepare(`
      INSERT INTO assignment_delivery_attempts (
        delivery_id, attempt_number, lease_token, status, created_at
      ) VALUES (?, ?, ?, 'leased', ?)
    `).run(delivery.id, delivery.attempt_count, leaseToken, claimedAt.toISOString());
    return publicDelivery(delivery);
  });
}

function finishLeaseBeforeRequest({ db, delivery, status, reason, now, summary }) {
  const finishedAt = iso(now, 'Delivery transition date');
  return transaction(db, () => {
    const result = db.prepare(`
      UPDATE assignment_deliveries
      SET status = ?, block_reason = ?,
          cancelled_at = CASE WHEN ? = 'cancelled' THEN ? ELSE cancelled_at END,
          lease_token = NULL, lease_expires_at = NULL, next_attempt_at = NULL,
          last_error_code = ?, last_error_summary = ?, updated_at = ?
      WHERE id = ? AND status = 'leased' AND lease_token = ?
        AND request_started_at IS NULL
    `).run(
      status,
      reason,
      status,
      finishedAt,
      reason,
      summary,
      finishedAt,
      delivery.id,
      delivery.lease_token,
    );
    if (result.changes === 1) {
      db.prepare(`
        UPDATE assignment_delivery_attempts
        SET status = ?, finished_at = ?, error_code = ?, error_summary = ?
        WHERE delivery_id = ? AND lease_token = ? AND status = 'leased'
      `).run(
        status === 'blocked' ? 'failed' : status,
        finishedAt,
        reason,
        summary,
        delivery.id,
        delivery.lease_token,
      );
    }
    return publicDelivery(deliveryById(db, delivery.id));
  });
}

export function markRequestStarted({
  db,
  deliveryId,
  leaseToken,
  resolveCurrentContext,
  preparedContext = null,
  now = new Date(),
}) {
  const startedAt = iso(now, 'Request start date');
  return transaction(db, () => {
    const delivery = deliveryById(db, deliveryId);
    if (!delivery || delivery.status !== 'leased' || delivery.lease_token !== leaseToken) {
      return { ready: false, ...publicDelivery(delivery) };
    }
    if (delivery.request_started_at) {
      return { ready: false, reason: 'request_already_started', ...publicDelivery(delivery) };
    }
    const context = synchronousContext(resolveCurrentContext, { db, delivery });
    const validation = validateCurrentContext(delivery, context, preparedContext);
    if (validation.status !== 'ready') {
      const transitioned = finishLeaseBeforeRequest({
        db,
        delivery,
        status: validation.status,
        reason: validation.reason,
        now: startedAt,
        summary: validation.status === 'cancelled'
          ? 'The conversation was reassigned before delivery started.'
          : 'Delivery prerequisites changed before the provider request started.',
      });
      return { ready: false, reason: validation.reason, ...transitioned };
    }
    const updated = db.prepare(`
      UPDATE assignment_deliveries
      SET request_started_at = ?, updated_at = ?
      WHERE id = ? AND status = 'leased' AND lease_token = ?
        AND request_started_at IS NULL
    `).run(startedAt, startedAt, delivery.id, leaseToken);
    if (updated.changes !== 1) {
      return { ready: false, reason: 'request_already_started', ...publicDelivery(deliveryById(db, delivery.id)) };
    }
    db.prepare(`
      UPDATE assignment_delivery_attempts
      SET status = 'started', request_started_at = ?
      WHERE delivery_id = ? AND lease_token = ? AND status = 'leased'
    `).run(startedAt, delivery.id, leaseToken);
    return {
      ready: true,
      context,
      ...publicDelivery(deliveryById(db, delivery.id)),
    };
  });
}

function markAccepted({ db, deliveryId, leaseToken, providerMessageId, now }) {
  const acceptedAt = iso(now, 'Acceptance date');
  return transaction(db, () => {
    const attempt = db.prepare(`
      SELECT * FROM assignment_delivery_attempts
      WHERE delivery_id = ? AND lease_token = ? AND request_started_at IS NOT NULL
    `).get(deliveryId, leaseToken);
    if (!attempt) return publicDelivery(deliveryById(db, deliveryId));
    db.prepare(`
      UPDATE assignment_deliveries
      SET status = 'accepted', accepted_at = ?, provider_message_id = ?,
          block_reason = NULL, lease_token = NULL, lease_expires_at = NULL,
          next_attempt_at = NULL, last_error_code = NULL, last_error_summary = NULL,
          updated_at = ?
      WHERE id = ? AND status <> 'accepted'
    `).run(acceptedAt, nullableText(providerMessageId), acceptedAt, deliveryId);
    db.prepare(`
      UPDATE assignment_delivery_attempts
      SET status = 'accepted', finished_at = ?, provider_message_id = ?,
          error_code = NULL, error_summary = NULL
      WHERE id = ?
    `).run(acceptedAt, nullableText(providerMessageId), attempt.id);
    return publicDelivery(deliveryById(db, deliveryId));
  });
}

function markUnknownReconciled({ db, deliveryId, providerMessageId, now }) {
  const acceptedAt = iso(now, 'Reconciliation date');
  return transaction(db, () => {
    const delivery = deliveryById(db, deliveryId);
    if (!delivery || delivery.status !== 'unknown') return publicDelivery(delivery);
    const attempt = db.prepare(`
      SELECT * FROM assignment_delivery_attempts
      WHERE delivery_id = ? AND status = 'unknown'
      ORDER BY attempt_number DESC LIMIT 1
    `).get(delivery.id);
    if (!attempt) return publicDelivery(delivery);
    db.prepare(`
      UPDATE assignment_deliveries
      SET status = 'accepted', accepted_at = ?, provider_message_id = ?,
          block_reason = NULL, last_reconciled_at = ?,
          last_error_code = NULL, last_error_summary = NULL, updated_at = ?
      WHERE id = ? AND status = 'unknown'
    `).run(
      acceptedAt,
      nullableText(providerMessageId),
      acceptedAt,
      acceptedAt,
      delivery.id,
    );
    db.prepare(`
      UPDATE assignment_delivery_attempts
      SET status = 'accepted', finished_at = ?, provider_message_id = ?,
          error_code = NULL, error_summary = NULL
      WHERE id = ? AND status = 'unknown'
    `).run(acceptedAt, nullableText(providerMessageId), attempt.id);
    return publicDelivery(deliveryById(db, delivery.id));
  });
}

function markSendError({
  db,
  delivery,
  error,
  now,
  maxAttempts,
  retryDelay,
  reconciled = false,
}) {
  const failedAt = instant(now, 'Failure date');
  const safe = sanitizeDeliveryError(error, { requestStarted: true });
  const retryable = !safe.ambiguous && safe.retryable && delivery.attempt_count < maxAttempts;
  const status = safe.ambiguous ? 'unknown' : (retryable ? 'pending' : 'failed');
  const nextAttemptAt = retryable
    ? new Date(failedAt.getTime() + retryDelay(delivery.attempt_count)).toISOString()
    : null;
  return transaction(db, () => {
    const updated = db.prepare(`
      UPDATE assignment_deliveries
      SET status = ?, next_attempt_at = ?, lease_token = NULL, lease_expires_at = NULL,
          last_error_code = ?, last_error_summary = ?,
          last_reconciled_at = CASE WHEN ? THEN ? ELSE last_reconciled_at END,
          updated_at = ?
      WHERE id = ? AND status = 'leased' AND lease_token = ?
    `).run(
      status,
      nextAttemptAt,
      safe.code,
      safe.summary,
      reconciled ? 1 : 0,
      failedAt.toISOString(),
      failedAt.toISOString(),
      delivery.id,
      delivery.lease_token,
    );
    if (updated.changes === 1) {
      db.prepare(`
        UPDATE assignment_delivery_attempts
        SET status = ?, finished_at = ?, error_code = ?, error_summary = ?
        WHERE delivery_id = ? AND lease_token = ? AND status = 'started'
      `).run(
        safe.ambiguous ? 'unknown' : 'failed',
        failedAt.toISOString(),
        safe.code,
        safe.summary,
        delivery.id,
        delivery.lease_token,
      );
    }
    return publicDelivery(deliveryById(db, delivery.id));
  });
}

export function recoverExpiredDeliveryLeases({ db, now = new Date() }) {
  const recoveredAt = iso(now, 'Lease recovery date');
  return transaction(db, () => {
    const expired = db.prepare(`
      SELECT * FROM assignment_deliveries
      WHERE status = 'leased' AND lease_expires_at <= ?
      ORDER BY id
    `).all(recoveredAt);
    let requeued = 0;
    let unknown = 0;
    const recoverAttempt = db.prepare(`
      UPDATE assignment_delivery_attempts
      SET status = ?, finished_at = ?, error_code = ?, error_summary = ?
      WHERE delivery_id = ? AND lease_token = ? AND status IN ('leased', 'started')
    `);
    for (const delivery of expired) {
      const started = Boolean(delivery.request_started_at);
      const status = started ? 'unknown' : 'pending';
      const code = started ? 'delivery_outcome_unknown' : 'lease_expired_before_request';
      const summary = started
        ? 'The worker stopped after provider delivery began; delivery may have been accepted.'
        : 'The worker lease expired before provider delivery began.';
      db.prepare(`
        UPDATE assignment_deliveries
        SET status = ?, next_attempt_at = ?, lease_token = NULL, lease_expires_at = NULL,
            last_error_code = ?, last_error_summary = ?, last_reconciled_at = NULL,
            updated_at = ?
        WHERE id = ? AND status = 'leased' AND lease_token = ?
      `).run(
        status,
        started ? null : recoveredAt,
        code,
        summary,
        recoveredAt,
        delivery.id,
        delivery.lease_token,
      );
      recoverAttempt.run(
        started ? 'unknown' : 'recovered',
        recoveredAt,
        code,
        summary,
        delivery.id,
        delivery.lease_token,
      );
      if (started) unknown += 1;
      else requeued += 1;
    }
    return { requeued, unknown };
  });
}

export function retryUnknownDelivery({
  db,
  deliveryId,
  organizationId = null,
  duplicateRiskConfirmed = false,
  now = new Date(),
}) {
  if (duplicateRiskConfirmed !== true) {
    throw new DeliveryStateError(
      'Confirm the duplicate-delivery risk before retrying an unknown delivery.',
      'duplicate_risk_confirmation_required',
    );
  }
  const retriedAt = iso(now, 'Retry date');
  const id = positiveInteger(deliveryId, 'Delivery ID');
  const organization = organizationId == null
    ? null
    : positiveInteger(organizationId, 'Organization ID');
  return transaction(db, () => {
    const result = organization == null
      ? db.prepare(`
          UPDATE assignment_deliveries
          SET status = 'pending', next_attempt_at = ?, request_started_at = NULL,
              lease_token = NULL, lease_expires_at = NULL,
              duplicate_risk_confirmed_at = ?, last_reconciled_at = NULL,
              updated_at = ?
          WHERE id = ? AND status = 'unknown'
        `).run(retriedAt, retriedAt, retriedAt, id)
      : db.prepare(`
          UPDATE assignment_deliveries
          SET status = 'pending', next_attempt_at = ?, request_started_at = NULL,
              lease_token = NULL, lease_expires_at = NULL,
              duplicate_risk_confirmed_at = ?, last_reconciled_at = NULL,
              updated_at = ?
          WHERE id = ? AND organization_id = ? AND status = 'unknown'
        `).run(retriedAt, retriedAt, retriedAt, id, organization);
    if (result.changes !== 1) {
      throw new DeliveryStateError('Unknown delivery was not found.', 'unknown_delivery_not_found');
    }
    return publicDelivery(deliveryById(db, id));
  });
}

function createTimeoutSignal(timeoutMs) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) return { signal: undefined, clear() {} };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('Delivery timed out.')), timeoutMs);
  timeout.unref?.();
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

function preparationFailure(db, delivery, error, now) {
  const safe = sanitizeDeliveryError(error, { requestStarted: false });
  return finishLeaseBeforeRequest({
    db,
    delivery,
    status: 'blocked',
    reason: safe.code,
    summary: safe.summary,
    now,
  });
}

function digestFor(delivery, context, trustedAppOrigin) {
  const digest = buildAssignmentDigest({
    digestToken: delivery.digest_token,
    trustedAppOrigin,
    createdAt: delivery.created_at,
    organizationName: context.organizationName,
    mailboxAddress: context.mailboxAddress ?? delivery.mailbox_address,
    recipientName: context.recipientName,
    recipientEmail: context.recipientEmail,
    conversationId: delivery.conversation_id,
    conversationPublicId: context.conversationPublicId,
    subject: context.conversationSubject,
    previews: context.previews ?? [],
  });
  if (digest.messageId !== delivery.message_id) {
    throw new DeliverySendError('The configured application origin changed for this delivery.', {
      code: 'trusted_origin_changed',
      ambiguous: false,
      retryable: false,
    });
  }
  return digest;
}

async function reconcileAmbiguous({ sender, delivery, now, timeoutMs, db }) {
  if (typeof sender.reconcile !== 'function') return { found: false, attempted: false };
  const timeout = createTimeoutSignal(timeoutMs);
  try {
    const result = await sender.reconcile({
      messageId: delivery.message_id,
      signal: timeout.signal,
      delivery,
    });
    if (result?.found === true) {
      return {
        found: true,
        attempted: true,
        delivery: markAccepted({
          db,
          deliveryId: delivery.id,
          leaseToken: delivery.lease_token,
          providerMessageId: result.providerMessageId,
          now,
        }),
      };
    }
    return { found: false, attempted: true };
  } catch {
    return { found: false, attempted: false };
  } finally {
    timeout.clear();
  }
}

export async function reconcileUnknownDeliveries({
  db,
  resolveSender,
  now = new Date(),
  maxBatch = DEFAULT_BATCH_SIZE,
  timeoutMs = DEFAULT_SEND_TIMEOUT_MS,
}) {
  if (typeof resolveSender !== 'function') throw new TypeError('A delivery sender resolver is required.');
  if (!Number.isInteger(maxBatch) || maxBatch < 1) {
    throw new RangeError('Reconciliation batch size must be a positive integer.');
  }
  const checkedAt = iso(now, 'Reconciliation date');
  const deliveries = db.prepare(`
    SELECT * FROM assignment_deliveries
    WHERE status = 'unknown' AND last_reconciled_at IS NULL
    ORDER BY updated_at, id
    LIMIT ?
  `).all(maxBatch);
  let checked = 0;
  let accepted = 0;
  for (const delivery of deliveries) {
    try {
      const resolved = await resolveSender({ db, delivery, context: null, reconciliation: true });
      if (!resolved) continue;
      const sender = normalizeDeliverySender(resolved);
      if (typeof sender.reconcile !== 'function') continue;
      const timeout = createTimeoutSignal(timeoutMs);
      try {
        const result = await sender.reconcile({
          messageId: delivery.message_id,
          signal: timeout.signal,
          delivery,
        });
        checked += 1;
        if (result?.found === true) {
          const reconciled = markUnknownReconciled({
            db,
            deliveryId: delivery.id,
            providerMessageId: result.providerMessageId,
            now: checkedAt,
          });
          if (reconciled?.status === 'accepted') accepted += 1;
        } else {
          db.prepare(`
            UPDATE assignment_deliveries
            SET last_reconciled_at = ?, updated_at = ?
            WHERE id = ? AND status = 'unknown' AND last_reconciled_at IS NULL
          `).run(checkedAt, checkedAt, delivery.id);
        }
      } finally {
        timeout.clear();
      }
    } catch {
      // A failed lookup is not authoritative absence. Leave it eligible for a later check.
    }
  }
  return { accepted, checked };
}

export function createDeliveryRunner({
  db,
  trustedAppOrigin,
  resolveCurrentContext,
  resolveSender,
  clock = () => new Date(),
  leaseMs = DEFAULT_LEASE_MS,
  sendTimeoutMs = DEFAULT_SEND_TIMEOUT_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  maxBatch = DEFAULT_BATCH_SIZE,
  retryDelay = attempt => Math.min(60 * 60 * 1000, 60 * 1000 * (2 ** (attempt - 1))),
}) {
  if (typeof resolveSender !== 'function') throw new TypeError('A delivery sender resolver is required.');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError('Maximum delivery attempts must be a positive integer.');
  }
  if (!Number.isInteger(maxBatch) || maxBatch < 1) {
    throw new RangeError('Delivery batch size must be a positive integer.');
  }
  let active = null;

  async function processClaim(delivery) {
    if (!delivery || delivery.status !== 'leased') return publicDelivery(delivery);
    let preparedContext;
    let sender;
    let digest;
    try {
      preparedContext = synchronousContext(resolveCurrentContext, { db, delivery });
      digest = digestFor(delivery, preparedContext, trustedAppOrigin);
      const resolvedSender = await resolveSender({ db, delivery, context: preparedContext });
      if (!resolvedSender) {
        throw new DeliverySendError('No active mailbox sender is available.', {
          code: 'sender_unavailable', ambiguous: false, retryable: false,
        });
      }
      sender = normalizeDeliverySender(resolvedSender);
    } catch (error) {
      return preparationFailure(db, delivery, error, clock());
    }

    const started = markRequestStarted({
      db,
      deliveryId: delivery.id,
      leaseToken: delivery.lease_token,
      resolveCurrentContext,
      preparedContext,
      now: clock(),
    });
    if (!started.ready) return started;

    const timeout = createTimeoutSignal(sendTimeoutMs);
    try {
      const result = await sender.send({
        rawMime: digest.rawMime,
        messageId: digest.messageId,
        delivery: started,
        context: started.context,
        signal: timeout.signal,
      });
      if (result?.accepted === false) {
        throw new DeliverySendError('The provider rejected the delivery request.', {
          code: 'provider_rejected', ambiguous: false, retryable: false,
        });
      }
      return markAccepted({
        db,
        deliveryId: delivery.id,
        leaseToken: delivery.lease_token,
        providerMessageId: result?.providerMessageId,
        now: clock(),
      });
    } catch (error) {
      const safe = sanitizeDeliveryError(error, { requestStarted: true });
      if (safe.ambiguous) {
        const reconciliation = await reconcileAmbiguous({
          sender,
          delivery,
          now: clock(),
          timeoutMs: sendTimeoutMs,
          db,
        });
        if (reconciliation.found) return reconciliation.delivery;
        return markSendError({
          db,
          delivery,
          error,
          now: clock(),
          maxAttempts,
          retryDelay,
          reconciled: reconciliation.attempted,
        });
      }
      return markSendError({
        db,
        delivery,
        error,
        now: clock(),
        maxAttempts,
        retryDelay,
      });
    } finally {
      timeout.clear();
    }
  }

  async function runOne(deliveryId) {
    const id = positiveInteger(deliveryId, 'Delivery ID');
    const existing = publicDelivery(deliveryById(db, id));
    if (!existing) return null;
    if (existing.status === 'leased') return processClaim(existing);
    if (existing.status !== 'pending') return existing;
    const claim = claimPendingDelivery({ db, deliveryId: id, now: clock(), leaseMs });
    return claim ? processClaim(claim) : publicDelivery(deliveryById(db, id));
  }

  async function drain() {
    refreshBlockedDeliveries({
      db,
      trustedAppOrigin,
      resolveDeliveryContext: resolveCurrentContext,
      now: clock(),
    });
    recoverExpiredDeliveryLeases({ db, now: clock() });
    const summary = { accepted: 0, blocked: 0, cancelled: 0, failed: 0, unknown: 0 };
    const reconciled = await reconcileUnknownDeliveries({
      db,
      resolveSender,
      now: clock(),
      maxBatch,
      timeoutMs: sendTimeoutMs,
    });
    summary.accepted += reconciled.accepted;
    for (let index = 0; index < maxBatch; index += 1) {
      const claim = claimPendingDelivery({ db, now: clock(), leaseMs });
      if (!claim) break;
      const result = await processClaim(claim);
      if (Object.hasOwn(summary, result?.status)) summary[result.status] += 1;
    }
    return summary;
  }

  return {
    run() {
      if (!active) {
        active = Promise.resolve()
          .then(drain)
          .finally(() => { active = null; });
      }
      return active;
    },
    runOne,
  };
}

export const DELIVERY_RUNNER_DEFAULTS = Object.freeze({
  leaseMs: DEFAULT_LEASE_MS,
  sendTimeoutMs: DEFAULT_SEND_TIMEOUT_MS,
  maxAttempts: DEFAULT_MAX_ATTEMPTS,
  maxBatch: DEFAULT_BATCH_SIZE,
});
