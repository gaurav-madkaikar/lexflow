# Organization, Assignment Delivery, and Conversation History Design

## Goal

Evolve LexFlow from a single-workspace local-account prototype into an organization-scoped workflow while preserving the existing dashboard and email-assignment behavior. An organization admin owns the synchronized Gmail or Outlook mailbox, assigns selected conversations to approved users, runs a deduplicated first-assignment delivery, and lets authorized users read a formatted preview-only received/sent conversation timeline on demand.

## Delivery order

The work is divided into three independently verifiable deliverables and implemented in this order:

1. organization registration and membership approval;
2. admin mailbox synchronization and assignment delivery; and
3. on-demand conversation history.

This order establishes the organization and authorization boundary before mailbox data or forwarded content can be exposed.

## Preserved behavior and design

The following existing behavior remains authoritative:

- only admins create and edit automation rules;
- an incoming reply reopens a completed conversation for its sticky assignee;
- an outbound message adds context but never changes assignment or completion state;
- the workspace retains at most 500 actionable Inbox messages;
- Inbox mirroring removes deleted, archived, moved, and trashed work items;
- departments, response windows, hourly alerts, notifications, completion history, and manual admin reassignment remain available; and
- local testing credentials remain stable until password login is intentionally replaced.

The current LexFlow visual language is preserved across every new screen: warm-gray stage, floating white workspace, coral brand accent, modern grotesk typography, bento cards, large rounded surfaces, restrained borders, responsive layouts, visible keyboard focus, and the established status colors. Registration and membership pages use the same tokens and components rather than introducing a second visual system.

## Organization enrollment

### Entry screen

The registration entry screen contains a segmented `Admin` / `User` control and a required email address. `User` is the UI label for the stored `member` role. The email is normalized and carried forward; later forms display it as a locked value.

LexFlow recognizes obvious consumer domains:

- `gmail.com` selects Gmail; and
- `outlook.com`, `hotmail.com`, and `live.com` select Outlook.

For custom domains, the user must choose Gmail or Outlook because the address alone does not reliably reveal whether the domain uses Google Workspace or Microsoft 365. Future OAuth login supplies this provider identity automatically.

### Admin registration

An admin completes two steps:

1. Create an organization with a required name, unverified normalized domain, generated unique handle, and logo.
2. Create the first account with required name, locked email, locked `Admin` role, locked organization, mailbox provider, and password.

The organization and first admin are created in one transaction. A failure creates neither record. On success, LexFlow starts an authenticated session and opens the workspace.

The logo accepts PNG, JPEG, or WebP only, up to 2 MB, with both dimensions between 64 and 2,048 pixels. LexFlow validates MIME type, file signature, byte size, and pixel dimensions before storing a generated asset reference. User-provided filenames never become public paths.

An unverified domain is descriptive and is not reserved globally. This prevents a password user from taking over or blocking another organization's real domain. LexFlow generates a unique organization handle and join code for discovery during the password-login phase. Future provider SSO or DNS proof may verify the domain; only then may LexFlow enforce one verified organization per domain without changing organization identity.

### User registration

A user selects an organization by exact unique handle or join code; the matching name and unverified domain are shown for confirmation. The user then submits a join request using the locked email and chosen mailbox provider. A request does not create an active account. This version allows one organization per user and requires a globally unique registered email. Only one pending request may exist for the same organization and normalized email.

Organization admins see pending requests in a Membership Requests surface and may approve or reject them. Approval creates a cryptographically random, hashed, single-use registration invite that expires after 24 hours. The user follows the invite and completes required name, locked email, locked `User` role, locked organization, mailbox provider, and password of at least 10 characters. Consuming the invite and activating the account happen atomically.

If the organization has a working sender, LexFlow emails the invite. Otherwise, the admin may securely copy the one-time invite link. Rejected, expired, consumed, or replaced invitations cannot activate an account.

### Future login replacement

Application identity is independent of authentication method. Roles, organizations, departments, and assignments reference an internal user identity, never an `@lexflow.local` address. Future Google or Microsoft SSO maps an external provider subject to that identity and can replace passwords without changing the workflow model.

The mailbox grant remains a durable organization integration even when the admin's interactive login session ends. Login and connector consent may be presented as one user flow, but session credentials and long-lived encrypted mailbox credentials remain separate internally.

## Mailbox ownership and visibility

Only organization admins connect Gmail or Outlook. LexFlow synchronizes the organization's latest 500 actionable Inbox messages across those admin connections, followed by incremental changes. A normal user's personal mailbox is not synchronized. This version supports at most one active Gmail connection and one active Outlook connection per organization, preserving the prototype's ability to run either provider or both together.

Visibility is organization-scoped:

- an admin sees the synchronized admin mailbox and all assignments in that organization;
- a user sees only conversations whose canonical current assignee is that user, including completed items that have not subsequently been reassigned;
- reassignment immediately removes the former user's access to the live conversation; and
- no user or admin can read another organization's records.

Rules run against admin-mailbox work items and remain admin-only. A matching rule may assign a conversation to an approved user in the same organization. Manual admin assignment and later reassignment remain supported. A new incoming reply follows existing sticky-owner behavior unless an admin corrects the assignee.

### Canonical and provider conversation identity

LexFlow introduces an organization-scoped canonical `conversations` record. Every actionable email references one canonical conversation. Assignment, completion, visibility, alerts, delivery, and the UI use that canonical identifier rather than the legacy subject-derived `thread_key`.

Each provider thread is represented by a `conversation_sources` mapping containing organization, mailbox connection, provider, mailbox address, and native Gmail `threadId` or Outlook `conversationId`. A canonical conversation may have more than one source mapping when a user replies to an assignment-delivery email and the provider creates a second mail thread. Normalized subject identity remains a fallback only for demo data or provider records that do not expose a valid native identity.

Migration first creates one canonical conversation for each existing organization and legacy thread key. Provider-native identity is backfilled when a connector next returns or resolves a retained message:

- if one legacy subject group contains multiple native provider conversations, it splits into one canonical conversation per native identity and copies the current sticky owner to each split without creating notifications or activity;
- if multiple legacy groups resolve to the same scoped native identity, they merge into one canonical conversation and retain the owner with the latest `email_thread_owners.updated_at`, breaking an exact tie by the greatest legacy thread key; and
- individual email status and audit rows remain unchanged until a later normal workflow action updates the canonical conversation.

The canonical status is derived from the newest retained row by provider received time and email ID, matching the existing UI rule. Each conversation starts with version `1`; importing, removing, mapping, assigning, reassigning, completing, or reopening increments the version exactly once in the transaction that changes it.

Provider-native backfill runs before the delivery worker is enabled. A fallback conversation cannot begin a provider request. If it later splits, any unattempted blocked or pending delivery moves to the child containing the former representative email; other child conversations enter normal rule evaluation independently. A merge is automatic only when none of the candidate conversations has a started delivery attempt. A started-attempt conflict fails closed, preserves the existing canonical records, and creates an admin-visible data-conflict state instead of risking duplicate delivery or cross-thread disclosure.

The migration and later backfill are idempotent. This prevents unrelated conversations with the same subject from sharing history, assignment, or delivery state while preserving existing ownership deterministically.

## First-assignment delivery

### Provider permissions

The admin mailbox grant requires read access and send access. Gmail uses `gmail.readonly` plus `gmail.send`; Outlook uses the corresponding Graph read permission plus `Mail.Send`. Gmail's send method accepts an RFC 2822 message and returns a Message resource. Microsoft Graph `sendMail` accepts JSON or MIME content and returns `202 Accepted`, which confirms acceptance rather than final delivery. See [Gmail `messages.send`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send) and [Microsoft Graph `sendMail`](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0).

Existing read-only grants must reconnect and consent to the additional send permission before delivery is enabled. Read synchronization continues to report its own status separately from delivery capability.

### Delivery record

LexFlow stores one delivery record per canonical conversation and recipient. Provider-native mappings establish the canonical boundary; normalized subject hashes alone are not sufficient because unrelated conversations can share a subject.

The record contains:

- organization, canonical conversation, originating mailbox identity, and recipient user;
- a cryptographically random 128-bit correlation token embedded in a deterministic RFC Message-ID generated by LexFlow;
- status: `blocked`, `pending`, `leased`, `accepted`, `failed`, or `unknown`;
- provider response identifier when available;
- attempt count, timestamps, and a sanitized failure summary; and
- the secure LexFlow thread route used in the message.

A unique constraint on organization, canonical conversation, and recipient prevents duplicate automatic delivery. Assignment and a delivery record are committed together; network sending never occurs inside the assignment transaction.

If native provider identity or send consent is unavailable, assignment creates a `blocked` delivery with a reason. Assignment never waits for provider I/O. Resolving the native identity or reconnecting with send consent promotes an unattempted, still-current recipient's blocked delivery to `pending`. Demo conversations remain blocked because they have no real sender.

### Delivery attempts and crash recovery

Each external request has a write-ahead attempt record and a time-bounded lease:

1. A worker atomically claims a `pending` delivery, creates an attempt, and marks it `leased` without yet marking the request as started.
2. Immediately before provider I/O, it transactionally records `request_started_at`.
3. A successful Gmail response or Graph `202 Accepted` changes the delivery to `accepted` and records available provider metadata.
4. A known pre-acceptance failure becomes `failed` and may return to `pending` under bounded retry policy.
5. A timeout or crash after `request_started_at` but before a conclusive response becomes `unknown` and is never retried automatically.

On startup, an expired lease whose request never started safely returns to `pending`. An expired lease whose request started becomes `unknown`. Gmail may reconcile an unknown attempt by locating the deterministic Message-ID in Sent mail and then mark it `accepted`.

An admin may explicitly retry an `unknown` delivery only after a warning that the provider may already have accepted the previous attempt and a duplicate is possible. The guarantee is therefore **at most one automatic accepted attempt per conversation and recipient**, not exactly-once delivery after manual override.

### Forwarded content

The first assignment to a recipient sends one provider-neutral email digest from the originating admin mailbox. The digest contains at most the latest 100 messages and at most 320 normalized characters per preview. It includes:

- the conversation subject;
- formatted previews of the current messages in chronological order;
- the assigning organization and admin mailbox;
- a secure LexFlow link to the assigned conversation; and
- the deterministic Message-ID needed for mailbox lookup.

The digest is distinct from the original provider conversation and is excluded from LexFlow's original conversation timeline. Provider content is rendered as escaped text, not trusted HTML.

Later rule evaluations, polling, and incoming replies do not create a second delivery for the same conversation and recipient. Only the bounded transport retry policy may make another pre-acceptance attempt on the existing delivery record. Assignment to a different user creates that recipient's first delivery. Assignment back to a previous recipient reuses the existing delivery and exposes the stored links without resending.

### Replies to an assignment delivery

The deterministic delivery Message-ID is also a correlation key. Gmail synchronization requests `Message-ID`, `In-Reply-To`, and `References` metadata. Outlook retrieves `internetMessageId` and selected `internetMessageHeaders`, which Microsoft Graph exposes on the message resource. See [Microsoft Graph message headers](https://learn.microsoft.com/en-us/graph/api/message-get?view=graph-rest-1.0).

When a new admin-Inbox message references a LexFlow delivery Message-ID, LexFlow links it to the delivery's original canonical conversation only when all of these checks pass:

- the referenced delivery belongs to the same organization and immutable mailbox identity;
- the incoming normalized sender equals the registered email of that delivery recipient;
- the delivery reached `accepted` or `unknown` after a started provider request; and
- every referenced LexFlow token resolves to the same canonical conversation; and
- the incoming message and its complete native source mapping are either unmapped or already mapped to that same canonical conversation.

Headers that reference multiple canonical conversations, an unknown or malformed token, a different mapped source, or a wrong sender do not correlate; the message follows normal intake and produces a sanitized security event. Subject similarity alone never establishes this link.

Mailbox identity survives token rotation and connection generations. A replacement connection inherits an old identity only when organization, provider, and normalized mailbox address match and the provider confirms the same mailbox account. Otherwise it receives a new identity and cannot consume old delivery correlations.

A valid correlated reply adds its provider thread as another `conversation_sources` mapping, appears in the original timeline, and reopens the canonical conversation for its current sticky assignee. If the conversation was reassigned after delivery, the reply follows the current assignee; it does not restore access to the former recipient. The assignment-delivery digest itself remains filtered from the timeline.

### Failure semantics

A forwarding failure never rolls back or hides the assignment. Admins see delivery state and a sanitized error.

Failures known to occur before provider acceptance retry with bounded backoff as defined by the attempt state machine. The admin delivery surface distinguishes `accepted` from confirmed delivery because Graph's `202 Accepted` does not provide a delivery receipt.

Expired authorization produces an actionable reconnect message. Already synchronized and assigned work remains readable from local data while the provider is unavailable.

## External mailbox links

The secure LexFlow route uses an opaque canonical-conversation public ID rather than an email-row ID:

```text
/conversations/:publicId
```

It requires authentication, resolves a currently retained actionable email as the provider anchor, and rechecks organization plus current assignment before displaying content. If Inbox mirroring or the 500-item retention policy removes every actionable email for that conversation, the authorized route returns `410 Gone` with a neutral explanation and does not fetch provider history. The provider-search action remains available from the recipient's external assignment email. An unauthorized caller still receives a resource-hiding `404`.

LexFlow additionally offers a lightweight provider search action:

- Gmail opens the registered account and searches for the deterministic RFC Message-ID using `rfc822msgid`;
- Outlook opens an encoded best-effort search for the deterministic Message-ID and subject; and
- failure to find a provider copy leaves the secure LexFlow link available.

Gmail documents `rfc822msgid` as a supported mailbox search query, but provider browser URL formats are not stable API contracts. The action is therefore labeled `Find in Gmail` or `Find in Outlook`, not `Open exact message`. See [Gmail message search](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list).

## On-demand conversation history

### Architecture

Sent and received history is never imported into the actionable `emails` table. Importing Sent mail would corrupt queue counts, automation, alerts, completion, Inbox mirroring, and the 500-message limit.

LexFlow exposes an authenticated provider-neutral endpoint:

```text
GET /api/emails/:id/conversation
```

The browser sends only the local work-item ID. The server loads provider, mailbox, and provider message identity from the authorized database row. Client-supplied provider conversation IDs or mailbox addresses are never accepted.

Admins may load retained conversations in their organization. A member must be the thread's current assignee. Authorization is checked before provider access and again after the awaited request so deletion, reassignment, disconnection, or connection replacement cannot leak stale results.

The response is private and non-cacheable by shared intermediaries. A bounded process-local cache of 30 seconds is keyed by immutable organization ID, mailbox-connection ID and generation, provider, normalized mailbox, and native conversation identity. Concurrent expansion and drawer requests share one in-flight promise. Every cache consumer is authorized again after awaiting either a provider request or a coalesced cached request.

### Provider resolution

For Gmail, LexFlow resolves the retained anchor message to its native `threadId`, retrieves the thread, and retains messages currently labeled `INBOX` or `SENT`. Gmail's thread resource returns the messages belonging to a provider thread and works with the existing read scope. See [Gmail threads](https://developers.google.com/workspace/gmail/api/guides/threads).

For Outlook, LexFlow resolves the immutable anchor message to its `conversationId`, queries Inbox and Sent Items for that exact conversation, follows provider pagination, and deduplicates immutable IDs.

The endpoint enumerates every provider source mapping attached to the canonical conversation, resolves the current active connection for each immutable mailbox identity, merges the results by scoped provider message identity, and then applies the global 100-message bound. This is how a reply to a forwarded assignment appears beside the original admin-mailbox thread even when the provider created a second native thread.

Both providers exclude drafts, spam, junk, trash, and deleted items. The result is bounded to the latest 100 provider messages and sorted oldest to newest. The response indicates whether older content was truncated.

### Response contract

```js
{
  conversation: {
    subject: string,
    provider: 'gmail' | 'outlook',
    mailboxAddress: string,
    messageCount: number,
    truncated: boolean,
    messages: [{
      id: string,
      direction: 'received' | 'sent',
      sender: { name: string, address: string },
      occurredAt: string,
      preview: string,
      webUrl: string | null,
    }],
  },
}
```

Direction is derived by the provider adapter, never inferred by the browser. The UI says `Sent from <admin mailbox>` instead of `You`, because the logged-in LexFlow user and mailbox identity may differ. Original admin-mailbox `webUrl` values are returned only to admins; members receive the secure LexFlow route and their assignment-delivery search action because they cannot access the admin mailbox directly.

### Preview normalization

The server formats provider previews through one provider-neutral normalizer:

1. validate and normalize Unicode;
2. decode visible character entities;
3. remove zero-width characters and tracking whitespace;
4. collapse remaining whitespace;
5. trim after 320 Unicode characters at the nearest preceding word boundary; and
6. append an ellipsis only when content was truncated.

The browser renders the result through text nodes only. Provider HTML, scripts, inline actions, attachments, Bcc values, and remote images are outside this version.

### Workflow semantics

Conversation retrieval is a pure read. It does not change email status, assignment, thread owner, timestamps, notifications, activity, alerts, sync cursors, or retention.

An outbound admin-mailbox message appears as conversation context but never reopens a completed item. A new incoming Inbox message continues through normal sync and reopens the sticky assignment. Assignment-forward delivery messages are filtered from the original conversation timeline.

## User interface

The current thread summary, status, assignment grouping, and disclosure interaction remain intact.

Expanding a multi-message conversation or opening the existing detail drawer starts the same coalesced on-demand load. Existing local child rows provide the immediate fallback; once provider history succeeds, the controlled region replaces those fallback rows with one deduplicated provider timeline rather than showing both. The drawer consumes the same cached data. The timeline is an ordered list from oldest to newest. Each full-width message card shows:

- visible `Received` or `Sent from <mailbox>` text and a secondary color treatment;
- sender name and address;
- a semantic time value;
- the normalized preview; and
- an optional provider action.

Full-width cards are used instead of chat bubbles so long email subjects, addresses, and previews remain readable on mobile. Direction never relies on color alone.

The controlled region has inline loading, empty, failure, and Retry states. Failure preserves the locally stored Inbox preview. A late response is ignored if the drawer closes or another conversation is selected.

The existing 20-second dashboard refresh preserves expanded keys, focused conversation messages, drawer scroll position, and current selection. Bootstrap exposes a server-derived conversation version. A changed version invalidates the 30-second cache immediately; otherwise an open conversation checks again only after cache expiry, so polling cannot issue a provider request every 20 seconds. When a new reply arrives, LexFlow updates the timeline without moving focus. If the reader is away from the bottom, a polite `New reply — Show` action appears instead of forcing a scroll.

## Data model

New organization-scoped records are introduced without treating Sent history as work items:

- `organizations`: unique ID and handle, name, normalized unverified domain, logo reference, domain verification status, timestamps;
- `users`: organization reference, role, registration status, mailbox provider, existing profile and credential fields;
- `join_requests`: organization, email, mailbox provider, status, requester metadata, decision metadata, timestamps;
- `registration_invites`: request reference, token digest, expiry, consumption timestamp;
- `mailbox_identities`: immutable organization, provider, and normalized mailbox identity that survives legitimate reconnects;
- `mailbox_connections`: mailbox identity, admin owner, encrypted grant, consented capabilities, generation, timestamps;
- `conversations`: organization, opaque public ID, canonical current assignee, completion state/version, subject display value, timestamps;
- `conversation_sources`: canonical conversation, connection, provider, normalized mailbox, native conversation identity or fallback identity;
- `assignment_deliveries` and `delivery_attempts`: canonical conversation, recipient, Message-ID, state-machine metadata, attempt lease and outcome; and
- a future SSO migration adds external identities keyed by provider and immutable provider subject; no external-identity table is required for the password-registration deliverable.

Existing workflow data becomes explicitly tenant-scoped:

- `emails` gains `organization_id`, `connection_id`, and `conversation_id`; provider identity is unique by `(organization_id, connection_id, provider_id)` rather than globally;
- canonical native source identity is unique by `(organization_id, connection_id, provider, normalized_mailbox, native_conversation_id)` when native identity is present;
- `email_thread_owners` remains only as migration compatibility, keyed by `(organization_id, thread_key)`, while new workflow writes use `conversations.current_assignee_id`;
- departments are unique by `(organization_id, name COLLATE NOCASE)`;
- workspace settings use `organization_id` as their primary key instead of singleton `id = 1`;
- sync state is keyed by `(organization_id, connection_id, key)`;
- rules, notifications, activity, alert deliveries, and sessions carry or derive organization scope; and
- rules, emails, conversations, deliveries, and membership decisions use composite organization/user foreign keys so an assignee, recipient, actor, or approver cannot belong to another organization.

The database enforces these constraints in addition to route-level authorization. A future SSO migration maps external identities to the existing organization-scoped user row.

## API boundaries

The implementation exposes focused routes for:

- admin organization creation and first-account completion;
- user join-request submission, admin approval/rejection, and invite completion;
- admin mailbox authorization, callback, status, and disconnect;
- admin membership-request listing;
- authorized conversation retrieval;
- admin assignment-delivery status and explicit retry; and
- the authenticated canonical-conversation deep link with retained-anchor resolution.

Every route derives organization and authorization from the authenticated session or a hashed one-time invite. Resource IDs do not grant access by themselves. Cross-organization and unauthorized member reads use a resource-hiding `404` where appropriate.

Invite, assignment, and provider-search links are built only from a configured public application origin. The origin must be HTTPS except for an explicit loopback development origin, must contain no credentials, query, or fragment, and is never inferred from the request `Host` header.

## Migration

Before changing the live schema, LexFlow creates and verifies an online SQLite backup.

The current workspace migrates into one default organization. Existing user IDs, password hashes, sessions, rules, departments, settings, emails, thread ownership, notifications, activity, connection state, and local credentials remain unchanged. Organization foreign keys are backfilled transactionally, and the migration is idempotent.

The existing Gmail connection becomes an admin-owned organization mailbox connection. Its read-only OAuth grant continues synchronizing but reports delivery blocked until the admin reconnects with send consent.

The existing Outlook connector uses environment-backed Graph application credentials. It migrates as a legacy organization connection that may continue read synchronization under its existing permission. Delivery remains blocked unless the tenant grants application `Mail.Send`. The target connection model is delegated Microsoft OAuth with offline access, `Mail.Read`, and `Mail.Send`, stored and generation-validated like Gmail; completing that consent replaces the legacy connection without reusing or exposing its secret. Both paths preserve the same provider-neutral mailbox interface.

## Error handling and security

- Secrets, refresh tokens, OAuth codes, provider bodies, and registration tokens are excluded from responses and logs.
- Mailbox grants remain encrypted at rest and invalidated by connection generation on disconnect or replacement.
- Join and invite rate limits prevent email and organization enumeration.
- Invite responses do not reveal whether an unrelated email already belongs to another organization.
- Provider errors are converted to safe, actionable messages; raw provider payloads remain server-side.
- Conversation fetches and delivery operations are bounded by timeouts, pagination limits, body limits, and retry limits.
- External links are generated from server-held, validated metadata with fixed provider origins; no open redirect is accepted.
- Assignment email content contains no hidden Bcc data, attachments, remote content, or active HTML.

Join-request creation is limited to five attempts per normalized email and source address per hour. Login keeps the existing session protections, and registration errors use non-enumerating responses wherever revealing account existence is unnecessary.

## Out of scope

This design does not add Google/Microsoft login, domain verification, multi-organization membership, promotion of users to additional admins, synchronization of user mailboxes, exact provider-native links into a recipient's mailbox, outbound replying from LexFlow, full message bodies, quoted-body parsing, attachments, drafts, or delivery/read receipts. Those capabilities require separate designs and consent decisions.

## Verification

Automated tests cover at least:

1. atomic organization and first-admin creation;
2. unverified duplicate domains remain isolated by unique organization handles and logos are validated;
3. join approval, rejection, invite expiry, invite reuse prevention, and concurrent completion;
4. migration of the current workspace without changing IDs, passwords, sessions, workflow settings, or credentials;
5. native-identity backfill deterministically splitting and merging legacy subject groups while preserving sticky ownership;
6. database constraints preventing organization collisions in provider IDs, source identities, thread owners, departments, settings, sync state, assignees, recipients, actors, and approvers;
7. admin bounded-mailbox visibility and assigned-only member visibility;
8. reassignment immediately revoking the former member's queue and live-conversation access;
9. assignment and blocked-or-pending delivery creation in one transaction without provider I/O;
10. one automatic accepted delivery record per canonical conversation and recipient under retries and concurrency, while allowing multiple proven pre-acceptance transport attempts;
11. lease recovery before request start, unknown recovery after request start, provider acceptance, Gmail reconciliation, duplicate-risk confirmation, and explicit admin retry;
12. missing native identity, missing send consent, later identity resolution, and later reconnect promotion;
13. legacy Outlook read operation, blocked delivery, application send consent, and delegated OAuth replacement;
14. safe generation of canonical LexFlow and provider-search links from the configured origin, retained-anchor resolution, authorized `410 Gone`, and unauthorized `404`;
15. Gmail and Outlook mixed received/sent timelines, pagination, deduplication, exclusion, ordering, truncation, and role-specific provider URLs;
16. conversation cache isolation across organizations and connections with equal generations or provider IDs;
17. authorization before and after delayed or coalesced provider access;
18. conversation retrieval leaving every workflow and synchronization record unchanged;
19. a valid assignment-delivery reply correlating by unguessable headers and sender across a legitimate reconnect, joining the original canonical conversation, and reopening it for the current assignee;
20. forged, cross-organization, wrong-sender, subject-only, multi-conversation reference, duplicate, foreign mailbox identity, and already-mapped source correlation attempts being rejected;
21. outbound messages not reopening work and ordinary incoming replies continuing to reopen the sticky assignment;
22. normalized previews displaying character entities and whitespace correctly without HTML execution;
23. coalesced accordion/drawer loads, fallback replacement, cache-version invalidation, loading, error, Retry, new-reply, focus, scroll, and stale-response UI behavior;
24. responsive registration, membership, timeline, and delivery-status layouts; and
25. the complete existing test suite remaining green.

## Success criteria

An organization can register its first admin, approve users, and maintain strict tenant boundaries. Only admin mailboxes synchronize their bounded actionable Inbox. Automatic delivery never retries after provider acceptance or an ambiguous started request, and ordinary retries cannot create a second accepted delivery record for the same canonical conversation and recipient. A rule-assigned user can reliably open the secure LexFlow thread and has a lightweight way to locate the accepted copy in Gmail or Outlook. Admins and current assignees can read a bounded, correctly formatted preview-only timeline containing received and admin-sent context. A user's reply to the assignment email rejoins and reopens the original canonical conversation through verified header correlation. Sent content never becomes a work item, while ordinary new incoming replies continue to reopen completed assignments. All new screens remain visually and behaviorally consistent with the existing LexFlow dashboard.
