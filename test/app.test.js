import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

import { createApp } from '../src/app.js';
import { hashPassword } from '../src/auth.js';
import { createDatabase, seedDemoData } from '../src/db.js';
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
  { includeUnassigned = false, clock = () => new Date() } = {},
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
  const server = createApp({ db, syncRunner, mode: 'demo', clock }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  context.after(async () => {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
    db.close();
  });

  async function request(method, path, body, cookie) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(cookie ? { cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return {
      status: response.status,
      body: text ? JSON.parse(text) : null,
      cookie: response.headers.get('set-cookie')?.split(';', 1)[0] ?? null,
    };
  }

  return {
    db,
    request,
    get: (path, cookie) => request('GET', path, undefined, cookie),
    post: (path, body, cookie) => request('POST', path, body, cookie),
    patch: (path, body, cookie) => request('PATCH', path, body, cookie),
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

test('a member cannot mutate rules or trigger sync', async (context) => {
  const harness = await createApiHarness(context);
  const cookie = await harness.login('maya@lexflow.local', 'welcome123');
  const assigneeId = mayaId(harness.db);

  const rule = await harness.post('/api/rules', {
    name: 'Court review',
    keywords: 'court',
    senderFilter: '',
    assigneeId,
    priority: 30,
  }, cookie);
  const sync = await harness.post('/api/sync', {}, cookie);

  assert.equal(rule.status, 403);
  assert.equal(sync.status, 403);
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

test('completion records the member and time for admin activity', async (context) => {
  const harness = await createApiHarness(context);
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
