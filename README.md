# LexFlow Email Assignment

LexFlow routes Microsoft 365 shared-mailbox messages to organization members. Access is provided by Microsoft Entra ID; local passwords and bootstrap accounts are not supported. The data model is tenant-aware even when the first deployment has only one active customer organization.

## Requirements

- Node.js 22.13 or newer
- npm
- A Microsoft Entra application configured for organizational accounts

## Entra ID setup

1. Register a web application in Microsoft Entra ID for organizational accounts in any directory.
2. Open **Entra ID → App registrations → All applications → LexFlow → Authentication**. Under **Platform configurations**, choose **Add a platform → Web** and add `${APP_BASE_URL}/api/auth/outlook/callback` and `${APP_BASE_URL}/api/integrations/outlook/callback`, then save. Redirect URIs are configured on the app registration, not the Enterprise application.
3. Create an application role named `PlatformAdmin` and assign it to the developers who maintain LexFlow.
4. Record the application client ID and client secret.
5. Start LexFlow with `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`, and `APP_BASE_URL` configured.
6. A PlatformAdmin signs in, creates the customer organization, and supplies its authoritative Entra tenant ID, approved domain, and initial OrgAdmin email. Entra binds the verified object ID on first sign-in.

The server validates the signed ID token through `@azure/msal-node`, checks the tenant ID and issuer/audience through MSAL, requires an approved organization domain, and uses the verified `PlatformAdmin` role claim for platform access. Organization members must be pre-provisioned by an OrgAdmin before their first sign-in. A pending member is activated and bound to the verified Entra object ID on first login.

With `APP_BASE_URL=http://localhost:3000`, the two exact local Web redirect URIs are:

```text
http://localhost:3000/api/auth/outlook/callback
http://localhost:3000/api/integrations/outlook/callback
```

## Run locally

The repository includes a `data/lexflow-local-workflow.db` snapshot for reproducing the current local workflow on another machine. Set `DATABASE_PATH=data/lexflow-local-workflow.db` in the local `.env` (the example file already uses this path), then provide that machine's Entra application configuration. The snapshot contains workflow and mailbox-derived data; do not use it for production or share it outside the intended repository access.

```bash
npm install
cp .env.example .env
npm start
```

Open the URL configured by `APP_BASE_URL` (default `http://localhost:3000`). The application refuses startup when Entra client credentials are absent or when a database still contains local accounts. It never silently deletes or maps those accounts.

For a database containing only the three known demo accounts, the explicit one-time reset path is:

```bash
npm run reset-local-data -- data/lexflow.db --confirm-reset-local-data
```

The command refuses any database that is not the known local demo workspace. Back up the database first.

## Configuration

Copy `.env.example` and set the Entra values:

```dotenv
APP_BASE_URL=https://lexflow.example.com
ENTRA_CLIENT_ID=your-entra-application-client-id
ENTRA_CLIENT_SECRET=your-entra-client-secret
ENTRA_AUTHORITY=https://login.microsoftonline.com/organizations
```

Microsoft 365 shared-mailbox access uses the same multitenant Entra application as sign-in. Add this Web redirect URI to the app registration:

```dotenv
https://lexflow.example.com/api/integrations/outlook/callback
```

An OrgAdmin connects their organization once from Settings and a Microsoft 365 tenant administrator grants consent. LexFlow stores only the tenant connection status; it uses short-lived client-credential tokens and does not store per-member Microsoft credentials or refresh tokens. Every department shared mailbox becomes an organization-scoped sync source.

Use Exchange Online Application RBAC to assign the `Application Mail.Read` role to the tenant's LexFlow service principal with a resource scope containing only the approved shared mailboxes. Do not also grant the unscoped Microsoft Graph `Mail.Read` application permission in Entra: Entra grants and Exchange App RBAC grants are additive, which would otherwise make every mailbox readable. Exchange RBAC changes can take 30 minutes to 2 hours to propagate. For HTTPS deployments set `NODE_ENV=production` so the server-side session cookie includes `Secure`.

## Email escalations

An OrgAdmin sets one escalation interval for the organization. Each DepAdmin can then configure an ordered escalation list for their own department. An assigned task sends one escalation at a time from that department's shared mailbox: the first level is due after the assignment interval, and each later level is due after the previous successful escalation. Completion, reassignment, or a reopened thread starts or stops the relevant cycle as appropriate.

Unassigned-email overdue alerts accrue and repeat only during the daily 9:00 AM–7:00 PM IST working window. Time outside that window is paused and no unassigned alert is emitted until the next working window. Assigned-task overdue alerts and the outbound escalation hierarchy retain their existing timing.

For sending, add the Exchange Online Application RBAC role `Application Mail.Send` to the LexFlow service principal with the same approved shared-mailbox resource scope. Do not add an unrestricted Entra `Mail.Send` application permission: Graph and Exchange RBAC permissions are additive. Escalations are saved in the shared mailbox Sent Items and contain only task, department, assignee, priority, and elapsed-time metadata—never the original email content, sender, attachments, or Outlook link. Failed sends retry with bounded backoff and appear to the relevant DepAdmin as a notification. New departments have an empty escalation hierarchy and cannot send until their DepAdmin adds recipients.

OrgAdmins are responsible for ensuring members have the appropriate Full Access and Send As permissions for a department's shared mailbox before assigning them to that department. LexFlow treats department assignment as this administrative confirmation; it does not inspect or modify individual Exchange permissions.

## Administration

- `PlatformAdmin` creates, edits, archives, and restores customer organizations. Archive is reversible and blocks login and processing while preserving data.
- `OrgAdmin` edits organization name, approved domain, IANA reporting timezone, and optional PNG/JPEG/WebP logo; configures the organization-wide Microsoft 365 connection; manages pending/active/disabled members and departments; and selects each department's DepAdmin. OrgAdmins are organization-wide identities: they cannot be converted into members or placed in a department. OrgAdmins never receive email subjects, senders, previews, rules, activity, or email notifications.
- `DepAdmin` is the current head of one department. The first eligible member assigned to a headless department becomes DepAdmin automatically. A DepAdmin remains a working member and can assign email to themselves or active members of the same department, manage that department's automation rules, and complete work assigned to them.
- A current DepAdmin cannot be moved, disabled, or promoted until the OrgAdmin selects a replacement from the same department. Promoting another member is blocked while that member has open assigned email or enabled rules.
- `Member` sees and completes only email assigned to their own account.
- The last active OrgAdmin cannot be disabled or demoted.
- Microsoft Graph synchronization runs automatically. DepAdmins do not configure Graph credentials, and LexFlow does not add per-user credentials to `.env`.

Messages that leave a connected shared mailbox Inbox because they were deleted, recalled, archived, or moved to another Outlook folder are placed in LexFlow's **Deleted** pane on the next Graph synchronization. A fresh Inbox synchronization also reconciles previously active LexFlow messages that are no longer present, so a reset delta cursor cannot leave stale work in an active queue. Microsoft Graph does not reliably distinguish every move or recall from a deletion in its folder-level delta response, so LexFlow presents these states consistently as removed from Outlook while preserving the provider removal reason for audit.

## Conversation tasks

LexFlow groups Outlook messages by the native Microsoft Graph `conversationId` within the organization, department, and shared mailbox. Inbox, assigned, completed, alert, and overview counts therefore represent conversation tasks rather than individual replies. A thread can be expanded in place to inspect its messages chronologically, and each message retains its own Open in Outlook action.

A new provider message appended to a completed conversation reopens the task. LexFlow first restores the previous assignee when that member is still active in the department, then evaluates the department's current automation rules, and otherwise leaves the conversation unassigned for the DepAdmin. Updates or replayed delta pages for an existing provider message do not reopen work. Migration/backfill constructs conversation history without emitting reopen notifications; back up the SQLite database before deploying a schema upgrade.

## Vacation Mode

Members and DepAdmins can schedule Vacation Mode with a first day away and return date. While the period is active, automation rules skip that user and manual assignment controls prevent new work from being assigned to them. Existing work is not moved automatically; when a DepAdmin reassigns it for coverage, LexFlow records the ticket, covering teammate, time, and priority.

When Vacation Mode is switched off—or its return date has passed—LexFlow creates one return briefing from the covered tickets. The next sign-in presents the briefing in Critical, High, Medium, then Low priority order. Acknowledging it marks the briefing reviewed, and past briefing counts remain available in the Vacation workspace. All dates use the organization reporting timezone, and the interface disables Anime.js motion when reduced motion is requested.

## Metrics

Every role has a tenant-safe **Metrics** module:

- PlatformAdmins see active/archived tenant status and tenant lifecycle only.
- OrgAdmins see workforce lifecycle and Microsoft Graph refresh health, never task or email-derived reporting.
- DepAdmins see assignment outcomes, employee workload, and automation-rule performance for their current department only.
- Members see only their own assignments, completions, and handling-time trend.

Metrics use append-only reporting events and conversation assignment cycles. Existing organization and task records are backfilled only where their stored timestamps provide reliable evidence; the UI labels older ranges as partial rather than inventing missing history. Assignment-source totals include explicit Manual assignment, Reopened to previous assignee, and Historical / unknown source categories where applicable, so the breakdown reconciles with the assignment summary without guessing old rule attribution. Date boundaries, daily/weekly/monthly buckets, and SLA status use the organization's configured IANA timezone. Chart.js is bundled and served locally, and every plot includes an exact data-table alternative.

Department administrators can download their complete Activity audit trail as a formatted Excel workbook. The export includes a summary and filterable event log, remains restricted to the administrator's current department, and is never exposed to organization administrators or members.

## Verification

```bash
npm test
```

The suite covers migration compatibility, Entra callback safety, tenant membership and isolation behavior, organization administration, department-head replacement, cross-department confidentiality, shared-mailbox imports, assignment/completion workflows, role-scoped metrics, timezone/DST boundaries, notifications, alerts, and configuration validation. Browser smoke testing should cover Microsoft sign-in, all four Metrics views, OrgAdmin administration-only navigation, DepAdmin department workflow access, and Member assigned-work access.

## Security notes

Keep `.env`, client secrets, and the SQLite database out of version control. Use TLS, secret management, backups, monitoring, and appropriate Graph mailbox access restrictions in production. Tenant archive and domain changes invalidate organization sessions.
