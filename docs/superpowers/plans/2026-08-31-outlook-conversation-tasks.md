# Outlook Conversation Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert LexFlow's per-message workflow into Outlook-native conversation tasks that group replies, reopen completed work safely, preserve audit history, and reconcile assignment-source metrics.

**Architecture:** Add a focused `src/conversations.js` domain module and conversation/assignment-cycle tables while retaining `emails` as immutable message content. Graph ingestion resolves each new message into a scoped conversation and performs any reopening transition transactionally; APIs and the browser UI consume conversation summaries and load thread messages on demand.

**Tech Stack:** Node.js 22+, Express 5, `node:sqlite` `DatabaseSync`, Microsoft Graph delta API, browser-native JavaScript/CSS, Chart.js, Node test runner.

## Global Constraints

- Outlook `conversationId` is authoritative and scoped by organization, department, provider, and shared mailbox.
- Subject fallback is limited to records without a native identifier and includes normalized sender plus a rolling 30-day window.
- Assignment and completion apply to conversations; messages retain provider content and Outlook links.
- A completed conversation reopens only for a newly inserted provider message.
- Reopening restores an active previous department assignee, then tries current rules, then remains unassigned.
- Existing LexFlow typography, cards, tags, status dots, spacing, dialogs, and notification toasts remain the visual foundation.
- OrgAdmins never gain access to department email content.
- Metrics assignment-source rows must sum exactly to the assignment summary.

---

## File structure

- Create `src/conversations.js`: conversation identity, migration backfill helpers, summary queries, message queries, and workflow transitions.
- Modify `src/db.js`: schema, indexes, migration sequencing, event constraints, and safe historical backfill.
- Modify `src/mail-sources.js`: request and map Outlook conversation identifiers.
- Modify `src/workflows.js`: connect sync insertion/rule matching to conversation transitions; delegate assignment/completion operations.
- Modify `src/app.js`: return conversation summaries, add message endpoint, and make assignment/completion routes conversation-based.
- Modify `src/reporting-events.js`: record assignment cycles and reopened events.
- Modify `src/metrics.js`: calculate cycle outcomes and add reopened/historical attribution categories.
- Modify `public/app.js`: render collapsible conversation rows and fetch messages on expansion.
- Modify `public/styles.css`: add restrained nested-thread styles based on existing email rows.
- Modify `public/index.html`: update dialog labels and thread accessibility copy where required.
- Create `test/conversations.test.js`: domain, migration, idempotency, and reopening tests.
- Modify `test/mail-sources.test.js`, `test/app.test.js`, `test/metrics.test.js`, `test/ui-copy.test.js`: provider, API, reporting, and UI regressions.

### Task 1: Persist conversation tasks and assignment cycles

**Files:**
- Create: `src/conversations.js`
- Modify: `src/db.js`
- Create: `test/conversations.test.js`

**Interfaces:**
- Produces: `normalizeFallbackSubject(subject: string): string`.
- Produces: `conversationIdentity(message, context): { nativeConversationId: string|null, fallbackKey: string|null }`.
- Produces: `backfillConversations(db, now?: Date): void`.
- Produces tables `conversations`, `conversation_messages`, and `assignment_cycles` plus `conversation_id` on `task_events`, `activity`, and `notifications`.

- [ ] **Step 1: Write failing schema and identity tests**

```js
test('native Outlook identity is mailbox and tenant scoped', () => {
  const identity = conversationIdentity(
    { conversationId: 'AAQk-thread', subject: 'Re: NDA', senderAddress: 'a@example.com' },
    { organizationId: 2, departmentId: 4, provider: 'outlook', mailboxAddress: 'legal@example.com', receivedAt: '2026-08-31T10:00:00Z' },
  );
  assert.deepEqual(identity, { nativeConversationId: 'AAQk-thread', fallbackKey: null });
});

test('fallback identity normalizes reply prefixes and uses a 30-day bucket', () => {
  const identity = conversationIdentity(
    { conversationId: null, subject: ' RE:  NDA Review ', senderAddress: 'A@Example.com' },
    { organizationId: 2, departmentId: 4, provider: 'demo', mailboxAddress: 'legal@example.com', receivedAt: '2026-08-31T10:00:00Z' },
  );
  assert.match(identity.fallbackKey, /nda review\|a@example\.com\|/);
});

test('database creates conversation and assignment-cycle storage', () => {
  const db = createDatabase(':memory:');
  assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='conversations'").get());
  assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='assignment_cycles'").get());
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --test test/conversations.test.js`

Expected: FAIL because `src/conversations.js` and the new tables do not exist.

- [ ] **Step 3: Add the minimal schema and identity module**

```js
export function normalizeFallbackSubject(subject) {
  return String(subject || '(No subject)')
    .replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

export function conversationIdentity(message, context) {
  const nativeConversationId = String(message.conversationId ?? '').trim() || null;
  if (nativeConversationId) return { nativeConversationId, fallbackKey: null };
  const bucket = Math.floor(Date.parse(context.receivedAt) / (30 * 24 * 60 * 60 * 1000));
  const sender = String(message.senderAddress ?? '').trim().toLocaleLowerCase();
  return { nativeConversationId: null, fallbackKey: `${normalizeFallbackSubject(message.subject)}|${sender}|${bucket}` };
}
```

Add tenant-scoped foreign keys and indexes for `(organization_id, department_id, provider, normalized_mailbox, native_conversation_id)`, conversation status/assignee, conversation messages, and assignment cycles. Extend `task_events.event_type` through a table migration so `reopened` is valid.

- [ ] **Step 4: Implement idempotent historical backfill tests and code**

Test that one-message conversations preserve status/assignee/completion, native IDs merge only inside the same mailbox scope, fallback collisions outside the same sender/window remain separate, and running `backfillConversations` twice changes no row counts. Implement the backfill inside `BEGIN IMMEDIATE`, suppressing activity and notifications.

- [ ] **Step 5: Run database tests**

Run: `node --test test/conversations.test.js test/reporting-events.test.js test/tenants.test.js`

Expected: PASS.

- [ ] **Step 6: Commit the persistence layer**

```bash
git add src/conversations.js src/db.js test/conversations.test.js test/reporting-events.test.js
git commit -m "feat: add conversation task persistence"
```

### Task 2: Ingest Outlook conversation identity and reopen replies

**Files:**
- Modify: `src/mail-sources.js`
- Modify: `src/workflows.js`
- Modify: `src/conversations.js`
- Modify: `src/reporting-events.js`
- Modify: `test/mail-sources.test.js`
- Modify: `test/conversations.test.js`

**Interfaces:**
- Consumes: `conversationIdentity`, conversation tables, existing `matchRule` and assignment validation.
- Produces: `ingestConversationMessage({ db, message, source, organizationId, departmentId, rules, now, suppressTransitions? }): { insertedMessage: boolean, conversationId: number, reopened: boolean, assignmentSource: string|null }`.
- Produces: `recordReopenedTaskEvent(...)` through the existing reporting-event boundary.

- [ ] **Step 1: Write failing Graph mapping tests**

```js
assert.equal(new URL(graphRequests[0].url).searchParams.get('$select'),
  'id,conversationId,internetMessageId,subject,from,receivedDateTime,bodyPreview,webLink');
assert.equal(result.messages[0].conversationId, 'AAQk-thread');
assert.equal(result.messages[0].internetMessageId, '<reply@example.com>');
```

- [ ] **Step 2: Run provider tests and verify failure**

Run: `node --test test/mail-sources.test.js`

Expected: FAIL because Graph does not request or map the two identifiers.

- [ ] **Step 3: Map native identifiers**

Update the Graph `$select` and `mapGraphMessage` return object with `conversationId` and `internetMessageId`. Preserve existing immutable provider ID and web-link behavior.

- [ ] **Step 4: Write failing reopening tests**

Cover these exact cases: a new reply keeps an assigned thread assigned; an update to a known provider message does not reopen; a new reply reopens completed work to the previous active assignee; a disabled/moved assignee invokes rules; no matching rule leaves it unassigned; a replay does not create a second `reopened` event.

- [ ] **Step 5: Implement transactional ingestion and reopening**

```js
if (!insertedMessage || suppressTransitions || conversation.status !== 'completed') {
  return { insertedMessage, conversationId: conversation.id, reopened: false, assignmentSource: null };
}
const previous = eligiblePreviousAssignee(db, conversation);
if (previous) return reopenToPreviousAssignee(db, conversation, previous, message, now);
const rule = matchRule(message, rules);
if (rule) return reopenByRule(db, conversation, rule, message, now);
return reopenUnassigned(db, conversation, message, now);
```

All branches update the conversation version conditionally, create the new assignment cycle when assigned, preserve the previous completion cycle, record activity/reporting, and insert the approved assignee-or-DepAdmin notification.

- [ ] **Step 6: Run sync and conversation tests**

Run: `node --test test/conversations.test.js test/mail-sources.test.js test/outlook.test.js test/alerts.test.js`

Expected: PASS.

- [ ] **Step 7: Commit ingestion and lifecycle behavior**

```bash
git add src/mail-sources.js src/workflows.js src/conversations.js src/reporting-events.js test/mail-sources.test.js test/conversations.test.js
git commit -m "feat: group Outlook replies and reopen tasks"
```

### Task 3: Expose tenant-safe conversation APIs

**Files:**
- Modify: `src/app.js`
- Modify: `src/workflows.js`
- Modify: `src/conversations.js`
- Modify: `test/app.test.js`
- Modify: `test/tenants.test.js`

**Interfaces:**
- Consumes: conversation summaries and lifecycle functions from `src/conversations.js`.
- Produces: `listVisibleConversations(db, user): ConversationSummary[]`.
- Produces: `listVisibleConversationMessages(db, user, conversationId): ConversationMessage[]|null`.
- Produces: `GET /api/conversations/:id/messages`, `POST /api/conversations/:id/assign`, and `POST /api/conversations/:id/complete`.

- [ ] **Step 1: Write failing role and payload tests**

Assert bootstrap returns one conversation for two same-thread messages, includes `messageCount: 2` and latest preview, and excludes full historical message bodies. Assert the messages endpoint returns oldest-to-newest. Assert a Member, DepAdmin, OrgAdmin, cross-department user, and cross-tenant user receive the approved visibility behavior.

- [ ] **Step 2: Run API tests and verify failure**

Run: `node --test test/app.test.js test/tenants.test.js`

Expected: FAIL because the conversation routes and payloads do not exist.

- [ ] **Step 3: Implement summary and message queries**

Return the fields `id`, `subject`, `status`, `assignee`, `firstReceivedAt`, `latestReceivedAt`, `messageCount`, `latestMessage`, `completedAt`, and `reopened`. Apply organization and role predicates before resolving the resource; return hidden-resource `404` when it is outside scope.

- [ ] **Step 4: Convert assignment/completion routes**

Use conversation ID as the workflow resource and require the current version/status in updates. Preserve the current DepAdmin assignment and assignee-only completion policies. Keep the existing per-message `/api/emails/:id/open-link` route for nested message actions.

- [ ] **Step 5: Run API regression tests**

Run: `node --test test/app.test.js test/tenants.test.js test/workspace.test.js test/alerts.test.js`

Expected: PASS.

- [ ] **Step 6: Commit the API conversion**

```bash
git add src/app.js src/workflows.js src/conversations.js test/app.test.js test/tenants.test.js
git commit -m "feat: expose conversation task APIs"
```

### Task 4: Render collapsible threads in the existing UI

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Modify: `public/index.html`
- Modify: `test/ui-copy.test.js`
- Create: `test/conversation-ui-model.test.js`

**Interfaces:**
- Consumes: `ConversationSummary[]` from bootstrap and `GET /api/conversations/:id/messages`.
- Produces: `conversationRows(conversations, filters)` and cached per-conversation message state.

- [ ] **Step 1: Write failing UI-model tests**

```js
test('overview limits conversations rather than messages', () => {
  assert.equal(conversationPreview(sixConversations, 5).items.length, 5);
});

test('conversation search matches nested participants and previews', () => {
  assert.equal(conversationMatchesSearch(threadWithReply, 'vendor counsel'), true);
});
```

Also assert source contains accessible `aria-expanded`, message-count copy, a `Reopened` tag, and conversation assignment/completion API paths.

- [ ] **Step 2: Run UI tests and verify failure**

Run: `node --test test/conversation-ui-model.test.js test/ui-copy.test.js`

Expected: FAIL because conversation rendering helpers and controls are absent.

- [ ] **Step 3: Implement collapsed thread rows**

Adapt `renderEmailRow` into a conversation row using the existing classes and add a chevron button with `aria-expanded`. Keep status dots, source/department/status tags, assignee block, and current spacing. The five-entry overview limit receives conversations.

- [ ] **Step 4: Implement lazy expansion**

On first expansion, call `/api/conversations/:id/messages`, cache the result, and render nested rows oldest-to-newest. Give each message its own Open in Outlook action via the existing resolver. Report fetch/link failures through `reportError` and the global notification toast.

- [ ] **Step 5: Add minimal thread styles and workflow controls**

Add `.conversation-row`, `.conversation-toggle`, `.conversation-messages`, and `.conversation-message` styles derived from `.email-row`; avoid new colors or card geometry. Move assign/complete dialog operations to the selected conversation while retaining current button and form styles.

- [ ] **Step 6: Run UI and browser-independent regressions**

Run: `node --test test/conversation-ui-model.test.js test/ui-copy.test.js test/feedback.test.js test/metrics-model.test.js`

Expected: PASS.

- [ ] **Step 7: Commit the threaded UI**

```bash
git add public/app.js public/styles.css public/index.html test/conversation-ui-model.test.js test/ui-copy.test.js
git commit -m "feat: render collapsible conversation tasks"
```

### Task 5: Reconcile conversation-cycle metrics

**Files:**
- Modify: `src/metrics.js`
- Modify: `src/reporting-events.js`
- Modify: `test/metrics.test.js`
- Modify: `test/reporting-events.test.js`

**Interfaces:**
- Consumes: `assignment_cycles`, conversation-aware task events, and rule-attribution events.
- Produces assignment-source rows with `source` values `rule`, `manual`, `reopen_previous`, and `historical_unknown`.

- [ ] **Step 1: Write a failing reconciliation test**

```js
const result = getDepartmentMetrics(fixtureWithNineRuleOneManualTwoHistorical);
assert.equal(card(result, 'assigned').value, 12);
assert.deepEqual(result.rulePerformance.map(row => [row.label, row.assignments]), [
  ['Signatory Requests', 5],
  ['ACME Corp Requests', 4],
  ['Manual assignment', 1],
  ['Historical / unknown source', 2],
]);
assert.equal(result.rulePerformance.reduce((sum, row) => sum + row.assignments, 0), 12);
```

Add a reopened-cycle fixture and assert previous-assignee restoration appears as `Reopened to previous assignee`, while rule-based reopening remains attributed to that rule.

- [ ] **Step 2: Run metrics tests and verify failure**

Run: `node --test test/metrics.test.js test/reporting-events.test.js`

Expected: FAIL because source-less assignments are omitted and reopened cycles are unsupported.

- [ ] **Step 3: Calculate outcomes per assignment cycle**

Use cycle start/completion timestamps for completion rates and resolution durations. Do not overwrite an earlier completed cycle when the conversation reopens.

- [ ] **Step 4: Add explicit source buckets**

For assignment events in range, place verified rule links in rule rows, `manual` in Manual assignment, `reopen_previous` in Reopened to previous assignee, and null/backfill sources in Historical / unknown source. Add an invariant test that source totals equal the assigned card.

- [ ] **Step 5: Run all metrics tests**

Run: `node --test test/metrics.test.js test/metrics-model.test.js test/reporting-events.test.js`

Expected: PASS.

- [ ] **Step 6: Commit reporting changes**

```bash
git add src/metrics.js src/reporting-events.js test/metrics.test.js test/reporting-events.test.js
git commit -m "fix: reconcile conversation assignment metrics"
```

### Task 6: Full migration and browser verification

**Files:**
- Modify: `README.md`
- Modify: tests named in Tasks 1-5 if full-suite regressions expose fixture assumptions.

**Interfaces:**
- Consumes: completed conversation feature.
- Produces: verified migration instructions and a runnable local application.

- [ ] **Step 1: Add operational documentation**

Document the native conversation fields, migration/backfill behavior, rollback prerequisite (database backup), thread-level task semantics, and the fact that sync updates do not reopen known messages.

- [ ] **Step 2: Run static and full automated checks**

Run: `git diff --check && npm test`

Expected: zero whitespace errors and all tests PASS.

- [ ] **Step 3: Verify migration against a disposable database copy**

```bash
verification_dir="$(mktemp -d)"
cp data/lexflow.db "$verification_dir/lexflow.db"
DATABASE_PATH="$verification_dir/lexflow.db" node -e "import('./src/db.js').then(({createDatabase}) => createDatabase(process.env.DATABASE_PATH).close())"
sqlite3 "$verification_dir/lexflow.db" "PRAGMA foreign_key_check; PRAGMA integrity_check;"
```

Expected: no foreign-key rows and `ok` from integrity check.

- [ ] **Step 4: Start the local app and perform role-aware browser smoke tests**

Run the application on `http://localhost:3000`. Verify as DepAdmin that same-conversation messages render as one collapsed row, expansion orders replies correctly, and assignment works. Verify as Member that only assigned threads are visible and completion works. Verify OrgAdmin cannot see message content. Trigger a fixture reply to a completed thread and confirm reopening, notification, and prior-assignee behavior.

- [ ] **Step 5: Verify metrics in the browser**

Open the 30-day Rules metrics view and confirm the assignment summary equals the sum of rule, manual, reopened-previous, and historical/unknown rows. Confirm empty categories are hidden unless they contain assignments.

- [ ] **Step 6: Commit documentation and final test adjustments**

```bash
git add README.md test
git commit -m "test: verify Outlook conversation workflows"
```

- [ ] **Step 7: Review final branch state**

Run: `git status --short && git log --oneline -8`

Expected: clean working tree and the conversation-task commits visible in order.
