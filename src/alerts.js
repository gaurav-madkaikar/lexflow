import { departmentHeadRecipient } from './department-access.js';
import { getWorkspaceSettings } from './workspace.js';

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

export function evaluateOverdueAlerts({ db, now = new Date(), organizationId = 1 }) {
  return runTransaction(db, () => {
    const settings = getWorkspaceSettings(db, organizationId);
    const notifiedAt = now.toISOString();
    const nowMs = now.getTime();
    const unassigned = db.prepare(`
      SELECT * FROM emails
      WHERE organization_id = ? AND status = 'unassigned' AND source_state = 'active'
        AND datetime(received_at, '+' || ? || ' hours') <= datetime(?)
    `).all(organizationId, settings.timeUnassignedHours, notifiedAt);
    const assigned = db.prepare(`
      SELECT * FROM emails
      WHERE organization_id = ? AND status = 'assigned' AND source_state = 'active'
        AND assigned_at IS NOT NULL
        AND datetime(assigned_at, '+' || ? || ' hours') <= datetime(?)
    `).all(organizationId, settings.timeAssignedUnmarkedHours, notifiedAt);
    const lastDelivery = db.prepare(`
      SELECT last_notified_at FROM alert_deliveries
      WHERE organization_id = ? AND email_id = ? AND user_id = ? AND kind = ?
    `);
    const insertNotification = db.prepare(`
      INSERT INTO notifications (user_id, email_id, kind, message, created_at, organization_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const saveDelivery = db.prepare(`
      INSERT INTO alert_deliveries (email_id, user_id, kind, last_notified_at, organization_id)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(email_id, user_id, kind)
      DO UPDATE SET last_notified_at = excluded.last_notified_at
    `);
    let created = 0;

    function deliver(email, userId, kind, message) {
      const prior = lastDelivery.get(organizationId, email.id, userId, kind);
      if (prior) {
        const priorMs = new Date(prior.last_notified_at).getTime();
        if (Number.isFinite(priorMs) && nowMs - priorMs < REPEAT_MS) return;
      }
      insertNotification.run(userId, email.id, kind, message, notifiedAt, organizationId);
      saveDelivery.run(email.id, userId, kind, notifiedAt, organizationId);
      created += 1;
    }

    for (const email of unassigned) {
      const message = `Unassigned for over ${settings.timeUnassignedHours} hour(s): ${email.subject}`;
      const head = departmentHeadRecipient(db, {
        organizationId,
        departmentId: email.department_id,
      });
      if (head) deliver(email, Number(head.id), 'unassigned_overdue', message);
    }

    for (const email of assigned) {
      const message = `Not completed after ${settings.timeAssignedUnmarkedHours} hour(s): ${email.subject}`;
      const head = departmentHeadRecipient(db, {
        organizationId,
        departmentId: email.department_id,
      });
      const recipients = new Set([Number(head?.id), Number(email.assignee_id)]);
      for (const userId of recipients) {
        if (userId) deliver(email, userId, 'assigned_overdue', message);
      }
    }

    db.prepare(`
      DELETE FROM alert_deliveries
      WHERE organization_id = ? AND kind = 'unassigned_overdue'
        AND NOT EXISTS (
          SELECT 1 FROM emails
          WHERE emails.id = alert_deliveries.email_id AND emails.organization_id = ?
            AND emails.status = 'unassigned'
        )
    `).run(organizationId, organizationId);
    db.prepare(`
      DELETE FROM alert_deliveries
      WHERE organization_id = ? AND kind = 'assigned_overdue'
        AND NOT EXISTS (
          SELECT 1 FROM emails
          WHERE emails.id = alert_deliveries.email_id AND emails.organization_id = ?
            AND emails.status = 'assigned'
        )
    `).run(organizationId, organizationId);

    return { created };
  });
}

export function createAlertRunner({
  db,
  clock = () => new Date(),
  evaluate = evaluateOverdueAlerts,
  organizationIds = null,
}) {
  let inFlight = null;
  return {
    run() {
      if (inFlight) return inFlight;
      inFlight = Promise.resolve()
        .then(async () => {
          const ids = typeof organizationIds === 'function' ? await organizationIds() : null;
          if (!Array.isArray(ids)) return evaluate({ db, now: clock() });
          const results = await Promise.all(ids.map(id => evaluate({ db, now: clock(), organizationId: id })));
          return { created: results.reduce((total, result) => total + Number(result?.created ?? 0), 0) };
        })
        .finally(() => {
          inFlight = null;
        });
      return inFlight;
    },
  };
}
