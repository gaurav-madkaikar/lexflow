import { randomUUID } from 'node:crypto';

const CLAIM_MS = 2 * 60 * 1000;
const MAX_BATCH = 20;
const MAX_ATTEMPTS = 8;

function transaction(db, operation) {
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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function cleanSubject(value) {
  const subject = String(value ?? '(No subject)').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return subject.slice(0, 180) || '(No subject)';
}

function priorityLabel(priority) {
  return new Map([[10, 'Critical'], [20, 'High'], [30, 'Medium'], [40, 'Low']]).get(Number(priority)) ?? 'Medium';
}

function elapsedLabel(startedAt, now) {
  const hours = Math.max(0, Math.floor((now.getTime() - new Date(startedAt).getTime()) / 3_600_000));
  const days = Math.floor(hours / 24);
  return days ? `${days} day${days === 1 ? '' : 's'} ${hours % 24} hour${hours % 24 === 1 ? '' : 's'}` : `${hours} hour${hours === 1 ? '' : 's'}`;
}

function timestamp(value, timezone) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium', timeStyle: 'short', hour12: true, timeZone: timezone || 'Asia/Kolkata',
    }).format(new Date(value));
  } catch {
    return new Date(value).toISOString();
  }
}

function bodyFor(row, now) {
  const field = (label, value) => `<tr><th style="text-align:left;padding:0 16px 8px 0;color:#5f5f5f;font-weight:600">${escapeHtml(label)}</th><td style="padding:0 0 8px">${escapeHtml(value)}</td></tr>`;
  return `<div style="font-family:Arial,sans-serif;color:#171717;line-height:1.5">
    <p>This is an automated LexFlow escalation for incomplete shared-mailbox work.</p>
    <table role="presentation" cellspacing="0" cellpadding="0">
      ${field('Escalation level', `Order ${row.level}`)}
      ${field('Task', cleanSubject(row.subject))}
      ${field('Department', row.department_name)}
      ${field('Shared mailbox', row.shared_mailbox)}
      ${field('Assigned member', `${row.assignee_name} (${row.assignee_email})`)}
      ${field('Priority', priorityLabel(row.priority))}
      ${field('Assigned at', timestamp(row.started_at, row.timezone))}
      ${field('Incomplete for', elapsedLabel(row.started_at, now))}
    </table>
  </div>`;
}

function retryAt(now, attempt, retryAfterMs = null, blocked = false) {
  if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) return new Date(now.getTime() + retryAfterMs).toISOString();
  const base = blocked ? 60 * 60_000 : 60_000;
  const delay = Math.min(60 * 60_000, base * (2 ** Math.max(0, attempt - 1)));
  return new Date(now.getTime() + delay).toISOString();
}

function sanitizedError(error) {
  return String(error?.message ?? 'Escalation delivery failed.')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/(client_secret|access_token|refresh_token|token)\s*[:=]\s*[^\s,}]+/gi, '$1=[redacted]')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300) || 'Escalation delivery failed.';
}

function failureKind(error) {
  const status = Number(error?.status ?? error?.graphStatus);
  if ([401, 403].includes(status) || /^OUTLOOK_(NOT_CONNECTED|NOT_CONFIGURED|TOKEN_FAILED)$/u.test(error?.code ?? '')) return 'blocked';
  return 'failed';
}

function retryAfter(error) {
  const seconds = Number(error?.retryAfterSeconds);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
}

function cancelObsolete(db, organizationId, now) {
  db.prepare(`
    UPDATE escalation_deliveries
    SET state = 'cancelled', claim_token = NULL, claim_expires_at = NULL, updated_at = ?
    WHERE organization_id = ? AND state IN ('pending', 'processing', 'failed', 'blocked')
      AND NOT EXISTS (
        SELECT 1 FROM assignment_cycles cycles
        JOIN conversations ON conversations.id = cycles.conversation_id
        JOIN organizations ON organizations.id = cycles.organization_id
        WHERE cycles.id = escalation_deliveries.assignment_cycle_id
          AND cycles.completed_at IS NULL AND cycles.superseded_at IS NULL
          AND conversations.status = 'assigned' AND conversations.assignee_id = cycles.assignee_id
          AND organizations.status = 'active'
          AND EXISTS (SELECT 1 FROM emails WHERE emails.conversation_id = conversations.id AND emails.source_state = 'active')
      )
  `).run(now.toISOString(), organizationId);
}

function claimDueDeliveries(db, organizationId, now) {
  return transaction(db, () => {
    cancelObsolete(db, organizationId, now);
    const settings = db.prepare(`SELECT escalation_interval_hours FROM workspace_settings WHERE organization_id = ? ORDER BY id LIMIT 1`).get(organizationId);
    if (!settings) return [];
    const cycles = db.prepare(`
      SELECT cycles.*, conversations.subject, conversations.status AS conversation_status,
        conversations.assignee_id AS conversation_assignee_id, organizations.status AS organization_status
      FROM assignment_cycles cycles
      JOIN conversations ON conversations.id = cycles.conversation_id
      JOIN organizations ON organizations.id = cycles.organization_id
      WHERE cycles.organization_id = ? AND cycles.completed_at IS NULL AND cycles.superseded_at IS NULL
        AND conversations.status = 'assigned' AND conversations.assignee_id = cycles.assignee_id
        AND organizations.status = 'active'
        AND EXISTS (SELECT 1 FROM emails WHERE emails.conversation_id = conversations.id AND emails.source_state = 'active')
      ORDER BY cycles.started_at, cycles.id
      LIMIT ?
    `).all(organizationId, MAX_BATCH);
    const claimed = [];
    const nowIso = now.toISOString();
    for (const cycle of cycles) {
      const prior = db.prepare(`
        SELECT level, sent_at FROM escalation_deliveries
        WHERE assignment_cycle_id = ? AND state = 'sent'
        ORDER BY level DESC LIMIT 1
      `).get(cycle.id);
      const level = Number(prior?.level ?? 0) + 1;
      const recipient = db.prepare(`
        SELECT email FROM escalation_recipients
        WHERE organization_id = ? AND department_id = ? AND position = ?
      `).get(organizationId, cycle.department_id, level);
      if (!recipient) continue;
      const origin = prior?.sent_at ?? cycle.started_at;
      const dueAt = new Date(new Date(origin).getTime() + Number(settings.escalation_interval_hours) * 3_600_000);
      if (!Number.isFinite(dueAt.getTime()) || dueAt > now) continue;
      const existing = db.prepare(`SELECT * FROM escalation_deliveries WHERE assignment_cycle_id = ? AND level = ?`).get(cycle.id, level);
      if (existing?.state === 'sent' || existing?.state === 'cancelled') continue;
      if (
        existing?.failure_category === 'recipient_bounce'
        && String(existing.recipient_email).toLocaleLowerCase() === String(recipient.email).toLocaleLowerCase()
        && !existing.next_attempt_at
      ) continue;
      if (existing?.state === 'processing' && new Date(existing.claim_expires_at).getTime() > now.getTime()) continue;
      if (existing?.next_attempt_at && new Date(existing.next_attempt_at).getTime() > now.getTime()) continue;
      const token = randomUUID();
      const expiry = new Date(now.getTime() + CLAIM_MS).toISOString();
      if (existing) {
        db.prepare(`
          UPDATE escalation_deliveries
          SET state = 'processing', recipient_email = ?, claim_token = ?, claim_expires_at = ?,
              last_attempt_at = ?, attempt_count = attempt_count + 1, updated_at = ?
          WHERE id = ?
        `).run(recipient.email, token, expiry, nowIso, nowIso, existing.id);
        claimed.push({ id: Number(existing.id), claimToken: token });
      } else {
        const result = db.prepare(`
          INSERT INTO escalation_deliveries
            (organization_id, department_id, conversation_id, assignment_cycle_id, level,
             recipient_email, delivery_key, state, attempt_count, claim_token, claim_expires_at,
             last_attempt_at, next_attempt_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'processing', 1, ?, ?, ?, ?, ?, ?)
        `).run(organizationId, cycle.department_id, cycle.conversation_id, cycle.id, level,
          recipient.email, randomUUID(), token, expiry, nowIso, nowIso, nowIso, nowIso);
        claimed.push({ id: Number(result.lastInsertRowid), claimToken: token });
      }
    }
    return claimed;
  });
}

function deliveryContext(db, id, claimToken) {
  return db.prepare(`
    SELECT deliveries.*, cycles.priority, cycles.started_at, conversations.subject,
      departments.name AS department_name, departments.shared_mailbox,
      assignee.name AS assignee_name, assignee.email AS assignee_email, organizations.timezone
    FROM escalation_deliveries deliveries
    JOIN assignment_cycles cycles ON cycles.id = deliveries.assignment_cycle_id
    JOIN conversations ON conversations.id = deliveries.conversation_id
    JOIN departments ON departments.id = deliveries.department_id
    JOIN organizations ON organizations.id = deliveries.organization_id
    JOIN users assignee ON assignee.id = cycles.assignee_id
    WHERE deliveries.id = ? AND deliveries.claim_token = ? AND deliveries.state = 'processing'
      AND organizations.status = 'active' AND cycles.completed_at IS NULL AND cycles.superseded_at IS NULL
      AND conversations.status = 'assigned' AND conversations.assignee_id = cycles.assignee_id
      AND EXISTS (SELECT 1 FROM emails WHERE emails.conversation_id = conversations.id AND emails.source_state = 'active')
  `).get(id, claimToken);
}

function notifyFailure(db, row, message, now) {
  const head = db.prepare(`SELECT head_user_id FROM departments WHERE id = ? AND organization_id = ?`).get(row.department_id, row.organization_id)?.head_user_id;
  if (!head) return;
  const existing = db.prepare(`
    SELECT id FROM notifications
    WHERE user_id = ? AND email_id = ? AND kind = 'escalation_failed' AND organization_id = ?
  `).get(head, row.latest_email_id, row.organization_id);
  if (!existing) db.prepare(`
    INSERT INTO notifications (user_id, email_id, kind, message, created_at, organization_id, department_id)
    VALUES (?, ?, 'escalation_failed', ?, ?, ?, ?)
  `).run(head, row.latest_email_id, message, now.toISOString(), row.organization_id, row.department_id);
}

function clearFailure(db, row) {
  db.prepare(`DELETE FROM notifications WHERE email_id = ? AND kind = 'escalation_failed' AND organization_id = ? AND department_id = ?`)
    .run(row.latest_email_id, row.organization_id, row.department_id);
}

async function deliverClaim({ db, outlook, claimed, now }) {
  const row = deliveryContext(db, claimed.id, claimed.claimToken);
  if (!row) return { skipped: 1, sent: 0, failed: 0 };
  const latest = db.prepare('SELECT latest_email_id FROM conversations WHERE id = ?').get(row.conversation_id);
  row.latest_email_id = latest?.latest_email_id;
  try {
    const result = await outlook.sendEscalation({
      organizationId: Number(row.organization_id), departmentId: Number(row.department_id),
      recipient: row.recipient_email,
      subject: `Escalation Level ${row.level}: ${cleanSubject(row.subject)}`,
      html: bodyFor(row, now), deliveryKey: row.delivery_key,
    });
    transaction(db, () => {
      db.prepare(`
        UPDATE escalation_deliveries
        SET state = 'sent', sent_at = ?, claim_token = NULL, claim_expires_at = NULL,
            next_attempt_at = NULL, last_error = NULL, failure_category = NULL,
            provider_request_id = ?, updated_at = ?
        WHERE id = ? AND claim_token = ? AND state = 'processing'
      `).run(now.toISOString(), result?.requestId ?? null, now.toISOString(), row.id, claimed.claimToken);
      clearFailure(db, row);
    });
    return { skipped: 0, sent: 1, failed: 0 };
  } catch (error) {
    const kind = failureKind(error);
    const message = sanitizedError(error);
    transaction(db, () => {
      const latestAttempt = Number(row.attempt_count);
      const blocked = kind === 'blocked' || latestAttempt >= MAX_ATTEMPTS;
      const state = blocked ? 'blocked' : 'failed';
      db.prepare(`
        UPDATE escalation_deliveries
        SET state = ?, claim_token = NULL, claim_expires_at = NULL, last_error = ?, failure_category = ?,
            next_attempt_at = ?, updated_at = ?
        WHERE id = ? AND claim_token = ? AND state = 'processing'
      `).run(state, message, kind, retryAt(now, latestAttempt, retryAfter(error), blocked), now.toISOString(), row.id, claimed.claimToken);
      notifyFailure(db, row, 'Escalation delivery needs attention. Check the department Graph connection and try again.', now);
    });
    return { skipped: 0, sent: 0, failed: 1 };
  }
}

export async function evaluateEscalations({ db, outlook, now = new Date(), organizationId = 1 }) {
  const claimed = claimDueDeliveries(db, organizationId, now);
  const results = [];
  for (const item of claimed) results.push(await deliverClaim({ db, outlook, claimed: item, now }));
  return results.reduce((summary, result) => ({
    sent: summary.sent + result.sent, failed: summary.failed + result.failed, skipped: summary.skipped + result.skipped,
  }), { sent: 0, failed: 0, skipped: 0 });
}

export function createEscalationRunner({ db, outlook, clock = () => new Date(), organizationIds = null }) {
  let inFlight = null;
  return {
    run() {
      if (inFlight) return inFlight;
      inFlight = Promise.resolve().then(async () => {
        const ids = typeof organizationIds === 'function' ? await organizationIds() : [1];
        const all = await Promise.all(ids.map(organizationId => evaluateEscalations({ db, outlook, now: clock(), organizationId })));
        return all.reduce((summary, result) => ({
          sent: summary.sent + result.sent, failed: summary.failed + result.failed, skipped: summary.skipped + result.skipped,
        }), { sent: 0, failed: 0, skipped: 0 });
      }).finally(() => { inFlight = null; });
      return inFlight;
    },
  };
}
