# Trusted Assignment and Graph Health Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove mailbox-permission verification from OrgAdmin department assignment and replace the Email connections block with an organization-level Microsoft Graph health panel.

**Architecture:** Department assignment remains a tenant-scoped domain transaction, but the OrgAdmin's action is now the access attestation and no Exchange verifier participates. The existing Outlook integration status payload supplies tenant-consent state, shared-mailbox count, latest sync time, and sanitized errors to a redesigned settings card. Legacy verification database columns and events remain untouched for migration compatibility.

**Tech Stack:** Node.js 22, Express 5, `node:sqlite`, browser DOM APIs, HTML, CSS, Node test runner.

## Global Constraints

- Every department must continue to require a valid shared-mailbox email address.
- OrgAdmins must never receive individual email subjects, senders, previews, message counts, mailbox URLs, or tokens.
- LexFlow must not inspect, grant, revoke, or report individual Exchange mailbox permissions.
- Existing tenant isolation, member eligibility, first-member DepAdmin promotion, and DepAdmin replacement protection must remain intact.
- Existing verification columns and historical event rows remain in SQLite; do not add a destructive migration.
- Preserve the established LexFlow settings layout, typography, spacing, colors, controls, and responsive behavior.
- Do not add a frontend framework or test dependency.
- Target files already contain user-owned uncommitted changes. Do not create implementation commits unless the user separately authorizes bundling those changes; use focused diffs and test checkpoints instead.

---

### Task 1: Make department assignment trust the OrgAdmin action

**Files:**
- Modify: `test/workspace.test.js`
- Modify: `test/tenants.test.js`
- Modify: `src/workspace.js`

**Interfaces:**
- Consumes: `moveMemberToDepartment({ db, userId, departmentId, organizationId? })`.
- Produces: `{ id, department, departmentId, role }` for a successful move, with no mailbox-access status fields.

- [ ] **Step 1: Rewrite the domain test around trusted assignment**

Replace the fail-closed test with a verifier-free success case and remove every `accessCheck` argument from workspace and tenant tests:

```js
test('department placement trusts the OrgAdmin assignment without mailbox verification', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);

  const member = db.prepare("SELECT id FROM users WHERE email = 'maya@lexflow.local'").get();
  const department = db.prepare("SELECT id FROM departments WHERE name = 'Legal'").get();
  const moved = moveMemberToDepartment({
    db,
    userId: Number(member.id),
    departmentId: Number(department.id),
  });

  assert.equal(moved.department, 'Legal');
  assert.equal(moved.departmentId, Number(department.id));
  assert.equal('mailboxAccessStatus' in moved, false);
  assert.equal('mailboxAccessMessage' in moved, false);
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `node --test test/workspace.test.js test/tenants.test.js`

Expected: FAIL because `moveMemberToDepartment` still requires a confirmed `accessCheck`.

- [ ] **Step 3: Remove verification from the domain transaction**

Change the signature and return value in `src/workspace.js`:

```js
export function moveMemberToDepartment({ db, userId, departmentId, organizationId = 1 }) {
  return transaction(db, () => {
    // Keep member, department, organization, and headed-department validation.
    db.prepare('UPDATE users SET department = ?, department_id = ? WHERE id = ? AND organization_id = ?')
      .run(department.name, department.id, userId, organizationId);
    db.prepare(`
      UPDATE departments SET head_user_id = ?
      WHERE id = ? AND organization_id = ? AND head_user_id IS NULL
    `).run(userId, department.id, organizationId);
    return {
      id: Number(userId),
      department: department.name,
      departmentId: Number(department.id),
      role: isHead ? 'dep_admin' : 'member',
    };
  });
}
```

Delete the pre-transaction rejection branch and both `department_access_events` inserts. Do not alter the legacy schema.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `node --test test/workspace.test.js test/tenants.test.js`

Expected: PASS, including head replacement and cross-organization tests.

- [ ] **Step 5: Check the focused diff**

Run: `git diff --check -- src/workspace.js test/workspace.test.js test/tenants.test.js`

Expected: no whitespace errors.

---

### Task 2: Remove the verifier from the HTTP/runtime boundary

**Files:**
- Modify: `test/app.test.js`
- Modify: `src/app.js`
- Modify: `src/config.js`
- Modify: `src/server.js`
- Delete: `src/mailbox-access.js`
- Modify: `.env.example`

**Interfaces:**
- Consumes: the verifier-free `moveMemberToDepartment` interface from Task 1.
- Produces: `PATCH /api/team/:id/department` that succeeds for an authorized, valid move without an external verifier.

- [ ] **Step 1: Update the API harness and assignment assertions**

Remove the `mailboxAccessVerifier` injection from `createApiHarness`. Keep the existing OrgAdmin assignment test and add response-shape assertions:

```js
assert.equal(moved.status, 200);
assert.equal(moved.body.member.department, 'Compliance');
assert.equal(moved.body.member.role, 'dep_admin');
assert.equal('mailboxAccessStatus' in moved.body.member, false);
assert.equal('mailboxAccessMessage' in moved.body.member, false);
```

- [ ] **Step 2: Run the API test and verify it fails**

Run: `node --test test/app.test.js`

Expected: FAIL because the route still invokes the verifier and returns mailbox-access fields.

- [ ] **Step 3: Simplify the department-move route**

Remove `mailboxAccessVerifier` from `createApp` options and replace the asynchronous verifier wrapper with the normal synchronous route pattern:

```js
app.patch('/api/team/:id/department', requireOrgAdmin, (request, response, next) => {
  try {
    const userId = resourceId(request.params.id);
    const departmentId = resourceId(request.body?.departmentId);
    if (!userId) return notFound(response, 'Team member not found.');
    if (!departmentId) return validationError(response, 'Choose a valid department.', 'departmentId');
    response.json({
      member: moveMemberToDepartment({
        db,
        userId,
        departmentId,
        organizationId: request.user.organization_id,
      }),
    });
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 4: Remove runtime verifier configuration**

- Delete the `createMailboxAccessVerifier` import and construction in `src/server.js`.
- Delete the `mailboxAccessVerifier` object from `loadConfig` in `src/config.js`.
- Delete `src/mailbox-access.js`.
- Delete `MAILBOX_ACCESS_VERIFIER_URL` and `MAILBOX_ACCESS_VERIFIER_SECRET` from `.env.example`.

- [ ] **Step 5: Run API and configuration tests**

Run: `node --test test/app.test.js test/config.test.js`

Expected: PASS.

- [ ] **Step 6: Check the focused diff and stale references**

Run: `rg -n "mailboxAccessVerifier|createMailboxAccessVerifier|MAILBOX_ACCESS_VERIFIER|MAILBOX_ACCESS_REQUIRED" src test .env.example`

Expected: no matches.

Run: `git diff --check -- src/app.js src/config.js src/server.js src/mailbox-access.js test/app.test.js .env.example`

Expected: no whitespace errors.

---

### Task 3: Remove mailbox-verification UI and build the Graph health card

**Files:**
- Create: `test/ui-copy.test.js`
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`

**Interfaces:**
- Consumes: `state.session.integrations.outlook` with `{ configured, connected, mailboxCount, lastSuccessAt, lastError }`.
- Produces: one OrgAdmin-only Microsoft Graph health card with tenant consent, shared-mailbox count, latest successful sync, sanitized errors, and connect/reconnect/disconnect actions.

- [ ] **Step 1: Add static UI contract tests**

Create `test/ui-copy.test.js` without adding dependencies:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');

test('OrgAdmin settings use a Microsoft Graph health panel', () => {
  assert.match(html, /Microsoft Graph integration/);
  assert.doesNotMatch(html, />Email connections</);
  assert.match(app, /Tenant consent/);
  assert.match(app, /Shared mailboxes/);
  assert.match(app, /Last successful sync/);
});

test('department cards do not claim mailbox access verification', () => {
  assert.doesNotMatch(app, /Access confirmed|Access issue reported|Not verified/);
  assert.doesNotMatch(app, /shared-mailbox access has been confirmed/);
});
```

- [ ] **Step 2: Run the UI contract test and verify it fails**

Run: `node --test test/ui-copy.test.js`

Expected: FAIL because the old Email connections heading and access badges still exist.

- [ ] **Step 3: Revise settings copy and department cards**

In `public/index.html`:

```html
<h3 id="integrations-title" tabindex="-1">Microsoft Graph integration</h3>
<p>Connect Microsoft Graph once to synchronize this organization's department shared mailboxes.</p>
```

Also replace the Settings header description with `Organization, members, Graph integration, departments, and response windows`.

In `renderDepartmentManagement`, remove the access-status badge and change the unassigned copy to `Choose the department this member belongs to.` Keep mailbox labels and all existing controls.

- [ ] **Step 4: Replace the connector row with a health summary**

Make `renderIntegration` copy `mailboxCount` and render these facts:

```js
const facts = node('dl', 'integration-facts');
for (const [label, value] of [
  ['Tenant consent', connection.connected ? 'Granted' : connection.configured ? 'Required' : 'Unavailable'],
  ['Shared mailboxes', `${connection.mailboxCount} configured`],
  ['Last successful sync', connection.lastSuccessAt ? formatDate(connection.lastSuccessAt) : 'Not synced yet'],
]) {
  const fact = node('div', 'integration-fact');
  fact.append(node('dt', '', label), node('dd', '', value));
  facts.append(fact);
}
```

Use **Microsoft Graph** as the card title, preserve the four state badges, show sanitized `lastError` with `role="alert"`, and retain the existing Microsoft 365 consent and disconnect URLs. Include `mailboxCount` in the render signature so department changes refresh the card.

- [ ] **Step 5: Style the health facts responsively**

Add an `integration-facts` three-column grid and compact fact cards using existing color and radius variables. At the existing mobile breakpoint, switch it to one column. Add `.integration-status.disconnected` styling using the existing coral treatment and keep connected/attention colors unchanged.

- [ ] **Step 6: Run the UI contract test**

Run: `node --test test/ui-copy.test.js`

Expected: PASS.

- [ ] **Step 7: Check the focused diff**

Run: `git diff --check -- public/index.html public/app.js public/styles.css test/ui-copy.test.js`

Expected: no whitespace errors.

---

### Task 4: Align documentation and verify the complete behavior

**Files:**
- Modify: `README.md`
- Test: all files under `test/`

**Interfaces:**
- Consumes: completed trusted-assignment and Graph-health behavior.
- Produces: accurate operator documentation and a locally verified application.

- [ ] **Step 1: Replace verifier documentation**

Delete the external verifier configuration block from `README.md` and add:

```md
OrgAdmins are responsible for ensuring members have the appropriate Full Access and Send As permissions for a department's shared mailbox before assigning them to that department. LexFlow treats department assignment as this administrative confirmation; it does not inspect or modify individual Exchange permissions.
```

Keep the existing organization-wide Graph connection and Exchange Application RBAC guidance for mailbox synchronization.

- [ ] **Step 2: Run the complete automated suite**

Run: `npm test`

Expected: all tests pass with no skipped or cancelled tests.

- [ ] **Step 3: Scan for obsolete user-facing and runtime references**

Run: `rg -n "Mailbox access verification is not configured|Access confirmed|Access issue reported|Not verified|MAILBOX_ACCESS_VERIFIER|Email connections" src public README.md .env.example test`

Expected: no matches.

- [ ] **Step 4: Run a local browser smoke test**

Start or restart LexFlow using the existing local `.env` and database. As an OrgAdmin:

1. Open Settings and confirm the section is named **Microsoft Graph integration**.
2. Confirm tenant consent, shared-mailbox count, and latest-sync state are visible without message-level data.
3. Open Departments and move an unassigned member into Legal.
4. Confirm the move succeeds without a mailbox-verifier error and no access-status badge appears.
5. Confirm Connect/Reconnect/Disconnect controls remain available according to connection state.
6. Resize to a narrow viewport and confirm health facts stack without horizontal overflow.

- [ ] **Step 5: Final consistency check**

Run: `git diff --check`

Expected: no whitespace errors. Review `git status --short` and confirm only intended files were added, modified, or deleted; preserve all unrelated pre-existing changes.
