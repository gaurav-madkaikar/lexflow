# Outlook Assignment App Design

## Goal

Build a minimal web app, visually based on `lexflow_legal_finance_preview.html`, that imports messages from one shared Outlook mailbox, assigns them by admin-owned automation rules, limits members to their own work, records completion, and creates in-app notifications.

## Scope

The first version includes:

- Local email/password sign-in with seeded admin and member accounts.
- Server-enforced `admin` and `member` authorization.
- A local mock mailbox that works without external credentials.
- An optional Microsoft Graph mailbox adapter selected by environment configuration.
- Manual sync plus a lightweight in-process sync interval.
- Ordered automation rules that only admins can create, enable, disable, or delete.
- Admin access to all imported, assigned, and completed emails.
- Member access only to emails assigned to that member.
- Member completion of assigned email work.
- Durable in-app assignment notifications and an admin-visible activity feed.

The first version excludes attachments, outbound replies, full email-body storage, AI classification, webhooks, websocket updates, user administration, password recovery, and multi-mailbox support.

## Architecture

Use one Node.js application with Express, SQLite, and a static HTML/CSS/JavaScript frontend. Keep the existing template's visual language and replace its hard-coded data and inert controls with API-backed views. Do not introduce a frontend framework, job queue, or separate services.

A small `MailSource` boundary exposes the same sync operation for two implementations:

- `MockMailSource` supplies deterministic local demo messages.
- `GraphMailSource` obtains an app-only token and reads one configured mailbox with the Microsoft Graph delta API.

SQLite is the single source of truth for users, sessions, emails, rules, notifications, activity, and the Graph delta cursor.

## Roles and access

### Admin

- Sees all emails and their current assignee and status.
- Runs mailbox sync and sees its success or failure.
- Creates, enables, disables, and deletes automation rules.
- Sees completion events in recent activity.
- Sees unmatched emails so rules can be adjusted.

### Member

- Sees only emails assigned to their own user ID.
- Opens message metadata and preview.
- Marks their own assigned email complete.
- Sees and marks their own assignment notifications read.

Every API endpoint checks the authenticated user and applicable role or ownership. Client-side visibility is only presentation, never authorization.

## Assignment rules

Each rule contains a name, ordered priority, one or more comma-separated keywords, an optional sender substring, an assignee, and an enabled flag.

Matching is deterministic:

1. Evaluate enabled rules in ascending priority order.
2. Compare case-insensitively.
3. Require every keyword to appear in the combined subject and preview.
4. If a sender filter is present, require it to appear in the sender address or name.
5. Assign using the first matching rule.
6. Leave the email unassigned if no rule matches.

Rules run when a message is first imported and when an admin creates or enables a rule, allowing newly matching unassigned messages to be routed. Existing assignments are not silently changed.

## Core data flow

### Sync

1. The admin triggers sync or the configured interval fires.
2. The active mail source returns messages and its next cursor.
3. Messages are upserted by provider message ID, making retries idempotent.
4. Each new unassigned message is evaluated against the rule list.
5. A successful assignment creates a member notification and an activity entry in the same transaction.
6. The cursor and last successful sync time are saved only after the import succeeds.

### Completion

1. A member requests completion for an assigned email.
2. The server verifies that the email is assigned to that member and is not already complete.
3. The server records completed status, user ID, and timestamp with an activity entry in one transaction.
4. The item moves to the member's Completed view and immediately appears in admin activity.

## Interface

Retain the reference template's white sidebar, soft-gray workspace, compact typography, rounded cards, metric tiles, department switch, work queue, rules panel, and activity feed.

- The sign-in view uses the same LexFlow brand and restrained card styling.
- Admin navigation contains Inbox, Assigned, Completed, Automation Rules, and Activity.
- Member navigation contains My Work, Completed, and Notifications.
- The header retains search, notification, and account controls; Sync is admin-only.
- Email details open in an accessible side panel rather than an alert.
- Rule creation uses a compact modal or inline form consistent with the template.
- The current mode is labeled `Demo mailbox` or `Outlook connected`.
- Mobile layouts replace the hidden sidebar with a usable navigation toggle.

Outlook-provided strings are inserted as text rather than raw HTML. Controls have labels, keyboard focus styles, and status announcements.

## Error handling

- Missing Graph configuration selects demo mode and labels it clearly.
- Graph authentication, throttling, and network failures return a concise admin-visible error without altering the last good cursor or existing messages.
- Invalid rule or login input returns field-level validation errors.
- Unauthorized and cross-user requests return `403`; unauthenticated requests return `401`.
- Duplicate sync and duplicate completion requests are safe and do not duplicate notifications or activity.

## Minimal verification

Use Node's built-in test runner for five focused service/API tests:

1. First matching enabled rule assigns a new message and creates one notification.
2. Re-importing the same provider message does not duplicate the email or notification.
3. A member cannot read or complete another member's email.
4. A non-admin cannot mutate automation rules or trigger sync.
5. Completing assigned work records the member and timestamp in admin-visible activity.

Perform one manual browser smoke check for admin login, member login, responsive navigation, sync, rule creation, notification reading, and completion.

## Success criteria

The app runs locally without Microsoft credentials, demonstrates the complete assignment workflow with seeded data, can switch to a configured Graph mailbox without changing domain logic, follows the supplied template closely, and contains only code required by the approved scope.
