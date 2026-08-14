# LexFlow Outlook Assignment

A minimal Outlook intake app that assigns messages to team members using admin-managed rules. It runs with built-in demo mail by default and can connect to one Microsoft 365 mailbox through Microsoft Graph.

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

`SYNC_INTERVAL_SECONDS=0` disables automatic sync; any enabled interval must be at least 60 seconds.

## Demo accounts

These credentials are for local demonstration only:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@lexflow.local` | `admin123` |
| Legal member | `maya@lexflow.local` | `welcome123` |
| Finance member | `priya@lexflow.local` | `welcome123` |

## Microsoft Graph connection

1. Register an application in Microsoft Entra ID.
2. Add the Microsoft Graph **application** permission `Mail.Read` and grant admin consent.
3. Restrict application access to the intended mailbox with an appropriate tenant policy.
4. Copy `.env.example` to `.env` and set all four values:

```dotenv
GRAPH_TENANT_ID=your-tenant-id
GRAPH_CLIENT_ID=your-client-id
GRAPH_CLIENT_SECRET=your-client-secret
GRAPH_MAILBOX=shared-mailbox@example.com
BOOTSTRAP_ADMIN_PASSWORD=choose-a-strong-admin-password
BOOTSTRAP_MAYA_PASSWORD=choose-a-strong-member-password
BOOTSTRAP_PRIYA_PASSWORD=choose-another-strong-member-password
```

The three local account passwords are required whenever Graph mode starts and replace any earlier demo passwords, so a connected instance never retains the documented defaults. Graph mode is enabled only when every Graph value is present, while partial configuration remains in demo mode. For an HTTPS deployment, also set `NODE_ENV=production` so session cookies use the `Secure` flag. Keep `.env` and client secrets out of version control.

## Rule behavior

- Only admins can create, enable, disable, or delete rules and trigger a manual sync.
- Enabled rules are evaluated by ascending numeric priority; the first match wins. Equal priorities use creation order.
- Comma-separated keywords are case-insensitive and must all appear across the email subject and preview.
- The optional sender filter is a case-insensitive substring match against the sender name and address.
- Creating or enabling a rule also checks currently unassigned email. Disabling or deleting a rule does not alter existing assignments.
- An assignment creates an in-app notification for the member and an activity entry for the admin. Members see only their assigned email and can mark it complete; the admin activity records who completed it and when.

## Verification

Run the intentionally small suite:

```bash
npm test
```

It contains exactly five automated contract tests covering rule assignment and notification, idempotent imports, cross-user isolation, admin-only rule and sync changes, and completion activity. The expected result is `5` passing and `0` failing.

For a browser smoke check, sign in as the admin, sync demo mail, create a rule for an unassigned message, then sign in as its assignee. Confirm the assignment notification, complete the message, and return to the admin account to confirm the completion actor and timestamp in activity.

## Production limitations

This MVP uses one local Express process, SQLite, local password accounts, polling, and a single mailbox. It does not include webhooks, a distributed job queue, centralized identity/SSO, user administration, password recovery, attachments, full email bodies, outbound replies, AI classification, or multi-mailbox support. Graph delta-cursor recovery is manual, and deployment still requires normal production controls such as TLS, secret management, database backups, monitoring, and tenant-level mailbox access restrictions.
