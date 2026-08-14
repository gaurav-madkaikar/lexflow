# Manual Assignment, Departments, and Timed Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins assign and reassign open emails, manage departments and workspace timing limits, and receive durable completion and hourly overdue notifications.

**Architecture:** Keep the single Express/SQLite process and static frontend. Add idempotent SQLite migrations, a focused workspace-settings module, transactional assignment operations in the existing workflow module, and an isolated overdue-alert runner invoked by its own one-minute server timer. The bootstrap API remains the frontend's source of truth.

**Tech Stack:** Node.js 22.13+, Express 5, built-in `node:sqlite`, built-in `node:test`, static HTML/CSS/JavaScript.

## Global Constraints

- Add no runtime dependencies, frontend framework, external scheduler, or job queue.
- Preserve existing database content through idempotent migrations.
- Keep completed emails immutable.
- Store `time_unassigned` and `time_assigned_unmarked` as whole hours from 1 through 8,760, defaulting to 1 and 24.
- Measure unassigned age from Outlook `received_at`; measure assigned age from the latest `assigned_at`.
- Sweep overdue work every minute and repeat each recipient's alert no sooner than one hour after the prior delivery.
- Default `SYNC_INTERVAL_SECONDS` to 60 while retaining `0` as disabled and 60–86,400 as the enabled range.
- Department names are trimmed, case-insensitively unique, and at most 60 characters; support add and member movement only.
- Keep all notifications in-app and preserve the supplied LexFlow template's visual language and responsive behavior.
- Insert all server-provided text with `textContent`, never raw HTML.

---

### Task 1: Durable schema and workspace catalog

**Files:**
- Modify: `src/db.js`
- Create: `src/workspace.js`
- Create: `test/workspace.test.js`

**Interfaces:**
- Produces: `getWorkspaceSettings(db) -> { timeUnassignedHours: number, timeAssignedUnmarkedHours: number }`
- Produces: `listDepartments(db) -> Array<{ id: number, name: string }>`
- Produces: `createDepartment({ db, name, now? }) -> { id: number, name: string }`
- Produces: `moveMemberToDepartment({ db, userId, departmentId }) -> { id: number, department: string }`
- Produces: `updateWorkspaceSettings({ db, timeUnassignedHours, timeAssignedUnmarkedHours }) -> settings`
- Produces schema columns/tables consumed later: `emails.assigned_at`, expanded `notifications.kind`, `departments`, `workspace_settings`, and `alert_deliveries`.

- [ ] **Step 1: Write failing persistence and workspace tests**

Add tests that create a fresh in-memory database, seed users, and assert the exact defaults and catalog:

```js
test('workspace defaults and departments are persisted', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);

  assert.deepEqual(getWorkspaceSettings(db), {
    timeUnassignedHours: 1,
    timeAssignedUnmarkedHours: 24,
  });
  assert.deepEqual(listDepartments(db).map(item => item.name), [
    'Finance',
    'Legal',
    'Operations',
  ]);

  const created = createDepartment({ db, name: '  Compliance  ' });
  const maya = db.prepare("SELECT id FROM users WHERE email = 'maya@lexflow.local'").get();
  moveMemberToDepartment({ db, userId: Number(maya.id), departmentId: created.id });

  assert.equal(
    db.prepare('SELECT department FROM users WHERE id = ?').get(maya.id).department,
    'Compliance',
  );
});

test('workspace validation rejects duplicate departments and invalid limits', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);

  assert.throws(
    () => createDepartment({ db, name: 'legal' }),
    error => error.code === 'INVALID_INPUT' && error.field === 'name',
  );
  assert.throws(
    () => updateWorkspaceSettings({
      db,
      timeUnassignedHours: 0,
      timeAssignedUnmarkedHours: 24,
    }),
    error => error.code === 'INVALID_INPUT' && error.field === 'timeUnassignedHours',
  );
});
```

Add this legacy migration setup, call `migrate(db)` twice, then assert the rows remain, `assigned_at` equals the email's `created_at`, and the notification table accepts `kind = 'completion'`:

```js
const legacy = new DatabaseSync(':memory:');
legacy.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    initials TEXT NOT NULL, department TEXT NOT NULL, role TEXT NOT NULL,
    password_hash TEXT NOT NULL
  );
  CREATE TABLE emails (
    id INTEGER PRIMARY KEY, provider_id TEXT NOT NULL UNIQUE, subject TEXT NOT NULL,
    sender_name TEXT NOT NULL, sender_address TEXT NOT NULL, preview TEXT NOT NULL,
    received_at TEXT NOT NULL, outlook_url TEXT, status TEXT NOT NULL,
    assignee_id INTEGER, completed_by INTEGER, completed_at TEXT, created_at TEXT NOT NULL
  );
  CREATE TABLE notifications (
    id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, email_id INTEGER NOT NULL,
    kind TEXT NOT NULL CHECK (kind = 'assignment'), message TEXT NOT NULL,
    read_at TEXT, created_at TEXT NOT NULL, UNIQUE(user_id, email_id, kind)
  );
  INSERT INTO users VALUES
    (1, 'admin@legacy.test', 'Legacy Admin', 'LA', 'Operations', 'admin', 'hash'),
    (2, 'member@legacy.test', 'Legacy Member', 'LM', 'Legal', 'member', 'hash');
  INSERT INTO emails VALUES
    (1, 'legacy-1', 'Legacy assignment', 'Sender', 'sender@example.test', 'Preview',
     '2026-08-14T08:00:00.000Z', NULL, 'assigned', 2, NULL, NULL,
     '2026-08-14T08:05:00.000Z');
  INSERT INTO notifications VALUES
    (1, 2, 1, 'assignment', 'New assignment: Legacy assignment', NULL,
     '2026-08-14T08:05:00.000Z');
`);

migrate(legacy);
migrate(legacy);

assert.equal(legacy.prepare('SELECT count(*) AS count FROM users').get().count, 2);
assert.equal(legacy.prepare('SELECT count(*) AS count FROM notifications').get().count, 1);
assert.equal(
  legacy.prepare('SELECT assigned_at FROM emails WHERE id = 1').get().assigned_at,
  '2026-08-14T08:05:00.000Z',
);
assert.deepEqual(
  legacy.prepare('SELECT name FROM departments ORDER BY name').all().map(row => row.name),
  ['Legal', 'Operations'],
);
legacy.prepare(`
  INSERT INTO notifications (user_id, email_id, kind, message, created_at)
  VALUES (1, 1, 'completion', 'Completed', '2026-08-14T09:00:00.000Z')
`).run();
legacy.close();
```

- [ ] **Step 2: Run the new tests and verify the persistence interfaces are absent**

Run:

```bash
node --test test/workspace.test.js
```

Expected: FAIL because `src/workspace.js` and the new schema are not implemented.

- [ ] **Step 3: Add idempotent schema migration support**

In `src/db.js`, keep the existing tables and extend migration with these definitions:

```sql
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workspace_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  time_unassigned_hours INTEGER NOT NULL CHECK (time_unassigned_hours BETWEEN 1 AND 8760),
  time_assigned_unmarked_hours INTEGER NOT NULL CHECK (time_assigned_unmarked_hours BETWEEN 1 AND 8760)
);
CREATE TABLE IF NOT EXISTS alert_deliveries (
  email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('unassigned_overdue', 'assigned_overdue')),
  last_notified_at TEXT NOT NULL,
  PRIMARY KEY (email_id, user_id, kind)
);
```

Use `PRAGMA table_info(emails)` to add `assigned_at TEXT` only when missing, then run:

```sql
UPDATE emails
SET assigned_at = created_at
WHERE status IN ('assigned', 'completed') AND assigned_at IS NULL;
```

Detect the legacy notification constraint through `sqlite_master`. When it only permits `assignment`, rebuild it transactionally as `notifications_next`, copy every existing row and ID, drop the old table, and rename the replacement. The replacement must use:

```sql
kind TEXT NOT NULL CHECK (
  kind IN ('assignment', 'completion', 'unassigned_overdue', 'assigned_overdue')
)
```

Do not retain the old `UNIQUE(user_id, email_id, kind)` constraint because overdue notifications repeat. After the table migrations, insert distinct existing `users.department` values into `departments` with `INSERT OR IGNORE` and insert singleton defaults with `INSERT OR IGNORE INTO workspace_settings`.

- [ ] **Step 4: Implement the focused workspace module**

In `src/workspace.js`, add a small domain error helper and implement the exact validation and database operations:

```js
function invalid(field, message) {
  const error = new Error(message);
  error.status = 400;
  error.code = 'INVALID_INPUT';
  error.field = field;
  return error;
}

export function getWorkspaceSettings(db) {
  const row = db.prepare('SELECT * FROM workspace_settings WHERE id = 1').get();
  return {
    timeUnassignedHours: Number(row.time_unassigned_hours),
    timeAssignedUnmarkedHours: Number(row.time_assigned_unmarked_hours),
  };
}

export function listDepartments(db) {
  return db.prepare('SELECT id, name FROM departments ORDER BY name COLLATE NOCASE')
    .all()
    .map(row => ({ id: Number(row.id), name: row.name }));
}
```

`createDepartment` must trim the name, require 1–60 characters, translate SQLite's unique-constraint error to `invalid('name', 'A department with this name already exists.')`, and return the inserted ID/name. `moveMemberToDepartment` must verify both a `role = 'member'` user and a department, return `NOT_FOUND`/404 for either missing record, update `users.department` to the catalog name, and return the member ID and new name. `updateWorkspaceSettings` must validate both inputs as integers in the approved range, update singleton row `id = 1`, and return `getWorkspaceSettings(db)`.

- [ ] **Step 5: Run persistence tests and the existing suite**

Run:

```bash
node --test test/workspace.test.js
npm test
```

Expected: all workspace tests and the existing five tests pass.

- [ ] **Step 6: Commit the schema and workspace unit**

```bash
git add src/db.js src/workspace.js test/workspace.test.js
git commit -m "feat: persist departments and workflow settings"
```

---

### Task 2: Transactional manual assignment and API

**Files:**
- Modify: `src/workflows.js`
- Modify: `src/app.js`
- Modify: `test/app.test.js`

**Interfaces:**
- Consumes: expanded notification schema and `emails.assigned_at` from Task 1.
- Produces: `assignEmailManually({ db, emailId, assigneeId, adminId, now? }) -> { changed: boolean, email: object }`.
- Produces: `POST /api/emails/:id/assign` with `{ assigneeId: number }`, admin-only, returning `{ changed, emailId, assigneeId }`.

- [ ] **Step 1: Add failing API coverage for assign, reassign, no-op, permissions, and completed state**

Add an unmatched fixture and extend the API harness with explicit options/helpers:

```js
const generalMessage = {
  providerId: 'mock-general-1',
  subject: 'General customer question',
  senderName: 'Customer',
  senderAddress: 'customer@example.test',
  preview: 'Please review this request.',
  receivedAt: '2026-08-14T08:00:00.000Z',
  outlookUrl: 'https://outlook.office.com/mail/mock-general-1',
};

async function createApiHarness(context, { includeUnassigned = false } = {}) {
```

Inside that existing function, replace its source construction with:

```js
const sourceMessages = [ndaMessage, invoiceMessage];
if (includeUnassigned) sourceMessages.push(generalMessage);
const source = fixedSource(sourceMessages);
```

Add these properties to the existing returned harness object:

```js
request,
patch: (path, body, cookie) => request('PATCH', path, body, cookie),
userId(email) {
  return Number(db.prepare('SELECT id FROM users WHERE email = ?').get(email).id);
},
```

Merge those returned fields into the existing harness object rather than replacing its `db`, `get`, `post`, `login`, and `emailAssignedTo` fields. Add one focused test with this sequence:

```js
test('admin assigns and reassigns an open email while members cannot assign', async (context) => {
  const harness = await createApiHarness(context, { includeUnassigned: true });
  const admin = await harness.login('admin@lexflow.local', 'admin123');
  const maya = await harness.login('maya@lexflow.local', 'welcome123');
  const priya = await harness.login('priya@lexflow.local', 'welcome123');
  const email = harness.db.prepare("SELECT * FROM emails WHERE status = 'unassigned'").get();
  const mayaId = harness.userId('maya@lexflow.local');
  const priyaId = harness.userId('priya@lexflow.local');

  assert.equal((await harness.post(`/api/emails/${email.id}/assign`, { assigneeId: mayaId }, maya)).status, 403);
  assert.equal((await harness.post(`/api/emails/${email.id}/assign`, { assigneeId: mayaId }, admin)).status, 200);
  assert.ok((await harness.get('/api/bootstrap', maya)).body.emails.some(item => item.id === email.id));

  const reassigned = await harness.post(`/api/emails/${email.id}/assign`, { assigneeId: priyaId }, admin);
  assert.equal(reassigned.status, 200);
  assert.equal(reassigned.body.changed, true);
  assert.ok(!(await harness.get('/api/bootstrap', maya)).body.emails.some(item => item.id === email.id));
  assert.ok((await harness.get('/api/bootstrap', priya)).body.emails.some(item => item.id === email.id));
  assert.equal(harness.db.prepare(`
    SELECT count(*) AS count FROM notifications
    WHERE email_id = ? AND user_id = ? AND kind = 'assignment'
  `).get(email.id, mayaId).count, 0);

  const noOp = await harness.post(`/api/emails/${email.id}/assign`, { assigneeId: priyaId }, admin);
  assert.equal(noOp.body.changed, false);
});
```

In the same test, complete the email as Priya and assert a subsequent admin assignment returns `409`. Assert the activity messages contain both `Assigned` and `Reassigned`, and that `assigned_at` changes on the real reassignment but not on the no-op.

- [ ] **Step 2: Run the assignment test and verify the route fails**

Run:

```bash
node --test --test-name-pattern="admin assigns and reassigns" test/app.test.js
```

Expected: FAIL with a 404 API route response.

- [ ] **Step 3: Refactor automation assignment around one record-assignment primitive**

In `src/workflows.js`, replace the rule-specific notification/update helper with `recordAssignment(db, { email, assignee, actorId, assignedAt, allowReassignment }) -> boolean`. It receives loaded records, performs no transaction of its own, and must use:

```sql
UPDATE emails
SET status = 'assigned', assignee_id = ?, assigned_at = ?
WHERE id = ? AND status IN ('unassigned', 'assigned');
```

For a changed assignee, delete the former member's `assignment` and `assigned_overdue` notifications plus their `assigned_overdue` row from `alert_deliveries`. Insert the new member's assignment notification and an `activity(kind = 'assigned')` row. Use `Assigned "<subject>" to <name>` for first assignment and `Reassigned "<subject>" from <old> to <new>` for reassignment. Rule application still requires `status = 'unassigned'`, passes `actor_id = NULL`, sets `assigned_at`, and creates exactly one notification/activity event.

- [ ] **Step 4: Export the manual assignment transaction**

Implement:

```js
export function assignEmailManually({
  db,
  emailId,
  assigneeId,
  adminId,
  now = new Date(),
}) {
  return runTransaction(db, () => {
    const assignedAt = now.toISOString();
    const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(emailId);
    const assignee = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'member'").get(assigneeId);
    const admin = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'admin'").get(adminId);
    if (!email) throw workflowError(404, 'NOT_FOUND', 'Email not found.');
    if (!assignee) throw workflowError(404, 'NOT_FOUND', 'Team member not found.');
    if (!admin) throw workflowError(403, 'FORBIDDEN', 'Admin access is required.');
    if (email.status === 'completed') {
      throw workflowError(409, 'CONFLICT', 'Completed emails cannot be reassigned.');
    }
    if (Number(email.assignee_id) === Number(assigneeId)) {
      return { changed: false, email };
    }
    const changed = recordAssignment(db, {
      email,
      assignee,
      actorId: adminId,
      assignedAt,
      allowReassignment: true,
    });
    if (!changed) {
      throw workflowError(409, 'CONFLICT', 'Email assignment changed. Refresh and try again.');
    }
    return {
      changed: true,
      email: db.prepare('SELECT * FROM emails WHERE id = ?').get(emailId),
    };
  });
}
```

Define `workflowError(status, code, message)` beside the transaction helpers so every branch above carries its safe HTTP metadata.

- [ ] **Step 5: Add the admin-only endpoint**

Import `assignEmailManually` in `src/app.js` and register before the completion route:

```js
app.post('/api/emails/:id/assign', requireAdmin, (request, response, next) => {
  try {
    const emailId = resourceId(request.params.id);
    const assigneeId = resourceId(request.body?.assigneeId);
    if (!emailId) return notFound(response, 'Email not found.');
    if (!assigneeId) return validationError(response, 'Choose a valid team member.', 'assigneeId');
    const result = assignEmailManually({
      db,
      emailId,
      assigneeId,
      adminId: Number(request.user.id),
    });
    response.json({
      changed: result.changed,
      emailId,
      assigneeId: Number(result.email.assignee_id),
      assignedAt: result.email.assigned_at,
    });
  } catch (error) {
    next(error);
  }
});
```

Add the email serializer field and response helper:

```js
// Inside emailFromRow(row)
assignedAt: row.assigned_at,

function notFound(response, message) {
  return response.status(404).json({
    error: { code: 'NOT_FOUND', message },
  });
}
```

Enhance the error middleware so explicitly safe workflow errors in the 400–499 range retain their code/message and optional `field` as `error.fields`.

- [ ] **Step 6: Run assignment and regression tests**

Run:

```bash
node --test --test-name-pattern="assigns and reassigns|first matching|re-importing|cannot read or complete" test/app.test.js
npm test
```

Expected: all selected tests and the full suite pass.

- [ ] **Step 7: Commit assignment behavior**

```bash
git add src/workflows.js src/app.js test/app.test.js
git commit -m "feat: let admins assign and reassign email"
```

---

### Task 3: Admin department and timing APIs

**Files:**
- Modify: `src/app.js`
- Modify: `test/app.test.js`

**Interfaces:**
- Consumes: all functions from `src/workspace.js`.
- Produces admin bootstrap fields: `departments` and `settings`.
- Produces: `POST /api/departments`, `PATCH /api/team/:id/department`, and `PATCH /api/settings`.

- [ ] **Step 1: Write a failing admin-management API test**

```js
test('only admins manage departments, team placement, and workspace limits', async (context) => {
  const harness = await createApiHarness(context);
  const admin = await harness.login('admin@lexflow.local', 'admin123');
  const member = await harness.login('maya@lexflow.local', 'welcome123');
  const maya = harness.userId('maya@lexflow.local');

  assert.equal((await harness.post('/api/departments', { name: 'Compliance' }, member)).status, 403);
  const created = await harness.post('/api/departments', { name: 'Compliance' }, admin);
  assert.equal(created.status, 201);

  const moved = await harness.patch(`/api/team/${maya}/department`, {
    departmentId: created.body.department.id,
  }, admin);
  assert.equal(moved.status, 200);

  const settings = await harness.patch('/api/settings', {
    timeUnassignedHours: 2,
    timeAssignedUnmarkedHours: 12,
  }, admin);
  assert.deepEqual(settings.body.settings, {
    timeUnassignedHours: 2,
    timeAssignedUnmarkedHours: 12,
  });

  const bootstrap = await harness.get('/api/bootstrap', admin);
  assert.ok(bootstrap.body.departments.some(item => item.name === 'Compliance'));
  assert.equal(bootstrap.body.team.find(item => item.id === maya).department, 'Compliance');
  assert.deepEqual(bootstrap.body.settings, settings.body.settings);
});
```

Also assert duplicate `compliance` returns `400` with `fields.name`, invalid `timeUnassignedHours` returns `400`, and all three mutation endpoints return `403` to a member.

- [ ] **Step 2: Run the management test and verify routes/bootstrap fields fail**

Run:

```bash
node --test --test-name-pattern="manage departments" test/app.test.js
```

Expected: FAIL because bootstrap fields and routes do not exist.

- [ ] **Step 3: Expose catalog and settings in admin bootstrap**

Import the workspace functions in `src/app.js`. In the admin branch of `/api/bootstrap`, add:

```js
payload.departments = listDepartments(db);
payload.settings = getWorkspaceSettings(db);
```

Do not send these management collections to members.

- [ ] **Step 4: Add the three admin-only mutation routes**

Implement these response shapes:

```js
app.post('/api/departments', requireAdmin, (request, response, next) => {
  try {
    const department = createDepartment({ db, name: request.body?.name });
    response.status(201).json({ department });
  } catch (error) { next(error); }
});

app.patch('/api/team/:id/department', requireAdmin, (request, response, next) => {
  try {
    const userId = resourceId(request.params.id);
    const departmentId = resourceId(request.body?.departmentId);
    if (!userId) return notFound(response, 'Team member not found.');
    if (!departmentId) return validationError(response, 'Choose a valid department.', 'departmentId');
    response.json({ member: moveMemberToDepartment({ db, userId, departmentId }) });
  } catch (error) { next(error); }
});

app.patch('/api/settings', requireAdmin, (request, response, next) => {
  try {
    response.json({ settings: updateWorkspaceSettings({
      db,
      timeUnassignedHours: Number(request.body?.timeUnassignedHours),
      timeAssignedUnmarkedHours: Number(request.body?.timeAssignedUnmarkedHours),
    }) });
  } catch (error) { next(error); }
});
```

Use the shared API error middleware to expose each domain error's field-safe message.

- [ ] **Step 5: Run management and full tests**

Run:

```bash
node --test --test-name-pattern="manage departments" test/app.test.js
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit admin management APIs**

```bash
git add src/app.js test/app.test.js
git commit -m "feat: add department and timing controls"
```

---

### Task 4: Completion notifications and hourly overdue engine

**Files:**
- Create: `src/alerts.js`
- Modify: `src/workflows.js`
- Modify: `src/config.js`
- Modify: `src/server.js`
- Modify: `.env.example`
- Create: `test/alerts.test.js`
- Modify: `test/app.test.js`

**Interfaces:**
- Consumes: `getWorkspaceSettings(db)` and Task 1 alert tables.
- Produces: `evaluateOverdueAlerts({ db, now? }) -> { created: number }`.
- Produces: `createAlertRunner({ db, clock?, evaluate? }) -> { run(): Promise<{ created: number }> }`, with concurrent calls sharing one promise.
- Changes: `completeAssignedEmail({ db, emailId, userId, now? })` sends one completion notification to every admin on its first successful transition.

- [ ] **Step 1: Write failing completion-notification assertions**

Extend the existing completion API test. Insert the second admin immediately after harness creation and before the first completion request; keep the existing `admin` bootstrap fetch after that request:

```js
const secondAdminPasswordHash = await hashPassword('secondadmin123');
harness.db.prepare(`
  INSERT INTO users (email, name, initials, department, role, password_hash)
  VALUES ('ops2@lexflow.local', 'Second Admin', 'SA', 'Operations', 'admin', ?)
`).run(secondAdminPasswordHash);

const completionNotifications = admin.body.notifications.filter(item =>
  item.kind === 'completion' && item.emailId === email.id
);
assert.equal(completionNotifications.length, 1);
assert.equal(completionNotifications[0].readAt, null);

await harness.post(`/api/emails/${email.id}/complete`, {}, mayaCookie);
const repeated = await harness.get('/api/bootstrap', adminCookie);
assert.equal(repeated.body.notifications.filter(item =>
  item.kind === 'completion' && item.emailId === email.id
).length, 1);
assert.equal(harness.db.prepare(`
  SELECT count(*) AS count
  FROM notifications
  WHERE email_id = ? AND kind = 'completion'
`).get(email.id).count, 2);
```

- [ ] **Step 2: Write failing overdue evaluator tests with an injected clock**

In `test/alerts.test.js`, seed a second admin, insert an unmatched email received at `2026-08-14T08:00:00.000Z`, and evaluate at `2026-08-14T09:01:00.000Z`. Assert two `unassigned_overdue` notifications are created, a second evaluation at `09:59` creates zero, and an evaluation at `10:01` creates two repeats.

Add an assigned-email case with `assigned_at = '2026-08-13T09:00:00.000Z'` and evaluate at `2026-08-14T09:01:00.000Z`. Assert `assigned_overdue` reaches every admin and only the current member. Then:

```js
const result = evaluateOverdueAlerts({ db, now: new Date('2026-08-14T09:01:00.000Z') });
assert.equal(result.created, 3); // two admins plus the current assignee

const duplicate = evaluateOverdueAlerts({ db, now: new Date('2026-08-14T09:30:00.000Z') });
assert.equal(duplicate.created, 0);

const repeated = evaluateOverdueAlerts({ db, now: new Date('2026-08-14T10:01:00.000Z') });
assert.equal(repeated.created, 3);
```

Reassign with `assignEmailManually({ db, emailId: assigned.id, assigneeId: priya.id, adminId: admin.id, now: new Date('2026-08-14T10:02:00.000Z') })`, assert the former member's alert state/notifications are removed, and assert no assigned-overdue alert is created before the new 24-hour window. Complete another overdue assignment and assert later sweeps create no additional alerts. Add `assert.equal(loadConfig({}).syncIntervalSeconds, 60)`.

Add an overlap test through the runner's injected evaluator:

```js
test('alert runner coalesces overlapping sweeps', async () => {
  let calls = 0;
  let release;
  const deferred = new Promise(resolve => { release = resolve; });
  const runner = createAlertRunner({
    db: null,
    clock: () => new Date('2026-08-14T10:00:00.000Z'),
    evaluate() {
      calls += 1;
      return deferred;
    },
  });

  const first = runner.run();
  const second = runner.run();
  assert.equal(first, second);
  release({ created: 0 });
  assert.deepEqual(await first, { created: 0 });
  assert.equal(calls, 1);
});
```

- [ ] **Step 3: Run alert-focused tests and verify they fail**

Run:

```bash
node --test test/alerts.test.js
node --test --test-name-pattern="completion records" test/app.test.js
```

Expected: FAIL because the alert module and completion notification do not exist.

- [ ] **Step 4: Add idempotent admin completion notifications**

Change `completeAssignedEmail` to accept `now = new Date()` and use `now.toISOString()`. Inside the transaction and only when the status update changes one row, insert one notification for every admin:

```sql
INSERT INTO notifications (user_id, email_id, kind, message, created_at)
SELECT id, ?, 'completion', ?, ?
FROM users
WHERE role = 'admin';
```

Use message `<member name> completed "<subject>"`. Keep the existing idempotent completed-state return outside the mutation branch so retries do not insert again.

In the same successful transition, run `DELETE FROM alert_deliveries WHERE email_id = ? AND kind = 'assigned_overdue'` so completion resolves alert state immediately.

- [ ] **Step 5: Implement the isolated overdue evaluator**

In `src/alerts.js`, define `REPEAT_MS = 60 * 60 * 1000`. `evaluateOverdueAlerts` must run one `BEGIN IMMEDIATE` transaction, load settings/admin IDs, and select only:

```sql
SELECT * FROM emails
WHERE status = 'unassigned'
  AND datetime(received_at, '+' || ? || ' hours') <= datetime(?);

SELECT * FROM emails
WHERE status = 'assigned'
  AND assigned_at IS NOT NULL
  AND datetime(assigned_at, '+' || ? || ' hours') <= datetime(?);
```

For every unassigned row target all admins. For every assigned row target all admins plus `assignee_id`. Before inserting, load `alert_deliveries` for `(email_id, user_id, kind)` and skip when `now.getTime() - new Date(last_notified_at).getTime() < REPEAT_MS`. Otherwise insert one unread notification and upsert `last_notified_at` in the same transaction. Use these messages:

```js
`Unassigned for over ${settings.timeUnassignedHours} hour(s): ${email.subject}`
`Not completed after ${settings.timeAssignedUnmarkedHours} hour(s): ${email.subject}`
```

Delete stale delivery rows whose email no longer has the matching state. Export a runner whose in-flight promise coalesces overlapping calls:

```js
export function createAlertRunner({
  db,
  clock = () => new Date(),
  evaluate = evaluateOverdueAlerts,
}) {
  let inFlight = null;
  return {
    run() {
      if (inFlight) return inFlight;
      inFlight = Promise.resolve()
        .then(() => evaluate({ db, now: clock() }))
        .finally(() => { inFlight = null; });
      return inFlight;
    },
  };
}
```

- [ ] **Step 6: Wire the independent one-minute timer and sync default**

In `src/config.js`, change only the fallback from 300 to 60. In `.env.example`, set `SYNC_INTERVAL_SECONDS=60`.

In `src/server.js`, create one `alertRunner` after the database is ready and use one scoped reporter:

```js
function reportAlertError(error) {
  console.error(`Overdue alert sweep failed: ${error.message}`);
}

alertRunner.run().catch(reportAlertError);
const alertTimer = setInterval(() => {
  alertRunner.run().catch(reportAlertError);
}, 60_000);
alertTimer.unref();
```

This timer is independent of mail sync. In `stop()`, clear both timers before closing the server/database.

- [ ] **Step 7: Run alert, API, and full tests**

Run:

```bash
node --test test/alerts.test.js
node --test --test-name-pattern="completion records" test/app.test.js
npm test
node --check src/alerts.js
node --check src/server.js
```

Expected: all commands pass.

- [ ] **Step 8: Commit timed notification behavior**

```bash
git add src/alerts.js src/workflows.js src/config.js src/server.js .env.example test/alerts.test.js test/app.test.js
git commit -m "feat: notify overdue work and completions"
```

---

### Task 5: Admin assignment and settings interface

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`

**Interfaces:**
- Consumes: bootstrap `team`, `departments`, `settings`, email `assignedAt`, and all notification kinds.
- Consumes: Task 2 and Task 3 API routes.
- Produces: admin assignment controls, dynamic department filters, Settings view, and kind-aware notification labels.

- [ ] **Step 1: Establish a failing static UI contract**

Before editing markup, verify the required IDs are absent:

```bash
rg -n "settings-panel|timing-form|department-form|email-assignee-select|assign-button" public/index.html
```

Expected: no matches and a non-zero exit status.

- [ ] **Step 2: Add minimal semantic markup**

In the admin Management navigation, add a `data-view="settings"` button labeled `Settings`. Replace hard-coded department options/buttons with containers that initially contain only `All`.

Add `#settings-panel` to the right rail with:

```html
<form id="timing-form" novalidate>
  <label class="field">
    <span>Time unassigned <em>hours</em></span>
    <input name="timeUnassignedHours" type="number" min="1" max="8760" required>
  </label>
  <label class="field">
    <span>Time assigned, not complete <em>hours</em></span>
    <input name="timeAssignedUnmarkedHours" type="number" min="1" max="8760" required>
  </label>
  <p class="form-error" id="timing-error" role="alert" hidden></p>
  <button class="button primary" type="submit">Save timing</button>
</form>
<form id="department-form" novalidate>
  <label class="field">
    <span>New department</span>
    <input name="name" maxlength="60" autocomplete="off" required>
  </label>
  <p class="form-error" id="department-error" role="alert" hidden></p>
  <button class="button" type="submit">Add department</button>
</form>
<div id="team-department-list"></div>
```

In the email detail content, add an admin-only `#email-assignment-control` containing a labeled `#email-assignee-select` and `#assignment-error`. Add `#assign-button` beside the existing Outlook/Complete actions. Keep the current read-only assignee and department fields.

- [ ] **Step 3: Render dynamic departments and Settings data**

In `public/app.js`, add `settingsDirty: false` to state, add the new elements, and include `settings` in admin `normalizeView()`. Implement `renderDepartments()` to replace the sidebar options and filter buttons from `state.session.departments`, always prefixing `All`. Use DOM creation and `textContent`. If the current filter no longer exists, reset it to `All`.

Change email tags from a department-derived CSS class to the stable class `tag department`. Implement `renderSettings()` to fill timing inputs only when `state.settingsDirty` is false, render each team member with a labeled department `<select data-member-id>`, and preserve member ordering from bootstrap. Select the department whose catalog name equals the member's `department` value.

Update `renderPanels()`, `renderHeader()`, and `render()` so Settings is a focused admin panel and dynamic departments render before the current value is selected.

- [ ] **Step 4: Add assignment interaction in the existing email drawer**

In `openEmail`, show assignment controls only when the current user is admin and the email is not completed. Populate the select from `state.session.team`, select the current assignee when present, and set button text to `Assign` or `Reassign`. Hide member completion controls from admins as before.

On `#assign-button` click, require `state.selectedEmailId` and a selected member, set the button busy, then call:

```js
await mutate(`/api/emails/${state.selectedEmailId}/assign`, 'POST', {
  assigneeId: Number(elements.emailAssigneeSelect.value),
});
```

Close the drawer and show `Email assigned.` or `Email reassigned.` after success. On failure, keep the drawer open and render the field/API message at `#assignment-error`.

- [ ] **Step 5: Add Settings form and member-movement interactions**

Set `state.settingsDirty = true` on timing-form input. Submit `#timing-form` to `PATCH /api/settings` with numeric values, set the flag back to false only after success, and retain the user's values on failure or background polling. Submit `#department-form` to `POST /api/departments` with the trimmed name. Delegate `change` events from `#team-department-list` to:

```js
await mutate(`/api/team/${select.dataset.memberId}/department`, 'PATCH', {
  departmentId: Number(select.value),
});
```

Use `clearFieldErrors`, `showFormError`, `setButtonBusy`, and existing toast patterns. Refresh after every success so rule assignee labels, queue tags, filters, and team selectors stay consistent.

Reset `state.settingsDirty` during logout.

- [ ] **Step 6: Make notification labels reflect their kind**

Replace the hard-coded Assignment heading with:

```js
const notificationLabels = {
  assignment: 'Assignment',
  completion: 'Completed',
  unassigned_overdue: 'Unassigned overdue',
  assigned_overdue: 'Assignment overdue',
};
```

Use `notificationLabels[item.kind] ?? 'Notification'`. Retain Open email only when the email is in the current user's bootstrap payload and retain Mark read for every unread kind. Change empty and metric copy from assignment-only to general notifications.

- [ ] **Step 7: Add restrained responsive styles**

Reuse `.card`, `.field`, `.button`, and `.form-error`. Add only layout rules for `.settings-layout`, `.settings-section`, `.team-department-row`, and `.assignment-control`. Use one-column settings and full-width selectors under 640 px. Use a generic `.tag.department` color treatment so arbitrary department names remain safe and visually consistent.

- [ ] **Step 8: Run syntax/static checks and browser smoke test**

Run:

```bash
node --check public/app.js
rg -n "settings-panel|timing-form|department-form|email-assignee-select|assign-button" public/index.html
rg -n "innerHTML|onclick=|onsubmit=" public
git diff --check
```

Expected: syntax passes, all five required IDs are found, unsafe HTML/inline handler search has no matches, and diff check passes.

Use the running local app at desktop width and 390 px width. Verify admin assigns Inbox mail, reassigns from Assigned, cannot edit Completed, adds Compliance, moves Maya, saves 2/12 timing values, and sees dynamic filters. Verify Maya sees only current work and both roles can read kind-labeled notifications.

- [ ] **Step 9: Commit the interface**

```bash
git add public/index.html public/app.js public/styles.css
git commit -m "feat: add admin assignment and settings UI"
```

---

### Task 6: Documentation and final verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Documents the completed runtime, roles, timing semantics, and verification commands.

- [ ] **Step 1: Update concise user-facing documentation**

Update README sections to state:

- Automatic sync defaults to one minute and can still be changed by `SYNC_INTERVAL_SECONDS`.
- Admins can manually assign/reassign open email, add departments, move members, and edit both whole-hour workspace limits.
- `time_unassigned` begins at Outlook received time; `time_assigned_unmarked` begins at the latest assignment/reassignment.
- Completion alerts go to admins; unassigned overdue alerts go to admins; assigned overdue alerts go to admins and the current assignee; unresolved alerts repeat hourly.
- The automated suite is intentionally focused without claiming exactly five tests.
- The browser smoke flow includes Settings, reassignment, and admin notifications.

- [ ] **Step 2: Run the complete verification gate**

Run:

```bash
npm test
node --check src/db.js
node --check src/workspace.js
node --check src/workflows.js
node --check src/alerts.js
node --check src/app.js
node --check src/config.js
node --check src/server.js
node --check public/app.js
git diff --check
git status --short
```

Expected: all tests and syntax checks pass; diff check is clean; only intended source/docs changes plus the pre-existing untracked `lexflow_legal_finance_preview.html` appear.

- [ ] **Step 3: Confirm existing database migration without changing user data**

Copy `data/lexflow.db` to a temporary directory, start `createDatabase(tempPath)`, and query the copy for the new tables/columns, preserved user/email counts, departments, and singleton settings. Close and remove only the temporary copy. Do not modify or delete the user's live database.

- [ ] **Step 4: Commit documentation and verification updates**

```bash
git add README.md
git commit -m "docs: explain assignment and overdue alerts"
```

- [ ] **Step 5: Review the final diff against the approved spec**

Check every success criterion in `docs/superpowers/specs/2026-08-14-manual-assignment-departments-alerts-design.md` against the implementation. Confirm no bulk assignment, department rename/delete, user creation, external notification delivery, frontend framework, or job queue was added.
