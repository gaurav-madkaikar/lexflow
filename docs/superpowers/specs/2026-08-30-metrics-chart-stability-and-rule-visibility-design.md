# Metrics Chart Stability and Rule Visibility Design

## Goal

Keep Metrics chart dimensions stable when **View data** is expanded, show a clear empty state when a plot has no meaningful observations, and include every active department automation rule in per-rule metrics even when its recorded assignment count is zero.

## Confirmed behavior

- Expanding or collapsing **View data** must never change the plot area's height.
- A chart card remains in the grid when its selected period has no meaningful observations, preserving alignment with the neighboring card.
- The empty card keeps its title and summary, replaces its canvas and legend with **No data available for this period**, and retains **View data** when table rows provide useful exact values.
- Every currently active rule in the DepAdmin's department appears in rule metrics with its recorded assignment count, including zero.
- **Manual assignment** remains a separate row when manual assignments occurred in the selected period.
- Disabled or deleted rules appear only when immutable attribution events prove that they had assignments in the selected period.
- Existing partial-history messaging remains authoritative. LexFlow does not infer historical rule matches from current rule definitions.

## Data contract

Each plot payload exposes a boolean `hasData` determined by the server from the underlying records rather than inferred from rendered numeric values:

- Tenant status: at least one configured tenant.
- People lifecycle: at least one lifecycle event in the selected scope and period.
- Graph health: at least one recorded Graph run with a duration.
- Assignment outcomes: at least one assignment in the selected cohort.
- Employee performance: at least one assignment or completion.
- Rule performance: at least one rule-attributed or manual assignment.
- Member workload: at least one assignment or completion.
- Member handling time: at least one completed task with a handling duration.

This avoids treating valid zero-duration observations as missing and prevents reference-only data, such as an SLA line, from making an otherwise empty chart appear populated.

## Server aggregation

Rule performance starts with all enabled rules belonging to the authorized department, initialized to zero assignments and completions. Recorded `rule_assignment_events` are then merged by rule ID and immutable name snapshot. Historical attributions whose rule is now disabled or deleted remain visible because their event snapshots are the source of truth. Manual assignment events are aggregated separately and appended only when their selected-period count is greater than zero.

No existing assignments are retroactively attributed to a rule. Legacy or backfilled assignments without a recorded rule event remain unattributed and are covered by the existing partial-history notice.

## Client rendering and layout

The canvas wrapper uses a fixed responsive block height and no longer grows as a flex child. The table disclosure is outside that fixed plot area and keeps its existing bounded vertical scroll.

When `hasData` is false, the chart manager destroys any previous Chart.js instance for that slot, hides the canvas and legend, and displays a centered accessible empty-state message. If the plot has table rows, **View data** remains available; otherwise the disclosure is hidden. Switching filters or date ranges reverses the empty state without requiring a page reload.

## Error handling and accessibility

- Empty data is a normal state, not an error notification.
- The empty-state message is exposed as status text within the chart card.
- Exact-value tables remain keyboard accessible.
- Chart instances are destroyed before changing between populated and empty states, preventing stale canvases and resize loops.

## Verification

- Unit-test `hasData` semantics, including zero-duration Graph observations and SLA-only member data.
- Verify active rules with zero assignments appear alongside attributed rules and manual assignments.
- Verify disabled/deleted rules appear only when an attribution event exists.
- Add UI contract coverage for the fixed canvas wrapper and empty-state region.
- In the local browser, repeatedly expand and collapse both **View data** disclosures and assert unchanged canvas dimensions.
- Browser-test a populated plot, an empty plot with useful table rows, and a fully empty plot at desktop and narrow widths.
- Run the complete regression suite and check for browser console errors.
