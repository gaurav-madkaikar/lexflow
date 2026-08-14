# Outlook Assignment App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal, template-faithful web app that syncs a mock or Microsoft Graph mailbox, assigns email by admin rules, isolates member work, records completion, and creates in-app notifications.

**Architecture:** A single Express process serves a static browser client and a JSON API backed by Node's built-in SQLite module. Domain workflows own routing, idempotent import, notifications, and completion; interchangeable mock and Graph mail sources feed the same sync function.

**Tech Stack:** Node.js 26, Express 5, `node:sqlite`, built-in `fetch`, built-in `node:test`, vanilla HTML/CSS/JavaScript.

## Global Constraints

- Keep the existing template's visual language and replace its hard-coded data and inert controls with API-backed views.
- Do not introduce a frontend framework, job queue, or separate services.
- Missing Graph configuration selects demo mode and labels it clearly.
- Every API endpoint checks the authenticated user and applicable role or ownership.
- Outlook-provided strings are inserted as text rather than raw HTML.
- Use exactly five automated tests for the core contract, followed by one manual browser smoke check.
- Exclude attachments, outbound replies, full email-body storage, AI classification, webhooks, websocket updates, user administration, password recovery, and multi-mailbox support.

---

## File map

- `package.json`: scripts, Node version floor, and the single runtime dependency.
- `.gitignore`: runtime database, environment, and dependency exclusions.
- `.env.example`: optional Graph and sync configuration.
- `src/config.js`: validates environment configuration and selects demo or Graph mode.
- `src/db.js`: schema, seed data, transactions, and focused persistence functions.
- `src/auth.js`: password hashing, cookie sessions, and authentication middleware.
- `src/workflows.js`: deterministic rule matching, single-flight sync, and completion workflows.
- `src/mail-sources.js`: mock and Microsoft Graph source implementations.
- `src/app.js`: Express construction, authorization, and JSON routes.
- `src/server.js`: production composition, static serving, and interval lifecycle.
- `public/index.html`: accessible login and application shells.
- `public/styles.css`: responsive styling derived from the reference template.
- `public/app.js`: UI state, safe rendering, API calls, and interactions.
- `test/app.test.js`: the five required contract tests.
- `README.md`: startup, demo credentials, Graph setup, and verification.

### Task 1: Persistence and core assignment workflow

**Files:**

- Create: `package.json`
- Create: `.gitignore`
- Create: `src/db.js`
- Create: `src/workflows.js`
- Create: `test/app.test.js`

**Interfaces:**

- Produces: `createDatabase(filename)`, `migrate(db)`, `seedDemoData(db, passwordHashes)`, `matchRule(message, rules)`, `syncMailbox({ db, source })`, `createSyncRunner({ db, source })`, and `completeAssignedEmail({ db, emailId, userId })`.
- `source.fetchChanges(cursor)` returns `Promise<{ messages: MailMessage[], nextCursor: string | null }>`.
- `MailMessage` is `{ providerId, subject, senderName, senderAddress, preview, receivedAt, outlookUrl }`.

- [ ] **Step 1: Add the minimal Node package definition**

```json
{
  "name": "lexflow-outlook-assignment",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22.13.0" },
  "scripts": {
    "dev": "node --watch src/server.js",
    "start": "node src/server.js",
    "test": "node --test"
  },
  "dependencies": {
    "express": "^5.1.0"
  }
}
```

Ignore `node_modules/`, `.env`, `data/*.db`, `data/*.db-shm`, and `data/*.db-wal`. Run `npm install` to create the lockfile.

- [ ] **Step 2: Write contract tests 1 and 2 first**

Create a single `test/app.test.js`. Its first two tests must use an in-memory database and a deterministic source:

```js
test('first matching enabled rule assigns once and notifies once', async () => {
  const db = createDatabase(':memory:');
  seedDemoData(db);
  const source = fixedSource([ndaMessage]);

  const result = await syncMailbox({ db, source });

  assert.deepEqual(result, { imported: 1, assigned: 1 });
  assert.equal(one(db, 'SELECT assignee_id FROM emails').assignee_id, mayaId(db));
  assert.equal(one(db, 'SELECT count(*) AS count FROM notifications').count, 1);
});

test('re-importing a provider message is idempotent', async () => {
  const db = createDatabase(':memory:');
  seedDemoData(db);
  const source = fixedSource([ndaMessage]);

  await syncMailbox({ db, source });
  const result = await syncMailbox({ db, source });

  assert.deepEqual(result, { imported: 0, assigned: 0 });
  assert.equal(one(db, 'SELECT count(*) AS count FROM emails').count, 1);
  assert.equal(one(db, 'SELECT count(*) AS count FROM notifications').count, 1);
});
```

The test fixture `ndaMessage` uses provider ID `mock-nda-1`, subject `Urgent NDA amendment for ACME`, sender `legal@acme.test`, and a short plain-text preview. `fixedSource` returns the supplied messages and cursor `mock-cursor-1`.

- [ ] **Step 3: Run the tests to verify the workflow is absent**

Run: `npm test`

Expected: FAIL because `src/db.js` and `src/workflows.js` do not exist.

- [ ] **Step 4: Implement the schema and seed data**

`createDatabase(filename = ':memory:')` constructs `new DatabaseSync(filename)`, enables foreign keys and WAL for file databases, calls `migrate`, and returns the database. Use this exact schema:

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  keywords TEXT NOT NULL,
  sender_filter TEXT NOT NULL DEFAULT '',
  assignee_id INTEGER NOT NULL REFERENCES users(id),
  priority INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS emails (
  id INTEGER PRIMARY KEY,
  provider_id TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_address TEXT NOT NULL,
  preview TEXT NOT NULL,
  received_at TEXT NOT NULL,
  outlook_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('unassigned', 'assigned', 'completed')),
  assignee_id INTEGER REFERENCES users(id),
  completed_by INTEGER REFERENCES users(id),
  completed_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind = 'assignment'),
  message TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, email_id, kind)
);
CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY,
  actor_id INTEGER REFERENCES users(id),
  email_id INTEGER REFERENCES emails(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('assigned', 'completed')),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

`seedDemoData(db, { adminPasswordHash = 'test', memberPasswordHash = 'test' } = {})` inserts one admin, Maya Shah (Legal), Priya Menon (Finance), and two enabled rules only when the users table is empty. Rule priorities are `10` for `ACME,NDA → Maya` and `20` for `invoice,payment → Priya`. API tests and production composition pass real scrypt hashes after Task 2; pure workflow tests use the harmless defaults.

- [ ] **Step 5: Implement deterministic matching and transactional sync**

```js
export function matchRule(message, rules) {
  const searchable = `${message.subject} ${message.preview}`.toLocaleLowerCase();
  const sender = `${message.senderName} ${message.senderAddress}`.toLocaleLowerCase();
  return rules
    .filter(rule => rule.enabled)
    .sort((left, right) => left.priority - right.priority || left.id - right.id)
    .find(rule => {
      const words = rule.keywords.split(',').map(word => word.trim().toLocaleLowerCase()).filter(Boolean);
      const keywordsMatch = words.every(word => searchable.includes(word));
      const senderMatch = !rule.sender_filter || sender.includes(rule.sender_filter.toLocaleLowerCase());
      return keywordsMatch && senderMatch;
    }) ?? null;
}
```

`syncMailbox` reads cursor key `mail_cursor`, calls the source once, then processes all messages inside one transaction. Use `INSERT OR IGNORE` first. A successful insert increments `imported` and enters rule matching; an existing provider ID receives an `UPDATE` of subject, sender, preview, received time, and Outlook URL only, preserving assignment and completion fields. A matched new email becomes `assigned`, then receives one notification and one `assigned` activity row. Save `mail_cursor` and `last_sync_at` and clear `last_sync_error` only after processing succeeds.

`createSyncRunner` closes over one in-flight promise so manual and interval calls share the same sync rather than overlap. On failure it stores a sanitized message in `last_sync_error` outside the rolled-back import transaction and rethrows.

`completeAssignedEmail` must atomically update only `WHERE id = ? AND assignee_id = ? AND status = 'assigned'`; a retry by the same completing user returns the completed row without a second activity event, while missing or cross-user work is forbidden. On first success, create one `completed` activity row with the acting member and timestamp.

- [ ] **Step 6: Run the two tests**

Run: `npm test`

Expected: 2 PASS, 0 FAIL.

- [ ] **Step 7: Commit the core workflow**

```bash
git add package.json package-lock.json .gitignore src/db.js src/workflows.js test/app.test.js
git commit -m "feat: add deterministic email assignment workflow"
```

### Task 2: Authentication and protected API

**Files:**

- Create: `src/auth.js`
- Create: `src/app.js`
- Modify: `src/db.js`
- Modify: `test/app.test.js`

**Interfaces:**

- Consumes: Task 1 database and workflow exports.
- Produces: `hashPassword(password)`, `verifyPassword(password, encoded)`, `createSession(db, userId)`, `requireUser(db)`, and `createApp({ db, syncRunner, mode })`.
- `GET /api/bootstrap` returns only the current user's authorized data.

- [ ] **Step 1: Add contract tests 3 through 5**

Append exactly these behavioral tests to `test/app.test.js`:

```js
test('a member cannot read or complete another member email', async () => {
  const harness = await createApiHarness();
  const mayaCookie = await harness.login('maya@lexflow.local', 'welcome123');
  const priyaEmail = harness.emailAssignedTo('priya@lexflow.local');

  const bootstrap = await harness.get('/api/bootstrap', mayaCookie);
  assert.ok(bootstrap.body.emails.every(email => email.assignee.email === 'maya@lexflow.local'));
  const completion = await harness.post(`/api/emails/${priyaEmail.id}/complete`, {}, mayaCookie);
  assert.equal(completion.status, 403);
});

test('a member cannot mutate rules or trigger sync', async () => {
  const harness = await createApiHarness();
  const cookie = await harness.login('maya@lexflow.local', 'welcome123');

  const rule = await harness.post('/api/rules', validRuleInput(harness), cookie);
  const sync = await harness.post('/api/sync', {}, cookie);

  assert.equal(rule.status, 403);
  assert.equal(sync.status, 403);
});

test('completion records the member and time for admin activity', async () => {
  const harness = await createApiHarness();
  const mayaCookie = await harness.login('maya@lexflow.local', 'welcome123');
  const adminCookie = await harness.login('admin@lexflow.local', 'admin123');
  const email = harness.emailAssignedTo('maya@lexflow.local');

  const completion = await harness.post(`/api/emails/${email.id}/complete`, {}, mayaCookie);
  const admin = await harness.get('/api/bootstrap', adminCookie);
  const event = admin.body.activity.find(item => item.kind === 'completed' && item.emailId === email.id);

  assert.equal(completion.status, 200);
  assert.equal(event.actor.name, 'Maya Shah');
  assert.match(event.createdAt, /^\d{4}-\d{2}-\d{2}T/);
});
```

The test harness starts the Express app on an ephemeral local port, logs in through the public API, retains the returned session cookie, and closes both server and database after each test.

- [ ] **Step 2: Run all tests to verify the API is absent**

Run: `npm test`

Expected: 2 PASS and 3 FAIL because authentication and routes do not exist.

- [ ] **Step 3: Implement local passwords and sessions**

Use `randomBytes`, `scrypt`, and `timingSafeEqual` from `node:crypto`. Store hashes as `scrypt$<salt-hex>$<derived-key-hex>`. Session IDs are 32 random bytes, stored in `sessions`, expire after eight hours, and are returned as `lexflow_session=<id>; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`; add `Secure` when `NODE_ENV=production`.

```js
const deriveKey = promisify(scrypt);
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 8) throw new TypeError('Password must have at least 8 characters');
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${Buffer.from(key).toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, saltHex, keyHex] = String(encoded).split('$');
  if (algorithm !== 'scrypt' || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = Buffer.from(await deriveKey(password, Buffer.from(saltHex, 'hex'), expected.length));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createSession(db, userId, now = new Date()) {
  const id = randomBytes(32).toString('hex');
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(id, userId, expiresAt);
  return { id, expiresAt };
}

export function deleteSession(db, sessionId) {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export function sessionUser(db, sessionId, now = new Date()) {
  const row = db.prepare('SELECT users.*, sessions.expires_at FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.id = ?').get(sessionId);
  if (!row || row.expires_at <= now.toISOString()) {
    if (row) deleteSession(db, sessionId);
    return null;
  }
  return row;
}

export function requireUser(db) {
  return function authenticationMiddleware(request, response, next) {
    const cookie = request.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith('lexflow_session='));
    const sessionId = cookie?.slice('lexflow_session='.length);
    const user = sessionId ? sessionUser(db, sessionId) : null;
    if (!user) return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } });
    request.user = user;
    request.sessionId = sessionId;
    next();
  };
}
```

Import `promisify` from `node:util` and the crypto functions used above. Update `seedDemoData` so production composition supplies hashes for `admin123` and `welcome123`; tests supply hashes through the same parameters.

- [ ] **Step 4: Implement the compact API**

`createApp({ db, syncRunner, mode })` configures JSON bodies limited to 32 KB, static files from `public`, login/logout, authentication, and these routes:

```text
POST   /api/login                       public; email + password
POST   /api/logout                      authenticated; clears session
GET    /api/bootstrap                   authenticated; role-shaped dashboard payload
POST   /api/sync                        admin only
POST   /api/rules                       admin only; validates name, keywords, assigneeId, priority
PATCH  /api/rules/:id                   admin only; enabled boolean only
DELETE /api/rules/:id                   admin only
POST   /api/emails/:id/complete         owning member only
POST   /api/notifications/:id/read      notification owner only
```

`GET /api/bootstrap` returns `{ user, mode, emails, notifications, unreadCount }` to members. Admins additionally receive `{ rules, team, activity, sync }`. Email queries for members include `WHERE assignee_id = currentUser.id`; completion uses the guarded Task 1 workflow. An assigned email's displayed department is derived from its assignee's seeded department; unassigned email has no department and appears only under All. Return `{ error: { code, message } }` consistently with status `400`, `401`, `403`, or `404`.

When an admin creates or enables a rule, evaluate that rule against unassigned emails only; create assignment notification and activity rows in the same transaction. Disabling or deleting a rule never unassigns existing work. Equal priorities resolve by rule ID ascending.

- [ ] **Step 5: Run the complete automated suite**

Run: `npm test`

Expected: 5 PASS, 0 FAIL.

- [ ] **Step 6: Commit the protected API**

```bash
git add src/auth.js src/app.js src/db.js test/app.test.js
git commit -m "feat: enforce roles and completion workflow"
```

### Task 3: Mock and Microsoft Graph adapters

**Files:**

- Create: `.env.example`
- Create: `src/config.js`
- Create: `src/mail-sources.js`
- Create: `src/server.js`

**Interfaces:**

- Consumes: `createApp`, `createDatabase`, `seedDemoData`, and `syncMailbox`.
- Produces: `loadConfig(env)`, `createMailSource(config)`, `MockMailSource`, and `GraphMailSource`.

- [ ] **Step 1: Define configuration without adding dependencies**

`.env.example` contains:

```dotenv
PORT=3000
DATABASE_PATH=data/lexflow.db
SYNC_INTERVAL_SECONDS=300
GRAPH_TENANT_ID=
GRAPH_CLIENT_ID=
GRAPH_CLIENT_SECRET=
GRAPH_MAILBOX=
```

At startup, use `existsSync('.env')` before calling Node's built-in `loadEnvFile('.env')` so local values work without `dotenv`. `loadConfig(env)` returns demo mode unless all four `GRAPH_*` values are non-empty. Validate the port as `1..65535` and the interval as `0` or at least `60`; interval `0` disables automatic sync.

- [ ] **Step 2: Implement both sources behind one interface**

```js
function mapGraphMessage(item) {
  return {
    providerId: item.id,
    subject: item.subject || '(No subject)',
    senderName: item.from?.emailAddress?.name || 'Unknown sender',
    senderAddress: item.from?.emailAddress?.address || '',
    preview: item.bodyPreview || '',
    receivedAt: item.receivedDateTime,
    outlookUrl: item.webLink || null
  };
}

export class MockMailSource {
  async fetchChanges(cursor) {
    return cursor
      ? { messages: [], nextCursor: cursor }
      : { messages: demoMessages, nextCursor: 'mock-v1' };
  }
}

export class GraphMailSource {
  constructor({ tenantId, clientId, clientSecret, mailbox, fetchImpl = fetch }) {
    Object.assign(this, { tenantId, clientId, clientSecret, mailbox, fetchImpl });
  }

  async accessToken() {
    const form = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });
    const response = await this.fetchImpl(`https://login.microsoftonline.com/${encodeURIComponent(this.tenantId)}/oauth2/v2.0/token`, { method: 'POST', body: form });
    if (!response.ok) throw new Error(`Outlook authentication failed (${response.status})`);
    return (await response.json()).access_token;
  }

  async fetchChanges(cursor) {
    const token = await this.accessToken();
    let url = cursor || `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(this.mailbox)}/mailFolders/inbox/messages/delta?$select=id,subject,from,receivedDateTime,bodyPreview,webLink`;
    let nextCursor = cursor;
    const messages = [];
    while (url) {
      const response = await this.fetchImpl(url, { headers: { authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`Outlook sync failed (${response.status})`);
      const page = await response.json();
      messages.push(...page.value.filter(item => !item['@removed']).map(mapGraphMessage));
      nextCursor = page['@odata.deltaLink'] || nextCursor;
      url = page['@odata.nextLink'] || null;
    }
    return { messages, nextCursor };
  }
}

export function createMailSource(config) {
  return config.mode === 'graph' ? new GraphMailSource(config.graph) : new MockMailSource();
}
```

The token request posts URL-encoded `client_id`, `client_secret`, `scope=https://graph.microsoft.com/.default`, and `grant_type=client_credentials` to the tenant OAuth token endpoint. Initial sync calls the inbox messages delta endpoint with `$select=id,subject,from,receivedDateTime,bodyPreview,webLink`; later sync uses the stored cursor URL. Follow every `@odata.nextLink`, return the final `@odata.deltaLink`, and map only the seven `MailMessage` fields. Throw a concise error containing the HTTP status when either endpoint fails.

Define six `demoMessages` from the supplied preview with stable IDs `mock-nda-1`, `mock-court-1`, `mock-invoice-1`, `mock-po-1`, `mock-employment-1`, and `mock-collections-1`. The NDA and invoice records match seeded rules; Court, PO, and Employment remain available for rule-creation demonstrations. Ignore Graph `@removed` tombstones in this MVP; an expired delta cursor is reported as a sync error so an operator can clear the cursor deliberately.

- [ ] **Step 3: Compose the server and interval**

`src/server.js` creates the data directory, opens the configured database, awaits seed setup, creates the source, one shared sync runner, and the app, and listens on `127.0.0.1` by default. If `syncIntervalSeconds > 0`, call that same runner on the interval; log one concise line for success or failure. Close the timer, HTTP server, and database on `SIGINT` and `SIGTERM`.

- [ ] **Step 4: Verify both runtime modes without adding tests**

Run: `npm test`

Expected: 5 PASS, 0 FAIL.

Run: `node --check src/config.js`

Run: `node --check src/mail-sources.js`

Run: `node --check src/server.js`

Expected: exit code 0.

Start with no Graph variables and request `/api/bootstrap` after login. Expected: payload mode is `demo`. Then set only `GRAPH_CLIENT_ID` and restart. Expected: mode remains `demo`, proving partial credentials never activate Graph.

- [ ] **Step 5: Commit the mail adapters**

```bash
git add .env.example src/config.js src/mail-sources.js src/server.js
git commit -m "feat: add mock and outlook mail sources"
```

### Task 4: Template-faithful browser interface and handoff

**Files:**

- Create: `public/index.html`
- Create: `public/styles.css`
- Create: `public/app.js`
- Create: `README.md`
- Reference only: `lexflow_legal_finance_preview.html`

**Interfaces:**

- Consumes: Task 2 API response and mutation contracts.
- Produces: login, admin dashboard, member work queue, rule management, notification, detail, and completion interactions.

- [ ] **Step 1: Build semantic shells from the reference**

`public/index.html` contains one login section and one initially hidden application section. The application shell uses `<aside>`, `<nav>`, `<header>`, and `<main>`; it includes a mobile navigation button, search input, notification button/count, sync button, metrics container, department switch, email list, rules panel, activity panel, rule dialog, email detail dialog, toast region with `aria-live="polite"`, and a logout button. Load only `/styles.css` and `/app.js`; do not use inline handlers or third-party assets.

- [ ] **Step 2: Recreate and refine the template styling**

Start from the reference variables and proportions:

```css
:root {
  --bg: #f5f5f7;
  --card: #ffffff;
  --text: #1d1d1f;
  --muted: #6e6e73;
  --line: #e6e6e8;
  --blue: #0071e3;
  --green: #34c759;
  --orange: #ff9500;
  --red: #ff3b30;
  --shadow: 0 7px 28px rgb(0 0 0 / 4%);
}
```

Preserve the 245 px white sidebar, 72 px translucent header, rounded 16–17 px cards, compact metric grid, queue row hierarchy, department tags, avatars, and restrained shadows. Use only real metrics from this scope: Unassigned, Open Assigned, Completed, Active Rules, and Unread. The Legal and Finance switch filters assigned email by the assignee's department; unassigned email remains in All. Add `:focus-visible`, disabled, loading, empty, error, unread, and completed states. At widths below 850 px, use an off-canvas sidebar controlled by the navigation button instead of hiding navigation; stack the dashboard panels and make dialogs full-height.

- [ ] **Step 3: Implement one small client state loop**

```js
const state = {
  session: null,
  view: 'inbox',
  department: 'All',
  query: '',
  selectedEmailId: null
};

async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json();
  if (response.status === 401) {
    state.session = null;
    render();
  }
  if (!response.ok) throw new Error(payload.error?.message || 'Something went wrong.');
  return payload;
}

async function refresh() {
  state.session = await api('/api/bootstrap');
  render();
}

async function mutate(path, method = 'POST', body) {
  await api(path, { method, body });
  await refresh();
}
```

`render` derives all filtered lists and metrics from `state.session`, and exposes admin-only controls only for the admin role. Treat Inbox as open/unassigned, Assigned or My Work as open/assigned, and Completed as completed. Event handlers map directly to `mutate`: completion posts to `/api/emails/:id/complete`; rule creation posts form values to `/api/rules`; rule toggling patches `{ enabled }`; deletion uses `DELETE`; sync posts to `/api/sync`; notification reading posts to `/api/notifications/:id/read`. Create DOM nodes and set `textContent` for email, rule, activity, user, and notification strings; do not interpolate server data into `innerHTML`.

Poll `/api/bootstrap` every 20 seconds while authenticated and the document is visible. Pause polling when hidden and restart with an immediate refresh when visible.

- [ ] **Step 4: Document setup and demo use**

`README.md` includes these exact sections: Requirements, Run locally, Demo accounts, Microsoft Graph connection, Rule behavior, Verification, and Production limitations. Document `admin@lexflow.local / admin123`, `maya@lexflow.local / welcome123`, and `priya@lexflow.local / welcome123` as demo-only credentials. State that Graph application permissions require `Mail.Read` with admin consent and access should be restricted to the intended mailbox by tenant policy.

- [ ] **Step 5: Run the final automated and manual checks**

Run: `npm test`

Expected: 5 PASS, 0 FAIL.

Manual browser smoke check:

1. Sign in as admin and confirm the template-faithful dashboard, demo-mode label, and responsive navigation.
2. Sync mock mail, create a valid rule, and confirm an unassigned match becomes assigned.
3. Sign out, sign in as that member, and confirm only that member's assigned work appears.
4. Confirm the unread assignment notification, mark it read, open the email panel, and complete the work.
5. Sign back in as admin and confirm the completion actor and timestamp appear in activity.

- [ ] **Step 6: Commit the completed app**

```bash
git add public/index.html public/styles.css public/app.js README.md
git commit -m "feat: deliver outlook assignment dashboard"
```

## Final review

Run `git status --short`, `npm test`, and the five-step browser smoke check. Confirm that the original preview remains an unmodified reference, Graph secrets are absent from version control, the runtime database is ignored, members receive no cross-user email data, and the UI identifies demo versus connected mode.
