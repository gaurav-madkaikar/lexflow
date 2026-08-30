# Thread Interaction, Attachment Rules, and Timezone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Outlook conversations row-expandable, route them using persisted whole-thread attachment state, and render/filter/report all times in the OrgAdmin-configured IANA timezone with an `Asia/Kolkata` default.

**Architecture:** Microsoft Graph's `hasAttachments` Boolean is stored on each email and rolled up transactionally onto its conversation. Rule matching consumes the conversation aggregate through one normalized message contract. Browser date handling moves into a small shared module that always receives an explicit timezone and 12-hour clock preference, while a small conversation interaction helper keeps parent-row toggling distinct from child-message opening.

**Tech Stack:** Node.js 22, Express 5, `node:sqlite`, Luxon 3, Microsoft Graph delta API, browser ES modules, Node's built-in test runner.

## Global Constraints

- Keep UTC ISO strings as the storage format for timestamps.
- Use valid IANA timezone identifiers; default new and formerly default-UTC organizations to `Asia/Kolkata`.
- Preserve every existing non-UTC organization timezone.
- Use the organization timezone for all organization-scoped display, filtering, and metrics boundaries; use `Asia/Kolkata` for PlatformAdmin.
- Render every clock time in 12-hour format with AM/PM.
- Use Microsoft Graph `hasAttachments`; inline-only signature images do not count.
- A conversation has attachments when any linked message has a non-inline attachment.
- Rule attachment matching is strict: off matches no attachments, on matches one or more attachments.
- Existing rules migrate to off and therefore do not match attachment-bearing conversations.
- Preserve the existing LexFlow visual language and role/tenant confidentiality boundaries.

---

### Task 1: Persist attachment state and migrate organization timezone defaults

**Files:**
- Modify: `src/db.js`
- Modify: `src/tenants.js`
- Modify: `test/conversations.test.js`
- Modify: `test/tenants.test.js`
- Modify: `test/reporting-events.test.js`

**Interfaces:**
- Consumes: existing `addColumn(db, table, column, definition)` and database initialization transaction.
- Produces: `emails.has_attachments: 0 | 1`, `conversations.has_attachments: 0 | 1`, `rules.has_attachments: 0 | 1`, and `organizationPayload(...).timezone` defaulting to `Asia/Kolkata`.

- [ ] **Step 1: Write failing migration and default tests**

Add assertions that a fresh database exposes all three checked Boolean columns, fresh organizations default to IST, UTC organizations migrate to IST, and non-UTC zones remain unchanged:

```js
for (const [table, column] of [
  ['emails', 'has_attachments'],
  ['conversations', 'has_attachments'],
  ['rules', 'has_attachments'],
]) {
  assert.ok(db.prepare(`SELECT 1 FROM pragma_table_info('${table}') WHERE name = ?`).get(column));
}

assert.equal(db.prepare('SELECT timezone FROM organizations WHERE id = 1').get().timezone, 'Asia/Kolkata');

db.prepare(`INSERT INTO organizations
  (entra_tenant_id, name, domain, status, timezone, created_at, updated_at)
  VALUES (?, ?, ?, 'active', ?, ?, ?)`)
  .run('utc-tenant', 'UTC Org', 'utc.example', 'UTC', now, now);
db.prepare(`INSERT INTO organizations
  (entra_tenant_id, name, domain, status, timezone, created_at, updated_at)
  VALUES (?, ?, ?, 'active', ?, ?, ?)`)
  .run('london-tenant', 'London Org', 'london.example', 'Europe/London', now, now);

// Reopen through the normal database initializer.
assert.equal(reopened.prepare("SELECT timezone FROM organizations WHERE entra_tenant_id = 'utc-tenant'").get().timezone, 'Asia/Kolkata');
assert.equal(reopened.prepare("SELECT timezone FROM organizations WHERE entra_tenant_id = 'london-tenant'").get().timezone, 'Europe/London');
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --test test/conversations.test.js test/tenants.test.js test/reporting-events.test.js`

Expected: FAIL because attachment columns are absent and organization defaults are still `UTC`.

- [ ] **Step 3: Add idempotent schema and data migration**

Change schema defaults and migration definitions, then normalize only the former automatic default:

```js
timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
```

```js
addColumn(db, 'organizations', 'timezone', "TEXT NOT NULL DEFAULT 'Asia/Kolkata'");
addColumn(db, 'emails', 'has_attachments',
  'INTEGER NOT NULL DEFAULT 0 CHECK (has_attachments IN (0, 1))');
addColumn(db, 'conversations', 'has_attachments',
  'INTEGER NOT NULL DEFAULT 0 CHECK (has_attachments IN (0, 1))');
addColumn(db, 'rules', 'has_attachments',
  'INTEGER NOT NULL DEFAULT 0 CHECK (has_attachments IN (0, 1))');

db.exec(`
  UPDATE conversations
  SET has_attachments = CASE WHEN EXISTS (
    SELECT 1 FROM emails
    WHERE emails.conversation_id = conversations.id
      AND emails.has_attachments = 1
  ) THEN 1 ELSE 0 END;
  UPDATE organizations
  SET timezone = 'Asia/Kolkata'
  WHERE timezone = 'UTC';
`);
```

Include `has_attachments` in the fresh `emails`, `conversations`, and `rules` table definitions. Change `ensureDefaultOrganization`, `prepareOrganizationInput`, `organizationPayload`, and update fallbacks in `src/tenants.js` from `UTC` to `Asia/Kolkata`.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `node --test test/conversations.test.js test/tenants.test.js test/reporting-events.test.js`

Expected: PASS, including idempotent reopen and non-UTC preservation.

- [ ] **Step 5: Commit the persistence migration**

```bash
git add src/db.js src/tenants.js test/conversations.test.js test/tenants.test.js test/reporting-events.test.js
git commit -m "feat: persist attachment state and default organizations to IST"
```

---

### Task 2: Ingest Graph attachment state and maintain conversation aggregates

**Files:**
- Modify: `src/mail-sources.js`
- Modify: `src/workflows.js`
- Modify: `src/conversations.js`
- Modify: `test/mail-sources.test.js`
- Modify: `test/conversations.test.js`

**Interfaces:**
- Consumes: Graph message property `hasAttachments` and columns from Task 1.
- Produces: provider message property `hasAttachments: boolean`; `recomputeConversationAttachmentState(db, conversationId): 0 | 1`; `asMailMessage(row, conversation?)` with `hasAttachments`.

- [ ] **Step 1: Write failing Graph mapping and aggregate tests**

Extend the expected Graph `$select` and mapped result:

```js
assert.equal(requested.searchParams.get('$select'),
  'id,conversationId,internetMessageId,subject,from,receivedDateTime,bodyPreview,webLink,hasAttachments');
assert.equal(messages[0].hasAttachments, true);
```

Add a conversation test with two linked messages where only the older message has `has_attachments = 1`, then assert:

```js
assert.equal(
  db.prepare('SELECT has_attachments FROM conversations WHERE id = ?').get(conversationId).has_attachments,
  1,
);
```

Update that email to `0`, call the aggregate helper, and assert the conversation returns to `0`.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --test test/mail-sources.test.js test/conversations.test.js`

Expected: FAIL because Graph does not request/map the property and the conversation helper does not exist.

- [ ] **Step 3: Map and persist `hasAttachments`**

Update `mapGraphMessage` and the delta URL:

```js
return {
  // existing fields
  hasAttachments: item.hasAttachments === true,
};
```

```js
$select=id,conversationId,internetMessageId,subject,from,receivedDateTime,bodyPreview,webLink,hasAttachments
```

Add the following exported helper to `src/conversations.js` and call it from `attachEmailToConversation`, backfill, and reconciliation paths:

```js
export function recomputeConversationAttachmentState(db, conversationId) {
  db.prepare(`
    UPDATE conversations
    SET has_attachments = CASE WHEN EXISTS (
      SELECT 1 FROM emails
      WHERE emails.conversation_id = conversations.id
        AND emails.has_attachments = 1
    ) THEN 1 ELSE 0 END
    WHERE id = ?
  `).run(conversationId);
  return Number(db.prepare(
    'SELECT has_attachments FROM conversations WHERE id = ?'
  ).get(conversationId)?.has_attachments ?? 0);
}
```

Extend email insert/update statements in `syncMailbox` to write `message.hasAttachments === true ? 1 : 0`. For an already-known provider message, capture its `conversation_id`, run `recomputeConversationAttachmentState` after the update, and only then continue. For a newly inserted message, re-read the attached conversation after recomputation so all subsequent rule evaluation receives the current aggregate.

- [ ] **Step 4: Run the focused tests and verify pass**

Run: `node --test test/mail-sources.test.js test/conversations.test.js`

Expected: PASS, including update, attach, backfill, and OR aggregation behavior.

- [ ] **Step 5: Commit Graph ingestion and aggregation**

```bash
git add src/mail-sources.js src/workflows.js src/conversations.js test/mail-sources.test.js test/conversations.test.js
git commit -m "feat: aggregate Graph attachment state by conversation"
```

---

### Task 3: Apply strict attachment matching throughout automation rules

**Files:**
- Modify: `src/workflows.js`
- Modify: `src/app.js`
- Modify: `test/rule-priorities.test.js`
- Modify: `test/app.test.js`
- Modify: `test/conversations.test.js`

**Interfaces:**
- Consumes: `message.hasAttachments: boolean` and `rules.has_attachments: 0 | 1`.
- Produces: API property `rule.hasAttachments: boolean`, request property `hasAttachments: boolean`, and one strict `matchRule(message, rules)` predicate used by sync, immediate application, and reopen fallback.

- [ ] **Step 1: Write failing rule-domain tests**

Add tests proving false does not match an attachment thread, true does not match a no-attachment thread, and a true rule matches when only an older message contains an attachment:

```js
assert.equal(matchRule({ ...message, hasAttachments: true }, [
  { ...rule, has_attachments: 0 },
]), null);
assert.equal(matchRule({ ...message, hasAttachments: false }, [
  { ...rule, has_attachments: 1 },
]), null);
assert.equal(matchRule({ ...message, hasAttachments: true }, [
  { ...rule, has_attachments: 1 },
])?.id, rule.id);
```

Add API tests for create default false, create true, patch true/false, and rejection of string/number values:

```js
const invalid = await harness.post('/api/rules', depAdmin, {
  ...validRule,
  hasAttachments: 'true',
});
assert.equal(invalid.status, 422);
assert.equal(invalid.body.error.fields.hasAttachments, 'Choose whether attachments are required.');
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node --test test/rule-priorities.test.js test/app.test.js test/conversations.test.js`

Expected: FAIL because the matcher and API omit attachment criteria.

- [ ] **Step 3: Extend the shared rule predicate and reopen flow**

Normalize a message row using the conversation aggregate when available:

```js
function asMailMessage(row, conversation = null) {
  return {
    // existing fields
    hasAttachments: Boolean(conversation?.has_attachments ?? row.has_attachments),
  };
}
```

Add strict matching inside `matchRule`:

```js
const attachmentMatch = Boolean(rule.has_attachments) === Boolean(message.hasAttachments);
return keywordsMatch && senderMatch && attachmentMatch;
```

For first-message sync, completed-thread fallback, and `applyRuleToUnassigned`, pass the current conversation aggregate rather than the provider's newest-message Boolean. Preserve previous-assignee reopening precedence; rules are evaluated only if that previous member is unavailable, as today.

- [ ] **Step 4: Validate and persist the API Boolean**

In `parseRule`, default an omitted value to false and reject a supplied non-Boolean. In `parseRulePatch`, preserve the current database value when omitted and reject non-Booleans when supplied:

```js
if (body.hasAttachments !== undefined && typeof body.hasAttachments !== 'boolean') {
  return { error: 'Choose whether attachments are required.', field: 'hasAttachments' };
}
const hasAttachments = body.hasAttachments === true;
```

Add `hasAttachments` to `editableRuleFields`, `rulePayload`, `INSERT`, and `UPDATE` statements. Store `1` or `0`, and return a JSON Boolean.

- [ ] **Step 5: Run focused tests and verify pass**

Run: `node --test test/rule-priorities.test.js test/app.test.js test/conversations.test.js`

Expected: PASS for create/update validation, immediate application, sync assignment, whole-thread matching, and completed-thread fallback.

- [ ] **Step 6: Commit rule behavior**

```bash
git add src/workflows.js src/app.js test/rule-priorities.test.js test/app.test.js test/conversations.test.js
git commit -m "feat: match automation rules by thread attachments"
```

---

### Task 4: Centralize organization-timezone formatting and date boundaries

**Files:**
- Create: `public/date-time.js`
- Create: `test/date-time.test.js`
- Modify: `public/app.js`
- Modify: `public/metrics-view.js`
- Modify: `public/index.html`
- Modify: `src/app.js`
- Modify: `src/metrics.js`
- Modify: `test/metrics.test.js`
- Modify: `test/metrics-model.test.js`
- Modify: `test/app.test.js`

**Interfaces:**
- Produces: `DEFAULT_TIMEZONE = 'Asia/Kolkata'`; `formatZonedDate(value, { timezone, includeDate }): string`; `localDateKey(value, timezone): string`; `isDateKey(value): boolean`; `formatDateKey(value, { style }): string`.
- Consumes: `state.session.organization.timezone` from bootstrap and the existing Luxon metrics period contract.

- [ ] **Step 1: Write failing shared date-time tests**

Create `test/date-time.test.js` with fixed instants that cross a UTC/IST date boundary:

```js
import {
  DEFAULT_TIMEZONE,
  formatZonedDate,
  localDateKey,
} from '../public/date-time.js';

assert.equal(DEFAULT_TIMEZONE, 'Asia/Kolkata');
assert.equal(localDateKey('2026-08-30T20:30:00.000Z', 'Asia/Kolkata'), '2026-08-31');
assert.match(
  formatZonedDate('2026-08-30T20:30:00.000Z', {
    timezone: 'Asia/Kolkata', includeDate: false, locale: 'en-US',
  }),
  /2:00\sAM/i,
);
assert.match(
  formatZonedDate('2026-08-30T20:30:00.000Z', {
    timezone: 'America/New_York', includeDate: false, locale: 'en-US',
  }),
  /4:30\sPM/i,
);
```

Update metrics tests so omitted platform timezone resolves to IST and organization ranges use the authenticated organization timezone.

- [ ] **Step 2: Run date and metrics tests and verify failure**

Run: `node --test test/date-time.test.js test/metrics.test.js test/metrics-model.test.js test/app.test.js`

Expected: FAIL because the helper is absent and current fallbacks are `UTC` or browser-derived.

- [ ] **Step 3: Implement explicit timezone helpers**

Create `public/date-time.js`:

```js
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export function resolvedTimezone(value) {
  const timezone = String(value || DEFAULT_TIMEZONE);
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(0);
    return timezone;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function formatZonedDate(value, {
  timezone = DEFAULT_TIMEZONE,
  includeDate = true,
  locale,
} = {}) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat(locale, includeDate ? {
    dateStyle: 'medium', timeStyle: 'short', timeZone: resolvedTimezone(timezone), hour12: true,
  } : {
    hour: 'numeric', minute: '2-digit', timeZone: resolvedTimezone(timezone), hour12: true,
  }).format(date);
}

export function localDateKey(value, timezone = DEFAULT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolvedTimezone(timezone), year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const part = type => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function isDateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return date.toISOString().slice(0, 10) === value;
}

export function formatDateKey(value, { style = 'long', locale } = {}) {
  if (!isDateKey(value)) return '';
  const date = new Date(`${value}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(locale, style === 'short'
    ? { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
    : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
  ).format(date);
}
```

- [ ] **Step 4: Route all browser formatting through the helper**

Import the helper into `public/app.js` and `public/metrics-view.js`. Define one role-aware accessor in `public/app.js`:

```js
function sessionTimezone() {
  return state.session?.organization?.timezone || DEFAULT_TIMEZONE;
}

function formatDate(value, includeDate = true) {
  return formatZonedDate(value, { timezone: sessionTimezone(), includeDate });
}
```

Replace browser-local date-filter comparisons with `localDateKey(email.receivedAt, sessionTimezone())`, validate filter keys with `isDateKey`, and render their calendar labels with `formatDateKey`. Change `metrics-view.js::timezoneFor` so both platform fallback and missing organization values use `DEFAULT_TIMEZONE`. Pass that timezone into Metrics KPI secondary timestamps and detail-table timestamps via `formatZonedDate`; replace `localDate(new Date())` in custom-range checks with `localDateKey(new Date(), timezoneFor(context))`. Update the static metrics label and OrgAdmin timezone form fallback in `public/index.html`/`public/app.js` to `Asia/Kolkata`.

- [ ] **Step 5: Route server metric defaults through IST**

Export or define `DEFAULT_TIMEZONE = 'Asia/Kolkata'` in `src/metrics.js`, use it as the `normalizeMetricsQuery` default, and replace `?? 'UTC'` in all four metrics routes with the authenticated organization timezone or IST platform fallback. Do not accept a caller-supplied timezone as an override for organization routes.

- [ ] **Step 6: Run date and metrics tests and verify pass**

Run: `node --test test/date-time.test.js test/metrics.test.js test/metrics-model.test.js test/app.test.js`

Expected: PASS with explicit IST/New York output, AM/PM formatting, date-boundary behavior, and organization-authoritative metrics ranges.

- [ ] **Step 7: Commit timezone standardization**

```bash
git add public/date-time.js public/app.js public/metrics-view.js public/index.html src/app.js src/metrics.js test/date-time.test.js test/metrics.test.js test/metrics-model.test.js test/app.test.js
git commit -m "feat: use organization timezone across LexFlow"
```

---

### Task 5: Add attachment controls and row-wide thread interaction to the UI

**Files:**
- Create: `public/conversation-interactions.js`
- Create: `test/conversation-interactions.test.js`
- Modify: `public/app.js`
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `test/ui-copy.test.js`
- Modify: `test/app.test.js`

**Interfaces:**
- Produces: `conversationClickIntent(target): { type: 'toggle', conversationId: number } | { type: 'open', emailId: number } | null`; `toggleConversation(conversationId): Promise<void>` in `public/app.js`.
- Consumes: API `rule.hasAttachments`, `email.hasAttachments`, and `conversation.hasAttachments` from Tasks 2–3.

- [ ] **Step 1: Write failing click-intent and UI contract tests**

Create a DOM-independent click-intent helper test using target stubs with `closest()`:

```js
assert.deepEqual(conversationClickIntent(targetFor({ toggle: 42, email: 9 })), {
  type: 'toggle', conversationId: 42,
});
assert.deepEqual(conversationClickIntent(targetFor({ parent: 42, email: 9 })), {
  type: 'toggle', conversationId: 42,
});
assert.deepEqual(conversationClickIntent(targetFor({ childEmail: 10 })), {
  type: 'open', emailId: 10,
});
```

Extend `test/ui-copy.test.js` to require the `Has attachment` checkbox and attachment criterion copy. Extend API bootstrap tests to assert summary and message JSON contain Boolean `hasAttachments`.

- [ ] **Step 2: Run focused UI tests and verify failure**

Run: `node --test test/conversation-interactions.test.js test/ui-copy.test.js test/app.test.js`

Expected: FAIL because the helper, checkbox, and payload properties are absent.

- [ ] **Step 3: Expose attachment state in email payloads**

In `emailFromRow`, prefer conversation aggregate for summary rows and message state for child rows:

```js
hasAttachments: Boolean(row.conversation_has_attachments ?? row.has_attachments),
```

Select `conversations.has_attachments AS conversation_has_attachments` in `listEmails`. The conversation-message endpoint continues returning each message's own Boolean.

- [ ] **Step 4: Add the rule checkbox and criteria copy**

Add this field beside the existing keyword/sender criteria without changing the dialog's visual hierarchy:

```html
<label class="check-field rule-attachment-field">
  <input type="checkbox" name="hasAttachments">
  <span>Has attachment</span>
  <small>Off matches only email threads without attachments.</small>
</label>
```

Read/write it in `ruleFormValues`, `ruleValuesFromSource`, `openRuleDialog`, create payloads, and patch payloads. Render `Has attachment` when true and `No attachments` when false in both full and compact rule cards. Add only spacing/alignment rules needed to match existing form controls.

- [ ] **Step 5: Centralize thread toggle behavior**

Create `public/conversation-interactions.js` so explicit controls take precedence, parent rows toggle, and nested rows open:

```js
export function conversationClickIntent(target) {
  const explicit = target.closest('[data-conversation-toggle]');
  if (explicit) return { type: 'toggle', conversationId: Number(explicit.dataset.conversationToggle) };
  const child = target.closest('.conversation-messages [data-email-id]');
  if (child) return { type: 'open', emailId: Number(child.dataset.emailId) };
  const parent = target.closest('[data-conversation-parent]');
  if (parent) return { type: 'toggle', conversationId: Number(parent.dataset.conversationParent) };
  const row = target.closest('[data-email-id]');
  return row ? { type: 'open', emailId: Number(row.dataset.emailId) } : null;
}
```

Set `data-conversation-parent` on the multi-message parent row and `data-conversation-toggle` on the explicit control. Move the existing cache/load/error sequence into one async `toggleConversation(conversationId)` and let the delegated click listener dispatch exactly one intent. Keep `aria-expanded` synchronized on rerender; the row remains a native button, so Enter/Space activation works without custom keyboard code.

- [ ] **Step 6: Run focused UI tests and verify pass**

Run: `node --test test/conversation-interactions.test.js test/ui-copy.test.js test/app.test.js`

Expected: PASS for parent/toggle/child precedence, no double toggle, attachment UI, and Boolean payloads.

- [ ] **Step 7: Commit UI behavior**

```bash
git add public/conversation-interactions.js public/app.js public/index.html public/styles.css test/conversation-interactions.test.js test/ui-copy.test.js test/app.test.js
git commit -m "feat: expand threads by row and edit attachment rules"
```

---

### Task 6: Run regression, migration, and browser smoke verification

**Files:**
- Modify only if a verification failure identifies a defect in the files changed by Tasks 1–5.

**Interfaces:**
- Consumes: all completed behavior from Tasks 1–5.
- Produces: a clean test run, a valid migrated database, and browser evidence for the approved acceptance criteria.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test`

Expected: all tests pass with no skipped attachment, timezone, conversation, tenant-isolation, role, sync, rule, or metrics regressions.

- [ ] **Step 2: Validate source and migration hygiene**

Run:

```bash
git diff --check
rg -n "\?\? 'UTC'|\|\| 'UTC'|DEFAULT 'UTC'|resolvedOptions\(\)\.timeZone" src public test
```

Expected: `git diff --check` prints nothing. The timezone scan returns no production fallback or browser-implicit timezone use; explicit test fixtures may retain UTC where they are testing a non-default zone.

- [ ] **Step 3: Start the app against a disposable migrated database**

Run:

```bash
scratch_db="$(mktemp -d)/lexflow-smoke.db"
DATABASE_PATH="$scratch_db" npm start
```

Expected: the server starts without migration errors, the default organization timezone is `Asia/Kolkata`, and no local credential bootstrap is introduced.

- [ ] **Step 4: Verify DepAdmin browser behavior**

At `http://localhost:3000`, sign in as a DepAdmin and verify:

1. Clicking the subject, sender, preview, status, or whitespace of a multi-message parent row toggles it.
2. Clicking Expand/Collapse toggles once and updates `aria-expanded`.
3. Clicking a nested message opens its detail dialog.
4. Creating a rule defaults `Has attachment` off; saved copy says `No attachments`.
5. Enabling it saves and the card says `Has attachment`.
6. Inbox, detail, activity, notification, and sync times all show AM/PM in the organization timezone.

- [ ] **Step 5: Verify OrgAdmin and Metrics browser behavior**

Sign in as OrgAdmin, change timezone from `Asia/Kolkata` to `America/New_York`, reload, and verify all organization-role timestamps and Metrics labels/buckets change consistently. Restore `Asia/Kolkata` after the check. Sign in as PlatformAdmin and verify Metrics identifies `Asia/Kolkata` as its timezone.

- [ ] **Step 6: Verify Graph attachment routing with fixture data**

Use the existing mail-source test fixture or a connected test mailbox to ingest one no-attachment conversation and one conversation whose older message has `hasAttachments: true`. Confirm the off rule routes only the first and the on rule routes only the second. Complete the attachment conversation, ingest a reply without attachments, and confirm the reopened conversation remains attachment-bearing and follows previous-assignee precedence or the on rule fallback.

- [ ] **Step 7: Commit verification fixes if required**

If Steps 1–6 required code changes, stage only those changed implementation/tests and commit:

```bash
git add src public test
git commit -m "fix: close attachment and timezone regressions"
```

If no changes were required, do not create an empty commit.
