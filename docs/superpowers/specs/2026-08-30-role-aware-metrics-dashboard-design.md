# Role-Aware Metrics Dashboards

## Summary

Add a new **Metrics** module that gives each LexFlow role a compact, interactive reporting experience aligned with its responsibilities and data-access boundary. PlatformAdmins see tenant lifecycle information, OrgAdmins see workforce lifecycle and Microsoft Graph health, DepAdmins see their department's workflow performance, and Members see only their own work.

The module uses append-only reporting events rather than reconstructing history from mutable current-state rows. Existing records are backfilled only where timestamps and attribution are reliable, and the UI clearly distinguishes partial history from exact post-release reporting.

The dashboards preserve LexFlow's current visual language. Each role receives a small KPI strip, no more than two primary plot cards, meaningful drill-downs, and a shared date-range control. The module does not expose confidential email content through reporting APIs.

## Goals

- Add a role-aware **Metrics** navigation module for PlatformAdmin, OrgAdmin, DepAdmin, and Member.
- Record durable tenant, user, task, rule-attribution, and Graph synchronization history.
- Provide exact reporting from release onward and honest, bounded backfill for existing data.
- Support This week, Last 30 days, Last 6 months, and custom date ranges.
- Group results automatically by day, week, or month in the organization's configured timezone.
- Keep the dashboards focused: concise KPIs, one or two useful plots, and contextual details instead of a wall of charts.
- Preserve current authorization and confidentiality boundaries.
- Make plot interactions keyboard-accessible and provide exact tabular alternatives.

## Non-goals

- No custom report builder.
- No cross-tenant customer comparison.
- No OrgAdmin access to email volume, task throughput, employee performance, automation-rule results, or email content.
- No peer ranking or department comparison for Members.
- No scheduled reports, CSV export, or PDF export in the first release.
- No external analytics warehouse or precomputed daily cube in the first release.
- No attempt to invent historical reassignments, rule attribution, or sync runs that LexFlow never recorded.

## Role and privacy boundaries

| Role | Metrics scope | Explicit exclusions |
| --- | --- | --- |
| PlatformAdmin | Tenant status and tenant lifecycle | Customer users, Graph details, departments, tasks, rules, and email data |
| OrgAdmin | Organization user lifecycle and Microsoft Graph operational health | Email counts/content, task performance, employee performance, and rule results |
| DepAdmin | Workflow, employees, and rules for the currently headed department | Other departments and organization-wide Graph configuration |
| Member | The signed-in Member's assignments and completions | Colleagues, department totals, rules, Graph, and tenant information |

The server derives scope from the authenticated session. Client-supplied organization, department, or employee identifiers never broaden access. A leadership change immediately grants the new DepAdmin access to that department's history and removes access from the former DepAdmin; historical event attribution is not rewritten.

Reporting endpoints return aggregate values and labels only. They do not return email subjects, senders, previews, immutable message IDs, Outlook URLs, or mailbox message identifiers. An authorized task drill-down navigates to the existing workflow views, which continue to enforce their established content-level permissions.

## Reporting data model

### Organization timezone

Add an IANA timezone to organization metadata, for example `Asia/Kolkata`, and expose it in the OrgAdmin organization profile. New organizations start with UTC until the OrgAdmin accepts the browser-timezone suggestion or selects another zone. Organization reporting ranges, week/month boundaries, SLA cutoffs, and Graph timelines use the stored timezone. Changing the timezone changes future query bucketing but not stored event instants. PlatformAdmin reporting uses the PlatformAdmin browser timezone because it spans organizations.

### Tenant lifecycle events

Add append-only tenant lifecycle events for:

- `created`
- `archived`
- `restored`

Each event stores the organization ID when available, organization name/domain snapshots, the actor, event time, and event source. Current status cards continue to read the authoritative `organizations.status`; lifecycle events provide selected-period trends and latest status-change details.

### User lifecycle events

Add append-only user lifecycle events for:

- `added`
- `disabled`
- `reactivated`
- `department_moved`
- `role_changed`

"Removed" in the Metrics UI means disabled during the selected period. Reactivation is reported separately. Events include the organization, affected user, actor, department and role before/after where applicable, display-name snapshots, event time, and event source.

Department filtering uses the event-time department. A user added while unassigned remains attributed to **Unassigned** for that addition event even if moved later. Department movement is retained for auditability but does not count as an added or removed user.

### Task events

Add append-only task events for:

- `assigned`
- `reassigned`
- `completed`

Events store the organization and department, email/task reference, actor, assignee, previous assignee when relevant, assignment source (`manual` or `rule`), event time, and snapshot labels for the department and employee. They do not duplicate email subject, sender, preview, or mailbox content.

The first `assigned` event establishes the task's assignment cohort. A `reassigned` event is a handoff and does not create another department task. Employee workload reporting can still count the new assignment received by the destination employee.

### Rule assignment events

Every successful automatic assignment also records one rule-attribution event linked one-to-one with its task assignment event. It stores the rule ID when available, rule-name snapshot, department snapshot, assignee snapshot, priority at assignment time, and event time.

Renaming, disabling, or deleting a rule does not change historical attribution. Manual assignment is represented as a separate comparison category and never attributed to a rule.

### Microsoft Graph sync runs

Record one organization-level Graph run plus child outcomes for each current department shared mailbox. The organization run stores a stable run ID, start/end timestamps, duration, aggregate outcome, and safe failure category. Department outcomes store department/mailbox identity, start/end timestamps, duration, outcome, and last-success timestamp without storing message content, message counts, tokens, or raw Graph errors.

Outcomes are `success`, `failed`, or `skipped_connection_changed`. Runtime **In Progress** remains available from the existing synchronization runner. Persistent run history supports freshness, average duration, and success/failure trends.

### Snapshot and deletion behavior

Reporting rows retain organization, department, employee, and rule display snapshots. Foreign keys may become null after a permitted deletion, but historical reports remain intelligible. Archived organizations retain all event and metrics history. The existing reversible organization archive behavior remains unchanged.

### Transaction and idempotency rules

Tenant, user, task, rule-attribution, and completion events are written in the same database transaction as the underlying mutation. If the reporting event cannot be recorded, the business mutation rolls back rather than producing silent reporting drift.

Graph runs use stable run IDs. A run and each department outcome can finish only once. Retry and reconnect behavior must not create duplicate successful outcomes for the same source execution.

## Historical backfill and completeness

The migration creates reporting events only where existing records provide reliable evidence:

- Organization creation uses the recorded organization creation timestamp.
- Current archived status remains available as a current-state count, but no historical archive event is synthesized when the transition time is unknown.
- Existing users become a baseline population; because the current user table does not reliably record creation/disable history, they do not appear as fabricated additions or removals in past periods.
- An existing non-null `assigned_at` creates a partial first-assignment event when the email status is assigned or completed; a non-null `completed_at` creates a partial completion event when the email status is completed.
- Previous reassignments and rule attribution are not reconstructed when the source record is absent.
- The existing aggregate Graph last-success timestamp seeds freshness only. It is marked as a partial baseline and excluded from run-duration and success-rate trends; prior runs are not invented.

Backfilled records carry a `backfill` source. Exact application-written records carry an `application` source. Metrics responses include completeness metadata per metric family (`tenantLifecycle`, `userLifecycle`, `tasks`, `rules`, and `graph`), with a boundary and one of `complete`, `partial`, or `unavailable` for the requested period.

The UI displays a concise partial-history notice and suppresses prior-period percentage comparisons when either period is incomplete. Missing historical data is never rendered as zero.

## Time ranges and metric semantics

### Shared ranges

- **This week**: Monday 00:00 through the current instant.
- **Last 30 days**: rolling 30-day range.
- **Last 6 months**: rolling six-month range.
- **Custom range**: inclusive local start date and inclusive local end date, converted by the server to an inclusive start and exclusive end instant.

Automatic grouping uses daily buckets for ranges up to 31 days, weekly buckets for ranges from 32 through 180 days, and monthly buckets for longer ranges. The API validates the requested bucket and normalizes unsupported choices to this automatic rule. Empty buckets are returned explicitly so plots do not shift or imply missing requests.

### Task definitions

- **Tasks assigned in period**: distinct tasks whose first assignment occurred in the selected range.
- **Tasks completed in period**: completion events occurring in the selected range, including tasks first assigned earlier.
- **Cohort completion rate**: tasks first assigned in the selected range and completed by the range endpoint, divided by all tasks first assigned in that range.
- **Open within SLA**: incomplete cohort tasks whose configured assigned-task deadline, measured from the latest assignment or reassignment, has not passed at the range endpoint.
- **Overdue**: incomplete cohort tasks whose configured assigned-task deadline, measured from the latest assignment or reassignment, has passed at the range endpoint.
- **Average total resolution**: received time to completion for completed tasks in the selected cohort.
- **Average handling time**: latest assignment time to completion for completed tasks in the selected cohort.
- **Employee assignments received**: assignment and reassignment events that placed work with that employee in the selected range.
- **Employee tasks completed**: completion events performed by that employee in the selected range.
- **Rule assignments**: successful automatic assignments attributed to that rule in the selected range.
- **Rule completion rate**: tasks automatically assigned by that rule in the selected range and completed by the range endpoint, divided by all tasks assigned by that rule in the range.
- **Graph freshness**: the latest successful organization refresh timestamp plus its elapsed age at response time.
- **Graph success rate**: successful organization runs divided by successful plus failed organization runs in the selected range; safely skipped connection-change runs are excluded from the denominator.

Organization workforce lifecycle includes OrgAdmins, DepAdmins, and Members but excludes PlatformAdmins. Current active-user counts include only active accounts. A pending membership counts as added when the OrgAdmin provisions it, while the later first-login activation does not count as a second addition. OrgAdmins appear under an **Organization-wide** category rather than a department.

A task completed after a historical range endpoint does not retroactively count as completed before that endpoint. Current-range figures naturally advance until the range closes.

## API and module boundaries

Use separate role-specific read routes rather than one broadly parameterized endpoint:

- `GET /api/metrics/platform`
- `GET /api/metrics/organization`
- `GET /api/metrics/department`
- `GET /api/metrics/me`

Common query parameters are `from`, `to`, and `bucket`. The PlatformAdmin route accepts a validated IANA `timezone` supplied by the browser. OrgAdmin may additionally filter workforce and Graph data by an authorized `departmentId`. DepAdmin may select an `employeeId` only when that employee belongs to the currently headed department. DepAdmin department scope and Member user scope come only from the session and cannot be overridden.

Responses use a stable shape containing:

- normalized period and timezone;
- completeness metadata;
- KPI values and safe comparison deltas;
- named plot series and bucket labels;
- authorized aggregate breakdowns;
- safe drill-down targets into existing application views.

A focused server metrics module owns range normalization, authorization-aware aggregation, completeness, and metric definitions. Focused client modules own Metrics state, URL serialization, chart rendering, accessible data tables, and selection reconciliation. The existing application controller owns navigation and uses the current global feedback manager for failures.

## Shared Metrics experience

All roles receive a **Metrics** navigation item. The page contains:

- a role-appropriate heading and organization timezone;
- presets for This week, Last 30 days, Last 6 months, and Custom range;
- a compact KPI strip;
- no more than two primary chart cards;
- removable chips for active plot/filter selections;
- a contextual detail panel or navigation action instead of extra charts.

A dedicated client chart adapter owns every plot so the rest of the application does not depend on a specific rendering library. Any third-party chart code is bundled locally and served by LexFlow; no CDN is used. Charts use LexFlow design tokens and responsive sizing. Each chart includes hover/click behavior, visible series controls, a concise text summary, and a **View data** table with exact values. Keyboard users can perform equivalent filtering through DOM controls rather than depending on canvas or pointer-only interactions. Reduced-motion preferences suppress nonessential animation.

Date range, bucket, department filter, employee/rule tab, and active chart selection are encoded in the URL. Reload, browser back, and browser forward preserve the view. Invalid or unauthorized URL parameters are safely normalized without exposing hidden data.

KPI comparison deltas use the immediately preceding equivalent period only when both periods are complete. The interface distinguishes loading, empty, partial, and failed states.

## PlatformAdmin dashboard

The PlatformAdmin dashboard is intentionally small.

### KPI cards

- Active tenants.
- Archived tenants.
- Total tenants.

### Primary plot

An interactive doughnut chart shows active versus archived tenant distribution. Selecting a segment filters a compact tenant table containing organization name, domain, status, creation date, and latest status change. The selected date range also reports tenant creation, archive, and restore events during that period without adding a second permanent chart.

No customer workforce, Graph, department, task, rule, or email information is available.

## OrgAdmin dashboard

### KPI cards

- Current active users.
- Users added during the selected period.
- Users disabled during the selected period.
- Users reactivated during the selected period.
- Current Graph freshness.
- Selected-period Graph success rate.

### Plot 1: People lifecycle

A grouped bar chart shows users added, disabled, and reactivated by day/week/month. A department selector supports All departments, one current department, or Unassigned. Selecting a bar opens the corresponding user lifecycle details without exposing Entra object IDs.

### Plot 2: Microsoft Graph health

A line chart shows organization refresh duration over time. Successful, failed, and safely skipped runs are visually distinguished. A companion detail table shows each department mailbox's last successful refresh, current freshness, average duration, and latest safe outcome.

OrgAdmin remains completely excluded from task and email-derived reporting, including aggregate task throughput and employee performance.

## DepAdmin dashboard

The DepAdmin dashboard is constrained to the currently headed department.

### KPI cards

- Tasks assigned.
- Tasks completed, with cohort completion rate as secondary text.
- Non-completions, split into open within SLA and overdue.
- Average total resolution time.
- Average employee handling time.

This produces five cards rather than a row of seven equal cards while preserving every requested measure.

### Plot 1: Assignment outcomes over time

A stacked column chart divides each assignment cohort into completed, open within SLA, and overdue tasks. Hovering or focusing a segment presents the count, completion rate, and average resolution time for that bucket. Selecting overdue work navigates to the existing authorized task list with the corresponding period and overdue filter.

### Plot 2: Performance breakdown

One horizontal-bar chart card switches between two tabs:

- **Employees**: assignments received and tasks completed per department member. Selecting an employee updates the KPI and outcome views for that employee.
- **Automation rules**: successful automatic assignments per rule. Exact details include completion rate and average total resolution. Historical renamed, disabled, and deleted rules retain their event-time labels/status; manual assignment appears as a separate comparison category.

Switching tabs reuses the same chart area rather than displaying another plot.

## Member dashboard

The Member dashboard contains only the signed-in user's work.

### KPI cards

- Assignments received.
- Tasks completed, with personal cohort completion rate as secondary text.
- Non-completions, split into open within SLA and overdue.
- Average handling time.

### Plot 1: My workload

A grouped bar chart shows assignments received and tasks completed by day/week/month. Selecting a bucket filters the existing personal task list.

### Plot 2: My handling-time trend

A line chart shows average assignment-to-completion time per bucket with the organization's configured SLA threshold as a reference. Periods with no completed tasks are gaps, not zero-duration performance.

Members never see colleague rankings, department totals, automation-rule metrics, Graph information, or tenant information.

## Loading, errors, and stale requests

One role-specific request returns the KPI and plot aggregates for a range atomically so values cannot come from mismatched snapshots. On an initial failure, the dashboard shows a compact retry state. If a refresh fails after a successful response, the previous result remains visible with a stale-data notice. API and network failures use the existing global notification manager and safe error envelope; raw SQLite errors, Graph errors, identifiers, tokens, and confidential content are never rendered.

Changing range or filters supersedes or cancels earlier requests. A slower stale response cannot overwrite a newer selection. Closed historical ranges refresh only after an explicit filter change or retry. A range containing the current instant refreshes through the existing application polling cycle without resetting focused controls or chart selections.

## Accessibility and responsive behavior

- Chart titles, summaries, legends, and data-table alternatives are associated with their plot cards.
- Color is never the only distinction; series also use labels, patterns, line styles, or markers.
- Interactive DOM controls are keyboard reachable and expose pressed/selected state.
- Tooltips are not the only source of exact values.
- Reduced-motion preferences disable plot transitions and loading shimmer.
- Partial and failed states are announced without stealing focus.
- At narrow widths, KPI cards wrap and the two-column chart grid becomes one column without horizontal overflow.
- Tables become horizontally contained or transform into labeled rows rather than shrinking unreadably.

## Testing and acceptance criteria

### Metric calculation tests

- Daily, weekly, and monthly buckets.
- IANA timezone conversion and daylight-saving transitions.
- Inclusive UI dates and exclusive API end instants.
- Assignment cohorts, reassignments, completions after range end, and current-period advancement.
- Open-within-SLA and overdue classification.
- Total resolution and handling-time calculations.
- Employee assignment/completion counts.
- Rule attribution and manual-assignment separation.
- Exact, partial, and unavailable completeness states.

### Persistence and migration tests

- Reporting events commit atomically with domain changes.
- Graph run and child outcomes finish idempotently.
- Backfill is repeatable and does not duplicate events.
- Renamed/deleted users, departments, and rules retain historical snapshots.
- Existing local and tenant-aware business data survives migration.
- Archived tenants preserve metrics history.

### Authorization tests

- PlatformAdmin metrics contain tenant data only.
- OrgAdmin metrics contain workforce lifecycle and Graph health only.
- DepAdmin requests cannot escape the current headed department.
- Members cannot request another employee or department.
- Cross-tenant and manipulated filter IDs return resource-hiding errors.
- Metrics payloads do not contain message content or provider message identifiers.

### UI tests

- Role-aware Metrics navigation and dashboard selection.
- Presets, custom ranges, automatic buckets, department filters, and removable selections.
- Chart/table value parity and legend filtering.
- Employee/rule tab switching and authorized drill-down navigation.
- URL state across reload/back/forward.
- Loading, empty, partial, failed, and retry states.
- Safe global error notifications and stale-request suppression.
- Keyboard operation, reduced motion, chart summaries, and responsive layouts.

### Regression and performance

The existing authentication, tenant isolation, Team, Graph, assignment, completion, rules, alert, and notification suites must continue to pass. Browser smoke tests cover all four roles at desktop and narrow widths. A representative synthetic dataset covering multiple departments, reassignment chains, deleted rules, lifecycle changes, archived tenants, and Graph failures provides a query-performance smoke test before release.

## Rollout

The schema migration and bounded backfill run before the Metrics routes become available. The feature is released for all four roles together so event semantics and navigation remain consistent. Exact-history notices disappear naturally as the requested periods move beyond the completeness boundary. Indexed event queries are the first implementation; precomputed daily rollups can be introduced later behind the same API response contract if production volume requires them.
