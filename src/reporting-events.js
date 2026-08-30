import { IANAZone } from 'luxon';

const TENANT_EVENTS = new Set(['created', 'archived', 'restored']);
const USER_EVENTS = new Set(['added', 'disabled', 'reactivated', 'department_moved', 'role_changed']);
const TASK_EVENTS = new Set(['assigned', 'reassigned', 'completed']);
const GRAPH_OUTCOMES = new Set(['success', 'failed', 'skipped_connection_changed']);
const METRIC_FAMILIES = ['tenantLifecycle', 'userLifecycle', 'tasks', 'rules', 'graph'];

function reportingError(code, message, field = null) {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  error.expose = true;
  if (field) error.field = field;
  return error;
}

function iso(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw reportingError('INVALID_EVENT_TIME', 'Enter a valid reporting event time.');
  return date.toISOString();
}

function nullableNumber(value) {
  return value == null ? null : Number(value);
}

function sourceValue(value) {
  return value === 'backfill' ? 'backfill' : 'application';
}

function withSavepoint(db, name, operation) {
  db.exec(`SAVEPOINT ${name}`);
  try {
    const result = operation();
    db.exec(`RELEASE SAVEPOINT ${name}`);
    return result;
  } catch (error) {
    db.exec(`ROLLBACK TO SAVEPOINT ${name}`);
    db.exec(`RELEASE SAVEPOINT ${name}`);
    throw error;
  }
}

export function normalizeTimezone(value) {
  const timezone = typeof value === 'string' ? value.trim() : '';
  if (!timezone || !IANAZone.isValidZone(timezone)) {
    throw reportingError('INVALID_TIMEZONE', 'Choose a valid organization timezone.', 'timezone');
  }
  return timezone;
}

export function ensureMetricsCompleteness(db, {
  organizationId = null,
  exactFrom,
  backfilledAt = exactFrom,
}) {
  const exact = iso(exactFrom);
  const backfilled = iso(backfilledAt);
  if (organizationId == null) {
    db.prepare(`
      INSERT OR IGNORE INTO metrics_completeness
        (scope_key, organization_id, family, exact_from, backfilled_at)
      VALUES ('platform:tenantLifecycle', NULL, 'tenantLifecycle', ?, ?)
    `).run(exact, backfilled);
    return;
  }
  const insert = db.prepare(`
    INSERT OR IGNORE INTO metrics_completeness
      (scope_key, organization_id, family, exact_from, backfilled_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const family of METRIC_FAMILIES) {
    insert.run(`organization:${Number(organizationId)}:${family}`, organizationId, family, exact, backfilled);
  }
}

export function recordTenantLifecycle(db, {
  organizationId,
  actorId = null,
  eventType,
  organizationName,
  domainSnapshot,
  occurredAt,
  source = 'application',
  dedupeKey = null,
}) {
  if (!TENANT_EVENTS.has(eventType)) throw reportingError('INVALID_TENANT_EVENT', 'Invalid tenant lifecycle event.');
  const result = db.prepare(`
    INSERT INTO tenant_lifecycle_events
      (organization_id, actor_id, event_type, organization_name_snapshot,
       domain_snapshot, occurred_at, source, dedupe_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nullableNumber(organizationId),
    nullableNumber(actorId),
    eventType,
    String(organizationName ?? ''),
    String(domainSnapshot ?? ''),
    iso(occurredAt),
    sourceValue(source),
    dedupeKey,
  );
  return Number(result.lastInsertRowid);
}

export function recordUserLifecycle(db, {
  organizationId,
  userId,
  actorId = null,
  eventType,
  departmentIdBefore = null,
  departmentIdAfter = null,
  departmentNameBefore = null,
  departmentNameAfter = null,
  roleBefore = null,
  roleAfter = null,
  userNameSnapshot,
  occurredAt,
  source = 'application',
  dedupeKey = null,
}) {
  if (!USER_EVENTS.has(eventType)) throw reportingError('INVALID_USER_EVENT', 'Invalid user lifecycle event.');
  const result = db.prepare(`
    INSERT INTO user_lifecycle_events
      (organization_id, user_id, actor_id, event_type,
       department_id_before, department_id_after,
       department_name_before, department_name_after,
       role_before, role_after, user_name_snapshot,
       occurred_at, source, dedupe_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nullableNumber(organizationId),
    nullableNumber(userId),
    nullableNumber(actorId),
    eventType,
    nullableNumber(departmentIdBefore),
    nullableNumber(departmentIdAfter),
    departmentNameBefore,
    departmentNameAfter,
    roleBefore,
    roleAfter,
    String(userNameSnapshot ?? ''),
    iso(occurredAt),
    sourceValue(source),
    dedupeKey,
  );
  return Number(result.lastInsertRowid);
}

export function recordTaskEvent(db, {
  organizationId,
  departmentId = null,
  emailId,
  actorId = null,
  assigneeId = null,
  previousAssigneeId = null,
  eventType,
  assignmentSource = null,
  departmentNameSnapshot = null,
  assigneeNameSnapshot = null,
  previousAssigneeNameSnapshot = null,
  receivedAt,
  occurredAt,
  source = 'application',
  dedupeKey = null,
}) {
  if (!TASK_EVENTS.has(eventType)) throw reportingError('INVALID_TASK_EVENT', 'Invalid task event.');
  if (assignmentSource != null && !['manual', 'rule'].includes(assignmentSource)) {
    throw reportingError('INVALID_ASSIGNMENT_SOURCE', 'Invalid task assignment source.');
  }
  const result = db.prepare(`
    INSERT INTO task_events
      (organization_id, department_id, email_id, actor_id, assignee_id,
       previous_assignee_id, event_type, assignment_source,
       department_name_snapshot, assignee_name_snapshot,
       previous_assignee_name_snapshot, received_at, occurred_at, source, dedupe_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nullableNumber(organizationId),
    nullableNumber(departmentId),
    nullableNumber(emailId),
    nullableNumber(actorId),
    nullableNumber(assigneeId),
    nullableNumber(previousAssigneeId),
    eventType,
    assignmentSource,
    departmentNameSnapshot,
    assigneeNameSnapshot,
    previousAssigneeNameSnapshot,
    iso(receivedAt),
    iso(occurredAt),
    sourceValue(source),
    dedupeKey,
  );
  return Number(result.lastInsertRowid);
}

export function recordRuleAssignment(db, {
  taskEventId,
  organizationId,
  departmentId = null,
  ruleId = null,
  assigneeId = null,
  ruleNameSnapshot,
  departmentNameSnapshot = null,
  assigneeNameSnapshot = null,
  prioritySnapshot,
  occurredAt,
  source = 'application',
  dedupeKey = null,
}) {
  const result = db.prepare(`
    INSERT INTO rule_assignment_events
      (task_event_id, organization_id, department_id, rule_id, assignee_id,
       rule_name_snapshot, department_name_snapshot, assignee_name_snapshot,
       priority_snapshot, occurred_at, source, dedupe_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    Number(taskEventId),
    nullableNumber(organizationId),
    nullableNumber(departmentId),
    nullableNumber(ruleId),
    nullableNumber(assigneeId),
    String(ruleNameSnapshot ?? ''),
    departmentNameSnapshot,
    assigneeNameSnapshot,
    Number(prioritySnapshot),
    iso(occurredAt),
    sourceValue(source),
    dedupeKey,
  );
  return Number(result.lastInsertRowid);
}

export function startGraphRun(db, {
  runId,
  organizationId,
  startedAt,
  departments = [],
}) {
  const started = iso(startedAt);
  return withSavepoint(db, 'start_graph_metrics_run', () => {
    db.prepare(`
      INSERT INTO graph_sync_runs (run_id, organization_id, started_at)
      VALUES (?, ?, ?)
    `).run(runId, organizationId, started);
    const insertDepartment = db.prepare(`
      INSERT INTO graph_sync_department_runs
        (run_id, organization_id, department_id, department_name_snapshot,
         mailbox_snapshot, started_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const department of departments) {
      insertDepartment.run(
        runId,
        organizationId,
        nullableNumber(department.departmentId),
        department.departmentName ?? null,
        String(department.mailbox),
        iso(department.startedAt ?? started),
      );
    }
    return runId;
  });
}

function durationBetween(startedAt, completedAt) {
  return Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime());
}

export function finishGraphRun(db, {
  runId,
  completedAt,
  outcome,
  failureCategory = null,
  departmentOutcomes = [],
}) {
  if (!GRAPH_OUTCOMES.has(outcome)) throw reportingError('INVALID_GRAPH_OUTCOME', 'Invalid Graph synchronization outcome.');
  const completed = iso(completedAt);
  return withSavepoint(db, 'finish_graph_metrics_run', () => {
    const current = db.prepare('SELECT started_at, completed_at FROM graph_sync_runs WHERE run_id = ?').get(runId);
    if (!current || current.completed_at) return false;
    const updateDepartment = db.prepare(`
      UPDATE graph_sync_department_runs
      SET completed_at = ?, duration_ms = ?, outcome = ?, failure_category = ?
      WHERE run_id = ? AND lower(mailbox_snapshot) = lower(?) AND completed_at IS NULL
    `);
    for (const department of departmentOutcomes) {
      if (!GRAPH_OUTCOMES.has(department.outcome)) {
        throw reportingError('INVALID_GRAPH_OUTCOME', 'Invalid Graph synchronization outcome.');
      }
      const child = db.prepare(`
        SELECT started_at FROM graph_sync_department_runs
        WHERE run_id = ? AND lower(mailbox_snapshot) = lower(?)
      `).get(runId, department.mailbox);
      if (!child) continue;
      const childCompleted = iso(department.completedAt ?? completed);
      updateDepartment.run(
        childCompleted,
        durationBetween(child.started_at, childCompleted),
        department.outcome,
        department.failureCategory ?? null,
        runId,
        department.mailbox,
      );
    }
    db.prepare(`
      UPDATE graph_sync_runs
      SET completed_at = ?, duration_ms = ?, outcome = ?, failure_category = ?
      WHERE run_id = ? AND completed_at IS NULL
    `).run(completed, durationBetween(current.started_at, completed), outcome, failureCategory, runId);
    return true;
  });
}

export function interruptOpenGraphRuns(db, completedAt = new Date()) {
  const completed = iso(completedAt);
  return withSavepoint(db, 'interrupt_graph_metrics_runs', () => {
    const children = db.prepare(`
      UPDATE graph_sync_department_runs
      SET completed_at = ?,
          duration_ms = MAX(0, CAST((julianday(?) - julianday(started_at)) * 86400000 AS INTEGER)),
          outcome = 'failed', failure_category = 'interrupted'
      WHERE completed_at IS NULL
    `).run(completed, completed);
    const runs = db.prepare(`
      UPDATE graph_sync_runs
      SET completed_at = ?,
          duration_ms = MAX(0, CAST((julianday(?) - julianday(started_at)) * 86400000 AS INTEGER)),
          outcome = 'failed', failure_category = 'interrupted'
      WHERE completed_at IS NULL
    `).run(completed, completed);
    return { runs: Number(runs.changes), departments: Number(children.changes) };
  });
}

export function backfillReportingEvents(db, now = new Date()) {
  const backfilledAt = iso(now);
  ensureMetricsCompleteness(db, { exactFrom: backfilledAt, backfilledAt });
  const organizations = db.prepare(`
    SELECT id, name, domain, created_at FROM organizations ORDER BY id
  `).all();
  const insertTenant = db.prepare(`
    INSERT OR IGNORE INTO tenant_lifecycle_events
      (organization_id, actor_id, event_type, organization_name_snapshot,
       domain_snapshot, occurred_at, source, dedupe_key)
    SELECT ?, NULL, 'created', ?, ?, ?, 'backfill', ?
    WHERE NOT EXISTS (
      SELECT 1 FROM tenant_lifecycle_events
      WHERE organization_id = ? AND event_type = 'created'
    )
  `);
  for (const organization of organizations) {
    const createdAt = organization.created_at || backfilledAt;
    insertTenant.run(
      organization.id,
      organization.name,
      organization.domain,
      createdAt,
      `backfill:organization:${organization.id}:created`,
      organization.id,
    );
    ensureMetricsCompleteness(db, {
      organizationId: organization.id,
      exactFrom: backfilledAt,
      backfilledAt,
    });
  }

  const emails = db.prepare(`
    SELECT emails.*, departments.name AS department_name,
      assignee.name AS assignee_name, completer.name AS completer_name
    FROM emails
    LEFT JOIN departments ON departments.id = emails.department_id
    LEFT JOIN users assignee ON assignee.id = emails.assignee_id
    LEFT JOIN users completer ON completer.id = emails.completed_by
    WHERE emails.status IN ('assigned', 'completed')
      AND emails.assigned_at IS NOT NULL
    ORDER BY emails.id
  `).all();
  for (const email of emails) {
    const assignedEventId = db.prepare(`
      SELECT id FROM task_events
      WHERE email_id = ? AND event_type IN ('assigned', 'reassigned')
      ORDER BY occurred_at, id LIMIT 1
    `).get(email.id)?.id;
    if (!assignedEventId) {
      recordTaskEvent(db, {
        organizationId: email.organization_id,
        departmentId: email.department_id,
        emailId: email.id,
        assigneeId: email.assignee_id,
        eventType: 'assigned',
        assignmentSource: null,
        departmentNameSnapshot: email.department_name,
        assigneeNameSnapshot: email.assignee_name,
        receivedAt: email.received_at,
        occurredAt: email.assigned_at,
        source: 'backfill',
        dedupeKey: `backfill:email:${email.id}:assigned`,
      });
    }
    if (email.status === 'completed' && email.completed_at) {
      const existing = db.prepare(`
        SELECT id FROM task_events
        WHERE email_id = ? AND event_type = 'completed'
        ORDER BY occurred_at, id LIMIT 1
      `).get(email.id);
      if (!existing) {
        recordTaskEvent(db, {
          organizationId: email.organization_id,
          departmentId: email.department_id,
          emailId: email.id,
          actorId: email.completed_by,
          assigneeId: email.completed_by ?? email.assignee_id,
          eventType: 'completed',
          departmentNameSnapshot: email.department_name,
          assigneeNameSnapshot: email.completer_name ?? email.assignee_name,
          receivedAt: email.received_at,
          occurredAt: email.completed_at,
          source: 'backfill',
          dedupeKey: `backfill:email:${email.id}:completed`,
        });
      }
    }
  }
}
