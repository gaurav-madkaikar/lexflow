import { EMAIL_RETENTION_LIMIT, enforceEmailRetention } from './db.js';
import {
  backfillLegacyConversations,
  bindConversationSource,
  conversationForEmail,
  touchConversation,
  transitionConversationAssignee,
  withCanonicalVersionBatch,
} from './canonical-conversations.js';
import { deriveThreadKey, displayThreadSubject } from './conversations.js';
import {
  cancelFormerRecipientDeliveries,
  ensureAssignmentDelivery,
} from './deliveries.js';
import { correlateInboundReply } from './delivery-correlation.js';

const LOCAL_TRUSTED_APP_ORIGIN = 'http://127.0.0.1:3000';

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

function runSavepoint(db, operation) {
  db.exec('SAVEPOINT apply_rule');
  try {
    const result = operation();
    db.exec('RELEASE SAVEPOINT apply_rule');
    return result;
  } catch (error) {
    db.exec('ROLLBACK TO SAVEPOINT apply_rule');
    db.exec('RELEASE SAVEPOINT apply_rule');
    throw error;
  }
}

function workflowError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function setSyncState(db, key, value, organizationId = 1, connectionId = 0) {
  db.prepare(`
    INSERT INTO sync_state (organization_id, connection_id, key, value) VALUES (?, ?, ?, ?)
    ON CONFLICT(organization_id, connection_id, key)
    DO UPDATE SET value = excluded.value
  `).run(organizationId, connectionId, key, value);
}

function asMailMessage(row) {
  return {
    subject: row.subject,
    preview: row.preview,
    senderName: row.sender_name,
    senderAddress: row.sender_address,
  };
}

function ensureCanonicalThreadKeys(db, organizationId) {
  const pending = db.prepare(`
    SELECT * FROM emails
    WHERE organization_id = ? AND conversation_id IS NULL
      AND trim(coalesce(thread_key, '')) = ''
    ORDER BY id
  `).all(organizationId);
  for (const email of pending) ensureEmailThreadKey(db, email);
}

function parsedCapabilities(value) {
  try {
    const capabilities = JSON.parse(value ?? '[]');
    return {
      read: Array.isArray(capabilities) && capabilities.includes('read'),
      send: Array.isArray(capabilities) && capabilities.includes('send'),
    };
  } catch {
    return { read: false, send: false };
  }
}

export function resolveAssignmentDeliveryContext({
  db,
  organizationId,
  conversationId,
  recipientId,
}) {
  const conversation = db.prepare(`
    SELECT conversations.*, organizations.name AS organization_name
    FROM conversations
    JOIN organizations ON organizations.id = conversations.organization_id
    WHERE conversations.id = ? AND conversations.organization_id = ?
  `).get(conversationId, organizationId);
  const recipient = db.prepare(`
    SELECT id, name, email FROM users
    WHERE id = ? AND organization_id = ? AND registration_status = 'active'
  `).get(recipientId, organizationId);
  if (!conversation || !recipient) return {};
  const source = db.prepare(`
    SELECT conversation_sources.mailbox_identity_id,
           conversation_sources.last_resolved_connection_id,
           conversation_sources.provider,
           conversation_sources.normalized_mailbox,
           conversation_sources.native_conversation_id,
           mailbox_connections.id AS active_connection_id,
           mailbox_connections.generation,
           mailbox_connections.capabilities_json
    FROM conversation_sources
    LEFT JOIN mailbox_connections
      ON mailbox_connections.organization_id = conversation_sources.organization_id
     AND mailbox_connections.id = conversation_sources.last_resolved_connection_id
     AND mailbox_connections.mailbox_identity_id = conversation_sources.mailbox_identity_id
     AND mailbox_connections.is_active = 1
    WHERE conversation_sources.organization_id = ?
      AND conversation_sources.conversation_id = ?
      AND conversation_sources.native_conversation_id IS NOT NULL
    ORDER BY (mailbox_connections.id IS NOT NULL) DESC,
             conversation_sources.updated_at DESC,
             conversation_sources.id DESC
    LIMIT 1
  `).get(organizationId, conversationId);
  const capabilities = parsedCapabilities(source?.capabilities_json);
  const previews = db.prepare(`
    SELECT received_at AS receivedAt, sender_name AS senderName,
           sender_address AS senderAddress, preview
    FROM emails
    WHERE organization_id = ? AND conversation_id = ?
    ORDER BY julianday(received_at) DESC, id DESC
    LIMIT 100
  `).all(organizationId, conversationId).map(row => ({ ...row }));
  return {
    currentAssigneeId: conversation.current_assignee_id === null
      ? null
      : Number(conversation.current_assignee_id),
    mailboxIdentityId: source?.mailbox_identity_id == null
      ? null
      : Number(source.mailbox_identity_id),
    connectionId: source?.active_connection_id == null
      ? null
      : Number(source.active_connection_id),
    connectionGeneration: source?.generation == null ? null : Number(source.generation),
    connectionActive: Boolean(source?.active_connection_id),
    provider: source?.provider ?? null,
    mailboxAddress: source?.normalized_mailbox ?? null,
    nativeConversationId: source?.native_conversation_id ?? null,
    capabilities,
    sendCapable: capabilities.send,
    organizationName: conversation.organization_name,
    recipientName: recipient.name,
    recipientEmail: recipient.email,
    conversationPublicId: conversation.public_id,
    conversationSubject: conversation.subject,
    previews,
  };
}

export function resolveCurrentDeliveryContext({ db, delivery }) {
  return resolveAssignmentDeliveryContext({
    db,
    organizationId: Number(delivery.organization_id),
    conversationId: Number(delivery.conversation_id),
    recipientId: Number(delivery.recipient_id),
  });
}

function ensureCanonicalEmail(db, email, now = new Date()) {
  const organizationId = Number(email.organization_id);
  let conversation = conversationForEmail(db, Number(email.id), organizationId);
  if (!conversation) {
    ensureCanonicalThreadKeys(db, organizationId);
    backfillLegacyConversations(db, { now, organizationId });
    conversation = conversationForEmail(db, Number(email.id), organizationId);
  }
  if (!conversation) {
    throw workflowError(500, 'CANONICAL_CONVERSATION_MISSING', 'Conversation could not be prepared.');
  }
  email.conversation_id = conversation.id;
  return conversation;
}

function assignmentDeliveryTransition(db, {
  conversationId,
  assigneeId,
  actorId,
  reason,
  now,
  trustedAppOrigin,
}) {
  return transitionConversationAssignee(db, {
    conversationId,
    assigneeId,
    actorId,
    reason,
    now,
    ensureDelivery({ conversation }) {
      cancelFormerRecipientDeliveries({
        db,
        organizationId: conversation.organizationId,
        conversationId: conversation.id,
        currentRecipientId: assigneeId,
        now,
      });
      ensureAssignmentDelivery({
        db,
        organizationId: conversation.organizationId,
        conversationId: conversation.id,
        recipientId: assigneeId,
        trustedAppOrigin: trustedAppOrigin ?? LOCAL_TRUSTED_APP_ORIGIN,
        now,
        context: resolveAssignmentDeliveryContext({
          db,
          organizationId: conversation.organizationId,
          conversationId: conversation.id,
          recipientId: assigneeId,
        }),
      });
    },
  });
}

function activeSourceConnection(db, source, organizationId) {
  const provider = String(source.provider ?? '').trim().toLocaleLowerCase();
  const mailboxAddress = String(source.mailboxAddress ?? '').trim().toLocaleLowerCase();
  const explicitId = Number(source.connectionId);
  const explicitIdentity = Number(source.mailboxIdentityId);
  if (Number.isInteger(explicitId) && explicitId > 0) {
    return db.prepare(`
      SELECT mailbox_connections.id,
             mailbox_connections.mailbox_identity_id,
             mailbox_connections.generation
      FROM mailbox_connections
      JOIN mailbox_identities
        ON mailbox_identities.id = mailbox_connections.mailbox_identity_id
       AND mailbox_identities.organization_id = mailbox_connections.organization_id
      WHERE mailbox_connections.id = ? AND mailbox_connections.organization_id = ?
        AND mailbox_connections.is_active = 1
        AND mailbox_connections.provider = ?
        AND mailbox_identities.normalized_mailbox = ? COLLATE NOCASE
        AND (? = 0 OR mailbox_connections.mailbox_identity_id = ?)
    `).get(
      explicitId,
      organizationId,
      provider,
      mailboxAddress,
      Number.isInteger(explicitIdentity) ? explicitIdentity : 0,
      Number.isInteger(explicitIdentity) ? explicitIdentity : 0,
    ) ?? null;
  }
  if (!provider || !mailboxAddress) return null;
  return db.prepare(`
    SELECT mailbox_connections.id,
           mailbox_connections.mailbox_identity_id,
           mailbox_connections.generation
    FROM mailbox_connections
    JOIN mailbox_identities
      ON mailbox_identities.id = mailbox_connections.mailbox_identity_id
     AND mailbox_identities.organization_id = mailbox_connections.organization_id
    WHERE mailbox_connections.organization_id = ?
      AND mailbox_connections.provider = ? AND mailbox_connections.is_active = 1
      AND mailbox_identities.normalized_mailbox = ? COLLATE NOCASE
  `).get(organizationId, provider, mailboxAddress) ?? null;
}

function immediatelyPriorLegacyConnection(db, {
  organizationId,
  connectionId,
  provider,
  mailboxAddress,
}) {
  if (provider !== 'gmail' || connectionId <= 0 || !mailboxAddress) return null;
  const current = db.prepare(`
    SELECT mailbox_connections.connected_at,
           mailbox_connections.mailbox_identity_id,
           mailbox_identities.normalized_mailbox,
           mailbox_identities.provider_account_id
    FROM mailbox_connections
    JOIN mailbox_identities
      ON mailbox_identities.id = mailbox_connections.mailbox_identity_id
     AND mailbox_identities.organization_id = mailbox_connections.organization_id
    WHERE mailbox_connections.id = ? AND mailbox_connections.organization_id = ?
      AND mailbox_connections.provider = 'gmail'
      AND mailbox_connections.is_active = 1
  `).get(connectionId, organizationId);
  if (
    !current
    || String(current.normalized_mailbox).toLocaleLowerCase() !== mailboxAddress
    || String(current.provider_account_id).toLocaleLowerCase() === mailboxAddress
  ) return null;

  const previous = db.prepare(`
    SELECT mailbox_connections.id, mailbox_connections.mailbox_identity_id,
           mailbox_connections.updated_at,
           mailbox_connections.disconnected_at,
           mailbox_identities.normalized_mailbox,
           mailbox_identities.provider_account_id
    FROM mailbox_connections
    JOIN mailbox_identities
      ON mailbox_identities.id = mailbox_connections.mailbox_identity_id
     AND mailbox_identities.organization_id = mailbox_connections.organization_id
    WHERE mailbox_connections.organization_id = ?
      AND mailbox_connections.provider = 'gmail'
      AND mailbox_connections.id <> ?
      AND mailbox_connections.is_active = 0
    ORDER BY mailbox_connections.disconnected_at DESC,
             mailbox_connections.updated_at DESC,
             mailbox_connections.id DESC
    LIMIT 1
  `).get(organizationId, connectionId);
  if (!previous) return null;
  const previousMailbox = String(previous.normalized_mailbox).toLocaleLowerCase();
  return previous.disconnected_at
    && previous.updated_at <= current.connected_at
    && previousMailbox === mailboxAddress
    && String(previous.provider_account_id).toLocaleLowerCase() === previousMailbox
    ? previous
    : null;
}

function adoptImmediatelyPriorLegacyEmails(db, {
  organizationId,
  connectionId,
  mailboxIdentityId,
  provider,
  mailboxAddress,
  messages,
  removedProviderIds,
}) {
  const previous = immediatelyPriorLegacyConnection(db, {
    organizationId,
    connectionId,
    provider,
    mailboxAddress,
  });
  if (!previous) return;
  const fetchedByProviderId = new Map();
  for (const message of messages) {
    const providerId = typeof message?.providerId === 'string' ? message.providerId : '';
    const messageProvider = String(message?.provider ?? provider).trim().toLocaleLowerCase();
    const messageMailbox = String(message?.mailboxAddress ?? mailboxAddress)
      .trim()
      .toLocaleLowerCase();
    if (providerId && messageProvider === provider && messageMailbox === mailboxAddress) {
      fetchedByProviderId.set(providerId, message);
    }
  }
  const providerIds = new Set([
    ...fetchedByProviderId.keys(),
    ...removedProviderIds,
  ]);
  const legacyEmailForProvider = db.prepare(`
    SELECT id, conversation_id
    FROM emails
    WHERE organization_id = ? AND connection_id = ?
      AND provider = ? COLLATE NOCASE
      AND mailbox_address = ? COLLATE NOCASE
      AND provider_id = ?
  `);
  const adopt = db.prepare(`
    UPDATE emails
    SET connection_id = ?
    WHERE organization_id = ? AND connection_id = ?
      AND provider = ? COLLATE NOCASE
      AND mailbox_address = ? COLLATE NOCASE
      AND provider_id = ?
  `);
  const changedAt = new Date().toISOString();
  for (const providerId of providerIds) {
    if (typeof providerId !== 'string' || !providerId) continue;
    const legacyEmail = legacyEmailForProvider.get(
      organizationId,
      previous.id,
      provider,
      mailboxAddress,
      providerId,
    );
    if (!legacyEmail) continue;
    const nativeConversationId = typeof fetchedByProviderId.get(providerId)
      ?.nativeConversationId === 'string'
      ? fetchedByProviderId.get(providerId).nativeConversationId.trim()
      : '';
    if (nativeConversationId && legacyEmail.conversation_id !== null) {
      const legacySource = db.prepare(`
        SELECT id, conversation_id
        FROM conversation_sources
        WHERE organization_id = ? AND conversation_id = ?
          AND mailbox_identity_id = ? AND last_resolved_connection_id = ?
          AND provider = ? COLLATE NOCASE
          AND normalized_mailbox = ? COLLATE NOCASE
          AND native_conversation_id = ?
      `).get(
        organizationId,
        legacyEmail.conversation_id,
        previous.mailbox_identity_id,
        previous.id,
        provider,
        mailboxAddress,
        nativeConversationId,
      );
      if (legacySource) {
        const verifiedSource = db.prepare(`
          SELECT id, conversation_id
          FROM conversation_sources
          WHERE organization_id = ? AND mailbox_identity_id = ?
            AND provider = ? COLLATE NOCASE
            AND normalized_mailbox = ? COLLATE NOCASE
            AND native_conversation_id = ?
        `).get(
          organizationId,
          mailboxIdentityId,
          provider,
          mailboxAddress,
          nativeConversationId,
        );
        if (verifiedSource) {
          if (Number(verifiedSource.conversation_id) !== Number(legacyEmail.conversation_id)) {
            throw workflowError(
              409,
              'MAILBOX_PROVENANCE_CONFLICT',
              'Mailbox history belongs to conflicting conversations.',
            );
          }
          db.prepare('DELETE FROM conversation_sources WHERE id = ?').run(legacySource.id);
        } else {
          db.prepare(`
            UPDATE conversation_sources
            SET mailbox_identity_id = ?, last_resolved_connection_id = ?, updated_at = ?
            WHERE id = ?
          `).run(mailboxIdentityId, connectionId, changedAt, legacySource.id);
        }
      }
    }
    try {
      adopt.run(
        connectionId,
        organizationId,
        previous.id,
        provider,
        mailboxAddress,
        providerId,
      );
    } catch (error) {
      if (String(error?.message ?? '').includes('UNIQUE constraint failed')) {
        throw workflowError(
          409,
          'MAILBOX_PROVENANCE_CONFLICT',
          'Mailbox history already exists under both connection identities.',
        );
      }
      throw error;
    }
  }
}

function refreshCanonicalAfterEmailRemoval(db, conversationIds, now) {
  for (const conversationId of new Set(conversationIds.filter(Boolean).map(Number))) {
    const current = db.prepare('SELECT id FROM conversations WHERE id = ?').get(conversationId);
    if (!current) continue;
    const newest = db.prepare(`
      SELECT * FROM emails WHERE conversation_id = ?
      ORDER BY julianday(received_at) DESC, id DESC LIMIT 1
    `).get(conversationId);
    touchConversation(db, {
      conversationId,
      ...(newest ? {
        subject: newest.subject,
        completionState: newest.status,
      } : {}),
      now,
    });
  }
}

function ensureEmailThreadKey(db, email) {
  if (email.thread_key) return email.thread_key;
  const threadKey = deriveThreadKey({
    provider: email.provider,
    mailboxAddress: email.mailbox_address,
    subject: email.subject,
    providerId: email.provider_id,
  });
  db.prepare('UPDATE emails SET thread_key = ? WHERE id = ?').run(threadKey, email.id);
  email.thread_key = threadKey;
  return threadKey;
}

function findThreadOwner(db, threadKey, organizationId = 1) {
  return db.prepare(`
    SELECT users.*
    FROM email_thread_owners
    JOIN users ON users.id = email_thread_owners.assignee_id
    WHERE email_thread_owners.organization_id = ?
      AND email_thread_owners.thread_key = ?
      AND users.organization_id = email_thread_owners.organization_id
      AND users.role = 'member'
      AND users.registration_status = 'active'
  `).get(organizationId, threadKey);
}

function findConversationOwner(db, email) {
  if (email.conversation_id) {
    const owner = db.prepare(`
      SELECT users.*
      FROM conversations
      JOIN users
        ON users.id = conversations.current_assignee_id
       AND users.organization_id = conversations.organization_id
      WHERE conversations.id = ? AND conversations.organization_id = ?
        AND users.role = 'member' AND users.registration_status = 'active'
    `).get(email.conversation_id, Number(email.organization_id ?? 1));
    if (owner) return owner;
  }
  return findThreadOwner(
    db,
    ensureEmailThreadKey(db, email),
    Number(email.organization_id ?? 1),
  );
}

function saveThreadOwner(db, threadKey, assigneeId, updatedAt, organizationId = 1) {
  db.prepare(`
    INSERT INTO email_thread_owners (organization_id, thread_key, assignee_id, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(organization_id, thread_key) DO UPDATE SET
      assignee_id = excluded.assignee_id,
      updated_at = excluded.updated_at
  `).run(organizationId, threadKey, assigneeId, updatedAt);
}

function hasThreadContinuity(db, email) {
  if (!email.thread_key) return false;
  const organizationId = Number(email.organization_id ?? 1);
  return Boolean(
    db.prepare(`
      SELECT 1 FROM email_thread_owners
      WHERE organization_id = ? AND thread_key = ?
    `).get(organizationId, email.thread_key)
    || db.prepare(`
      SELECT 1 FROM emails
      WHERE organization_id = ? AND thread_key = ? AND id <> ?
      LIMIT 1
    `).get(organizationId, email.thread_key, email.id),
  );
}

function recordAssignment(db, {
  email,
  assignee,
  actorId = null,
  assignedAt,
  allowReassignment = false,
  notificationMessage = null,
  activityMessage = null,
  trustedAppOrigin = LOCAL_TRUSTED_APP_ORIGIN,
}) {
  const threadKey = ensureEmailThreadKey(db, email);
  const organizationId = Number(email.organization_id ?? 1);
  const eligibleStatus = allowReassignment
    ? "status IN ('unassigned', 'assigned')"
    : "status = 'unassigned'";
  const updated = db.prepare(`
    UPDATE emails
    SET status = 'assigned', assignee_id = ?, assigned_at = ?
    WHERE id = ? AND organization_id = ? AND ${eligibleStatus}
  `).run(assignee.id, assignedAt, email.id, organizationId);
  if (updated.changes !== 1) return false;

  saveThreadOwner(db, threadKey, assignee.id, assignedAt, organizationId);
  const conversation = ensureCanonicalEmail(db, email, new Date(assignedAt));
  assignmentDeliveryTransition(db, {
    conversationId: conversation.id,
    assigneeId: Number(assignee.id),
    actorId,
    reason: email.assignee_id ? 'reassigned' : 'assigned',
    now: new Date(assignedAt),
    trustedAppOrigin,
  });

  if (email.assignee_id) {
    db.prepare(`
      DELETE FROM notifications
      WHERE organization_id = ? AND user_id = ? AND email_id = ?
        AND kind IN ('assignment', 'assigned_overdue')
    `).run(organizationId, email.assignee_id, email.id);
    db.prepare(`
      DELETE FROM alert_deliveries
      WHERE organization_id = ? AND user_id = ? AND email_id = ?
        AND kind = 'assigned_overdue'
    `).run(organizationId, email.assignee_id, email.id);
  }
  db.prepare(`
    DELETE FROM alert_deliveries
    WHERE organization_id = ? AND email_id = ? AND kind = 'unassigned_overdue'
  `).run(organizationId, email.id);
  db.prepare(`
    INSERT INTO notifications
      (organization_id, user_id, email_id, kind, message, created_at)
    VALUES (?, ?, ?, 'assignment', ?, ?)
  `).run(
    organizationId,
    assignee.id,
    email.id,
    notificationMessage || `New assignment: ${email.subject}`,
    assignedAt,
  );

  const previous = email.assignee_id
    ? db.prepare('SELECT name FROM users WHERE id = ?').get(email.assignee_id)
    : null;
  const message = activityMessage || (previous
    ? `Reassigned "${email.subject}" from ${previous.name} to ${assignee.name}`
    : `Assigned "${email.subject}" to ${assignee.name}`);
  db.prepare(`
    INSERT INTO activity (organization_id, actor_id, email_id, kind, message, created_at)
    VALUES (?, ?, ?, 'assigned', ?, ?)
  `).run(organizationId, actorId, email.id, message, assignedAt);
  return true;
}

function assignEmailToThreadOwner(db, email, assignee, assignedAt, trustedAppOrigin) {
  const organizationId = Number(email.organization_id ?? 1);
  ensureCanonicalEmail(db, email, new Date(assignedAt));
  const hasOpenMessage = Boolean(db.prepare(`
    SELECT 1
    FROM emails
    WHERE organization_id = ? AND conversation_id = ? AND id <> ? AND status = 'assigned'
    LIMIT 1
  `).get(organizationId, email.conversation_id, email.id));
  const subject = displayThreadSubject(email.subject);
  return recordAssignment(db, {
    email,
    assignee,
    assignedAt,
    notificationMessage: hasOpenMessage
      ? `New reply in conversation: ${subject}`
      : `Conversation reopened: ${subject}`,
    activityMessage: hasOpenMessage
      ? `Assigned a new reply in "${subject}" to ${assignee.name}`
      : `Reopened "${subject}" for ${assignee.name}`,
    trustedAppOrigin,
  });
}

function assignEmailByRule(db, email, rule, assignedAt, trustedAppOrigin) {
  const organizationId = Number(email.organization_id ?? 1);
  const assignee = db.prepare(`
    SELECT * FROM users
    WHERE id = ? AND organization_id = ? AND role = 'member'
      AND registration_status = 'active'
  `).get(rule.assignee_id, organizationId);
  if (!assignee) return false;
  return recordAssignment(db, {
    email,
    assignee,
    assignedAt,
    allowReassignment: false,
    trustedAppOrigin,
  });
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message
      .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
      .replace(
        /(client_secret|access_token|refresh_token|id_token|code|token)\s*["']?\s*[:=]\s*["']?([^\s&",}]+)/gi,
        '$1=[redacted]',
      )
      .replace(/[\u0000-\u001f\u007f]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300) || 'Mailbox sync failed.'
  );
}

export function matchRule(message, rules) {
  const searchable = `${message.subject} ${message.preview}`.toLocaleLowerCase();
  const sender = `${message.senderName} ${message.senderAddress}`.toLocaleLowerCase();
  return (
    rules
      .filter((rule) => rule.enabled)
      .sort((left, right) => left.priority - right.priority || left.id - right.id)
      .find((rule) => {
        const words = rule.keywords
          .split(',')
          .map((word) => word.trim().toLocaleLowerCase())
          .filter(Boolean);
        const keywordsMatch = words.every((word) => searchable.includes(word));
        const senderMatch =
          !rule.sender_filter || sender.includes(rule.sender_filter.toLocaleLowerCase());
        return keywordsMatch && senderMatch;
      }) ?? null
  );
}

function receivedTime(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function compareNewest(left, right) {
  return right.receivedTime - left.receivedTime || right.rankId - left.rankId;
}

function fetchedMessageDetails(message, source) {
  const provider = message.provider || source.provider || 'outlook';
  const mailboxAddress = message.mailboxAddress || source.mailboxAddress || null;
  return {
    message,
    provider,
    mailboxAddress,
    webUrl: message.webUrl ?? message.outlookUrl ?? null,
    threadKey: deriveThreadKey({
      provider,
      mailboxAddress,
      subject: message.subject,
      providerId: message.providerId,
    }),
  };
}

function canCorrelateInboundReply(message) {
  const direction = String(message?.direction ?? '').trim().toLocaleLowerCase();
  return direction === '' || direction === 'received' || direction === 'inbound';
}

function selectFetchedChanges(db, messages, source, organizationId, connectionId) {
  const currentEmails = db.prepare('SELECT * FROM emails WHERE organization_id = ?')
    .all(organizationId);
  const sourceProvider = String(source.provider ?? '').trim().toLocaleLowerCase();
  const sourceMailbox = String(source.mailboxAddress ?? '').trim().toLocaleLowerCase();
  const currentByProviderId = new Map();
  for (const email of currentEmails) {
    const exactSource = String(email.provider ?? '').toLocaleLowerCase() === sourceProvider
      && String(email.mailbox_address ?? '').toLocaleLowerCase() === sourceMailbox
      && (
        Number(email.connection_id) === connectionId
        || (connectionId > 0 && Number(email.connection_id) === 0)
      );
    // Pre-connection callers historically treated provider IDs as organization-wide.
    // Keep that update-in-place behavior only for the legacy connection-0 path.
    if (!exactSource && connectionId !== 0) continue;
    const existing = currentByProviderId.get(email.provider_id);
    if (!existing || exactSource) {
      currentByProviderId.set(email.provider_id, email);
    }
  }
  const fetchedByProviderId = new Map();

  messages.forEach((message, index) => {
    const existing = fetchedByProviderId.get(message.providerId);
    if (existing) {
      existing.details = fetchedMessageDetails(message, source);
      return;
    }
    fetchedByProviderId.set(message.providerId, {
      firstIndex: index,
      details: fetchedMessageDetails(message, source),
    });
  });

  const maxId = Number(db.prepare('SELECT coalesce(max(id), 0) AS id FROM emails').get().id);
  let prospectiveId = maxId;
  const newEntries = [];
  for (const [providerId, entry] of fetchedByProviderId) {
    if (currentByProviderId.has(providerId)) continue;
    prospectiveId += 1;
    entry.rankId = prospectiveId;
    newEntries.push(entry);
  }

  const ranked = currentEmails.map(email => {
    const scopedEmail = currentByProviderId.get(email.provider_id);
    const fetched = scopedEmail && Number(scopedEmail.id) === Number(email.id)
      ? fetchedByProviderId.get(email.provider_id)
      : null;
    return {
      kind: 'existing',
      providerId: email.provider_id,
      receivedTime: receivedTime(fetched?.details.message.receivedAt ?? email.received_at),
      rankId: Number(email.id),
    };
  });
  ranked.push(...newEntries.map(entry => ({
    kind: 'new',
    providerId: entry.details.message.providerId,
    receivedTime: receivedTime(entry.details.message.receivedAt),
    rankId: entry.rankId,
  })));
  ranked.sort(compareNewest);
  const retainedNewProviderIds = new Set(
    ranked.slice(0, EMAIL_RETENTION_LIMIT)
      .filter(item => item.kind === 'new')
      .map(item => item.providerId),
  );

  return {
    existingEntries: [...fetchedByProviderId.entries()]
      .filter(([providerId]) => currentByProviderId.has(providerId))
      .map(([providerId, entry]) => ({
        ...entry,
        email: currentByProviderId.get(providerId),
      })),
    newEntries: newEntries.filter(entry => (
      retainedNewProviderIds.has(entry.details.message.providerId)
    )),
  };
}

function validateProviderIdList(value, label, { rejectDuplicates = false } = {}) {
  if (!Array.isArray(value)) {
    throw workflowError(502, 'INVALID_SYNC_RESPONSE', `Mailbox sync returned an invalid ${label}.`);
  }
  const uniqueProviderIds = new Set();
  for (const providerId of value) {
    if (
      typeof providerId !== 'string'
      || providerId.trim() === ''
      || providerId !== providerId.trim()
      || (rejectDuplicates && uniqueProviderIds.has(providerId))
    ) {
      throw workflowError(502, 'INVALID_SYNC_RESPONSE', `Mailbox sync returned an invalid ${label}.`);
    }
    uniqueProviderIds.add(providerId);
  }
  return [...uniqueProviderIds];
}

function validateReconciliationResponse(response, requestedProviderIds) {
  const presentProviderIds = validateProviderIdList(
    response?.presentProviderIds,
    'reconciliation present list',
    { rejectDuplicates: true },
  );
  const removedProviderIds = validateProviderIdList(
    response?.removedProviderIds,
    'reconciliation removal list',
    { rejectDuplicates: true },
  );
  const requestedSet = new Set(requestedProviderIds);
  const presentSet = new Set(presentProviderIds);
  const removedSet = new Set(removedProviderIds);

  for (const providerId of presentSet) {
    if (!requestedSet.has(providerId) || removedSet.has(providerId)) {
      throw workflowError(
        502,
        'INVALID_SYNC_RESPONSE',
        'Mailbox reconciliation returned an ambiguous message classification.',
      );
    }
  }
  for (const providerId of removedSet) {
    if (!requestedSet.has(providerId)) {
      throw workflowError(
        502,
        'INVALID_SYNC_RESPONSE',
        'Mailbox reconciliation returned an unknown message ID.',
      );
    }
  }
  if (presentSet.size + removedSet.size !== requestedSet.size) {
    throw workflowError(
      502,
      'INVALID_SYNC_RESPONSE',
      'Mailbox reconciliation did not classify every requested message.',
    );
  }
  return { presentSet, removedSet };
}

export async function syncMailbox({
  db,
  source,
  trustedAppOrigin = LOCAL_TRUSTED_APP_ORIGIN,
}) {
  if (source.isCurrentConnection?.() === false) {
    return { imported: 0, assigned: 0, skipped: true };
  }
  const sourceProvider = typeof source.provider === 'string' ? source.provider.trim() : '';
  const organizationId = Number.isInteger(Number(source.organizationId))
    ? Number(source.organizationId)
    : 1;
  const sourceMailboxAddress = typeof source.mailboxAddress === 'string'
    ? source.mailboxAddress.trim()
    : '';
  const sourceConnection = activeSourceConnection(db, source, organizationId);
  const connectionId = sourceConnection ? Number(sourceConnection.id) : 0;
  const mailboxIdentityId = sourceConnection
    ? Number(sourceConnection.mailbox_identity_id)
    : null;
  const reconciliationKey = typeof source.reconciliationKey === 'string'
    ? source.reconciliationKey.trim()
    : '';
  const supportsReconciliation = Boolean(
    reconciliationKey
    && reconciliationKey === source.reconciliationKey
    && typeof source.reconcileInbox === 'function'
  );
  let shouldReconcile = Boolean(
    supportsReconciliation
    && !db.prepare(`
      SELECT 1 FROM sync_state
      WHERE organization_id = ? AND connection_id = ? AND key = ?
    `).get(organizationId, connectionId, reconciliationKey),
  );
  const loadReconciliationProviderIds = () => {
    if (!sourceProvider || !sourceMailboxAddress) {
      throw workflowError(
        502,
        'INVALID_SYNC_RESPONSE',
        'Mailbox reconciliation requires a provider and mailbox address.',
      );
    }
    return db.prepare(`
      SELECT provider_id
      FROM emails
      WHERE organization_id = ?
        AND (connection_id = ? OR (? > 0 AND connection_id = 0))
        AND provider = ? COLLATE NOCASE
        AND mailbox_address = ? COLLATE NOCASE
      ORDER BY id
    `).all(
      organizationId,
      connectionId,
      connectionId,
      sourceProvider,
      sourceMailboxAddress,
    ).map(row => row.provider_id);
  };
  let reconciliationProviderIds = null;
  if (shouldReconcile) {
    reconciliationProviderIds = loadReconciliationProviderIds();
  }
  const cursorKey = source.cursorKey || 'mail_cursor';
  const cursor = db.prepare(`
    SELECT value FROM sync_state
    WHERE organization_id = ? AND connection_id = ? AND key = ?
  `).get(organizationId, connectionId, cursorKey)?.value ?? null;
  const response = await source.fetchChanges(cursor);
  const { messages, nextCursor } = response ?? {};
  const reconciliationRequired = response?.reconciliationRequired === undefined
    ? false
    : response.reconciliationRequired;
  if (typeof reconciliationRequired !== 'boolean') {
    throw workflowError(
      502,
      'INVALID_SYNC_RESPONSE',
      'Mailbox sync returned an invalid reconciliation requirement.',
    );
  }
  if (reconciliationRequired && !supportsReconciliation) {
    throw workflowError(
      502,
      'INVALID_SYNC_RESPONSE',
      'Mailbox sync requires reconciliation but the source does not support it.',
    );
  }
  if (reconciliationRequired) {
    shouldReconcile = true;
    if (reconciliationProviderIds === null) {
      reconciliationProviderIds = loadReconciliationProviderIds();
    }
  }
  const responseRemovedProviderIds = response?.removedProviderIds === undefined
    ? []
    : response.removedProviderIds;
  if (!Array.isArray(messages)) {
    throw workflowError(502, 'INVALID_SYNC_RESPONSE', 'Mailbox sync returned an invalid message list.');
  }
  let effectiveMessages = messages;
  let uniqueRemovedProviderIds = validateProviderIdList(
    responseRemovedProviderIds,
    'removal list',
  );
  let removedProviderIdSet = new Set(uniqueRemovedProviderIds);
  const overlapsFetchedMessage = messages.some(message => (
    removedProviderIdSet.has(message?.providerId)
  ));
  if (overlapsFetchedMessage) {
    throw workflowError(
      502,
      'INVALID_SYNC_RESPONSE',
      'Mailbox sync returned the same message as both present and removed.',
    );
  }

  if (shouldReconcile) {
    if (source.isCurrentConnection?.() === false) {
      return { imported: 0, assigned: 0, skipped: true };
    }
    const reconciliation = validateReconciliationResponse(
      await source.reconcileInbox(reconciliationProviderIds),
      reconciliationProviderIds,
    );
    effectiveMessages = messages.filter(message => !reconciliation.removedSet.has(message?.providerId));
    for (const providerId of reconciliation.presentSet) removedProviderIdSet.delete(providerId);
    for (const providerId of reconciliation.removedSet) removedProviderIdSet.add(providerId);
    uniqueRemovedProviderIds = [...removedProviderIdSet];
  }
  if (uniqueRemovedProviderIds.length > 0 && (!sourceProvider || !sourceMailboxAddress)) {
    throw workflowError(
      502,
      'INVALID_SYNC_RESPONSE',
      'Mailbox sync removals require a provider and mailbox address.',
    );
  }

  return runTransaction(db, () => withCanonicalVersionBatch(db, organizationId, () => {
    if (source.isCurrentConnection?.() === false) {
      return { imported: 0, assigned: 0, skipped: true };
    }
    adoptImmediatelyPriorLegacyEmails(db, {
      organizationId,
      connectionId,
      mailboxIdentityId,
      provider: sourceProvider.toLocaleLowerCase(),
      mailboxAddress: sourceMailboxAddress.toLocaleLowerCase(),
      messages: effectiveMessages,
      removedProviderIds: uniqueRemovedProviderIds,
    });
    const deleteRemovedEmail = db.prepare(`
      DELETE FROM emails
      WHERE organization_id = ?
        AND (connection_id = ? OR (? > 0 AND connection_id = 0))
        AND provider_id = ?
        AND provider = ? COLLATE NOCASE
        AND mailbox_address = ? COLLATE NOCASE
    `);
    const removedConversationIds = [];
    for (const providerId of uniqueRemovedProviderIds) {
      const removed = db.prepare(`
        SELECT conversation_id FROM emails
        WHERE organization_id = ?
          AND (connection_id = ? OR (? > 0 AND connection_id = 0))
          AND provider_id = ? AND provider = ? COLLATE NOCASE
          AND mailbox_address = ? COLLATE NOCASE
      `).all(
        organizationId,
        connectionId,
        connectionId,
        providerId,
        sourceProvider,
        sourceMailboxAddress,
      );
      removedConversationIds.push(...removed.map(row => row.conversation_id));
      deleteRemovedEmail.run(
        organizationId,
        connectionId,
        connectionId,
        providerId,
        sourceProvider,
        sourceMailboxAddress,
      );
    }
    refreshCanonicalAfterEmailRemoval(db, removedConversationIds, new Date());
    const rules = db.prepare('SELECT * FROM rules WHERE organization_id = ?')
      .all(organizationId);
    const { existingEntries, newEntries } = selectFetchedChanges(
      db,
      effectiveMessages,
      source,
      organizationId,
      connectionId,
    );
    const insertEmail = db.prepare(`
      INSERT INTO emails
        (organization_id, connection_id, provider_id, subject, thread_key,
         sender_name, sender_address, preview, received_at, outlook_url,
         provider, mailbox_address, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unassigned', ?)
    `);
    const updateEmail = db.prepare(`
      UPDATE emails
      SET subject = ?, thread_key = ?, sender_name = ?, sender_address = ?, preview = ?,
          received_at = ?, outlook_url = ?, provider = ?, mailbox_address = ?, connection_id = ?
      WHERE id = ?
    `);
    const findEmail = db.prepare(`
      SELECT * FROM emails WHERE id = ? AND organization_id = ?
    `);
    const now = new Date().toISOString();
    const automationCandidates = [];
    const canonicalCandidates = [];

    for (const entry of existingEntries) {
      const { details, email } = entry;
      // Once work has an owner or completion history, its conversation identity is immutable.
      // Unassigned provider updates may move safely when corrected mailbox/subject metadata arrives.
      const preserveThreadKey = email.status !== 'unassigned' || hasThreadContinuity(db, email);
      const threadKey = preserveThreadKey
        ? (email.thread_key || details.threadKey)
        : details.threadKey;
      updateEmail.run(
        details.message.subject,
        threadKey,
        details.message.senderName,
        details.message.senderAddress,
        details.message.preview,
        details.message.receivedAt,
        details.webUrl,
        details.provider,
        details.mailboxAddress,
        connectionId,
        email.id,
      );
      const changed = email.subject !== details.message.subject
        || email.thread_key !== threadKey
        || email.sender_name !== details.message.senderName
        || email.sender_address !== details.message.senderAddress
        || email.preview !== details.message.preview
        || email.received_at !== details.message.receivedAt
        || (email.outlook_url ?? null) !== details.webUrl
        || String(email.provider ?? '').toLocaleLowerCase()
          !== String(details.provider ?? '').toLocaleLowerCase()
        || String(email.mailbox_address ?? '').toLocaleLowerCase()
          !== String(details.mailboxAddress ?? '').toLocaleLowerCase()
        || Number(email.connection_id) !== connectionId;
      canonicalCandidates.push({
        emailId: Number(email.id),
        message: details.message,
        changed,
      });
      if (email.status === 'unassigned') {
        automationCandidates.push({
          emailId: Number(email.id),
          message: details.message,
          imported: false,
        });
      }
    }

    for (const entry of newEntries.sort((left, right) => left.firstIndex - right.firstIndex)) {
      const { details } = entry;
      const inserted = insertEmail.run(
        organizationId,
        connectionId,
        details.message.providerId,
        details.message.subject,
        details.threadKey,
        details.message.senderName,
        details.message.senderAddress,
        details.message.preview,
        details.message.receivedAt,
        details.webUrl,
        details.provider,
        details.mailboxAddress,
        now,
      );
      const emailId = Number(inserted.lastInsertRowid);
      canonicalCandidates.push({ emailId, message: details.message, changed: true });
      automationCandidates.push({
        emailId,
        message: details.message,
        imported: true,
      });
    }

    const prunedConversationIds = db.prepare(`
      SELECT DISTINCT conversation_id
      FROM (
        SELECT conversation_id,
               row_number() OVER (
                 PARTITION BY organization_id
                 ORDER BY julianday(received_at) DESC, id DESC
               ) AS retention_rank
        FROM emails WHERE organization_id = ?
      )
      WHERE retention_rank > ? AND conversation_id IS NOT NULL
    `).all(organizationId, EMAIL_RETENTION_LIMIT).map(row => row.conversation_id);
    enforceEmailRetention(db, EMAIL_RETENTION_LIMIT, organizationId);
    refreshCanonicalAfterEmailRemoval(db, prunedConversationIds, new Date(now));

    const retainedCanonicalCandidates = canonicalCandidates.filter(candidate => (
      findEmail.get(candidate.emailId, organizationId)
    ));
    const correlateEmail = db.prepare(`
      UPDATE emails SET conversation_id = ?
      WHERE id = ? AND organization_id = ? AND conversation_id IS NULL
    `);
    const correlatedEmailIds = new Set();
    if (mailboxIdentityId && connectionId > 0) {
      for (const candidate of retainedCanonicalCandidates) {
        const candidateEmail = findEmail.get(candidate.emailId, organizationId);
        if (
          candidateEmail?.conversation_id !== null
          || !candidate.message.nativeConversationId
          || !canCorrelateInboundReply(candidate.message)
        ) continue;
        const correlation = correlateInboundReply({
          db,
          organizationId,
          mailboxIdentityId,
          provider: sourceProvider,
          mailboxAddress: sourceMailboxAddress,
          nativeConversationId: candidate.message.nativeConversationId,
          message: candidate.message,
        });
        if (!correlation) continue;
        const canonical = db.prepare(`
          SELECT id FROM conversations WHERE id = ? AND organization_id = ?
        `).get(correlation.conversationId, organizationId);
        if (canonical) {
          const correlated = correlateEmail.run(
            canonical.id,
            candidate.emailId,
            organizationId,
          );
          if (correlated.changes === 1) correlatedEmailIds.add(candidate.emailId);
        }
      }
    }

    ensureCanonicalThreadKeys(db, organizationId);
    backfillLegacyConversations(db, { now: new Date(now), organizationId });
    for (const candidate of retainedCanonicalCandidates) {
      const candidateEmail = findEmail.get(candidate.emailId, organizationId);
      if (!candidateEmail) continue;
      const conversation = ensureCanonicalEmail(db, candidateEmail, new Date(now));
      if (
        candidate.message.nativeConversationId
        && mailboxIdentityId
        && connectionId > 0
      ) {
        bindConversationSource(db, {
          organizationId,
          conversationId: conversation.id,
          ...(correlatedEmailIds.has(candidate.emailId)
            ? {}
            : { emailId: candidate.emailId }),
          mailboxIdentityId,
          connectionId,
          provider: sourceProvider,
          mailboxAddress: sourceMailboxAddress,
          nativeConversationId: candidate.message.nativeConversationId,
          fallbackKey: candidateEmail.thread_key,
          now: new Date(now),
        });
      }
    }

    const changedConversationIds = retainedCanonicalCandidates
      .filter(candidate => candidate.changed)
      .map(candidate => findEmail.get(candidate.emailId, organizationId)?.conversation_id)
      .filter(Boolean);
    refreshCanonicalAfterEmailRemoval(db, changedConversationIds, new Date(now));

    let imported = 0;
    let assigned = 0;
    const retainedMessages = automationCandidates
      .map(candidate => ({
        ...candidate,
        email: findEmail.get(candidate.emailId, organizationId),
      }))
      .filter(item => item.email)
      .sort((left, right) => (
        new Date(left.email.received_at) - new Date(right.email.received_at)
        || Number(left.email.id) - Number(right.email.id)
      ));
    for (const { email, message, imported: isImported } of retainedMessages) {
      if (isImported) imported += 1;
      ensureCanonicalEmail(db, email, new Date(now));
      const owner = findConversationOwner(db, email);
      if (owner && assignEmailToThreadOwner(db, email, owner, now, trustedAppOrigin)) {
        assigned += 1;
        continue;
      }
      const rule = matchRule(message, rules);
      if (rule && assignEmailByRule(db, email, rule, now, trustedAppOrigin)) assigned += 1;
    }

    if (nextCursor === null) {
      db.prepare(`
        DELETE FROM sync_state
        WHERE organization_id = ? AND connection_id = ? AND key = ?
      `).run(organizationId, connectionId, cursorKey);
    } else {
      setSyncState(db, cursorKey, nextCursor, organizationId, connectionId);
    }
    setSyncState(db, 'last_sync_at', now, organizationId);
    setSyncState(db, `last_sync_at:${cursorKey}`, now, organizationId, connectionId);
    db.prepare(`
      DELETE FROM sync_state
      WHERE organization_id = ? AND connection_id = ? AND key = ?
    `).run(organizationId, connectionId, `last_sync_error:${cursorKey}`);
    if (shouldReconcile) {
      setSyncState(db, reconciliationKey, 'complete', organizationId, connectionId);
    }

    return { imported, assigned };
  }));
}

export function createSyncRunner({
  db,
  source,
  sources,
  trustedAppOrigin = LOCAL_TRUSTED_APP_ORIGIN,
}) {
  const inFlightByScope = new Map();

  async function syncAll({ organizationId = null } = {}) {
    const available = typeof sources === 'function' ? await sources() : sources;
    const activeSources = (available ?? (source ? [source] : []))
      .filter(Boolean)
      .filter(activeSource => (
        organizationId === null
        || Number(activeSource.organizationId ?? 1) === organizationId
      ));
    if (activeSources.length === 0) {
      return { imported: 0, assigned: 0, succeeded: 0, failed: 0, skipped: 0, sources: [] };
    }

    const settled = await Promise.allSettled(
      activeSources.map((activeSource) => syncMailbox({
        db,
        source: activeSource,
        trustedAppOrigin,
      })),
    );
    const summary = {
      imported: 0,
      assigned: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      sources: [],
    };
    const failuresByOrganization = new Map();

    settled.forEach((outcome, index) => {
      const activeSource = activeSources[index];
      const cursorKey = activeSource.cursorKey || 'mail_cursor';
      const provider = activeSource.provider || 'mailbox';
      const account = activeSource.mailboxAddress || null;
      const organizationId = Number.isInteger(Number(activeSource.organizationId))
        ? Number(activeSource.organizationId)
        : 1;
      const connectionId = Number(
        activeSourceConnection(db, activeSource, organizationId)?.id ?? 0,
      );
      if (outcome.status === 'fulfilled') {
        if (outcome.value.skipped) {
          summary.skipped += 1;
          summary.sources.push({ provider, account, skipped: true });
          return;
        }
        summary.imported += outcome.value.imported;
        summary.assigned += outcome.value.assigned;
        summary.succeeded += 1;
        summary.sources.push({
          provider,
          account,
          imported: outcome.value.imported,
          assigned: outcome.value.assigned,
        });
        return;
      }

      if (activeSource.isCurrentConnection?.() === false) {
        summary.skipped += 1;
        summary.sources.push({ provider, account, skipped: true });
        return;
      }

      const safeMessage = sanitizeError(outcome.reason);
      summary.failed += 1;
      summary.sources.push({ provider, account, error: safeMessage });
      setSyncState(
        db,
        `last_sync_error:${cursorKey}`,
        safeMessage,
        organizationId,
        connectionId,
      );
      if (!failuresByOrganization.has(organizationId)) {
        failuresByOrganization.set(organizationId, []);
      }
      failuresByOrganization.get(organizationId).push({ provider, account });
    });

    const organizations = new Set(
      activeSources.map(activeSource => Number(activeSource.organizationId ?? 1)),
    );
    for (const organizationId of organizations) {
      const failures = failuresByOrganization.get(organizationId) ?? [];
      if (failures.length) {
        const failedProviders = failures
          .map(item => item.account ? `${item.provider} (${item.account})` : item.provider)
          .join(', ');
        setSyncState(
          db,
          'last_sync_error',
          `Sync needs attention: ${failedProviders}.`,
          organizationId,
        );
      } else {
        db.prepare(`
          DELETE FROM sync_state WHERE organization_id = ? AND key = 'last_sync_error'
        `).run(organizationId);
      }
    }

    if (summary.succeeded === 0 && summary.failed > 0) {
      const error = workflowError(502, 'SYNC_FAILED', 'All configured mailboxes failed to sync.');
      error.result = summary;
      throw error;
    }
    return summary;
  }

  function run({ organizationId = null } = {}) {
    if (
      organizationId !== null
      && (!Number.isInteger(organizationId) || organizationId < 1)
    ) {
      return Promise.reject(workflowError(
        400,
        'INVALID_ORGANIZATION',
        'A valid organization is required.',
      ));
    }
    const scopeKey = organizationId === null ? 'all' : `organization:${organizationId}`;
    const existing = inFlightByScope.get(scopeKey);
    if (existing) return existing;
    const active = syncAll({ organizationId })
      .finally(() => {
        inFlightByScope.delete(scopeKey);
      });
    inFlightByScope.set(scopeKey, active);
    return active;
  }

  return { run };
}

export function applyRuleToUnassigned(
  db,
  ruleId,
  organizationId = 1,
  { trustedAppOrigin = LOCAL_TRUSTED_APP_ORIGIN } = {},
) {
  return runSavepoint(db, () => {
    const selectedRule = db.prepare(`
      SELECT id FROM rules
      WHERE id = ? AND organization_id = ? AND enabled = 1
    `).get(ruleId, organizationId);
    if (!selectedRule) return { assigned: 0 };

    ensureCanonicalThreadKeys(db, organizationId);
    backfillLegacyConversations(db, { organizationId });
    const rules = db.prepare(`
      SELECT * FROM rules WHERE organization_id = ? AND enabled = 1
    `).all(organizationId);
    const emails = db.prepare(`
      SELECT * FROM emails
      WHERE organization_id = ? AND status = 'unassigned'
      ORDER BY julianday(received_at), id
    `).all(organizationId);
    const threads = new Map();
    for (const email of emails) {
      const threadKey = ensureEmailThreadKey(db, email);
      ensureCanonicalEmail(db, email);
      const conversationKey = email.conversation_id
        ? `conversation:${email.conversation_id}`
        : `thread:${threadKey}`;
      if (!threads.has(conversationKey)) threads.set(conversationKey, []);
      threads.get(conversationKey).push(email);
    }
    const now = new Date().toISOString();
    let assigned = 0;
    for (const threadEmails of threads.values()) {
      let owner = findConversationOwner(db, threadEmails[0]);
      let establishingRule = null;
      if (!owner) {
        for (const email of threadEmails) {
          establishingRule = matchRule(asMailMessage(email), rules);
          if (establishingRule) break;
        }
        if (!establishingRule) continue;
        owner = db.prepare(`
          SELECT * FROM users
          WHERE id = ? AND organization_id = ? AND role = 'member'
            AND registration_status = 'active'
        `).get(establishingRule.assignee_id, organizationId);
        if (!owner) continue;
      }

      let establishOwner = Boolean(establishingRule);
      for (const email of threadEmails) {
        const changed = establishOwner
          ? assignEmailByRule(db, email, establishingRule, now, trustedAppOrigin)
          : assignEmailToThreadOwner(db, email, owner, now, trustedAppOrigin);
        if (changed) establishOwner = false;
        if (changed) assigned += 1;
      }
    }
    return { assigned };
  });
}

export function assignEmailManually({
  db,
  emailId,
  assigneeId,
  adminId,
  organizationId = 1,
  now = new Date(),
  trustedAppOrigin = LOCAL_TRUSTED_APP_ORIGIN,
}) {
  return runTransaction(db, () => {
    const assignedAt = now.toISOString();
    const email = db.prepare('SELECT * FROM emails WHERE id = ? AND organization_id = ?')
      .get(emailId, organizationId);
    const assignee = db.prepare(`
      SELECT * FROM users
      WHERE id = ? AND organization_id = ? AND role = 'member'
        AND registration_status = 'active'
    `).get(assigneeId, organizationId);
    const admin = db.prepare(`
      SELECT id FROM users
      WHERE id = ? AND organization_id = ? AND role = 'admin'
        AND registration_status = 'active'
    `).get(adminId, organizationId);

    if (!email) throw workflowError(404, 'NOT_FOUND', 'Email not found.');
    if (!assignee) throw workflowError(404, 'NOT_FOUND', 'Team member not found.');
    if (!admin) throw workflowError(403, 'FORBIDDEN', 'Admin access is required.');
    const conversation = ensureCanonicalEmail(db, email, now);
    if (conversation.completionState === 'completed') {
      throw workflowError(409, 'CONFLICT', 'Completed emails cannot be reassigned.');
    }
    const threadKey = ensureEmailThreadKey(db, email);
    const openEmails = db.prepare(`
      SELECT *
      FROM emails
      WHERE organization_id = ? AND conversation_id = ?
        AND status IN ('unassigned', 'assigned')
      ORDER BY julianday(received_at) DESC, id DESC
    `).all(organizationId, conversation.id);
    if (openEmails.length === 0) {
      throw workflowError(409, 'CONFLICT', 'Conversation status changed. Refresh and try again.');
    }

    const currentOwner = findConversationOwner(db, email);
    const alreadyAssigned = openEmails.every(item => (
      item.status === 'assigned' && Number(item.assignee_id) === Number(assigneeId)
    ));
    if (alreadyAssigned && Number(currentOwner?.id) === Number(assigneeId)) {
      return { changed: false, email };
    }

    const priorAssigneeIds = [...new Set(openEmails
      .map(item => Number(item.assignee_id))
      .filter(id => id && id !== Number(assigneeId)))];
    const previousNames = priorAssigneeIds.length
      ? db.prepare(`
          SELECT name FROM users
          WHERE organization_id = ?
            AND id IN (${priorAssigneeIds.map(() => '?').join(', ')})
          ORDER BY name
        `).all(organizationId, ...priorAssigneeIds).map(item => item.name)
      : [];
    const representative = openEmails[0];
    const subject = displayThreadSubject(representative.subject);

    db.prepare(`
      DELETE FROM notifications
      WHERE organization_id = ?
        AND kind IN ('assignment', 'unassigned_overdue', 'assigned_overdue')
        AND email_id IN (
          SELECT id FROM emails
          WHERE organization_id = ? AND conversation_id = ?
            AND status IN ('unassigned', 'assigned')
        )
    `).run(organizationId, organizationId, conversation.id);
    db.prepare(`
      DELETE FROM alert_deliveries
      WHERE organization_id = ? AND email_id IN (
        SELECT id FROM emails
        WHERE organization_id = ? AND conversation_id = ?
          AND status IN ('unassigned', 'assigned')
      )
    `).run(organizationId, organizationId, conversation.id);
    const updated = db.prepare(`
      UPDATE emails
      SET status = 'assigned', assignee_id = ?, assigned_at = ?,
          completed_by = NULL, completed_at = NULL
      WHERE organization_id = ? AND conversation_id = ?
        AND status IN ('unassigned', 'assigned')
    `).run(assignee.id, assignedAt, organizationId, conversation.id);
    if (updated.changes !== openEmails.length) {
      throw workflowError(409, 'CONFLICT', 'Email assignment changed. Refresh and try again.');
    }
    saveThreadOwner(db, threadKey, assignee.id, assignedAt, organizationId);
    assignmentDeliveryTransition(db, {
      conversationId: conversation.id,
      assigneeId: Number(assignee.id),
      actorId: adminId,
      reason: priorAssigneeIds.length ? 'manual_reassignment' : 'manual_assignment',
      now,
      trustedAppOrigin,
    });

    const notificationMessage = previousNames.length
      ? `Conversation reassigned: ${subject}`
      : `New assignment: ${subject}`;
    db.prepare(`
      INSERT INTO notifications
        (organization_id, user_id, email_id, kind, message, created_at)
      VALUES (?, ?, ?, 'assignment', ?, ?)
    `).run(organizationId, assignee.id, representative.id, notificationMessage, assignedAt);

    const activityMessage = previousNames.length
      ? `Reassigned conversation "${subject}" from ${previousNames.join(', ')} to ${assignee.name}`
      : `Assigned conversation "${subject}" to ${assignee.name}`;
    db.prepare(`
      INSERT INTO activity (organization_id, actor_id, email_id, kind, message, created_at)
      VALUES (?, ?, ?, 'assigned', ?, ?)
    `).run(organizationId, adminId, representative.id, activityMessage, assignedAt);

    return {
      changed: true,
      email: db.prepare('SELECT * FROM emails WHERE id = ? AND organization_id = ?')
        .get(emailId, organizationId),
    };
  });
}

export function completeAssignedEmail({
  db,
  emailId,
  userId,
  organizationId = 1,
  now = new Date(),
}) {
  return runTransaction(db, () => {
    const completedAt = now.toISOString();
    const email = db.prepare('SELECT * FROM emails WHERE id = ? AND organization_id = ?')
      .get(emailId, organizationId);
    if (!email || Number(email.assignee_id) !== Number(userId)) {
      const error = new Error('This email is not assigned to this user.');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }
    const conversation = ensureCanonicalEmail(db, email, now);
    if (email.status === 'completed' && Number(email.completed_by) === Number(userId)) {
      return email;
    }
    if (Number(conversation.currentAssigneeId) !== Number(userId)) {
      throw workflowError(403, 'FORBIDDEN', 'This conversation is not assigned to this user.');
    }
    if (email.status !== 'assigned') {
      throw workflowError(409, 'CONFLICT', 'Conversation status changed. Refresh and try again.');
    }

    const threadKey = ensureEmailThreadKey(db, email);
    const representative = db.prepare(`
      SELECT *
      FROM emails
      WHERE organization_id = ? AND conversation_id = ?
        AND assignee_id = ? AND status = 'assigned'
      ORDER BY julianday(received_at) DESC, id DESC
      LIMIT 1
    `).get(organizationId, conversation.id, userId);
    if (!representative) {
      throw workflowError(409, 'CONFLICT', 'Conversation status changed. Refresh and try again.');
    }
    const conflictingOpenEmail = db.prepare(`
      SELECT id
      FROM emails
      WHERE organization_id = ? AND conversation_id = ?
        AND status IN ('unassigned', 'assigned')
        AND (status <> 'assigned' OR assignee_id <> ?)
      LIMIT 1
    `).get(organizationId, conversation.id, userId);
    if (conflictingOpenEmail) {
      throw workflowError(
        409,
        'CONFLICT',
        'This conversation has mixed ownership. Ask an admin to assign it before completing it.',
      );
    }
    const update = db.prepare(`
      UPDATE emails
      SET status = 'completed', completed_by = ?, completed_at = ?
      WHERE organization_id = ? AND conversation_id = ? AND status = 'assigned'
    `).run(userId, completedAt, organizationId, conversation.id);
    if (update.changes < 1) {
      throw workflowError(409, 'CONFLICT', 'Conversation status changed. Refresh and try again.');
    }
    transitionConversationAssignee(db, {
      conversationId: conversation.id,
      assigneeId: Number(userId),
      completionState: 'completed',
      actorId: userId,
      reason: 'completed',
      now,
    });

    const actor = db.prepare('SELECT name FROM users WHERE id = ? AND organization_id = ?')
      .get(userId, organizationId);
    const subject = displayThreadSubject(representative.subject);
    const message = `${actor.name} completed conversation "${subject}"`;
    db.prepare(`
      INSERT INTO activity (organization_id, actor_id, email_id, kind, message, created_at)
      VALUES (?, ?, ?, 'completed', ?, ?)
    `).run(organizationId, userId, representative.id, message, completedAt);
    db.prepare(`
      INSERT INTO notifications
        (organization_id, user_id, email_id, kind, message, created_at)
      SELECT ?, id, ?, 'completion', ?, ?
      FROM users
      WHERE organization_id = ? AND role = 'admin' AND registration_status = 'active'
    `).run(organizationId, representative.id, message, completedAt, organizationId);
    db.prepare(`
      DELETE FROM alert_deliveries
      WHERE organization_id = ? AND kind = 'assigned_overdue'
        AND email_id IN (
          SELECT id FROM emails WHERE organization_id = ? AND conversation_id = ?
        )
    `).run(organizationId, organizationId, conversation.id);
    db.prepare(`
      DELETE FROM notifications
      WHERE organization_id = ? AND kind = 'assigned_overdue'
        AND email_id IN (
          SELECT id FROM emails WHERE organization_id = ? AND conversation_id = ?
        )
    `).run(organizationId, organizationId, conversation.id);
    return db.prepare('SELECT * FROM emails WHERE id = ? AND organization_id = ?')
      .get(representative.id, organizationId);
  });
}
