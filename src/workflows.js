import { randomUUID } from 'node:crypto';
import {
  attachEmailToConversation,
  recomputeConversationAttachmentState,
  updateConversationAssignment,
  updateConversationCompletion,
} from './conversations.js';
import { departmentHeadRecipient } from './department-access.js';
import {
  finishGraphRun,
  interruptOpenGraphRuns,
  recordRuleAssignment,
  recordTaskEvent,
  startGraphRun,
} from './reporting-events.js';

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

function scopedStateKey(key, organizationId = 1) {
  return Number(organizationId) === 1 ? key : `organization:${organizationId}:${key}`;
}

function setSyncState(db, key, value, organizationId = 1) {
  db.prepare(`
    INSERT INTO sync_state (key, value, organization_id) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(scopedStateKey(key, organizationId), value, organizationId);
}

function asMailMessage(row, conversation = null) {
  return {
    subject: row.subject,
    preview: row.preview,
    senderName: row.sender_name,
    senderAddress: row.sender_address,
    hasAttachments: Boolean(conversation?.has_attachments ?? row.has_attachments),
  };
}

function recordAssignment(db, {
  email,
  assignee,
  actorId = null,
  assignedAt,
  allowReassignment = false,
  organizationId = 1,
  assignmentSource = 'manual',
  conversationSource = assignmentSource,
  reopened = false,
  rule = null,
}) {
  const eligibleStatus = allowReassignment
    ? "status IN ('unassigned', 'assigned')"
    : "status = 'unassigned'";
  const updated = db.prepare(`
    UPDATE emails
    SET status = 'assigned', assignee_id = ?, assigned_at = ?
    WHERE id = ? AND organization_id = ? AND ${eligibleStatus}
  `).run(assignee.id, assignedAt, email.id, organizationId);
  if (updated.changes !== 1) return false;

  if (email.assignee_id) {
    db.prepare(`
      DELETE FROM notifications
      WHERE organization_id = ? AND user_id = ? AND email_id = ? AND kind = 'assignment'
    `).run(organizationId, email.assignee_id, email.id);
    db.prepare(`
      DELETE FROM notifications
      WHERE organization_id = ? AND email_id = ? AND kind = 'assigned_overdue'
    `).run(organizationId, email.id);
    db.prepare(`
      DELETE FROM alert_deliveries
      WHERE organization_id = ? AND email_id = ? AND kind = 'assigned_overdue'
    `).run(organizationId, email.id);
  }
  db.prepare(`
    DELETE FROM alert_deliveries
      WHERE organization_id = ? AND email_id = ? AND kind = 'unassigned_overdue'
    `).run(organizationId, email.id);
  db.prepare(`
      INSERT INTO notifications
      (user_id, email_id, kind, message, created_at, organization_id)
    VALUES (?, ?, 'assignment', ?, ?, ?)
  `).run(
    assignee.id,
    email.id,
    `${reopened ? 'Reopened assignment' : 'New assignment'}: ${email.subject}`,
    assignedAt,
    organizationId,
  );

  const previous = email.assignee_id
    ? db.prepare('SELECT name FROM users WHERE id = ?').get(email.assignee_id)
    : null;
  const department = email.department_id
    ? db.prepare('SELECT name FROM departments WHERE id = ? AND organization_id = ?')
      .get(email.department_id, organizationId)
    : null;
  const taskEventId = recordTaskEvent(db, {
    organizationId,
    departmentId: email.department_id,
    emailId: email.id,
    actorId,
    assigneeId: assignee.id,
    previousAssigneeId: email.assignee_id,
    eventType: email.assignee_id ? 'reassigned' : 'assigned',
    assignmentSource,
    departmentNameSnapshot: department?.name ?? null,
    assigneeNameSnapshot: assignee.name,
    previousAssigneeNameSnapshot: previous?.name ?? null,
    receivedAt: email.received_at,
    occurredAt: assignedAt,
  });
  if (assignmentSource === 'rule' && rule) {
    recordRuleAssignment(db, {
      taskEventId,
      organizationId,
      departmentId: email.department_id,
      ruleId: rule.id,
      assigneeId: assignee.id,
      ruleNameSnapshot: rule.name,
      departmentNameSnapshot: department?.name ?? null,
      assigneeNameSnapshot: assignee.name,
      prioritySnapshot: rule.priority,
      occurredAt: assignedAt,
    });
  }
  if (email.conversation_id != null) {
    updateConversationAssignment(db, {
      conversationId: Number(email.conversation_id),
      assigneeId: Number(assignee.id),
      source: conversationSource,
      ruleId: assignmentSource === 'rule' ? rule?.id ?? null : null,
      startedAt: assignedAt,
    });
  }
  const message = reopened
    ? `Reopened "${email.subject}" for ${assignee.name}`
    : previous
    ? `Reassigned "${email.subject}" from ${previous.name} to ${assignee.name}`
    : `Assigned "${email.subject}" to ${assignee.name}`;
  db.prepare(`
    INSERT INTO activity
      (actor_id, email_id, kind, message, created_at, organization_id, department_id)
    VALUES (?, ?, 'assigned', ?, ?, ?, ?)
  `).run(actorId, email.id, message, assignedAt, organizationId, email.department_id);
  return true;
}

function assignEmailByRule(db, email, rule, assignedAt, organizationId = 1, reopened = false) {
  const assignee = db.prepare(`
    SELECT * FROM users
    WHERE id = ? AND organization_id = ? AND department_id = ?
      AND role = 'member' AND account_status = 'active'
  `).get(rule.assignee_id, organizationId, email.department_id);
  if (!assignee) return false;
  return recordAssignment(db, {
    email,
    assignee,
    assignedAt,
    organizationId,
    allowReassignment: false,
    assignmentSource: 'rule',
    reopened,
    rule,
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
        const attachmentMatch = Boolean(rule.has_attachments) === Boolean(message.hasAttachments);
        return keywordsMatch && senderMatch && attachmentMatch;
      }) ?? null
  );
}

export async function syncMailbox({ db, source }) {
  if (source.isCurrentConnection?.() === false) {
    return { imported: 0, assigned: 0, skipped: true, skipReason: 'connection_changed' };
  }
  const organizationId = Number(source.organizationId ?? 1);
  const departmentId = Number(source.departmentId);
  const organization = db.prepare('SELECT status FROM organizations WHERE id = ?').get(organizationId);
  if (!organization || organization.status !== 'active') {
    return { imported: 0, assigned: 0, skipped: true, skipReason: 'organization_inactive' };
  }
  const cursorKey = source.cursorKey || 'mail_cursor';
  const department = Number.isInteger(departmentId) && departmentId > 0
    ? db.prepare(`
        SELECT id, shared_mailbox
        FROM departments
        WHERE id = ? AND organization_id = ?
      `).get(departmentId, organizationId)
    : null;
  const sourceMailbox = String(source.mailboxAddress ?? '').trim().toLocaleLowerCase();
  if (!department || (sourceMailbox && sourceMailbox !== String(department.shared_mailbox).trim().toLocaleLowerCase())) {
    setSyncState(
      db,
      `last_sync_error:${cursorKey}`,
      'Mailbox source no longer maps to an active department.',
      organizationId,
    );
    return { imported: 0, assigned: 0, skipped: true, skipReason: 'source_invalid' };
  }
  const stateKey = scopedStateKey(cursorKey, organizationId);
  const cursor = db.prepare('SELECT value FROM sync_state WHERE key = ? AND organization_id = ?').get(stateKey, organizationId)?.value ?? null;
  const { messages, nextCursor } = await source.fetchChanges(cursor);

  return runTransaction(db, () => {
    if (source.isCurrentConnection?.() === false) {
      return { imported: 0, assigned: 0, skipped: true, skipReason: 'connection_changed' };
    }
    const rules = db.prepare(`
      SELECT rules.*
      FROM rules
      JOIN users assignee
        ON assignee.id = rules.assignee_id
        AND assignee.organization_id = rules.organization_id
      WHERE rules.organization_id = ? AND rules.department_id = ?
        AND rules.enabled = 1
        AND assignee.department_id = rules.department_id
        AND assignee.role = 'member'
        AND assignee.account_status = 'active'
      ORDER BY rules.priority, rules.id
    `).all(organizationId, departmentId);
    const insertEmail = db.prepare(`
      INSERT OR IGNORE INTO emails
        (provider_id, subject, sender_name, sender_address, preview, received_at,
         outlook_url, provider, mailbox_address, provider_conversation_id,
         internet_message_id, status, created_at, organization_id, department_id,
         has_attachments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unassigned', ?, ?, ?, ?)
    `);
    const updateEmail = db.prepare(`
      UPDATE emails
      SET subject = ?, sender_name = ?, sender_address = ?, preview = ?, received_at = ?,
          outlook_url = ?, provider = ?, mailbox_address = ?, department_id = ?,
          has_attachments = ?
      WHERE provider_id = ? AND organization_id = ?
    `);
    const findEmail = db.prepare('SELECT * FROM emails WHERE provider_id = ? AND organization_id = ?');
    const now = new Date().toISOString();
    let imported = 0;
    let assigned = 0;

    for (const message of messages) {
      const provider = message.provider || source.provider || 'outlook';
      const mailboxAddress = message.mailboxAddress || source.mailboxAddress || null;
      const webUrl = message.webUrl ?? message.outlookUrl ?? null;
      const insertion = insertEmail.run(
        message.providerId,
        message.subject,
        message.senderName,
        message.senderAddress,
        message.preview,
        message.receivedAt,
        webUrl,
        provider,
        mailboxAddress,
        message.conversationId ?? null,
        message.internetMessageId ?? null,
        now,
        organizationId,
        departmentId,
        message.hasAttachments === true ? 1 : 0,
      );

      if (insertion.changes === 0) {
        updateEmail.run(
          message.subject,
          message.senderName,
          message.senderAddress,
          message.preview,
          message.receivedAt,
          webUrl,
          provider,
          mailboxAddress,
          departmentId,
          message.hasAttachments === true ? 1 : 0,
          message.providerId,
          organizationId,
        );
        const existing = findEmail.get(message.providerId, organizationId);
        if (existing?.conversation_id != null) {
          recomputeConversationAttachmentState(db, existing.conversation_id);
        }
        continue;
      }

      imported += 1;
      let email = findEmail.get(message.providerId, organizationId);
      const attached = attachEmailToConversation(db, email.id);
      email = findEmail.get(message.providerId, organizationId);
      if (attached.created) {
        const rule = matchRule(asMailMessage(email, attached.conversation), rules);
        if (rule && assignEmailByRule(db, email, rule, now, organizationId)) assigned += 1;
        continue;
      }
      if (attached.conversation.status !== 'completed') continue;

      db.prepare(`
        UPDATE emails SET status = 'unassigned', assignee_id = NULL,
          assigned_at = NULL, completed_by = NULL, completed_at = NULL
        WHERE id = ?
      `).run(email.id);
      email = findEmail.get(message.providerId, organizationId);
      const previous = attached.conversation.assignee_id == null ? null : db.prepare(`
        SELECT * FROM users
        WHERE id = ? AND organization_id = ? AND department_id = ?
          AND role = 'member' AND account_status = 'active'
      `).get(attached.conversation.assignee_id, organizationId, departmentId);
      if (previous && recordAssignment(db, {
        email, assignee: previous, assignedAt: now, organizationId,
        assignmentSource: 'manual', conversationSource: 'reopen_previous', reopened: true,
      })) {
        assigned += 1;
        continue;
      }
      const rule = matchRule(asMailMessage(email, attached.conversation), rules);
      if (rule && assignEmailByRule(db, email, rule, now, organizationId, true)) {
        assigned += 1;
        continue;
      }
      db.prepare(`
        UPDATE conversations
        SET status = 'unassigned', assignee_id = NULL, completed_at = NULL,
            version = version + 1, updated_at = ?
        WHERE id = ?
      `).run(now, attached.conversation.id);
      db.prepare(`
        UPDATE emails SET status = 'unassigned', assignee_id = NULL,
          assigned_at = NULL, completed_by = NULL, completed_at = NULL
        WHERE conversation_id = ?
      `).run(attached.conversation.id);
      const head = departmentHeadRecipient(db, { organizationId, departmentId });
      if (head) db.prepare(`
        INSERT INTO notifications (user_id, email_id, kind, message, created_at, organization_id)
        VALUES (?, ?, 'assignment', ?, ?, ?)
      `).run(head.id, email.id, `Reopened and awaiting assignment: ${email.subject}`, now, organizationId);
    }

    if (nextCursor === null) {
      db.prepare('DELETE FROM sync_state WHERE key = ? AND organization_id = ?').run(stateKey, organizationId);
    } else {
      setSyncState(db, cursorKey, nextCursor, organizationId);
    }
    setSyncState(db, 'last_sync_at', now, organizationId);
    setSyncState(db, `last_sync_at:${cursorKey}`, now, organizationId);
    db.prepare('DELETE FROM sync_state WHERE key = ? AND organization_id = ?').run(scopedStateKey(`last_sync_error:${cursorKey}`, organizationId), organizationId);

    return { imported, assigned };
  });
}

export function createSyncRunner({ db, source, sources, clock = () => new Date() }) {
  let inFlight = null;
  let sequence = 0;
  const runtimeByOrganization = new Map();

  if (db.prepare('SELECT 1 FROM graph_sync_runs WHERE completed_at IS NULL LIMIT 1').get()) {
    interruptOpenGraphRuns(db, clock());
  }

  function timestamp() {
    const value = clock();
    return (value instanceof Date ? value : new Date(value)).toISOString();
  }

  function status(organizationId) {
    const current = runtimeByOrganization.get(Number(organizationId));
    return current ? { ...current } : {
      inProgress: false,
      startedAt: null,
      completedAt: null,
      sequence: 0,
      outcome: null,
    };
  }

  function clearSyncState(key, organizationId) {
    db.prepare('DELETE FROM sync_state WHERE key = ? AND organization_id = ?')
      .run(scopedStateKey(key, organizationId), organizationId);
  }

  async function syncAll(organizationId = null) {
    const available = typeof sources === 'function' ? await sources() : sources;
    const activeSources = (available ?? (source ? [source] : [])).filter(activeSource => (
      activeSource && (organizationId == null || Number(activeSource.organizationId ?? 1) === Number(organizationId))
    ));
    if (activeSources.length === 0) {
      return { imported: 0, assigned: 0, succeeded: 0, failed: 0, skipped: 0, sources: [] };
    }

    const runSequence = ++sequence;
    const startedAt = timestamp();
    const organizationIds = [...new Set(activeSources.map(activeSource => Number(activeSource.organizationId ?? 1)))];
    const graphRuns = new Map();
    for (const activeOrganizationId of organizationIds) {
      runtimeByOrganization.set(activeOrganizationId, {
        ...status(activeOrganizationId),
        inProgress: true,
        startedAt,
        sequence: runSequence,
      });
      const outlookSources = activeSources.filter(activeSource => (
        Number(activeSource.organizationId ?? 1) === activeOrganizationId
        && (activeSource.provider || 'mailbox') === 'outlook'
      ));
      if (outlookSources.length) {
        const runId = randomUUID();
        const departments = outlookSources.map(activeSource => ({
          departmentId: activeSource.departmentId ?? null,
          departmentName: activeSource.departmentId
            ? db.prepare('SELECT name FROM departments WHERE id = ? AND organization_id = ?')
              .get(activeSource.departmentId, activeOrganizationId)?.name ?? null
            : null,
          mailbox: activeSource.mailboxAddress || 'outlook',
          startedAt,
        }));
        startGraphRun(db, { runId, organizationId: activeOrganizationId, startedAt, departments });
        graphRuns.set(activeOrganizationId, { runId, outcomes: [] });
      }
    }

    const settled = await Promise.allSettled(
      activeSources.map((activeSource) => syncMailbox({ db, source: activeSource })),
    );
    const summary = {
      imported: 0,
      assigned: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      sources: [],
    };
    const organizationResults = new Map(organizationIds.map(activeOrganizationId => [activeOrganizationId, {
      healthy: true,
      hasOutlook: false,
      outlookHealthy: true,
      failedLabels: [],
    }]));

    settled.forEach((outcome, index) => {
      const activeSource = activeSources[index];
      const activeOrganizationId = Number(activeSource.organizationId ?? 1);
      const organizationResult = organizationResults.get(activeOrganizationId);
      const cursorKey = activeSource.cursorKey || 'mail_cursor';
      const provider = activeSource.provider || 'mailbox';
      const account = activeSource.mailboxAddress || null;
      const sourceLabel = account ? `${provider} (${account})` : provider;
      const isOutlook = provider === 'outlook';
      if (isOutlook) organizationResult.hasOutlook = true;
      const graphRun = isOutlook ? graphRuns.get(activeOrganizationId) : null;

      if (outcome.status === 'fulfilled') {
        if (outcome.value.skipped) {
          const safelySkipped = outcome.value.skipReason === 'connection_changed'
            || activeSource.isCurrentConnection?.() === false;
          summary.skipped += 1;
          summary.sources.push({ provider, account, skipped: true });
          graphRun?.outcomes.push({
            mailbox: account || 'outlook',
            completedAt: null,
            outcome: safelySkipped ? 'skipped_connection_changed' : 'failed',
            failureCategory: safelySkipped ? null : (outcome.value.skipReason || 'source_invalid'),
          });
          if (!safelySkipped) {
            organizationResult.healthy = false;
            if (isOutlook) organizationResult.outlookHealthy = false;
            organizationResult.failedLabels.push(sourceLabel);
          }
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
        graphRun?.outcomes.push({
          mailbox: account || 'outlook',
          completedAt: null,
          outcome: 'success',
          failureCategory: null,
        });
        return;
      }

      if (activeSource.isCurrentConnection?.() === false) {
        summary.skipped += 1;
        summary.sources.push({ provider, account, skipped: true });
        graphRun?.outcomes.push({
          mailbox: account || 'outlook',
          completedAt: null,
          outcome: 'skipped_connection_changed',
          failureCategory: null,
        });
        return;
      }

      const safeMessage = sanitizeError(outcome.reason);
      summary.failed += 1;
      summary.sources.push({ provider, account, error: safeMessage });
      organizationResult.healthy = false;
      if (isOutlook) organizationResult.outlookHealthy = false;
      organizationResult.failedLabels.push(sourceLabel);
      graphRun?.outcomes.push({
        mailbox: account || 'outlook',
        completedAt: null,
        outcome: 'failed',
        failureCategory: 'source_failed',
      });
      setSyncState(db, `last_sync_error:${cursorKey}`, safeMessage, activeOrganizationId);
    });

    const completedAt = timestamp();
    for (const [activeOrganizationId, result] of organizationResults) {
      if (result.healthy) {
        clearSyncState('last_sync_error', activeOrganizationId);
      } else {
        const failedSources = result.failedLabels.join(', ') || 'configured mailboxes';
        setSyncState(db, 'last_sync_error', `Sync needs attention: ${failedSources}.`, activeOrganizationId);
      }
      if (result.hasOutlook) {
        if (result.outlookHealthy) {
          setSyncState(db, 'outlook:last_success_at', completedAt, activeOrganizationId);
          clearSyncState('outlook:last_error', activeOrganizationId);
        } else {
          setSyncState(
            db,
            'outlook:last_error',
            'Microsoft Graph synchronization needs attention.',
            activeOrganizationId,
          );
        }
        const graphRun = graphRuns.get(activeOrganizationId);
        if (graphRun) {
          const graphOutcome = graphRun.outcomes.some(item => item.outcome === 'failed')
            ? 'failed'
            : graphRun.outcomes.some(item => item.outcome === 'success')
              ? 'success'
              : 'skipped_connection_changed';
          finishGraphRun(db, {
            runId: graphRun.runId,
            completedAt,
            outcome: graphOutcome,
            failureCategory: graphOutcome === 'failed' ? 'source_failed' : null,
            departmentOutcomes: graphRun.outcomes.map(item => ({ ...item, completedAt })),
          });
        }
      }
      runtimeByOrganization.set(activeOrganizationId, {
        inProgress: false,
        startedAt,
        completedAt,
        sequence: runSequence,
        outcome: result.healthy ? 'success' : 'error',
      });
    }

    if (summary.succeeded === 0 && summary.failed > 0) {
      const error = workflowError(502, 'SYNC_FAILED', 'All configured mailboxes failed to sync.');
      error.result = summary;
      throw error;
    }
    return summary;
  }

  function run(organizationId = null) {
    if (inFlight) return inFlight;
    inFlight = syncAll(organizationId)
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  }

  return { run, status };
}

export function applyRuleToUnassigned(
  db,
  ruleId,
  organizationId = 1,
  departmentId = null,
  nowValue = new Date(),
) {
  return runSavepoint(db, () => {
    const rule = db.prepare(`
      SELECT * FROM rules
      WHERE id = ? AND organization_id = ? AND department_id = ? AND enabled = 1
    `).get(ruleId, organizationId, departmentId);
    if (!rule) return { assigned: 0 };

    const emails = db.prepare(`
      SELECT emails.*, conversations.has_attachments AS conversation_has_attachments
      FROM emails
      LEFT JOIN conversations ON conversations.id = emails.conversation_id
      WHERE emails.organization_id = ? AND emails.department_id = ? AND emails.status = 'unassigned'
      ORDER BY emails.id
    `).all(organizationId, departmentId);
    const now = (nowValue instanceof Date ? nowValue : new Date(nowValue)).toISOString();
    let assigned = 0;
    for (const email of emails) {
      if (matchRule(asMailMessage(email, {
        has_attachments: email.conversation_has_attachments ?? email.has_attachments,
      }), [rule]) && assignEmailByRule(db, email, rule, now, organizationId)) {
        assigned += 1;
      }
    }
    return { assigned };
  });
}

export function assignEmailManually({
  db,
  emailId,
  assigneeId,
  actorId,
  adminId,
  organizationId = 1,
  departmentId,
  now = new Date(),
}) {
  return runTransaction(db, () => {
    const assignedAt = now.toISOString();
    const assigningUserId = actorId ?? adminId;
    const email = db.prepare(`
      SELECT * FROM emails
      WHERE id = ? AND organization_id = ? AND department_id = ?
    `).get(emailId, organizationId, departmentId);
    const assignee = db.prepare(`
      SELECT * FROM users
      WHERE id = ? AND organization_id = ? AND department_id = ?
        AND role = 'member' AND account_status = 'active'
    `).get(assigneeId, organizationId, departmentId);
    const department = db.prepare(`
      SELECT id FROM departments
      WHERE id = ? AND organization_id = ? AND head_user_id = ?
    `).get(departmentId, organizationId, assigningUserId);

    if (!email) throw workflowError(404, 'NOT_FOUND', 'Email not found.');
    if (!assignee) throw workflowError(404, 'NOT_FOUND', 'Team member not found.');
    if (!department) throw workflowError(403, 'FORBIDDEN', 'Department administrator access is required.');
    if (email.status === 'completed') {
      throw workflowError(409, 'CONFLICT', 'Completed emails cannot be reassigned.');
    }
    if (Number(email.assignee_id) === Number(assigneeId)) {
      return { changed: false, email };
    }

    const changed = recordAssignment(db, {
      email,
      assignee,
      actorId: assigningUserId,
      assignedAt,
      allowReassignment: true,
      organizationId,
      assignmentSource: 'manual',
    });
    if (!changed) {
      throw workflowError(409, 'CONFLICT', 'Email assignment changed. Refresh and try again.');
    }
    return {
      changed: true,
      email: db.prepare('SELECT * FROM emails WHERE id = ? AND organization_id = ?').get(emailId, organizationId),
    };
  });
}

export function completeAssignedEmail({ db, emailId, userId, organizationId = 1, now = new Date() }) {
  return runTransaction(db, () => {
    const completedAt = now.toISOString();
    const update = db.prepare(`
      UPDATE emails
      SET status = 'completed', completed_by = ?, completed_at = ?
      WHERE id = ? AND organization_id = ? AND assignee_id = ? AND status = 'assigned'
    `).run(userId, completedAt, emailId, organizationId, userId);

    if (update.changes === 1) {
      const email = db.prepare('SELECT * FROM emails WHERE id = ? AND organization_id = ?').get(emailId, organizationId);
      if (email.conversation_id != null) {
        updateConversationCompletion(db, {
          conversationId: Number(email.conversation_id), userId: Number(userId), completedAt,
        });
      }
      const actor = db.prepare('SELECT name FROM users WHERE id = ? AND organization_id = ?').get(userId, organizationId);
      const department = email.department_id
        ? db.prepare('SELECT name FROM departments WHERE id = ? AND organization_id = ?')
          .get(email.department_id, organizationId)
        : null;
      recordTaskEvent(db, {
        organizationId,
        departmentId: email.department_id,
        emailId,
        actorId: userId,
        assigneeId: userId,
        eventType: 'completed',
        departmentNameSnapshot: department?.name ?? null,
        assigneeNameSnapshot: actor.name,
        receivedAt: email.received_at,
        occurredAt: completedAt,
      });
      db.prepare(`
        INSERT INTO activity
          (actor_id, email_id, kind, message, created_at, organization_id, department_id)
        VALUES (?, ?, 'completed', ?, ?, ?, ?)
      `).run(
        userId,
        emailId,
        `${actor.name} completed "${email.subject}"`,
        completedAt,
        organizationId,
        email.department_id,
      );
      const head = departmentHeadRecipient(db, {
        organizationId,
        departmentId: email.department_id,
      });
      if (head) {
        db.prepare(`
          INSERT INTO notifications (user_id, email_id, kind, message, created_at, organization_id)
          VALUES (?, ?, 'completion', ?, ?, ?)
        `).run(
          head.id,
          emailId,
          `${actor.name} completed "${email.subject}"`,
          completedAt,
          organizationId,
        );
      }
      db.prepare(`
        DELETE FROM alert_deliveries
        WHERE organization_id = ? AND email_id = ? AND kind = 'assigned_overdue'
      `).run(organizationId, emailId);
      return email;
    }

    const email = db.prepare('SELECT * FROM emails WHERE id = ? AND organization_id = ?').get(emailId, organizationId);
    if (
      email?.status === 'completed' &&
      Number(email.assignee_id) === Number(userId) &&
      Number(email.completed_by) === Number(userId)
    ) {
      return email;
    }

    const error = new Error('This email is not assigned to this user.');
    error.code = 'FORBIDDEN';
    error.status = 403;
    throw error;
  });
}
