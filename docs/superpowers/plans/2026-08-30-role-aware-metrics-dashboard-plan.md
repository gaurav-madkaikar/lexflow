# Role-Aware Metrics Dashboards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tenant-safe Metrics module with exact event-backed reporting, compact role-specific dashboards, meaningful interactive plots, and honest partial-history handling.

**Architecture:** Append-only reporting tables capture tenant, user, task, rule-attribution, and Microsoft Graph sync facts in the same transactions as the corresponding business changes. A focused server metrics service normalizes timezone-aware ranges with Luxon and emits role-curated KPI/plot payloads. A focused client controller renders locally bundled Chart.js plots plus accessible DOM summaries/tables, while `public/app.js` remains the navigation and session coordinator.

**Tech Stack:** Node.js 22.13+, Express 5, `node:sqlite`, vanilla ES modules, Luxon 3.7.2, Chart.js 4.5.1, Node's built-in test runner.

## Global Constraints

- Preserve the role boundary: PlatformAdmin gets tenant lifecycle only; OrgAdmin gets workforce lifecycle and Graph health only; DepAdmin gets the currently headed department; Member gets self only.
- Never expose email subjects, senders, previews, Outlook URLs, tokens, raw Graph errors, tenant/object IDs, or provider message identifiers in metrics payloads.
- Store event timestamps as UTC ISO strings and bucket them in the selected IANA timezone.
- "Removed" means disabled; reactivation is a separate lifecycle event.
- Use Monday as the start of week.
- Bucket ranges up to 31 days daily, 32–180 days weekly, and longer ranges monthly.
- Keep no more than two primary chart cards visible for any role.
- Bundle Chart.js locally; do not use a CDN.
- Every plot must have a text summary and a keyboard-accessible **View data** table.
- Backfill only evidence that exists; mark it partial and never render missing history as zero.
- Preserve all unrelated dirty-worktree changes. Do not commit an overlapping file if doing so would absorb pre-existing edits that cannot be isolated.

---

## File map

### New server files

- `src/reporting-events.js`: validates and inserts reporting events, manages Graph run lifecycle, and performs idempotent bounded backfill.
- `src/metrics.js`: range normalization, completeness calculation, role-scoped aggregation, KPI/plot payload construction, and safe metrics errors.

### New client files

- `public/metrics-model.js`: query-string state, preset/range state, value formatting, chart/table projection, and role-route selection.
- `public/metrics-charts.js`: Chart.js instance lifecycle, chart configuration, legends, summaries, click selection, and accessible data-table rendering.
- `public/metrics-view.js`: Metrics request lifecycle, stale-request suppression, filters, role dashboard rendering, and integration callbacks.

### New tests

- `test/reporting-events.test.js`: schema, transactional writes, backfill, snapshots, and Graph run idempotency.
- `test/metrics.test.js`: timezone/range logic, metric definitions, role aggregates, completeness, and performance smoke.
- `test/metrics-model.test.js`: URL state, formatting, chart/table parity, and role endpoint selection.

### Existing files to modify

- `package.json`, `package-lock.json`: add Luxon and Chart.js.
- `src/db.js`: create reporting tables/indexes, add organization timezone, and invoke backfill.
- `src/tenants.js`: tenant/user lifecycle events and timezone validation/payloads.
- `src/workspace.js`: department movement and effective-role lifecycle events.
- `src/workflows.js`: task/rule events and Graph sync-run history.
- `src/app.js`: actor/time propagation, vendor asset route, and four role-specific Metrics routes.
- `public/index.html`: Metrics navigation, page shell, filters, chart containers, detail tables, and local Chart.js script.
- `public/app.js`: initialize the Metrics controller, route to Metrics, refresh current ranges, and connect authorized drill-downs.
- `public/styles.css`: Metrics layout, charts, filters, loading/partial/error states, responsive behavior, and reduced motion.
- `README.md`: timezone, metric semantics, privacy boundaries, and partial-history behavior.
- `test/app.test.js`, `test/tenants.test.js`, `test/workspace.test.js`, `test/outlook.test.js`, `test/ui-copy.test.js`: integration and regression coverage.

---

### Task 1: Add reporting dependencies, schema, and bounded backfill

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/db.js`
- Create: `src/reporting-events.js`
- Create: `test/reporting-events.test.js`

**Interfaces:**
- Produces: `normalizeTimezone(value: unknown): string`
- Produces: `backfillReportingEvents(db, now: Date): void`
- Produces tables: `tenant_lifecycle_events`, `user_lifecycle_events`, `task_events`, `rule_assignment_events`, `graph_sync_runs`, `graph_sync_department_runs`, `metrics_completeness`
- Later tasks consume the record functions declared in Task 2 and Task 3 from the same module.

- [ ] **Step 1: Add the two pinned dependencies**

Run:

```bash
npm install chart.js@4.5.1 luxon@3.7.2
```

Expected: `package.json` contains exact compatible ranges and `package-lock.json` resolves Chart.js 4.5.1 and Luxon 3.7.2.

- [ ] **Step 2: Write failing schema and backfill tests**

Create tests that assert:

```js
const db = createDatabase(':memory:');
for (const table of [
  'tenant_lifecycle_events', 'user_lifecycle_events', 'task_events',
  'rule_assignment_events', 'graph_sync_runs',
  'graph_sync_department_runs', 'metrics_completeness',
]) {
  assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
}
assert.equal(
  db.prepare('SELECT timezone FROM organizations WHERE id = 1').get().timezone,
  'UTC',
);
```

Also create a legacy in-memory database with assigned/completed emails, run `migrate(db)` twice, and assert one partial assignment/completion event per evidence row, no fabricated user lifecycle history, and stable completeness rows.

- [ ] **Step 3: Run the focused tests and verify failure**

Run: `node --test test/reporting-events.test.js`

Expected: FAIL because the reporting schema and module do not exist.

- [ ] **Step 4: Add the reporting schema and indexes**

Extend `schema` in `src/db.js` with explicit checks, snapshot columns, `source IN ('application','backfill')`, and dedupe keys. Use nullable foreign keys with `ON DELETE SET NULL` for entities whose history must survive deletion. Add these indexes:

```sql
CREATE TABLE IF NOT EXISTS tenant_lifecycle_events (
  id INTEGER PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('created','archived','restored')),
  organization_name_snapshot TEXT NOT NULL,
  domain_snapshot TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('application','backfill')),
  dedupe_key TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS user_lifecycle_events (
  id INTEGER PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('added','disabled','reactivated','department_moved','role_changed')),
  department_id_before INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  department_id_after INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  department_name_before TEXT,
  department_name_after TEXT,
  role_before TEXT,
  role_after TEXT,
  user_name_snapshot TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('application','backfill')),
  dedupe_key TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS task_events (
  id INTEGER PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  email_id INTEGER REFERENCES emails(id) ON DELETE SET NULL,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  previous_assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('assigned','reassigned','completed')),
  assignment_source TEXT CHECK (assignment_source IS NULL OR assignment_source IN ('manual','rule')),
  department_name_snapshot TEXT,
  assignee_name_snapshot TEXT,
  previous_assignee_name_snapshot TEXT,
  received_at TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('application','backfill')),
  dedupe_key TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS rule_assignment_events (
  id INTEGER PRIMARY KEY,
  task_event_id INTEGER NOT NULL UNIQUE REFERENCES task_events(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  rule_id INTEGER REFERENCES rules(id) ON DELETE SET NULL,
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  rule_name_snapshot TEXT NOT NULL,
  department_name_snapshot TEXT,
  assignee_name_snapshot TEXT,
  priority_snapshot INTEGER NOT NULL,
  occurred_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('application','backfill')),
  dedupe_key TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS graph_sync_runs (
  run_id TEXT PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,
  outcome TEXT CHECK (outcome IS NULL OR outcome IN ('success','failed','skipped_connection_changed')),
  failure_category TEXT
);
CREATE TABLE IF NOT EXISTS graph_sync_department_runs (
  id INTEGER PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES graph_sync_runs(run_id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  department_name_snapshot TEXT,
  mailbox_snapshot TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,
  outcome TEXT CHECK (outcome IS NULL OR outcome IN ('success','failed','skipped_connection_changed')),
  failure_category TEXT,
  UNIQUE (run_id, mailbox_snapshot)
);
CREATE TABLE IF NOT EXISTS metrics_completeness (
  scope_key TEXT PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  family TEXT NOT NULL CHECK (family IN ('tenantLifecycle','userLifecycle','tasks','rules','graph')),
  exact_from TEXT NOT NULL,
  backfilled_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS tenant_events_time
  ON tenant_lifecycle_events (occurred_at, event_type);
CREATE INDEX IF NOT EXISTS user_events_scope_time
  ON user_lifecycle_events (organization_id, department_id, occurred_at, event_type);
CREATE INDEX IF NOT EXISTS task_events_scope_time
  ON task_events (organization_id, department_id, occurred_at, event_type);
CREATE INDEX IF NOT EXISTS task_events_user_time
  ON task_events (organization_id, assignee_id, occurred_at, event_type);
CREATE INDEX IF NOT EXISTS rule_events_scope_time
  ON rule_assignment_events (organization_id, department_id, occurred_at);
CREATE INDEX IF NOT EXISTS graph_runs_scope_time
  ON graph_sync_runs (organization_id, started_at, outcome);
```

Add `organizations.timezone TEXT NOT NULL DEFAULT 'UTC'` through `addColumn` for old databases.

- [ ] **Step 5: Implement timezone validation and idempotent backfill**

In `src/reporting-events.js`:

```js
import { IANAZone } from 'luxon';

export function normalizeTimezone(value) {
  const zone = typeof value === 'string' ? value.trim() : '';
  if (!zone || !IANAZone.isValidZone(zone)) {
    const error = new Error('Choose a valid organization timezone.');
    error.status = 400;
    error.code = 'INVALID_TIMEZONE';
    error.expose = true;
    error.field = 'timezone';
    throw error;
  }
  return zone;
}
```

Implement `backfillReportingEvents` using deterministic `dedupe_key` values such as `backfill:organization:<id>:created`, `backfill:email:<id>:assigned`, and `backfill:email:<id>:completed`. Insert one `metrics_completeness` row per organization/family plus a platform tenant-lifecycle row. Seed the existing Graph aggregate success as freshness metadata only, not a completed run.

- [ ] **Step 6: Run focused and migration tests**

Run:

```bash
node --test test/reporting-events.test.js test/workspace.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit the isolated task if safe**

```bash
git add package.json package-lock.json src/db.js src/reporting-events.js test/reporting-events.test.js
git commit -m "feat: add metrics reporting schema"
```

Skip this commit when the listed existing files contain inseparable pre-task changes.

---

### Task 2: Capture tenant and workforce lifecycle events transactionally

**Files:**
- Modify: `src/reporting-events.js`
- Modify: `src/tenants.js`
- Modify: `src/workspace.js`
- Modify: `src/app.js`
- Modify: `test/reporting-events.test.js`
- Modify: `test/tenants.test.js`
- Modify: `test/workspace.test.js`

**Interfaces:**
- Produces: `recordTenantLifecycle(db, event): number`
- Produces: `recordUserLifecycle(db, event): number`
- Consumes: `normalizeTimezone`
- Route/domain calls gain optional `{ actorId, now }` values while retaining defaults for existing tests.

- [ ] **Step 1: Write failing lifecycle tests**

Cover this sequence:

```js
const organization = createOrganization({ db, input, actorId: platform.id, now });
const member = createMember({ db, organizationId: organization.id, input: { email }, actorId: admin.id, now });
updateMember({ db, organizationId: organization.id, memberId: member.id,
  input: { status: 'disabled' }, actorId: admin.id, now: later });
updateMember({ db, organizationId: organization.id, memberId: member.id,
  input: { status: 'active' }, actorId: admin.id, now: latest });
```

Assert `created`, `added`, `disabled`, and `reactivated` events, actor IDs, snapshots, and exact timestamps. Add department movement, department deletion/unassignment, head replacement, archive, and restore cases. Assert failed last-admin/head-replacement operations write no event.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node --test test/reporting-events.test.js test/tenants.test.js test/workspace.test.js`

Expected: FAIL because domain mutations do not write lifecycle events.

- [ ] **Step 3: Implement the two record functions**

Use explicit parameters and no hidden request globals:

```js
recordTenantLifecycle(db, {
  organizationId, actorId, eventType, organizationName,
  domainSnapshot, occurredAt, source = 'application', dedupeKey = null,
});

recordUserLifecycle(db, {
  organizationId, userId, actorId, eventType,
  departmentIdBefore, departmentIdAfter,
  departmentNameBefore, departmentNameAfter,
  roleBefore, roleAfter, userNameSnapshot,
  occurredAt, source = 'application', dedupeKey = null,
});
```

Validate event types before insertion and return the inserted event ID.

- [ ] **Step 4: Instrument tenant and member mutations inside existing transactions**

- `createOrganization`: default timezone to UTC and record `created`.
- `setOrganizationStatus`: record `archived` or `restored` only when status changes.
- `createMember`: record `added` when pending membership is provisioned.
- `updateMember`: record `disabled`, `reactivated`, and/or `role_changed` only after validation succeeds.
- `moveMemberToDepartment`: record `department_moved`; do not count it as added/removed.
- `deleteDepartment`: snapshot affected members and record movement to Unassigned before deletion.
- `setDepartmentHead`: record effective `member`/`dep_admin` role changes for old and new heads.

Pass `request.user.id` and `clock()` from the corresponding routes. Do not record first-login pending-to-active activation as a second addition.

- [ ] **Step 5: Add timezone to organization payload and profile update**

Validate a supplied timezone with `normalizeTimezone`, preserve the current value when omitted, and expose it in `organizationPayload`. `PATCH /api/organization` accepts timezone; PlatformAdmin organization creation keeps the UTC default unless supplied.

- [ ] **Step 6: Run focused and application tests**

Run:

```bash
node --test test/reporting-events.test.js test/tenants.test.js test/workspace.test.js test/app.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit the isolated task if safe**

```bash
git add src/reporting-events.js src/tenants.js src/workspace.js src/app.js test/reporting-events.test.js test/tenants.test.js test/workspace.test.js
git commit -m "feat: capture tenant and user lifecycle metrics"
```

---

### Task 3: Capture task, rule-attribution, and Graph sync events

**Files:**
- Modify: `src/reporting-events.js`
- Modify: `src/workflows.js`
- Modify: `test/reporting-events.test.js`
- Modify: `test/app.test.js`
- Modify: `test/outlook.test.js`

**Interfaces:**
- Produces: `recordTaskEvent(db, event): number`
- Produces: `recordRuleAssignment(db, event): number`
- Produces: `startGraphRun(db, run): void`
- Produces: `finishGraphRun(db, result): void`
- Produces: `interruptOpenGraphRuns(db, completedAt): number`

- [ ] **Step 1: Write failing task/rule event tests**

Assert that automatic assignment creates one `assigned` task event and one linked rule event; manual first assignment creates one `assigned` event with source `manual`; reassignment creates `reassigned` with previous assignee; completion creates `completed`. Re-running an idempotent sync must not duplicate events.

- [ ] **Step 2: Write failing Graph run tests**

Use two Outlook department sources and one Gmail source. Assert one organization Graph run, one child row per Outlook source, no Gmail child row, duration/outcome values, safe `skipped_connection_changed`, failure categories without raw error text, and idempotent finish behavior.

- [ ] **Step 3: Run tests and verify failure**

Run: `node --test test/reporting-events.test.js test/outlook.test.js test/app.test.js`

Expected: FAIL because workflow history is not recorded.

- [ ] **Step 4: Instrument assignment and completion transactions**

Extend `recordAssignment` with `{ assignmentSource, rule }`. After the email update succeeds, insert a task event. For `assignmentSource === 'rule'`, insert the one-to-one rule event using the returned task-event ID. Insert completion events in `completeAssignedEmail` before committing. Snapshot received time, department name, assignee name, rule name, and priority; do not snapshot message content.

- [ ] **Step 5: Instrument the sync runner**

At runner construction, mark unfinished historical Graph runs `failed/interrupted`. For each run:

```js
const graphRunId = randomUUID();
startGraphRun(db, { runId: graphRunId, organizationId, startedAt });
// wrap each Outlook source to retain its own started/completed timestamps
finishGraphRun(db, { runId: graphRunId, completedAt, outcome, departmentOutcomes });
```

Exclude Gmail sources. Define organization success only when every current Outlook source succeeds or safely skips because its connection changed. Exclude safe skips from success-rate denominators later.

- [ ] **Step 6: Run focused regression tests**

Run:

```bash
node --test test/reporting-events.test.js test/outlook.test.js test/app.test.js test/alerts.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit the isolated task if safe**

```bash
git add src/reporting-events.js src/workflows.js test/reporting-events.test.js test/app.test.js test/outlook.test.js
git commit -m "feat: capture workflow and graph metrics events"
```

---

### Task 4: Implement timezone-aware metrics aggregation

**Files:**
- Create: `src/metrics.js`
- Create: `test/metrics.test.js`

**Interfaces:**
- Produces: `normalizeMetricsQuery({ query, timezone, now }): MetricPeriod`
- Produces: `getPlatformMetrics({ db, period }): MetricsPayload`
- Produces: `getOrganizationMetrics({ db, organizationId, departmentId, period, now }): MetricsPayload`
- Produces: `getDepartmentMetrics({ db, organizationId, departmentId, employeeId, period, now }): MetricsPayload`
- Produces: `getMemberMetrics({ db, organizationId, userId, period, now }): MetricsPayload`

`MetricPeriod` is:

```js
{
  from: '2026-08-01T00:00:00.000Z',
  to: '2026-09-01T00:00:00.000Z',
  timezone: 'Asia/Kolkata',
  bucket: 'day' | 'week' | 'month',
  preset: 'this-week' | '30-days' | '6-months' | 'custom',
}
```

`MetricsPayload` is:

```js
{
  scope: 'platform' | 'organization' | 'department' | 'member',
  period,
  completeness: { [family]: { status, exactFrom } },
  cards: [{ id, label, value, format, secondary?, comparison? }],
  plots: [{ id, kind, title, summary, labels, series, table }],
  filters: { departments?: [], employees?: [] },
  details: { tenants?: [], lifecycle?: [], graphMailboxes?: [] },
}
```

- [ ] **Step 1: Write failing range and bucket tests**

Cover UTC and DST zones, Monday week starts, the 31/32 and 180/181-day boundaries, invalid zones/ranges, custom inclusive dates, empty buckets, and prior equivalent periods.

- [ ] **Step 2: Write failing metric-definition tests**

Seed deterministic event rows covering first assignment, reassignment, late completion, current open work, overdue work, manual/rule assignment, deleted rule snapshots, lifecycle events, successful/failed/skipped Graph runs, and partial history. Assert every definition from the design specification.

- [ ] **Step 3: Run and verify failure**

Run: `node --test test/metrics.test.js`

Expected: FAIL because `src/metrics.js` does not exist.

- [ ] **Step 4: Implement range normalization with Luxon**

Use `DateTime.fromISO(..., { zone })`, `startOf('week')`, UTC storage, and explicit safe errors. Accept `preset` for standard controls and local `YYYY-MM-DD` `from`/`to` values for custom ranges. Always return the normalized UTC endpoints.

- [ ] **Step 5: Implement shared event grouping and completeness helpers**

Create small private helpers for bucket boundaries, zero-filled labels, duration averages, percent values, safe comparisons, and per-family completeness. Do not perform SQL string interpolation with request values; all values use bound parameters.

- [ ] **Step 6: Implement the four role aggregators**

- Platform: current active/archived/total cards, status doughnut, filtered tenant details, selected-period lifecycle events.
- Organization: active/added/disabled/reactivated cards, grouped lifecycle bars, Graph freshness/success cards, duration line, mailbox detail rows; no task queries.
- Department: five compact card groups, stacked cohort outcomes, employee and rule horizontal-bar payloads; constrain every query by organization and department.
- Member: personal cards, workload bars, handling-time line; constrain every event by organization and assignee/completer ID.

- [ ] **Step 7: Run metric tests and performance smoke**

Run: `node --test test/metrics.test.js`

Expected: PASS, including a non-flaky smoke assertion that a 100,000-event seeded query completes and returns bounded plot series without asserting machine-specific milliseconds.

- [ ] **Step 8: Commit**

```bash
git add src/metrics.js test/metrics.test.js
git commit -m "feat: aggregate role-scoped metrics"
```

---

### Task 5: Expose resource-hiding Metrics APIs

**Files:**
- Modify: `src/app.js`
- Modify: `test/app.test.js`

**Interfaces:**
- Consumes all four aggregation functions from `src/metrics.js`.
- Produces GET routes `/api/metrics/platform`, `/api/metrics/organization`, `/api/metrics/department`, and `/api/metrics/me`.

- [ ] **Step 1: Write failing role and privacy API tests**

Create sessions for all four roles. Assert correct route success, wrong-role 403/404 behavior, cross-tenant department/employee rejection, former DepAdmin loss of access, and no forbidden payload keys or seeded confidential strings.

- [ ] **Step 2: Run and verify failure**

Run: `node --test --test-name-pattern="metrics" test/app.test.js`

Expected: FAIL with route not found.

- [ ] **Step 3: Add route handlers with explicit middleware**

Use `requirePlatformAdmin`, `requireOrgAdmin`, `requireDepAdmin`, and the authenticated Member check. Derive organization, department, and Member IDs from `request.user`; validate the optional OrgAdmin department and DepAdmin employee within that scope before calling the metrics service.

Normalize exposed errors through the existing safe error middleware. Do not add metrics to `/api/bootstrap`; fetch the module only when opened.

- [ ] **Step 4: Run API and authorization tests**

Run:

```bash
node --test test/app.test.js test/metrics.test.js test/tenants.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit the isolated task if safe**

```bash
git add src/app.js test/app.test.js
git commit -m "feat: expose role-scoped metrics APIs"
```

---

### Task 6: Build pure client Metrics state and chart adapters

**Files:**
- Create: `public/metrics-model.js`
- Create: `public/metrics-charts.js`
- Create: `test/metrics-model.test.js`
- Modify: `src/app.js`

**Interfaces:**
- Produces: `metricsEndpoint(role): string`
- Produces: `readMetricsUrl(url): MetricsViewState`
- Produces: `writeMetricsUrl(url, state): string`
- Produces: `formatMetricValue(value, format): string`
- Produces: `plotTableRows(plot): Array<Record<string,string|number>>`
- Produces: `createChartManager({ Chart, onSelect }): ChartManager`
- Adds public `GET /vendor/chart.js` serving Chart.js's local UMD build with immutable cache headers.

- [ ] **Step 1: Write failing pure client tests**

Assert role endpoint selection, URL round trips, invalid parameter normalization, duration/percent/integer formatting, null handling, table rows matching every chart point, and chart configuration kinds for doughnut, grouped bar, stacked bar, horizontal bar, and line.

- [ ] **Step 2: Run and verify failure**

Run: `node --test test/metrics-model.test.js`

Expected: FAIL because the client modules do not exist.

- [ ] **Step 3: Implement `metrics-model.js`**

Keep the module DOM-free. Preserve only approved URL values: preset, custom dates, department, employee, performance tab, and selected plot item. Formatting must return `—` for null/unavailable values rather than zero.

- [ ] **Step 4: Implement `metrics-charts.js`**

The manager owns a `Map<canvas, Chart>` and destroys prior instances before replacement. Disable parsing for pre-normalized values, use `normalized: true`, respect `prefers-reduced-motion`, and set an accessible canvas label. Render a DOM legend and table independently of Chart.js so keyboard users can filter/select exact values.

- [ ] **Step 5: Serve Chart.js locally**

Resolve `chart.js/dist/chart.umd.js` from the installed package and expose it as `/vendor/chart.js` before `/api` authentication middleware. Add `Cache-Control: public, max-age=31536000, immutable` and `X-Content-Type-Options: nosniff`.

- [ ] **Step 6: Run client/source tests**

Run:

```bash
node --test test/metrics-model.test.js test/ui-copy.test.js
node --check public/metrics-model.js
node --check public/metrics-charts.js
```

Expected: PASS.

- [ ] **Step 7: Commit the isolated task if safe**

```bash
git add public/metrics-model.js public/metrics-charts.js test/metrics-model.test.js src/app.js
git commit -m "feat: add accessible metrics chart adapters"
```

---

### Task 7: Build the Metrics page and role dashboards

**Files:**
- Create: `public/metrics-view.js`
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Modify: `test/metrics-model.test.js`
- Modify: `test/ui-copy.test.js`

**Interfaces:**
- Produces: `createMetricsView({ root, api, reportError, selectView, chartManager }): MetricsView`
- `MetricsView` methods: `open(session)`, `refresh({ quiet })`, `close()`, and `destroy()`.
- Consumes the generic `MetricsPayload` from Task 4 and the chart/model helpers from Task 6.

- [ ] **Step 1: Write failing UI source-contract tests**

Assert all four role nav sections include a Metrics button, the Metrics shell contains date presets/custom inputs/timezone/completeness/status regions, there are exactly two reusable primary chart containers, the local Chart.js script precedes the app module, and no forbidden OrgAdmin workflow labels occur inside the organization metrics template.

- [ ] **Step 2: Run and verify failure**

Run: `node --test test/ui-copy.test.js test/metrics-model.test.js`

Expected: FAIL because the Metrics page does not exist.

- [ ] **Step 3: Add the shared HTML shell**

Add `data-view="metrics"` navigation to PlatformAdmin, OrgAdmin, DepAdmin, and Member sections. Create one hidden Metrics panel containing filters, KPI region, two plot cards, a details region, loading/error/partial notices, and dialog-free data-table disclosures. Load `/vendor/chart.js` locally before `app.js`.

- [ ] **Step 4: Implement `metrics-view.js` request and render lifecycle**

Use `AbortController` plus a monotonically increasing request ID. `open` reads URL state and loads the correct role endpoint. `refresh` retains the previous successful payload on failure and marks it stale. `close` aborts work and destroys charts. Render cards and plot payloads generically, then add role-specific detail renderers for tenants, lifecycle events, Graph mailboxes, employee/rule tabs, and authorized task navigation.

- [ ] **Step 5: Integrate navigation and refresh in `public/app.js`**

Add Metrics to each role's allowed views. Hide the current mailbox hero/queue panels while Metrics is active. Open the Metrics controller when selected, refresh only current ranges during the existing poll, and close/destroy it on sign-out or role loss. Drill-down actions call the existing `selectView` with authorized status/date filters.

- [ ] **Step 6: Add compact responsive styling**

Implement a five-column-or-wrapped KPI strip, two-column chart grid, one-column narrow layout, fixed minimum chart height without large surrounding whitespace, compact legends, details tables, selection chips, and visible focus states. Add non-color series markers/patterns and reduced-motion rules.

- [ ] **Step 7: Add organization timezone control**

Add a timezone input/select to the existing OrgAdmin organization profile. Populate it from `Intl.supportedValuesOf('timeZone')` with a safe fallback and submit through the existing organization PATCH flow.

- [ ] **Step 8: Run UI and full automated tests**

Run:

```bash
node --check public/metrics-view.js
node --check public/app.js
node --test test/metrics-model.test.js test/ui-copy.test.js test/app.test.js
npm test
```

Expected: all tests pass.

- [ ] **Step 9: Commit the isolated task if safe**

```bash
git add public/metrics-view.js public/index.html public/app.js public/styles.css test/metrics-model.test.js test/ui-copy.test.js
git commit -m "feat: add role-aware metrics dashboards"
```

---

### Task 8: Documentation, full regression, and browser verification

**Files:**
- Modify: `README.md`
- Modify: `test/ui-copy.test.js`
- Verify: all source, public, and test files touched above

**Interfaces:**
- No new runtime interfaces; this task validates and documents the completed module.

- [ ] **Step 1: Update product/setup documentation**

Document the organization timezone, reporting definitions, role privacy matrix, partial-history notice, local Chart.js bundling, and the fact that Metrics starts exact event history from the migration boundary.

- [ ] **Step 2: Run static checks**

Run:

```bash
node --check src/reporting-events.js
node --check src/metrics.js
node --check src/app.js
node --check src/workflows.js
node --check public/metrics-model.js
node --check public/metrics-charts.js
node --check public/metrics-view.js
node --check public/app.js
git diff --check
```

Expected: no output except successful command completion.

- [ ] **Step 3: Run the complete suite**

Run: `npm test`

Expected: all existing and new tests pass with zero skipped failures.

- [ ] **Step 4: Run a fresh-database and migrated-database smoke test**

Start once against a new temporary database and once against a copied legacy fixture. Confirm startup succeeds, backfill is idempotent, no local/demo identity data is silently removed, and the second migrated start adds no duplicate reporting rows.

- [ ] **Step 5: Browser-smoke all roles**

Using injected test sessions in the test harness or already authenticated local sessions, verify:

- PlatformAdmin: three tenant cards, doughnut interaction, tenant details.
- OrgAdmin: no workflow metrics, lifecycle filter, Graph duration/freshness, timezone update.
- DepAdmin: cohort outcome stack, employee/rule switch, authorized overdue drill-down.
- Member: personal-only cards, workload and handling-time plots.
- Desktop and narrow layouts, table alternatives, keyboard controls, partial/error states, and no browser console errors.

- [ ] **Step 6: Final safety scan**

Search metrics JSON/client source for forbidden keys and values:

```bash
rg -n "subject|sender|preview|outlookUrl|providerId|entraObjectId|access_token|refresh_token" src/metrics.js public/metrics-*.js test/metrics*.test.js
```

Expected: only negative tests or explicit forbidden-key assertions, never payload construction.

- [ ] **Step 7: Commit documentation if safe**

```bash
git add README.md test/ui-copy.test.js
git commit -m "docs: document role-aware metrics"
```

---

## Completion criteria

- All four roles can open Metrics and receive only their authorized scope.
- Exact post-migration events support tenant/user lifecycle, task cohorts, employee workload, rule attribution, and Graph health.
- Existing data is backfilled only where evidence exists and is labeled partial.
- Every role sees at most two primary plot cards with accessible exact-value tables.
- OrgAdmin metrics contain no task/email-derived values; Member metrics contain no colleague values.
- Time ranges, SLA boundaries, and buckets are correct in IANA zones and DST transitions.
- Chart.js is served locally; there are no CDN dependencies.
- Full regression, migration, performance, and local browser checks pass.
