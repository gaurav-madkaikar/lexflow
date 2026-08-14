# LexFlow Outlook Assignment

A minimal Outlook intake app for rule-based and manual email assignment. Admins manage routing, departments, response windows, and reassignments; members see only their work, receive assignment and overdue notifications, and can mark email complete. It runs with built-in demo mail by default and can connect to one Microsoft 365 mailbox through Microsoft Graph.

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
- Admins can also assign or reassign any open email from its detail drawer. Completed email is locked.
- An assignment creates an in-app notification for the member and an activity entry for the admin. Members see only their assigned email and can mark it complete.
- Completion creates an activity entry and notifies every admin, once per email.
- Admins can add departments, move members between them, and edit the two workspace-wide response windows in **Settings**.
- Unassigned alerts notify admins based on the email's Outlook received time. Assigned-but-incomplete alerts notify both admins and the assignee from the latest assignment time. Overdue alerts repeat once per hour until the email is assigned, reassigned, or completed as applicable.

## Verification

Run the intentionally small suite:

```bash
npm test
```

The suite currently contains 13 automated contract tests covering migrations, rule and manual assignment, reassignment, isolation, admin-only controls, departments, response windows, completion notifications, hourly overdue alerts, idempotent imports, and the one-minute sync default.

For a browser smoke check, sign in as the admin, open an unassigned message and assign it, then sign in as its assignee. Confirm the notification and completion control. Return to the admin account to confirm the completion notification and activity entry. Admin settings should also expose department placement and both alert windows.

## Production limitations

This MVP uses one local Express process, SQLite, local password accounts, polling, and a single mailbox. It does not include webhooks, a distributed job queue, centralized identity/SSO, user administration, password recovery, attachments, full email bodies, outbound replies, AI classification, or multi-mailbox support. Graph delta-cursor recovery is manual, and deployment still requires normal production controls such as TLS, secret management, database backups, monitoring, and tenant-level mailbox access restrictions.
