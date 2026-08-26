# Admin Mailbox Assignment Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize only organization-admin mailboxes and send one safe, idempotent assignment digest to each newly assigned user without coupling provider I/O to workflow transactions.

**Architecture:** Replace subject ownership with organization-scoped canonical conversations and durable mailbox identities. Assignment commits a canonical assignee transition plus a delivery record, then a separate leased worker sends through a provider-neutral adapter. Connector generations rotate in place on legitimate reconnects, so native conversation mappings and delivery correlation remain stable.

**Tech Stack:** Node.js 22+, Express 5, built-in `node:sqlite` and crypto, Gmail REST API, Microsoft Graph REST API, vanilla browser UI, Node test runner.

## Global Constraints

- Only active organization admins connect Gmail or Outlook; member mailboxes are never synchronized.
- Each organization supports at most one active Gmail and one active Outlook connection.
- Retain at most 500 actionable Inbox email rows per organization; Sent mail never enters `emails`.
- Native Gmail `threadId` and Outlook `conversationId` are canonical source identities; normalized subject is migration/demo fallback only.
- Assignment and delivery-record creation are atomic; provider I/O never occurs inside that transaction or request.
- A unique `(organization_id, conversation_id, recipient_id)` delivery prevents duplicate automatic delivery.
- Delivery states are `blocked`, `pending`, `leased`, `accepted`, `failed`, `unknown`, and `cancelled`.
- A worker rechecks current assignee, connection generation, send scope, and native source in the transaction that writes `request_started_at`.
- Reassignment cancels all former-recipient deliveries that have not started provider I/O; accepted/started-unknown external copies cannot be recalled and are never retried automatically.
- Gmail success and Graph `202 Accepted` mean accepted, not confirmed recipient delivery.
- Unknown delivery retry requires explicit admin duplicate-risk confirmation.
- Assignment digest includes the latest 100 previews, each normalized to at most 320 characters, and uses only the configured trusted application origin.
- Existing read-only connector grants continue read sync and show delivery blocked until send permission is available.
- Preserve Phase 1 tenant boundaries and the existing dashboard design.

---

## File structure

- `src/canonical-conversations.js`: canonical migration/backfill, source binding, version and assignee transitions.
- `src/mailbox-connections.js`: durable mailbox identity, in-place reconnect generation, capability and active-source lookup.
- `src/deliveries.js`: delivery record creation, lease/attempt state machine, recovery, retry, and runner.
- `src/assignment-digest.js`: deterministic Message-ID, bounded provider-neutral plain-text/MIME digest.
- `src/delivery-senders.js`: Gmail and Graph provider-neutral send/reconciliation adapters.
- `src/workflows.js`: native-source sync and canonical assignment/completion/reopen operations.
- `src/gmail.js`, `src/mail-sources.js`: send scopes, native identities/headers, and provider sending.
- `src/app.js`, `src/server.js`, `src/config.js`: organization connector and delivery APIs/worker wiring.
- `public/index.html`, `public/app.js`, `public/styles.css`: capability and delivery-status surfaces.
- `test/deliveries.test.js`: state-machine and digest tests.
- `test/conversations.test.js`, `test/mail-sources.test.js`, `test/app.test.js`: workflow/provider/API regressions.

### Task 1: Canonical conversation and mailbox-identity schema

**Files:**
- Create: `src/canonical-conversations.js`
- Create: `src/mailbox-connections.js`
- Modify: `src/organization-schema.js`
- Modify: `src/db.js`
- Test: `test/conversations.test.js`
- Test: `test/workspace.test.js`

**Interfaces:**
- Consumes: Phase 1 `organization_id`, users, current emails, legacy thread owners, Gmail connection, and sync state.
- Produces: `bindConversationSource`, `conversationForEmail`, `transitionConversationAssignee`, `touchConversation`, `resolveMailboxConnection`, and `replaceConnectionGeneration`.

- [ ] **Step 1: Write failing canonical migration tests**

```js
test('native backfill splits and merges legacy groups deterministically and idempotently', () => {
  const db = legacyThreadFixture();
  migrate(db);
  backfillNativeConversation(db, nativeFixture);
  backfillNativeConversation(db, nativeFixture);
  assert.deepEqual(canonicalSnapshot(db), expectedCanonicalSnapshot);
});

test('legitimate reconnect rotates one durable connection and keeps source identity fetchable', () => {
  const before = connectedMailboxFixture(db);
  const after = replaceConnectionGeneration(db, confirmedSameAccountGrant);
  assert.equal(after.id, before.connectionId);
  assert.equal(after.generation, before.generation + 1);
  assert.equal(source(db).mailbox_identity_id, before.mailboxIdentityId);
});
```

- [ ] **Step 2: Run focused tests and confirm missing tables**

Run: `node --test test/conversations.test.js test/workspace.test.js`

Expected: FAIL because canonical and mailbox tables do not exist.

- [ ] **Step 3: Add constrained canonical and connection schema**

Create `mailbox_identities`, `mailbox_connections`, `conversations`, and `conversation_sources`. Add `organization_id`, `connection_id`, and `conversation_id` to `emails`; rebuild its provider uniqueness as `(organization_id, connection_id, provider_id)`. Native source uniqueness is `(organization_id, mailbox_identity_id, provider, normalized_mailbox, native_conversation_id)`.

```js
export function bindConversationSource(db, {
  organizationId, conversationId, mailboxIdentityId, connectionId,
  provider, mailboxAddress, nativeConversationId, fallbackKey, now,
}) {
  return bindOrResolveCanonical(db, {
    organizationId, conversationId, mailboxIdentityId, connectionId,
    provider, mailboxAddress, nativeConversationId, fallbackKey, now,
  });
}
```

- [ ] **Step 4: Implement deterministic legacy backfill**

Start one canonical version `1` per organization/thread key. Derive its status from newest retained email by `julianday(received_at) DESC, id DESC`; copy the most recently updated owner. Implement native split/merge exactly as the specification, refusing automatic merge when a delivery attempt has started.

- [ ] **Step 5: Implement durable in-place reconnect**

```js
export function replaceConnectionGeneration({ db, organizationId, provider, account }) {
  const identity = requireConfirmedMailboxIdentity(db, { organizationId, provider, account });
  return immediateTransaction(db, () => rotateConnectionGrant(db, identity, account));
}
```

Reject provider/account identity changes instead of reusing the row. Update `last_resolved_connection_id` on source mappings while retaining their durable mailbox identity.

- [ ] **Step 6: Run canonical/migration tests**

Run: `node --test test/conversations.test.js test/workspace.test.js`

Expected: PASS for split, merge, tie-break, versioning, connection replacement, tenant identity collisions, and legacy data preservation.

- [ ] **Step 7: Commit canonical storage**

```bash
git add src/canonical-conversations.js src/mailbox-connections.js src/organization-schema.js src/db.js test/conversations.test.js test/workspace.test.js
git commit -m "feat: add canonical mailbox conversations"
```

### Task 2: Native provider identity and send capabilities

**Files:**
- Modify: `src/gmail.js`
- Modify: `src/mail-sources.js`
- Modify: `src/config.js`
- Test: `test/mail-sources.test.js`
- Test: `test/config.test.js`

**Interfaces:**
- Consumes: mailbox connection metadata from Task 1.
- Produces: sync messages containing `nativeConversationId`, `internetMessageId`, `inReplyTo`, and `references`; provider objects expose `capabilities`, `sendAssignmentDigest`, and optional `reconcileMessageId`.

- [ ] **Step 1: Write failing Gmail and Graph metadata/scope tests**

```js
test('Gmail consent requests read and send and emits native conversation headers', async () => {
  assert.deepEqual(new URL(integration.authorizationUrl({ sessionId })).searchParams.get('scope').split(' ').sort(), [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
  ]);
  assert.equal(message.nativeConversationId, 'thread-42');
  assert.equal(message.internetMessageId, '<provider-42@example.test>');
});

test('Graph delta requests immutable native conversation identity', async () => {
  await source.fetchChanges(null);
  assert.match(requestUrl, /conversationId/);
  assert.match(requestUrl, /internetMessageId/);
  assert.equal(requestHeaders.Prefer, 'IdType="ImmutableId"');
});
```

- [ ] **Step 2: Extend Gmail metadata and consent**

Request both scopes, persist granted capabilities, and request `Subject`, `From`, `Message-ID`, `In-Reply-To`, and `References`. Return `threadId` as `nativeConversationId` without parsing it from a URL.

- [ ] **Step 3: Extend Graph delta metadata**

Add `conversationId,internetMessageId,internetMessageHeaders` to the bounded selected fields and return normalized native/header metadata. Keep Graph `Prefer: IdType="ImmutableId"` on every request.

- [ ] **Step 4: Add provider send primitives**

Gmail posts RFC 2822 MIME through `users.messages.send`; Graph posts MIME or JSON through `/users/{mailbox}/sendMail` for legacy application auth and `/me/sendMail` for delegated auth. Only Gmail 2xx and Graph 202 are accepted.

```js
async sendAssignmentDigest({ rawMime, signal }) {
  const response = await this.request('/gmail/v1/users/me/messages/send', {
    method: 'POST', body: JSON.stringify({ raw: toBase64Url(rawMime) }), signal,
  });
  return { providerMessageId: response.id ?? null };
}
```

- [ ] **Step 5: Run provider and config tests**

Run: `node --test test/mail-sources.test.js test/config.test.js`

Expected: PASS for scopes, metadata, bounded timeouts, Graph 202, safe 401/403 errors, and read-only capability reporting.

- [ ] **Step 6: Commit provider capabilities**

```bash
git add src/gmail.js src/mail-sources.js src/config.js test/mail-sources.test.js test/config.test.js
git commit -m "feat: add provider send capability"
```

### Task 3: Canonical workflow assignment and reopen semantics

**Files:**
- Modify: `src/workflows.js`
- Modify: `src/alerts.js`
- Test: `test/conversations.test.js`
- Test: `test/alerts.test.js`

**Interfaces:**
- Consumes: canonical/source helpers from Task 1 and native message fields from Task 2.
- Produces: canonical assignment, completion, reopening, visibility, and latest-row alert semantics.

- [ ] **Step 1: Write failing workflow transition tests**

```js
test('a native Inbox reply reopens one canonical conversation for its current assignee', async () => {
  await syncMailbox({ db, source: nativeBaseSource });
  completeAssignedEmail({ db, emailId: baseId, userId: mayaId, now });
  await syncMailbox({ db, source: nativeReplySource });
  assert.equal(canonical(db).current_assignee_id, mayaId);
  assert.equal(canonical(db).completion_state, 'assigned');
  assert.equal(canonical(db).version, 3);
});
```

- [ ] **Step 2: Bind native source before automation**

In `syncMailbox`, persist native message metadata, bind/create the canonical conversation, prune to 500 per organization, and only then evaluate sticky owner/rules for retained new Inbox messages. Treat a mapping/import/assignment transaction as one version increment.

- [ ] **Step 3: Route every assignment path through one canonical transition**

```js
export function assignConversation({ db, conversationId, assigneeId, actorId, reason, now }) {
  return transitionConversationAssignee(db, {
    conversationId, assigneeId, actorId, reason, now,
    ensureDelivery: ensureAssignmentDelivery,
  });
}
```

Update rule assignment, manual assignment/reassignment, sticky reopen, completion, bootstrap visibility, and alerts. Existing row statuses remain compatible, but canonical newest state is authoritative.

- [ ] **Step 4: Run workflow and alert tests**

Run: `node --test test/conversations.test.js test/alerts.test.js`

Expected: PASS with existing completion/reply tests plus canonical versions, no cross-org assignment, and latest-row-only alerts.

- [ ] **Step 5: Commit canonical workflow behavior**

```bash
git add src/workflows.js src/alerts.js test/conversations.test.js test/alerts.test.js
git commit -m "feat: route assignments by canonical conversation"
```

### Task 4: Assignment digest and delivery state machine

**Files:**
- Create: `src/assignment-digest.js`
- Create: `src/deliveries.js`
- Create: `src/delivery-senders.js`
- Test: `test/deliveries.test.js`

**Interfaces:**
- Consumes: `normalizeMessagePreview` contract defined locally for Phase 2 and later moved/reused by Phase 3, active mailbox connection lookup, canonical current assignee, and provider sender.
- Produces: `ensureAssignmentDelivery`, `cancelFormerRecipientDeliveries`, `createDeliveryRunner`, `recoverExpiredDeliveryLeases`, and `retryUnknownDelivery`.

- [ ] **Step 1: Write failing digest and state-machine tests**

```js
test('assignment commits one pending delivery without calling a provider', () => {
  const provider = { sendAssignmentDigest: mock.fn() };
  assignConversationFixture(db, provider);
  assert.equal(provider.sendAssignmentDigest.mock.callCount(), 0);
  assert.equal(delivery(db).status, 'pending');
});

test('reassignment before request start cancels stale delivery and worker sends nothing', async () => {
  const claim = claimPendingDelivery({ db, now });
  reassignConversation(db, priyaId);
  const result = await runner.runOne(claim.deliveryId);
  assert.equal(result.status, 'cancelled');
  assert.equal(sender.send.mock.callCount(), 0);
});
```

- [ ] **Step 2: Implement deterministic digest construction**

Generate a random 128-bit token once per delivery and Message-ID `<lf-${token}@${trustedOriginHost}>`. Build CRLF-normalized plain-text MIME with no Bcc, attachment, remote content, or provider HTML. Include chronological latest-100 previews, each 320 normalized characters, organization, mailbox, secure route, and provider-search instructions.

- [ ] **Step 3: Implement transactional delivery creation/cancellation**

```js
export function ensureAssignmentDelivery({ db, organizationId, conversationId, recipientId, now }) {
  return insertOrReuseDelivery(db, {
    organizationId, conversationId, recipientId,
    status: deliveryBlockReason(db, conversationId) ? 'blocked' : 'pending',
    now,
  });
}
```

Assigning back reuses accepted/unknown/cancelled history and never resends automatically. Reassignment cancels blocked/pending/failed and unstarted leased rows for the former recipient.

- [ ] **Step 4: Implement lease, start, outcome, recovery, and retry transitions**

`claimPendingDelivery` uses `BEGIN IMMEDIATE`, a lease expiry, and unique attempt number. `markRequestStarted` atomically rechecks current assignee, active generation, native identity, and send capability. Known pre-acceptance errors use bounded retry; ambiguous started errors become `unknown`; startup lease recovery distinguishes started vs unstarted. Manual retry requires `duplicateRiskConfirmed === true`.

- [ ] **Step 5: Implement coalesced runner and Gmail reconciliation**

```js
export function createDeliveryRunner({ db, resolveSender, clock = () => new Date() }) {
  let active = null;
  return {
    run() {
      if (!active) active = drainPendingDeliveries({ db, resolveSender, clock })
        .finally(() => { active = null; });
      return active;
    },
  };
}
```

- [ ] **Step 6: Run focused state-machine tests**

Run: `node --test test/deliveries.test.js`

Expected: PASS for concurrency, accepted results, safe retries, crash recovery, current-assignee cancellation, stale generations, send-consent promotion, assign-back reuse, and sanitized errors.

- [ ] **Step 7: Commit delivery engine**

```bash
git add src/assignment-digest.js src/deliveries.js src/delivery-senders.js test/deliveries.test.js
git commit -m "feat: deliver assigned conversation digests"
```

### Task 5: Delivery APIs, connector status, worker, and UI

**Files:**
- Modify: `src/app.js`
- Modify: `src/server.js`
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Test: `test/app.test.js`

**Interfaces:**
- Consumes: connection and delivery services from Tasks 1–4.
- Produces: organization-specific integration status, delivery status, explicit retry, and admin UI.

- [ ] **Step 1: Write failing API tests**

```js
test('only the organization admin sees delivery state and may confirm an unknown retry', async context => {
  assert.equal((await harness.get(`/api/deliveries/${id}`, memberCookie)).status, 404);
  assert.equal((await harness.post(`/api/deliveries/${id}/retry`, {}, adminCookie)).status, 400);
  assert.equal((await harness.post(`/api/deliveries/${id}/retry`, { duplicateRiskConfirmed: true }, adminCookie)).status, 202);
});
```

- [ ] **Step 2: Add organization-scoped connector/delivery APIs**

Connector authorize/callback/disconnect derive organization/admin from the session. Add delegated Outlook authorize/callback/disconnect using `offline_access Mail.Read Mail.Send`; replace the legacy application connection only after the provider confirms the same mailbox identity. Add `GET /api/deliveries/:id` and `POST /api/deliveries/:id/retry`; sanitize every error. Bootstrap exposes only current recipient delivery status needed by the UI.

- [ ] **Step 3: Wire sync and delivery runners**

On startup recover leases, finish canonical/native backfill, then enable the delivery runner. Trigger it after sync and manual assignment without awaiting network delivery. When an approved registration invite has not yet been copied and an organization sender is available, enqueue one invite email from that sender; otherwise retain the secure copy-link path. Keep the one-minute sync and hourly alerts unchanged.

- [ ] **Step 4: Add capability and delivery status UI**

In Settings, show Read connected / Send consent required separately. In assigned thread detail, show queued, accepted, blocked, failed, unknown, or cancelled delivery state. Unknown retry opens a confirmation dialog with explicit duplicate-risk copy; no background click can retry it.

- [ ] **Step 5: Run API/full tests and browser smoke**

Run: `node --check public/app.js && npm test`

Verify at 1280px and 375px that current dashboard layout remains intact, send-consent status is understandable, delivery failure does not hide assignment, and confirmation is keyboard accessible.

- [ ] **Step 6: Commit Phase 2 integration**

```bash
git add src/app.js src/server.js public/index.html public/app.js public/styles.css test/app.test.js
git commit -m "feat: surface assignment delivery status"
```

### Task 6: Phase 2 migration and release gate

**Files:**
- Modify: `README.md`
- Test: all test files

**Interfaces:**
- Consumes: all Phase 2 tasks.
- Produces: safely migrated connector data and documented permissions/recovery.

- [ ] **Step 1: Verify a fresh pre-canonical backup**

Require the versioned migration backup mechanism to create and validate a new timestamped backup before canonical/connection schema changes.

- [ ] **Step 2: Run all automated tests**

Run: `npm test`

Expected: all Phase 1, Phase 2, and legacy tests pass.

- [ ] **Step 3: Verify migration without sending**

Start with delivery worker disabled, confirm existing Gmail/Graph reads still work, native backfill is idempotent, existing read-only grants show blocked send capability, and no delivery provider call occurs for existing assignments.

- [ ] **Step 4: Document connector permissions and delivery recovery**

Explain Gmail readonly/send consent, Graph Mail.Read/Mail.Send, accepted vs delivered, unknown duplicate-risk retry, reconnect behavior, and how assignment remains visible if forwarding fails.

- [ ] **Step 5: Commit Phase 2 documentation**

```bash
git add README.md
git commit -m "docs: explain assignment delivery"
```
