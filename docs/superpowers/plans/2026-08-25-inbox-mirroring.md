# Inbox Mirroring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove provider-confirmed Inbox removals from every LexFlow dashboard view during the same successful sync that advances the provider cursor.

**Architecture:** Extend the existing mail-source response with optional scoped removal IDs. Translate Microsoft Graph tombstones and Gmail delete/Inbox-label history into that contract, then delete matching local emails transactionally before the existing upsert, retention, automation, and cursor work. Rely on existing foreign keys and bootstrap rendering instead of adding schema or UI machinery.

**Tech Stack:** Node.js, Microsoft Graph REST, Gmail REST, built-in `node:sqlite`, built-in `node:test`, static JavaScript frontend.

## Global Constraints

- Mirror provider Inbox membership: deletion, archive, move, and trash remove the local email.
- Never infer deletion from absence in Gmail's bounded 500-message bootstrap or expired-history recovery.
- Reconcile existing retained Gmail and Outlook rows once per live source through direct authoritative membership checks; never repeat those scans during normal polling.
- Force Gmail reconciliation again after an expired-history fallback so removals in the lost history window cannot remain locally.
- Scope every deletion by provider ID, provider, and case-insensitive mailbox address.
- Commit removals and the source cursor atomically; stale or failed sources commit nothing.
- Preserve activity text and sticky thread owners; retain existing foreign-key cascades for notifications and alert deliveries.
- Change no rule, retention, department, timing, credential, polling, or UI setting.
- Add no dependency or schema migration.

---

### Task 1: Provider removal events

**Files:**
- Modify: `src/mail-sources.js`
- Modify: `src/gmail.js`
- Modify: `test/mail-sources.test.js`

**Interfaces:**
- Produces: `fetchChanges(cursor) -> { messages, removedProviderIds, nextCursor }`
- Produces: Gmail provider IDs in the existing `gmail:<lowercase-account>:<raw-id>` format.
- Produces: `GmailMailSource.reconcileInbox(providerIds)` and `GraphMailSource.reconcileInbox(providerIds)`, each returning `{ presentProviderIds, removedProviderIds }` and exposing a stable mailbox-scoped `reconciliationKey`.

- [ ] **Step 1: Add failing Graph and Gmail source tests**

Add a Graph delta fixture containing a normal message and `{ id: 'gone-id', '@removed': { reason: 'deleted' } }`; assert the message remains in `messages`, `gone-id` appears in `removedProviderIds`, and the final delta cursor is returned.

Add Gmail history fixtures containing `messagesDeleted`, an `INBOX` `labelsRemoved`, a non-Inbox `labelsRemoved`, and an Inbox addition. Assert all four `historyTypes` query values are sent, `labelId` is absent, removal IDs are account-namespaced, and the output collections are disjoint.

- [ ] **Step 2: Run the focused source suite and verify failure**

Run:

```bash
node --test test/mail-sources.test.js
```

Expected: FAIL because sources do not expose provider removals and Gmail filters history to currently labelled Inbox messages.

- [ ] **Step 3: Implement the minimal Graph adapter change**

Walk delta entries in response order. For a valid `@removed` entry, remove that ID from the message map and add it to a removal set. For a valid live entry, map it, replace its message-map entry, and remove it from the removal set. Return:

```js
return {
  messages: [...messagesById.values()],
  removedProviderIds: [...removedProviderIds],
  nextCursor,
};
```

Make `MockMailSource` return `removedProviderIds: []` for a consistent built-in contract.

- [ ] **Step 4: Implement Gmail history-state mapping**

Factor the existing provider-ID formatting into one helper. Request:

```js
for (const historyType of [
  'messageAdded',
  'messageDeleted',
  'labelAdded',
  'labelRemoved',
]) {
  url.searchParams.append('historyTypes', historyType);
}
```

Do not set `labelId`. Validate each specific history array when present. Process chronological history records into `Map<rawId, 'present' | 'removed'>`; Inbox additions set `present`, hard deletion or removal of `INBOX` sets `removed`, and unrelated label changes do nothing. Fetch details only for final `present` IDs, then return final `removed` IDs in namespaced form. Full sync returns `removedProviderIds: []`.

When incremental Gmail history returns 404, return the bounded full-sync result with `reconciliationRequired: true`. Direct initial full sync remains unforced.

- [ ] **Step 5: Run focused tests**

Before the focused run, add a Gmail reconciliation fixture with one current Inbox ID and one 404/non-Inbox ID. Assert every requested namespaced ID is classified exactly once. Missing labels, mismatched IDs, or invalid incremental metadata must fail rather than silently advance history; keep the bounded full bootstrap's existing per-message tolerance.

Add a Graph reconciliation fixture whose folder-scoped Inbox requests return one exact immutable ID and one 404. Assert the first ID is present, the second is removed, the Inbox well-known folder and mailbox are encoded in the URL, and the immutable-ID preference header is sent. Process IDs in bounded batches and fail the reconciliation on any other status or malformed/mismatched response.

Run:

```bash
node --test test/mail-sources.test.js
```

Expected: all source tests pass, including bounded bootstrap, rate limiting, stale history, Graph delta, and removal events.

---

### Task 2: Atomic scoped deletion workflow

**Files:**
- Modify: `src/workflows.js`
- Modify: `test/conversations.test.js`

**Interfaces:**
- Consumes: `removedProviderIds?: string[]` from Task 1.
- Consumes: optional `source.reconciliationKey` and `source.reconcileInbox(providerIds)` from Task 1.
- Preserves: `syncMailbox({ db, source }) -> { imported, assigned }` public result.

- [ ] **Step 1: Add failing workflow tests**

Seed a Gmail email with assignment notification, alert delivery, activity, and thread owner. Sync a source returning its provider ID in `removedProviderIds` and a new cursor. Assert the email, notification, and alert delivery are gone; activity remains with `email_id = NULL`; the owner remains; and the cursor advances.

Seed another provider/mailbox row and include its provider ID in the same source's removal list. Assert it remains because the source scope does not match.

Create a trigger that aborts the cursor update and assert the email deletion rolls back with the old cursor intact.

- [ ] **Step 2: Run the focused workflow suite and verify failure**

Run:

```bash
node --test test/conversations.test.js
```

Expected: FAIL because `syncMailbox` ignores removal IDs.

- [ ] **Step 3: Validate the source response before transaction entry**

Default an omitted removal list to `[]`. Reject a non-array, blank/non-string IDs, duplicate ambiguity between `messages` and removals, or a nonempty removal list without a nonblank provider and mailbox address using `INVALID_SYNC_RESPONSE`/502. Deduplicate valid IDs.

When a source exposes a reconciliation key and operation and that key is absent from `sync_state`, load only the local provider IDs in the source's provider/mailbox scope. After the normal delta request, call the reconciliation operation and validate that its present/removed arrays are strings, disjoint, limited to the requested set, and exhaustively cover that set. Current membership takes precedence over the earlier delta result. A malformed or incomplete reconciliation fails before transaction entry.

Validate optional `reconciliationRequired` as a boolean. A `true` response forces the same reconciliation path even when the completion marker already exists; reject it when the source lacks a reconciliation key or operation. This flag is used only by abnormal cursor recovery and does not affect ordinary incremental polling.

- [ ] **Step 4: Delete only the source's rows inside the existing sync transaction**

Before calling `selectFetchedChanges`, execute a prepared delete once per removal ID:

```sql
DELETE FROM emails
WHERE provider_id = ?
  AND provider = ? COLLATE NOCASE
  AND mailbox_address = ? COLLATE NOCASE
```

Keep the existing stale-connection check at the beginning of the transaction. Do not delete thread owners or create activity for provider removals. Continue through upserts, retention, automation, and cursor updates in the same transaction.

Store the source's reconciliation key in `sync_state` at the end of that same successful transaction. A rollback or stale connection therefore leaves the marker absent so the authoritative check retries later. Gmail authorization completion and disconnect clear the marker together with the Gmail cursor.

- [ ] **Step 5: Run focused and full tests**

Run:

```bash
node --test test/conversations.test.js
npm test
```

Expected: all tests pass and existing sync result shapes remain compatible.

---

### Task 3: Runtime verification

**Files:**
- Modify: `public/app.js`

**Interfaces:**
- Consumes: refreshed `state.session.emails`.
- Produces: stale selected-email reconciliation during `refresh()`.

- [ ] **Step 1: Close a selected email that disappears during refresh**

Immediately after assigning the new bootstrap payload to `state.session`, check whether `state.selectedEmailId` is still present. When it is absent, clear the selected ID and opener, close an open email dialog, and after rendering move focus to `#page-title`. Announce the change through the existing toast region with provider-neutral copy such as `This email is no longer available.`

Do not close the dialog when the email remains present, and do not add controls or change polling cadence.

- [ ] **Step 2: Run static and whitespace checks**

Run:

```bash
node --check src/mail-sources.js
node --check src/gmail.js
node --check src/workflows.js
git diff --check
```

Expected: every command exits successfully.

- [ ] **Step 3: Restart LexFlow and exercise one sync**

Restart the existing local server, log in with the documented local admin credentials, and trigger one mail sync. Confirm `/api/bootstrap` succeeds and the dashboard has no new console error.

- [ ] **Step 4: Verify live state safely**

Confirm source cursors and per-source success/error keys remain valid, the workspace contains no more than 500 emails, and the server stays available on `http://127.0.0.1:3000/`. Do not inspect or print OAuth tokens or email bodies.
