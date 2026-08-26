# On-Demand Conversation History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authorized admins and current assignees view a bounded, correctly formatted received/sent preview timeline on demand and safely correlate replies to assignment digests with the original canonical conversation.

**Architecture:** A provider-neutral history service resolves canonical source mappings from an authorized local email anchor, fetches Gmail/Outlook history only when requested, coalesces calls through a 30-second tenant-safe cache, and returns preview-only text. Digest replies are correlated during normal Inbox sync through unguessable Message-ID tokens and strict sender/mailbox/source checks before canonical routing. The existing accordion and drawer share one browser cache and never import Sent messages into workflow storage.

**Tech Stack:** Node.js 22+, Express 5, built-in SQLite/crypto, Gmail threads API, Microsoft Graph messages API, vanilla HTML/CSS/JavaScript, Node test runner.

## Global Constraints

- Sent history is never inserted into the actionable `emails` table and never consumes the 500-row retention cap.
- The browser supplies only a local retained email ID; provider mailbox/conversation IDs are server-derived.
- Admin access is same-organization; member access requires canonical current assignment.
- Authorization is checked before provider access and again after every awaited/coalesced result.
- Cache keys include organization, mailbox identity, active connection ID/generation, provider, mailbox, and native conversation identity.
- Cache TTL is 30 seconds and bootstrap canonical version changes invalidate entries immediately.
- Timeline is globally bounded to latest 100 messages, sorted oldest to newest, and indicates truncation.
- Provider HTML/full bodies/attachments/Bcc/drafts/spam/junk/trash/deleted content are excluded.
- Previews are Unicode-normalized escaped text, at most 320 characters, truncated at a word boundary with an ellipsis only when needed.
- Direction is provider-derived and UI copy says `Received` or `Sent from <admin mailbox>`, never `You`.
- Admin-only original mailbox URLs never reach member responses.
- Conversation retrieval is a pure read and returns `Cache-Control: private, no-store`.
- Correlation requires unguessable LexFlow tokens, exact registered sender, same organization/mailbox identity, eligible delivery state, unambiguous references, and unmapped/same-canonical source identity.
- Preserve the current accordion/drawer behavior, focus, scroll, selection, polling, responsive design, and accessibility.

---

## File structure

- `src/message-preview.js`: pure provider-neutral preview normalization.
- `src/conversation-history.js`: authorization, source enumeration, tenant-safe cache/coalescing, merge/dedupe/bounds, response projection.
- `src/gmail.js`: Gmail thread-history fetch adapter.
- `src/mail-sources.js`: Outlook conversation-history fetch adapter.
- `src/delivery-correlation.js`: LexFlow Message-ID parsing and verified inbound-reply correlation.
- `src/workflows.js`: correlation-before-rule intake and canonical reopen.
- `src/app.js`, `src/server.js`: authorized history endpoint and deep-link resolution.
- `public/conversation-cache.js`: browser-safe cache/in-flight/stale-response state machine.
- `public/index.html`, `public/app.js`, `public/styles.css`: shared inline/drawer timeline.
- `test/conversation-history.test.js`, `test/mail-sources.test.js`, `test/conversations.test.js`, `test/app.test.js`: pure/provider/workflow/API tests.

### Task 1: Preview normalizer and provider-neutral history contract

**Files:**
- Create: `src/message-preview.js`
- Create: `test/conversation-history.test.js`

**Interfaces:**
- Produces: `normalizeMessagePreview(value, maxCharacters = 320): { preview: string, truncated: boolean }`.

- [ ] **Step 1: Write failing pure normalization tests**

```js
test('preview normalization decodes visible entities and removes unsafe whitespace', () => {
  assert.deepEqual(normalizeMessagePreview('A&amp;B\u200b\n\tC'), {
    preview: 'A&B C',
    truncated: false,
  });
});

test('preview truncates Unicode at the nearest word boundary', () => {
  const result = normalizeMessagePreview(`${'word '.repeat(90)}tail`, 320);
  assert.equal([...result.preview.replace(/…$/, '')].length <= 320, true);
  assert.equal(result.preview.endsWith('…'), true);
});
```

- [ ] **Step 2: Run tests and confirm the module is absent**

Run: `node --test test/conversation-history.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement deterministic text normalization**

```js
export function normalizeMessagePreview(value, maxCharacters = 320) {
  const normalized = decodeVisibleEntities(String(value ?? '').normalize('NFKC'))
    .replace(/[\u200B-\u200D\u2060\uFEFF]/gu, '')
    .replace(/[\p{Z}\s]+/gu, ' ')
    .trim();
  const characters = [...normalized];
  if (characters.length <= maxCharacters) return { preview: normalized, truncated: false };
  const prefix = characters.slice(0, maxCharacters + 1).join('');
  const boundary = prefix.slice(0, maxCharacters).replace(/\s+\S*$/u, '').trimEnd();
  return { preview: `${boundary || characters.slice(0, maxCharacters).join('')}…`, truncated: true };
}
```

- [ ] **Step 4: Run pure tests**

Run: `node --test test/conversation-history.test.js`

Expected: PASS for invalid scalar replacement, entities, NFKC, zero-width characters, whitespace, empty values, word boundaries, and Unicode bounds.

- [ ] **Step 5: Commit preview normalization**

```bash
git add src/message-preview.js test/conversation-history.test.js
git commit -m "feat: normalize conversation previews"
```

### Task 2: Gmail and Outlook conversation-history adapters

**Files:**
- Modify: `src/gmail.js`
- Modify: `src/mail-sources.js`
- Modify: `test/mail-sources.test.js`

**Interfaces:**
- Consumes: `normalizeMessagePreview` and active Phase 2 provider connections.
- Produces: provider source method `fetchConversation({ nativeConversationId, deliveryMessageIds, signal }): Promise<{ messages, truncated }>`.

- [ ] **Step 1: Write failing adapter contract tests**

```js
test('Gmail history returns chronological Inbox and Sent previews and excludes digest/drafts/trash', async () => {
  const result = await source.fetchConversation({ nativeConversationId: 'thread-1', deliveryMessageIds: ['<lf-token@app.test>'] });
  assert.deepEqual(result.messages.map(item => item.direction), ['received', 'sent']);
  assert.equal(result.messages.some(item => item.internetMessageId === '<lf-token@app.test>'), false);
});

test('Graph history merges paginated Inbox and Sent immutable messages', async () => {
  const result = await source.fetchConversation({ nativeConversationId: 'conversation-1', deliveryMessageIds: [] });
  assert.deepEqual(result.messages.map(item => item.providerMessageId), ['in-1', 'sent-1']);
});
```

- [ ] **Step 2: Implement bounded Gmail thread history**

Use `users.threads.get?format=full`, validate each message, include only `INBOX` or `SENT`, exclude `DRAFT`, `SPAM`, `TRASH`, and deterministic delivery Message-IDs, derive direction from `SENT`, decode safe textual/snippet content, normalize preview, and cap provider output before returning.

- [ ] **Step 3: Implement bounded Graph Inbox/Sent history**

Resolve Inbox and Sent Items, query exact `conversationId`, use immutable IDs, select only required sender/time/preview/link fields, follow bounded pagination, derive direction from folder query, exclude Deleted/Junk/Drafts, dedupe by immutable ID, and normalize previews.

- [ ] **Step 4: Run provider tests**

Run: `node --test test/mail-sources.test.js`

Expected: PASS for direction, exclusions, malformed responses, timeout, pagination, dedupe, order, bounds, and digest filtering.

- [ ] **Step 5: Commit provider history adapters**

```bash
git add src/gmail.js src/mail-sources.js test/mail-sources.test.js
git commit -m "feat: fetch provider conversation previews"
```

### Task 3: Authorized coalesced conversation history service

**Files:**
- Create: `src/conversation-history.js`
- Modify: `test/conversation-history.test.js`

**Interfaces:**
- Consumes: `resolveMailboxConnection({ organizationId, mailboxIdentityId })`, provider `fetchConversation`, delivery Message-IDs, canonical version, and local authorization rows.
- Produces: `createConversationHistoryService({ db, resolveMailboxConnection, clock?, ttlMs? })` with `getForEmail({ emailId, userId }): Promise<{ conversation }>` and `invalidateConversation(conversationId, version)`.

- [ ] **Step 1: Write failing cache, merge, and authorization tests**

```js
test('coalesces one provider request while reauthorizing each caller after await', async () => {
  const first = service.getForEmail({ emailId, userId: mayaId });
  const second = service.getForEmail({ emailId, userId: mayaId });
  resolveProvider(historyFixture);
  assert.equal(provider.fetchConversation.mock.callCount(), 1);
  assert.deepEqual(await first, await second);
});

test('reassignment during provider fetch hides the result from the former assignee', async () => {
  const pending = service.getForEmail({ emailId, userId: mayaId });
  reassignConversation(db, priyaId);
  resolveProvider(historyFixture);
  await assert.rejects(pending, error => error.status === 404);
});
```

- [ ] **Step 2: Implement preauthorization and server-derived source resolution**

Load the anchor by local ID and organization/session user; authorize admin or current canonical assignee. Enumerate `conversation_sources`, resolve the active connection through durable mailbox identity, and never accept client provider metadata.

- [ ] **Step 3: Implement tenant-safe cache and in-flight coalescing**

```js
export function createConversationHistoryService({ db, resolveMailboxConnection, clock = () => new Date(), ttlMs = 30_000 }) {
  const cache = new Map();
  const inflight = new Map();
  return {
    getForEmail: input => getAuthorizedConversation({ db, resolveMailboxConnection, cache, inflight, clock, ttlMs, ...input }),
    invalidateConversation: (conversationId, version) => invalidate(cache, conversationId, version),
  };
}
```

- [ ] **Step 4: Merge, dedupe, globally bound, and project role-specific output**

Merge all source results by scoped provider/message identity, sort by `occurredAt` then stable ID, keep latest 100, and set `truncated`. Strip original mailbox `webUrl` for members; return secure LexFlow/search actions separately. Run the same authorization query after awaiting cache/provider results.

- [ ] **Step 5: Prove retrieval is a pure read**

Snapshot emails, conversations, owners, notifications, activity, alert deliveries, sync state, and delivery tables before/after `getForEmail`; assert byte-for-byte equality.

- [ ] **Step 6: Run service tests**

Run: `node --test test/conversation-history.test.js`

Expected: PASS for source merge, latest-100 bound, role URLs, TTL, version invalidation, cross-org/equal-generation isolation, coalescing, delayed reassignment/disconnect, and no writes.

- [ ] **Step 7: Commit history service**

```bash
git add src/conversation-history.js test/conversation-history.test.js
git commit -m "feat: authorize on-demand conversation history"
```

### Task 4: History API and canonical deep link

**Files:**
- Modify: `src/app.js`
- Modify: `src/server.js`
- Modify: `test/app.test.js`

**Interfaces:**
- Consumes: `conversationHistory.getForEmail` and canonical public route resolver.
- Produces: `GET /api/emails/:id/conversation` and `/conversations/:publicId`.

- [ ] **Step 1: Write failing HTTP tests**

```js
test('conversation endpoint hides unauthorized anchors and disables shared caching', async context => {
  const response = await harness.get(`/api/emails/${emailId}/conversation`, mayaCookie);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await harness.get(`/api/emails/${emailId}/conversation`, unrelatedCookie)).status, 404);
});
```

- [ ] **Step 2: Add the provider-neutral endpoint**

```js
app.get('/api/emails/:id/conversation', async (request, response, next) => {
  try {
    const emailId = resourceId(request.params.id);
    if (!emailId) return notFound(response, 'Conversation not found.');
    const result = await conversationHistory.getForEmail({ emailId, userId: request.user.id });
    response.setHeader('Cache-Control', 'private, no-store');
    response.json(result);
  } catch (error) {
    next(safeProviderError(error));
  }
});
```

- [ ] **Step 3: Add opaque canonical deep-link resolution**

Require authenticated same-org/current-assignee access. Resolve a retained actionable anchor. Authorized callers with no anchor receive `410 Gone`; unauthorized callers receive `404`; no provider request occurs in either case. Generate every URL from configured `appBaseUrl`, never request Host.

- [ ] **Step 4: Run API tests**

Run: `node --test test/app.test.js test/conversation-history.test.js`

Expected: PASS for 401, admin/member authorization, former owner/cross-org 404, delayed post-auth failure, safe provider error, no-store, deep link, and 410.

- [ ] **Step 5: Commit history API**

```bash
git add src/app.js src/server.js test/app.test.js
git commit -m "feat: expose on-demand conversation previews"
```

### Task 5: Verified assignment-reply correlation

**Files:**
- Create: `src/delivery-correlation.js`
- Modify: `src/workflows.js`
- Modify: `test/conversations.test.js`

**Interfaces:**
- Consumes: sync message `internetMessageId`, `inReplyTo`, `references`, native source identity, deliveries, mailbox identity, registered recipient, and canonical state.
- Produces: `correlateInboundReply({ db, organizationId, mailboxIdentityId, message }): { conversationId: number } | null`.

- [ ] **Step 1: Write failing correlation security tests**

```js
test('verified digest reply joins original canonical and reopens current assignee', async () => {
  await syncMailbox({ db, source: validDigestReplySource });
  assert.equal(sourceMapping(db, replyNativeId).conversation_id, originalConversationId);
  assert.equal(canonical(db, originalConversationId).current_assignee_id, currentAssigneeId);
  assert.equal(canonical(db, originalConversationId).completion_state, 'assigned');
});

for (const fixture of [wrongSender, unknownToken, multiCanonical, foreignOrg, foreignMailbox, conflictingSource, subjectOnly]) {
  test(`rejects ${fixture.name}`, async () => {
    await syncMailbox({ db, source: fixture.source });
    assert.notEqual(sourceMapping(db, fixture.nativeId).conversation_id, originalConversationId);
  });
}
```

- [ ] **Step 2: Parse only well-formed LexFlow Message-ID tokens**

Normalize bracketed RFC Message-IDs, extract the exact 128-bit token shape, hash/lookup without timing-dependent plaintext comparisons, and require all referenced LexFlow tokens to resolve one canonical conversation.

- [ ] **Step 3: Enforce sender, delivery, mailbox, and source checks**

Require same organization and durable mailbox identity; sender equals registered recipient email; delivery is `accepted` or `unknown` with started attempt; and the full native source is unmapped or already the same canonical. On any ambiguity, return null, follow normal intake, and record only a sanitized admin security event.

- [ ] **Step 4: Correlate before rule evaluation and reopen current assignee**

In `syncMailbox`, run correlation after retaining the message but before fallback/native source canonical creation. Attach the native source to the original canonical and reopen the current assignee. Never restore the delivery recipient if the canonical assignee changed.

- [ ] **Step 5: Run workflow correlation tests**

Run: `node --test test/conversations.test.js`

Expected: PASS for valid reply across legitimate reconnect and every forged/ambiguous/cross-tenant case; outbound messages still do not reopen.

- [ ] **Step 6: Commit correlation**

```bash
git add src/delivery-correlation.js src/workflows.js test/conversations.test.js
git commit -m "feat: correlate assignment email replies"
```

### Task 6: Shared accordion and drawer timeline UI

**Files:**
- Create: `public/conversation-cache.js`
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Create: `test/conversation-ui-state.test.js`

**Interfaces:**
- Consumes: bootstrap `conversationId/publicId/version`, `GET /api/emails/:id/conversation`, and role-specific actions.
- Produces: coalesced inline/drawer timeline with stable focus/scroll/polling.

- [ ] **Step 1: Write failing browser-state unit tests**

```js
test('accordion and drawer coalesce while stale selection ignores late result', async () => {
  const cache = createConversationCache({ fetchConversation });
  const inline = cache.load(anchor);
  const drawer = cache.load(anchor);
  assert.equal(fetchConversation.mock.callCount(), 1);
  cache.select(otherAnchor);
  resolveFetch(conversationFixture);
  assert.equal((await inline).stale, true);
  assert.equal((await drawer).stale, true);
});
```

- [ ] **Step 2: Implement browser cache/in-flight/version state**

```js
export function createConversationCache({ fetchConversation, now = Date.now, ttlMs = 30_000 }) {
  const entries = new Map();
  const inflight = new Map();
  return { load, invalidateVersion, closeSelection, entryFor };
}
```

Persist expanded canonical keys across refresh, invalidate immediately on version change, and abort/ignore late responses after drawer close or selection change.

- [ ] **Step 3: Add reusable semantic timeline markup**

The inline controlled region and drawer each render an `<ol>` of `<li><article>` cards with sender heading, explicit Received/Sent label, `<time datetime>`, preview text, and optional separate provider action. Use text nodes only. Loading uses `aria-busy`; feedback is polite; Retry is a real 44px button.

- [ ] **Step 4: Integrate load, fallback replacement, focus, and scroll**

Expanding or opening the drawer invokes the same cache. Local Inbox child rows remain until success, then are replaced rather than duplicated. Polling retains expansion, focused message ID, drawer selection and scroll. If a new reply arrives away from the bottom, show `New reply — Show` without moving focus/scroll.

- [ ] **Step 5: Style full-width accessible cards**

Use current card/radius/tokens. Direction has text plus secondary tint, not color alone. `white-space: pre-wrap` and `overflow-wrap:anywhere`; no nested timeline scroller. Stack metadata/actions cleanly at 375px and 320px.

- [ ] **Step 6: Run UI state/full tests and browser smoke**

Run: `node --test test/conversation-ui-state.test.js && node --check public/app.js && npm test`

Verify desktop/mobile accordion and drawer, Sent/Received copy, text-only hostile HTML, loading/empty/error/Retry, coalescing, poll refresh, focus, scroll, new-reply action, and no horizontal overflow.

- [ ] **Step 7: Commit timeline UI**

```bash
git add public/conversation-cache.js public/index.html public/app.js public/styles.css test/conversation-ui-state.test.js
git commit -m "feat: show on-demand conversation timeline"
```

### Task 7: Documentation and final release gate

**Files:**
- Modify: `README.md`
- Test: all test files

**Interfaces:**
- Consumes: all three implementation phases.
- Produces: complete verified organization/mailbox/conversation workflow.

- [ ] **Step 1: Run all automated tests**

Run: `npm test`

Expected: every legacy, organization, delivery, provider, correlation, history, and UI-state test passes.

- [ ] **Step 2: Run privacy and bounded-load database checks**

Assert each organization retains `<=500` Inbox rows, no Sent provider messages appear in `emails`, every canonical/connection/user reference matches organization, provider grants remain encrypted, and no response/log fixture contains refresh tokens, OAuth codes, invite tokens, or provider raw bodies.

- [ ] **Step 3: Run end-to-end browser verification**

Register organization/admin; approve and register member; connect/reconnect provider with read/send; sync; rule-assign; observe one accepted digest; open member timeline; send an admin-mailbox Sent reply and confirm context-only; reply to digest and confirm canonical reopen/current assignee; reassign and confirm former access 404. Repeat critical layout checks at 1280px, 375px, and 320px.

- [ ] **Step 4: Document privacy and preview limits**

Explain admin-only sync, assigned-only user visibility, 500 actionable Inbox cap, 100-message/320-character on-demand preview bounds, Sent context behavior, secure LexFlow/provider-search links, correlation rules, and unsupported full bodies/attachments/reply-from-LexFlow.

- [ ] **Step 5: Commit final documentation**

```bash
git add README.md
git commit -m "docs: explain conversation history"
```
