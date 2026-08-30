# Thread Interaction, Attachment Rules, and Timezone Design

## Summary

This change makes conversation rows directly expandable, adds strict attachment-state matching to automation rules, and applies one organization-configured timezone consistently across every timestamp and reporting boundary. The existing LexFlow interface remains visually unchanged apart from the new attachment rule control and the existing thread affordance becoming row-clickable.

Microsoft Graph's `hasAttachments` message property is the attachment source. It excludes inline-only content such as signature images, which LexFlow also excludes. A conversation has attachments when any linked message has a non-inline attachment.

## Goals

- Toggle a multi-message thread by clicking anywhere on its parent row.
- Preserve child-message detail and Outlook-link behavior.
- Add a strict `Has attachment` Boolean to every automation rule.
- Match attachment rules against the complete conversation, not only the newest reply.
- Use one organization timezone for all displayed times, filters, and metrics.
- Default and migrate prior-default organizations to `Asia/Kolkata`.
- Render every clock time in 12-hour format with AM/PM.

## Non-goals

- Listing, downloading, scanning, or classifying attachment files.
- Counting inline-only images as attachments.
- Fetching the Graph attachment collection for every message.
- Removing the accessible Expand/Collapse control.
- Changing UTC ISO timestamp storage.

## Attachment data model

The `emails` table gains `has_attachments`, a required SQLite Boolean with a default of `0`. The `conversations` table gains the same field. A conversation value is the logical OR of all linked message values.

Historical messages migrate to `0` because attachment evidence was not previously stored. Conversation backfill and reconciliation recompute the aggregate from linked messages. New provider messages always persist the provider value.

The Graph delta `$select` adds `hasAttachments`, and the provider mapper exposes it as `hasAttachments: boolean`. Microsoft Graph reports false for inline-only attachments, so email signature images do not alter routing.

When a newly inserted or updated message changes attachment state, conversation aggregation is recomputed transactionally before rule evaluation. A completed-thread reply therefore evaluates rules against the current whole-thread attachment state.

## Automation-rule behavior

The `rules` table gains `has_attachments`, a required Boolean defaulting to `0`.

Rule semantics are strict:

- `has_attachments = 0` matches only conversations with no non-inline attachments.
- `has_attachments = 1` matches only conversations where at least one message has a non-inline attachment.

Existing rules migrate to `0`, intentionally changing them so they no longer match attachment-bearing threads. New rule forms default to off. Rule create, update, immediate-application, sync assignment, and reopened-thread fallback all use the same final rule predicate.

The DepAdmin rule card and edit dialog show the attachment requirement in the existing criteria/copy style. The form uses a Boolean checkbox labeled `Has attachment`.

## Organization timezone standard

`Asia/Kolkata` replaces `UTC` as the default organization timezone. Migration changes organizations still holding the former automatic `UTC` default to `Asia/Kolkata`. Existing non-UTC values are preserved. New organizations and the legacy default organization use `Asia/Kolkata` unless an OrgAdmin selects another valid IANA timezone.

The authoritative organization timezone controls:

- Email and conversation timestamps.
- Assignment, completion, activity, notification, and sync timestamps.
- Date-filter interpretation and displayed calendar dates.
- Metrics query ranges, date boundaries, chart buckets, and table labels.
- OrgAdmin and organization-scoped operational views.

PlatformAdmin views use `Asia/Kolkata` because they have no customer-organization context.

Timestamps remain stored as UTC ISO strings. Browser rendering passes the authoritative timezone explicitly to `Intl.DateTimeFormat`; it does not rely on the machine's implicit timezone. Every clock display uses `hour12: true`, producing a 12-hour time with AM/PM. Date-only controls convert between organization-local calendar keys and UTC instants without changing the stored timestamp.

The existing OrgAdmin timezone control remains the configuration surface and continues accepting valid IANA timezone identifiers.

## Thread interaction

A multi-message parent row is the primary expansion control. Mouse click or keyboard activation toggles the conversation open and closed. The existing Expand/Collapse button remains separately focusable, exposes `aria-expanded`, and invokes the same toggle function.

Event handling distinguishes three targets:

1. Expand/Collapse control: toggle the parent conversation once.
2. Multi-message parent row: toggle the parent conversation instead of opening the latest-message dialog.
3. Expanded child message or single-message row: open that message's detail dialog.

The parent row and separate control share one `toggleConversation` implementation, preventing divergent loading, caching, error, or focus behavior. Expanding still loads messages lazily through the tenant-safe conversation endpoint. Failed loads collapse the row and use the existing temporary notification system.

## API and payload behavior

Conversation summaries include `hasAttachments`. Individual message payloads include `hasAttachments`. Rule payloads include `hasAttachments`, and rule write APIs validate the value as a Boolean.

Bootstrap provides the organization's IANA timezone for all organization roles. Platform bootstrap exposes the platform fallback timezone as `Asia/Kolkata`. The browser passes its organization timezone to shared formatting and date-key helpers; metrics requests continue sending the same authoritative timezone contract used by the server.

OrgAdmin email confidentiality and all existing tenant/department visibility restrictions remain unchanged.

## Migration

Migration performs these changes idempotently:

- Add `emails.has_attachments INTEGER NOT NULL DEFAULT 0` with a Boolean check.
- Add `conversations.has_attachments INTEGER NOT NULL DEFAULT 0` with a Boolean check.
- Add `rules.has_attachments INTEGER NOT NULL DEFAULT 0` with a Boolean check.
- Recompute each conversation value from its linked messages.
- Change organization timezone `UTC` values to `Asia/Kolkata`.
- Preserve every valid non-UTC IANA timezone.

The migration does not infer missing historical attachment evidence and does not fetch Graph attachments retroactively.

## Error handling

Invalid attachment rule values return the existing field-level validation response. Graph messages without a usable Boolean are normalized to false and surfaced through provider tests. Thread-load failures use global safe notifications and do not leave a permanent loading state. Invalid organization timezones remain rejected by the existing IANA validation.

## Testing

Automated coverage includes:

- Graph `$select` and mapping for `hasAttachments`.
- Inline-only behavior through the provider Boolean contract.
- Message persistence and conversation OR aggregation.
- Attachment state on an older message affecting a later rule evaluation.
- Strict false/no-attachment and true/attachment rule predicates.
- Existing/new rule defaults and rule API validation.
- Immediate rule application and completed-thread fallback.
- Whole-row expansion, separate toggle activation, and child-message detail behavior.
- No double toggle when the explicit control is clicked.
- UTC-default organization migration to `Asia/Kolkata`.
- Preservation of non-UTC organization zones.
- OrgAdmin timezone changes affecting all display and metrics contexts.
- 12-hour formatting with AM/PM.
- Organization-local date keys and metrics boundaries.
- Existing role, confidentiality, tenant-isolation, sync, rule, and metrics regressions.

Browser smoke testing verifies a multi-message row toggles from anywhere, a nested message still opens details, attachment criteria render in rule cards/dialogs, and timestamps agree across inbox, activity, notifications, sync health, and Metrics for the selected organization timezone.

## Acceptance criteria

- Clicking a multi-message parent row expands or collapses it.
- The explicit toggle remains accessible and does not double-fire.
- Child messages and single-message rows still open details.
- Graph attachment state persists without extra per-message attachment requests.
- A rule's Boolean exactly matches the conversation attachment state.
- Any attachment-bearing message makes the complete conversation attachment-bearing.
- Existing rules default to requiring no attachments.
- All organization views and reports use the configured IANA timezone.
- Prior-default UTC organizations and new organizations default to `Asia/Kolkata`.
- Every displayed clock time uses 12-hour AM/PM formatting.
