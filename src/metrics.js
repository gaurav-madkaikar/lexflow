import { DateTime } from 'luxon';

import { normalizeTimezone } from './reporting-events.js';

const PRESETS = new Set(['this-week', '30-days', '6-months', 'custom']);
const SAFE_GRAPH_FAILURES = new Set([
  'authentication',
  'authorization',
  'connection_missing',
  'connection_changed',
  'interrupted',
  'network',
  'rate_limited',
  'service_unavailable',
  'sync_failed',
]);

function metricsError(code, message, field = null, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.expose = true;
  if (field) error.field = field;
  return error;
}

function scalar(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function validDateInput(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value);
}

function autoBucket(from, to) {
  const days = Math.max(1, Math.ceil(to.diff(from, 'days').days));
  if (days <= 31) return 'day';
  if (days <= 180) return 'week';
  return 'month';
}

export function normalizeMetricsQuery({ query = {}, timezone = 'UTC', now = new Date() } = {}) {
  const zone = normalizeTimezone(timezone);
  const nowInstant = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(nowInstant.getTime())) {
    throw metricsError('INVALID_METRICS_TIME', 'Metrics could not determine the current time.');
  }
  const localNow = DateTime.fromJSDate(nowInstant, { zone });
  const requestedPreset = String(scalar(query.preset) ?? '30-days');
  const preset = PRESETS.has(requestedPreset) ? requestedPreset : '30-days';
  let from;
  let to;

  if (preset === 'custom') {
    const fromValue = scalar(query.from);
    const toValue = scalar(query.to);
    if (!validDateInput(fromValue) || !validDateInput(toValue)) {
      throw metricsError('INVALID_METRICS_RANGE', 'Choose a valid start and end date.', 'range');
    }
    from = DateTime.fromISO(fromValue, { zone }).startOf('day');
    const inclusiveTo = DateTime.fromISO(toValue, { zone }).startOf('day');
    if (!from.isValid || !inclusiveTo.isValid || inclusiveTo < from) {
      throw metricsError('INVALID_METRICS_RANGE', 'The end date must be on or after the start date.', 'range');
    }
    to = inclusiveTo.plus({ days: 1 });
  } else if (preset === 'this-week') {
    from = localNow.startOf('week');
    to = localNow;
  } else if (preset === '6-months') {
    from = localNow.minus({ months: 6 });
    to = localNow;
  } else {
    from = localNow.minus({ days: 30 });
    to = localNow;
  }

  if (to.diff(from, 'years').years > 5) {
    throw metricsError('METRICS_RANGE_TOO_LARGE', 'Choose a date range of five years or less.', 'range');
  }
  const duration = to.toUTC().toMillis() - from.toUTC().toMillis();
  const previousFrom = from.toUTC().minus({ milliseconds: duration });
  return {
    from: from.toUTC().toISO(),
    to: to.toUTC().toISO(),
    timezone: zone,
    bucket: autoBucket(from, to),
    preset,
    previousFrom: previousFrom.toISO(),
    previousTo: from.toUTC().toISO(),
  };
}

function bucketUnit(period) {
  return period.bucket === 'month' ? 'month' : period.bucket === 'week' ? 'week' : 'day';
}

function bucketLabel(value, unit) {
  if (unit === 'month') return value.toFormat('MMM yyyy');
  if (unit === 'week') return `Week of ${value.toFormat('MMM d')}`;
  return value.toFormat('MMM d');
}

function buildBuckets(period) {
  const unit = bucketUnit(period);
  const rangeFrom = DateTime.fromISO(period.from, { zone: 'utc' }).setZone(period.timezone);
  const rangeTo = DateTime.fromISO(period.to, { zone: 'utc' }).setZone(period.timezone);
  let cursor = rangeFrom.startOf(unit);
  const buckets = [];
  while (cursor < rangeTo && buckets.length < 2_000) {
    const next = cursor.plus({ [unit]: 1 });
    buckets.push({
      key: cursor.toISODate(),
      label: bucketLabel(cursor, unit),
      from: cursor.toUTC().toISO(),
      to: next.toUTC().toISO(),
    });
    cursor = next;
  }
  return buckets;
}

function bucketKey(instant, period) {
  const local = DateTime.fromISO(instant, { zone: 'utc' }).setZone(period.timezone);
  return local.startOf(bucketUnit(period)).toISODate();
}

function zeroSeries(buckets) {
  return new Map(buckets.map(bucket => [bucket.key, 0]));
}

function values(series, buckets, exactFrom = null) {
  return buckets.map(bucket => {
    const value = series.get(bucket.key) ?? 0;
    const hasExactCoverage = exactFrom != null && bucket.from >= exactFrom;
    return value === 0 && !hasExactCoverage ? null : value;
  });
}

function inRange(instant, period, endpoint = period.to) {
  return instant >= period.from && instant < endpoint;
}

function endpointFor(period, now = new Date()) {
  const nowIso = (now instanceof Date ? now : new Date(now)).toISOString();
  return nowIso < period.to ? nowIso : period.to;
}

function average(numbers) {
  if (!numbers.length) return null;
  return numbers.reduce((total, value) => total + value, 0) / numbers.length;
}

function elapsed(from, to) {
  return Math.max(0, Date.parse(to) - Date.parse(from));
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : null;
}

function card(id, label, value, format = 'number', secondary = undefined) {
  return { id, label, value, format, ...(secondary === undefined ? {} : { secondary }) };
}

function completenessFor(db, organizationId, families, period) {
  const rows = organizationId == null
    ? db.prepare('SELECT family, exact_from FROM metrics_completeness WHERE organization_id IS NULL').all()
    : db.prepare('SELECT family, exact_from FROM metrics_completeness WHERE organization_id = ?').all(organizationId);
  const byFamily = new Map(rows.map(row => [row.family, row.exact_from]));
  return Object.fromEntries(families.map(family => {
    const exactFrom = byFamily.get(family) ?? null;
    return [family, {
      status: exactFrom == null ? 'unavailable' : period.from >= exactFrom ? 'complete' : 'partial',
      exactFrom,
    }];
  }));
}

function safeGraphFailure(value) {
  if (!value) return null;
  return SAFE_GRAPH_FAILURES.has(value) ? value : 'sync_failed';
}

function basePayload(scope, period, completeness) {
  return { scope, period, completeness, cards: [], plots: [], filters: {}, details: {} };
}

export function getPlatformMetrics({ db, period }) {
  const payload = basePayload(
    'platform',
    period,
    completenessFor(db, null, ['tenantLifecycle'], period),
  );
  const counts = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archived,
      COUNT(*) AS total
    FROM organizations
    WHERE entra_tenant_id IS NOT NULL
  `).get();
  const active = Number(counts.active ?? 0);
  const archived = Number(counts.archived ?? 0);
  const total = Number(counts.total ?? 0);
  payload.cards = [
    card('activeTenants', 'Active tenants', active),
    card('archivedTenants', 'Archived tenants', archived),
    card('totalTenants', 'Total tenants', total),
  ];
  payload.plots = [{
    id: 'tenantStatus',
    hasData: total > 0,
    kind: 'doughnut',
    title: 'Tenant status',
    summary: total ? `${active} active and ${archived} archived tenants.` : 'No customer tenants are configured.',
    labels: ['Active', 'Archived'],
    series: [{ id: 'tenants', label: 'Tenants', data: [active, archived] }],
    table: [
      { label: 'Active', value: active },
      { label: 'Archived', value: archived },
    ],
  }];
  payload.details.tenants = db.prepare(`
    SELECT organizations.id, organizations.name, organizations.domain, organizations.status,
      organizations.created_at AS createdAt,
      (
        SELECT MAX(events.occurred_at)
        FROM tenant_lifecycle_events events
        WHERE events.organization_id = organizations.id
          AND events.event_type IN ('archived', 'restored')
      ) AS latestStatusChange
    FROM organizations
    WHERE organizations.entra_tenant_id IS NOT NULL
    ORDER BY organizations.name COLLATE NOCASE
  `).all().map(row => ({ ...row }));
  payload.details.lifecycle = db.prepare(`
    SELECT events.event_type AS eventType,
      events.organization_name_snapshot AS organizationName,
      events.domain_snapshot AS domain, events.occurred_at AS occurredAt
    FROM tenant_lifecycle_events events
    JOIN organizations ON organizations.id = events.organization_id
    WHERE organizations.entra_tenant_id IS NOT NULL
      AND events.occurred_at >= ? AND events.occurred_at < ?
    ORDER BY events.occurred_at DESC, events.id DESC
  `).all(period.from, period.to).map(row => ({ ...row }));
  return payload;
}

function lifecycleDepartment(row) {
  return row.department_id_after ?? row.department_id_before ?? null;
}

function organizationUserFilter(departmentId) {
  if (departmentId === 'unassigned') return { sql: "AND users.department_id IS NULL AND users.role = 'member'", values: [] };
  if (departmentId === 'organization-wide') return { sql: "AND users.role = 'admin'", values: [] };
  if (departmentId != null) return { sql: 'AND users.department_id = ?', values: [Number(departmentId)] };
  return { sql: '', values: [] };
}

function lifecycleMatchesDepartment(row, departmentId) {
  if (departmentId == null) return true;
  const eventDepartment = lifecycleDepartment(row);
  const role = row.role_after ?? row.role_before;
  if (departmentId === 'organization-wide') return role === 'org_admin' || role === 'admin';
  if (departmentId === 'unassigned') {
    return eventDepartment == null && role !== 'org_admin' && role !== 'admin';
  }
  return Number(eventDepartment) === Number(departmentId);
}

export function getOrganizationMetrics({ db, organizationId, departmentId = null, period, now = new Date() }) {
  const payload = basePayload(
    'organization',
    period,
    completenessFor(db, organizationId, ['userLifecycle', 'graph'], period),
  );
  const currentFilter = organizationUserFilter(departmentId);
  const current = db.prepare(`
    SELECT COUNT(*) AS count
    FROM users
    WHERE users.organization_id = ? AND users.account_status = 'active'
      AND users.is_platform_admin = 0
      ${currentFilter.sql}
  `).get(organizationId, ...currentFilter.values).count;
  const lifecycle = db.prepare(`
    SELECT id, user_id, event_type, department_id_before, department_id_after,
      department_name_before, department_name_after, role_before, role_after,
      user_name_snapshot, occurred_at
    FROM user_lifecycle_events
    WHERE organization_id = ? AND occurred_at >= ? AND occurred_at < ?
      AND event_type IN ('added', 'disabled', 'reactivated')
    ORDER BY occurred_at, id
  `).all(organizationId, period.from, period.to)
    .filter(row => lifecycleMatchesDepartment(row, departmentId));
  const added = lifecycle.filter(row => row.event_type === 'added').length;
  const disabled = lifecycle.filter(row => row.event_type === 'disabled').length;
  const reactivated = lifecycle.filter(row => row.event_type === 'reactivated').length;

  const graphUnavailable = departmentId === 'unassigned' || departmentId === 'organization-wide';
  const graphTable = departmentId != null && !graphUnavailable
    ? 'graph_sync_department_runs'
    : 'graph_sync_runs';
  const graphDepartmentClause = graphTable === 'graph_sync_department_runs' ? ' AND department_id = ?' : '';
  const graphValues = graphTable === 'graph_sync_department_runs'
    ? [organizationId, Number(departmentId), period.from, period.to]
    : [organizationId, period.from, period.to];
  const graphRuns = graphUnavailable ? [] : db.prepare(`
    SELECT started_at, completed_at, duration_ms, outcome, failure_category
    FROM ${graphTable}
    WHERE organization_id = ?${graphDepartmentClause}
      AND started_at >= ? AND started_at < ?
    ORDER BY started_at, ${graphTable === 'graph_sync_runs' ? 'run_id' : 'id'}
  `).all(...graphValues);
  const latestSuccessValues = graphTable === 'graph_sync_department_runs'
    ? [organizationId, Number(departmentId)]
    : [organizationId];
  const latestSuccess = graphUnavailable ? null : db.prepare(`
    SELECT MAX(completed_at) AS completedAt
    FROM ${graphTable}
    WHERE organization_id = ?${graphDepartmentClause} AND outcome = 'success'
  `).get(...latestSuccessValues).completedAt ?? null;
  const eligible = graphRuns.filter(run => run.outcome === 'success' || run.outcome === 'failed');
  const successCount = eligible.filter(run => run.outcome === 'success').length;
  const successRate = ratio(successCount, eligible.length);
  const freshness = latestSuccess == null ? null : elapsed(latestSuccess, endpointFor(period, now));
  payload.cards = [
    card('activeUsers', 'Current active users', Number(current)),
    card('usersAdded', 'Users added', added),
    card('usersDisabled', 'Users disabled', disabled),
    card('usersReactivated', 'Users reactivated', reactivated),
    card('graphFreshness', 'Graph freshness', freshness, 'duration', latestSuccess ? { lastSuccessAt: latestSuccess } : null),
    card('graphSuccessRate', 'Graph success rate', successRate, 'percentage'),
  ];

  const buckets = buildBuckets(period);
  const lifecycleSeries = {
    added: zeroSeries(buckets),
    disabled: zeroSeries(buckets),
    reactivated: zeroSeries(buckets),
  };
  for (const event of lifecycle) {
    const key = bucketKey(event.occurred_at, period);
    lifecycleSeries[event.event_type].set(key, (lifecycleSeries[event.event_type].get(key) ?? 0) + 1);
  }
  const lifecycleExactFrom = payload.completeness.userLifecycle.exactFrom;
  const addedSeries = values(lifecycleSeries.added, buckets, lifecycleExactFrom);
  const disabledSeries = values(lifecycleSeries.disabled, buckets, lifecycleExactFrom);
  const reactivatedSeries = values(lifecycleSeries.reactivated, buckets, lifecycleExactFrom);
  payload.plots.push({
    id: 'peopleLifecycle',
    hasData: lifecycle.length > 0,
    kind: 'groupedBar',
    title: 'People lifecycle',
    summary: `${added} added, ${disabled} disabled, and ${reactivated} reactivated in this period.`,
    labels: buckets.map(bucket => bucket.label),
    series: [
      { id: 'added', label: 'Added', data: addedSeries },
      { id: 'disabled', label: 'Disabled', data: disabledSeries },
      { id: 'reactivated', label: 'Reactivated', data: reactivatedSeries },
    ],
    table: buckets.map((bucket, index) => ({
      label: bucket.label,
      added: addedSeries[index],
      disabled: disabledSeries[index],
      reactivated: reactivatedSeries[index],
    })),
  });
  const durations = new Map(buckets.map(bucket => [bucket.key, []]));
  for (const run of graphRuns) {
    if (run.duration_ms == null) continue;
    const key = bucketKey(run.started_at, period);
    if (durations.has(key)) durations.get(key).push(Number(run.duration_ms));
  }
  const graphData = buckets.map(bucket => average(durations.get(bucket.key)));
  payload.plots.push({
    id: 'graphHealth',
    hasData: graphRuns.some(run => run.duration_ms != null),
    kind: 'line',
    title: 'Microsoft Graph health',
    summary: eligible.length
      ? `${successCount} of ${eligible.length} completed refresh runs succeeded.`
      : 'No completed Microsoft Graph refresh runs are available for this period.',
    labels: buckets.map(bucket => bucket.label),
    series: [{ id: 'duration', label: 'Average duration', data: graphData, format: 'duration' }],
    table: graphRuns.map(run => ({
      startedAt: run.started_at,
      completedAt: run.completed_at,
      duration: run.duration_ms == null ? null : Number(run.duration_ms),
      outcome: run.outcome ?? 'in_progress',
      failureCategory: safeGraphFailure(run.failure_category),
    })),
  });
  payload.filters.departments = [
    { id: null, label: 'All departments' },
    { id: 'organization-wide', label: 'Organization-wide' },
    ...db.prepare(`
      SELECT id, name AS label FROM departments
      WHERE organization_id = ? ORDER BY name COLLATE NOCASE
    `).all(organizationId).map(row => ({ id: Number(row.id), label: row.label })),
    { id: 'unassigned', label: 'Unassigned' },
  ];
  payload.details.lifecycle = lifecycle.map(row => ({
    eventType: row.event_type,
    userName: row.user_name_snapshot,
    departmentBefore: row.department_name_before,
    departmentAfter: row.department_name_after,
    roleBefore: row.role_before,
    roleAfter: row.role_after,
    occurredAt: row.occurred_at,
  }));
  payload.details.graphMailboxes = graphUnavailable ? [] : db.prepare(`
    SELECT departments.id AS departmentId, departments.name AS departmentName,
      departments.shared_mailbox AS mailbox,
      MAX(CASE WHEN runs.outcome = 'success' THEN runs.completed_at END) AS lastSuccessAt,
      AVG(CASE WHEN runs.outcome IN ('success', 'failed') THEN runs.duration_ms END) AS averageDuration,
      (
        SELECT latest.outcome FROM graph_sync_department_runs latest
        WHERE latest.organization_id = departments.organization_id
          AND latest.department_id = departments.id
        ORDER BY latest.started_at DESC, latest.id DESC LIMIT 1
      ) AS latestOutcome
    FROM departments
    LEFT JOIN graph_sync_department_runs runs
      ON runs.organization_id = departments.organization_id
      AND runs.department_id = departments.id
    WHERE departments.organization_id = ?
      ${departmentId != null && !graphUnavailable ? 'AND departments.id = ?' : ''}
    GROUP BY departments.id
    ORDER BY departments.name COLLATE NOCASE
  `).all(...(departmentId != null && !graphUnavailable
    ? [organizationId, Number(departmentId)]
    : [organizationId])).map(row => ({
    ...row,
    departmentId: Number(row.departmentId),
    averageDuration: row.averageDuration == null ? null : Number(row.averageDuration),
    freshness: row.lastSuccessAt == null ? null : elapsed(row.lastSuccessAt, endpointFor(period, now)),
    latestOutcome: row.latestOutcome ?? 'not_run',
  }));
  return payload;
}

function allTaskEvents(db, organizationId, departmentId, endpoint) {
  return db.prepare(`
    SELECT id, email_id, actor_id, assignee_id, previous_assignee_id, event_type,
      assignment_source, department_name_snapshot, assignee_name_snapshot,
      previous_assignee_name_snapshot, received_at, occurred_at
    FROM task_events
    WHERE organization_id = ? AND department_id = ? AND occurred_at < ?
    ORDER BY occurred_at, id
  `).all(organizationId, departmentId, endpoint);
}

function groupTaskEvents(events) {
  const grouped = new Map();
  for (const event of events) {
    const key = event.email_id == null ? `event:${event.id}` : `email:${event.email_id}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(event);
  }
  return grouped;
}

function firstAssignment(events) {
  return events.find(event => event.event_type === 'assigned') ?? null;
}

function latestAssignment(events, endpoint) {
  return events.filter(event => ['assigned', 'reassigned'].includes(event.event_type) && event.occurred_at < endpoint).at(-1) ?? null;
}

function completionBefore(events, endpoint, userId = null) {
  return events.find(event => event.event_type === 'completed'
    && event.occurred_at < endpoint
    && (userId == null || Number(event.assignee_id) === Number(userId))) ?? null;
}

function taskCohort(grouped, period, endpoint, employeeId = null) {
  const cohort = [];
  for (const [key, events] of grouped) {
    const assigned = firstAssignment(events);
    if (!assigned || !inRange(assigned.occurred_at, period, endpoint)) continue;
    if (employeeId != null && Number(assigned.assignee_id) !== Number(employeeId)) continue;
    cohort.push({ key, events, assigned });
  }
  return cohort;
}

function taskOutcome(task, endpoint, slaHours, completionUserId = null) {
  const completion = completionBefore(task.events, endpoint, completionUserId);
  if (completion) return { status: 'completed', completion };
  const latest = latestAssignment(task.events, endpoint) ?? task.assigned;
  const deadline = Date.parse(latest.occurred_at) + slaHours * 60 * 60 * 1_000;
  return { status: deadline <= Date.parse(endpoint) ? 'overdue' : 'open', completion: null };
}

function departmentEmployees(db, organizationId, departmentId) {
  return db.prepare(`
    SELECT id, name, CASE WHEN id = (
      SELECT head_user_id FROM departments WHERE id = ? AND organization_id = ?
    ) THEN 'dep_admin' ELSE 'member' END AS role
    FROM users
    WHERE organization_id = ? AND department_id = ?
      AND role = 'member' AND account_status IN ('pending', 'active')
    ORDER BY name COLLATE NOCASE
  `).all(departmentId, organizationId, organizationId, departmentId)
    .map(row => ({ id: Number(row.id), name: row.name, role: row.role }));
}

function workspaceSlaHours(db, organizationId) {
  return Number(db.prepare(`
    SELECT time_assigned_unmarked_hours AS hours
    FROM workspace_settings WHERE organization_id = ? ORDER BY id LIMIT 1
  `).get(organizationId)?.hours ?? 24);
}

function performanceRows(events, period, endpoint, employees) {
  const byEmployee = new Map(employees.map(employee => [employee.id, {
    id: employee.id,
    label: employee.name,
    role: employee.role,
    assignments: 0,
    completed: 0,
  }]));
  for (const event of events) {
    if (!inRange(event.occurred_at, period, endpoint) || event.assignee_id == null) continue;
    const employeeId = Number(event.assignee_id);
    if (!byEmployee.has(employeeId)) continue;
    if (event.event_type === 'assigned' || event.event_type === 'reassigned') {
      byEmployee.get(employeeId).assignments += 1;
    } else if (event.event_type === 'completed') {
      byEmployee.get(employeeId).completed += 1;
    }
  }
  return [...byEmployee.values()];
}

function rulePerformance(db, organizationId, departmentId, period, endpoint, grouped) {
  const currentRules = db.prepare(`
    SELECT id, name
    FROM rules
    WHERE organization_id = ? AND department_id = ? AND enabled = 1
    ORDER BY priority DESC, id
  `).all(organizationId, departmentId);
  const attributions = db.prepare(`
    SELECT rule_id, rule_name_snapshot, occurred_at, task_event_id
    FROM rule_assignment_events
    WHERE organization_id = ? AND department_id = ?
      AND occurred_at >= ? AND occurred_at < ?
    ORDER BY occurred_at, id
  `).all(organizationId, departmentId, period.from, endpoint);
  const taskByEvent = new Map();
  for (const [taskKey, events] of grouped) {
    for (const event of events) taskByEvent.set(Number(event.id), { taskKey, events, event });
  }
  const rows = new Map(currentRules.map(rule => [`rule:${Number(rule.id)}`, {
    id: Number(rule.id),
    label: rule.name,
    assignments: 0,
    completed: 0,
    resolutionTimes: [],
    source: 'rule',
  }]));
  for (const attribution of attributions) {
    const linked = taskByEvent.get(Number(attribution.task_event_id));
    const currentKey = attribution.rule_id == null ? null : `rule:${Number(attribution.rule_id)}`;
    const key = currentKey && rows.has(currentKey)
      ? currentKey
      : `snapshot:${attribution.rule_id ?? 'deleted'}:${attribution.rule_name_snapshot}`;
    if (!rows.has(key)) rows.set(key, {
      id: attribution.rule_id == null ? key : Number(attribution.rule_id),
      label: attribution.rule_name_snapshot,
      assignments: 0,
      completed: 0,
      resolutionTimes: [],
      source: 'rule',
    });
    const row = rows.get(key);
    row.assignments += 1;
    if (linked) {
      const completion = completionBefore(linked.events, endpoint);
      if (completion) {
        row.completed += 1;
        row.resolutionTimes.push(elapsed(linked.event.received_at, completion.occurred_at));
      }
    }
  }
  const manual = {
    id: 'manual', label: 'Manual assignment', assignments: 0, completed: 0,
    resolutionTimes: [], source: 'manual',
  };
  for (const events of grouped.values()) {
    for (const event of events) {
      if (event.assignment_source !== 'manual' || !['assigned', 'reassigned'].includes(event.event_type)
        || !inRange(event.occurred_at, period, endpoint)) continue;
      manual.assignments += 1;
      const completion = completionBefore(events, endpoint);
      if (completion) {
        manual.completed += 1;
        manual.resolutionTimes.push(elapsed(event.received_at, completion.occurred_at));
      }
    }
  }
  if (manual.assignments) rows.set('manual', manual);
  return [...rows.values()].map(row => ({
    id: row.id,
    label: row.label,
    assignments: row.assignments,
    completed: row.completed,
    completionRate: ratio(row.completed, row.assignments),
    averageResolution: average(row.resolutionTimes),
    source: row.source,
  })).sort((left, right) => {
    if (left.source !== right.source) return left.source === 'manual' ? 1 : -1;
    return right.assignments - left.assignments || left.label.localeCompare(right.label);
  });
}

export function getDepartmentMetrics({
  db,
  organizationId,
  departmentId,
  employeeId = null,
  period,
  now = new Date(),
}) {
  const endpoint = endpointFor(period, now);
  const employees = departmentEmployees(db, organizationId, departmentId);
  if (employeeId != null && !employees.some(employee => employee.id === Number(employeeId))) {
    throw metricsError('METRICS_FILTER_NOT_FOUND', 'That metrics filter is not available.', 'employeeId', 404);
  }
  const events = allTaskEvents(db, organizationId, departmentId, endpoint);
  const grouped = groupTaskEvents(events);
  const cohort = taskCohort(grouped, period, endpoint, employeeId);
  const slaHours = workspaceSlaHours(db, organizationId);
  const outcomes = cohort.map(task => ({ ...task, ...taskOutcome(task, endpoint, slaHours) }));
  const completedCohort = outcomes.filter(item => item.status === 'completed');
  const completedInPeriod = events.filter(event => event.event_type === 'completed'
    && inRange(event.occurred_at, period, endpoint)
    && (employeeId == null || Number(event.assignee_id) === Number(employeeId))).length;
  const open = outcomes.filter(item => item.status === 'open').length;
  const overdue = outcomes.filter(item => item.status === 'overdue').length;
  const resolutionTimes = completedCohort.map(item => elapsed(item.assigned.received_at, item.completion.occurred_at));
  const handlingTimes = completedCohort.map(item => {
    const latest = latestAssignment(item.events.filter(event => event.occurred_at <= item.completion.occurred_at), item.completion.occurred_at)
      ?? item.assigned;
    return elapsed(latest.occurred_at, item.completion.occurred_at);
  });
  const payload = basePayload(
    'department',
    period,
    completenessFor(db, organizationId, ['tasks', 'rules'], period),
  );
  payload.cards = [
    card('assigned', 'Tasks assigned', cohort.length),
    card('completed', 'Tasks completed', completedInPeriod, 'number', {
      label: 'Cohort completion rate', value: ratio(completedCohort.length, cohort.length), format: 'percentage',
    }),
    card('nonCompletions', 'Non-completions', open + overdue, 'number', { open, overdue }),
    card('resolution', 'Average total resolution', average(resolutionTimes), 'duration'),
    card('handling', 'Average handling time', average(handlingTimes), 'duration'),
  ];
  const buckets = buildBuckets(period);
  const outcomeSeries = {
    completed: zeroSeries(buckets),
    open: zeroSeries(buckets),
    overdue: zeroSeries(buckets),
  };
  for (const outcome of outcomes) {
    const key = bucketKey(outcome.assigned.occurred_at, period);
    outcomeSeries[outcome.status].set(key, (outcomeSeries[outcome.status].get(key) ?? 0) + 1);
  }
  const tasksExactFrom = payload.completeness.tasks.exactFrom;
  const completedSeries = values(outcomeSeries.completed, buckets, tasksExactFrom);
  const openSeries = values(outcomeSeries.open, buckets, tasksExactFrom);
  const overdueSeries = values(outcomeSeries.overdue, buckets, tasksExactFrom);
  payload.plots.push({
    id: 'outcomes',
    hasData: cohort.length > 0,
    kind: 'stackedBar',
    title: 'Assignment outcomes',
    summary: `${completedCohort.length} completed, ${open} open within SLA, and ${overdue} overdue.`,
    labels: buckets.map(bucket => bucket.label),
    series: [
      { id: 'completed', label: 'Completed', data: completedSeries },
      { id: 'open', label: 'Open within SLA', data: openSeries },
      { id: 'overdue', label: 'Overdue', data: overdueSeries },
    ],
    table: buckets.map((bucket, index) => ({
      label: bucket.label,
      completed: completedSeries[index],
      open: openSeries[index],
      overdue: overdueSeries[index],
    })),
  });
  const employeeRows = performanceRows(events, period, endpoint, employees);
  payload.plots.push({
    id: 'employees',
    hasData: employeeRows.some(row => row.assignments > 0 || row.completed > 0),
    plotGroup: 'performance',
    kind: 'horizontalBar',
    title: 'Employee performance',
    summary: `${employeeRows.length} department employees in this view.`,
    labels: employeeRows.map(row => row.label),
    series: [
      { id: 'assignments', label: 'Assignments received', data: employeeRows.map(row => row.assignments) },
      { id: 'completed', label: 'Tasks completed', data: employeeRows.map(row => row.completed) },
    ],
    table: employeeRows,
  });
  const ruleRows = rulePerformance(db, organizationId, departmentId, period, endpoint, grouped);
  payload.plots.push({
    id: 'rules',
    hasData: ruleRows.some(row => row.assignments > 0),
    plotGroup: 'performance',
    kind: 'horizontalBar',
    title: 'Automation rule performance',
    summary: ruleRows.length ? `${ruleRows.length} assignment sources in this period.` : 'No rule assignments in this period.',
    labels: ruleRows.map(row => row.label),
    series: [{ id: 'assignments', label: 'Assignments', data: ruleRows.map(row => row.assignments) }],
    table: ruleRows,
  });
  payload.filters.employees = [{ id: null, label: 'All employees' }, ...employees.map(employee => ({
    id: employee.id,
    label: employee.name,
    role: employee.role,
  }))];
  payload.details = {
    endpoint,
    slaHours,
    selectedEmployeeId: employeeId == null ? null : Number(employeeId),
  };
  return payload;
}

export function getMemberMetrics({ db, organizationId, userId, period, now = new Date() }) {
  const endpoint = endpointFor(period, now);
  const user = db.prepare(`
    SELECT id, department_id FROM users
    WHERE id = ? AND organization_id = ? AND role = 'member'
  `).get(userId, organizationId);
  if (!user) throw metricsError('METRICS_SCOPE_NOT_FOUND', 'Metrics are not available.', null, 404);
  const events = db.prepare(`
    SELECT id, email_id, actor_id, assignee_id, previous_assignee_id, event_type,
      assignment_source, received_at, occurred_at
    FROM task_events
    WHERE organization_id = ? AND occurred_at < ?
      AND (assignee_id = ? OR previous_assignee_id = ?)
    ORDER BY occurred_at, id
  `).all(organizationId, endpoint, userId, userId);
  const grouped = groupTaskEvents(events);
  const received = events.filter(event => ['assigned', 'reassigned'].includes(event.event_type)
    && Number(event.assignee_id) === Number(userId)
    && inRange(event.occurred_at, period, endpoint));
  const personalCohort = [];
  const seen = new Set();
  for (const assignment of received) {
    const key = assignment.email_id == null ? `event:${assignment.id}` : `email:${assignment.email_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    personalCohort.push({ key, assigned: assignment, events: grouped.get(key) ?? [assignment] });
  }
  const completedEvents = events.filter(event => event.event_type === 'completed'
    && Number(event.assignee_id) === Number(userId)
    && inRange(event.occurred_at, period, endpoint));
  const slaHours = workspaceSlaHours(db, organizationId);
  const outcomes = personalCohort.map(task => ({
    ...task,
    ...taskOutcome(task, endpoint, slaHours, userId),
  }));
  const completedCohort = outcomes.filter(item => item.status === 'completed');
  const open = outcomes.filter(item => item.status === 'open').length;
  const overdue = outcomes.filter(item => item.status === 'overdue').length;
  const handling = completedCohort.map(item => elapsed(item.assigned.occurred_at, item.completion.occurred_at));
  const payload = basePayload(
    'member',
    period,
    completenessFor(db, organizationId, ['tasks'], period),
  );
  payload.cards = [
    card('assigned', 'Assignments received', received.length),
    card('completed', 'Tasks completed', completedEvents.length, 'number', {
      label: 'Personal completion rate', value: ratio(completedCohort.length, personalCohort.length), format: 'percentage',
    }),
    card('nonCompletions', 'Non-completions', open + overdue, 'number', { open, overdue }),
    card('handling', 'Average handling time', average(handling), 'duration'),
  ];
  const buckets = buildBuckets(period);
  const assignmentSeries = zeroSeries(buckets);
  const completionSeries = zeroSeries(buckets);
  const handlingSeries = new Map(buckets.map(bucket => [bucket.key, []]));
  for (const event of received) {
    const key = bucketKey(event.occurred_at, period);
    assignmentSeries.set(key, (assignmentSeries.get(key) ?? 0) + 1);
  }
  for (const event of completedEvents) {
    const key = bucketKey(event.occurred_at, period);
    completionSeries.set(key, (completionSeries.get(key) ?? 0) + 1);
  }
  for (const item of completedCohort) {
    const key = bucketKey(item.completion.occurred_at, period);
    if (handlingSeries.has(key)) {
      handlingSeries.get(key).push(elapsed(item.assigned.occurred_at, item.completion.occurred_at));
    }
  }
  const tasksExactFrom = payload.completeness.tasks.exactFrom;
  const assignmentsSeries = values(assignmentSeries, buckets, tasksExactFrom);
  const completedSeries = values(completionSeries, buckets, tasksExactFrom);
  payload.plots = [
    {
      id: 'workload',
      hasData: received.length > 0 || completedEvents.length > 0,
      kind: 'groupedBar',
      title: 'My workload',
      summary: `${received.length} assignments received and ${completedEvents.length} tasks completed.`,
      labels: buckets.map(bucket => bucket.label),
      series: [
        { id: 'assignments', label: 'Assignments received', data: assignmentsSeries },
        { id: 'completed', label: 'Tasks completed', data: completedSeries },
      ],
      table: buckets.map((bucket, index) => ({
        label: bucket.label,
        assignments: assignmentsSeries[index],
        completed: completedSeries[index],
      })),
    },
    {
      id: 'handlingTrend',
      hasData: handling.length > 0,
      kind: 'line',
      title: 'My handling-time trend',
      summary: handling.length ? 'Average handling time for personally completed tasks.' : 'No completed tasks are available for a handling-time trend.',
      labels: buckets.map(bucket => bucket.label),
      series: [
        { id: 'handling', label: 'Average handling time', data: buckets.map(bucket => average(handlingSeries.get(bucket.key))), format: 'duration' },
        { id: 'sla', label: 'SLA', data: buckets.map(() => slaHours * 60 * 60 * 1_000), format: 'duration' },
      ],
      table: buckets.map(bucket => ({
        label: bucket.label,
        averageHandling: average(handlingSeries.get(bucket.key)),
        sla: slaHours * 60 * 60 * 1_000,
      })),
    },
  ];
  payload.details = { endpoint, slaHours };
  return payload;
}
