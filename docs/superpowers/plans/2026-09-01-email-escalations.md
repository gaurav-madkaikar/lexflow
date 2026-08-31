# Email Escalations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver durable department-scoped email escalations from shared mailboxes, with ordered DepAdmin recipient hierarchies and an OrgAdmin-controlled interval.

**Architecture:** Persist escalation configuration and a delivery ledger in SQLite. A separate, coalesced one-minute worker claims a bounded batch transactionally, sends outside transactions using the existing organization Graph application connection, then records acceptance or a retryable/blocked outcome. API payloads remain organization- and role-scoped; the UI uses the existing workspace cards, dialogs, form feedback, and notification modal system.

**Tech Stack:** Node.js 22, Express 5, built-in SQLite `DatabaseSync`, Microsoft Graph application credentials, vanilla ES modules, CSS, Node test runner.

## Global Constraints

- Preserve Entra authentication, tenant isolation, existing task/thread behavior, and OrgAdmin confidentiality from email content.
- Do not introduce per-user Graph credentials, a public send-mail endpoint, or an external queue.
- Use the existing four priority values: Critical `10`, High `20`, Medium `30`, Low `40`.
- New hierarchy recipients are opt-in; an empty hierarchy sends no escalation email.
- Escape every value placed in Graph mail HTML; never include source body, preview, sender, attachments, or Outlook links.
- Scope Graph send access with Exchange Application RBAC `Application Mail.Send` to configured shared mailboxes.
- Use visible labels, inline field errors, keyboard-accessible reorder controls, and existing toast feedback.

---

### Task 1: Add additive escalation persistence and settings support

**Files:**
- Modify: `src/db.js`
- Modify: `src/workspace.js`
- Test: `test/workspace.test.js`
- Test: `test/escalations.test.js`

**Interfaces:**
- Produces `getWorkspaceSettings(db, organizationId).escalationIntervalHours`.
- Produces `replaceEscalationRecipients({ db, organizationId, departmentId, recipients, now })` and `listEscalationRecipients(db, organizationId, departmentId)`.
- Produces tables `escalation_recipients` and `escalation_deliveries`, and `assignment_cycles.priority` / `assignment_cycles.superseded_at`.

- [ ] **Step 1: Write failing settings and schema tests**

```js
test('workspace settings persist a valid escalation interval', () => {
  const settings = updateWorkspaceSettings({
    db, organizationId: 1,
    timeUnassignedHours: 1,
    timeAssignedUnmarkedHours: 24,
    escalationIntervalHours: 24,
  });
  assert.equal(settings.escalationIntervalHours, 24);
});

test('recipient hierarchy normalizes email, compacts order, and rejects duplicates', () => {
  assert.throws(() => replaceEscalationRecipients({
    db, organizationId: 1, departmentId: 1,
    recipients: ['Lead@example.com', 'lead@example.com'], now: new Date(),
  }), /duplicate/i);
});
```

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `node --test test/workspace.test.js test/escalations.test.js`

Expected: failures for missing interval and hierarchy APIs/tables.

- [ ] **Step 3: Extend the migration safely**

Add `escalation_interval_hours INTEGER NOT NULL DEFAULT 24 CHECK (...)` using an idempotent column migration. Add the two escalation tables with organization and department foreign keys, `(department_id, position)` and case-normalized email uniqueness, `(assignment_cycle_id, level)` delivery uniqueness, and due-work indexes. Rebuild the existing notifications check constraint to include `escalation_failed` while retaining all existing rows and organization/department columns. Add the two assignment-cycle columns and backfill missing priority to `30`; mark only older active cycles superseded.

- [ ] **Step 4: Implement settings and hierarchy repository functions**

```js
export function updateWorkspaceSettings({ db, timeUnassignedHours, timeAssignedUnmarkedHours, escalationIntervalHours, organizationId }) {
  const escalation = settingValue(escalationIntervalHours, 'escalationIntervalHours', 'Escalation interval');
  db.prepare(`UPDATE workspace_settings
    SET time_unassigned_hours = ?, time_assigned_unmarked_hours = ?, escalation_interval_hours = ?
    WHERE organization_id = ?`).run(unassigned, assigned, escalation, organizationId);
  return getWorkspaceSettings(db, organizationId);
}
```

Normalize recipient email with trim/lowercase, enforce 254-character syntactic validation, replace the department list in one immediate transaction, and derive `position` from array index + 1.

- [ ] **Step 5: Run focused tests and migration compatibility tests**

Run: `node --test test/workspace.test.js test/escalations.test.js test/conversations.test.js`

Expected: pass, including an existing database migration fixture retaining notifications and settings.

- [ ] **Step 6: Commit the persistence slice**

```bash
git add src/db.js src/workspace.js test/workspace.test.js test/escalations.test.js
git commit -m "feat: persist escalation settings and hierarchies"
```

### Task 2: Preserve priority and cycle ownership through assignment lifecycle

**Files:**
- Modify: `src/conversations.js`
- Modify: `src/workflows.js`
- Modify: `src/app.js`
- Test: `test/conversations.test.js`
- Test: `test/app.test.js`

**Interfaces:**
- `updateConversationAssignment(db, { conversationId, assigneeId, source, ruleId, priority, startedAt })` supersedes a prior active cycle and creates a priority-bearing cycle.
- `assignEmailManually({ ..., priority })` accepts canonical priority.
- `POST /api/emails/:id/assign` accepts `{ assigneeId, priority }`.

- [ ] **Step 1: Write failing lifecycle/API tests**

```js
assert.equal(cycle.priority, 20);
assert.ok(previousCycle.superseded_at);
assert.equal(activeCycles.length, 1);

const response = await request.post(`/api/emails/${email.id}/assign`).send({ assigneeId: member.id, priority: 10 });
assert.equal(response.status, 200);
```

- [ ] **Step 2: Run focused assignment tests and confirm failure**

Run: `node --test test/conversations.test.js test/app.test.js`

Expected: assignment priority is ignored or cycles cannot be superseded yet.

- [ ] **Step 3: Thread priority through all assignment paths**

Manual assignments validate with `isRulePriority`; rule assignments pass the matched rule priority; a previous-assignee reopen copies its prior cycle priority and otherwise uses Medium. Before inserting a new cycle, set `superseded_at` on the current incomplete cycle. Completion selects only a non-superseded active cycle.

- [ ] **Step 4: Expose the persisted priority in authorized task payloads**

Join the active `assignment_cycles` row in the conversation listing, map it in `emailFromRow`, and leave OrgAdmin task payloads absent. Keep all existing thread opening and completion authorization unchanged.

- [ ] **Step 5: Run the focused suite**

Run: `node --test test/conversations.test.js test/app.test.js test/rule-priorities.test.js`

Expected: pass for manual, rule, reassignment, and reopen cases.

- [ ] **Step 6: Commit the assignment slice**

```bash
git add src/conversations.js src/workflows.js src/app.js test/conversations.test.js test/app.test.js
git commit -m "feat: retain assignment priority for escalation cycles"
```

### Task 3: Implement the durable escalation worker and internal Graph sender

**Files:**
- Create: `src/escalations.js`
- Modify: `src/outlook.js`
- Modify: `src/server.js`
- Test: `test/escalations.test.js`
- Test: `test/outlook.test.js`

**Interfaces:**
- `createEscalationRunner({ db, outlook, clock, organizationIds })` exposes `run()` and coalesces overlapping sweeps.
- `evaluateEscalations({ db, outlook, now, organizationId })` claims at most one due level per active cycle.
- `outlook.sendEscalation({ organizationId, departmentId, recipient, subject, html, deliveryKey })` sends through `/users/{sharedMailbox}/sendMail` with Sent Items enabled.

- [ ] **Step 1: Write failing worker and Graph contract tests**

```js
const result = await evaluateEscalations({ db, outlook, now: after24Hours, organizationId: 1 });
assert.equal(result.sent, 1);
assert.match(graphRequest.url, /\/users\/legal%40example\.com\/sendMail$/);
assert.equal(graphRequest.body.saveToSentItems, true);
assert.match(graphRequest.body.message.subject, /^Escalation Level 1:/);
assert.doesNotMatch(graphRequest.body.message.body.content, /original sender|preview/i);
```

- [ ] **Step 2: Run worker tests and confirm failure**

Run: `node --test test/escalations.test.js test/outlook.test.js`

Expected: missing escalation runner and Graph sender.

- [ ] **Step 3: Build transactional due-work claiming**

Inside a short `BEGIN IMMEDIATE` transaction, identify only active organizations, valid shared-mailbox departments, active/same-assignee cycles, and the next unsent level. Calculate Level 1 from `started_at`; calculate later levels from the previous successful `sent_at`; use the current setting every sweep. Insert/claim one row per `(cycle, level)` with an expiring claim and a random claim token. Cancel unsent records on completion/reassignment/ineligibility; leave an absent next hierarchy level unclaimed.

- [ ] **Step 4: Implement safe Graph mail composition and delivery state transitions**

Build the subject and HTML body using explicit escaping and bounded subject text. Use the organization timezone when formatting assignment time and include only department/mailbox, assignee name/email, priority, elapsed time, level, and automated notice. Attach a stable `X-LexFlow-Escalation-ID` internet header. Record Graph 202 as `sent`; honor `Retry-After` or exponential retry capped at one hour for transport/429/5xx; mark configuration/permission issues `blocked` with slower retry. Do not advance a level after an error.

- [ ] **Step 5: Add failure notification and ambiguity handling**

Create one `escalation_failed` notification for the department head using the conversation's latest email. Do not duplicate it on retries; delete it on recovery. For ambiguous post-request failures, query recent Sent Items using the delivery header before retrying. Keep the OrgAdmin's status generic.

- [ ] **Step 6: Wire the runner into the server lifecycle**

Create the runner with active organization IDs, invoke it at startup and every minute beside alerts, log only sanitized aggregate counts/errors, unref the timer, and clear it in shutdown.

- [ ] **Step 7: Run worker, Graph, and existing alert tests**

Run: `node --test test/escalations.test.js test/outlook.test.js test/alerts.test.js`

Expected: pass for levels, interval changes, hierarchy edits, retry/backoff, completion/reassignment cancellation, archive skipping, and Graph request content.

- [ ] **Step 8: Commit the delivery slice**

```bash
git add src/escalations.js src/outlook.js src/server.js test/escalations.test.js test/outlook.test.js
git commit -m "feat: send durable shared-mailbox escalations"
```

### Task 4: Add role-scoped escalation APIs and bootstrap data

**Files:**
- Modify: `src/app.js`
- Modify: `test/app.test.js`

**Interfaces:**
- `GET /api/escalations` returns only the signed-in DepAdmin's headed department configuration and bounded activity.
- `PUT /api/escalations` accepts `{ recipients: string[] }` only for that headed department.
- `PATCH /api/settings` requires `escalationIntervalHours` with existing timing fields.

- [ ] **Step 1: Write failing authorization and validation tests**

```js
await request.get('/api/escalations').expect(403); // member/OrgAdmin
const result = await depAdmin.put('/api/escalations').send({ recipients: ['lead@example.com'] }).expect(200);
assert.deepEqual(result.body.recipients.map(row => row.position), [1]);
```

- [ ] **Step 2: Run API tests and confirm failure**

Run: `node --test test/app.test.js test/escalations.test.js`

Expected: routes are absent and setting payload rejects the new field.

- [ ] **Step 3: Implement the endpoints and scoped presentation queries**

Add the DepAdmin routes after rule routes. Derive `organization_id` and headed department exclusively from `request.user`, validate the body is an array of strings, and return recent rows limited to a safe fixed bound. Include `settings.escalationIntervalHours` in OrgAdmin bootstrap; include escalation data only in the eligible DepAdmin bootstrap. Return resource-hiding 404/403 consistently with neighboring endpoints.

- [ ] **Step 4: Verify role isolation and errors**

Run: `node --test test/app.test.js test/escalations.test.js`

Expected: all roles retain prior access, while only the applicable DepAdmin sees recipient/task delivery data.

- [ ] **Step 5: Commit the API slice**

```bash
git add src/app.js test/app.test.js test/escalations.test.js
git commit -m "feat: expose scoped escalation administration"
```

### Task 5: Add the workspace controls and priority selector

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Test: `test/ui-copy.test.js`
- Test: `test/conversation-interactions.test.js`

**Interfaces:**
- A DepAdmin-only `Escalations` navigation view saves `recipients` through `/api/escalations`.
- The OrgAdmin timing form submits `escalationIntervalHours`.
- The email assignment dialog submits canonical `priority` with `assigneeId`.

- [ ] **Step 1: Write DOM/copy and interaction tests**

```js
assert.match(html, /data-view="escalations"/);
assert.match(html, /Escalation interval/);
assert.match(html, /name="priority"/);
```

- [ ] **Step 2: Run UI tests and confirm failure**

Run: `node --test test/ui-copy.test.js test/conversation-interactions.test.js`

Expected: escalation view and assignment selector are absent.

- [ ] **Step 3: Add the minimal role-scoped markup**

Add an **Escalations** sidebar item inside DepAdmin navigation and an `escalations-panel` following existing card and form structure. Include read-only interval context, one labeled email input per hierarchy row, order label, add/remove/up/down buttons with accessible names, a summary/error region, save action, and bounded recent activity. Add the escalation interval field to the OrgAdmin response-timing form. Add priority label/select to the assignment form.

- [ ] **Step 4: Implement UI state, rendering, and feedback**

Keep recipient rows in an array, preserve focus after moving a row, use `type="email"`, show field-level errors, disable Save while pending, and use existing `showToast`/`reportError`. Populate current priority when reassignment is opened. Do not render escalation navigation/payloads for OrgAdmin or Members. Render current task priority for DepAdmin/Member rows with existing priority labels.

- [ ] **Step 5: Add restrained, responsive styles**

Reuse card, field, button, and status token classes. Ensure row controls have visible focus and at least 44px tap targets, recipients wrap safely at narrow widths, and activity has a useful empty state. Avoid a new color/font system or decorative animation.

- [ ] **Step 6: Run UI tests and browser smoke test**

Run: `node --test test/ui-copy.test.js test/conversation-interactions.test.js test/feedback.test.js`

Browser check: sign in as a DepAdmin, reorder/save a recipient list, confirm toast feedback, sign in as OrgAdmin to change only interval, and manually assign a task at High priority.

- [ ] **Step 7: Commit the UI slice**

```bash
git add public/index.html public/app.js public/styles.css test/ui-copy.test.js test/conversation-interactions.test.js
git commit -m "feat: add escalation controls to workspace"
```

### Task 6: Document Exchange prerequisites and validate the integrated feature

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Test: all relevant tests

**Interfaces:**
- Deployment guidance explains scoped `Application Mail.Send`, Graph Send Mail behavior, retry/audit semantics, and empty-hierarchy safety.

- [ ] **Step 1: Add deployment guidance**

Document that the existing Graph app needs Exchange Application RBAC `Application Mail.Send` for each allowed shared mailbox, that this is additive with no unrestricted Entra `Mail.Send`, that escalation messages save to Sent Items, and that a newly deployed department has no recipients until its DepAdmin configures them.

- [ ] **Step 2: Run static checks and full tests**

Run: `git diff --check`

Run: `npm test`

Expected: no whitespace errors and full suite passing.

- [ ] **Step 3: Run final browser smoke test**

Start the app using the existing Entra workspace configuration. Confirm an OrgAdmin cannot access individual escalation/task data, a DepAdmin can configure a hierarchy, and a Member cannot see the escalation page.

- [ ] **Step 4: Commit documentation and final verification changes**

```bash
git add README.md .env.example
git commit -m "docs: document shared-mailbox escalations"
```
