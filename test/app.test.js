import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

import { createApp } from '../src/app.js';
import { hashPassword } from '../src/auth.js';
import { createDatabase, seedDemoData } from '../src/db.js';
import { createGmailIntegration } from '../src/gmail.js';
import { createSyncRunner, syncMailbox } from '../src/workflows.js';

const ndaMessage = {
  providerId: 'mock-nda-1',
  subject: 'Urgent NDA amendment for ACME',
  senderName: 'ACME Legal',
  senderAddress: 'legal@acme.test',
  preview: 'Please review the NDA amendment before the signing call.',
  receivedAt: '2026-08-14T08:30:00.000Z',
  outlookUrl: 'https://outlook.office.com/mail/mock-nda-1',
};

const invoiceMessage = {
  providerId: 'mock-invoice-1',
  subject: 'Outstanding payment for invoice INV-4821',
  senderName: 'Globex Accounts Payable',
  senderAddress: 'ap@globex.test',
  preview: 'Please confirm when the invoice payment will be processed.',
  receivedAt: '2026-08-14T08:10:00.000Z',
  outlookUrl: 'https://outlook.office.com/mail/mock-invoice-1',
};

const generalMessage = {
  providerId: 'mock-general-1',
  subject: 'General customer question',
  senderName: 'Customer',
  senderAddress: 'customer@example.test',
  preview: 'Please review this request.',
  receivedAt: '2026-08-14T08:00:00.000Z',
  outlookUrl: 'https://outlook.office.com/mail/mock-general-1',
};

function fixedSource(messages, cursorKey = 'mail_cursor') {
  return {
    cursorKey,
    async fetchChanges() {
      return { messages, nextCursor: 'mock-cursor-1' };
    },
  };
}

function one(db, sql, ...parameters) {
  return db.prepare(sql).get(...parameters);
}

function mayaId(db) {
  return one(db, 'SELECT id FROM users WHERE email = ?', 'maya@lexflow.local').id;
}

async function createApiHarness(
  context,
  {
    includeUnassigned = false,
    clock = () => new Date(),
    mode = 'demo',
    integrationFactory = () => ({}),
  } = {},
) {
  const db = createDatabase(':memory:');
  const [adminPasswordHash, memberPasswordHash] = await Promise.all([
    hashPassword('admin123'),
    hashPassword('welcome123'),
  ]);
  seedDemoData(db, { adminPasswordHash, memberPasswordHash });

  const sourceMessages = [ndaMessage, invoiceMessage];
  if (includeUnassigned) sourceMessages.push(generalMessage);
  const source = fixedSource(sourceMessages);
  const syncRunner = createSyncRunner({ db, source });
  await syncRunner.run();
  const integrations = integrationFactory(db);
  const server = createApp({ db, syncRunner, mode, integrations, clock })
    .listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  context.after(async () => {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
    db.close();
  });

  async function request(method, path, body, cookie, { redirect = 'follow' } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      redirect,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(cookie ? { cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const contentType = response.headers.get('content-type') ?? '';
    return {
      status: response.status,
      body: text ? (contentType.includes('application/json') ? JSON.parse(text) : text) : null,
      cookie: response.headers.get('set-cookie')?.split(';', 1)[0] ?? null,
      location: response.headers.get('location'),
    };
  }

  return {
    db,
    integrations,
    request,
    get: (path, cookie, options) => request('GET', path, undefined, cookie, options),
    post: (path, body, cookie) => request('POST', path, body, cookie),
    patch: (path, body, cookie) => request('PATCH', path, body, cookie),
    delete: (path, cookie) => request('DELETE', path, undefined, cookie),
    userId(email) {
      return Number(db.prepare('SELECT id FROM users WHERE email = ?').get(email).id);
    },
    async login(email, password) {
      const response = await request('POST', '/api/login', { email, password });
      assert.equal(response.status, 200);
      assert.ok(response.cookie);
      return response.cookie;
    },
    emailAssignedTo(email) {
      return db.prepare(`
        SELECT emails.*
        FROM emails
        JOIN users ON users.id = emails.assignee_id
        WHERE users.email = ?
      `).get(email);
    },
  };
}

test('first matching enabled rule assigns once and notifies once', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const priyaId = one(db, 'SELECT id FROM users WHERE email = ?', 'priya@lexflow.local').id;
  db.prepare(`
    INSERT INTO rules (name, keywords, sender_filter, assignee_id, priority, enabled, created_at)
    VALUES ('Priority NDA route', 'ACME,NDA', '', ?, 5, 1, ?)
  `).run(priyaId, new Date().toISOString());
  const source = fixedSource([ndaMessage]);

  const result = await syncMailbox({ db, source });

  assert.deepEqual(result, { imported: 1, assigned: 1 });
  assert.equal(one(db, 'SELECT assignee_id FROM emails').assignee_id, priyaId);
  assert.equal(one(db, 'SELECT count(*) AS count FROM notifications').count, 1);
});

test('re-importing is idempotent and mail-source cursors stay isolated', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const source = fixedSource([ndaMessage], 'mail_cursor:demo');

  await syncMailbox({ db, source });
  const result = await syncMailbox({ db, source });
  let graphCursor = 'not-called';
  await syncMailbox({
    db,
    source: {
      cursorKey: 'mail_cursor:graph:shared@example.test',
      async fetchChanges(cursor) {
        graphCursor = cursor;
        return { messages: [], nextCursor: 'graph-delta-1' };
      },
    },
  });

  assert.deepEqual(result, { imported: 0, assigned: 0 });
  assert.equal(graphCursor, null);
  assert.equal(one(db, 'SELECT count(*) AS count FROM emails').count, 1);
  assert.equal(one(db, 'SELECT count(*) AS count FROM notifications').count, 1);
});

test('a member cannot read or complete another member email', async (context) => {
  const harness = await createApiHarness(context);
  const mayaCookie = await harness.login('maya@lexflow.local', 'welcome123');
  const priyaEmail = harness.emailAssignedTo('priya@lexflow.local');

  const bootstrap = await harness.get('/api/bootstrap', mayaCookie);
  assert.equal(bootstrap.status, 200);
  assert.ok(bootstrap.body.emails.every(email => email.assignee.email === 'maya@lexflow.local'));

  const completion = await harness.post(`/api/emails/${priyaEmail.id}/complete`, {}, mayaCookie);
  assert.equal(completion.status, 403);
});

test('marking a notification read removes it from the active notification feed', async (context) => {
  const harness = await createApiHarness(context);
  const cookie = await harness.login('maya@lexflow.local', 'welcome123');
  const before = await harness.get('/api/bootstrap', cookie);
  const notification = before.body.notifications[0];

  assert.ok(notification);
  const marked = await harness.post(`/api/notifications/${notification.id}/read`, {}, cookie);
  const after = await harness.get('/api/bootstrap', cookie);

  assert.equal(marked.status, 200);
  assert.equal(after.body.notifications.some(item => item.id === notification.id), false);
  assert.equal(after.body.unreadCount, before.body.unreadCount - 1);
  assert.ok(harness.db.prepare('SELECT read_at FROM notifications WHERE id = ?').get(notification.id).read_at);
});

test('a member cannot mutate rules or trigger sync', async (context) => {
  const harness = await createApiHarness(context);
  const cookie = await harness.login('maya@lexflow.local', 'welcome123');
  const assigneeId = mayaId(harness.db);
  const existingRuleId = one(harness.db, 'SELECT id FROM rules ORDER BY id').id;

  const rule = await harness.post('/api/rules', {
    name: 'Court review',
    keywords: 'court',
    senderFilter: '',
    assigneeId,
    priority: 30,
  }, cookie);
  const update = await harness.patch(`/api/rules/${existingRuleId}`, { name: 'Changed' }, cookie);
  const sync = await harness.post('/api/sync', {}, cookie);

  assert.equal(rule.status, 403);
  assert.equal(update.status, 403);
  assert.equal(sync.status, 403);
});

test('admin partially updates a rule and applies its final criteria immediately', async (context) => {
  const harness = await createApiHarness(context, { includeUnassigned: true });
  const adminCookie = await harness.login('admin@lexflow.local', 'admin123');
  const ruleBefore = one(harness.db, "SELECT * FROM rules WHERE name = 'ACME NDA review'");
  const unassigned = one(harness.db, "SELECT * FROM emails WHERE status = 'unassigned'");

  const renamed = await harness.patch(
    `/api/rules/${ruleBefore.id}`,
    { name: 'Customer sender route' },
    adminCookie,
  );

  assert.equal(renamed.status, 200);
  assert.equal(renamed.body.rule.name, 'Customer sender route');
  assert.equal(renamed.body.rule.keywords, ruleBefore.keywords);
  assert.equal(renamed.body.rule.senderFilter, ruleBefore.sender_filter);
  assert.equal(renamed.body.rule.assignee.id, Number(ruleBefore.assignee_id));
  assert.equal(renamed.body.rule.priority, Number(ruleBefore.priority));
  assert.equal(renamed.body.rule.enabled, true);

  const disabled = await harness.patch(
    `/api/rules/${ruleBefore.id}`,
    { enabled: false },
    adminCookie,
  );
  const senderOnly = await harness.patch(
    `/api/rules/${ruleBefore.id}`,
    { keywords: '', senderFilter: 'customer@example.test' },
    adminCookie,
  );

  assert.equal(disabled.status, 200);
  assert.equal(disabled.body.rule.enabled, false);
  assert.equal(senderOnly.status, 200);
  assert.equal(senderOnly.body.rule.keywords, '');
  assert.equal(senderOnly.body.rule.senderFilter, 'customer@example.test');
  assert.equal(senderOnly.body.rule.enabled, false);
  assert.equal(
    one(harness.db, 'SELECT assignee_id FROM emails WHERE id = ?', unassigned.id).assignee_id,
    null,
  );

  const enabled = await harness.patch(
    `/api/rules/${ruleBefore.id}`,
    { enabled: true },
    adminCookie,
  );
  assert.equal(enabled.status, 200);
  assert.equal(enabled.body.rule.enabled, true);
  assert.equal(
    one(harness.db, 'SELECT assignee_id FROM emails WHERE id = ?', unassigned.id).assignee_id,
    ruleBefore.assignee_id,
  );
});

test('admin creates a sender-only rule and it assigns matching unassigned email', async (context) => {
  const harness = await createApiHarness(context, { includeUnassigned: true });
  const adminCookie = await harness.login('admin@lexflow.local', 'admin123');
  const assigneeId = harness.userId('priya@lexflow.local');
  const unassigned = one(harness.db, "SELECT * FROM emails WHERE status = 'unassigned'");

  const created = await harness.post('/api/rules', {
    name: 'Customer sender route',
    keywords: '',
    senderFilter: 'customer@example.test',
    assigneeId,
    priority: 30,
  }, adminCookie);

  assert.equal(created.status, 201);
  assert.equal(
    one(harness.db, 'SELECT assignee_id FROM emails WHERE id = ?', unassigned.id).assignee_id,
    assigneeId,
  );
});

test('rule creation and updates roll back when immediate assignment fails', async (context) => {
  const harness = await createApiHarness(context, { includeUnassigned: true });
  const adminCookie = await harness.login('admin@lexflow.local', 'admin123');
  const ruleBefore = one(harness.db, "SELECT * FROM rules WHERE name = 'ACME NDA review'");
  const unassigned = one(harness.db, "SELECT * FROM emails WHERE status = 'unassigned'");
  const ruleCountBefore = one(harness.db, 'SELECT count(*) AS count FROM rules').count;
  harness.db.exec(`
    CREATE TRIGGER reject_injected_assignment_notification
    BEFORE INSERT ON notifications
    WHEN NEW.kind = 'assignment' AND NEW.email_id = ${Number(unassigned.id)}
    BEGIN
      SELECT RAISE(ABORT, 'injected assignment failure');
    END;
  `);

  const failed = await harness.patch(
    `/api/rules/${ruleBefore.id}`,
    { name: 'Customer sender route', keywords: '', senderFilter: 'customer@example.test' },
    adminCookie,
  );
  const failedCreation = await harness.post('/api/rules', {
    name: 'Second customer sender route',
    keywords: '',
    senderFilter: 'customer@example.test',
    assigneeId: harness.userId('priya@lexflow.local'),
    priority: 30,
  }, adminCookie);

  assert.equal(failed.status, 500);
  assert.equal(failedCreation.status, 500);
  assert.equal(one(harness.db, 'SELECT count(*) AS count FROM rules').count, ruleCountBefore);
  assert.deepEqual(
    one(harness.db, 'SELECT * FROM rules WHERE id = ?', ruleBefore.id),
    ruleBefore,
  );
  assert.equal(
    one(harness.db, 'SELECT status FROM emails WHERE id = ?', unassigned.id).status,
    'unassigned',
  );
  assert.equal(
    one(harness.db, 'SELECT count(*) AS count FROM activity WHERE email_id = ?', unassigned.id).count,
    0,
  );
});

test('rule updates reject empty patches and invalid final rules without mutating data', async (context) => {
  const harness = await createApiHarness(context);
  const adminCookie = await harness.login('admin@lexflow.local', 'admin123');
  const ruleBefore = one(harness.db, 'SELECT * FROM rules ORDER BY id');

  const emptyPatch = await harness.patch(`/api/rules/${ruleBefore.id}`, {}, adminCookie);
  const emptyCriteria = await harness.patch(
    `/api/rules/${ruleBefore.id}`,
    { keywords: '', senderFilter: '' },
    adminCookie,
  );
  const emptyName = await harness.patch(
    `/api/rules/${ruleBefore.id}`,
    { name: '' },
    adminCookie,
  );
  const normalizedNoOp = await harness.patch(
    `/api/rules/${ruleBefore.id}`,
    { name: `  ${ruleBefore.name}  ` },
    adminCookie,
  );
  const adminAssignee = await harness.patch(
    `/api/rules/${ruleBefore.id}`,
    { assigneeId: harness.userId('admin@lexflow.local') },
    adminCookie,
  );

  assert.equal(emptyPatch.status, 400);
  assert.equal(emptyPatch.body.error.code, 'INVALID_INPUT');
  assert.equal(emptyCriteria.status, 400);
  assert.equal(emptyCriteria.body.error.fields.keywords, 'Enter keywords or a sender filter.');
  assert.equal(emptyName.status, 400);
  assert.equal(emptyName.body.error.fields.name, 'Enter a rule name of 80 characters or fewer.');
  assert.equal(normalizedNoOp.status, 400);
  assert.equal(normalizedNoOp.body.error.message, 'Change at least one rule field.');
  assert.equal(adminAssignee.status, 400);
  assert.equal(adminAssignee.body.error.fields.assigneeId, 'Choose a valid team member.');
  assert.deepEqual(
    one(harness.db, 'SELECT * FROM rules WHERE id = ?', ruleBefore.id),
    ruleBefore,
  );
});

test('admin assigns and reassigns open email while members cannot assign', async (context) => {
  let now = new Date('2026-08-14T10:00:00.000Z');
  const harness = await createApiHarness(context, {
    includeUnassigned: true,
    clock: () => now,
  });
  const adminCookie = await harness.login('admin@lexflow.local', 'admin123');
  const mayaCookie = await harness.login('maya@lexflow.local', 'welcome123');
  const priyaCookie = await harness.login('priya@lexflow.local', 'welcome123');
  const email = harness.db.prepare("SELECT * FROM emails WHERE status = 'unassigned'").get();
  const adminId = harness.userId('admin@lexflow.local');
  const mayaId = harness.userId('maya@lexflow.local');
  const priyaId = harness.userId('priya@lexflow.local');

  const forbidden = await harness.post(
    `/api/emails/${email.id}/assign`,
    { assigneeId: mayaId },
    mayaCookie,
  );
  assert.equal(forbidden.status, 403);

  const assigned = await harness.post(
    `/api/emails/${email.id}/assign`,
    { assigneeId: mayaId },
    adminCookie,
  );
  assert.equal(assigned.status, 200);
  assert.equal(assigned.body.changed, true);
  assert.equal(assigned.body.assignedAt, '2026-08-14T10:00:00.000Z');
  assert.ok((await harness.get('/api/bootstrap', mayaCookie)).body.emails
    .some(item => item.id === email.id));

  const countsBeforeNoOp = harness.db.prepare(`
    SELECT
      (SELECT count(*) FROM activity WHERE email_id = ?) AS activity_count,
      (SELECT count(*) FROM notifications WHERE email_id = ?) AS notification_count
  `).get(email.id, email.id);
  now = new Date('2026-08-14T11:00:00.000Z');
  const noOp = await harness.post(
    `/api/emails/${email.id}/assign`,
    { assigneeId: mayaId },
    adminCookie,
  );
  assert.equal(noOp.status, 200);
  assert.equal(noOp.body.changed, false);
  assert.equal(noOp.body.assignedAt, '2026-08-14T10:00:00.000Z');
  assert.deepEqual(harness.db.prepare(`
    SELECT
      (SELECT count(*) FROM activity WHERE email_id = ?) AS activity_count,
      (SELECT count(*) FROM notifications WHERE email_id = ?) AS notification_count
  `).get(email.id, email.id), countsBeforeNoOp);

  now = new Date('2026-08-14T12:00:00.000Z');
  const reassigned = await harness.post(
    `/api/emails/${email.id}/assign`,
    { assigneeId: priyaId },
    adminCookie,
  );
  assert.equal(reassigned.status, 200);
  assert.equal(reassigned.body.changed, true);
  assert.equal(reassigned.body.assignedAt, '2026-08-14T12:00:00.000Z');
  assert.ok(!(await harness.get('/api/bootstrap', mayaCookie)).body.emails
    .some(item => item.id === email.id));
  assert.ok((await harness.get('/api/bootstrap', priyaCookie)).body.emails
    .some(item => item.id === email.id));
  assert.equal(harness.db.prepare(`
    SELECT count(*) AS count FROM notifications
    WHERE email_id = ? AND user_id = ? AND kind = 'assignment'
  `).get(email.id, mayaId).count, 0);
  assert.equal(harness.db.prepare(`
    SELECT count(*) AS count FROM notifications
    WHERE email_id = ? AND user_id = ? AND kind = 'assignment'
  `).get(email.id, priyaId).count, 1);

  const latest = harness.db.prepare(`
    SELECT * FROM activity WHERE email_id = ? ORDER BY id DESC LIMIT 1
  `).get(email.id);
  assert.equal(Number(latest.actor_id), adminId);
  assert.match(latest.message, /Reassigned.*Maya Shah.*Priya Menon/);

  assert.equal((await harness.post(
    `/api/emails/${email.id}/complete`,
    {},
    priyaCookie,
  )).status, 200);
  const completedConflict = await harness.post(
    `/api/emails/${email.id}/assign`,
    { assigneeId: mayaId },
    adminCookie,
  );
  assert.equal(completedConflict.status, 409);
});

test('only admins manage departments, team placement, and workspace limits', async (context) => {
  const harness = await createApiHarness(context);
  const adminCookie = await harness.login('admin@lexflow.local', 'admin123');
  const memberCookie = await harness.login('maya@lexflow.local', 'welcome123');
  const mayaId = harness.userId('maya@lexflow.local');

  assert.equal((await harness.post(
    '/api/departments',
    { name: 'Compliance' },
    memberCookie,
  )).status, 403);
  assert.equal((await harness.patch(
    `/api/team/${mayaId}/department`,
    { departmentId: 1 },
    memberCookie,
  )).status, 403);
  assert.equal((await harness.patch(
    '/api/settings',
    { timeUnassignedHours: 2, timeAssignedUnmarkedHours: 12 },
    memberCookie,
  )).status, 403);

  const created = await harness.post(
    '/api/departments',
    { name: '  Compliance  ' },
    adminCookie,
  );
  assert.equal(created.status, 201);
  assert.equal(created.body.department.name, 'Compliance');

  const duplicate = await harness.post(
    '/api/departments',
    { name: 'compliance' },
    adminCookie,
  );
  assert.equal(duplicate.status, 400);
  assert.equal(duplicate.body.error.code, 'INVALID_INPUT');
  assert.ok(duplicate.body.error.fields.name);

  const moved = await harness.patch(
    `/api/team/${mayaId}/department`,
    { departmentId: created.body.department.id },
    adminCookie,
  );
  assert.equal(moved.status, 200);
  assert.equal(moved.body.member.department, 'Compliance');

  const invalidSettings = await harness.patch(
    '/api/settings',
    { timeUnassignedHours: 0, timeAssignedUnmarkedHours: 12 },
    adminCookie,
  );
  assert.equal(invalidSettings.status, 400);
  assert.ok(invalidSettings.body.error.fields.timeUnassignedHours);

  const settings = await harness.patch(
    '/api/settings',
    { timeUnassignedHours: 2, timeAssignedUnmarkedHours: 12 },
    adminCookie,
  );
  assert.equal(settings.status, 200);
  assert.deepEqual(settings.body.settings, {
    timeUnassignedHours: 2,
    timeAssignedUnmarkedHours: 12,
  });

  const adminBootstrap = await harness.get('/api/bootstrap', adminCookie);
  assert.ok(adminBootstrap.body.departments.some(item => item.name === 'Compliance'));
  assert.equal(
    adminBootstrap.body.team.find(item => item.id === mayaId).department,
    'Compliance',
  );
  assert.deepEqual(adminBootstrap.body.settings, settings.body.settings);

  const memberBootstrap = await harness.get('/api/bootstrap', memberCookie);
  assert.equal('departments' in memberBootstrap.body, false);
  assert.equal('settings' in memberBootstrap.body, false);
  assert.equal('team' in memberBootstrap.body, false);
});

test('completion records activity once and retires every related notification', async (context) => {
  const harness = await createApiHarness(context);
  const mayaCookie = await harness.login('maya@lexflow.local', 'welcome123');
  const adminCookie = await harness.login('admin@lexflow.local', 'admin123');
  const email = harness.emailAssignedTo('maya@lexflow.local');
  const secondAdminPasswordHash = await hashPassword('secondadmin123');
  harness.db.prepare(`
    INSERT INTO users (email, name, initials, department, role, password_hash)
    VALUES ('ops2@lexflow.local', 'Second Admin', 'SA', 'Operations', 'admin', ?)
  `).run(secondAdminPasswordHash);

  const completion = await harness.post(`/api/emails/${email.id}/complete`, {}, mayaCookie);
  const repeatedCompletion = await harness.post(
    `/api/emails/${email.id}/complete`,
    {},
    mayaCookie,
  );
  const admin = await harness.get('/api/bootstrap', adminCookie);
  const member = await harness.get('/api/bootstrap', mayaCookie);
  const event = admin.body.activity.find(item => item.kind === 'completed' && item.emailId === email.id);

  assert.equal(completion.status, 200);
  assert.equal(repeatedCompletion.status, 200);
  assert.equal(event.actor.name, 'Maya Shah');
  assert.match(event.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(admin.body.notifications.some(item => item.emailId === email.id), false);
  assert.equal(member.body.notifications.some(item => item.emailId === email.id), false);
  assert.equal(harness.db.prepare(`
    SELECT count(*) AS count FROM notifications
    WHERE email_id = ? AND user_id = ? AND read_at IS NULL
  `).get(email.id, mayaId(harness.db)).count, 0);
  assert.equal(harness.db.prepare(`
    SELECT count(*) AS count FROM notifications
    WHERE email_id = ? AND read_at IS NULL
  `).get(email.id).count, 0);
  assert.equal(harness.db.prepare(`
    SELECT count(*) AS count FROM activity
    WHERE email_id = ? AND kind = 'completed'
  `).get(email.id).count, 1);
});

test('multi-source sync is idempotent and isolates provider failures and cursors', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);

  let outlookCall = 0;
  let gmailCall = 0;
  let gmailFailure = false;
  const outlookCursors = [];
  const gmailCursors = [];
  const outlookSource = {
    provider: 'outlook',
    mailboxAddress: 'shared@example.test',
    cursorKey: 'mail_cursor:graph:shared@example.test',
    async fetchChanges(cursor) {
      outlookCursors.push(cursor);
      outlookCall += 1;
      const messages = [{
        providerId: outlookCall < 3 ? 'same-raw-id' : 'outlook-new',
        provider: 'outlook',
        mailboxAddress: 'shared@example.test',
        subject: outlookCall < 3 ? 'Outlook request' : 'New Outlook request',
        senderName: 'Outlook Sender',
        senderAddress: 'sender@outlook.test',
        preview: 'Please review.',
        receivedAt: '2026-08-14T08:30:00.000Z',
        webUrl: 'https://outlook.office.com/mail/message',
      }];
      return { messages, nextCursor: `graph-cursor-${outlookCall}` };
    },
  };
  const gmailSource = {
    provider: 'gmail',
    mailboxAddress: 'owner@gmail.test',
    cursorKey: 'mail_cursor:gmail',
    async fetchChanges(cursor) {
      gmailCursors.push(cursor);
      gmailCall += 1;
      if (gmailFailure) {
        throw new Error(
          'refresh_token=refresh-secret&code=oauth-code&client_secret=client-secret '
          + '{"access_token":"json-secret"}',
        );
      }
      return {
        messages: [{
          // Gmail namespaces its external ID, so it can coexist with the same raw Outlook ID.
          providerId: 'gmail:owner@gmail.test:same-raw-id',
          provider: 'gmail',
          mailboxAddress: 'owner@gmail.test',
          subject: 'Gmail request',
          senderName: 'Gmail Sender',
          senderAddress: 'sender@gmail.test',
          preview: 'Please review.',
          receivedAt: '2026-08-14T08:20:00.000Z',
          webUrl: 'https://mail.google.com/mail/?authuser=owner%40gmail.test#inbox/thread',
        }],
        nextCursor: `gmail-cursor-${gmailCall}`,
      };
    },
  };
  const runner = createSyncRunner({ db, sources: [outlookSource, gmailSource] });

  const first = await runner.run();
  const second = await runner.run();
  gmailFailure = true;
  const partial = await runner.run();

  assert.deepEqual(
    { imported: first.imported, succeeded: first.succeeded, failed: first.failed },
    { imported: 2, succeeded: 2, failed: 0 },
  );
  assert.deepEqual(
    { imported: second.imported, succeeded: second.succeeded, failed: second.failed },
    { imported: 0, succeeded: 2, failed: 0 },
  );
  assert.deepEqual(
    { imported: partial.imported, succeeded: partial.succeeded, failed: partial.failed },
    { imported: 1, succeeded: 1, failed: 1 },
  );
  assert.deepEqual(outlookCursors, [null, 'graph-cursor-1', 'graph-cursor-2']);
  assert.deepEqual(gmailCursors, [null, 'gmail-cursor-1', 'gmail-cursor-2']);
  assert.equal(one(db, 'SELECT count(*) AS count FROM emails').count, 3);
  assert.deepEqual(
    db.prepare('SELECT provider, count(*) AS count FROM emails GROUP BY provider ORDER BY provider')
      .all()
      .map(row => ({ provider: row.provider, count: Number(row.count) })),
    [
      { provider: 'gmail', count: 1 },
      { provider: 'outlook', count: 2 },
    ],
  );
  assert.equal(
    one(db, 'SELECT value FROM sync_state WHERE key = ?', gmailSource.cursorKey).value,
    'gmail-cursor-2',
  );
  assert.equal(
    one(db, 'SELECT value FROM sync_state WHERE key = ?', outlookSource.cursorKey).value,
    'graph-cursor-3',
  );
  const persistedError = one(
    db,
    'SELECT value FROM sync_state WHERE key = ?',
    `last_sync_error:${gmailSource.cursorKey}`,
  ).value;
  assert.match(persistedError, /refresh_token=\[redacted\]/);
  assert.match(persistedError, /code=\[redacted\]/);
  assert.match(persistedError, /client_secret=\[redacted\]/);
  assert.match(persistedError, /access_token=\[redacted\]/);
  for (const secret of ['refresh-secret', 'oauth-code', 'client-secret', 'json-secret']) {
    assert.doesNotMatch(JSON.stringify(partial), new RegExp(secret));
    assert.doesNotMatch(persistedError, new RegExp(secret));
  }
});

test('sync discards a Gmail result when its connection changes in flight', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);

  let current = true;
  let finishFetch;
  const source = {
    provider: 'gmail',
    mailboxAddress: 'old@gmail.test',
    cursorKey: 'mail_cursor:gmail',
    isCurrentConnection: () => current,
    fetchChanges() {
      return new Promise(resolve => {
        finishFetch = resolve;
      });
    },
  };
  const runner = createSyncRunner({ db, sources: [source] });
  const pending = runner.run();
  current = false;
  finishFetch({
    messages: [{
      providerId: 'gmail:old@gmail.test:stale-message',
      provider: 'gmail',
      mailboxAddress: 'old@gmail.test',
      subject: 'Stale Gmail result',
      senderName: 'Old sender',
      senderAddress: 'old@example.test',
      preview: 'This result must not be committed.',
      receivedAt: '2026-08-14T08:30:00.000Z',
      webUrl: 'https://mail.google.com/mail/#inbox/stale-message',
    }],
    nextCursor: 'stale-history-id',
  });

  const result = await pending;

  assert.deepEqual(
    { imported: result.imported, succeeded: result.succeeded, failed: result.failed, skipped: result.skipped },
    { imported: 0, succeeded: 0, failed: 0, skipped: 1 },
  );
  assert.equal(one(db, 'SELECT count(*) AS count FROM emails').count, 0);
  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', source.cursorKey), undefined);
  assert.equal(one(db, "SELECT value FROM sync_state WHERE key = 'last_sync_error'"), undefined);
});

test('Gmail OAuth routes are admin-only, bind state to one session, and expose safe status', async (context) => {
  const fixedNow = new Date('2026-08-14T09:00:00.000Z');
  const googleClientSecret = 'google-client-secret-fixture';
  const refreshToken = 'refresh-token-fixture';
  const accessToken = 'access-token-fixture';
  const authorizationCode = 'authorization-code-fixture';
  let tokenExchanges = 0;
  const tokenBodies = [];
  const revokedTokens = [];
  let holdRevocation = false;
  let notifyRevocationStarted;
  let releaseRevocation;
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(String(input));
    if (url.pathname === '/revoke') {
      revokedTokens.push(Object.fromEntries(options.body).token);
      if (holdRevocation) {
        notifyRevocationStarted();
        await new Promise(resolve => {
          releaseRevocation = resolve;
        });
        return { ok: true, status: 200 };
      }
      throw new Error('Simulated Google revocation outage');
    }
    if (url.origin === 'https://oauth2.googleapis.com') {
      tokenExchanges += 1;
      tokenBodies.push(Object.fromEntries(options.body));
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            access_token: accessToken,
            refresh_token: refreshToken,
            id_token: 'id-token-fixture',
            expires_in: 3600,
          };
        },
      };
    }
    if (url.pathname.endsWith('/users/me/profile')) {
      assert.equal(options.headers.authorization, `Bearer ${accessToken}`);
      return {
        ok: true,
        status: 200,
        async json() {
          return { emailAddress: 'Owner@Gmail.Test', historyId: '1200' };
        },
      };
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const harness = await createApiHarness(context, {
    mode: 'gmail',
    clock: () => fixedNow,
    integrationFactory(db) {
      return {
        gmail: createGmailIntegration({
          db,
          gmail: {
            configured: true,
            clientId: 'google-client-id',
            clientSecret: googleClientSecret,
            redirectUri: 'http://127.0.0.1:3000/api/integrations/gmail/callback',
            tokenEncryptionKey: Buffer.alloc(32, 0x2a),
          },
          fetchImpl,
          clock: () => fixedNow,
        }),
      };
    },
  });
  const memberCookie = await harness.login('maya@lexflow.local', 'welcome123');
  const firstAdminCookie = await harness.login('admin@lexflow.local', 'admin123');
  const secondAdminCookie = await harness.login('admin@lexflow.local', 'admin123');

  const disconnectedBootstrap = await harness.get('/api/bootstrap', firstAdminCookie);
  assert.deepEqual(disconnectedBootstrap.body.mailboxSummary, {
    connectedCount: 0,
    label: 'No mailbox connected',
    providers: [],
  });

  const unauthenticated = await harness.get(
    '/api/integrations/gmail/authorize',
    null,
    { redirect: 'manual' },
  );
  const memberAuthorize = await harness.get(
    '/api/integrations/gmail/authorize',
    memberCookie,
    { redirect: 'manual' },
  );
  assert.equal(unauthenticated.status, 401);
  assert.equal(memberAuthorize.status, 403);

  const authorization = await harness.get(
    '/api/integrations/gmail/authorize',
    firstAdminCookie,
    { redirect: 'manual' },
  );
  assert.equal(authorization.status, 303);
  const authorizationUrl = new URL(authorization.location);
  const state = authorizationUrl.searchParams.get('state');
  assert.equal(authorizationUrl.origin, 'https://accounts.google.com');
  assert.equal(authorizationUrl.searchParams.get('access_type'), 'offline');
  assert.equal(authorizationUrl.searchParams.get('prompt'), 'consent');
  assert.equal(
    authorizationUrl.searchParams.get('scope'),
    'https://www.googleapis.com/auth/gmail.readonly',
  );
  assert.ok(state);

  const callbackPath = `/api/integrations/gmail/callback?state=${encodeURIComponent(state)}&code=${encodeURIComponent(authorizationCode)}`;
  const wrongSession = await harness.get(callbackPath, secondAdminCookie, { redirect: 'manual' });
  assert.equal(wrongSession.status, 303);
  assert.equal(wrongSession.location, '/?integration=gmail-error');
  assert.equal(tokenExchanges, 0);

  const connected = await harness.get(callbackPath, firstAdminCookie, { redirect: 'manual' });
  assert.equal(connected.status, 303);
  assert.equal(connected.location, '/?integration=gmail-connected');
  assert.equal(tokenExchanges, 1);
  assert.deepEqual(tokenBodies[0], {
    client_id: 'google-client-id',
    client_secret: googleClientSecret,
    code: authorizationCode,
    grant_type: 'authorization_code',
    redirect_uri: 'http://127.0.0.1:3000/api/integrations/gmail/callback',
  });

  const replay = await harness.get(callbackPath, firstAdminCookie, { redirect: 'manual' });
  assert.equal(replay.location, '/?integration=gmail-error');
  assert.equal(tokenExchanges, 1);

  const connection = one(harness.db, `
    SELECT account_email, encrypted_refresh_token FROM gmail_connection WHERE id = 1
  `);
  assert.equal(connection.account_email, 'owner@gmail.test');
  assert.notEqual(connection.encrypted_refresh_token, refreshToken);
  assert.doesNotMatch(connection.encrypted_refresh_token, /refresh-token-fixture/);

  const adminBootstrap = await harness.get('/api/bootstrap', firstAdminCookie);
  const memberBootstrap = await harness.get('/api/bootstrap', memberCookie);
  assert.deepEqual(adminBootstrap.body.integrations.gmail, {
    configured: true,
    connected: true,
    accountEmail: 'owner@gmail.test',
    lastSuccessAt: null,
    lastError: null,
  });
  assert.equal('integrations' in memberBootstrap.body, false);
  const safePayload = JSON.stringify([adminBootstrap.body, memberBootstrap.body]);
  for (const secret of [googleClientSecret, refreshToken, accessToken, authorizationCode, 'id-token-fixture']) {
    assert.doesNotMatch(safePayload, new RegExp(secret));
  }

  const connectedSource = harness.integrations.gmail.sources()[0];
  assert.equal(connectedSource.isCurrentConnection(), true);
  assert.equal((await harness.delete('/api/integrations/gmail', memberCookie)).status, 403);

  holdRevocation = true;
  const revocationStarted = new Promise(resolve => {
    notifyRevocationStarted = resolve;
  });
  let disconnectSettled = false;
  const disconnecting = harness.delete('/api/integrations/gmail', firstAdminCookie)
    .then(response => {
      disconnectSettled = true;
      return response;
    });
  await revocationStarted;
  const queuedDisconnect = harness.integrations.gmail.disconnect();
  await Promise.resolve();
  assert.equal(disconnectSettled, false);
  assert.equal(harness.integrations.gmail.status().connected, true);
  assert.deepEqual(harness.integrations.gmail.sources(), []);
  assert.equal(connectedSource.isCurrentConnection(), false);
  releaseRevocation();
  assert.equal((await disconnecting).status, 204);
  await queuedDisconnect;
  assert.deepEqual(revokedTokens, [refreshToken]);
  assert.equal(connectedSource.isCurrentConnection(), false);
  assert.equal(harness.integrations.gmail.status().connected, false);
  assert.equal(one(harness.db, 'SELECT count(*) AS count FROM gmail_connection').count, 0);

  const reconnectAuthorization = await harness.get(
    '/api/integrations/gmail/authorize',
    firstAdminCookie,
    { redirect: 'manual' },
  );
  const reconnectState = new URL(reconnectAuthorization.location).searchParams.get('state');
  const reconnectPath = `/api/integrations/gmail/callback?state=${encodeURIComponent(reconnectState)}&code=reconnect-code`;
  const reconnected = await harness.get(reconnectPath, firstAdminCookie, { redirect: 'manual' });
  assert.equal(reconnected.location, '/?integration=gmail-connected');
  assert.equal(tokenExchanges, 2);
  assert.equal(harness.integrations.gmail.status().connected, true);

  holdRevocation = false;
  assert.equal((await harness.delete('/api/integrations/gmail', firstAdminCookie)).status, 204);
  assert.deepEqual(revokedTokens, [refreshToken, refreshToken]);
  assert.equal(harness.integrations.gmail.status().connected, false);
});
