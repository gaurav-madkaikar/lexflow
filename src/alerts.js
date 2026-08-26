import { getWorkspaceSettings } from './workspace.js';
import { backfillLegacyConversations } from './canonical-conversations.js';
import { deriveThreadKey } from './conversations.js';

const REPEAT_MS = 60 * 60 * 1000;

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

function ensureCanonicalThreadKeys(db) {
  const emails = db.prepare(`
    SELECT id, provider_id, provider, mailbox_address, subject
    FROM emails
    WHERE conversation_id IS NULL AND trim(coalesce(thread_key, '')) = ''
    ORDER BY id
  `).all();
  const update = db.prepare('UPDATE emails SET thread_key = ? WHERE id = ?');
  for (const email of emails) {
    update.run(deriveThreadKey({
      provider: email.provider,
      mailboxAddress: email.mailbox_address,
      subject: email.subject,
      providerId: email.provider_id,
    }), email.id);
  }
}

export function evaluateOverdueAlerts({ db, now = new Date() }) {
  return runTransaction(db, () => {
    ensureCanonicalThreadKeys(db);
    backfillLegacyConversations(db, { now });
    let created = 0;
    const organizations = db.prepare(`
      SELECT organization_id FROM workspace_settings ORDER BY organization_id
    `).all();
    for (const workspace of organizations) {
      const organizationId = Number(workspace.organization_id);
      const settings = getWorkspaceSettings(db, organizationId);
      const notifiedAt = now.toISOString();
      const nowMs = now.getTime();
      const adminIds = db.prepare(`
      SELECT id FROM users
      WHERE organization_id = ? AND role = 'admin' AND registration_status = 'active'
      ORDER BY id
    `).all(organizationId).map(row => Number(row.id));
      const unassigned = db.prepare(`
      SELECT current.*
      FROM emails AS current
      JOIN conversations
        ON conversations.id = current.conversation_id
       AND conversations.organization_id = current.organization_id
      WHERE current.organization_id = ?
        AND conversations.completion_state = 'unassigned'
        AND datetime(current.received_at, '+' || ? || ' hours') <= datetime(?)
        AND NOT EXISTS (
          SELECT 1 FROM emails AS newer
          WHERE newer.organization_id = current.organization_id
            AND newer.conversation_id = current.conversation_id
            AND (
              julianday(newer.received_at) > julianday(current.received_at)
              OR (
                julianday(newer.received_at) = julianday(current.received_at)
                AND newer.id > current.id
              )
            )
        )
    `).all(organizationId, settings.timeUnassignedHours, notifiedAt);
      const assigned = db.prepare(`
      SELECT current.*,
             conversations.current_assignee_id AS canonical_assignee_id
      FROM emails AS current
      JOIN conversations
        ON conversations.id = current.conversation_id
       AND conversations.organization_id = current.organization_id
      WHERE current.organization_id = ?
        AND conversations.completion_state = 'assigned'
        AND conversations.current_assignee_id IS NOT NULL
        AND current.assigned_at IS NOT NULL
        AND datetime(current.assigned_at, '+' || ? || ' hours') <= datetime(?)
        AND NOT EXISTS (
          SELECT 1 FROM emails AS newer
          WHERE newer.organization_id = current.organization_id
            AND newer.conversation_id = current.conversation_id
            AND (
              julianday(newer.received_at) > julianday(current.received_at)
              OR (
                julianday(newer.received_at) = julianday(current.received_at)
                AND newer.id > current.id
              )
            )
        )
    `).all(organizationId, settings.timeAssignedUnmarkedHours, notifiedAt);
      const lastDelivery = db.prepare(`
      SELECT last_notified_at FROM alert_deliveries
      WHERE organization_id = ? AND email_id = ? AND user_id = ? AND kind = ?
    `);
      const refreshNotification = db.prepare(`
      UPDATE notifications
      SET message = ?, read_at = NULL, created_at = ?
      WHERE organization_id = ? AND user_id = ? AND email_id = ? AND kind = ?
    `);
      const insertNotification = db.prepare(`
      INSERT INTO notifications
        (organization_id, user_id, email_id, kind, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
      const saveDelivery = db.prepare(`
      INSERT INTO alert_deliveries
        (organization_id, email_id, user_id, kind, last_notified_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(organization_id, email_id, user_id, kind)
      DO UPDATE SET last_notified_at = excluded.last_notified_at
    `);

      function deliver(email, userId, kind, message) {
        const prior = lastDelivery.get(organizationId, email.id, userId, kind);
        if (prior) {
          const priorMs = new Date(prior.last_notified_at).getTime();
          if (Number.isFinite(priorMs) && nowMs - priorMs < REPEAT_MS) return;
        }
        const refreshed = refreshNotification.run(
          message,
          notifiedAt,
          organizationId,
          userId,
          email.id,
          kind,
        );
        if (refreshed.changes === 0) {
          insertNotification.run(organizationId, userId, email.id, kind, message, notifiedAt);
        }
        saveDelivery.run(organizationId, email.id, userId, kind, notifiedAt);
        created += 1;
      }

      for (const email of unassigned) {
        const message = `Unassigned for over ${settings.timeUnassignedHours} hour(s): ${email.subject}`;
        for (const adminId of adminIds) {
          deliver(email, adminId, 'unassigned_overdue', message);
        }
      }

      for (const email of assigned) {
        const message = `Not completed after ${settings.timeAssignedUnmarkedHours} hour(s): ${email.subject}`;
        const recipients = new Set([...adminIds, Number(email.canonical_assignee_id)]);
        for (const userId of recipients) {
          if (userId) deliver(email, userId, 'assigned_overdue', message);
        }
      }

      db.prepare(`
      DELETE FROM alert_deliveries
      WHERE organization_id = ?
        AND kind = 'unassigned_overdue'
        AND NOT EXISTS (
          SELECT 1 FROM emails
          JOIN conversations
            ON conversations.id = emails.conversation_id
           AND conversations.organization_id = emails.organization_id
          WHERE emails.id = alert_deliveries.email_id
            AND emails.organization_id = alert_deliveries.organization_id
            AND conversations.completion_state = 'unassigned'
            AND NOT EXISTS (
              SELECT 1 FROM emails AS newer
              WHERE newer.organization_id = emails.organization_id
                AND newer.conversation_id = emails.conversation_id
                AND (
                  julianday(newer.received_at) > julianday(emails.received_at)
                  OR (
                    julianday(newer.received_at) = julianday(emails.received_at)
                    AND newer.id > emails.id
                  )
                )
            )
        )
      `).run(organizationId);
      db.prepare(`
      DELETE FROM alert_deliveries
      WHERE organization_id = ?
        AND kind = 'assigned_overdue'
        AND NOT EXISTS (
          SELECT 1 FROM emails
          JOIN conversations
            ON conversations.id = emails.conversation_id
           AND conversations.organization_id = emails.organization_id
          WHERE emails.id = alert_deliveries.email_id
            AND emails.organization_id = alert_deliveries.organization_id
            AND conversations.completion_state = 'assigned'
            AND conversations.current_assignee_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM emails AS newer
              WHERE newer.organization_id = emails.organization_id
                AND newer.conversation_id = emails.conversation_id
                AND (
                  julianday(newer.received_at) > julianday(emails.received_at)
                  OR (
                    julianday(newer.received_at) = julianday(emails.received_at)
                    AND newer.id > emails.id
                  )
                )
            )
        )
      `).run(organizationId);
    }

    return { created };
  });
}

export function createAlertRunner({
  db,
  clock = () => new Date(),
  evaluate = evaluateOverdueAlerts,
}) {
  let inFlight = null;
  return {
    run() {
      if (inFlight) return inFlight;
      inFlight = Promise.resolve()
        .then(() => evaluate({ db, now: clock() }))
        .finally(() => {
          inFlight = null;
        });
      return inFlight;
    },
  };
}
