# LexFlow Email Assignment

A minimal email-intake app for rule-based and manual assignment, plus a read-only CFO finance command center. Admins manage routing, departments, response windows, and reassignments; members see only their work; CFO users receive an isolated operational-finance dashboard with deterministic demonstration data.

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

## Demo accounts

These credentials are for local demonstration only:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@lexflow.local` | `admin123` |
| Legal member | `maya@lexflow.local` | `welcome123` |
| Finance member | `priya@lexflow.local` | `welcome123` |
| CFO | `cfo@lexflow.local` | `welcome123` |

The CFO account opens directly into a finance-only workspace. Its figures are sample data attributed to AR Revenue, AP, Tax, and Invoicing; they are not imported from the connected mailboxes.

## Microsoft Outlook connection

1. Register an application in Microsoft Entra ID.
2. Add the Microsoft Graph **application** permissions `Mail.Read`, `MailboxSettings.Read`, and `Calendars.ReadBasic`, then grant admin consent.
3. Restrict the application to the intended organizational mailboxes with an Exchange application-access policy. Vacation Mode reads automatic-reply settings and basic default-calendar metadata only; it never reads meeting descriptions, attachments, transcripts, or attendee lists.
4. Copy `.env.example` to `.env` and set all four values:

```dotenv
GRAPH_TENANT_ID=your-tenant-id
GRAPH_CLIENT_ID=your-client-id
GRAPH_CLIENT_SECRET=your-client-secret
GRAPH_MAILBOX=shared-mailbox@example.com
BOOTSTRAP_ADMIN_PASSWORD=choose-a-strong-admin-password
BOOTSTRAP_MAYA_PASSWORD=choose-a-strong-member-password
BOOTSTRAP_PRIYA_PASSWORD=choose-another-strong-member-password
BOOTSTRAP_CFO_PASSWORD=choose-a-strong-cfo-password
```

The four local account passwords are required whenever a live mail connector is configured and replace any earlier demo passwords, so a connected instance never retains the documented defaults. Outlook is enabled only when every Graph value is present. For an HTTPS deployment, also set `NODE_ENV=production` so session cookies use the `Secure` flag. Keep `.env` and client secrets out of version control.

Vacation Mode polls Microsoft 365 every five minutes by default (`VACATION_SYNC_INTERVAL_SECONDS=300`). An administrator maps each member to a Microsoft principal in Workspace settings. Active Outlook OOO periods pause rule-based assignment to that member, retain the intended work in an admin-visible hold, and generate one deterministic in-app return briefing when the member becomes available again. Members change OOO settings in Outlook; Lex Flow is read-only against the provider.

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
BOOTSTRAP_ADMIN_PASSWORD=choose-a-strong-admin-password
BOOTSTRAP_MAYA_PASSWORD=choose-a-strong-member-password
BOOTSTRAP_PRIYA_PASSWORD=choose-another-strong-member-password
BOOTSTRAP_CFO_PASSWORD=choose-a-strong-cfo-password
```

Restart LexFlow, sign in as an admin, open **Settings → Email connections**, and select **Connect Gmail**. LexFlow requests read-only Gmail access, encrypts the refresh token in SQLite, and uses it only for background Inbox sync. Disconnecting makes a bounded attempt to revoke Google access, then removes the local connection and Gmail cursor; it does not delete imported work items.

## Rule behavior

- Only admins can create, enable, disable, or delete rules and trigger a manual sync.
- Enabled rules are evaluated by ascending numeric priority; the first match wins. Equal priorities use creation order.
- Comma-separated keywords are case-insensitive and must all appear across the email subject and preview.
- The optional sender filter is a case-insensitive substring match against the sender name and address.
- Creating or enabling a rule also checks currently unassigned email. Disabling or deleting a rule does not alter existing assignments.
- Admins can also assign or reassign any open email from its detail drawer. Completed email is locked.
- An assignment creates an in-app notification for the member and an activity entry for the admin. Members see only their assigned email and can mark it complete.
- Completion creates one activity entry and retires every notification tied to that email.
- Admins can add departments, move members between them, and edit the two workspace-wide response windows in **Settings**.
- Unassigned alerts notify admins based on the provider's received time. Assigned-but-incomplete alerts notify both admins and the assignee from the latest assignment time. Overdue alerts repeat once per hour until the email is assigned, reassigned, or completed as applicable.

## Verification

Run the intentionally small suite:

```bash
npm test
```

The suite contains automated contract tests covering migrations, Gmail and Outlook imports, OAuth safety, rule and manual assignment, reassignment, isolation, admin-only controls, CFO finance access, finance-period contracts, departments, response windows, completion notifications, hourly overdue alerts, idempotency, and the one-minute sync default.

For a browser smoke check, sign in as the admin, open an unassigned message and assign it, then sign in as its assignee. Confirm the notification and completion control. Return to the admin account to confirm the completion notification and activity entry. Admin settings should also expose department placement and both alert windows.

## Production limitations

This MVP uses one local Express process, SQLite, local password accounts, polling, and at most one mailbox per provider. It does not include webhooks, a distributed job queue, centralized identity/SSO, user administration, password recovery, attachments, full email bodies, outbound replies, AI classification, or multiple accounts from the same provider. Deployment still requires normal production controls such as TLS, secret management, database backups, monitoring, Google OAuth verification where applicable, and tenant-level mailbox access restrictions.
