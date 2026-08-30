# Department Administrator and Email Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a database-derived `DepAdmin` role that owns one department's email workflow while ensuring OrgAdmins can configure the organization and Microsoft 365 without receiving confidential email data.

**Architecture:** Keep `users.role` limited to `admin` and `member`; derive `dep_admin` from `departments.head_user_id` on every authenticated request. Stamp email and rule records with `department_id`, enforce department ownership in SQL and service methods, and expose role-specific bootstrap payloads. Continue using one organization-wide app-only Graph connection, with each department shared mailbox represented by a department-stamped mail source.

**Tech Stack:** Node.js 22 ESM, Express 5, `node:sqlite` (`DatabaseSync`), Microsoft Graph client-credential integration, vanilla JavaScript/CSS/HTML, Node's built-in test runner.

## Global Constraints

- Preserve the existing LexFlow navigation, cards, typography, spacing, and responsive behavior.
- Treat email confidentiality as a server-side requirement: OrgAdmin responses must not contain email subjects, senders, previews, URLs, rules, activity, notifications, or message-level sync counts.
- Keep Microsoft Graph app credentials and consent organization-wide and OrgAdmin-managed; do not add delegated DepAdmin tokens.
- Keep `users.role` as `admin | member`; never persist `dep_admin` as a user role.
- Resolve DepAdmin authority from the current `departments.head_user_id` relationship on every authenticated request.
- Return `404 NOT_FOUND` for cross-tenant or cross-department resource IDs and `403 FORBIDDEN` for an unauthorized capability category.
- Block a current head's move, disablement, deletion, or OrgAdmin promotion with `409 DEPARTMENT_HEAD_REPLACEMENT_REQUIRED` until a replacement is selected.
- Make the first eligible member placed in a headless department the head in the same transaction, after mailbox access verification succeeds.
- Keep existing uncommitted work intact; stage only files named in each task when committing.
- Implement each behavior test-first and run the focused test before the full suite.

---

### Task 1: Add department ownership and leadership to the database

**Files:**
- Modify: `src/db.js`
- Modify: `test/workspace.test.js`

- [ ] **Step 1: Add failing migration tests for ownership backfill and idempotency**

Extend `test/workspace.test.js` with a legacy database fixture containing two departments, members, rules, and emails. Assert that two `migrate(db)` calls produce:

```js
assert.equal(
  db.prepare("SELECT head_user_id FROM departments WHERE name = 'Legal'").get().head_user_id,
  2,
);
assert.equal(db.prepare('SELECT department_id FROM rules WHERE id = 1').get().department_id, legal.id);
assert.equal(db.prepare('SELECT department_id FROM emails WHERE id = 1').get().department_id, legal.id);
assert.equal(db.prepare('SELECT department_id FROM emails WHERE id = 2').get().department_id, null);
```

Add separate assertions that migration throws a stable error code for duplicate normalized shared mailboxes and for a rule whose assignee has no department:

```js
assert.throws(() => migrate(db), error => error.code === 'DUPLICATE_SHARED_MAILBOX');
assert.throws(() => migrate(db), error => error.code === 'UNMAPPABLE_DEPARTMENT_RULE');
```

- [ ] **Step 2: Run the focused migration tests and verify they fail**

Run: `node --test --test-name-pattern='department ownership migration|duplicate shared mailbox|unmappable department rule' test/workspace.test.js`

Expected: failures because `head_user_id`, `rules.department_id`, and `emails.department_id` do not exist.

- [ ] **Step 3: Extend the schema and transactional migration**

In `src/db.js`, add nullable columns through `addColumn` so existing databases migrate safely:

```js
addColumn(db, 'departments', 'head_user_id', 'INTEGER REFERENCES users(id) ON DELETE RESTRICT');
addColumn(db, 'rules', 'department_id', 'INTEGER REFERENCES departments(id) ON DELETE CASCADE');
addColumn(db, 'emails', 'department_id', 'INTEGER REFERENCES departments(id) ON DELETE SET NULL');
addColumn(db, 'activity', 'department_id', 'INTEGER REFERENCES departments(id) ON DELETE SET NULL');
```

Before creating mailbox uniqueness, detect duplicates using:

```sql
SELECT organization_id, lower(trim(shared_mailbox)) AS mailbox
FROM departments
WHERE trim(shared_mailbox) <> ''
GROUP BY organization_id, lower(trim(shared_mailbox))
HAVING COUNT(*) > 1
```

Then create these indexes:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS departments_organization_mailbox_unique
ON departments (organization_id, lower(trim(shared_mailbox)))
WHERE trim(shared_mailbox) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS departments_head_user_unique
ON departments (head_user_id)
WHERE head_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS emails_organization_department_status
ON emails (organization_id, department_id, status);

CREATE INDEX IF NOT EXISTS rules_organization_department_priority
ON rules (organization_id, department_id, enabled, priority, id);

CREATE INDEX IF NOT EXISTS activity_organization_department_created
ON activity (organization_id, department_id, created_at, id);
```

Backfill in this order inside the existing migration transaction:

1. Clear `department_id` and legacy department text from `role = 'admin'` users.
2. Set each populated department's `head_user_id` to the lowest-ID pending or active member in that department.
3. Set each rule's `department_id` from its assignee; throw `UNMAPPABLE_DEPARTMENT_RULE` if any remains null.
4. Set each email's `department_id` from a normalized mailbox match.
5. For assigned/completed email still unmapped, use the assignee's department.
6. Leave unresolved unassigned email null and therefore quarantined.

Create `migrationError(code, message)` in `src/db.js` so startup failures expose stable codes without deleting records.

- [ ] **Step 4: Make new inserts compatible with non-null rule ownership**

Update `seedDemoData` to populate users' `department_id`, populate each department's `shared_mailbox`, select the earliest member as head, and insert each seeded rule with its assignee department ID. Do not create a default department for OrgAdmin.

- [ ] **Step 5: Run focused and regression tests**

Run: `node --test test/workspace.test.js`

Expected: all workspace and migration tests pass.

- [ ] **Step 6: Commit the database slice**

```bash
git add src/db.js test/workspace.test.js
git commit -m "feat: add department ownership to email workflows"
```

---

### Task 2: Derive DepAdmin identity and protect head lifecycle transitions

**Files:**
- Create: `src/department-access.js`
- Modify: `src/auth.js`
- Modify: `src/workspace.js`
- Modify: `src/tenants.js`
- Modify: `test/workspace.test.js`
- Modify: `test/tenants.test.js`
- Create: `test/department-access.test.js`

- [ ] **Step 1: Add failing role-derivation and first-head tests**

In `test/department-access.test.js`, authenticate a normal member who is the current head and assert:

```js
assert.equal(user.effectiveRole, 'dep_admin');
assert.equal(user.headed_department_id, legal.id);
```

In `test/workspace.test.js`, move the first eligible member into an empty department with a confirmed mailbox check, then assert both placement and leadership changed atomically. Repeat with a failed access check and assert neither changed.

In `test/tenants.test.js`, add cases proving current heads cannot be disabled or promoted and ordinary member promotion is blocked when the user has open assigned email or enabled rules.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `node --test test/department-access.test.js test/workspace.test.js test/tenants.test.js`

Expected: failures because effective role is still `member` and protected transitions do not exist.

- [ ] **Step 3: Create a focused department-access module**

Implement these exports in `src/department-access.js`:

```js
export function headedDepartment(db, { userId, organizationId })
export function effectiveWorkspaceRole(user, department)
export function assertDepartmentHead(db, { userId, organizationId, departmentId })
export function replacementRequired(message = 'Select a replacement DepAdmin before changing this member.')
```

`headedDepartment` must join `departments` and `users` and only return a department when the current head is a non-disabled `member` assigned to that same department and organization. `assertDepartmentHead` must hide nonexistent and cross-department IDs with `404 NOT_FOUND`.

- [ ] **Step 4: Derive role on every authenticated request**

In `src/auth.js`, call `headedDepartment` inside `requireUser(db)` and set:

```js
user.headed_department_id = department ? Number(department.id) : null;
user.effectiveRole = user.is_platform_admin
  ? 'platform_admin'
  : user.role === 'admin'
    ? 'org_admin'
    : department
      ? 'dep_admin'
      : 'member';
```

Add `requireDepAdmin` that permits only `effectiveRole === 'dep_admin'`. Keep `requireOrgAdmin` limited to OrgAdmin.

- [ ] **Step 5: Implement head selection and automatic first-head assignment**

In `src/workspace.js`, include `headUser` in `departmentPayload` and export:

```js
export function setDepartmentHead({ db, departmentId, memberId, organizationId = 1 })
```

Validate the candidate is a pending/active member of the same department and organization and does not head a different department. Return `409 DEPARTMENT_HEAD_CONFLICT` for the latter. In `moveMemberToDepartment`, after successful mailbox verification and inside the existing transaction, set `head_user_id` when the target department is headless.

Before moving a current head away, throw `replacementRequired()`. Department deletion remains the only path that may clear a head without replacement.

- [ ] **Step 6: Protect member lifecycle and OrgAdmin promotion**

In `src/tenants.js`, before disabling, deleting, moving, or promoting a user, check whether they currently head a department. For ordinary member promotion to OrgAdmin:

```sql
SELECT 1 FROM emails
WHERE organization_id = ? AND assignee_id = ? AND status = 'assigned'
UNION ALL
SELECT 1 FROM rules
WHERE organization_id = ? AND assignee_id = ? AND enabled = 1
LIMIT 1
```

Return `409 MEMBER_HAS_EMAIL_WORK` if this query returns a row. A successful promotion clears `department` and `department_id` in the same transaction.

- [ ] **Step 7: Run focused tests and commit**

Run: `node --test test/department-access.test.js test/workspace.test.js test/tenants.test.js`

Expected: all tests pass.

```bash
git add src/department-access.js src/auth.js src/workspace.js src/tenants.js test/department-access.test.js test/workspace.test.js test/tenants.test.js
git commit -m "feat: derive and protect department administrators"
```

---

### Task 3: Expose OrgAdmin department-head management APIs

**Files:**
- Modify: `src/app.js`
- Modify: `src/workspace.js`
- Modify: `test/app.test.js`

- [ ] **Step 1: Add failing API tests**

Add app tests for:

- `PATCH /api/departments/:id/head` succeeds for an eligible same-department member.
- Replacing a head immediately changes both users' bootstrap roles.
- A disabled, foreign-department, OrgAdmin, and already-leading candidate is rejected.
- Moving/disabling/promoting the current head returns `409 DEPARTMENT_HEAD_REPLACEMENT_REQUIRED`.
- Cross-organization department and member IDs return `404`.

Use the concrete request body:

```js
const response = await harness.patch(
  `/api/departments/${legal.id}/head`,
  { memberId: Number(maya.id) },
  orgAdminCookie,
);
assert.equal(response.status, 200);
assert.equal(response.body.department.headUser.id, Number(maya.id));
```

- [ ] **Step 2: Run the focused API tests and verify they fail**

Run: `node --test --test-name-pattern='department head|replacement DepAdmin' test/app.test.js`

Expected: route returns 404 or current transitions incorrectly succeed.

- [ ] **Step 3: Add the OrgAdmin-only route**

In `src/app.js`, register:

```js
app.patch('/api/departments/:id/head', requireOrgAdmin, (request, response, next) => {
  try {
    response.json({
      department: setDepartmentHead({
        db,
        departmentId: Number(request.params.id),
        memberId: Number(request.body?.memberId),
        organizationId: request.user.organization_id,
      }),
    });
  } catch (error) {
    next(error);
  }
});
```

Ensure department list responses include the current head and same-department candidate data but no email counts.

- [ ] **Step 4: Run focused tests and commit**

Run: `node --test --test-name-pattern='department head|replacement DepAdmin' test/app.test.js`

Expected: all selected tests pass.

```bash
git add src/app.js src/workspace.js test/app.test.js
git commit -m "feat: add department head administration api"
```

---

### Task 4: Stamp Graph imports and rules with authoritative department ownership

**Files:**
- Modify: `src/outlook.js`
- Modify: `src/mail-sources.js`
- Modify: `src/workflows.js`
- Modify: `src/app.js`
- Modify: `test/outlook.test.js`
- Modify: `test/mail-sources.test.js`
- Modify: `test/app.test.js`

- [ ] **Step 1: Add failing source and rule-scope tests**

In `test/outlook.test.js`, assert every source returned for a configured department has:

```js
assert.equal(source.organizationId, organization.id);
assert.equal(source.departmentId, department.id);
assert.equal(source.mailbox, department.shared_mailbox);
```

In `test/app.test.js`, add two departments with overlapping rule keywords and prove each imported email is matched only against its source department's rule. Add tests that a rule assignee outside the caller's department is rejected and a cross-department rule ID returns 404.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `node --test --test-name-pattern='department|source' test/outlook.test.js test/mail-sources.test.js`

Run: `node --test --test-name-pattern='department rule|cross-department rule' test/app.test.js`

Expected: sources have no `departmentId`, and rule selection remains organization-wide.

- [ ] **Step 3: Stamp source department and imported email**

In `src/outlook.js`, set `source.departmentId = Number(department.id)` when constructing a `GraphMailSource`. Keep the organization-wide connection lookup unchanged.

In `src/workflows.js`, require both `source.organizationId` and `source.departmentId`; verify that the active source department still maps to the same normalized mailbox before importing. Insert/update `emails.department_id` from the source, never from request data.

If the mapping is stale, skip importing that source and write only a sanitized `last_sync_error` value without sender, subject, preview, or URL.

- [ ] **Step 4: Scope matching and assignment services**

Change the rule lookup to:

```sql
SELECT rules.*
FROM rules
JOIN users assignee ON assignee.id = rules.assignee_id
WHERE rules.organization_id = ?
  AND rules.department_id = ?
  AND rules.enabled = 1
  AND assignee.organization_id = rules.organization_id
  AND assignee.department_id = rules.department_id
  AND assignee.role = 'member'
  AND assignee.account_status = 'active'
ORDER BY rules.priority, rules.id
```

Update `assignEmailManually` to accept `departmentId` and require the email, assignee, and caller's headed department to match. Update rule create/edit/delete handlers to use `request.user.headed_department_id`, ignore any client-supplied department ID, and validate assignees within that department.

- [ ] **Step 5: Run focused tests and commit**

Run: `node --test test/outlook.test.js test/mail-sources.test.js test/app.test.js`

Expected: import, source, rule, and assignment tests pass.

```bash
git add src/outlook.js src/mail-sources.js src/workflows.js src/app.js test/outlook.test.js test/mail-sources.test.js test/app.test.js
git commit -m "feat: scope graph mail workflows by department"
```

---

### Task 5: Enforce role-specific bootstrap and email APIs

**Files:**
- Modify: `src/app.js`
- Modify: `src/auth.js`
- Modify: `test/app.test.js`

- [ ] **Step 1: Add confidentiality regression tests**

Create one session per role and assert exact bootstrap field visibility:

```js
assert.equal(orgAdmin.body.emails, undefined);
assert.equal(orgAdmin.body.rules, undefined);
assert.equal(orgAdmin.body.activity, undefined);
assert.equal(orgAdmin.body.notifications, undefined);
assert.equal(orgAdmin.body.sync, undefined);

assert.ok(depAdmin.body.emails.every(email => email.departmentId === legal.id));
assert.ok(depAdmin.body.rules.every(rule => rule.departmentId === legal.id));
assert.ok(member.body.emails.every(email => email.assignee.id === member.id));
```

Also assert OrgAdmin direct calls to sync, rules, assignment, completion, and email-notification endpoints return 403, while cross-department DepAdmin IDs return 404.

- [ ] **Step 2: Run the confidentiality tests and verify they fail**

Run: `node --test --test-name-pattern='OrgAdmin.*email|DepAdmin.*department|role bootstrap' test/app.test.js`

Expected: OrgAdmin currently receives organization-wide emails and rules.

- [ ] **Step 3: Split bootstrap builders by role**

Refactor `src/app.js` into explicit payload branches:

```js
switch (request.user.effectiveRole) {
  case 'platform_admin':
    return platformBootstrap({ db, user: request.user, integrations });
  case 'org_admin':
    return organizationAdminBootstrap({ db, user: request.user, integrations });
  case 'dep_admin':
    return departmentAdminBootstrap({ db, user: request.user });
  default:
    return memberBootstrap({ db, user: request.user });
}
```

`organizationAdminBootstrap` may include `organization`, `members`, `departments`, `settings`, and sanitized `integrations` only. `departmentAdminBootstrap` must query email, rules, activity, notifications, and assignment candidates with both `organization_id` and `headed_department_id`. Member bootstrap remains assignee-scoped.

- [ ] **Step 4: Replace generic admin authorization on workflow routes**

Use `requireOrgAdmin` for organization settings and connector routes. Use `requireDepAdmin` for sync-independent rule and manual-assignment routes. Permit completion when effective role is `member` or `dep_admin`, but retain `assignee_id = request.user.id` in the update query.

Remove the user-facing organization-wide `POST /api/sync` capability. Background synchronization remains available to the server scheduler; if the endpoint remains for internal tests, return 403 to OrgAdmin and DepAdmin.

- [ ] **Step 5: Verify resource hiding and commit**

Run: `node --test test/app.test.js`

Expected: all API tests pass, including 403 capability checks and 404 ownership checks.

```bash
git add src/app.js src/auth.js test/app.test.js
git commit -m "feat: isolate email api access by workspace role"
```

---

### Task 6: Route activity, completion, and overdue notifications to DepAdmin

**Files:**
- Modify: `src/department-access.js`
- Modify: `src/workflows.js`
- Modify: `src/alerts.js`
- Modify: `src/app.js`
- Modify: `test/alerts.test.js`
- Modify: `test/app.test.js`

- [ ] **Step 1: Add failing recipient and visibility tests**

In `test/alerts.test.js`, create two departments and assert:

- unassigned-overdue notification goes only to the email department's current head;
- assigned-overdue goes to the assignee and current head without duplicate rows when they are the same user;
- OrgAdmin receives no email notification;
- replacing the head changes the next alert recipient.

In `test/app.test.js`, complete an assigned email and assert the current DepAdmin receives the completion notification and department-scoped activity while OrgAdmin receives neither.

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `node --test --test-name-pattern='DepAdmin|department head|completion notification' test/alerts.test.js test/app.test.js`

Expected: current code notifies organization admins.

- [ ] **Step 3: Centralize department administrative recipients**

Add `departmentHeadRecipient(db, { organizationId, departmentId })` in `src/department-access.js`; import it from both `src/workflows.js` and `src/alerts.js`. It must resolve the current valid head by department, organization, member role, matching membership, and non-disabled status. Replace all `role = 'admin'` email-recipient queries with this helper.

Stamp the Task 1 `activity.department_id` column during assignment and completion, then require it in DepAdmin activity reads.

When the head and assignee are the same user, deduplicate recipient IDs before inserting notifications.

- [ ] **Step 4: Run focused tests and commit**

Run: `node --test test/alerts.test.js test/app.test.js`

Expected: alert, completion, and activity tests pass.

```bash
git add src/department-access.js src/workflows.js src/alerts.js src/app.js test/alerts.test.js test/app.test.js
git commit -m "feat: route department email events to department admins"
```

---

### Task 7: Update OrgAdmin UI for department heads without exposing email screens

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Modify: `test/app.test.js`

- [ ] **Step 1: Add static UI contract assertions**

In `test/app.test.js`, load the public HTML/JavaScript and assert that the role navigation contract contains distinct `org_admin`, `dep_admin`, and `member` view lists, and that department markup includes a head selector action bound to `/api/departments/:id/head`.

- [ ] **Step 2: Run the UI contract test and verify it fails**

Run: `node --test --test-name-pattern='role navigation contract|department head control' test/app.test.js`

Expected: `dep_admin` has no navigation branch and no head control exists.

- [ ] **Step 3: Make navigation role-specific**

In `public/app.js`, define one source of truth:

```js
const viewsByRole = {
  platform_admin: ['platform'],
  org_admin: ['settings', 'departments'],
  dep_admin: ['inbox', 'assigned', 'completed', 'rules', 'activity', 'notifications'],
  member: ['assigned', 'completed', 'notifications'],
};
```

OrgAdmin should land on `settings` and never render queue totals, email search, email dialog, rules, activity, notifications, or manual sync. Keep Microsoft 365 connection, members, response settings, organization profile, and departments in the existing admin card layouts.

- [ ] **Step 4: Add department-head management to existing cards**

For each department card, display the current head with a `DepAdmin` badge and a selector populated only from eligible members already in that department. Submit:

```js
await mutate(`/api/departments/${departmentId}/head`, {
  method: 'PATCH',
  body: { memberId: Number(select.value) },
});
```

Render `DEPARTMENT_HEAD_REPLACEMENT_REQUIRED` inline beside the relevant department/member control. Preserve the existing Remove department confirmation and unassigned-members section.

- [ ] **Step 5: Style with existing tokens and verify**

Use current `.department-card`, `.field`, `.status-pill`, `.button`, and spacing variables. Add only narrowly scoped classes for the head row/badge and responsive stacking. Do not introduce a new color system or card style.

Run: `node --test test/app.test.js`

Expected: UI contract and app tests pass.

- [ ] **Step 6: Commit the OrgAdmin UI slice**

```bash
git add public/index.html public/app.js public/styles.css test/app.test.js
git commit -m "feat: add department admin controls to workspace ui"
```

---

### Task 8: Constrain the existing email dashboard to DepAdmin's department

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Modify: `test/app.test.js`

- [ ] **Step 1: Add failing DepAdmin UI behavior tests**

Assert a DepAdmin bootstrap produces Inbox, Assigned, Completed, Rules, Activity, and Notifications views, while omitting organization settings, department management, member management, connector controls, manual sync, and department switchers. Assert assignment and rule selectors contain only same-department active members, including the DepAdmin.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `node --test --test-name-pattern='DepAdmin UI|DepAdmin assignment candidates' test/app.test.js`

Expected: current role checks treat DepAdmin as Member or OrgAdmin.

- [ ] **Step 3: Replace workflow UI role checks**

Change email queue, rule dialog, assignment controls, activity, and department-wide grouping checks from `role === 'org_admin'` to `role === 'dep_admin'`. Allow the complete button for both `member` and `dep_admin` when the selected email is assigned to the signed-in user.

Display the fixed department name and shared mailbox in the existing sidebar context area. Hide the department selector for DepAdmin because one user can lead only one department.

- [ ] **Step 4: Remove organization-wide sync feedback from workflow UI**

Delete manual sync handlers and message-count toasts from DepAdmin and OrgAdmin navigation. Keep background connector health in OrgAdmin settings and show only sanitized connection state, mailbox count, last success time, and sanitized error text.

- [ ] **Step 5: Run app tests and commit**

Run: `node --test test/app.test.js`

Expected: all role-specific UI and API tests pass.

```bash
git add public/index.html public/app.js public/styles.css test/app.test.js
git commit -m "feat: add department scoped email dashboard"
```

---

### Task 9: Document, regress, and run the application locally

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `test/config.test.js`

- [ ] **Step 1: Update operational documentation**

Document that:

- OrgAdmin configures the single organization-wide Microsoft 365 app connection.
- Every department requires a unique shared mailbox.
- The first eligible member becomes DepAdmin automatically.
- OrgAdmin can replace the DepAdmin before moving, disabling, or promoting the current head.
- DepAdmin sees only their department's mailbox workflow and does not configure Graph credentials.
- Exchange mailbox access remains verified before department placement; LexFlow does not grant Exchange permissions.

No new per-user or per-DepAdmin client ID, secret, tenant ID, or mailbox credentials may be added to `.env.example`.

- [ ] **Step 2: Run the complete automated suite**

Run: `npm test`

Expected: all tests pass with no skipped confidentiality, migration, or cross-department isolation cases.

- [ ] **Step 3: Start the local app using the existing configured environment**

Run: `npm run dev`

Expected: server starts at `http://localhost:3000` with migrations completing successfully. Do not reset or delete the user's local database.

- [ ] **Step 4: Perform browser smoke tests**

Using the in-app browser, verify:

1. OrgAdmin signs in and lands on Settings/Departments with no email navigation or message data.
2. OrgAdmin sees the current DepAdmin on each populated department and can replace one with another member in the same department.
3. Current-head move is blocked until replacement and the error renders inside the UI.
4. DepAdmin signs in and sees only their department's Inbox, Assigned, Completed, Rules, Activity, and Notifications.
5. DepAdmin can self-assign, assign another same-department member, create a scoped rule, and complete email assigned to themselves.
6. A normal Member sees only personally assigned email.
7. Cross-department API requests return 404 and OrgAdmin email API requests return 403.

- [ ] **Step 5: Inspect logs for confidential-data leakage**

Trigger one failed mailbox sync and verify the stored/UI error excludes sender address, subject, preview, and Outlook URL. Confirm browser network responses for OrgAdmin contain no email-level fields.

- [ ] **Step 6: Commit documentation and final regression updates**

```bash
git add README.md .env.example test/config.test.js
git commit -m "docs: explain department administrator workflow"
```

- [ ] **Step 7: Record final verification**

Report the exact test count, local URL, roles exercised, and any Microsoft 365 action that still requires tenant administrator configuration outside LexFlow.
