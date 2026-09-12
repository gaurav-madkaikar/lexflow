import { DateTime } from 'luxon';

const PRIORITY_LABELS = new Map([
  [10, 'Critical'],
  [20, 'High'],
  [30, 'Medium'],
  [40, 'Low'],
]);

function vacationError(status, code, message, field = null) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.field = field;
  return error;
}

function asDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function localDate(now, timezone) {
  return DateTime.fromJSDate(asDate(now), { zone: timezone || 'Asia/Kolkata' }).toISODate();
}

function validDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = DateTime.fromFormat(value, 'yyyy-MM-dd', { zone: 'UTC' });
  return parsed.isValid && parsed.toFormat('yyyy-MM-dd') === value;
}

function organizationTimezone(db, organizationId) {
  return db.prepare('SELECT timezone FROM organizations WHERE id = ?').get(organizationId)?.timezone
    || 'Asia/Kolkata';
}

function periodRow(db, userId, organizationId, { enabledOnly = false } = {}) {
  return db.prepare(`
    SELECT * FROM vacation_periods
    WHERE user_id = ? AND organization_id = ? ${enabledOnly ? 'AND enabled = 1' : ''}
    ORDER BY id DESC
    LIMIT 1
  `).get(userId, organizationId);
}

function periodStatus(period, today) {
  if (!period?.enabled) return 'off';
  if (today < period.start_date) return 'upcoming';
  if (today > period.end_date) return 'ended';
  return 'active';
}

function ensureBriefing(db, period, createdAt) {
  if (!period) return null;
  const itemCount = Number(db.prepare(`
    SELECT COUNT(*) AS count FROM vacation_reassignments WHERE vacation_id = ?
  `).get(period.id)?.count ?? 0);
  if (!itemCount) return null;
  db.prepare(`
    INSERT INTO vacation_briefings
      (vacation_id, organization_id, user_id, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(vacation_id) DO NOTHING
  `).run(period.id, period.organization_id, period.user_id, createdAt);
  return db.prepare('SELECT * FROM vacation_briefings WHERE vacation_id = ?').get(period.id);
}

function finalizeExpiredPeriod(db, { userId, organizationId, now, timezone }) {
  const current = periodRow(db, userId, organizationId, { enabledOnly: true });
  if (!current) return null;
  const today = localDate(now, timezone);
  if (today <= current.end_date) return current;
  const endedAt = asDate(now).toISOString();
  db.prepare(`
    UPDATE vacation_periods
    SET enabled = 0, deactivated_at = COALESCE(deactivated_at, ?), updated_at = ?
    WHERE id = ? AND enabled = 1
  `).run(endedAt, endedAt, current.id);
  const ended = { ...current, enabled: 0, deactivated_at: endedAt, updated_at: endedAt };
  ensureBriefing(db, ended, endedAt);
  return ended;
}

function briefingItem(row) {
  const priority = PRIORITY_LABELS.has(Number(row.priority)) ? Number(row.priority) : 30;
  return {
    id: Number(row.id),
    emailId: row.email_id == null ? null : Number(row.email_id),
    conversationId: row.conversation_id == null ? null : Number(row.conversation_id),
    subject: row.subject_snapshot,
    reassignedTo: row.new_assignee_name_snapshot,
    priority,
    priorityLabel: PRIORITY_LABELS.get(priority),
    reassignedAt: row.reassigned_at,
    ruleName: row.rule_name_snapshot ?? null,
    workStatus: row.work_status ?? 'unavailable',
    currentOwner: row.current_owner ?? null,
  };
}

function briefingPayload(db, row) {
  if (!row) return null;
  const items = db.prepare(`
    SELECT items.*, COALESCE(conversations.status, emails.status) AS work_status,
      owners.name AS current_owner
    FROM vacation_reassignments items
    LEFT JOIN conversations ON conversations.id = items.conversation_id
    LEFT JOIN emails ON emails.id = items.email_id
    LEFT JOIN users owners ON owners.id = COALESCE(conversations.assignee_id, emails.assignee_id)
    WHERE items.vacation_id = ?
    ORDER BY items.priority ASC, items.reassigned_at DESC, items.id DESC
  `).all(row.vacation_id).map(briefingItem);
  const period = db.prepare('SELECT * FROM vacation_periods WHERE id = ?').get(row.vacation_id);
  return {
    id: Number(row.id),
    vacationId: Number(row.vacation_id),
    startDate: period?.start_date ?? null,
    endDate: period?.end_date ?? null,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    itemCount: items.length,
    items,
  };
}

export function getVacationBriefing({ db, userId, organizationId, briefingId }) {
  const row = db.prepare(`SELECT * FROM vacation_briefings
    WHERE id = ? AND user_id = ? AND organization_id = ?`).get(briefingId, userId, organizationId);
  if (!row) throw vacationError(404, 'BRIEFING_NOT_FOUND', 'Return briefing not found.');
  return briefingPayload(db, row);
}

export function vacationStatusForUser({ db, userId, organizationId, now = new Date() }) {
  const timezone = organizationTimezone(db, organizationId);
  const today = localDate(now, timezone);
  const active = periodRow(db, userId, organizationId, { enabledOnly: true });
  const status = periodStatus(active, today);
  return {
    status: status === 'ended' ? 'off' : status,
    enabled: Boolean(active && status !== 'ended'),
    isAway: status === 'active',
    startDate: active?.start_date ?? null,
    endDate: active?.end_date ?? null,
  };
}

export function isUserOnVacation({ db, userId, organizationId, now = new Date() }) {
  return vacationStatusForUser({ db, userId, organizationId, now }).isAway;
}

export function getVacationPayload({ db, userId, organizationId, now = new Date() }) {
  const timezone = organizationTimezone(db, organizationId);
  finalizeExpiredPeriod(db, { userId, organizationId, now, timezone });
  const today = localDate(now, timezone);
  const latest = periodRow(db, userId, organizationId);
  const enabled = latest?.enabled === 1;
  const rawStatus = periodStatus(latest, today);
  const status = rawStatus === 'ended' ? 'off' : rawStatus;
  const unreviewed = db.prepare(`
    SELECT * FROM vacation_briefings
    WHERE user_id = ? AND organization_id = ? AND reviewed_at IS NULL
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).get(userId, organizationId);
  const history = db.prepare(`
    SELECT briefings.*, periods.start_date, periods.end_date,
      (SELECT COUNT(*) FROM vacation_reassignments items WHERE items.vacation_id = briefings.vacation_id) AS item_count
    FROM vacation_briefings briefings
    JOIN vacation_periods periods ON periods.id = briefings.vacation_id
    WHERE briefings.user_id = ? AND briefings.organization_id = ?
    ORDER BY briefings.created_at DESC, briefings.id DESC
    LIMIT 8
  `).all(userId, organizationId).map(row => ({
    id: Number(row.id),
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    itemCount: Number(row.item_count),
  }));
  return {
    timezone,
    status,
    enabled: enabled && status !== 'off',
    isAway: status === 'active',
    period: latest ? {
      id: Number(latest.id),
      startDate: latest.start_date,
      endDate: latest.end_date,
    } : null,
    unreviewedBriefing: briefingPayload(db, unreviewed),
    history,
  };
}

export function setVacationMode({
  db, userId, organizationId, enabled, startDate, endDate, now = new Date(),
}) {
  const nowIso = asDate(now).toISOString();
  const timezone = organizationTimezone(db, organizationId);
  db.exec('BEGIN IMMEDIATE');
  try {
    finalizeExpiredPeriod(db, { userId, organizationId, now, timezone });
    const current = periodRow(db, userId, organizationId, { enabledOnly: true });
    if (enabled) {
      if (!validDateKey(startDate)) {
        throw vacationError(400, 'INVALID_VACATION_DATES', 'Choose a valid first day.', 'startDate');
      }
      if (!validDateKey(endDate)) {
        throw vacationError(400, 'INVALID_VACATION_DATES', 'Choose a valid return date.', 'endDate');
      }
      if (startDate > endDate) {
        throw vacationError(400, 'INVALID_VACATION_DATES', 'The return date must be on or after the first day.', 'endDate');
      }
      if (endDate < localDate(now, timezone)) {
        throw vacationError(400, 'INVALID_VACATION_DATES', 'The return date cannot be in the past.', 'endDate');
      }
      if (current) {
        db.prepare(`
          UPDATE vacation_periods
          SET start_date = ?, end_date = ?, activated_at = ?, deactivated_at = NULL, updated_at = ?
          WHERE id = ?
        `).run(startDate, endDate, nowIso, nowIso, current.id);
      } else {
        db.prepare(`
          INSERT INTO vacation_periods
            (organization_id, user_id, start_date, end_date, enabled, activated_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, ?, ?, ?)
        `).run(organizationId, userId, startDate, endDate, nowIso, nowIso, nowIso);
      }
    } else if (current) {
      db.prepare(`
        UPDATE vacation_periods
        SET enabled = 0, deactivated_at = ?, updated_at = ?
        WHERE id = ? AND enabled = 1
      `).run(nowIso, nowIso, current.id);
      ensureBriefing(db, { ...current, enabled: 0 }, nowIso);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return getVacationPayload({ db, userId, organizationId, now });
}

export function recordVacationReassignment({
  db, userId, organizationId, emailId, conversationId, subject, newAssignee,
  priority = 30, ruleName = null, now = new Date(),
}) {
  const timezone = organizationTimezone(db, organizationId);
  const today = localDate(now, timezone);
  const vacation = db.prepare(`
    SELECT * FROM vacation_periods
    WHERE user_id = ? AND organization_id = ? AND enabled = 1
      AND start_date <= ? AND end_date >= ?
    ORDER BY id DESC LIMIT 1
  `).get(userId, organizationId, today, today);
  if (!vacation) return false;
  const existing = db.prepare(`
    SELECT id FROM vacation_reassignments
    WHERE vacation_id = ? AND (
      (? IS NOT NULL AND conversation_id = ?)
      OR (? IS NULL AND conversation_id IS NULL AND email_id = ?)
    )
    LIMIT 1
  `).get(vacation.id, conversationId, conversationId, conversationId, emailId);
  const normalizedPriority = PRIORITY_LABELS.has(Number(priority)) ? Number(priority) : 30;
  const reassignedAt = asDate(now).toISOString();
  if (existing) {
    db.prepare(`
      UPDATE vacation_reassignments
      SET email_id = ?, new_assignee_id = ?, subject_snapshot = ?,
          new_assignee_name_snapshot = ?, priority = ?, reassigned_at = ?
      WHERE id = ?
    `).run(
      emailId, newAssignee.id, subject, newAssignee.name,
      normalizedPriority, reassignedAt, existing.id,
    );
  } else {
    db.prepare(`
      INSERT INTO vacation_reassignments
        (vacation_id, organization_id, user_id, email_id, conversation_id,
         new_assignee_id, subject_snapshot, new_assignee_name_snapshot, priority, reassigned_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      vacation.id, organizationId, userId, emailId, conversationId,
      newAssignee.id, subject, newAssignee.name, normalizedPriority, reassignedAt,
    );
  }
  if (ruleName) {
    db.prepare(`UPDATE vacation_reassignments SET rule_name_snapshot = ?
      WHERE vacation_id = ? AND email_id = ?`).run(ruleName, vacation.id, emailId);
  }
  return true;
}

export function markVacationBriefingReviewed({
  db, briefingId, userId, organizationId, now = new Date(),
}) {
  const reviewedAt = asDate(now).toISOString();
  const result = db.prepare(`
    UPDATE vacation_briefings
    SET reviewed_at = COALESCE(reviewed_at, ?)
    WHERE id = ? AND user_id = ? AND organization_id = ?
  `).run(reviewedAt, briefingId, userId, organizationId);
  if (!result.changes) throw vacationError(404, 'NOT_FOUND', 'Return briefing not found.');
  return { id: Number(briefingId), reviewedAt };
}
