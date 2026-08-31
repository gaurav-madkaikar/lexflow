# Email Escalations Design

## Goal

Add durable, department-scoped escalation emails for assigned conversation tasks that remain incomplete. A DepAdmin configures an ordered recipient hierarchy for their department, while the OrgAdmin configures one organization-wide interval in hours. LexFlow sends one escalation level at a time from the department shared mailbox and stops after the final configured level.

The feature must preserve the existing tenant boundary, OrgAdmin email confidentiality, conversation-task model, Entra authentication, shared-mailbox Graph integration, notification system, and visual language.

## Confirmed product decisions

- Each department has its own ordered escalation hierarchy managed by that department's DepAdmin.
- Escalation recipients may be external email addresses.
- The OrgAdmin controls one organization-wide escalation interval, initially 24 hours.
- Each hierarchy level is sent once. After the highest configured level succeeds, the assignment cycle stops escalating.
- A new assignment, reassignment, or reopened conversation starts a new escalation cycle at Order 1.
- Rule assignments inherit the rule priority.
- Manual assignments require Low, Medium, High, or Critical, defaulting to Medium.
- A reopened conversation restored to its previous assignee preserves its previous priority. A rule-based reopen inherits the current rule priority.
- Changes to a department hierarchy affect unsent levels on active tasks. Successfully sent levels remain immutable audit records.
- Interval changes affect active tasks immediately. Level 1 is measured from assignment time; each later level is measured from the previous successful escalation send.
- A sweep sends at most one level for a task.
- A failed send does not advance the hierarchy. LexFlow retries it and notifies the DepAdmin.
- Escalation emails are saved in the shared mailbox's Sent Items.
- Escalation content excludes the original email body, preview, sender details, attachments, and Outlook link.

## Chosen architecture

Use a durable database-backed escalation worker integrated into the existing single-process server. The worker runs beside the current overdue-alert runner and shares its one-minute cadence, organization enumeration, and coalescing behavior, but remains a separate module with a focused interface.

The worker has three phases:

1. Evaluate current assignment cycles and atomically create or claim due delivery records.
2. Send claimed records through Microsoft Graph outside any SQLite transaction.
3. Atomically record accepted sends, retries, blocked states, or cancellation.

This avoids holding a database lock during network requests, survives restarts through expiring claims, and provides an auditable delivery ledger. A direct Graph call inside `alerts.js` is rejected because it would mix local notifications with external delivery and create avoidable crash windows. An external queue is deferred because it would add infrastructure that the current deployment does not require.

## Domain model

### Organization setting

Add `escalation_interval_hours` to `workspace_settings`:

- integer from 1 through 8760;
- default 24 for existing and new organizations; and
- editable only by an OrgAdmin.

`getWorkspaceSettings` and `updateWorkspaceSettings` expose it as `escalationIntervalHours` alongside the existing response-timing values.

### Assignment-cycle priority and supersession

Extend `assignment_cycles` with:

- `priority INTEGER NOT NULL DEFAULT 30`, constrained to the canonical values 10, 20, 30, and 40; and
- `superseded_at TEXT`, nullable.

The canonical mapping remains:

- 10: Critical
- 20: High
- 30: Medium
- 40: Low

Before a new assignment cycle is inserted, any prior incomplete, non-superseded cycle for that conversation is marked `superseded_at` with the new assignment time. Completion continues to populate `completed_at` only for work that was actually completed, so reassignment does not inflate completion metrics.

The active cycle is the newest cycle whose `completed_at` and `superseded_at` are both null and whose assignee still matches the assigned conversation.

### Escalation hierarchy

Add `escalation_recipients`:

- `id`;
- `organization_id`;
- `department_id`;
- `position`, beginning at 1;
- normalized `email`;
- `created_at`; and
- `updated_at`.

Foreign keys cascade from organization and department. Unique constraints enforce one recipient per position and prevent the same normalized address from appearing twice in one department. The API replaces the hierarchy transactionally and derives contiguous positions from array order rather than trusting client-provided order numbers. An empty array disables future escalation sends for that department without deleting historical deliveries.

### Durable delivery ledger

Add `escalation_deliveries`:

- tenant and department scope;
- `conversation_id` and `assignment_cycle_id`;
- `level`;
- current recipient snapshot;
- a globally unique delivery key;
- state: `pending`, `processing`, `sent`, `failed`, `blocked`, or `cancelled`;
- attempt count;
- claim token and claim expiry;
- last attempt, next attempt, accepted-send, creation, and update timestamps;
- sanitized last error and failure category; and
- provider request identifier when available.

`(assignment_cycle_id, level)` is unique. Successfully sent records are immutable except for non-content audit metadata. An index over state and next-attempt time supports bounded due-work selection.

The recipient is resolved from the current hierarchy before every unsent attempt. Thus an edit can replace a pending recipient, while a sent record retains the address that actually received it. If the hierarchy temporarily becomes shorter than the next level, the worker simply leaves that level unclaimed; no separate paused delivery row or state is created. Re-adding that level allows the cycle to continue unless the task has otherwise ended.

## Assignment and priority behavior

The manual assignment endpoint requires `priority` in addition to `assigneeId`. The assignment dialog presents the four canonical options and defaults a new assignment to Medium. A reassignment preselects the current task priority so retaining the value requires no extra action.

Rule assignments persist the matched rule's priority on the new assignment cycle. A reopen restored to the previous assignee copies the preceding cycle's priority, defaulting to Medium only when historical priority is unavailable. A reopen assigned by a current rule stores that rule's priority.

Conversation list queries expose the current cycle priority. DepAdmin and Member task rows and details display the label. OrgAdmin payloads continue to omit task information.

## Escalation eligibility and scheduling

A cycle is eligible only when all of these remain true:

- the organization is active;
- the department exists and still has its shared mailbox;
- the conversation is assigned and incomplete;
- the cycle is current and not superseded;
- the cycle assignee matches the conversation assignee;
- a recipient exists at the next unsent level; and
- no successful delivery exists for that level.

For Level 1, due time is `assignment_cycles.started_at + current interval`. For later levels, due time is `previous successful delivery sent_at + current interval`. The current interval is read during every sweep, so setting changes affect active work.

Only the next unsent level can be claimed, and at most one level per cycle is processed in a sweep. This prevents an interval reduction from sending several hierarchy levels simultaneously. Once the highest currently configured level succeeds, the cycle has no further due work. If the hierarchy is later extended while the task is still incomplete, the new next level becomes eligible using the last successful send as its clock origin.

Reassignment supersedes the old cycle and cancels its unsent delivery records. Completion ends the active cycle and cancels its unsent records. Reopen creates a fresh cycle. Department deletion cascades hierarchy configuration and prevents further delivery. Archived organizations are excluded from claiming or sending while pending audit rows remain preserved and non-claimable. Restoration resumes from current eligibility and the current interval/hierarchy, still processing at most one level per task in each sweep.

## Microsoft Graph delivery

The existing Outlook integration gains a private server-side operation that sends a message from a validated department shared mailbox:

```text
POST https://graph.microsoft.com/v1.0/users/{sharedMailbox}/sendMail
```

The operation uses the existing organization application token and connection. It does not introduce delegated user tokens, per-user credentials, or a public generic send-mail API. Before sending, it verifies that the organization is connected and active and that the mailbox still belongs to the scoped department.

The Entra application requires the Exchange Online Application RBAC role `Application Mail.Send`, scoped to the approved department shared mailboxes. This mirrors the existing mailbox-scoped `Application Mail.Read` approach. Do not additionally grant unrestricted Entra `Mail.Send` when mailbox-scoped Exchange RBAC is used, because permission sources are additive.

`saveToSentItems` remains true. A Graph `202 Accepted` response records the escalation as sent/accepted. The body includes a stable `X-LexFlow-Escalation-ID` internet header based on the delivery key.

### Email content

Subject:

```text
Escalation Level {level}: {task subject}
```

The HTML body contains only:

- escalation level;
- task subject;
- department name;
- shared mailbox address;
- assigned member name and email;
- priority label;
- assignment time formatted in the organization's configured timezone;
- elapsed incomplete duration; and
- a short automated-message notice.

The template HTML-escapes all dynamic values, strips subject control characters, and bounds subject length. It includes no original message body, preview, original sender details, attachments, Outlook URL, or access token. One message goes only to the current level recipient, with no automatic CC or BCC to prior levels, the assignee, DepAdmin, or OrgAdmin.

## Delivery reliability

The runner coalesces overlapping sweeps, claims a bounded batch, and sends with limited concurrency to avoid Graph bursts. Claims expire so another sweep can recover work after a process interruption.

Before the network request, the worker revalidates the organization, department mailbox, active assignment cycle, conversation state, hierarchy level, and recipient. Obsolete records are cancelled, while records whose next hierarchy level is temporarily absent remain unclaimed rather than being sent.

Retry handling:

- Respect Graph `Retry-After` when supplied.
- Retry network failures, 429 responses, and 5xx responses with exponential delays capped at one hour.
- Mark permission, tenant-consent, or mailbox-configuration failures as blocked and probe them at a much slower bounded interval rather than generating a request storm.
- Never advance to the next level until the current level receives a successful Graph acceptance.
- Stop retrying when the task is completed, reassigned, removed, or otherwise ineligible.

The unique delivery row prevents duplicate sends during normal retries and overlapping sweeps. Graph `sendMail` does not provide an application idempotency key, so a connection failure after Exchange accepted a request is inherently ambiguous. LexFlow uses the unique message header and the existing mailbox read capability to reconcile recent Sent Items before retrying an uncertain attempt. This minimizes, but cannot mathematically eliminate, duplicates during an external-service ambiguity window.

The first failure for a delivery creates one department-scoped `escalation_failed` in-app notification for the DepAdmin, linked to the latest email in the conversation so existing notification navigation remains useful. Repeated attempts update the same delivery state without creating notification spam. Successful recovery deletes that actionable failure notification, matching the existing assignment-state cleanup pattern. The notification schema/check constraint is migrated explicitly to accept the new kind.

OrgAdmins see only sanitized outbound Graph health, such as **Escalation delivery permission needs attention**, through the existing Graph Integration status and notification-modal patterns. That health signal contains no task subject, recipient, assignee, conversation identifier, or delivery history.

## Authorization and APIs

### DepAdmin

`GET /api/escalations`

Returns only the signed-in DepAdmin's headed department:

- current interval as read-only context;
- ordered recipients; and
- bounded recent delivery history with task subject, level, recipient, timestamp, and sent/failed state.

`PUT /api/escalations`

Accepts an ordered `recipients` array. The server validates and normalizes each address, rejects duplicates, derives positions, and replaces the current department hierarchy transactionally. No organization or department identifier is accepted from the client.

### OrgAdmin

`PATCH /api/settings` gains `escalationIntervalHours`. Existing authorization remains OrgAdmin-only. The OrgAdmin bootstrap exposes the numeric setting but no hierarchy or delivery data.

### Assignment

`POST /api/emails/:id/assign` gains a canonical `priority`. Existing resource-hiding, organization, department, and DepAdmin checks remain in force.

PlatformAdmins, OrgAdmins, Members, and DepAdmins outside the headed department cannot read or mutate a hierarchy or its delivery history. There is no client-accessible endpoint for sending an escalation manually in the initial implementation.

## Interface design

Add **Escalations** to the DepAdmin Workspace navigation next to Automation Rules. Follow the existing cards, fields, buttons, responsive breakpoints, notification modals, and typography.

The page contains:

- the organization interval as read-only context, for example **Escalate every 24 hours**;
- an ordered list of recipient email fields;
- accessible Add, Remove, Move up, and Move down controls;
- generated order labels beginning at 1;
- inline validation and the global success/error notification system;
- a Save hierarchy action; and
- bounded recent activity showing task, level, recipient, time, and state.

Reordering must not rely on drag alone. Up/down buttons preserve keyboard and touch accessibility, and focus remains on the moved row after rendering.

The OrgAdmin's existing **Response timing** form gains **Escalation interval — hours** with text explaining that it controls department escalation ladders. It does not display recipient or task data.

The assignment form gains a priority selector. Task presentation for DepAdmins and Members shows the persisted label without changing assignment, completion, or thread-expansion behavior.

## Validation and feedback

- Hierarchy addresses must be syntactically valid, at most 254 characters, normalized case-insensitively, and unique within a department.
- The interval must be a whole number from 1 through 8760 hours.
- Priority must be one of 10, 20, 30, or 40.
- Validation errors attach to the relevant field and use the existing form-error and notification patterns.
- Stored Graph failures are sanitized using the same secret-redaction principles as mailbox synchronization.
- No provider payload, token, client secret, raw response body, or stack trace reaches the browser.

## Migration

Migration is additive and preserves all users, organizations, departments, conversations, messages, rules, metrics, and task history.

- Add `escalation_interval_hours` with value 24 to existing organization settings.
- Add priority and supersession columns to assignment cycles.
- Backfill cycle priority from rule attribution where a reliable matching event exists; otherwise use Medium.
- For conversations with multiple incomplete cycles, keep only the newest as active and mark older cycles superseded at the newer cycle's start time.
- Create hierarchy and delivery tables and their indexes.
- Extend the notification kind constraint for `escalation_failed` without discarding existing notification rows.
- Start every department with an empty hierarchy, so deployment alone sends no escalation email.

The migration must be idempotent and continue to refuse destructive cleanup of production data.

## Verification

### Domain and scheduling tests

- Validate hierarchy ordering, replacement, normalization, duplicate rejection, empty disablement, and tenant/department isolation.
- Verify Level 1 from assignment time and later levels from the prior successful send.
- Verify interval changes affect active tasks and never send multiple levels in one sweep.
- Verify hierarchy edits affect unsent levels but never rewrite sent snapshots.
- Verify each level sends once and processing stops after the final level.
- Verify reassignment and reopen reset at Order 1 with the correct priority.
- Verify completion, department deletion, and tenant archive prevent obsolete sends.
- Verify archived organizations preserve pending audit state without sending and restoration resumes no faster than one level per sweep.
- Verify an extended hierarchy can continue an incomplete cycle after the previous final level.

### Assignment tests

- Validate all four manual priorities and reject all other values.
- Verify manual reassignment preselects/persists the chosen priority.
- Verify rule assignment, prior-assignee reopen, and rule-based reopen select the correct priority.
- Verify existing completion, assignment, rule metrics, and conversation behavior remain intact.

### Graph and worker tests

- Verify the sender endpoint uses the correct department shared mailbox.
- Verify recipient, subject, body fields, organization timezone, unique header, and Sent Items setting.
- Assert that confidential source content and links are absent.
- Verify transient retry, `Retry-After`, capped backoff, blocked configuration state, and no level advancement on failure.
- Verify claim expiry, restart recovery, overlapping-sweep coalescing, bounded concurrency, and unique-delivery protection.
- Verify uncertain-send reconciliation checks Sent Items before retry.
- Verify errors are sanitized, one actionable DepAdmin notification is created, repeated retries do not spam, and recovery resolves it.
- Verify OrgAdmin outbound Graph health is generic and cannot expose department task data.

### API and UI tests

- Verify role-scoped bootstrap payloads and resource-hiding responses.
- Verify the Escalations navigation/page appears only for DepAdmins.
- Verify OrgAdmins can edit only the interval and see no escalation task details.
- Verify hierarchy reorder focus, field errors, global feedback, recent history, assignment priority, and responsive layout.
- Run the full automated suite and a browser smoke test covering hierarchy configuration, interval editing, manual assignment priority, an accelerated escalation sequence, failure feedback, and completion cancellation.

## Documentation and deployment

Update README and setup guidance to include:

- Exchange Application RBAC `Application Mail.Send` for the approved shared-mailbox resource scope;
- the warning against combining scoped RBAC with unrestricted additive mail permissions;
- Sent Items behavior;
- escalation sender/content semantics;
- retry and audit behavior; and
- the fact that a newly deployed hierarchy is empty and sends nothing until configured by a DepAdmin.

## Out of scope

- Escalating unassigned tasks.
- Different intervals per department, hierarchy level, priority, or task.
- CC/BCC chains or notifying all previous levels again.
- A manual **Send now** action.
- Editing the generated email template.
- Attachments or original email content in escalation messages.
- Granting Exchange permissions from LexFlow.
- External queue infrastructure or multi-node worker coordination in the initial deployment.
