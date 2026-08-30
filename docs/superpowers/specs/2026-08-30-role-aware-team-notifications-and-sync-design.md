# Role-Aware Team, Notifications, and Graph Sync

## Summary

Refine LexFlow’s role-specific interface so each user sees only information relevant to their responsibilities, all user-visible operations report success or failure consistently, OrgAdmins manage people through a compact Team workspace, and the Microsoft Graph panel reports synchronization state accurately.

The implementation centralizes transient feedback, preserves existing workflow notifications, tracks Graph synchronization per organization, and removes manual Entra object-ID management while retaining verified object IDs internally as the stable security binding.

## Goals

- Remove mailbox-connection and synchronization-management copy from individual Member views.
- Surface every user-triggered success or failure through consistent, accessible transient notifications.
- Show role-specific pending-work summaries when Members and DepAdmins enter the application.
- Move member and department administration into a compact Team page.
- Show only OrgAdmins and department leads in Settings summaries.
- Correct Graph last-success reporting and expose an in-progress state.
- Remove object-ID fields from forms and public management payloads while preserving internal identity security.
- Retain the established LexFlow visual language and improve spacing, alignment, and responsive behavior.

## Non-goals

- Do not persist transient UI success/error popups as database notifications.
- Do not replace workflow notifications for assignments, completions, or overdue work.
- Do not show a success popup after every automatic mailbox synchronization.
- Do not remove the organization’s Entra tenant ID.
- Do not delete existing internal Entra object-ID bindings.
- Do not change department mailbox access assumptions or Graph permissions.

## Role-specific mailbox presentation

### Member

Members do not configure or operate mailbox synchronization. Hide the sidebar mailbox-status card and the hero mailbox-mode chip for this role. Member pages retain assigned, completed, and workflow-notification views without displaying “No mailbox connected” or “Mailbox sync managed by OrgAdmin.”

### DepAdmin

DepAdmins retain the department shared-mailbox context because they own its intake and assignment workflow. The sidebar continues to identify the relevant shared mailbox. Organization-wide Graph configuration remains unavailable.

### OrgAdmin

OrgAdmins retain the Microsoft Graph integration panel and organization-wide synchronization facts in Settings. They remain email-blind and do not receive access to message content.

## Global transient notification system

Replace ad hoc toast and integration feedback behavior with one notification-popup manager.

Each popup has:

- A type: `success`, `error`, or `info`.
- A concise title/message and an optional in-app action.
- A close button.
- An accessible status or alert announcement.
- A stable fingerprint used to collapse duplicate messages.

Success and information popups dismiss after approximately 4–5 seconds. Error popups dismiss after approximately 7 seconds. A user may dismiss any popup earlier. The manager shows a small bounded stack so concurrent messages do not overlap or replace one another unexpectedly.

The popup manager reports outcomes for organization edits, member and department changes, Graph authorization/disconnection, rules, assignments, completion, deletion, and other asynchronous actions. Forms continue to show field-specific validation errors inline, while the same safe summary also appears as an error popup.

Network failures, malformed API responses, exposed API errors, and unexpected client failures are normalized into safe user-facing messages. Background polling failures are fingerprinted and deduplicated so a temporary outage does not produce a popup every polling interval. Unknown failures must not expose tokens, tenant/object IDs, mailbox addresses, message identifiers, mailbox content, or raw upstream responses.

The current Graph-specific feedback element is removed. Authorization callback results and disconnect results use the global popup manager after URL parameters are consumed and removed.

## Entry pending-work notification

After the first authenticated bootstrap of an application entry, show one role-specific information popup. Background refreshes do not repeat it.

For a Member:

- Count assigned, incomplete emails visible to that Member.
- Report unread workflow notifications separately.
- Offer an action that opens My work when pending emails exist, otherwise Notifications when only unread updates exist.

For a DepAdmin:

- Count unassigned emails in the headed department.
- Count incomplete emails assigned to the DepAdmin personally.
- Report unread workflow notifications separately.
- Offer an action that opens the department Inbox when unassigned work exists, otherwise Assigned work or Notifications as appropriate.

Do not show an entry popup when all applicable counts are zero. Reset the entry-popup guard after sign-out or authentication loss so a later sign-in receives a fresh summary.

The server provides an explicit pending-task summary in the bootstrap response. This keeps role rules out of presentation code and avoids deriving security-sensitive visibility from unrelated UI state.

## Settings information architecture

### Administrators

Replace the current all-user management list in Settings with an Administrators summary. Show active OrgAdmins only. If multiple OrgAdmins exist, show each of them. Include a prominent **Manage team** action that navigates to the Team page.

Member creation, role changes, activation, and disabling no longer appear in Settings.

### Department leads

Replace the current “Departments and team” full user list with a compact Department leads summary. Each row shows:

- Department name.
- DepAdmin username derived from the corporate email local part, such as `jsahoo`.
- A clear unassigned-lead state when no valid head exists.

Include a **Manage team** action. Do not show ordinary department members in this Settings section.

Organization profile, Graph integration, and response timing remain in Settings.

## Team page

Rename the OrgAdmin navigation item and view from **Departments** to **Team**. Existing route/view state may remain internal, but all user-facing labels, headings, and accessibility names use Team.

The Team page owns:

- Member pre-provisioning by corporate email and role.
- Member role and lifecycle controls.
- Department creation, editing, and removal.
- Shared-mailbox assignment.
- Department placement and movement.
- DepAdmin selection and replacement.

### Collapsible department groups

Render each department as a native collapsible group that starts closed. Its summary shows:

- Department name.
- Shared mailbox.
- Member count.
- DepAdmin username only, not the complete email address.
- Compact edit/remove controls that remain keyboard accessible.

Expanding a department reveals its members, full identity details, lifecycle/placement controls, and department-head selection. The DepAdmin remains a normal working department member.

Render Unassigned members as a separate collapsed group with a count. Expanding it reveals member placement and lifecycle controls.

Preserve expanded group IDs across polling and re-rendering so background data refresh never collapses the group an OrgAdmin is using. If a group is removed, discard its stored expansion state.

Use consistent grid columns, gaps, control heights, and card padding. At narrow widths, summaries and controls stack without horizontal overflow. Native disclosure semantics provide keyboard and screen-reader behavior.

## Entra identity management

The Entra tenant ID remains required for each organization. Manual user object-ID management is removed.

### Public forms and APIs

- Remove Initial OrgAdmin object ID from PlatformAdmin organization creation/edit forms.
- Remove Entra object ID from member creation and editing.
- Do not accept user object-ID mutation through organization/member management APIs.
- Remove `entraObjectId` and `initialAdminObjectId` from public management payloads.
- Organization creation requires name, domain, Entra tenant ID, and initial OrgAdmin email.

### Internal binding

New OrgAdmins and Members are stored as pending email memberships with the organization tenant ID and no object ID. On successful Microsoft sign-in, LexFlow verifies the tenant, domain, claimed corporate email, and membership before storing the verified `oid` internally and activating the account.

Existing object-ID bindings remain unchanged and continue to reject identity mismatches. Disabling/reactivating an existing member preserves that binding.

When a PlatformAdmin changes the initial OrgAdmin email to a different account, clear the replaced pending identity’s internal object-ID binding, invalidate affected organization sessions, and bind the new verified identity on first sign-in. If the email is unchanged, preserve the existing binding.

No database column removal or destructive identity migration is required.

## Microsoft Graph synchronization status

### Runtime status

Extend the synchronization runner with a read-only per-organization status interface. It reports:

- `inProgress`.
- `startedAt` when a run is active.
- The latest completed run sequence/outcome needed for client transition detection.

When an automatic all-organization run starts, mark only organizations represented by active sources as in progress. Clear each status when its sources settle. A server restart correctly resets runtime state to idle.

### Aggregate Outlook outcome

Stop deriving the Graph panel’s timestamp/error from arbitrary matching cursor keys. At the end of each organization’s Outlook source group:

- Record an aggregate Outlook success timestamp only when every current Outlook source succeeds or is safely skipped because its connection changed.
- Record a safe aggregate failure when one or more current Outlook sources fail.
- Clear the previous aggregate failure after the next fully successful Outlook run.
- Ignore removed departments, stale mailbox cursors, Gmail sources, and other organizations.

Use organization-scoped `sync_state` keys; no schema migration is needed. Existing source-level timestamps remain available for synchronization internals. Before the first new aggregate outcome exists, the panel may fall back to the newest valid current-source success timestamp.

### Graph panel

The panel displays:

- **In Progress** with a small spinner while the organization’s sources are running.
- **Connected** with an accurate Last successful sync value when healthy.
- **Needs attention** after failure, without embedding the detailed error message in the component.

Successful background runs remain silent. A new failure outcome emits one deduplicated error popup. Authorization and disconnect actions emit success/error popups. Client polling updates the spinner and timestamp without resetting focused controls.

## API and component boundaries

- The bootstrap payload exposes `pendingTasks` only to Member/DepAdmin roles.
- The OrgAdmin bootstrap integration payload includes the Graph runtime status merged with persistent aggregate outcome data.
- A focused client feedback module owns notification queueing, deduplication, timing, and dismissal.
- Small pure helpers own pending-summary copy/action selection, department grouping, expansion-state reconciliation, and username formatting.
- The existing application controller remains responsible for API calls and view selection but delegates these isolated concerns.
- The existing safe API error envelope remains canonical.

## Accessibility

- Success/info popups use polite live announcements; errors use assertive alerts.
- Popup close/action buttons are keyboard reachable without stealing focus when a popup appears.
- Reduced-motion preferences suppress popup/spinner animation where appropriate.
- Collapsible Team groups use native disclosure controls or equivalent correct `aria-expanded` relationships.
- Hidden Member mailbox UI is removed from the accessibility tree, not merely visually obscured.
- Busy Graph status includes visible text in addition to the spinner.

## Testing

- Member bootstrap/UI does not render mailbox status or management copy; DepAdmin context remains.
- Member and DepAdmin pending-task summaries count only authorized incomplete work and unread updates.
- Entry popups appear once per application entry and reset after sign-out.
- Popup manager covers stacking, timeout, manual close, actions, duplicate collapse, safe errors, and polling deduplication.
- All asynchronous form/action paths expose success/failure; field validation remains inline.
- OrgAdmin Settings shows active OrgAdmins and department leads only.
- Team owns member management and department management.
- Department and unassigned groups start collapsed, preserve expansion across refreshes, and format DepAdmin usernames from email local parts.
- Existing last-admin, head-replacement, movement, role, status, and department-removal protections continue to pass.
- New organization/member provisioning accepts no object ID, exposes no object ID, binds verified claims on first login, and retains mismatch protection for existing bindings.
- Graph runtime status is organization-scoped and coalesced runs do not produce incorrect states.
- Aggregate last-success timestamps ignore stale/removed source keys and update only after healthy Outlook runs.
- Graph failures trigger one popup; successful automatic runs remain silent.
- Full server/client regression suite and local browser smoke tests cover Member, DepAdmin, and OrgAdmin layouts.
