const GRAPH_ROOT = 'https://graph.microsoft.com/v1.0';
const URGENT_PATTERN = /\b(urgent|asap|escalat(?:e|ion|ed)|deadline)\b/i;
const MEETING_PRIORITY_PATTERN = /\b(urgent|decision|deadline)\b/i;

function serviceError(status, code, message, field) {
  const error = new Error(message);
  Object.assign(error, { status, code, expose: true, field });
  return error;
}

function isoDate(value, fallback = null) {
  if (!value) return fallback;
  const raw = typeof value === 'string' ? value : value.dateTime;
  if (!raw) return fallback;
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/.test(raw) ? raw : `${raw}Z`;
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
}

function safeProviderError(error) {
  return String(error?.message ?? error ?? 'Microsoft Vacation Mode sync failed.')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/(client_secret|access_token|refresh_token|token)\s*[:=]\s*\S+/gi, '$1=[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 260);
}

export class MicrosoftVacationProvider {
  #token = null;
  #tokenExpiresAt = 0;

  constructor({ tenantId, clientId, clientSecret, fetchImpl = fetch, requestTimeoutMs = 15_000 }) {
    Object.assign(this, { tenantId, clientId, clientSecret, fetchImpl, requestTimeoutMs });
    this.configured = Boolean(tenantId && clientId && clientSecret);
  }

  async accessToken() {
    if (this.#token && Date.now() < this.#tokenExpiresAt - 60_000) return this.#token;
    const form = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    });
    const response = await this.fetchImpl(
      `https://login.microsoftonline.com/${encodeURIComponent(this.tenantId)}/oauth2/v2.0/token`,
      { method: 'POST', body: form, signal: AbortSignal.timeout(this.requestTimeoutMs) },
    );
    if (!response.ok) throw serviceError(502, 'MICROSOFT_AUTH_FAILED', `Microsoft authentication failed (${response.status}).`);
    const payload = await response.json();
    if (!payload.access_token) throw serviceError(502, 'MICROSOFT_AUTH_FAILED', 'Microsoft authentication returned no access token.');
    this.#token = payload.access_token;
    this.#tokenExpiresAt = Date.now() + Number(payload.expires_in || 3600) * 1000;
    return this.#token;
  }

  async graph(path, options = {}) {
    if (!this.configured) throw serviceError(503, 'MICROSOFT_NOT_CONFIGURED', 'Microsoft Vacation Mode is not configured.');
    const token = await this.accessToken();
    const response = await this.fetchImpl(`${GRAPH_ROOT}${path}`, {
      ...options,
      headers: {
        authorization: `Bearer ${token}`,
        prefer: 'outlook.timezone="UTC"',
        ...(options.headers ?? {}),
      },
      signal: AbortSignal.timeout(this.requestTimeoutMs),
    });
    if (!response.ok) throw serviceError(502, 'MICROSOFT_GRAPH_FAILED', `Microsoft Graph request failed (${response.status}).`);
    return response.json();
  }

  async fetchVacation(principal) {
    const payload = await this.graph(`/users/${encodeURIComponent(principal)}/mailboxSettings?$select=automaticRepliesSetting,timeZone`);
    const setting = payload.automaticRepliesSetting ?? {};
    return {
      status: setting.status ?? 'disabled',
      startsAt: isoDate(setting.scheduledStartDateTime),
      endsAt: isoDate(setting.scheduledEndDateTime),
      timezone: payload.timeZone || setting.scheduledStartDateTime?.timeZone || 'UTC',
    };
  }

  async fetchMeetings(principal, startsAt, endsAt) {
    const query = new URLSearchParams({
      startDateTime: startsAt,
      endDateTime: endsAt,
      $select: 'id,subject,organizer,start,end,responseStatus,location,webLink,sensitivity,isCancelled,isOrganizer,type,recurrence,showAs,onlineMeeting',
      $orderby: 'start/dateTime',
      $top: '200',
    });
    let path = `/users/${encodeURIComponent(principal)}/calendarView?${query}`;
    const meetings = [];
    while (path) {
      const page = path.startsWith('http')
        ? await this.graph(path.slice(GRAPH_ROOT.length))
        : await this.graph(path);
      if (!Array.isArray(page.value)) throw serviceError(502, 'MICROSOFT_CALENDAR_INVALID', 'Microsoft Calendar returned an invalid response.');
      meetings.push(...page.value);
      path = page['@odata.nextLink'] ? page['@odata.nextLink'].slice(GRAPH_ROOT.length) : null;
    }
    return meetings;
  }
}

export function isUserAway(db, userId) {
  return Boolean(db.prepare(`
    SELECT 1 FROM vacation_periods
    WHERE user_id = ? AND status = 'active'
    ORDER BY starts_at DESC LIMIT 1
  `).get(userId));
}

export function holdEmailForAwayUser(db, { emailId, userId, ruleId, now = new Date() }) {
  const period = db.prepare(`
    SELECT id FROM vacation_periods
    WHERE user_id = ? AND status = 'active'
    ORDER BY starts_at DESC LIMIT 1
  `).get(userId);
  if (!period) return false;
  db.prepare(`
    INSERT OR IGNORE INTO vacation_email_holds
      (vacation_id, email_id, intended_user_id, rule_id, status, held_at)
    VALUES (?, ?, ?, ?, 'held', ?)
  `).run(period.id, emailId, userId, ruleId, now.toISOString());
  return true;
}

export function resolveEmailHoldCoverage(db, emailId, now = new Date()) {
  db.prepare(`
    UPDATE vacation_email_holds
    SET status = 'covered', resolved_at = ?
    WHERE email_id = ? AND status = 'held'
  `).run(now.toISOString(), emailId);
}

function priorityBand(score) {
  return score >= 60 ? 'high' : score >= 30 ? 'medium' : 'normal';
}

function emailBriefingItem(row, settings) {
  const reasons = [];
  let score = 0;
  const receivedAt = new Date(row.received_at).getTime();
  const comparisonAt = new Date(row.completed_at || row.resolved_at || row.period_end || new Date().toISOString()).getTime();
  const slaHours = row.assigned_at ? settings.time_assigned_unmarked_hours : settings.time_unassigned_hours;
  if (Number.isFinite(receivedAt) && comparisonAt - receivedAt >= slaHours * 3_600_000) {
    score += 50;
    reasons.push('Beyond response SLA');
  }
  if (URGENT_PATTERN.test(`${row.subject} ${row.preview}`)) {
    score += 35;
    reasons.push('Urgent language');
  }
  if (row.status !== 'completed') {
    score += 25;
    reasons.push('Still open');
  }
  if (row.rule_priority !== null && Number(row.rule_priority) <= 10) {
    score += 15;
    reasons.push('Top-priority route');
  }
  const handled = row.hold_status === 'covered' || row.status === 'completed' || (row.assignee_id && Number(row.assignee_id) !== Number(row.intended_user_id));
  return {
    type: 'email',
    id: `email:${row.id}`,
    emailId: Number(row.id),
    section: handled ? 'handled' : 'open',
    title: row.subject,
    summary: `${row.sender_name}: ${row.preview || 'No preview available.'}`,
    occurredAt: row.received_at,
    status: row.status,
    priority: { score, level: priorityBand(score), reasons },
  };
}

function normalizeMeeting(event, timezone) {
  const response = String(event.responseStatus?.response ?? 'none').toLocaleLowerCase();
  const showAs = String(event.showAs ?? '').toLocaleLowerCase();
  if (event.isCancelled || response === 'declined' || ['free', 'workingelsewhere', 'oof'].includes(showAs)) return null;
  const privateEvent = String(event.sensitivity ?? '').toLocaleLowerCase() === 'private';
  return {
    providerEventId: String(event.id),
    subject: privateEvent ? 'Private event' : String(event.subject || '(No title)'),
    organizerName: privateEvent ? 'Private' : String(event.organizer?.emailAddress?.name || 'Unknown organizer'),
    organizerAddress: privateEvent ? '' : String(event.organizer?.emailAddress?.address || ''),
    startsAt: isoDate(event.start),
    endsAt: isoDate(event.end),
    timezone: event.start?.timeZone || timezone || 'UTC',
    responseStatus: response,
    location: privateEvent ? '' : String(event.location?.displayName || ''),
    webUrl: event.onlineMeeting?.joinUrl || event.webLink || null,
    sensitivity: privateEvent ? 'private' : String(event.sensitivity || 'normal'),
    isOrganizer: Boolean(event.isOrganizer),
    isRecurring: Boolean(event.recurrence || event.type === 'occurrence' || event.type === 'exception'),
  };
}

function meetingBriefingItem(row) {
  const reasons = [];
  let score = 0;
  if (row.is_organizer) { score += 40; reasons.push('You organized'); }
  if (['accepted', 'tentativelyaccepted', 'tentative'].includes(String(row.response_status).toLocaleLowerCase())) {
    score += 30;
    reasons.push('Accepted meeting');
  }
  if (MEETING_PRIORITY_PATTERN.test(row.subject)) { score += 25; reasons.push('Decision language'); }
  if (row.is_recurring) { score += 15; reasons.push('Recurring meeting'); }
  return {
    type: 'meeting',
    id: `meeting:${row.id}`,
    meetingId: Number(row.id),
    section: 'meetings',
    title: row.subject,
    summary: `${row.organizer_name} · ${row.location || 'Online or location not specified'}`,
    occurredAt: row.starts_at,
    webUrl: row.web_url,
    priority: { score, level: priorityBand(score), reasons },
  };
}

function sortBriefingItems(items) {
  const bands = { high: 3, medium: 2, normal: 1 };
  return items.sort((left, right) =>
    bands[right.priority.level] - bands[left.priority.level]
    || right.priority.score - left.priority.score
    || new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
}

function releaseHeldEmails(db, period, nowIso) {
  const holds = db.prepare(`
    SELECT h.*, e.status AS email_status, e.subject
    FROM vacation_email_holds h JOIN emails e ON e.id = h.email_id
    WHERE h.vacation_id = ? AND h.status = 'held'
  `).all(period.id);
  for (const hold of holds) {
    const update = db.prepare(`
      UPDATE emails SET status = 'assigned', assignee_id = ?, assigned_at = ?
      WHERE id = ? AND status = 'unassigned'
    `).run(period.user_id, nowIso, hold.email_id);
    const holdStatus = update.changes ? 'released' : 'covered';
    db.prepare('UPDATE vacation_email_holds SET status = ?, resolved_at = ? WHERE id = ?')
      .run(holdStatus, nowIso, hold.id);
    if (update.changes) {
      const user = db.prepare('SELECT name FROM users WHERE id = ?').get(period.user_id);
      db.prepare(`
        INSERT INTO activity (actor_id, email_id, kind, message, created_at)
        VALUES (NULL, ?, 'assigned', ?, ?)
      `).run(hold.email_id, `Released "${hold.subject}" to ${user.name} after Vacation Mode`, nowIso);
    }
  }
}

function emailRowsForBriefing(db, period) {
  return db.prepare(`
    SELECT e.*, h.status AS hold_status, h.intended_user_id, h.resolved_at,
      r.priority AS rule_priority, ? AS period_end
    FROM emails e
    LEFT JOIN vacation_email_holds h
      ON h.email_id = e.id AND h.vacation_id = ?
    LEFT JOIN rules r ON r.id = h.rule_id
    WHERE h.id IS NOT NULL
       OR (e.assignee_id = ? AND e.status IN ('assigned', 'completed')
           AND COALESCE(e.assigned_at, e.received_at) <= ?
           AND COALESCE(e.completed_at, ?) >= ?)
    ORDER BY e.received_at DESC
  `).all(period.ends_at, period.id, period.user_id, period.ends_at, period.ends_at, period.starts_at);
}

function upsertBriefing(db, period, status, items, nowIso) {
  const retryUntil = status === 'partial' ? new Date(new Date(nowIso).getTime() + 86_400_000).toISOString() : null;
  db.prepare(`
    INSERT INTO return_briefings
      (vacation_id, user_id, status, items_json, created_at, updated_at, retry_until)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(vacation_id) DO UPDATE SET
      status = excluded.status,
      items_json = excluded.items_json,
      updated_at = excluded.updated_at,
      retry_until = excluded.retry_until
  `).run(period.id, period.user_id, status, JSON.stringify(sortBriefingItems(items)), nowIso, nowIso, retryUntil);
  const briefing = db.prepare('SELECT id FROM return_briefings WHERE vacation_id = ?').get(period.id);
  const existingAlert = db.prepare("SELECT id FROM notifications WHERE briefing_id = ? AND kind = 'return_briefing'").get(briefing.id);
  if (!existingAlert) {
    db.prepare(`
      INSERT INTO notifications (user_id, email_id, briefing_id, kind, message, created_at)
      VALUES (?, NULL, ?, 'return_briefing', ?, ?)
    `).run(period.user_id, briefing.id, status === 'partial'
      ? 'Your return briefing is ready. Calendar is still syncing.'
      : 'Your prioritized return briefing is ready.', nowIso);
  } else if (status === 'ready') {
    db.prepare("UPDATE notifications SET message = 'Your prioritized return briefing is ready.' WHERE id = ?")
      .run(existingAlert.id);
  }
}

async function finishPeriod({ db, provider, period, principal, clock }) {
  const nowIso = clock().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    releaseHeldEmails(db, period, nowIso);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  let calendarStatus = 'ready';
  try {
    const events = await provider.fetchMeetings(principal, period.starts_at, period.ends_at || nowIso);
    const insert = db.prepare(`
      INSERT OR IGNORE INTO vacation_meetings
        (vacation_id, provider_event_id, subject, organizer_name, organizer_address,
         starts_at, ends_at, timezone, response_status, location, web_url, sensitivity,
         is_organizer, is_recurring)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const event of events) {
      const meeting = normalizeMeeting(event, period.timezone);
      if (!meeting?.startsAt || !meeting?.endsAt) continue;
      insert.run(period.id, meeting.providerEventId, meeting.subject, meeting.organizerName,
        meeting.organizerAddress, meeting.startsAt, meeting.endsAt, meeting.timezone,
        meeting.responseStatus, meeting.location, meeting.webUrl, meeting.sensitivity,
        meeting.isOrganizer ? 1 : 0, meeting.isRecurring ? 1 : 0);
    }
  } catch {
    calendarStatus = 'partial';
  }

  const settings = db.prepare('SELECT * FROM workspace_settings WHERE id = 1').get();
  const emailItems = emailRowsForBriefing(db, period).map(row => emailBriefingItem(row, settings));
  const meetingItems = db.prepare('SELECT * FROM vacation_meetings WHERE vacation_id = ?').all(period.id)
    .map(meetingBriefingItem);
  upsertBriefing(db, period, calendarStatus, [...emailItems, ...meetingItems], nowIso);
}

function periodState(setting, now) {
  const status = String(setting.status).toLocaleLowerCase();
  if (status === 'disabled') return 'available';
  if (status === 'alwaysenabled') return 'active';
  if (status !== 'scheduled' || !setting.startsAt || !setting.endsAt) return 'available';
  if (now < new Date(setting.startsAt)) return 'scheduled';
  if (now >= new Date(setting.endsAt)) return 'completed';
  return 'active';
}

function publicBriefing(row, includeItems = false) {
  const items = JSON.parse(row.items_json || '[]');
  const counts = items.reduce((value, item) => ({ ...value, [item.section]: (value[item.section] || 0) + 1 }), {});
  return {
    id: Number(row.id), status: row.status, createdAt: row.created_at,
    updatedAt: row.updated_at, reviewedAt: row.reviewed_at, counts,
    ...(includeItems ? { items } : {}),
  };
}

export function vacationPayload(db, userId) {
  const user = db.prepare('SELECT microsoft_principal FROM users WHERE id = ?').get(userId);
  const manual = db.prepare('SELECT * FROM vacation_manual_settings WHERE user_id = ?').get(userId);
  const sync = db.prepare('SELECT * FROM vacation_sync_state WHERE user_id = ?').get(userId);
  const period = db.prepare(`
    SELECT * FROM vacation_periods WHERE user_id = ?
    ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END, starts_at DESC LIMIT 1
  `).get(userId);
  const pending = db.prepare(`
    SELECT * FROM return_briefings WHERE user_id = ? AND reviewed_at IS NULL
    ORDER BY created_at DESC LIMIT 1
  `).get(userId);
  return {
    configured: Boolean(user?.microsoft_principal),
    principal: user?.microsoft_principal ?? null,
    provider: manual ? 'manual' : 'microsoft',
    manual: manual ? {
      enabled: Boolean(manual.enabled),
      startsAt: manual.starts_at,
      endsAt: manual.ends_at,
      updatedAt: manual.updated_at,
    } : null,
    sync: sync ? { status: sync.status, lastSuccessAt: sync.last_success_at, lastError: sync.last_error } : { status: 'unconfigured', lastSuccessAt: null, lastError: null },
    period: period ? { id: Number(period.id), status: period.status, startsAt: period.starts_at, endsAt: period.ends_at, timezone: period.timezone } : null,
    pendingBriefing: pending ? publicBriefing(pending) : null,
    briefingCount: Number(db.prepare('SELECT count(*) AS count FROM return_briefings WHERE user_id = ?').get(userId).count),
  };
}

export function listBriefings(db, userId) {
  return db.prepare('SELECT * FROM return_briefings WHERE user_id = ? ORDER BY created_at DESC').all(userId).map(row => publicBriefing(row));
}

export function getBriefing(db, userId, briefingId) {
  const row = db.prepare('SELECT * FROM return_briefings WHERE id = ? AND user_id = ?').get(briefingId, userId);
  return row ? publicBriefing(row, true) : null;
}

export function reviewBriefing(db, userId, briefingId, now = new Date()) {
  const result = db.prepare(`
    UPDATE return_briefings SET reviewed_at = COALESCE(reviewed_at, ?)
    WHERE id = ? AND user_id = ?
  `).run(now.toISOString(), briefingId, userId);
  return Boolean(result.changes);
}

export function updateMicrosoftPrincipal(db, userId, value) {
  const principal = String(value ?? '').trim().toLocaleLowerCase();
  if (principal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(principal)) {
    throw serviceError(400, 'INVALID_INPUT', 'Enter a valid Microsoft user principal.', 'microsoftPrincipal');
  }
  const user = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'member'").get(userId);
  if (!user) throw serviceError(404, 'NOT_FOUND', 'Team member not found.');
  try {
    db.prepare('UPDATE users SET microsoft_principal = ? WHERE id = ?').run(principal || null, userId);
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) throw serviceError(409, 'CONFLICT', 'That Microsoft principal is already assigned.');
    throw error;
  }
  if (!principal) db.prepare('DELETE FROM vacation_sync_state WHERE user_id = ?').run(userId);
  return principal || null;
}

export function adminVacationSummary(db, userId) {
  const vacation = vacationPayload(db, userId);
  return {
    configured: vacation.configured,
    principal: vacation.principal,
    status: vacation.period?.status ?? (vacation.sync.status === 'error' ? 'error' : 'available'),
    startsAt: vacation.period?.startsAt ?? null,
    endsAt: vacation.period?.endsAt ?? null,
    syncStatus: vacation.sync.status,
    heldCount: Number(db.prepare(`
      SELECT count(*) AS count FROM vacation_email_holds
      WHERE intended_user_id = ? AND status = 'held'
    `).get(userId).count),
  };
}

export function createVacationRunner({ db, provider, clock = () => new Date() }) {
  let inFlight = null;

  function calendarProvider(user) {
    return provider?.configured && user.microsoft_principal
      ? provider
      : { async fetchMeetings() { return []; } };
  }

  async function finishManualPeriod(period, user, end) {
    const nowIso = clock().toISOString();
    db.prepare(`
      UPDATE vacation_periods
      SET status = 'completed', ends_at = ?, completed_at = ?, last_detected_at = ?
      WHERE id = ?
    `).run(end, nowIso, nowIso, period.id);
    await finishPeriod({
      db,
      provider: calendarProvider(user),
      period: { ...period, ends_at: end },
      principal: user.microsoft_principal,
      clock,
    });
  }

  async function transitionManualPeriods() {
    const now = clock();
    const nowIso = now.toISOString();
    const settings = db.prepare(`
      SELECT s.*, u.microsoft_principal
      FROM vacation_manual_settings s JOIN users u ON u.id = s.user_id
      WHERE s.enabled = 1
    `).all();
    for (const setting of settings) {
      const period = db.prepare(`
        SELECT * FROM vacation_periods
        WHERE user_id = ? AND provider_key LIKE 'manual:%' AND status IN ('scheduled', 'active')
        ORDER BY starts_at DESC LIMIT 1
      `).get(setting.user_id);
      if (!period) continue;
      if (period.status === 'scheduled' && new Date(period.starts_at) <= now) {
        db.prepare("UPDATE vacation_periods SET status = 'active', last_detected_at = ? WHERE id = ?")
          .run(nowIso, period.id);
        period.status = 'active';
      }
      if (period.ends_at && new Date(period.ends_at) <= now) {
        db.prepare('UPDATE vacation_manual_settings SET enabled = 0, updated_at = ? WHERE user_id = ?')
          .run(nowIso, setting.user_id);
        if (period.status === 'active') await finishManualPeriod(period, setting, period.ends_at);
        else db.prepare("UPDATE vacation_periods SET status = 'completed', completed_at = ?, last_detected_at = ? WHERE id = ?")
          .run(nowIso, nowIso, period.id);
      }
    }
  }

  async function syncUser(user) {
    if (db.prepare('SELECT 1 FROM vacation_manual_settings WHERE user_id = ?').get(user.id)) {
      return vacationPayload(db, user.id);
    }
    const now = clock();
    const nowIso = now.toISOString();
    db.prepare(`
      INSERT INTO vacation_sync_state (user_id, status, last_attempt_at)
      VALUES (?, 'current', ?)
      ON CONFLICT(user_id) DO UPDATE SET last_attempt_at = excluded.last_attempt_at
    `).run(user.id, nowIso);
    try {
      const setting = await provider.fetchVacation(user.microsoft_principal);
      const state = periodState(setting, now);
      const existingActive = db.prepare("SELECT * FROM vacation_periods WHERE user_id = ? AND status = 'active' ORDER BY starts_at DESC LIMIT 1").get(user.id);
      if (state === 'available') {
        db.prepare(`
          UPDATE vacation_periods
          SET status = 'completed', completed_at = ?, last_detected_at = ?
          WHERE user_id = ? AND status = 'scheduled'
        `).run(nowIso, nowIso, user.id);
        if (existingActive) {
          const end = nowIso;
          db.prepare("UPDATE vacation_periods SET status = 'completed', ends_at = ?, completed_at = ?, last_detected_at = ? WHERE id = ?")
            .run(end, nowIso, nowIso, existingActive.id);
          await finishPeriod({ db, provider, period: { ...existingActive, ends_at: end }, principal: user.microsoft_principal, clock });
        }
      } else if (state === 'active' && existingActive) {
        const start = setting.status.toLocaleLowerCase() === 'alwaysenabled'
          ? existingActive.starts_at
          : setting.startsAt;
        db.prepare(`
          UPDATE vacation_periods
          SET starts_at = ?, ends_at = ?, timezone = ?, last_detected_at = ?
          WHERE id = ?
        `).run(start, setting.endsAt, setting.timezone, nowIso, existingActive.id);
        db.prepare(`
          UPDATE vacation_periods
          SET status = 'completed', completed_at = ?, last_detected_at = ?
          WHERE user_id = ? AND status = 'scheduled'
        `).run(nowIso, nowIso, user.id);
      } else if (state === 'completed' && existingActive) {
        const end = setting.endsAt || nowIso;
        db.prepare("UPDATE vacation_periods SET status = 'completed', ends_at = ?, completed_at = ?, last_detected_at = ? WHERE id = ?")
          .run(end, nowIso, nowIso, existingActive.id);
        db.prepare(`
          UPDATE vacation_periods
          SET status = 'completed', completed_at = ?, last_detected_at = ?
          WHERE user_id = ? AND status = 'scheduled'
        `).run(nowIso, nowIso, user.id);
        await finishPeriod({ db, provider, period: { ...existingActive, ends_at: end }, principal: user.microsoft_principal, clock });
      } else {
        if (state === 'scheduled' && existingActive) {
          const end = nowIso;
          db.prepare("UPDATE vacation_periods SET status = 'completed', ends_at = ?, completed_at = ?, last_detected_at = ? WHERE id = ?")
            .run(end, nowIso, nowIso, existingActive.id);
          await finishPeriod({ db, provider, period: { ...existingActive, ends_at: end }, principal: user.microsoft_principal, clock });
        }
        const start = state === 'active' && setting.status.toLocaleLowerCase() === 'alwaysenabled'
          ? (existingActive?.starts_at || nowIso)
          : setting.startsAt;
        const end = setting.endsAt;
        const key = setting.status.toLocaleLowerCase() === 'alwaysenabled' && existingActive
          ? existingActive.provider_key
          : `${setting.status}:${start}:${end ?? ''}`;
        db.prepare(`
          INSERT INTO vacation_periods
            (user_id, provider, provider_key, status, starts_at, ends_at, timezone, first_detected_at, last_detected_at)
          VALUES (?, 'microsoft', ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, provider_key) DO UPDATE SET
            status = excluded.status, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
            timezone = excluded.timezone, last_detected_at = excluded.last_detected_at
        `).run(user.id, key, state, start, end, setting.timezone, nowIso, nowIso);
        const period = db.prepare('SELECT * FROM vacation_periods WHERE user_id = ? AND provider_key = ?').get(user.id, key);
        db.prepare(`
          UPDATE vacation_periods
          SET status = 'completed', completed_at = ?, last_detected_at = ?
          WHERE user_id = ? AND status = 'scheduled' AND id <> ?
        `).run(nowIso, nowIso, user.id, period.id);
        if (state === 'completed' && !period.completed_at) {
          db.prepare("UPDATE vacation_periods SET completed_at = ? WHERE id = ?").run(nowIso, period.id);
          await finishPeriod({ db, provider, period, principal: user.microsoft_principal, clock });
        }
      }
      db.prepare(`
        UPDATE vacation_sync_state SET status = 'current', last_success_at = ?, last_error = NULL
        WHERE user_id = ?
      `).run(nowIso, user.id);
      return vacationPayload(db, user.id);
    } catch (error) {
      db.prepare(`
        UPDATE vacation_sync_state SET status = 'error', last_error = ? WHERE user_id = ?
      `).run(safeProviderError(error), user.id);
      throw error;
    }
  }

  async function syncAll() {
    await transitionManualPeriods();
    if (!provider?.configured) return { checked: 0, failed: 0 };
    const users = db.prepare("SELECT * FROM users WHERE role = 'member' AND microsoft_principal IS NOT NULL ORDER BY id").all();
    const settled = await Promise.allSettled(users.map(syncUser));
    const partials = db.prepare(`
      SELECT p.*, u.microsoft_principal
      FROM return_briefings b
      JOIN vacation_periods p ON p.id = b.vacation_id
      JOIN users u ON u.id = b.user_id
      WHERE b.status = 'partial' AND b.retry_until > ? AND u.microsoft_principal IS NOT NULL
    `).all(clock().toISOString());
    const retries = await Promise.allSettled(partials.map(period => finishPeriod({
      db, provider, period, principal: period.microsoft_principal, clock,
    })));
    return {
      checked: users.length,
      failed: settled.filter(result => result.status === 'rejected').length,
      calendarRetries: retries.length,
    };
  }

  function run() {
    if (inFlight) return inFlight;
    inFlight = syncAll().finally(() => { inFlight = null; });
    return inFlight;
  }

  async function refreshUser(userId) {
    await transitionManualPeriods();
    if (db.prepare('SELECT 1 FROM vacation_manual_settings WHERE user_id = ?').get(userId)) {
      return vacationPayload(db, userId);
    }
    if (!provider?.configured) throw serviceError(503, 'MICROSOFT_NOT_CONFIGURED', 'Microsoft Vacation Mode is not configured.');
    const user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'member' AND microsoft_principal IS NOT NULL").get(userId);
    if (!user) throw serviceError(409, 'VACATION_NOT_CONFIGURED', 'Connect a Microsoft principal before refreshing Vacation Mode.');
    const state = db.prepare('SELECT last_attempt_at FROM vacation_sync_state WHERE user_id = ?').get(userId);
    if (state?.last_attempt_at && clock().getTime() - new Date(state.last_attempt_at).getTime() < 60_000) {
      throw serviceError(429, 'RATE_LIMITED', 'Vacation Mode was checked recently. Try again in a minute.');
    }
    return syncUser(user);
  }

  async function setManualVacation(userId, { enabled, startsAt, endsAt }) {
    const user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'member'").get(userId);
    if (!user) throw serviceError(404, 'NOT_FOUND', 'Member not found.');
    const now = clock();
    const nowIso = now.toISOString();

    if (!enabled) {
      db.prepare(`
        INSERT INTO vacation_manual_settings (user_id, enabled, starts_at, ends_at, updated_at)
        VALUES (?, 0, NULL, NULL, ?)
        ON CONFLICT(user_id) DO UPDATE SET enabled = 0, starts_at = NULL, ends_at = NULL, updated_at = excluded.updated_at
      `).run(userId, nowIso);
      const periods = db.prepare(`
        SELECT * FROM vacation_periods
        WHERE user_id = ? AND status IN ('scheduled', 'active')
        ORDER BY starts_at
      `).all(userId);
      for (const period of periods) {
        if (period.status === 'active') await finishManualPeriod(period, user, nowIso);
        else db.prepare("UPDATE vacation_periods SET status = 'completed', completed_at = ?, last_detected_at = ? WHERE id = ?")
          .run(nowIso, nowIso, period.id);
      }
      return vacationPayload(db, userId);
    }

    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (!Number.isFinite(start.getTime())) throw serviceError(400, 'INVALID_INPUT', 'Choose a valid start date and time.', 'startsAt');
    if (!Number.isFinite(end.getTime()) || end <= start) throw serviceError(400, 'INVALID_INPUT', 'Return time must be after the start time.', 'endsAt');
    if (end.getTime() - start.getTime() > 366 * 86_400_000) throw serviceError(400, 'INVALID_INPUT', 'Vacation Mode can be scheduled for up to one year.', 'endsAt');
    const status = start <= now ? 'active' : 'scheduled';

    db.prepare(`
      UPDATE vacation_periods
      SET status = 'completed', completed_at = ?, last_detected_at = ?
      WHERE user_id = ? AND status IN ('scheduled', 'active')
    `).run(nowIso, nowIso, userId);
    db.prepare(`
      INSERT INTO vacation_manual_settings (user_id, enabled, starts_at, ends_at, updated_at)
      VALUES (?, 1, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET enabled = 1, starts_at = excluded.starts_at,
        ends_at = excluded.ends_at, updated_at = excluded.updated_at
    `).run(userId, start.toISOString(), end.toISOString(), nowIso);
    const period = db.prepare(`
      INSERT INTO vacation_periods
        (user_id, provider, provider_key, status, starts_at, ends_at, timezone, first_detected_at, last_detected_at)
      VALUES (?, 'microsoft', ?, ?, ?, ?, 'UTC', ?, ?)
    `).run(userId, `manual:${nowIso}`, status, start.toISOString(), end.toISOString(), nowIso, nowIso);
    db.prepare(`
      UPDATE vacation_email_holds SET vacation_id = ?
      WHERE intended_user_id = ? AND status = 'held'
    `).run(Number(period.lastInsertRowid), userId);
    return vacationPayload(db, userId);
  }

  return { run, refreshUser, setManualVacation };
}
