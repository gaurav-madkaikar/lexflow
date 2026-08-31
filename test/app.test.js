import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

import { createApp } from '../src/app.js';
import { createSession, sessionCookie } from '../src/auth.js';
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

function fixedSource(messages, cursorKey = 'mail_cursor', scope = {}) {
  return {
    cursorKey,
    ...scope,
    async fetchChanges() {
      return { messages, nextCursor: 'mock-cursor-1' };
    },
  };
}

function sourceFor(db, departmentName, messages, cursorKey = null) {
  const department = one(
    db,
    'SELECT id, shared_mailbox FROM departments WHERE organization_id = 1 AND name = ?',
    departmentName,
  );
  return fixedSource(
    messages,
    cursorKey ?? `mail_cursor:test:${department.shared_mailbox}`,
    {
      organizationId: 1,
      departmentId: Number(department.id),
      mailboxAddress: department.shared_mailbox,
    },
  );
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
  seedDemoData(db);
  const legal = one(db, "SELECT id FROM departments WHERE name = 'Legal'");
  db.prepare(`
    INSERT INTO users
      (email, name, initials, department, role, organization_id, auth_provider, account_status, department_id)
    VALUES ('noah@lexflow.local', 'Noah Singh', 'NS', 'Legal', 'member', 1, 'local', 'active', ?)
  `).run(legal.id);

  const legalMessages = [ndaMessage];
  if (includeUnassigned) legalMessages.push(generalMessage);
  const sources = [
    sourceFor(db, 'Legal', legalMessages),
    sourceFor(db, 'Finance', [invoiceMessage]),
  ];
  const syncRunner = createSyncRunner({ db, sources });
  await syncRunner.run();
  const integrations = integrationFactory(db);
  const server = createApp({ db, syncRunner, mode, integrations, clock, entraAuth: {
    async authorizationUrl() { return '/'; },
    async callback() { throw new Error('not used in injected-session tests'); },
  } })
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
      headers: Object.fromEntries(response.headers.entries()),
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
      void password;
      const user = db.prepare('SELECT id, organization_id FROM users WHERE email = ?').get(email);
      assert.ok(user);
      const session = createSession(db, user.id, new Date(), user.organization_id);
      return sessionCookie(session.id);
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
  const maya = one(db, `
    SELECT users.id, users.department_id
    FROM users WHERE users.email = ?
  `, 'maya@lexflow.local');
  db.prepare(`
    INSERT INTO rules
      (name, keywords, sender_filter, assignee_id, priority, enabled, created_at, organization_id, department_id)
    VALUES ('Priority NDA route', 'ACME,NDA', '', ?, 5, 1, ?, 1, ?)
  `).run(maya.id, new Date().toISOString(), maya.department_id);
  const source = sourceFor(db, 'Legal', [ndaMessage]);

  const result = await syncMailbox({ db, source });

  assert.deepEqual(result, { imported: 1, assigned: 1 });
  assert.equal(one(db, 'SELECT assignee_id FROM emails').assignee_id, maya.id);
  assert.equal(one(db, 'SELECT count(*) AS count FROM notifications').count, 1);
});

test('re-importing is idempotent and mail-source cursors stay isolated', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const source = sourceFor(db, 'Legal', [ndaMessage], 'mail_cursor:demo');

  await syncMailbox({ db, source });
  const result = await syncMailbox({ db, source });
  let graphCursor = 'not-called';
  await syncMailbox({
    db,
    source: {
      ...sourceFor(db, 'Finance', [], 'mail_cursor:graph:finance@lexflow.local'),
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
  const mayaCookie = await harness.login('noah@lexflow.local', 'welcome123');
  const priyaEmail = harness.emailAssignedTo('priya@lexflow.local');

  const bootstrap = await harness.get('/api/bootstrap', mayaCookie);
  assert.equal(bootstrap.status, 200);
  assert.ok(bootstrap.body.emails.every(email => email.assignee.email === 'noah@lexflow.local'));
  assert.ok(bootstrap.body.emails.every(email => typeof email.hasAttachments === 'boolean'));

  const completion = await harness.post(`/api/emails/${priyaEmail.id}/complete`, {}, mayaCookie);
  assert.equal(completion.status, 403);
});

test('a member cannot mutate rules or trigger sync', async (context) => {
  const harness = await createApiHarness(context);
  const cookie = await harness.login('noah@lexflow.local', 'welcome123');
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

test('DepAdmin partially updates a rule and applies its final criteria immediately', async (context) => {
  const harness = await createApiHarness(context, { includeUnassigned: true });
  const adminCookie = await harness.login('maya@lexflow.local', 'welcome123');
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

test('DepAdmin creates a sender-only rule and it assigns matching unassigned email', async (context) => {
  const harness = await createApiHarness(context, { includeUnassigned: true });
  const adminCookie = await harness.login('maya@lexflow.local', 'welcome123');
  const assigneeId = harness.userId('noah@lexflow.local');
  const unassigned = one(harness.db, "SELECT * FROM emails WHERE status = 'unassigned'");

  const created = await harness.post('/api/rules', {
    name: 'Customer sender route',
    keywords: '',
    senderFilter: 'customer@example.test',
    assigneeId,
    priority: 30,
  }, adminCookie);

  assert.equal(created.status, 201);
  assert.equal(one(harness.db, 'SELECT has_attachments FROM rules WHERE id = ?', created.body.id).has_attachments, 0);
  assert.equal(
    one(harness.db, 'SELECT assignee_id FROM emails WHERE id = ?', unassigned.id).assignee_id,
    assigneeId,
  );

  const invalid = await harness.post('/api/rules', {
    name: 'Invalid attachment rule', keywords: '', senderFilter: 'customer@example.test',
    assigneeId, priority: 30, hasAttachments: 'true',
  }, adminCookie);
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.fields.hasAttachments, 'Choose whether attachments are required.');
});

test('rule creation and updates roll back when immediate assignment fails', async (context) => {
  const harness = await createApiHarness(context, { includeUnassigned: true });
  const adminCookie = await harness.login('maya@lexflow.local', 'welcome123');
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
    assigneeId: harness.userId('noah@lexflow.local'),
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
  const adminCookie = await harness.login('maya@lexflow.local', 'welcome123');
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

test('DepAdmin rule writes allow only the four canonical priorities', async (context) => {
  const harness = await createApiHarness(context);
  const cookie = await harness.login('maya@lexflow.local', 'welcome123');
  const assigneeId = harness.userId('noah@lexflow.local');

  for (const priority of [10, 20, 30, 40]) {
    const response = await harness.post('/api/rules', {
      name: `Priority ${priority}`,
      keywords: `priority-${priority}`,
      senderFilter: '',
      assigneeId,
      priority,
    }, cookie);
    assert.equal(response.status, 201);
  }

  const countBefore = one(harness.db, 'SELECT count(*) AS count FROM rules').count;
  const invalidCreate = await harness.post('/api/rules', {
    name: 'Invalid priority',
    keywords: 'invalid-priority',
    senderFilter: '',
    assigneeId,
    priority: 25,
  }, cookie);
  const existing = one(harness.db, 'SELECT * FROM rules ORDER BY id');
  const invalidPatch = await harness.patch(`/api/rules/${existing.id}`, { priority: 25 }, cookie);

  assert.equal(invalidCreate.status, 400);
  assert.equal(invalidCreate.body.error.fields.priority, 'Choose Low, Medium, High, or Critical.');
  assert.equal(invalidPatch.status, 400);
  assert.equal(invalidPatch.body.error.fields.priority, 'Choose Low, Medium, High, or Critical.');
  assert.equal(one(harness.db, 'SELECT count(*) AS count FROM rules').count, countBefore);
  assert.deepEqual(one(harness.db, 'SELECT * FROM rules WHERE id = ?', existing.id), existing);
});

test('DepAdmin assigns and reassigns open email while members and OrgAdmin cannot assign', async (context) => {
  let now = new Date('2026-08-14T10:00:00.000Z');
  const harness = await createApiHarness(context, {
    includeUnassigned: true,
    clock: () => now,
  });
  const depAdminCookie = await harness.login('maya@lexflow.local', 'welcome123');
  const memberCookie = await harness.login('noah@lexflow.local', 'welcome123');
  const orgAdminCookie = await harness.login('admin@lexflow.local', 'admin123');
  const email = harness.db.prepare("SELECT * FROM emails WHERE status = 'unassigned'").get();
  const depAdminId = harness.userId('maya@lexflow.local');
  const mayaId = harness.userId('maya@lexflow.local');
  const noahId = harness.userId('noah@lexflow.local');

  const forbidden = await harness.post(
    `/api/emails/${email.id}/assign`,
    { assigneeId: noahId },
    memberCookie,
  );
  assert.equal(forbidden.status, 403);
  assert.equal((await harness.post(
    `/api/emails/${email.id}/assign`,
    { assigneeId: noahId },
    orgAdminCookie,
  )).status, 403);

  const assigned = await harness.post(
    `/api/emails/${email.id}/assign`,
    { assigneeId: noahId },
    depAdminCookie,
  );
  assert.equal(assigned.status, 200);
  assert.equal(assigned.body.changed, true);
  assert.equal(assigned.body.assignedAt, '2026-08-14T10:00:00.000Z');
  assert.ok((await harness.get('/api/bootstrap', memberCookie)).body.emails
    .some(item => item.id === email.id));

  const countsBeforeNoOp = harness.db.prepare(`
    SELECT
      (SELECT count(*) FROM activity WHERE email_id = ?) AS activity_count,
      (SELECT count(*) FROM notifications WHERE email_id = ?) AS notification_count
  `).get(email.id, email.id);
  now = new Date('2026-08-14T11:00:00.000Z');
  const noOp = await harness.post(
    `/api/emails/${email.id}/assign`,
    { assigneeId: noahId },
    depAdminCookie,
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
    { assigneeId: mayaId },
    depAdminCookie,
  );
  assert.equal(reassigned.status, 200);
  assert.equal(reassigned.body.changed, true);
  assert.equal(reassigned.body.assignedAt, '2026-08-14T12:00:00.000Z');
  assert.ok(!(await harness.get('/api/bootstrap', memberCookie)).body.emails
    .some(item => item.id === email.id));
  assert.ok((await harness.get('/api/bootstrap', depAdminCookie)).body.emails
    .some(item => item.id === email.id));
  assert.equal(harness.db.prepare(`
    SELECT count(*) AS count FROM notifications
    WHERE email_id = ? AND user_id = ? AND kind = 'assignment'
  `).get(email.id, noahId).count, 0);
  assert.equal(harness.db.prepare(`
    SELECT count(*) AS count FROM notifications
    WHERE email_id = ? AND user_id = ? AND kind = 'assignment'
  `).get(email.id, mayaId).count, 1);

  const latest = harness.db.prepare(`
    SELECT * FROM activity WHERE email_id = ? ORDER BY id DESC LIMIT 1
  `).get(email.id);
  assert.equal(Number(latest.actor_id), depAdminId);
  assert.match(latest.message, /Reassigned.*Noah Singh.*Maya Shah/);

  assert.equal((await harness.post(
    `/api/emails/${email.id}/complete`,
    {},
    depAdminCookie,
  )).status, 200);
  const completedConflict = await harness.post(
    `/api/emails/${email.id}/assign`,
    { assigneeId: noahId },
    depAdminCookie,
  );
  assert.equal(completedConflict.status, 409);
});

test('only OrgAdmins manage departments, team placement, heads, and workspace limits', async (context) => {
  const harness = await createApiHarness(context);
  const adminCookie = await harness.login('admin@lexflow.local', 'admin123');
  const memberCookie = await harness.login('noah@lexflow.local', 'welcome123');
  const noahId = harness.userId('noah@lexflow.local');

  assert.equal((await harness.post(
    '/api/departments',
    { name: 'Compliance', sharedMailbox: 'compliance@lexflow.local' },
    memberCookie,
  )).status, 403);
  assert.equal((await harness.patch(
    `/api/team/${noahId}/department`,
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
    { name: '  Compliance  ', sharedMailbox: 'compliance@lexflow.local' },
    adminCookie,
  );
  assert.equal(created.status, 201);
  assert.equal(created.body.department.name, 'Compliance');

  const duplicate = await harness.post(
    '/api/departments',
    { name: 'compliance', sharedMailbox: 'other@lexflow.local' },
    adminCookie,
  );
  assert.equal(duplicate.status, 400);
  assert.equal(duplicate.body.error.code, 'INVALID_INPUT');
  assert.ok(duplicate.body.error.fields.name);

  const moved = await harness.patch(
    `/api/team/${noahId}/department`,
    { departmentId: created.body.department.id },
    adminCookie,
  );
  assert.equal(moved.status, 200);
  assert.equal(moved.body.member.department, 'Compliance');
  assert.equal(moved.body.member.role, 'dep_admin');
  assert.equal('mailboxAccessStatus' in moved.body.member, false);
  assert.equal('mailboxAccessMessage' in moved.body.member, false);
  const withHead = await harness.get('/api/bootstrap', adminCookie);
  assert.equal(
    withHead.body.departments.find(item => item.id === created.body.department.id).headUser.id,
    noahId,
  );

  assert.equal((await harness.delete(`/api/departments/${created.body.department.id}`, memberCookie)).status, 403);
  const removed = await harness.delete(`/api/departments/${created.body.department.id}`, adminCookie);
  assert.equal(removed.status, 200);
  assert.equal(removed.body.department.unassignedMemberCount, 1);
  assert.equal(harness.db.prepare('SELECT department_id FROM users WHERE id = ?').get(noahId).department_id, null);

  const removedAgain = await harness.delete(`/api/departments/${created.body.department.id}`, adminCookie);
  assert.equal(removedAgain.status, 404);

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
  assert.equal(adminBootstrap.body.departments.some(item => item.name === 'Compliance'), false);
  assert.equal(
    adminBootstrap.body.members.find(item => item.id === noahId).department,
    '',
  );
  assert.equal(adminBootstrap.body.members.find(item => item.id === noahId).departmentId, null);
  assert.deepEqual(adminBootstrap.body.settings, settings.body.settings);

  const memberBootstrap = await harness.get('/api/bootstrap', memberCookie);
  assert.equal('departments' in memberBootstrap.body, false);
  assert.equal('settings' in memberBootstrap.body, false);
  assert.equal('team' in memberBootstrap.body, false);
});

test('OrgAdmin is email-blind while DepAdmin authority follows the current department head', async (context) => {
  const harness = await createApiHarness(context, { includeUnassigned: true });
  const orgAdminCookie = await harness.login('admin@lexflow.local');
  const mayaCookie = await harness.login('maya@lexflow.local');
  const noahCookie = await harness.login('noah@lexflow.local');
  const legal = one(harness.db, "SELECT id FROM departments WHERE name = 'Legal'");
  const finance = one(harness.db, "SELECT id FROM departments WHERE name = 'Finance'");
  const mayaId = harness.userId('maya@lexflow.local');
  const noahId = harness.userId('noah@lexflow.local');
  const priyaId = harness.userId('priya@lexflow.local');

  const orgAdmin = await harness.get('/api/bootstrap', orgAdminCookie);
  for (const confidentialField of ['emails', 'rules', 'activity', 'notifications', 'sync', 'team']) {
    assert.equal(orgAdmin.body[confidentialField], undefined);
  }
  assert.ok(Array.isArray(orgAdmin.body.members));
  assert.ok(Array.isArray(orgAdmin.body.departments));

  const mayaBefore = await harness.get('/api/bootstrap', mayaCookie);
  assert.equal(mayaBefore.body.user.role, 'dep_admin');
  assert.equal(mayaBefore.body.department.id, Number(legal.id));
  assert.ok(mayaBefore.body.emails.every(email => email.departmentId === Number(legal.id)));
  assert.ok(mayaBefore.body.rules.every(rule => rule.departmentId === Number(legal.id)));

  const invalidCandidate = await harness.patch(
    `/api/departments/${legal.id}/head`,
    { memberId: priyaId },
    orgAdminCookie,
  );
  assert.equal(invalidCandidate.status, 400);

  const replaced = await harness.patch(
    `/api/departments/${legal.id}/head`,
    { memberId: noahId },
    orgAdminCookie,
  );
  assert.equal(replaced.status, 200);
  assert.equal(replaced.body.department.headUser.id, noahId);

  const mayaAfter = await harness.get('/api/bootstrap', mayaCookie);
  const noahAfter = await harness.get('/api/bootstrap', noahCookie);
  assert.equal(mayaAfter.body.user.role, 'member');
  assert.ok(mayaAfter.body.emails.every(email => email.assignee?.id === mayaId));
  assert.equal(noahAfter.body.user.role, 'dep_admin');
  assert.ok(noahAfter.body.emails.some(email => email.status === 'unassigned'));

  const financeRule = one(harness.db, 'SELECT id FROM rules WHERE department_id = ?', finance.id);
  const financeEmail = one(harness.db, 'SELECT id FROM emails WHERE department_id = ?', finance.id);
  assert.equal((await harness.patch(
    `/api/rules/${financeRule.id}`,
    { name: 'Hidden finance rule' },
    noahCookie,
  )).status, 404);
  assert.equal((await harness.post(
    `/api/emails/${financeEmail.id}/assign`,
    { assigneeId: noahId },
    noahCookie,
  )).status, 404);
  assert.equal((await harness.post('/api/rules', {
    name: 'OrgAdmin must not route mail',
    keywords: 'private',
    senderFilter: '',
    assigneeId: noahId,
    priority: 40,
  }, orgAdminCookie)).status, 403);

  const protectedMove = await harness.patch(
    `/api/team/${noahId}/department`,
    { departmentId: Number(finance.id) },
    orgAdminCookie,
  );
  assert.equal(protectedMove.status, 409);
  assert.equal(protectedMove.body.error.code, 'DEPARTMENT_HEAD_REPLACEMENT_REQUIRED');

  const restored = await harness.patch(
    `/api/departments/${legal.id}/head`,
    { memberId: mayaId },
    orgAdminCookie,
  );
  assert.equal(restored.status, 200);
});

test('bootstrap reports role-scoped pending task counts only to Members and DepAdmins', async (context) => {
  const harness = await createApiHarness(context, { includeUnassigned: true });
  const orgAdminCookie = await harness.login('admin@lexflow.local');
  const depAdminCookie = await harness.login('maya@lexflow.local');
  const memberCookie = await harness.login('noah@lexflow.local');
  const legal = one(harness.db, "SELECT id FROM departments WHERE name = 'Legal'");
  const noahId = harness.userId('noah@lexflow.local');
  const mayaId = harness.userId('maya@lexflow.local');
  const timestamp = '2026-08-30T12:00:00.000Z';

  const memberEmailId = Number(harness.db.prepare(`
    INSERT INTO emails
      (provider_id, subject, sender_name, sender_address, preview, received_at,
       status, assignee_id, assigned_at, created_at, organization_id, department_id)
    VALUES ('pending-member-summary', 'Member task', 'Sender', 'sender@example.test', 'Review', ?,
      'assigned', ?, ?, ?, 1, ?)
  `).run(timestamp, noahId, timestamp, timestamp, legal.id).lastInsertRowid);
  harness.db.prepare('DELETE FROM notifications').run();
  harness.db.prepare(`
    INSERT INTO notifications (user_id, email_id, kind, message, created_at, organization_id, department_id)
    VALUES (?, ?, 'assignment', 'Member task assigned.', ?, 1, ?)
  `).run(noahId, memberEmailId, timestamp, legal.id);
  const mayaEmail = one(harness.db, "SELECT id FROM emails WHERE assignee_id = ? AND status = 'assigned'", mayaId);
  harness.db.prepare(`
    INSERT INTO notifications (user_id, email_id, kind, message, created_at, organization_id, department_id)
    VALUES (?, ?, 'assignment', 'Department task assigned.', ?, 1, ?)
  `).run(mayaId, mayaEmail.id, timestamp, legal.id);

  const orgAdmin = await harness.get('/api/bootstrap', orgAdminCookie);
  const depAdmin = await harness.get('/api/bootstrap', depAdminCookie);
  const member = await harness.get('/api/bootstrap', memberCookie);

  assert.equal('pendingTasks' in orgAdmin.body, false);
  assert.deepEqual(depAdmin.body.pendingTasks, {
    assignedToMe: 1,
    unassignedDepartment: 1,
    unreadNotifications: 1,
  });
  assert.deepEqual(member.body.pendingTasks, {
    assignedToMe: 1,
    unassignedDepartment: 0,
    unreadNotifications: 1,
  });
});

test('email open links are limited to the current DepAdmin department or Member assignment', async (context) => {
  const resolverCalls = [];
  let resolvedOutlookLink = 'https://outlook.office.com/mail/deeplink/read/current-message';
  const harness = await createApiHarness(context, {
    integrationFactory() {
      return {
        outlook: {
          configured: true,
          async resolveWebLink(input) {
            resolverCalls.push(input);
            return resolvedOutlookLink;
          },
        },
      };
    },
  });
  const legal = one(harness.db, "SELECT id, shared_mailbox FROM departments WHERE name = 'Legal'");
  const noahId = harness.userId('noah@lexflow.local');
  const createdAt = '2026-08-30T09:00:00.000Z';
  const outlookEmailId = Number(harness.db.prepare(`
    INSERT INTO emails
      (provider_id, provider, mailbox_address, subject, sender_name, sender_address,
       preview, received_at, outlook_url, status, assignee_id, assigned_at, created_at,
       organization_id, department_id)
    VALUES (?, 'outlook', ?, 'Scoped matter', 'Sender', 'sender@example.test',
      'Message preview', ?, 'https://outlook.office.com/owa/legacy-link', 'assigned', ?, ?, ?, 1, ?)
  `).run(
    `outlook:${legal.shared_mailbox.toLocaleLowerCase()}:immutable-message`,
    legal.shared_mailbox,
    createdAt,
    noahId,
    createdAt,
    createdAt,
    legal.id,
  ).lastInsertRowid);
  const gmailLink = 'https://mail.google.com/mail/u/0/#inbox/direct-message';
  const gmailEmailId = Number(harness.db.prepare(`
    INSERT INTO emails
      (provider_id, provider, mailbox_address, subject, sender_name, sender_address,
       preview, received_at, outlook_url, status, assignee_id, assigned_at, created_at,
       organization_id, department_id)
    VALUES ('gmail:test:direct-message', 'gmail', 'owner@example.test', 'Gmail matter',
      'Sender', 'sender@example.test', 'Message preview', ?, ?, 'assigned', ?, ?, ?, 1, ?)
  `).run(createdAt, gmailLink, noahId, createdAt, createdAt, legal.id).lastInsertRowid);

  harness.db.prepare(`
    INSERT INTO users
      (email, name, initials, department, role, organization_id, auth_provider,
       account_status, department_id)
    VALUES ('ravi@lexflow.local', 'Ravi Kumar', 'RK', 'Legal', 'member', 1, 'local', 'active', ?)
  `).run(legal.id);
  harness.db.prepare(`
    INSERT INTO users
      (email, name, initials, department, role, organization_id, auth_provider,
       account_status, is_platform_admin)
    VALUES ('developer@platform.test', 'Platform Developer', 'PD', '', 'admin', NULL,
      'local', 'active', 1)
  `).run();
  harness.db.prepare(`
    INSERT INTO organizations
      (entra_tenant_id, name, domain, status, created_at, updated_at)
    VALUES ('99999999-9999-4999-8999-999999999999', 'Other Org', 'other.test', 'active', ?, ?)
  `).run(createdAt, createdAt);
  const otherOrganizationId = Number(one(harness.db, "SELECT id FROM organizations WHERE domain = 'other.test'").id);
  harness.db.prepare(`
    INSERT INTO users
      (email, name, initials, department, role, organization_id, auth_provider, account_status)
    VALUES ('member@other.test', 'Other Member', 'OM', '', 'member', ?, 'local', 'active')
  `).run(otherOrganizationId);

  const depAdminCookie = await harness.login('maya@lexflow.local');
  const memberCookie = await harness.login('noah@lexflow.local');
  const sameDepartmentMemberCookie = await harness.login('ravi@lexflow.local');
  const otherDepartmentCookie = await harness.login('priya@lexflow.local');
  const orgAdminCookie = await harness.login('admin@lexflow.local');
  const platformAdminCookie = await harness.login('developer@platform.test');
  const otherOrganizationCookie = await harness.login('member@other.test');

  const depAdminResult = await harness.get(`/api/emails/${outlookEmailId}/open-link`, depAdminCookie);
  const memberResult = await harness.get(`/api/emails/${outlookEmailId}/open-link`, memberCookie);
  assert.equal(depAdminResult.status, 200);
  assert.deepEqual(depAdminResult.body, { webUrl: resolvedOutlookLink });
  assert.equal(memberResult.status, 200);
  assert.equal(resolverCalls.length, 2);
  assert.deepEqual(resolverCalls[0], {
    organizationId: 1,
    mailboxAddress: legal.shared_mailbox,
    immutableId: 'immutable-message',
    subject: 'Scoped matter',
    receivedAt: createdAt,
  });

  for (const cookie of [
    sameDepartmentMemberCookie,
    otherDepartmentCookie,
    orgAdminCookie,
    platformAdminCookie,
    otherOrganizationCookie,
  ]) {
    const hidden = await harness.get(`/api/emails/${outlookEmailId}/open-link`, cookie);
    assert.equal(hidden.status, 404);
    assert.equal(hidden.body.error.code, 'NOT_FOUND');
  }
  assert.equal(resolverCalls.length, 2);

  const gmailResult = await harness.get(`/api/emails/${gmailEmailId}/open-link`, memberCookie);
  assert.equal(gmailResult.status, 200);
  assert.deepEqual(gmailResult.body, { webUrl: gmailLink });
  assert.equal(resolverCalls.length, 2);

  resolvedOutlookLink = 'https://example.test/not-an-outlook-link';
  const unsafeOutlookResult = await harness.get(`/api/emails/${outlookEmailId}/open-link`, memberCookie);
  assert.equal(unsafeOutlookResult.status, 502);
  assert.equal(unsafeOutlookResult.body.error.code, 'OUTLOOK_LINK_FAILED');
});

test('completion records department activity and notifies only the current DepAdmin once', async (context) => {
  const harness = await createApiHarness(context);
  const mayaCookie = await harness.login('maya@lexflow.local', 'welcome123');
  const adminCookie = await harness.login('admin@lexflow.local', 'admin123');
  const email = harness.emailAssignedTo('maya@lexflow.local');
  harness.db.prepare(`
    INSERT INTO users (email, name, initials, department, role)
    VALUES ('ops2@lexflow.local', 'Second Admin', 'SA', 'Operations', 'admin')
  `).run();

  const completion = await harness.post(`/api/emails/${email.id}/complete`, {}, mayaCookie);
  const repeatedCompletion = await harness.post(
    `/api/emails/${email.id}/complete`,
    {},
    mayaCookie,
  );
  const depAdmin = await harness.get('/api/bootstrap', mayaCookie);
  const admin = await harness.get('/api/bootstrap', adminCookie);
  const event = depAdmin.body.activity.find(item => item.kind === 'completed' && item.emailId === email.id);
  const completionNotifications = depAdmin.body.notifications.filter(item => (
    item.kind === 'completion' && item.emailId === email.id
  ));

  assert.equal(completion.status, 200);
  assert.equal(repeatedCompletion.status, 200);
  assert.equal(event.actor.name, 'Maya Shah');
  assert.match(event.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(completionNotifications.length, 1);
  assert.equal(completionNotifications[0].readAt, null);
  assert.equal(admin.body.emails, undefined);
  assert.equal(admin.body.activity, undefined);
  assert.equal(admin.body.notifications, undefined);
  assert.equal(harness.db.prepare(`
    SELECT count(*) AS count FROM notifications
    WHERE email_id = ? AND kind = 'completion'
  `).get(email.id).count, 1);
  assert.equal(harness.db.prepare(`
    SELECT count(*) AS count FROM activity
    WHERE email_id = ? AND kind = 'completed'
  `).get(email.id).count, 1);
});

test('metrics routes enforce role scope and return email-blind payloads', async (context) => {
  const now = new Date('2026-08-30T12:00:00.000Z');
  const harness = await createApiHarness(context, { clock: () => now });
  harness.db.prepare(`
    INSERT INTO users
      (email, name, initials, department, role, organization_id, auth_provider,
       account_status, is_platform_admin)
    VALUES ('metrics-platform@platform.test', 'Metrics Platform', 'MP', '', 'admin', NULL,
      'local', 'active', 1)
  `).run();
  harness.db.prepare(`
    INSERT INTO organizations
      (entra_tenant_id, name, domain, status, timezone, created_at, updated_at)
    VALUES ('99999999-9999-4999-8999-999999999999', 'Metrics Customer',
      'metrics.test', 'active', 'UTC', ?, ?)
  `).run(now.toISOString(), now.toISOString());

  const orgAdmin = await harness.login('admin@lexflow.local');
  const depAdmin = await harness.login('maya@lexflow.local');
  const member = await harness.login('noah@lexflow.local');
  const platform = await harness.login('metrics-platform@platform.test');
  const range = '?preset=custom&from=2026-08-01&to=2026-08-30';

  const chartBundle = await harness.get('/vendor/chart.js');
  assert.equal(chartBundle.status, 200);
  assert.match(chartBundle.body, /Chart\.js/);

  const platformResult = await harness.get(`/api/metrics/platform${range}&timezone=UTC`, platform);
  const organizationResult = await harness.get(`/api/metrics/organization${range}`, orgAdmin);
  const departmentResult = await harness.get(`/api/metrics/department${range}`, depAdmin);
  const memberResult = await harness.get(`/api/metrics/me${range}`, member);
  assert.equal(platformResult.status, 200);
  assert.equal(organizationResult.status, 200);
  assert.equal(departmentResult.status, 200);
  assert.equal(memberResult.status, 200);
  assert.deepEqual(
    [platformResult.body.scope, organizationResult.body.scope, departmentResult.body.scope, memberResult.body.scope],
    ['platform', 'organization', 'department', 'member'],
  );

  for (const result of [platformResult, organizationResult, departmentResult, memberResult]) {
    assert.doesNotMatch(
      JSON.stringify(result.body),
      /Urgent NDA amendment|legal@acme\.test|Please review the NDA|mock-nda-1/iu,
    );
  }
  assert.equal((await harness.get(`/api/metrics/organization${range}`, depAdmin)).status, 403);
  assert.equal((await harness.get(`/api/metrics/department${range}`, orgAdmin)).status, 403);
  assert.equal((await harness.get(`/api/metrics/me${range}`, depAdmin)).status, 403);
  assert.equal((await harness.get(`/api/metrics/platform${range}&timezone=UTC`, member)).status, 403);
  assert.equal(
    (await harness.get(`/api/metrics/organization${range}&departmentId=99999`, orgAdmin)).status,
    404,
  );
  const financeMember = harness.userId('priya@lexflow.local');
  assert.equal(
    (await harness.get(`/api/metrics/department${range}&employeeId=${financeMember}`, depAdmin)).status,
    404,
  );
});

test('serves local vendor bundles with immutable caching', async context => {
  const harness = await createApiHarness(context);
  const animeBundle = await harness.get('/vendor/animejs.js');
  assert.equal(animeBundle.status, 200);
  assert.match(animeBundle.headers['content-type'], /javascript/);
  assert.match(animeBundle.body, /function animate|const animate|export \{/);
  assert.equal(animeBundle.headers['cache-control'], 'public, max-age=31536000, immutable');
});

test('multi-source sync is idempotent and isolates provider failures and cursors', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const legalDepartment = one(db, "SELECT id, shared_mailbox FROM departments WHERE name = 'Legal'");
  const financeDepartment = one(db, "SELECT id, shared_mailbox FROM departments WHERE name = 'Finance'");

  let outlookCall = 0;
  let gmailCall = 0;
  let gmailFailure = false;
  const outlookCursors = [];
  const gmailCursors = [];
  const outlookSource = {
    provider: 'outlook',
    organizationId: 1,
    departmentId: Number(legalDepartment.id),
    mailboxAddress: legalDepartment.shared_mailbox,
    cursorKey: `mail_cursor:graph:${legalDepartment.shared_mailbox}`,
    async fetchChanges(cursor) {
      outlookCursors.push(cursor);
      outlookCall += 1;
      const messages = [{
        providerId: outlookCall < 3 ? 'same-raw-id' : 'outlook-new',
        provider: 'outlook',
        mailboxAddress: legalDepartment.shared_mailbox,
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
    organizationId: 1,
    departmentId: Number(financeDepartment.id),
    mailboxAddress: financeDepartment.shared_mailbox,
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
          mailboxAddress: financeDepartment.shared_mailbox,
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
  const financeDepartment = one(db, "SELECT id, shared_mailbox FROM departments WHERE name = 'Finance'");

  let current = true;
  let finishFetch;
  const source = {
    provider: 'gmail',
    organizationId: 1,
    departmentId: Number(financeDepartment.id),
    mailboxAddress: financeDepartment.shared_mailbox,
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
      mailboxAddress: financeDepartment.shared_mailbox,
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

test('sync runner exposes organization-scoped in-progress and completed outcomes', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const legal = one(db, "SELECT id, shared_mailbox FROM departments WHERE name = 'Legal'");
  let now = new Date('2026-08-30T10:00:00.000Z');
  let rejectFetch = false;
  let finishFetch;
  const source = {
    provider: 'outlook',
    organizationId: 1,
    departmentId: Number(legal.id),
    mailboxAddress: legal.shared_mailbox,
    cursorKey: `mail_cursor:graph:${legal.shared_mailbox}`,
    fetchChanges() {
      if (rejectFetch) return Promise.reject(new Error('Graph unavailable'));
      return new Promise(resolve => { finishFetch = resolve; });
    },
  };
  const runner = createSyncRunner({ db, sources: [source], clock: () => now });

  assert.deepEqual(runner.status(1), {
    inProgress: false,
    startedAt: null,
    completedAt: null,
    sequence: 0,
    outcome: null,
  });
  const pending = runner.run();
  assert.deepEqual(runner.status(1), {
    inProgress: true,
    startedAt: '2026-08-30T10:00:00.000Z',
    completedAt: null,
    sequence: 1,
    outcome: null,
  });
  assert.equal(runner.status(999).inProgress, false);

  now = new Date('2026-08-30T10:00:05.000Z');
  finishFetch({ messages: [], nextCursor: 'cursor-1' });
  await pending;
  assert.deepEqual(runner.status(1), {
    inProgress: false,
    startedAt: '2026-08-30T10:00:00.000Z',
    completedAt: '2026-08-30T10:00:05.000Z',
    sequence: 1,
    outcome: 'success',
  });
  assert.equal(one(db, "SELECT value FROM sync_state WHERE key = 'outlook:last_success_at'").value, '2026-08-30T10:00:05.000Z');

  rejectFetch = true;
  now = new Date('2026-08-30T10:01:00.000Z');
  await assert.rejects(runner.run(), error => error.code === 'SYNC_FAILED');
  assert.deepEqual(runner.status(1), {
    inProgress: false,
    startedAt: '2026-08-30T10:01:00.000Z',
    completedAt: '2026-08-30T10:01:00.000Z',
    sequence: 2,
    outcome: 'error',
  });
  assert.equal(one(db, "SELECT value FROM sync_state WHERE key = 'outlook:last_error'").value, 'Microsoft Graph synchronization needs attention.');
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
  const memberCookie = await harness.login('noah@lexflow.local', 'welcome123');
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

test('Microsoft 365 tenant connection routes are OrgAdmin-only and preserve callback state', async (context) => {
  const calls = [];
  const harness = await createApiHarness(context, {
    integrationFactory() {
      return {
        outlook: {
          configured: true,
          status() {
            return {
              configured: true,
              connected: false,
              accountEmail: null,
              mailboxCount: 2,
              lastSuccessAt: null,
              lastError: null,
            };
          },
          authorizationUrl(input) {
            calls.push({ kind: 'authorize', ...input });
            return 'https://login.microsoftonline.com/tenant/v2.0/adminconsent?state=consent-state';
          },
          async completeAuthorization(input) { calls.push({ kind: 'callback', ...input }); },
          disconnect(input) { calls.push({ kind: 'disconnect', ...input }); },
        },
      };
    },
  });
  const memberCookie = await harness.login('noah@lexflow.local');
  const adminCookie = await harness.login('admin@lexflow.local');
  const bootstrap = await harness.get('/api/bootstrap', adminCookie);

  assert.equal(bootstrap.body.integrations.outlook.mailboxCount, 2);
  assert.equal(bootstrap.body.integrations.outlook.inProgress, false);
  assert.equal(bootstrap.body.integrations.outlook.sequence, 1);
  assert.equal(bootstrap.body.integrations.outlook.outcome, 'success');
  assert.equal('emails' in bootstrap.body, false);

  assert.equal((await harness.get('/api/integrations/outlook/authorize', memberCookie, { redirect: 'manual' })).status, 403);
  const start = await harness.get('/api/integrations/outlook/authorize', adminCookie, { redirect: 'manual' });
  assert.equal(start.status, 303);
  assert.match(start.location, /adminconsent/);
  assert.equal(calls[0].kind, 'authorize');
  assert.ok(calls[0].sessionId);

  const callback = await harness.get('/api/integrations/outlook/callback?state=consent-state&tenant=tenant&admin_consent=True', adminCookie, { redirect: 'manual' });
  assert.equal(callback.status, 303);
  assert.equal(callback.location, '/?integration=outlook-connected');
  assert.equal(calls[1].state, 'consent-state');
  assert.equal(calls[1].adminConsent, 'True');

  assert.equal((await harness.delete('/api/integrations/outlook', adminCookie)).status, 204);
  assert.equal(calls[2].kind, 'disconnect');
});
