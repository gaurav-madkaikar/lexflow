# Microsoft Graph Integration Panel Design

## Goal

Replace the ambiguous **Email connections** block in OrgAdmin settings with a focused **Microsoft Graph integration** health panel. The panel explains the organization-wide Graph connection used to synchronize department shared mailboxes, while continuing to hide individual email content from OrgAdmins.

## Chosen approach

Use one expanded health card inside the existing Settings layout. A text-only rename would not explain the connection's scope or health, while a multi-step setup wizard would add unnecessary navigation for a single tenant-consent action. The health card preserves LexFlow's current visual language and makes the connector state understandable at a glance.

## Component design

The settings section will be titled **Microsoft Graph integration** with supporting copy that states that one organization-wide connection synchronizes department shared mailboxes. It will contain one Microsoft 365/Graph card with:

- a prominent state badge: **Connected**, **Needs attention**, **Not connected**, or **Setup required**;
- **Tenant consent**, shown as granted or required;
- **Shared mailboxes**, shown as the count of department mailboxes configured in LexFlow;
- **Last successful sync**, shown as a formatted date or **Not synced yet**;
- a sanitized, inline error only when action is required; and
- **Connect Microsoft 365** or **Reconnect** as the primary action, with **Disconnect** as a secondary destructive action when connected.

The card will use the existing icons, typography, colors, spacing, button styles, and responsive breakpoints. Health facts will collapse cleanly on narrow screens. Status and errors will remain accessible to assistive technology through text labels and the existing live feedback region.

## Data and authorization

The component uses the existing OrgAdmin bootstrap integration payload:

- `configured` identifies whether server-side Entra application credentials exist;
- `connected` identifies whether organization tenant consent has been recorded;
- `mailboxCount` counts department shared mailboxes;
- `lastSuccessAt` reports the latest successful Graph mailbox sync; and
- `lastError` contains sanitized connector health text.

No access token, client secret, email subject, sender, preview, message count, mailbox URL, or individual mailbox contents will be exposed. Only OrgAdmins can see or operate this component. DepAdmins and Members retain their existing role-specific interfaces.

## State behavior

- **Setup required:** server Entra credentials are incomplete. Connection actions are disabled and the panel explains that application setup is required.
- **Not connected:** the application is configured, but tenant administrator consent has not been granted. Tenant consent is marked required and the connect action is available.
- **Connected:** consent is recorded and no sync error exists. The card shows mailbox coverage and the latest successful sync.
- **Needs attention:** consent is recorded but the latest Graph health state contains an error. The card keeps reconnect and disconnect available and displays the sanitized error inline.

Zero configured shared mailboxes is a valid connected state, not an error. The card will state **0 configured** so the OrgAdmin can create departments separately.

## Error handling

Authorization callback success and failure continue to return to Settings. Result messages appear inside the integration section rather than relying on URL parameters alone. Raw Microsoft tokens, provider payloads, and server exception details are never rendered.

## Verification

- Confirm each of the four visual states renders the correct badge, facts, and actions.
- Confirm mailbox count and last-success values update from bootstrap data.
- Confirm callback feedback is visible in the panel and removed from the browser URL after processing.
- Confirm OrgAdmin bootstrap data contains only connector health and no message-level data.
- Confirm DepAdmin and Member interfaces do not render the Graph integration panel.
- Run the existing automated test suite and perform a local responsive browser smoke test.

## Out of scope

- Per-user Graph credentials or delegated Graph connections.
- Displaying individual shared-mailbox addresses or email content in OrgAdmin settings.
- Granting Exchange mailbox permissions from LexFlow.
- Gmail connection controls.
