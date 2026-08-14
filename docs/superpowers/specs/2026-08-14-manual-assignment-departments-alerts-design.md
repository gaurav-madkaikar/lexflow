# Manual Assignment, Departments, and Timed Alerts Design

## Goal

Extend the existing LexFlow Outlook assignment app with admin-controlled manual assignment, lightweight department management, and durable in-app operational alerts. Keep the current visual language and single-process Express/SQLite architecture.

## Scope

This change includes:

- Manual assignment of an unassigned email by an admin.
- Reassignment of an open assigned email by an admin.
- Admin creation of departments and movement of existing members between them.
- Workspace-wide, admin-editable `time_unassigned` and `time_assigned_unmarked` limits, stored as whole hours.
- Admin notifications when members complete emails.
- Hourly repeated notifications for overdue unassigned and assigned emails.
- A one-minute default Outlook sync interval.

Completed email reassignment, department rename/delete, user creation, outbound email, and external notification channels remain out of scope.

## Architecture and persistence

Continue using the existing Node.js application, SQLite database, static frontend, and in-process timers. Add narrowly scoped workflow functions for assignment, department changes, settings updates, and alert evaluation so HTTP handlers and timers do not contain domain logic.

Persist:

- A department catalog containing a case-insensitively unique name and creation time. Existing user department values populate the catalog during migration.
- A singleton workspace settings record with `time_unassigned_hours` defaulting to `1` and `time_assigned_unmarked_hours` defaulting to `24`.
- `assigned_at` on emails. Automation assignment and manual assignment both set it; reassignment resets it. Existing assigned records use their local creation time as a safe migration fallback.
- Notification kinds for assignment, completion, unassigned overdue, and assigned overdue.
- Per-email, per-recipient alert state recording the last delivery time for each overdue kind. This prevents duplicate alerts inside an hour while allowing another alert after an hour.

Migrations preserve existing users, emails, rules, notifications, and activity. They must be safe to run more than once.

## Assignment and reassignment

The admin opens an email from Inbox or Assigned and selects a member in the existing detail panel.

The server performs the change transactionally:

1. Verify the caller is an admin, the email is not completed, and the target is a member.
2. Record the previous assignee, if any.
3. Set status to `assigned`, set the new assignee, and set `assigned_at` to the current time.
4. Remove obsolete assignment notifications and overdue alert state belonging to a previous assignee.
5. Create an unread assignment notification for the new assignee.
6. Add an activity event naming the admin, previous assignee when applicable, and new assignee.

Assigning to the current assignee is an idempotent no-op. A member who loses an assignment can no longer fetch or complete that email. Completed emails are immutable.

Automation assignments use the same core assignment operation, with the matching rule as context and no admin actor. This keeps notification and timestamp behavior consistent.

## Departments and workspace settings

Add an admin-only Settings view with two compact sections:

- **Workflow timing:** whole-hour numeric fields for `time_unassigned` and `time_assigned_unmarked`, with values from 1 to 8,760 hours.
- **Departments and team:** an add-department form and a team list whose member department selectors update immediately.

Department names are trimmed, required, limited to 60 characters, and unique without regard to case. Only members can be moved; the admin's Operations label remains unchanged. Rename and delete controls are intentionally omitted.

The sidebar and queue department filters are generated from the persisted catalog rather than hard-coded Legal and Finance values. New empty departments therefore appear immediately and become useful as soon as a member is moved into them.

All department and settings endpoints enforce the admin role on the server and return concise validation errors for invalid or duplicate values.

## Notification behavior

All notifications remain in-app and appear through the existing notification bell and Notifications view. Each notification belongs to one user and can be marked read only by that user.

### Completion

When a member completes their assigned email, the existing status update and activity event remain transactional. The same transaction creates one unread completion notification for every admin. Retrying completion cannot duplicate activity or notifications.

### Unassigned overdue

An email becomes overdue when it remains `unassigned` beyond `received_at + time_unassigned`. Its age therefore begins at the Outlook received time, not at local import time. Every admin receives an unread alert when the threshold is detected.

### Assigned overdue

An email becomes overdue when it remains `assigned` beyond `assigned_at + time_assigned_unmarked`. Every admin and the current assignee receive an unread alert. Reassignment starts a new assigned window for the new assignee.

### Repetition and resolution

A background sweep runs once per minute and evaluates both overdue conditions. While a condition remains true, each eligible recipient receives another alert no sooner than one hour after their previous alert for that email and condition.

Assignment stops unassigned alerts. Completion stops assigned alerts. Reassignment removes the former assignee's alert state and resets the assigned clock. If the server was stopped for several hours, the first sweep creates one current alert per recipient instead of backfilling every missed hour.

Changing a workspace limit takes effect on the next sweep. Alert creation and its delivery-state update occur in one transaction.

## Runtime and API boundaries

Change the default `SYNC_INTERVAL_SECONDS` from 300 to 60. Manual sync remains available. Mail sync and overdue evaluation remain separate operations so an Outlook failure cannot prevent alerts for already-imported emails.

Add authenticated endpoints for:

- Admin assignment/reassignment of one email.
- Admin creation of a department.
- Admin movement of one member to a department.
- Admin update of workspace timing settings.

The existing bootstrap response supplies admins with departments, team membership, settings, notifications, email state, and activity. Members continue receiving only their own emails and notifications.

## Interface

Preserve the reference template and current responsive behavior.

- In an open, non-completed email detail panel, admins see a member selector and an **Assign** or **Reassign** button. The existing read-only assignee display remains for members and completed items.
- Admin navigation gains one **Settings** item using the same compact panel and form styles already used by Automation Rules.
- Department filter buttons and the sidebar selector are rendered from bootstrap data.
- Admins see their unread count in the existing notification bell and can open the Notifications view exactly as members do.
- Mutation buttons show a pending state, prevent double submission, report field/API errors, close or refresh on success, and keep focus behavior accessible.

No bulk assignment or row-level assignment controls are added.

## Error and concurrency handling

- Unauthenticated requests return `401`; non-admin management requests return `403`.
- Missing email, member, or department records return `404`.
- Completed-email assignment and stale conflicting state return `409`.
- Invalid timing values and department names return `400` with field-safe messages.
- Assignment, completion, notification creation, activity creation, and alert-state changes use transactions.
- The alert sweep cannot overlap itself. A failure is logged without stopping mailbox sync or future sweeps.
- Client polling refreshes notification counts but never substitutes for server-side authorization or scheduling.

## Verification

Keep tests focused on domain and API behavior:

1. Admin manual assignment and reassignment update visibility, timestamps, notifications, and activity; members cannot assign.
2. Completed emails cannot be reassigned.
3. Admin can add a unique department, move a member, and update valid workspace limits; members cannot perform these actions.
4. Member completion creates one admin notification and remains idempotent.
5. Unassigned overdue alerts use Outlook received time, repeat after one hour, stop after assignment, and do not duplicate within an hour.
6. Assigned overdue alerts reach all admins and the current assignee, reset on reassignment, repeat after one hour, and stop on completion.
7. Existing rule matching, import idempotency, cross-user isolation, and admin-only sync/rule behavior continue to pass.

Perform a browser smoke check at desktop and mobile widths for assignment, reassignment, dynamic department filters, settings validation, admin completion notifications, and notification read state.

## Success criteria

An admin can correct assignment mistakes, create useful department groupings, configure both response windows, and see completion and overdue work through the existing interface. Members continue to see only their current work, receive new and overdue assignment alerts, and complete their work. Timed alerts run durably and at most hourly per email, condition, and recipient without adding an external queue or redundant services.
