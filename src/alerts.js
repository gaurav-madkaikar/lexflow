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

export function evaluateOverdueAlerts({ db, now = new Date() }) {
  return runTransaction(db, () => {
    const settings = getWorkspaceSettings(db);
    const notifiedAt = now.toISOString();
    const nowMs = now.getTime();
    const adminIds = db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id")
      .all().map(row => Number(row.id));
    const unassigned = db.prepare(`
      SELECT * FROM emails
      WHERE status = 'unassigned'
        AND datetime(received_at, '+' || ? || ' hours') <= datetime(?)
    `).all(settings.timeUnassignedHours, notifiedAt);
    const assigned = db.prepare(`
      SELECT * FROM emails
      WHERE status = 'assigned'
        AND assigned_at IS NOT NULL
        AND datetime(assigned_at, '+' || ? || ' hours') <= datetime(?)
    `).all(settings.timeAssignedUnmarkedHours, notifiedAt);
    const lastDelivery = db.prepare(`
      SELECT last_notified_at FROM alert_deliveries
      WHERE email_id = ? AND user_id = ? AND kind = ?
    `);
    const insertNotification = db.prepare(`
      INSERT INTO notifications (user_id, email_id, kind, message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const saveDelivery = db.prepare(`
      INSERT INTO alert_deliveries (email_id, user_id, kind, last_notified_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(email_id, user_id, kind)
      DO UPDATE SET last_notified_at = excluded.last_notified_at
    `);
    let created = 0;

    function deliver(email, userId, kind, message) {
      const prior = lastDelivery.get(email.id, userId, kind);
      if (prior) {
        const priorMs = new Date(prior.last_notified_at).getTime();
        if (Number.isFinite(priorMs) && nowMs - priorMs < REPEAT_MS) return;
      }
      insertNotification.run(userId, email.id, kind, message, notifiedAt);
      saveDelivery.run(email.id, userId, kind, notifiedAt);
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
      const recipients = new Set([...adminIds, Number(email.assignee_id)]);
      for (const userId of recipients) {
        if (userId) deliver(email, userId, 'assigned_overdue', message);
      }
    }

    db.exec(`
      DELETE FROM alert_deliveries
      WHERE kind = 'unassigned_overdue'
        AND NOT EXISTS (
          SELECT 1 FROM emails
          WHERE emails.id = alert_deliveries.email_id
            AND emails.status = 'unassigned'
        );
      DELETE FROM alert_deliveries
      WHERE kind = 'assigned_overdue'
        AND NOT EXISTS (
          SELECT 1 FROM emails
          WHERE emails.id = alert_deliveries.email_id
            AND emails.status = 'assigned'
        );
    `);

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
