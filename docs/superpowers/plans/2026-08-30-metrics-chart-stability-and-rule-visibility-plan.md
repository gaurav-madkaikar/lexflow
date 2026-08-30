# Metrics Chart Stability and Rule Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize Metrics chart dimensions, render an accessible empty state for plots without observations, and list every active department rule in per-rule metrics even when its assignment count is zero.

**Architecture:** The server remains the authority for whether each plot has meaningful observations through an explicit `hasData` payload field. Rule aggregation seeds enabled department rules before merging immutable assignment attributions and manual assignments. The client chart manager uses `hasData` to choose between Chart.js and a card-level empty state, while CSS isolates the fixed canvas height from the independently scrolling exact-value table.

**Tech Stack:** Node.js 22.13+, Express 5, `node:sqlite`, vanilla ES modules, Chart.js 4.5.1, Node's built-in test runner.

## Global Constraints

- Preserve role and tenant scoping; only the current DepAdmin department can contribute rule metrics.
- Never infer historical rule matches from current rule definitions.
- Keep **Manual assignment** separate from automation-rule rows.
- Keep chart cards visible and aligned when data is empty.
- Display **No data available for this period** instead of rendering an empty chart.
- Expanding **View data** must not change the plot area's height.
- Preserve accessible exact-value tables and keyboard behavior.
- Preserve unrelated dirty-worktree changes; commit implementation files only if they can be isolated safely.

---

### Task 1: Add explicit plot availability and zero-assignment rule rows

**Files:**
- Modify: `src/metrics.js`
- Test: `test/metrics.test.js`

**Interfaces:**
- Produces: every plot payload includes `hasData: boolean`.
- Produces: `rulePerformance(...)` returns enabled current rules with zero counts, event-backed historical rules with activity, and a manual row only when manual assignments occurred.
- Consumed by Task 2: `plot.hasData` and the existing `plot.table` rows.

- [ ] **Step 1: Write failing rule-visibility and availability tests**

Extend the department metrics fixture with a second enabled Legal rule that has no attribution event:

```js
db.prepare(`
  INSERT INTO rules
    (name, keywords, sender_filter, assignee_id, priority, enabled, created_at,
     organization_id, department_id)
  VALUES ('Zero assignment route', 'never-matched', '', ?, 3, 1,
    '2026-08-01T00:00:00.000Z', 1, ?)
`).run(maya.id, legal.id);
```

Assert that the rule table contains both the attributed rule and the zero-assignment rule:

```js
const rulePlot = department.plots.find(plot => plot.id === 'rules');
assert.equal(rulePlot.hasData, true);
assert.deepEqual(
  rulePlot.table.map(row => [row.label, row.assignments]),
  [['NDA route', 1], ['Zero assignment route', 0]],
);
```

Create a period with no department task events and assert:

```js
const empty = getDepartmentMetrics({ db, organizationId: 1, departmentId: legal.id, period: emptyPeriod, now });
assert.equal(empty.plots.find(plot => plot.id === 'outcomes').hasData, false);
assert.equal(empty.plots.find(plot => plot.id === 'employees').hasData, false);
assert.equal(empty.plots.find(plot => plot.id === 'rules').hasData, false);
assert.equal(empty.plots.find(plot => plot.id === 'rules').table.some(row => row.label === 'Zero assignment route'), true);
```

Also assert that tenant, organization, and member plots carry boolean `hasData` values and that an SLA reference line alone does not make the member handling plot populated.

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
node --test test/metrics.test.js
```

Expected: FAIL because plots do not expose `hasData` and zero-assignment rules are not seeded.

- [ ] **Step 3: Seed current enabled rules before merging attributions**

At the start of `rulePerformance`, query enabled rules in the authorized organization and department:

```js
const currentRules = db.prepare(`
  SELECT id, name
  FROM rules
  WHERE organization_id = ? AND department_id = ? AND enabled = 1
  ORDER BY priority DESC, id
`).all(organizationId, departmentId);

const rows = new Map(currentRules.map(rule => [`rule:${Number(rule.id)}`, {
  id: Number(rule.id),
  label: rule.name,
  assignments: 0,
  completed: 0,
  resolutionTimes: [],
  source: 'rule',
}]));
```

For each attribution, use `rule:${rule_id}` when the rule still exists in `rows`; otherwise use a snapshot key such as `snapshot:${rule_id ?? 'deleted'}:${rule_name_snapshot}`. Increment assignments and completion values exactly as before. Preserve the manual row only when `manual.assignments > 0`.

- [ ] **Step 4: Add server-owned `hasData` flags**

Set the flag from underlying records:

```js
tenantStatus.hasData = total > 0;
peopleLifecycle.hasData = lifecycle.length > 0;
graphHealth.hasData = graphRuns.some(run => run.duration_ms != null);
outcomes.hasData = cohort.length > 0;
employees.hasData = employeeRows.some(row => row.assignments > 0 || row.completed > 0);
rules.hasData = ruleRows.some(row => row.assignments > 0);
workload.hasData = received.length > 0 || completedEvents.length > 0;
handlingTrend.hasData = handling.length > 0;
```

Do not infer `hasData` from a numeric sum on the client; a recorded zero-duration Graph run is meaningful, while an SLA-only reference line is not.

- [ ] **Step 5: Run focused tests**

Run:

```bash
node --test test/metrics.test.js test/app.test.js
```

Expected: PASS, including role-scope and privacy tests.

---

### Task 2: Stabilize chart dimensions and render empty states

**Files:**
- Modify: `public/index.html`
- Modify: `public/metrics-charts.js`
- Modify: `public/styles.css`
- Test: `test/ui-copy.test.js`

**Interfaces:**
- Consumes: `plot.hasData: boolean`, `plot.table: object[]` from Task 1.
- Produces: each chart slot has a fixed-height canvas region and an accessible empty-state region.

- [ ] **Step 1: Write failing UI contract tests**

Extend `test/ui-copy.test.js` to require two empty-state elements and fixed canvas sizing:

```js
assert.equal((html.match(/class="metrics-chart-empty"/g) ?? []).length, 2);
assert.match(html, /No data available for this period/);
assert.match(styles, /\.metrics-canvas-wrap\s*\{[^}]*height:\s*280px/s);
assert.match(styles, /\.metrics-canvas-wrap\s*\{[^}]*flex:\s*0 0 280px/s);
assert.match(charts, /plot\.hasData/);
```

Load `public/metrics-charts.js` as `charts` in the test fixture if it is not already read.

- [ ] **Step 2: Run the UI contract test and verify failure**

Run:

```bash
node --test test/ui-copy.test.js
```

Expected: FAIL because the empty-state regions and fixed canvas rules are absent.

- [ ] **Step 3: Add empty-state regions to both reusable chart cards**

Place this immediately after each `.metrics-chart-legend` and before `.metrics-canvas-wrap`:

```html
<div class="metrics-chart-empty" role="status" hidden>
  No data available for this period
</div>
```

- [ ] **Step 4: Make the chart manager switch populated and empty states safely**

In `renderSlot(plot, index)`:

```js
const legend = root.querySelector(`#metrics-chart-legend-${suffix}`);
const canvasWrap = card.querySelector('.metrics-canvas-wrap');
const empty = card.querySelector('.metrics-chart-empty');
const disclosure = card.querySelector('.metrics-data-disclosure');
const hasData = plot.hasData !== false;

empty.hidden = hasData;
canvasWrap.hidden = !hasData;
legend.hidden = !hasData;
disclosure.hidden = !(plot.table?.length);
```

Always destroy the previous chart before toggling. Instantiate Chart.js and render the legend only when `hasData` is true. When `hasData` is false, clear the legend and keep the exact-value table available if it has rows. Restore all regions when a later filter produces data.

- [ ] **Step 5: Isolate canvas height from the disclosure table**

Replace the growing flex behavior with:

```css
.metrics-canvas-wrap {
  position: relative;
  height: 280px;
  min-height: 0;
  flex: 0 0 280px;
  overflow: hidden;
  padding: 12px 18px 18px;
}

.metrics-canvas-wrap canvas {
  width: 100% !important;
  height: 100% !important;
  cursor: pointer;
}

.metrics-chart-empty {
  height: 280px;
  display: grid;
  place-items: center;
  padding: 24px;
  color: var(--color-muted);
  text-align: center;
}

.metrics-chart-empty[hidden] { display: none; }
```

At the existing mobile breakpoint, set both `.metrics-canvas-wrap` and `.metrics-chart-empty` to `height: 250px` and the wrapper to `flex-basis: 250px`. Keep `.metrics-data-table` capped at its existing `max-height: 360px; overflow-y: auto`.

- [ ] **Step 6: Run UI and syntax tests**

Run:

```bash
node --check public/metrics-charts.js
node --test test/ui-copy.test.js test/metrics-model.test.js
```

Expected: PASS.

---

### Task 3: Regression and browser verification

**Files:**
- Verify: `src/metrics.js`
- Verify: `public/metrics-charts.js`
- Verify: `public/styles.css`
- Verify: `test/metrics.test.js`
- Verify: `test/ui-copy.test.js`

**Interfaces:**
- Consumes the completed server payload and client rendering behavior.
- Produces no new runtime interface.

- [ ] **Step 1: Run static and full regression checks**

Run:

```bash
node --check src/metrics.js
node --check public/metrics-charts.js
git diff --check
npm test
```

Expected: all checks pass with zero failing or skipped tests.

- [ ] **Step 2: Verify populated and empty states in the local browser**

Use an authenticated DepAdmin test session. Confirm:

- **Rules** lists each enabled Legal rule, including zero-assignment rules.
- **Manual assignment** remains separate when its count is nonzero.
- A period without assignments keeps the card visible and displays **No data available for this period**.
- **View data** remains available for zero-valued rule rows.

- [ ] **Step 3: Verify repeated disclosure expansion does not resize charts**

Measure both canvas bounding boxes, expand and collapse each **View data** disclosure at least three times, then measure again. Width and height must remain unchanged at desktop width. Repeat at a narrow viewport and reset the viewport override afterward.

- [ ] **Step 4: Check browser health and leave the app ready**

Confirm no browser console errors or warnings, return the browser to `http://localhost:3000/`, and verify the page returns HTTP 200. Leave the existing local app process running.

---

## Completion criteria

- Opening **View data** never changes plot dimensions.
- Empty plots show a stable, accessible no-data state instead of an empty Chart.js canvas.
- Every active department rule appears in per-rule data, including zero-assignment rules.
- Manual and event-attributed rule assignments remain distinct and historically honest.
- All automated and browser checks pass.
