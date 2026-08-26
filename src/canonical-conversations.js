import { randomBytes } from 'node:crypto';

import { displayThreadSubject } from './conversations.js';

const COMPLETION_STATES = new Set(['unassigned', 'assigned', 'completed']);
const SOURCE_PROVIDERS = new Set(['gmail', 'outlook', 'demo']);

function canonicalError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
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

function tableExists(db, table) {
  return Boolean(db.prepare(`
    SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?
  `).get(table));
}

function tableHasColumn(db, table, column) {
  return tableExists(db, table)
    && db.prepare(`PRAGMA table_info(${table})`).all().some(row => row.name === column);
}

function validTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (!Number.isFinite(date.getTime())) {
    throw canonicalError(400, 'INVALID_TIMESTAMP', 'Conversation time is invalid.');
  }
  return date.toISOString();
}

function normalizeProvider(value) {
  const provider = String(value ?? '').trim().toLocaleLowerCase();
  if (!SOURCE_PROVIDERS.has(provider)) {
    throw canonicalError(400, 'INVALID_CONVERSATION_SOURCE', 'Conversation provider is invalid.');
  }
  return provider;
}

function normalizeMailbox(value) {
  return String(value ?? '').trim().toLocaleLowerCase();
}

function nonEmpty(value, code, message, maximum = 2048) {
  const normalized = String(value ?? '').trim();
  if (!normalized || normalized.length > maximum) {
    throw canonicalError(400, code, message);
  }
  return normalized;
}

function mappedConversation(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    organizationId: Number(row.organization_id),
    publicId: row.public_id,
    currentAssigneeId: row.current_assignee_id === null
      ? null
      : Number(row.current_assignee_id),
    completionState: row.completion_state,
    subject: row.subject,
    version: Number(row.version),
    dataConflict: row.data_conflict ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function publicId() {
  return `cv_${randomBytes(18).toString('base64url')}`;
}

export function withCanonicalVersionBatch(db, organizationId, operation) {
  if (!db) throw new TypeError('withCanonicalVersionBatch requires a database');
  if (!Number.isInteger(organizationId) || organizationId < 1) {
    throw canonicalError(400, 'INVALID_ORGANIZATION', 'A valid organization is required.');
  }
  if (typeof operation !== 'function') {
    throw new TypeError('withCanonicalVersionBatch requires an operation');
  }
  const versionsBefore = new Map(db.prepare(`
    SELECT id, version FROM conversations
    WHERE organization_id = ? ORDER BY id
  `).all(organizationId).map(row => [Number(row.id), Number(row.version)]));
  const result = operation();
  const updateVersion = db.prepare('UPDATE conversations SET version = ? WHERE id = ?');
  for (const row of db.prepare(`
    SELECT id, version FROM conversations
    WHERE organization_id = ? ORDER BY id
  `).all(organizationId)) {
    const id = Number(row.id);
    const version = Number(row.version);
    const previous = versionsBefore.get(id);
    const expected = previous === undefined
      ? 1
      : version === previous ? previous : previous + 1;
    if (version !== expected) updateVersion.run(expected, id);
  }
  return result;
}

function insertConversation(db, {
  organizationId,
  currentAssigneeId = null,
  completionState = 'unassigned',
  subject,
  createdAt,
  updatedAt,
}) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const inserted = db.prepare(`
        INSERT INTO conversations
          (organization_id, public_id, current_assignee_id, completion_state,
           subject, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        organizationId,
        publicId(),
        currentAssigneeId,
        completionState,
        displayThreadSubject(subject),
        createdAt,
        updatedAt,
      );
      return Number(inserted.lastInsertRowid);
    } catch (error) {
      if (!/public_id/i.test(String(error?.message)) || attempt === 3) throw error;
    }
  }
  throw new Error('Unable to allocate a conversation identifier.');
}

function newestEmailForConversation(db, conversationId) {
  return db.prepare(`
    SELECT * FROM emails
    WHERE conversation_id = ?
    ORDER BY julianday(received_at) DESC, id DESC
    LIMIT 1
  `).get(conversationId);
}

function ownerRank(db, conversationId) {
  const owner = db.prepare(`
    SELECT email_thread_owners.assignee_id, email_thread_owners.updated_at,
           conversation_sources.fallback_key
    FROM conversation_sources
    JOIN email_thread_owners
      ON email_thread_owners.organization_id = conversation_sources.organization_id
     AND email_thread_owners.thread_key = conversation_sources.fallback_key
    WHERE conversation_sources.conversation_id = ?
      AND conversation_sources.fallback_key IS NOT NULL
    ORDER BY julianday(email_thread_owners.updated_at) DESC,
             conversation_sources.fallback_key DESC
    LIMIT 1
  `).get(conversationId);
  if (owner) {
    return {
      assigneeId: Number(owner.assignee_id),
      updatedAt: owner.updated_at,
      fallbackKey: owner.fallback_key,
      hasOwner: true,
    };
  }
  const conversation = db.prepare(`
    SELECT current_assignee_id, updated_at FROM conversations WHERE id = ?
  `).get(conversationId);
  const fallback = db.prepare(`
    SELECT max(fallback_key) AS fallback_key
    FROM conversation_sources WHERE conversation_id = ?
  `).get(conversationId)?.fallback_key ?? '';
  return {
    assigneeId: conversation?.current_assignee_id === null
      ? null
      : Number(conversation?.current_assignee_id),
    updatedAt: conversation?.updated_at ?? '',
    fallbackKey: fallback,
    hasOwner: false,
  };
}

function compareOwnerRank(left, right) {
  if (left.rank.hasOwner !== right.rank.hasOwner) return left.rank.hasOwner ? -1 : 1;
  const leftTime = Date.parse(left.rank.updatedAt);
  const rightTime = Date.parse(right.rank.updatedAt);
  if (leftTime !== rightTime) return rightTime - leftTime;
  const fallback = right.rank.fallbackKey.localeCompare(left.rank.fallbackKey);
  if (fallback !== 0) return fallback;
  return left.id - right.id;
}

function candidateHasStartedDelivery(db, conversationIds) {
  if (conversationIds.length < 1 || !tableExists(db, 'assignment_deliveries')) return false;
  const placeholders = conversationIds.map(() => '?').join(', ');
  if (tableHasColumn(db, 'assignment_deliveries', 'request_started_at')) {
    const started = db.prepare(`
      SELECT 1 FROM assignment_deliveries
      WHERE conversation_id IN (${placeholders}) AND request_started_at IS NOT NULL
      LIMIT 1
    `).get(...conversationIds);
    if (started) return true;
  }
  if (tableHasColumn(db, 'assignment_deliveries', 'status')) {
    const started = db.prepare(`
      SELECT 1 FROM assignment_deliveries
      WHERE conversation_id IN (${placeholders})
        AND status IN ('leased', 'accepted', 'unknown')
      LIMIT 1
    `).get(...conversationIds);
    if (started) return true;
  }
  if (
    tableExists(db, 'assignment_delivery_attempts')
    && tableHasColumn(db, 'assignment_delivery_attempts', 'request_started_at')
  ) {
    return Boolean(db.prepare(`
      SELECT 1
      FROM assignment_delivery_attempts
      JOIN assignment_deliveries
        ON assignment_deliveries.id = assignment_delivery_attempts.delivery_id
      WHERE assignment_deliveries.conversation_id IN (${placeholders})
        AND assignment_delivery_attempts.request_started_at IS NOT NULL
      LIMIT 1
    `).get(...conversationIds));
  }
  return false;
}

function moveUnstartedDeliveries(db, fromConversationId, toConversationId) {
  if (!tableExists(db, 'assignment_deliveries')) return;
  const recipientColumn = tableHasColumn(db, 'assignment_deliveries', 'recipient_id')
    ? 'recipient_id'
    : tableHasColumn(db, 'assignment_deliveries', 'recipient_user_id')
      ? 'recipient_user_id'
      : null;
  if (!recipientColumn) {
    db.prepare(`
      UPDATE assignment_deliveries SET conversation_id = ? WHERE conversation_id = ?
    `).run(toConversationId, fromConversationId);
    return;
  }
  const deliveries = db.prepare(`
    SELECT id, ${recipientColumn} AS recipient_id
    FROM assignment_deliveries WHERE conversation_id = ? ORDER BY id
  `).all(fromConversationId);
  for (const delivery of deliveries) {
    const duplicate = db.prepare(`
      SELECT id FROM assignment_deliveries
      WHERE conversation_id = ? AND ${recipientColumn} = ?
    `).get(toConversationId, delivery.recipient_id);
    if (duplicate) {
      db.prepare('DELETE FROM assignment_deliveries WHERE id = ?').run(delivery.id);
    } else {
      db.prepare(`
        UPDATE assignment_deliveries SET conversation_id = ? WHERE id = ?
      `).run(toConversationId, delivery.id);
    }
  }
}

function refreshConversationState(db, conversationId, { assigneeId, now, incrementVersion }) {
  const newest = newestEmailForConversation(db, conversationId);
  if (!newest) return;
  db.prepare(`
    UPDATE conversations
    SET current_assignee_id = ?, completion_state = ?, subject = ?,
        version = version + ?, updated_at = ?
    WHERE id = ?
  `).run(
    assigneeId ?? newest.assignee_id ?? null,
    newest.status,
    displayThreadSubject(newest.subject),
    incrementVersion ? 1 : 0,
    now,
    conversationId,
  );
}

export function backfillLegacyConversations(db, {
  now = new Date(),
  organizationId = null,
} = {}) {
  if (!tableExists(db, 'conversations') || !tableHasColumn(db, 'emails', 'conversation_id')) {
    return { created: 0, mapped: 0 };
  }
  if (
    organizationId !== null
    && (!Number.isInteger(organizationId) || organizationId < 1)
  ) {
    throw canonicalError(400, 'INVALID_ORGANIZATION', 'A valid organization is required.');
  }
  const migrationTime = validTimestamp(now);
  return withSavepoint(db, 'backfill_legacy_conversations', () => {
    let created = 0;
    let mapped = 0;
    const groups = organizationId === null
      ? db.prepare(`
          SELECT organization_id, thread_key
          FROM emails
          WHERE conversation_id IS NULL
          GROUP BY organization_id, thread_key
          ORDER BY organization_id, thread_key
        `).all()
      : db.prepare(`
          SELECT organization_id, thread_key
          FROM emails
          WHERE organization_id = ? AND conversation_id IS NULL
          GROUP BY organization_id, thread_key
          ORDER BY organization_id, thread_key
        `).all(organizationId);
    for (const group of groups) {
      const organizationId = Number(group.organization_id);
      const fallbackKey = nonEmpty(
        group.thread_key,
        'INVALID_FALLBACK_KEY',
        'Legacy conversation fallback is invalid.',
      );
      let source = db.prepare(`
        SELECT conversation_id FROM conversation_sources
        WHERE organization_id = ? AND fallback_key = ?
      `).get(organizationId, fallbackKey);
      if (!source) {
        const newest = db.prepare(`
          SELECT * FROM emails
          WHERE organization_id = ? AND thread_key = ?
          ORDER BY julianday(received_at) DESC, id DESC
          LIMIT 1
        `).get(organizationId, fallbackKey);
        const oldest = db.prepare(`
          SELECT created_at FROM emails
          WHERE organization_id = ? AND thread_key = ?
          ORDER BY julianday(received_at), id
          LIMIT 1
        `).get(organizationId, fallbackKey);
        const owner = db.prepare(`
          SELECT assignee_id FROM email_thread_owners
          WHERE organization_id = ? AND thread_key = ?
        `).get(organizationId, fallbackKey);
        const conversationId = insertConversation(db, {
          organizationId,
          currentAssigneeId: owner?.assignee_id ?? newest.assignee_id ?? null,
          completionState: newest.status,
          subject: newest.subject,
          createdAt: oldest?.created_at ?? newest.created_at ?? migrationTime,
          updatedAt: newest.completed_at ?? newest.assigned_at
            ?? newest.created_at ?? migrationTime,
        });
        db.prepare(`
          INSERT INTO conversation_sources
            (organization_id, conversation_id, provider, normalized_mailbox,
             native_conversation_id, fallback_key, created_at, updated_at)
          VALUES (?, ?, ?, ?, NULL, ?, ?, ?)
        `).run(
          organizationId,
          conversationId,
          normalizeProvider(newest.provider),
          normalizeMailbox(newest.mailbox_address),
          fallbackKey,
          migrationTime,
          migrationTime,
        );
        source = { conversation_id: conversationId };
        created += 1;
      }
      mapped += Number(db.prepare(`
        UPDATE emails SET conversation_id = ?
        WHERE organization_id = ? AND thread_key = ? AND conversation_id IS NULL
      `).run(source.conversation_id, organizationId, fallbackKey).changes);
    }
    return { created, mapped };
  });
}

export function conversationForEmail(db, emailId, organizationId = null) {
  if (!db) throw new TypeError('conversationForEmail requires a database');
  if (!Number.isInteger(emailId) || emailId < 1) return null;
  const row = organizationId === null
    ? db.prepare(`
        SELECT conversations.*
        FROM emails JOIN conversations ON conversations.id = emails.conversation_id
        WHERE emails.id = ?
      `).get(emailId)
    : db.prepare(`
        SELECT conversations.*
        FROM emails JOIN conversations
          ON conversations.id = emails.conversation_id
         AND conversations.organization_id = emails.organization_id
        WHERE emails.id = ? AND emails.organization_id = ?
      `).get(emailId, organizationId);
  return mappedConversation(row);
}

export function touchConversation(db, {
  conversationId,
  subject = null,
  completionState = null,
  currentAssigneeId = undefined,
  dataConflict = undefined,
  now = new Date(),
} = {}) {
  if (!db) throw new TypeError('touchConversation requires a database');
  const current = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
  if (!current) throw canonicalError(404, 'CONVERSATION_NOT_FOUND', 'Conversation was not found.');
  const nextState = completionState ?? current.completion_state;
  if (!COMPLETION_STATES.has(nextState)) {
    throw canonicalError(400, 'INVALID_CONVERSATION_STATE', 'Conversation state is invalid.');
  }
  const nextAssignee = currentAssigneeId === undefined
    ? current.current_assignee_id
    : currentAssigneeId;
  db.prepare(`
    UPDATE conversations
    SET subject = ?, completion_state = ?, current_assignee_id = ?,
        data_conflict = ?, version = version + 1, updated_at = ?
    WHERE id = ?
  `).run(
    subject === null ? current.subject : nonEmpty(
      displayThreadSubject(subject),
      'INVALID_CONVERSATION_SUBJECT',
      'Conversation subject is required.',
    ),
    nextState,
    nextAssignee,
    dataConflict === undefined ? current.data_conflict : dataConflict,
    validTimestamp(now),
    conversationId,
  );
  return mappedConversation(db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId));
}

export function transitionConversationAssignee(db, {
  conversationId,
  assigneeId,
  completionState = assigneeId === null ? 'unassigned' : 'assigned',
  now = new Date(),
  ensureDelivery = null,
  actorId = null,
  reason = null,
} = {}) {
  if (!db) throw new TypeError('transitionConversationAssignee requires a database');
  if (!COMPLETION_STATES.has(completionState)) {
    throw canonicalError(400, 'INVALID_CONVERSATION_STATE', 'Conversation state is invalid.');
  }
  return withSavepoint(db, 'transition_conversation_assignee', () => {
    const current = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
    if (!current) throw canonicalError(404, 'CONVERSATION_NOT_FOUND', 'Conversation was not found.');
    if (assigneeId !== null) {
      const assignee = db.prepare(`
        SELECT id FROM users
        WHERE id = ? AND organization_id = ?
          AND role = 'member' AND registration_status = 'active'
      `).get(assigneeId, current.organization_id);
      if (!assignee) {
        throw canonicalError(400, 'INVALID_ASSIGNEE', 'Assignee must be an active user in this organization.');
      }
    }
    const unchanged = current.current_assignee_id === assigneeId
      && current.completion_state === completionState;
    if (!unchanged) {
      db.prepare(`
        UPDATE conversations
        SET current_assignee_id = ?, completion_state = ?,
            version = version + 1, updated_at = ?
        WHERE id = ?
      `).run(assigneeId, completionState, validTimestamp(now), conversationId);
    }
    const conversation = mappedConversation(
      db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId),
    );
    if (typeof ensureDelivery === 'function' && assigneeId !== null) {
      ensureDelivery({
        db,
        conversation,
        previousAssigneeId: current.current_assignee_id === null
          ? null
          : Number(current.current_assignee_id),
        actorId,
        reason,
      });
    }
    return conversation;
  });
}

export function backfillNativeConversation(db, {
  organizationId,
  mailboxIdentityId,
  connectionId,
  provider: providerValue,
  mailboxAddress: mailboxValue,
  nativeConversationId: nativeValue,
  emailIds = [],
  conversationId = null,
  now = new Date(),
} = {}) {
  if (!db) throw new TypeError('backfillNativeConversation requires a database');
  const provider = normalizeProvider(providerValue);
  if (provider === 'demo') {
    throw canonicalError(400, 'INVALID_CONVERSATION_SOURCE', 'Demo mail has no native conversation identity.');
  }
  const mailboxAddress = nonEmpty(
    normalizeMailbox(mailboxValue),
    'INVALID_CONVERSATION_SOURCE',
    'Mailbox address is required.',
    320,
  );
  const nativeConversationId = nonEmpty(
    nativeValue,
    'INVALID_CONVERSATION_SOURCE',
    'Native conversation identity is required.',
  );
  if (!Number.isInteger(organizationId) || organizationId < 1) {
    throw canonicalError(400, 'INVALID_ORGANIZATION', 'A valid organization is required.');
  }
  const uniqueEmailIds = [...new Set(emailIds.map(Number))];
  if (uniqueEmailIds.some(id => !Number.isInteger(id) || id < 1)) {
    throw canonicalError(400, 'INVALID_EMAIL', 'Native backfill email identity is invalid.');
  }
  const changedAt = validTimestamp(now);

  const result = withSavepoint(db, 'backfill_native_conversation', () => {
    const identity = db.prepare(`
      SELECT id FROM mailbox_identities
      WHERE id = ? AND organization_id = ? AND provider = ?
        AND normalized_mailbox = ? COLLATE NOCASE
    `).get(mailboxIdentityId, organizationId, provider, mailboxAddress);
    const connection = db.prepare(`
      SELECT id FROM mailbox_connections
      WHERE id = ? AND organization_id = ? AND mailbox_identity_id = ?
        AND provider = ? AND is_active = 1
    `).get(connectionId, organizationId, mailboxIdentityId, provider);
    if (!identity || !connection) {
      throw canonicalError(409, 'MAILBOX_IDENTITY_MISMATCH', 'Conversation source mailbox identity is invalid.');
    }

    let selectedRows = [];
    if (uniqueEmailIds.length > 0) {
      const placeholders = uniqueEmailIds.map(() => '?').join(', ');
      selectedRows = db.prepare(`
        SELECT id, conversation_id FROM emails
        WHERE organization_id = ? AND id IN (${placeholders})
      `).all(organizationId, ...uniqueEmailIds);
      if (selectedRows.length !== uniqueEmailIds.length) {
        throw canonicalError(404, 'EMAIL_NOT_FOUND', 'A native conversation email was not found.');
      }
      if (selectedRows.some(row => row.conversation_id === null)) {
        backfillLegacyConversations(db, { now, organizationId });
        selectedRows = db.prepare(`
          SELECT id, conversation_id FROM emails
          WHERE organization_id = ? AND id IN (${placeholders})
        `).all(organizationId, ...uniqueEmailIds);
      }
    }

    const existingSource = db.prepare(`
      SELECT * FROM conversation_sources
      WHERE organization_id = ? AND mailbox_identity_id = ? AND provider = ?
        AND normalized_mailbox = ? COLLATE NOCASE
        AND native_conversation_id = ?
    `).get(
      organizationId,
      mailboxIdentityId,
      provider,
      mailboxAddress,
      nativeConversationId,
    );
    let splitCreated = false;
    if (!existingSource && selectedRows.length > 0) {
      const selectedConversationIds = [...new Set(
        selectedRows.map(row => Number(row.conversation_id)),
      )];
      if (selectedConversationIds.length === 1) {
        const parentId = selectedConversationIds[0];
        const otherNativeSource = db.prepare(`
          SELECT id FROM conversation_sources
          WHERE conversation_id = ? AND native_conversation_id IS NOT NULL
            AND NOT (
              mailbox_identity_id = ? AND provider = ?
              AND normalized_mailbox = ? COLLATE NOCASE
              AND native_conversation_id = ?
            )
          LIMIT 1
        `).get(
          parentId,
          mailboxIdentityId,
          provider,
          mailboxAddress,
          nativeConversationId,
        );
        if (otherNativeSource) {
          const totalRows = Number(db.prepare(`
            SELECT count(*) AS count FROM emails WHERE conversation_id = ?
          `).get(parentId).count);
          if (
            totalRows <= selectedRows.length
            || candidateHasStartedDelivery(db, [parentId])
          ) {
            const conflict = 'native_split_started_or_ambiguous';
            db.prepare(`
              UPDATE conversations
              SET data_conflict = ?, version = version + 1, updated_at = ?
              WHERE id = ? AND coalesce(data_conflict, '') <> ?
            `).run(conflict, changedAt, parentId, conflict);
            return {
              conflict: true,
              conversation: mappedConversation(
                db.prepare('SELECT * FROM conversations WHERE id = ?').get(parentId),
              ),
            };
          }

          const placeholders = uniqueEmailIds.map(() => '?').join(', ');
          const parent = db.prepare('SELECT * FROM conversations WHERE id = ?').get(parentId);
          const newestSelected = db.prepare(`
            SELECT * FROM emails WHERE id IN (${placeholders})
            ORDER BY julianday(received_at) DESC, id DESC LIMIT 1
          `).get(...uniqueEmailIds);
          const oldestSelected = db.prepare(`
            SELECT created_at FROM emails WHERE id IN (${placeholders})
            ORDER BY julianday(received_at), id LIMIT 1
          `).get(...uniqueEmailIds);
          const childId = insertConversation(db, {
            organizationId,
            currentAssigneeId: parent.current_assignee_id,
            completionState: newestSelected.status,
            subject: newestSelected.subject,
            createdAt: oldestSelected?.created_at ?? changedAt,
            updatedAt: changedAt,
          });
          const representative = newestEmailForConversation(db, parentId);
          db.prepare(`
            UPDATE emails SET conversation_id = ?
            WHERE organization_id = ? AND id IN (${placeholders})
          `).run(childId, organizationId, ...uniqueEmailIds);
          if (representative && uniqueEmailIds.includes(Number(representative.id))) {
            moveUnstartedDeliveries(db, parentId, childId);
          }
          refreshConversationState(db, parentId, {
            assigneeId: parent.current_assignee_id,
            now: changedAt,
            incrementVersion: true,
          });
          selectedRows = selectedRows.map(row => ({ ...row, conversation_id: childId }));
          splitCreated = true;
        }
      }
    }

    const candidateIds = new Set();
    if (existingSource) candidateIds.add(Number(existingSource.conversation_id));
    if (
      selectedRows.length === 0
      && Number.isInteger(conversationId)
      && conversationId > 0
    ) candidateIds.add(conversationId);
    if (uniqueEmailIds.length > 0) {
      const placeholders = uniqueEmailIds.map(() => '?').join(', ');
      for (const row of db.prepare(`
        SELECT DISTINCT conversation_id FROM emails
        WHERE organization_id = ? AND id IN (${placeholders})
          AND conversation_id IS NOT NULL
      `).all(organizationId, ...uniqueEmailIds)) {
        candidateIds.add(Number(row.conversation_id));
      }
    }
    if (candidateIds.size === 0) {
      throw canonicalError(400, 'CONVERSATION_NOT_FOUND', 'A canonical conversation is required.');
    }
    const candidates = [...candidateIds].map(id => {
      const row = db.prepare(`
        SELECT id FROM conversations WHERE id = ? AND organization_id = ?
      `).get(id, organizationId);
      if (!row) throw canonicalError(404, 'CONVERSATION_NOT_FOUND', 'Conversation was not found.');
      return { id, rank: ownerRank(db, id) };
    }).sort(compareOwnerRank);

    if (
      candidates.length > 1
      && candidateHasStartedDelivery(db, candidates.map(candidate => candidate.id))
    ) {
      const conflict = 'native_merge_started_delivery';
      for (const candidate of candidates) {
        db.prepare(`
          UPDATE conversations
          SET data_conflict = ?, version = version + 1, updated_at = ?
          WHERE id = ? AND coalesce(data_conflict, '') <> ?
        `).run(conflict, changedAt, candidate.id, conflict);
      }
      return {
        conflict: true,
        conversation: mappedConversation(
          db.prepare('SELECT * FROM conversations WHERE id = ?').get(candidates[0].id),
        ),
      };
    }

    const target = candidates[0];
    const movedFromIds = new Set(selectedRows
      .map(row => Number(row.conversation_id))
      .filter(id => id !== target.id));
    let changed = splitCreated;
    if (uniqueEmailIds.length > 0) {
      const placeholders = uniqueEmailIds.map(() => '?').join(', ');
      const update = db.prepare(`
        UPDATE emails SET conversation_id = ?
        WHERE organization_id = ? AND id IN (${placeholders})
          AND conversation_id <> ?
      `).run(target.id, organizationId, ...uniqueEmailIds, target.id);
      changed ||= Number(update.changes) > 0;
    }

    for (const candidate of candidates.slice(1)) {
      const remaining = Number(db.prepare(`
        SELECT count(*) AS count FROM emails WHERE conversation_id = ?
      `).get(candidate.id).count);
      if (remaining > 0) {
        if (movedFromIds.has(candidate.id)) {
          refreshConversationState(db, candidate.id, {
            assigneeId: candidate.rank.assigneeId,
            now: changedAt,
            incrementVersion: true,
          });
          changed = true;
        }
        continue;
      }
      moveUnstartedDeliveries(db, candidate.id, target.id);
      db.prepare(`
        UPDATE conversation_sources SET conversation_id = ?, updated_at = ?
        WHERE conversation_id = ?
      `).run(target.id, changedAt, candidate.id);
      if (existingSource?.conversation_id === candidate.id) {
        existingSource.conversation_id = target.id;
      }
      db.prepare('DELETE FROM conversations WHERE id = ?').run(candidate.id);
      changed = true;
    }

    const sourceAfterMoves = db.prepare(`
      SELECT * FROM conversation_sources
      WHERE organization_id = ? AND mailbox_identity_id = ? AND provider = ?
        AND normalized_mailbox = ? COLLATE NOCASE
        AND native_conversation_id = ?
    `).get(
      organizationId,
      mailboxIdentityId,
      provider,
      mailboxAddress,
      nativeConversationId,
    );
    if (sourceAfterMoves) {
      if (
        Number(sourceAfterMoves.conversation_id) !== target.id
        || Number(sourceAfterMoves.last_resolved_connection_id) !== connectionId
      ) {
        db.prepare(`
          UPDATE conversation_sources
          SET conversation_id = ?, last_resolved_connection_id = ?, updated_at = ?
          WHERE id = ?
        `).run(target.id, connectionId, changedAt, sourceAfterMoves.id);
        changed = true;
      }
    } else {
      db.prepare(`
        INSERT INTO conversation_sources
          (organization_id, conversation_id, mailbox_identity_id,
           last_resolved_connection_id, provider, normalized_mailbox,
           native_conversation_id, fallback_key, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
      `).run(
        organizationId,
        target.id,
        mailboxIdentityId,
        connectionId,
        provider,
        mailboxAddress,
        nativeConversationId,
        changedAt,
        changedAt,
      );
      changed = true;
    }

    if (changed && !splitCreated) {
      refreshConversationState(db, target.id, {
        assigneeId: target.rank.assigneeId,
        now: changedAt,
        incrementVersion: true,
      });
    }
    return {
      conflict: false,
      conversation: mappedConversation(
        db.prepare('SELECT * FROM conversations WHERE id = ?').get(target.id),
      ),
    };
  });

  // A conflict is a committed, non-destructive resolution. Throwing here would let an
  // enclosing mailbox transaction roll back both the marker and its sync cursor.
  return result.conversation;
}

export function bindConversationSource(db, options = {}) {
  const emailIds = options.emailIds ?? (options.emailId ? [options.emailId] : []);
  return backfillNativeConversation(db, { ...options, emailIds });
}
