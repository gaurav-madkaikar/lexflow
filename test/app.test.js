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

async function createApiHarness(context) {
  const db = createDatabase(':memory:');
  const [adminPasswordHash, memberPasswordHash] = await Promise.all([
    hashPassword('admin123'),
    hashPassword('welcome123'),
  ]);
  seedDemoData(db, { adminPasswordHash, memberPasswordHash });

  const source = fixedSource([ndaMessage, invoiceMessage]);
  const syncRunner = createSyncRunner({ db, source });
  await syncRunner.run();
  const server = createApp({ db, syncRunner, mode: 'demo' }).listen(0, '127.0.0.1');
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
    get: (path, cookie) => request('GET', path, undefined, cookie),
    post: (path, body, cookie) => request('POST', path, body, cookie),
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
