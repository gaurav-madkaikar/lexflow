# LexFlow Email Assignment

A minimal, organization-scoped email-intake app for rule-based and manual assignment. Administrators connect an organization Gmail or Outlook mailbox, manage routing, departments, response windows, and reassignments. Members see only conversations currently assigned to them, receive assignment and overdue notifications, and can complete grouped conversations. Built-in demo mail remains available for local testing.

## Requirements

- Node.js 22.13 or newer
- npm

## Run locally

```bash
npm install
npm start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Without complete Microsoft Graph settings, the app clearly runs in demo mode. Runtime data is stored in `data/lexflow.db`.

To change the port, database path, or automatic sync interval, copy the example configuration before starting:

```bash
cp .env.example .env
```

Automatic sync runs once per minute by default. `SYNC_INTERVAL_SECONDS=0` disables it; any enabled interval must be at least 60 seconds.

Each organization retains its latest 500 actionable Inbox messages across its administrator-connected mailboxes, ordered by the provider's received time. Every successful sync reapplies this limit, so older messages are ignored or removed without changing rules, departments, response windows, or saved conversation ownership. Provider Sent messages are fetched only when an authorized user opens a conversation and never consume this limit.

## Organization enrollment

Select **Create or join a workspace** on the sign-in screen, then choose one of these paths:

- **Admin** — enter the organization name, descriptive domain, and a PNG, JPEG, or WebP logo, then create the required admin account. LexFlow signs the admin in immediately and shows the organization handle and join code in **Settings → Organization profile**.
- **User** — enter the email address that should receive assignment notices, choose Gmail or Outlook when the provider cannot be determined from the address, find the organization by handle or join code, and submit a membership request. The account does not exist until an administrator approves that request and the user completes the one-time invitation.

Administrators review requests in **Settings → Membership requests**. Approval creates a single-use registration link that expires after 24 hours; share it securely with the requester. Approved requests remain visible after refresh. If the link is lost or expires, **Create new invite** replaces it and immediately invalidates the previous link. The link locks the approved email address and provider, while the user supplies their name and a password of at least 10 characters. Rejected, expired, completed, or reused invitations cannot create an account.

Organization domains are descriptive during this local phase and are not proof of ownership. Organization handles and join codes are the authoritative lookup values. Every rule, email, department, setting, notification, activity entry, mailbox connection, delivery, and membership action is isolated to the signed-in organization. The **User** role maps to the internal `member` role: users cannot manage rules or connect/synchronize a mailbox and see only work currently assigned to them. The Gmail/Outlook choice recorded during member registration identifies where an assignment notice should be found; it does not connect or ingest that member's private Inbox.

## Demo accounts

These credentials are for local demonstration only:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@lexflow.local` | `admin123` |
| Legal member | `maya@lexflow.local` | `welcome123` |
| Finance member | `priya@lexflow.local` | `welcome123` |

LexFlow creates these accounts only when the database has no users, the app is in demo mode, and `NODE_ENV` is not `production`. Configuring Gmail or Outlook disables local-account seeding. Normal demo restarts never rewrite password hashes or delete sessions, so the local credentials stay unchanged between prompts and restarts.

Demo mode is disabled when `NODE_ENV=production`. A production startup with Gmail or Outlook also fails closed if any documented local account still has its documented password, even when the database contains other users. Explicitly rotate or remove every such credential before production startup; changing only the user count does not bypass this guard. The local reset command below deliberately restores the public demo passwords and is therefore for local testing only.

If an existing local database has different credentials, stop LexFlow, back up `data/lexflow.db`, and run this explicit one-time reset:

```bash
npm run reset-local-credentials
```

The command resets only the three accounts above to the documented passwords and invalidates all active login sessions. It leaves email, rules, assignments, departments, and workspace settings unchanged. Start LexFlow again and sign in with the credentials in the table. Do not use these fixed local-testing accounts for a production deployment.

At server startup LexFlow applies a `0077` process umask, restricts the SQLite data directory to `0700`, and restricts the database, WAL, shared-memory, and `lexflow-before-*.db` backup artifacts to `0600`. Existing artifacts are repaired before use, and migration backups are restricted immediately after creation.

## Microsoft Outlook connection

### Recommended delegated OAuth setup

1. Register a Web application in Microsoft Entra ID.
2. Add delegated Microsoft Graph permissions `User.Read`, `Mail.Read`, `Mail.Send`, and `offline_access`, then configure the consent appropriate for your tenant. `User.Read` is used only to confirm the connected mailbox identity.
3. Add this exact local redirect URI:

```text
http://127.0.0.1:3000/api/integrations/outlook/callback
```

4. Configure the application and the shared 32-byte encryption key:

```dotenv
APP_BASE_URL=http://127.0.0.1:3000
OUTLOOK_TENANT_ID=your-tenant-id
OUTLOOK_CLIENT_ID=your-client-id
OUTLOOK_CLIENT_SECRET=your-client-secret
TOKEN_ENCRYPTION_KEY=the-generated-base64-key
```

Restart LexFlow, sign in as an organization admin, and choose **Settings → Email connections → Connect Outlook**. LexFlow confirms the mailbox identity before storing the encrypted refresh grant. Read consent powers Inbox sync and the on-demand conversation preview; send consent powers assignment notices.

### Legacy read-only application setup

1. Register an application in Microsoft Entra ID.
2. Add the Microsoft Graph **application** permission `Mail.Read` and grant admin consent.
3. Restrict application access to the intended mailbox with an appropriate tenant policy.
4. Copy `.env.example` to `.env` and set all four values:

```dotenv
GRAPH_TENANT_ID=your-tenant-id
GRAPH_CLIENT_ID=your-client-id
GRAPH_CLIENT_SECRET=your-client-secret
GRAPH_MAILBOX=shared-mailbox@example.com
```

Legacy Outlook is enabled only when every `GRAPH_*` value is present. It remains server-managed and read-only, so assignment delivery is shown as blocked until delegated `Mail.Send` consent is configured. Connecting Outlook does not change local account credentials. An HTTPS `APP_BASE_URL` automatically enables `Secure` session cookies. Keep `.env` and client secrets out of version control.

## Gmail connection

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/) and enable the Gmail API.
2. Configure the OAuth consent screen. For a local test, add the Gmail account as a test user.
3. Create an OAuth client with application type **Web application**.
4. Add this exact authorized redirect URI for the default local server:

```text
http://127.0.0.1:3000/api/integrations/gmail/callback
```

5. Generate a 32-byte encryption key and configure the Google client:

```bash
openssl rand -base64 32
```

```dotenv
APP_BASE_URL=http://127.0.0.1:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
TOKEN_ENCRYPTION_KEY=the-generated-base64-key
```

Restart LexFlow, sign in as an organization admin, open **Settings → Email connections**, and select **Connect Gmail**. LexFlow requests `openid`, `email`, `gmail.readonly`, and `gmail.send`; it verifies Google's immutable account subject against the Gmail profile, encrypts the refresh grant in SQLite, and never changes local credentials or active sessions. Read consent powers Inbox sync and the on-demand conversation preview; send consent powers assignment notices. Disconnecting makes a bounded attempt to revoke Google access, then removes the local connection and Gmail cursor; it does not delete retained work items. A legacy email-keyed Gmail connection must be explicitly disconnected before it can be upgraded to verified identity.

Google may require OAuth verification for these Gmail scopes in a public deployment. While an External consent screen is in **Testing**, Google refresh grants can expire and require **Reconnect Gmail**.

## Rule behavior

- Only admins can create, enable, disable, or delete rules and trigger a manual sync.
- Enabled rules are evaluated by ascending numeric priority; the first match wins. Equal priorities use creation order.
- Comma-separated keywords are case-insensitive and must all appear across the email subject and preview.
- The optional sender filter is a case-insensitive substring match against the sender name and address.
- Creating or enabling a rule also checks currently unassigned email. Disabling or deleting a rule does not alter existing assignments.
- Admins can assign or reassign an open conversation from any open message's detail drawer. Every open message in that conversation moves together; completed history remains locked.
- Messages with the same normalized subject are displayed as one collapsible conversation within a mailbox. Repeated `Re:`, `Fw:`, and `Fwd:` prefixes, case, Unicode width, and extra whitespace do not create a second conversation.
- The first matching message establishes the conversation owner. Later replies return to that member before rules are evaluated, including when the previous messages were completed. A manual reassignment changes the saved owner used for future replies.
- An assignment or reopened conversation creates an in-app notification for the member and an activity entry for the admin. Members see only messages assigned to them.
- The first assignment to a member also queues one lightweight email notice from the connected admin mailbox. It contains bounded previews and a secure LexFlow conversation link; it does not forward attachments or grant access to the admin's mailbox. Reassignment cancels an unsent notice for the former member and creates the appropriate notice for the current member.
- LexFlow records provider acceptance separately from delivery to the recipient's Inbox. A known pre-acceptance failure can retry safely. An unknown result is never retried automatically; an admin must explicitly acknowledge the duplicate-send risk.
- Expanding a conversation or opening its drawer loads at most the latest 100 formatted `Received`/`Sent` previews on demand, capped at 320 characters each and cached for 30 seconds. Sent context does not reopen work, create alerts, or count toward retention. Provider HTML is never rendered.
- Only an organization admin or the conversation's current assignee can load live provider history. Reassignment immediately removes the former member's access. Original admin-mailbox web links remain admin-only; members receive a provider search link only after their assignment notice exists.
- Completing any open message completes the member's currently assigned messages in that conversation, creates one activity entry, and notifies every admin once. A later reply reopens the conversation as a new assignment.
- Admins can add departments, move members between them, and edit the two workspace-wide response windows in **Settings**.
- Unassigned alerts notify admins based on the provider's received time. Assigned-but-incomplete alerts notify both admins and the assignee from the latest assignment time. Only the newest message in a conversation is evaluated, and overdue alerts repeat once per hour until it is assigned, reassigned, or completed as applicable.

## Verification

Run the automated suite:

```bash
npm test
```

The suite contains automated contract tests covering verified tenant migration backups, organization registration, membership approvals and single-use invitations, Gmail and Outlook import/send/history adapters, OAuth safety, canonical conversation grouping, verified assignment-reply correlation, delivery idempotency and recovery, on-demand history authorization, rule and manual assignment, reopened replies, per-organization retention, tenant isolation, admin-only controls, departments, response windows, completion notifications, hourly overdue alerts, stable local credentials, and the one-minute sync default.

For a browser smoke check, sign in as the admin, open an unassigned message and assign it, then sign in as its assignee. Confirm the notification and completion control. Return to the admin account to confirm the completion notification and activity entry. Admin settings should also expose department placement and both alert windows.

## Production limitations

This MVP uses one local Express process, SQLite, password-based enrollment, polling, a 500-message organization retention limit, and at most one admin mailbox per provider per organization. It does not yet include domain verification, SSO, password recovery, webhooks, a distributed job queue, attachments, composing replies from LexFlow, guaranteed provider delivery receipts, AI classification, or multiple accounts from the same provider. Deployment still requires TLS, secret management, database backups, monitoring, provider OAuth verification, and tenant-level mailbox access controls.
