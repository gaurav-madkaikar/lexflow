# Department Administrator and Email Isolation Design

## Status

Approved in conversation on 2026-08-30. This specification is ready for implementation planning after user review.

## Summary

LexFlow will add a department-scoped `DepAdmin` role while preserving organization-wide Microsoft 365 configuration under `OrgAdmin`. OrgAdmins will manage organization metadata, the Graph connection, departments, members, and department heads, but will have no access to confidential email content or email-workflow screens. Each DepAdmin will manage only the email queue and automation rules for the department they lead. Members will continue to see only work assigned to them.

The Microsoft Graph connection remains app-only and organization-wide. It is configured once by an OrgAdmin and creates one synchronization source for each department shared mailbox. DepAdmins do not configure Graph, grant consent, or store Graph credentials.

## Goals

- Give every populated department one accountable department head exposed as `DepAdmin`.
- Keep Graph configuration centralized under OrgAdmin.
- Prevent OrgAdmins from seeing email subjects, senders, previews, URLs, message counts, rules, activity, or notifications.
- Restrict each DepAdmin to the shared mailbox, members, rules, and email records of one department.
- Let DepAdmins assign work to themselves or other active members of their department, manually or through automation rules.
- Preserve the existing Member experience for assigned and completed work.
- Enforce confidentiality in server queries and mutations, not only in navigation.
- Migrate existing data without silently exposing ambiguous records to a department.

## Non-goals

- Per-DepAdmin delegated Graph consent or token storage.
- A user belonging to or leading multiple departments.
- DepAdmins managing organization metadata, members, departments, connectors, or response settings.
- OrgAdmins reviewing email for troubleshooting or override purposes.
- Automatic Exchange mailbox permission grants from LexFlow.
- Replacing the existing Entra sign-in model.

## Chosen role model

Department leadership is stored as a relationship on the department rather than as a standalone global user role.

- Add nullable `departments.head_user_id` referencing a user with deletion restricted by the protected-transition rules.
- A user remains a member internally and is exposed as `dep_admin` when their ID equals the `head_user_id` of their assigned department.
- A user can head at most one department.
- An OrgAdmin cannot be assigned to a department and cannot be a department head.
- A department with at least one non-disabled member must have exactly one head.
- A department with no non-disabled members may temporarily have no head.
- The first pending or active member successfully assigned to a headless department becomes its DepAdmin automatically.
- A DepAdmin remains a working member and may receive, complete, or self-assign email.

This model is preferred over adding `dep_admin` directly to `users.role` because department authority is inherently relational. It also avoids introducing a full department-membership table while users belong to only one department.

## Department-head lifecycle

### Initial assignment

When an OrgAdmin moves the first eligible member into a headless department:

1. LexFlow performs the existing mailbox-access verification.
2. If verification fails, neither membership nor department leadership changes.
3. If verification succeeds, LexFlow assigns the member to the department and sets `head_user_id` in the same transaction.
4. The member is exposed as `dep_admin` on subsequent authenticated requests.

### Replacement

Add an OrgAdmin-only operation equivalent to:

```text
PATCH /api/departments/:id/head
{ "memberId": 123 }
```

The candidate must:

- belong to the same organization;
- already belong to the target department;
- have a pending or active account;
- be a Member or the current DepAdmin, not an OrgAdmin or PlatformAdmin; and
- not already lead another department.

The replacement is atomic. The former head immediately becomes a normal member, retaining only access to email personally assigned to them. The new head immediately receives department-wide authority without another Microsoft login or Graph consent.

### Protected transitions

Moving, disabling, deleting, or promoting the current DepAdmin to OrgAdmin is blocked until an OrgAdmin selects a replacement from the same department. The API returns `409 DEPARTMENT_HEAD_REPLACEMENT_REQUIRED` without changing either user or department.

Promoting any regular member to OrgAdmin also removes department membership. Promotion is blocked while the member has open assigned email or is targeted by enabled rules, because the resulting OrgAdmin would be unable to view or complete that email work.

Deleting the entire department is the explicit exception. After confirmation, the department and its rules are removed, its members become unassigned, its head relationship ends, and historical email records are preserved without department-wide visibility.

## Email and rule ownership

### Data model

- Add nullable `emails.department_id` referencing `departments` with deletion preserving the email record.
- Add non-null `rules.department_id` referencing `departments`; deleting a department removes its rules.
- Enforce one case-insensitive shared mailbox per organization.
- Add database constraints or triggers, plus service-layer validation, so a department head belongs to the same organization and department.
- Add a uniqueness constraint ensuring a user heads at most one department.

### Import

Every active mail source is constructed from a department record. It stamps each imported message with that source department's ID. Clients cannot choose or override this value.

If a source no longer maps to an active department, synchronization skips the result and records a sanitized operational error. It must not import an unscoped message into a visible queue.

Changing a department's shared mailbox:

- preserves `department_id` on historical email;
- removes only the old mailbox cursor and sync-error keys;
- begins a fresh cursor for the new mailbox; and
- does not move historical email to another department.

### Rules

Rules belong to one department. Rule matching considers only rules whose `department_id` matches the imported email. A rule assignee must be an active user in that department and may be the DepAdmin.

Creating, updating, enabling, disabling, or deleting a rule requires the caller to be the current head of that rule's department. Cross-department IDs are hidden with `404` responses.

### Manual assignment and completion

A DepAdmin may assign or reassign an open department email to any active member of the same department, including themselves. Members and DepAdmins may complete only email assigned to their own user ID. Completed email remains locked against reassignment.

### Alerts, notifications, and activity

Department-level unassigned-overdue, assigned-overdue, and completion events are routed to the current DepAdmin instead of OrgAdmin. Assignees continue to receive their own assignment and overdue notifications. Email activity is stamped with the email's department and is visible only to that department's current DepAdmin. Replacing a department head changes future administrative recipients without copying another department's history or notifications.

## Authorization matrix

| Capability | PlatformAdmin | OrgAdmin | DepAdmin | Member |
| --- | --- | --- | --- | --- |
| Manage organizations | Yes | No | No | No |
| Manage organization profile | No | Yes | No | No |
| Configure Microsoft 365 | No | Yes | No | No |
| View sanitized connector health | No | Yes | No | No |
| Manage members and roles | No | Yes | No | No |
| Create/edit/delete departments | No | Yes | No | No |
| Select department heads | No | Yes | No | No |
| View any email content | No | No | Own department | Assigned to self |
| Manage automation rules | No | No | Own department | No |
| Assign/reassign email | No | No | Own department | No |
| Complete email | No | No | Assigned to self | Assigned to self |
| View email activity | No | No | Own department | No |
| View notifications | No | No | Own department and self | Self |

## Server-side confidentiality

Role checks alone are insufficient. Every email-related query and mutation must include both organization and department ownership where applicable.

### Bootstrap payloads

PlatformAdmin receives organization administration data only.

OrgAdmin receives:

- organization metadata;
- members and account state;
- departments, shared mailbox addresses, mailbox-access status, and current head;
- workspace response settings; and
- sanitized Microsoft 365 connection status.

OrgAdmin does not receive `emails`, `rules`, email `activity`, email `notifications`, message counts, sender data, subjects, previews, mailbox URLs, or sync results containing message-level information.

DepAdmin receives:

- email, rule, activity, and notification records for the department they currently lead;
- active same-department assignment candidates;
- department identity and shared mailbox metadata; and
- no organization/member/connector administration controls.

Member receives only email and notifications belonging to their own assignments, as today.

### API behavior

- OrgAdmin calls to email, rule, email-activity, or email-notification APIs return `403`.
- DepAdmin reads and writes always include `organization_id` and their current headed `department_id`.
- A valid resource ID from another department or organization returns `404`.
- A former DepAdmin loses department-wide access on their next request because effective role and head ownership are resolved from the database on every authenticated request.
- Error payloads never reveal another department's existence, mailbox address, message subject, sender, or assignee.

## Microsoft 365 connection

The current app-only client-credential architecture remains in place.

- OrgAdmin alone may connect, reconnect, or disconnect Microsoft 365.
- Tenant administrator consent remains organization-wide.
- Graph sources continue to be generated from active departments and their shared mailboxes.
- DepAdmins and Members never receive client credentials, access tokens, connection controls, or consent URLs.
- Connector health shown to OrgAdmin is limited to connection state, mailbox count, last success time, and sanitized failure text.
- Background synchronization is automatic. There is no user-facing organization-wide manual sync action that could disclose cross-department message counts.

Gmail remains outside this feature's primary path. Any connector that cannot provide an authoritative department mapping must keep its imported records quarantined rather than placing them in a visible department queue.

## UI design

The existing visual language, spacing, cards, navigation, and responsive behavior remain unchanged.

### OrgAdmin

OrgAdmin lands in workspace administration rather than an email queue. Navigation contains organization settings, Microsoft 365 connection, members, and departments only.

Each department card shows:

- department name;
- shared mailbox;
- mailbox-access status;
- current DepAdmin;
- member list and department selectors;
- a same-department head selector; and
- edit/remove actions.

The first assigned member is visibly labeled `DepAdmin`. Replacement-required errors appear inline beside the relevant member or department control.

### DepAdmin

DepAdmin uses the existing email dashboard constrained to one department. Navigation contains Inbox, Assigned, Completed, Automation Rules, Activity, and Notifications. The department name and shared mailbox are displayed as fixed context; there is no department switcher.

Assignment and rule assignee controls list only active members of the same department, including the DepAdmin. Connector, member, department, organization, and timing controls are absent.

### Member

Member navigation and assigned-work behavior remain unchanged. A former DepAdmin immediately falls back to this UI while preserving access to work assigned to them.

## Migration

Migration is transactional and idempotent.

1. Add department-head and department-ownership columns and indexes.
2. Clear department assignments from OrgAdmins.
3. For each department with eligible members, select the earliest-added pending or active member as head.
4. Map existing rules from their assignee's department.
5. Map existing email from normalized `mailbox_address` to a unique department shared mailbox.
6. For assigned legacy email without a mailbox mapping, fall back to the assignee's department.
7. Leave ambiguous unassigned legacy email with `department_id = NULL`; it is quarantined and invisible to DepAdmins and OrgAdmins.
8. Refuse startup if one organization has duplicate normalized shared mailboxes or an existing rule cannot be mapped safely.

No email, rule, member, or organization record is silently deleted during migration.

## Error handling

- `409 DEPARTMENT_HEAD_REPLACEMENT_REQUIRED`: a protected head transition was attempted.
- `409 DEPARTMENT_HEAD_CONFLICT`: the candidate already heads another department.
- `400 INVALID_INPUT` with a field error: the replacement is disabled, outside the department, or otherwise ineligible.
- `409 MAILBOX_IN_USE`: another department in the organization already uses that shared mailbox.
- `404 NOT_FOUND`: cross-department, cross-tenant, or nonexistent email/rule/member/department resource.
- `403 FORBIDDEN`: the caller's role cannot perform that category of operation.

All errors are rendered in the existing UI error surfaces and removed from callback URLs after display.

## Test strategy

### Data and migration

- First eligible department member becomes DepAdmin atomically.
- Existing populated departments receive the correct earliest eligible head.
- Existing rules and email map to the correct department.
- Ambiguous email remains quarantined.
- Duplicate shared mailbox and unmappable rule migrations fail safely.
- Migration is idempotent.

### Authorization

- OrgAdmin bootstrap and APIs contain no email-level data.
- OrgAdmin direct email/rule requests return `403`.
- DepAdmin can read and mutate only their department's email and rules.
- Cross-department IDs return `404` for reads and writes.
- Members still see and complete only their own work.
- PlatformAdmin receives no customer email data.

### Department-head lifecycle

- First-member promotion works only after mailbox-access verification.
- OrgAdmin can atomically replace a head with an eligible same-department member.
- Moving, disabling, deleting, or promoting the current head is blocked until replacement.
- Former head immediately loses department-wide access but retains personally assigned work.
- New head can assign to self and other active department members.
- Deleting a department unassigns members, removes rules, stops its mailbox source, and preserves historical email.

### Workflow and Graph

- Graph import stamps the source department ID.
- Rule matching never crosses departments.
- Manual assignment rejects out-of-department assignees.
- Completion and overdue notifications go to the relevant DepAdmin, never OrgAdmin.
- Mailbox changes preserve historical ownership and reset only the relevant cursor.
- Sanitized connector status contains no subjects, senders, previews, or department message counts.

### Browser smoke tests

- OrgAdmin sees only administration navigation and can configure Graph, manage departments, assign a first head, and replace a head.
- DepAdmin sees only their department email workflow and cannot access administration routes.
- Member sees only assigned work.
- Role replacement updates the former and new head experiences without another Microsoft consent flow.
- API errors appear in the UI rather than remaining in the URL.

## Acceptance criteria

- OrgAdmin cannot obtain any individual email content through bootstrap, documented routes, or guessed API requests.
- DepAdmin cannot obtain email, rule, activity, or notification data from another department.
- Every department with at least one non-disabled member has exactly one DepAdmin.
- A current DepAdmin cannot leave the role accidentally; OrgAdmin must select an eligible replacement first.
- The first eligible member assigned to an empty/headless department becomes DepAdmin automatically.
- DepAdmin can assign department email to themselves or other active department members and configure department rules.
- Graph remains organization-wide, app-only, and configured by OrgAdmin.
- Existing UI styling remains consistent, and the full automated suite plus role-based browser smoke tests pass.
