# Role-Aware Team, Notifications, and Graph Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver role-focused mailbox UI, consistent transient feedback, entry task summaries, a compact Team workspace, accurate Graph synchronization status, and email-only Entra provisioning.

**Architecture:** Add small pure client modules for feedback state and Team grouping, explicit server helpers for pending-task and synchronization status, and keep the existing Express/bootstrap boundary canonical. Preserve internal Entra object-ID bindings while removing them from management inputs and outputs.

**Tech Stack:** Node.js, Express, node:sqlite, browser ES modules, native HTML `<details>`, CSS, Node test runner.

## Global Constraints

- Preserve the existing LexFlow visual language and role-based email isolation.
- Keep transient success/error feedback out of persistent workflow-notification tables.
- Do not add Graph permissions, mailbox-access verification, or a database schema migration.
- Do not remove organization Entra tenant IDs or existing internal user object-ID bindings.
- Never expose tokens, tenant/object IDs, mailbox addresses, message IDs, content, or raw upstream responses in client errors.
- Successful automatic synchronization remains silent; failures appear once through deduplicated feedback.
- Preserve unrelated dirty-worktree changes and do not commit overlapping pre-existing edits.

---

## File Map

- Create `public/feedback.js`: notification queue, timing, deduplication, and pending-task notice formatting.
- Create `public/team-model.js`: username formatting, department grouping, and expansion reconciliation.
- Modify `src/tenants.js`: email-only provisioning and private object-ID bindings.
- Modify `src/app.js`: pending-task payload and Graph runtime status in bootstrap.
- Modify `src/workflows.js`: per-organization in-progress state and aggregate Outlook outcomes.
- Modify `src/outlook.js`: exact aggregate status reads with current-source fallback.
- Modify `public/index.html`: Team/Settings structure and popup markup.
- Modify `public/app.js`: role visibility, feedback rendering, Team disclosures, and Graph status transitions.
- Modify `public/styles.css`: aligned Team disclosures, popup stack, and Graph spinner.
- Modify `test/tenants.test.js`, `test/app.test.js`, `test/workspace.test.js`, `test/ui-copy.test.js`, and `test/mail-sources.test.js`.
- Create `test/feedback.test.js` and `test/team-model.test.js`.

---

### Task 1: Make Entra object IDs internal-only

**Files:**

- Modify: `src/tenants.js`
- Modify: `public/index.html`
- Modify: `public/app.js`
- Test: `test/tenants.test.js`
- Test: `test/app.test.js`
- Test: `test/ui-copy.test.js`

**Interfaces:**

- Consumes: verified `claims.tid`, `claims.oid`, and corporate email in `resolvePrincipal`.
- Produces: organization/member management payloads with no `entraObjectId` or `initialAdminObjectId`; email-only pending memberships.

- [ ] **Step 1: Add failing identity tests**

Add assertions equivalent to:

```js
const org = createOrganization({
  db,
  input: {
    name: 'Acme',
    domain: 'acme.test',
    entraTenantId: tenantId,
    initialAdminEmail: 'admin@acme.test',
  },
});
assert.equal('initialAdminObjectId' in org, false);
assert.equal(db.prepare("SELECT entra_object_id FROM users WHERE role = 'admin'").get().entra_object_id, null);

const member = createMember({ db, organizationId: org.id, input: { email: 'member@acme.test', role: 'member' } });
assert.equal('entraObjectId' in member, false);
```

Retain a login test proving the verified `oid` is stored internally and a later different `oid` is rejected.

- [ ] **Step 2: Run focused tests and confirm current requirements fail**

Run: `node --test test/tenants.test.js test/ui-copy.test.js`

Expected: failures for required initial object ID and public object-ID fields.

- [ ] **Step 3: Remove object IDs from management contracts**

Change organization preparation to:

```js
function preparedOrganization(input) {
  const name = text(input?.name, 'name', 'Organization name');
  const domain = normalizeDomain(input?.domain);
  const entraTenantId = normalizeTenantId(input?.entraTenantId);
  const initialAdminEmail = normalizeEmail(input?.initialAdminEmail);
  if (initialAdminEmail.split('@')[1] !== domain) {
    throw error(400, 'INVALID_INPUT', 'Initial administrator email must use the organization domain.', 'initialAdminEmail');
  }
  return { name, domain, entraTenantId, initialAdminEmail };
}
```

Remove object IDs from `organizationPayload` and `userPayload`. Insert new pending users with `entra_object_id = NULL`. Ignore/reject object-ID mutation inputs rather than returning them.

When PlatformAdmin changes the initial admin email, preserve the binding if the normalized email is unchanged; otherwise set `entra_object_id = NULL` and invalidate organization sessions.

- [ ] **Step 4: Remove management fields from the UI**

Delete Initial OrgAdmin object ID and member Entra object ID inputs. Submit only:

```js
{
  name,
  domain,
  entraTenantId,
  initialAdminEmail,
}
```

for organization creation, and `{ email, role }` for member creation.

- [ ] **Step 5: Run focused tests**

Run: `node --test test/tenants.test.js test/app.test.js test/ui-copy.test.js`

Expected: identity creation, first-login binding, mismatch protection, and public-contract tests pass.

- [ ] **Step 6: Commit only if isolated**

```bash
git add src/tenants.js public/index.html public/app.js test/tenants.test.js test/app.test.js test/ui-copy.test.js
git commit -m "refactor: keep Entra object IDs internal"
```

Skip this commit when any listed file contains pre-existing uncommitted work.

### Task 2: Add a centralized transient feedback queue

**Files:**

- Create: `public/feedback.js`
- Create: `test/feedback.test.js`
- Modify: `public/app.js`
- Modify: `public/index.html`
- Modify: `public/styles.css`

**Interfaces:**

- Produces: `createFeedbackQueue(options)`, `pendingTaskNotice({ role, pendingTasks })`, and `feedbackFingerprint(notification)`.
- Consumed by: application action handlers, entry task summary, Graph status transitions.

- [ ] **Step 1: Write failing feedback-model tests**

Cover queue order, maximum three visible entries, duplicate collapse, manual dismissal, success/error durations, and pending-task copy/action. Use an injected scheduler:

```js
const scheduled = [];
const queue = createFeedbackQueue({
  schedule(callback, delay) { scheduled.push({ callback, delay }); return scheduled.length; },
  cancel() {},
});
queue.show({ type: 'success', message: 'Saved.' });
assert.equal(queue.snapshot()[0].duration, 4500);
```

- [ ] **Step 2: Run the new test and confirm the module is missing**

Run: `node --test test/feedback.test.js`

Expected: module-not-found failure.

- [ ] **Step 3: Implement the queue**

Export:

```js
export const FEEDBACK_DURATION = Object.freeze({ success: 4500, info: 4500, error: 7000 });

export function createFeedbackQueue({ schedule = setTimeout, cancel = clearTimeout, maxVisible = 3, onChange = () => {} } = {}) {
  // Maintain bounded entries, collapse matching fingerprints, schedule dismissal,
  // expose show(), dismiss(), clear(), and snapshot().
}
```

`pendingTaskNotice` returns `null` for zero counts or a notification with `action: { label, view }` for the approved Member/DepAdmin rules.

- [ ] **Step 4: Render the queue accessibly**

Replace the single-child toast behavior with a bounded popup stack. Each rendered item includes message, optional action, and close button. Use `role="alert"` for errors and `role="status"` for success/info without moving focus.

Add aligned success/info/error styling and reduced-motion behavior. Keep the stack within the viewport on mobile.

- [ ] **Step 5: Route existing feedback through the queue**

Replace `showToast(message, isError)` internals with a compatibility wrapper:

```js
function showToast(message, isError = false, options = {}) {
  feedback.show({ type: isError ? 'error' : options.type || 'success', message, ...options });
}
```

Remove the Graph-specific feedback node and route authorization/disconnect outcomes through this wrapper.

- [ ] **Step 6: Run feedback and UI tests**

Run: `node --test test/feedback.test.js test/ui-copy.test.js`

Expected: queue and markup contracts pass.

### Task 3: Add pending-task payloads and Member-focused presentation

**Files:**

- Modify: `src/app.js`
- Modify: `public/app.js`
- Modify: `public/index.html`
- Test: `test/app.test.js`
- Test: `test/ui-copy.test.js`

**Interfaces:**

- Produces bootstrap `pendingTasks`:

```ts
type PendingTasks = {
  assignedToMe: number;
  unassignedDepartment: number;
  unreadNotifications: number;
};
```

- Consumed by: `pendingTaskNotice` from Task 2.

- [ ] **Step 1: Add failing role-summary API tests**

Assert Member counts only assigned incomplete email and DepAdmin counts department unassigned plus emails assigned to themselves. Assert OrgAdmin and PlatformAdmin payloads omit `pendingTasks`.

- [ ] **Step 2: Run the focused API test and confirm failure**

Run: `node --test --test-name-pattern='pending task' test/app.test.js`

Expected: missing `pendingTasks` assertion fails.

- [ ] **Step 3: Implement server-side task summaries**

Add a helper that uses organization, role, headed department, and user ID in one aggregate query. Attach the returned counts only in Member/DepAdmin bootstrap branches.

- [ ] **Step 4: Show the entry popup once per application entry**

Track `entryNoticeShown` in client state. After the first authenticated render, call `pendingTaskNotice`, provide its view action to `selectView`, and set the guard. Reset the guard in `showLogin` and logout.

- [ ] **Step 5: Hide mailbox UI from Members**

Set the mailbox card and mode chip `hidden` for `user.role === 'member'`. Keep both visible for DepAdmin and the relevant admin states. Ensure hidden elements leave the accessibility tree.

- [ ] **Step 6: Run focused tests**

Run: `node --test test/app.test.js test/feedback.test.js test/ui-copy.test.js`

Expected: role isolation, summary counts, and Member UI contracts pass.

### Task 4: Track accurate per-organization Graph synchronization status

**Files:**

- Modify: `src/workflows.js`
- Modify: `src/outlook.js`
- Modify: `src/app.js`
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Test: `test/mail-sources.test.js`
- Test: `test/outlook.test.js`
- Test: `test/app.test.js`
- Test: `test/ui-copy.test.js`

**Interfaces:**

- `createSyncRunner(...).status(organizationId)` produces:

```ts
type SyncRuntimeStatus = {
  inProgress: boolean;
  startedAt: string | null;
  completedAt: string | null;
  sequence: number;
  outcome: 'success' | 'error' | null;
};
```

- Persistent keys: `outlook:last_success_at` and `outlook:last_error`, scoped with the existing organization key convention.

- [ ] **Step 1: Add failing runtime and aggregate tests**

Use deferred sources to assert status becomes in progress before resolution, is scoped by organization, and becomes success/error afterward. Insert stale removed-mailbox keys and assert Outlook status ignores them.

- [ ] **Step 2: Run focused sync tests and confirm failure**

Run: `node --test test/mail-sources.test.js test/outlook.test.js`

Expected: `status` is missing and stale keys still affect the panel.

- [ ] **Step 3: Implement runtime tracking**

Add optional `clock = () => new Date()` to `createSyncRunner`. Discover active organization IDs before starting source promises, record one sequence, and expose immutable status snapshots. Coalesced callers share the same in-flight state.

- [ ] **Step 4: Persist aggregate Outlook outcomes**

Group settled source outcomes by organization and provider. For each organization’s current Outlook group:

```js
if (allCurrentSourcesSucceeded) {
  setSyncState(db, 'outlook:last_success_at', completedAt, organizationId);
  deleteSyncState(db, 'outlook:last_error', organizationId);
} else {
  setSyncState(db, 'outlook:last_error', 'Microsoft Graph synchronization needs attention.', organizationId);
}
```

Do not mark a run healthy when a source is skipped while still current.

- [ ] **Step 5: Read exact Graph aggregate state**

Update `outlook.status(organizationId)` to read aggregate keys and accept runtime status through the bootstrap integration merge. If no aggregate success exists, compute a fallback from only the current department mailbox cursor keys.

- [ ] **Step 6: Render spinner and transition feedback**

Render **In Progress** with visible text and a CSS spinner. Remove raw inline integration errors. Track the last observed completed sequence; emit one error popup for a new error outcome and no popup for success.

- [ ] **Step 7: Run focused tests**

Run: `node --test test/mail-sources.test.js test/outlook.test.js test/app.test.js test/ui-copy.test.js`

Expected: scoped runtime, aggregate timestamps, stale-source exclusion, spinner, and failure-notification contracts pass.

### Task 5: Consolidate Settings and build the collapsible Team page

**Files:**

- Create: `public/team-model.js`
- Create: `test/team-model.test.js`
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Test: `test/app.test.js`
- Test: `test/workspace.test.js`
- Test: `test/ui-copy.test.js`

**Interfaces:**

- Produces `usernameFromEmail(email)`, `teamGroups({ departments, members })`, and `reconcileExpandedGroups(expandedIds, groupIds)`.
- Consumed by Settings summaries and Team disclosure rendering.

- [ ] **Step 1: Add failing pure model tests**

Assert `usernameFromEmail('jsahoo@lexflow1.onmicrosoft.com') === 'jsahoo'`, department members are grouped once, unassigned members are separate, and removed IDs are dropped from expansion state.

- [ ] **Step 2: Run model tests and confirm module-not-found failure**

Run: `node --test test/team-model.test.js`

- [ ] **Step 3: Implement Team model helpers**

Use normalized numeric IDs and stable department order. Return:

```ts
type TeamGroup = {
  id: string;
  department: object | null;
  members: object[];
  depAdminUsername: string | null;
};
```

with `id: 'department:<id>'` and `id: 'unassigned'`.

- [ ] **Step 4: Restructure Settings**

Show active OrgAdmins only in Administrators. Show one Department leads row per department with local-part username. Both sections include a `data-view="departments"` Manage team action. Remove member/department forms and ordinary-user lists from Settings.

- [ ] **Step 5: Move all people controls to Team**

Place the email/role member form alongside department creation on Team. Keep role/status controls, member movement, head replacement, department edit, and removal inside expanded disclosure bodies.

- [ ] **Step 6: Render native collapsed groups**

Create `<details class="team-group">` without `open` initially. On toggle, update `state.expandedTeamGroups`. Reapply open state after refresh and preserve focused control where possible.

Department summaries show name, mailbox, count, and DepAdmin username. Unassigned summary shows count. Expanded bodies show full identity details.

- [ ] **Step 7: Rename user-facing navigation**

Change Departments to Team in navigation, headings, page titles, descriptions, and accessibility labels while retaining the internal `departments` view key to minimize routing risk.

- [ ] **Step 8: Align responsive styling**

Use consistent summary grid columns and gaps; stack actions and controls below 640px; prevent email/control overflow; add disclosure indicator and focus-visible state.

- [ ] **Step 9: Run focused tests**

Run: `node --test test/team-model.test.js test/workspace.test.js test/app.test.js test/ui-copy.test.js`

Expected: Team grouping and all existing last-admin/head-replacement/movement/removal protections pass.

### Task 6: Close remaining silent error paths

**Files:**

- Modify: `public/app.js`
- Test: `test/ui-copy.test.js`
- Test: `test/feedback.test.js`

**Interfaces:**

- Consumes: global feedback queue from Task 2.
- Produces: every asynchronous user action either success feedback or a safe visible error.

- [ ] **Step 1: Inventory async handlers**

Use `rg -n "addEventListener\\(|catch \\(error\\)|\.catch\\(" public/app.js` and add a contract test for known formerly silent paths: quiet refresh, integration callback/disconnect, member changes, department head/movement, dialog link resolution, and organization lifecycle.

- [ ] **Step 2: Add a shared safe reporter**

Normalize unknown values:

```js
function reportError(error, fallback = 'Something went wrong. Please try again.') {
  const message = error instanceof Error && error.message ? error.message : fallback;
  showToast(message, true);
}
```

Use it in every catch. Form handlers additionally call their existing inline field-error renderer.

- [ ] **Step 3: Stop swallowing polling failures**

Replace `.catch(() => {})` with deduplicated `reportError(error, 'LexFlow could not refresh. Retrying automatically.')`. Queue fingerprinting prevents repeated popups.

- [ ] **Step 4: Add global safe fallbacks**

Register `unhandledrejection` and `error` listeners that emit only a generic safe popup. Prevent duplicate reporting when the same message is already visible.

- [ ] **Step 5: Run UI feedback tests**

Run: `node --test test/feedback.test.js test/ui-copy.test.js`

Expected: all feedback contracts pass without raw-error rendering.

### Task 7: Full verification and localhost handoff

**Files:**

- Verify all changed files.

- [ ] **Step 1: Run syntax and whitespace checks**

Run `node --check` separately for `src/app.js`, `src/workflows.js`, `src/outlook.js`, `src/tenants.js`, `public/app.js`, `public/feedback.js`, and `public/team-model.js`.

Run: `git diff --check`

- [ ] **Step 2: Run the complete suite**

Run: `npm test`

Expected: all tests pass with no skipped feature tests.

- [ ] **Step 3: Restart localhost with the existing Entra test database**

Use the current development command and `/private/tmp/lexflow-entra-ui-test.db` without printing `.env` values.

- [ ] **Step 4: Browser-smoke role layouts**

Verify after normal sign-in:

- Member has no mailbox status card/chip and receives one pending-task popup.
- DepAdmin retains department mailbox context and receives the approved task summary.
- OrgAdmin Settings shows only administrators and department leads.
- Team groups start collapsed, preserve expansion during polling, and remain aligned responsively.
- Graph status shows spinner during a run, correct last-success timestamp afterward, and failure details only in a popup.

- [ ] **Step 5: Inspect for leaks and unrelated edits**

Review the focused diff for object IDs in public payloads, raw Graph errors, debug logging, exposed credentials, and accidental changes outside the approved scope.

- [ ] **Step 6: Report completion**

Provide the user with the running localhost URL, changed behavior, test count, and any browser verification limitation without reproducing private identifiers.
