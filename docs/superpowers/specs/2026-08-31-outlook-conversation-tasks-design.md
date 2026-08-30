# Outlook Conversation Tasks Design

## Summary

LexFlow currently stores and manages each mailbox message as an independent task. This design changes the workflow boundary to an Outlook conversation: messages remain immutable thread entries, while assignment, completion, reopening, alerts, and reporting operate on one conversation task.

Microsoft Graph's native `conversationId` is the authoritative thread identity. A normalized subject key is used only for legacy, demo, or provider records without a native conversation identifier. That fallback is additionally scoped by organization, department, provider, mailbox, normalized sender address, and a rolling 30-day window. The user interface retains LexFlow's existing visual patterns and adds only a compact, collapsible thread treatment.

This work also corrects assignment-source reporting. Every assignment included in a summary must appear in exactly one breakdown category, including historical records whose original routing source cannot be proven.

## Goals

- Group messages from the same Outlook conversation into one collapsible task.
- Append new replies to the existing conversation instead of creating separate workflow tasks.
- Reopen a completed conversation when a genuinely new reply arrives.
- Restore the previous eligible assignee before attempting current automation rules.
- Preserve every earlier assignment and completion cycle for audit and metrics.
- Keep the current LexFlow visual language and role boundaries.
- Make assignment-source metrics reconcile with total assignments.

## Non-goals

- Sending or replying to email from LexFlow.
- Combining unrelated messages solely because their subjects are equal.
- Guessing historical rule attribution from the current rule configuration.
- Replacing the existing Outlook link flow or Graph authentication model.
- Redesigning the inbox, overview, or metrics modules.

## Domain model

### Conversation task

A conversation is the workflow aggregate. It is tenant-scoped and department-scoped and records:

- Provider and shared mailbox identity.
- Native provider conversation ID, when available.
- A scoped fallback key only when no native ID exists.
- Display subject.
- Current workflow status: `unassigned`, `assigned`, or `completed`.
- Current assignee.
- First and latest received timestamps.
- Latest message reference and message count.
- Current completion timestamp, when completed.
- Version and timestamps for concurrency control.

The native identity uniqueness boundary is organization, department, provider, normalized shared mailbox, and native conversation ID. This prevents a provider identifier from crossing tenant, department, or mailbox boundaries. The fallback removes leading reply/forward markers, folds case and whitespace, and combines the normalized subject with the normalized sender and 30-day window. Native Outlook messages never use this fallback when `conversationId` is present.

### Messages

Existing `emails` records become messages belonging to a conversation. A message retains its provider ID, sender, received time, subject, preview, Outlook link, mailbox, and department. Message-level provider uniqueness prevents replayed delta pages from inserting duplicates.

Message rows are content records, not workflow tasks. Existing message-level status and assignee fields may remain during a compatibility migration but cease to be authoritative after conversation conversion.

### Assignment cycles and events

Each time a conversation receives work, it starts an assignment cycle. A cycle records the assignee, assignment source, start time, completion time, and any preceding cycle. Earlier cycles remain immutable when a task is reopened.

Task events support at least `assigned`, `reassigned`, `completed`, and `reopened`. A reopening event records the triggering message, prior completion, previous assignee, resulting status, and assignment source. Rule-attribution events link to the specific assignment-cycle event that used the rule.

## Provider ingestion

Microsoft Graph delta requests add `conversationId` and `internetMessageId` to the selected message fields. The provider mapper exposes the native conversation identity without deriving it from the display subject.

For every delta item:

1. Resolve the department and shared-mailbox source using the existing tenant-scoped checks.
2. Insert or update the provider message.
3. Resolve or create the conversation from the native identity or tightly scoped fallback identity.
4. Link the message to that conversation and refresh the conversation summary.
5. Run workflow transitions only if the provider message was newly inserted.
6. Advance the delta cursor only after the transaction succeeds.

An update to a known provider message can refresh its content and Outlook link but cannot reopen a conversation. Duplicate and replayed delta pages therefore remain idempotent.

Initial schema migration and historical backfill run with reopening suppressed. They construct conversation membership and preserve current workflow state without unexpectedly reactivating completed work.

## Reopening lifecycle

When a newly inserted reply belongs to a completed conversation, LexFlow reopens the task in this order:

1. Restore the previous assignee when that user is active and still belongs to the same department.
2. Otherwise evaluate the department's enabled automation rules against the new reply, using the existing rule priority and matching semantics.
3. Otherwise leave the conversation unassigned for the DepAdmin.

Restoring the previous assignee is intentionally preferred over a newly matching rule. A restored assignment is attributed to `reopen_previous`, while a rule fallback is attributed to the matching rule. An unassigned result has no assignment cycle until a DepAdmin assigns it.

Reopening clears the current completion marker but does not delete or overwrite the preceding completion event or assignment cycle. The action records a `reopened` activity event. The restored or rule-selected assignee receives a reopening notification; if the task remains unassigned, the department administrator receives the notification.

A reply to an unassigned or assigned conversation appends to the thread and updates its latest-message summary without changing its workflow state.

## Application and API behavior

Bootstrap and email-list payloads return conversation summaries rather than every message body. Each summary includes conversation ID, subject, status, assignee, first/latest timestamps, message count, latest-message preview, completion information, and whether the latest work cycle was reopened. Expanding a conversation calls `GET /api/conversations/:id/messages`, which returns its tenant-authorized messages oldest to newest. This keeps the initial workspace payload bounded as threads grow.

Assignment, completion, visibility, Outlook-link, alerts, notifications, search, and counts accept conversation identity as the workflow resource. Opening an individual message in Outlook continues to resolve that message's immutable provider ID and mailbox.

Authorization remains unchanged in intent:

- DepAdmins can view and assign conversations only for their headed department.
- Members can view conversations assigned to them, including their message history.
- OrgAdmins cannot view confidential department messages.
- Cross-tenant and cross-department resources remain hidden with the existing `404`/`403` behavior.

Conversation transitions use a version check inside the database transaction so overlapping sync or user actions cannot reopen, assign, or complete the same version twice.

## User interface

The implementation follows the existing LexFlow typography, spacing, cards, borders, tags, status dots, dialogs, and notification toasts.

Inbox, assigned, and completed lists display one row per conversation. The collapsed row shows the subject, latest sender, latest received time, current status, assignee, and a compact message-count/chevron control. Expanded rows show messages oldest to newest using a subdued nested version of the existing email-row presentation. Each nested message has its own Open in Outlook action.

Assignment and completion controls appear once for the conversation. A reopened conversation uses its normal assigned or unassigned styling and adds a temporary `Reopened` tag until the conversation is completed again.

Overview cards continue to show at most five entries, now interpreted as five conversations. Sidebar badges and summary cards count conversation tasks, not individual replies. Date filtering uses the latest message timestamp. Search matches the conversation subject, message participants, and content from any message in the conversation.

## Metrics

Task metrics use assignment cycles, not raw messages. A conversation can contribute multiple work cycles only when it is genuinely reopened, preserving the outcomes and resolution time of each earlier cycle.

Assignment-source totals must reconcile exactly with the assignment summary. The breakdown categories are:

- One row per verified automation rule.
- Manual assignment.
- Reopened to previous assignee.
- Historical / unknown source.

The current observed dataset contains 12 assignment events: 9 verified rule assignments, 1 manual assignment, and 2 source-less backfilled assignments. The two source-less events appear as Historical / unknown source. They are not assigned retroactively to rules because the rule state at their assignment time cannot be established reliably.

When a rule assigns a reopened task, that cycle is credited to the rule. Restoring the prior assignee is credited to Reopened to previous assignee. Completion rate and resolution time are calculated per assignment cycle.

## Transactionality and error handling

Provider message insertion, conversation resolution, workflow transition, assignment-cycle creation, reporting attribution, activity, notifications, and cursor advancement occur within the existing mailbox transaction. A failure rolls back the complete change and leaves the cursor unchanged for a safe retry.

Provider-message uniqueness and conversation version checks prevent duplicate reply ingestion and duplicate reopen events. All API failures use the existing user-safe error responses and temporary notification system; thread expansion, assignment, completion, and Outlook-link actions must not fail silently.

## Migration

The migration adds the conversation relationship and conversation-level workflow storage without deleting mailbox or task history.

- Each existing message is linked to a conversation.
- Messages with the same reliable native identity inside the same scoped mailbox are merged into one conversation.
- Records without reliable native identity remain isolated unless they share the same safe fallback key.
- Existing current status, assignee, and completion data determine the migrated conversation state.
- Conflicting historical states are resolved deterministically in favor of the latest workflow event and recorded for diagnostics rather than silently discarded.
- Backfill does not emit reopening events or notifications.
- Existing reporting events remain valid and source-less assignment events become Historical / unknown source in metrics.

## Testing

Automated tests cover:

- Outlook `conversationId` ingestion and mailbox-scoped uniqueness.
- Safe fallback behavior and prevention of subject-only collisions.
- Correct chronological message ordering and summary fields.
- Idempotent duplicate/replayed delta pages.
- No reopen on provider updates or migration backfill.
- Completed conversation reopening on a new reply.
- Previous active assignee restoration.
- Rule fallback when the prior assignee is disabled, moved, or absent.
- Unassigned fallback and DepAdmin notification when no rule matches.
- Preserved completion and assignment-cycle history.
- Rule, manual, reopened, and historical assignment attribution.
- Metrics breakdown totals reconciling with assignment summaries.
- Thread-level permissions and cross-tenant/cross-department isolation.
- Collapsed and expanded UI behavior, five-item overview limit, search, filters, tags, and per-message Outlook links.
- Existing assignment, completion, alert, notification, Graph sync, and role-specific UI tests after conversion to conversation fixtures.

## Acceptance criteria

- Messages sharing a scoped Outlook `conversationId` appear as one collapsible conversation.
- A new reply never creates a second task for that conversation.
- A new reply to a completed task reopens it exactly once and follows the approved assignment order.
- Previous completions remain visible in audit and metrics history.
- Current inbox and overview design remains visually consistent.
- Conversation-level counts do not increase merely because a reply arrives.
- Assignment-source rows always sum to the assignment summary, with unknown history labeled explicitly.
- All transitions remain tenant- and department-isolated and surface failures through the UI notification system.
