import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createApp } from '../src/app.js';
import { hashPassword } from '../src/auth.js';
import { bindConversationSource } from '../src/canonical-conversations.js';
import { createConversationHistoryService } from '../src/conversation-history.js';
import { createDatabase, seedDemoData } from '../src/db.js';
import { createDeliveryRunner } from '../src/deliveries.js';
import { createGmailIntegration } from '../src/gmail.js';
import {
  replaceConnectionGeneration,
  resolveMailboxConnection,
} from '../src/mailbox-connections.js';
import {
  createSyncRunner,
  resolveCurrentDeliveryContext,
  syncMailbox,
} from '../src/workflows.js';

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

function organizationLogoDataUrl(width = 96, height = 96) {
  const bytes = Buffer.alloc(45);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12, 'ascii');
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes[24] = 8;
  bytes[25] = 6;
  bytes.write('IEND', 37, 'ascii');
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

function organizationRegistration(overrides = {}) {
  return {
    organizationName: 'Northstar Legal',
    organizationDomain: 'northstar.example',
    logoDataUrl: organizationLogoDataUrl(),
    name: 'Ava Admin',
    email: 'ava@northstar.example',
    mailboxProvider: 'gmail',
    password: 'correct horse battery staple',
    ...overrides,
  };
}

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

test('registration markup keeps the required enrollment and admin controls', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  for (const id of [
    'register-open',
    'register-view',
    'register-role',
    'organization-form',
    'join-request-form',
    'invite-form',
    'organization-profile',
    'membership-request-list',
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`, 'u'));
  }
});

function mayaId(db) {
  return one(db, 'SELECT id FROM users WHERE email = ?', 'maya@lexflow.local').id;
}

async function createApiHarness(
  context,
  {
    includeUnassigned = false,
    clock = () => new Date(),
    mode = 'demo',
    appBaseUrl = 'http://127.0.0.1:3000',
    deliveryRunner = null,
    conversationHistory = null,
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
  const server = createApp({
    db,
    syncRunner,
    mode,
    appBaseUrl,
    integrations,
    deliveryRunner,
    conversationHistory,
    clock,
  })
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
      headers: Object.fromEntries(response.headers.entries()),
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

function connectOutlookMailbox(db, {
  mailboxAddress = 'admin@lexflow.local',
  capabilities = ['read', 'send'],
} = {}) {
  return replaceConnectionGeneration({
    db,
    organizationId: 1,
    provider: 'outlook',
    account: {
      mailboxAddress,
      providerAccountId: `provider:${mailboxAddress}`,
      adminUserId: Number(one(db, 'SELECT id FROM users WHERE email = ?', 'admin@lexflow.local').id),
      encryptedGrant: 'encrypted-outlook-grant-fixture',
      grantKind: 'oauth',
      capabilities,
    },
    now: new Date('2026-08-26T09:00:00.000Z'),
  });
}

function bindNativeSource(db, email, connection, nativeConversationId) {
  return bindConversationSource(db, {
    organizationId: 1,
    conversationId: Number(email.conversation_id),
    emailId: Number(email.id),
    mailboxIdentityId: connection.mailboxIdentityId,
    connectionId: connection.id,
    provider: connection.provider,
    mailboxAddress: connection.mailboxAddress,
    nativeConversationId,
    fallbackKey: email.thread_key,
    now: new Date('2026-08-26T09:01:00.000Z'),
  });
}

test('organization registration, approval, and invite completion stay tenant-isolated', async context => {
  const now = new Date('2026-08-26T09:00:00.000Z');
  const harness = await createApiHarness(context, { clock: () => now });
  const defaultAdminCookie = await harness.login('admin@lexflow.local', 'admin123');
  const defaultEmail = harness.db.prepare('SELECT id FROM emails ORDER BY id LIMIT 1').get();

  const registration = await harness.post(
    '/api/registrations/admin',
    organizationRegistration(),
  );
  assert.equal(registration.status, 201);
  assert.ok(registration.cookie);
  assert.equal(registration.body.user.role, 'admin');
  assert.equal(registration.body.organization.domain, 'northstar.example');
  assert.ok(registration.body.organization.joinCode);
  assert.match(registration.body.organization.logoUrl, /^\/api\/organization-logos\/\d+$/u);

  const registeredBootstrap = await harness.get('/api/bootstrap', registration.cookie);
  assert.equal(registeredBootstrap.status, 200);
  assert.deepEqual(registeredBootstrap.body.emails, []);
  assert.deepEqual(registeredBootstrap.body.team, []);
  assert.equal(
    registeredBootstrap.body.organization.joinCode,
    registration.body.organization.joinCode,
  );
  assert.equal(registeredBootstrap.body.integrations.gmail.connected, false);
  assert.equal(registeredBootstrap.body.integrations.gmail.accountEmail, null);

  const lookup = await harness.get(
    `/api/organizations/lookup?key=${encodeURIComponent(registration.body.organization.handle)}`,
  );
  assert.equal(lookup.status, 200);
  assert.equal(lookup.body.organization.name, 'Northstar Legal');
  assert.equal('joinCode' in lookup.body.organization, false);

  const requested = await harness.post('/api/join-requests', {
    organizationKey: registration.body.organization.joinCode,
    email: 'maya@northstar.example',
    mailboxProvider: 'outlook',
  });
  assert.equal(requested.status, 202);
  assert.equal(requested.body.request.status, 'pending');

  const memberRequests = await harness.get('/api/membership-requests', registration.cookie);
  assert.equal(memberRequests.status, 200);
  assert.equal(memberRequests.body.requests.length, 1);
  const defaultRequests = await harness.get('/api/membership-requests', defaultAdminCookie);
  assert.deepEqual(defaultRequests.body.requests, []);

  const approved = await harness.post(
    `/api/membership-requests/${requested.body.request.id}/approve`,
    {},
    registration.cookie,
  );
  assert.equal(approved.status, 200);
  assert.match(approved.body.inviteLink, /^http:\/\/127\.0\.0\.1:3000\/\?invite=/u);
  const oldInviteToken = new URL(approved.body.inviteLink).searchParams.get('invite');
  assert.ok(oldInviteToken);

  const approvedRequests = await harness.get('/api/membership-requests', registration.cookie);
  assert.equal(approvedRequests.body.requests[0].status, 'approved');
  assert.ok(approvedRequests.body.requests[0].inviteExpiresAt);
  const replacement = await harness.post(
    `/api/membership-requests/${requested.body.request.id}/replace-invite`,
    {},
    registration.cookie,
  );
  assert.equal(replacement.status, 200);
  const inviteToken = new URL(replacement.body.inviteLink).searchParams.get('invite');
  assert.ok(inviteToken);
  assert.notEqual(inviteToken, oldInviteToken);
  assert.equal(
    (await harness.get(`/api/registration-invites/${oldInviteToken}`)).status,
    404,
  );

  const inspected = await harness.get(`/api/registration-invites/${inviteToken}`);
  assert.equal(inspected.status, 200);
  assert.equal(inspected.body.invite.email, 'maya@northstar.example');
  assert.equal(inspected.body.invite.organization.name, 'Northstar Legal');

  const completed = await harness.post(`/api/registration-invites/${inviteToken}/complete`, {
    name: 'Maya Northstar',
    password: 'member password 123',
  });
  assert.equal(completed.status, 201);
  assert.ok(completed.cookie);
  assert.equal(completed.body.user.role, 'member');

  const memberBootstrap = await harness.get('/api/bootstrap', completed.cookie);
  assert.equal(memberBootstrap.status, 200);
  assert.deepEqual(memberBootstrap.body.emails, []);
  assert.equal(
    (await harness.get(`/api/registration-invites/${inviteToken}`)).status,
    404,
  );

  const crossTenantAssignment = await harness.post(
    `/api/emails/${defaultEmail.id}/assign`,
    { assigneeId: completed.body.user.id },
    registration.cookie,
  );
  assert.equal(crossTenantAssignment.status, 404);

  const defaultBootstrap = await harness.get('/api/bootstrap', defaultAdminCookie);
  assert.equal(
    defaultBootstrap.body.team.some(user => user.email === 'maya@northstar.example'),
    false,
  );
});

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

test('sync retains only the latest 500 emails and skips automation for discarded mail', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const maya = one(db, 'SELECT id FROM users WHERE email = ?', 'maya@lexflow.local');
  const insertEmail = db.prepare(`
    INSERT INTO emails
      (provider_id, provider, mailbox_address, subject, sender_name, sender_address,
       preview, received_at, status, created_at)
    VALUES (?, 'gmail', 'retention@gmail.test', ?, 'Existing Sender',
            'existing@example.test', 'Existing retained message', ?, 'unassigned', ?)
  `);

  db.exec('BEGIN IMMEDIATE');
  try {
    for (let index = 0; index < 500; index += 1) {
      const receivedAt = new Date(Date.UTC(2026, 7, 1, 0, 0, index)).toISOString();
      insertEmail.run(
        `gmail:retention@gmail.test:existing-${index}`,
        `Existing email ${index}`,
        receivedAt,
        receivedAt,
      );
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  const cursorKey = 'mail_cursor:gmail:retention@gmail.test';
  db.prepare('INSERT INTO sync_state (key, value) VALUES (?, ?)')
    .run(cursorKey, 'cursor-before-mixed-batch');
  let cursorSeenByMixedBatch;
  const mixedResult = await syncMailbox({
    db,
    source: {
      provider: 'gmail',
      mailboxAddress: 'retention@gmail.test',
      cursorKey,
      async fetchChanges(cursor) {
        cursorSeenByMixedBatch = cursor;
        return {
          messages: [
            {
              providerId: 'gmail:retention@gmail.test:new-survivor',
              subject: 'Newest ACME NDA request',
              senderName: 'New Sender',
              senderAddress: 'new@example.test',
              preview: 'This matching message should be assigned.',
              receivedAt: '2026-08-20T12:00:00.000Z',
              webUrl: 'https://mail.google.com/mail/#inbox/new-survivor',
            },
            {
              providerId: 'gmail:retention@gmail.test:too-old-mixed',
              subject: 'Too old ACME NDA request',
              senderName: 'Old Sender',
              senderAddress: 'old@example.test',
              preview: 'This matching message must be discarded.',
              receivedAt: '2026-07-01T12:00:00.000Z',
              webUrl: 'https://mail.google.com/mail/#inbox/too-old-mixed',
            },
          ],
          nextCursor: 'cursor-after-mixed-batch',
        };
      },
    },
  });

  assert.equal(cursorSeenByMixedBatch, 'cursor-before-mixed-batch');
  assert.deepEqual(mixedResult, { imported: 1, assigned: 1 });
  assert.equal(one(db, 'SELECT count(*) AS count FROM emails').count, 500);
  assert.equal(one(db, `
    SELECT count(*) AS count FROM emails
    WHERE provider_id = 'gmail:retention@gmail.test:existing-0'
  `).count, 0);
  assert.equal(one(db, `
    SELECT count(*) AS count FROM emails
    WHERE provider_id = 'gmail:retention@gmail.test:too-old-mixed'
  `).count, 0);
  const retainedNewEmail = one(db, `
    SELECT id, assignee_id FROM emails
    WHERE provider_id = 'gmail:retention@gmail.test:new-survivor'
  `);
  assert.equal(Number(retainedNewEmail.assignee_id), Number(maya.id));
  assert.equal(one(db, `
    SELECT count(*) AS count FROM notifications
    WHERE email_id = ? AND kind = 'assignment'
  `, retainedNewEmail.id).count, 1);
  assert.equal(one(db, `
    SELECT count(*) AS count FROM activity
    WHERE email_id = ? AND kind = 'assigned'
  `, retainedNewEmail.id).count, 1);
  assert.equal(one(db, `
    SELECT count(*) AS count FROM notifications WHERE message LIKE '%Too old%'
  `).count, 0);
  assert.equal(one(db, `
    SELECT count(*) AS count FROM activity WHERE message LIKE '%Too old%'
  `).count, 0);
  assert.equal(
    one(db, 'SELECT value FROM sync_state WHERE key = ?', cursorKey).value,
    'cursor-after-mixed-batch',
  );

  let cursorSeenByOldBatch;
  const allOldResult = await syncMailbox({
    db,
    source: {
      provider: 'gmail',
      mailboxAddress: 'retention@gmail.test',
      cursorKey,
      async fetchChanges(cursor) {
        cursorSeenByOldBatch = cursor;
        return {
          messages: [
            {
              providerId: 'gmail:retention@gmail.test:too-old-only-1',
              subject: 'Another old ACME NDA request',
              senderName: 'Old Sender',
              senderAddress: 'old@example.test',
              preview: 'Discard this old matching message.',
              receivedAt: '2026-06-01T12:00:00.000Z',
            },
            {
              providerId: 'gmail:retention@gmail.test:too-old-only-2',
              subject: 'Yet another old ACME NDA request',
              senderName: 'Old Sender',
              senderAddress: 'old@example.test',
              preview: 'Discard this old matching message too.',
              receivedAt: '2026-06-02T12:00:00.000Z',
            },
          ],
          nextCursor: 'cursor-after-old-batch',
        };
      },
    },
  });

  assert.equal(cursorSeenByOldBatch, 'cursor-after-mixed-batch');
  assert.deepEqual(allOldResult, { imported: 0, assigned: 0 });
  assert.equal(one(db, 'SELECT count(*) AS count FROM emails').count, 500);
  assert.equal(one(db, `
    SELECT count(*) AS count FROM emails WHERE provider_id LIKE '%:too-old-only-%'
  `).count, 0);
  assert.equal(one(db, 'SELECT count(*) AS count FROM notifications').count, 1);
  assert.equal(one(db, 'SELECT count(*) AS count FROM activity').count, 1);
  assert.equal(
    one(db, 'SELECT value FROM sync_state WHERE key = ?', cursorKey).value,
    'cursor-after-old-batch',
  );
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

test('bootstrap caps notification history while reporting complete totals', async (context) => {
  const harness = await createApiHarness(context);
  const adminId = harness.userId('admin@lexflow.local');
  const emailId = one(harness.db, 'SELECT id FROM emails ORDER BY id').id;
  const insertNotification = harness.db.prepare(`
    INSERT INTO notifications (user_id, email_id, kind, message, read_at, created_at)
    VALUES (?, ?, 'completion', ?, ?, ?)
  `);

  for (let index = 0; index < 225; index += 1) {
    insertNotification.run(
      adminId,
      emailId,
      `History notification ${index}`,
      index >= 125 ? '2030-01-02T00:00:00.000Z' : null,
      new Date(Date.UTC(2030, 0, 1, 0, index)).toISOString(),
    );
  }

  const expected = harness.db.prepare(`
    SELECT count(*) AS notification_total,
           count(*) FILTER (WHERE read_at IS NULL) AS unread_count
    FROM notifications
    WHERE user_id = ?
  `).get(adminId);
  const adminCookie = await harness.login('admin@lexflow.local', 'admin123');
  const bootstrap = await harness.get('/api/bootstrap', adminCookie);

  assert.equal(bootstrap.status, 200);
  assert.equal(bootstrap.body.notifications.length, 200);
  assert.equal(bootstrap.body.notificationTotal, Number(expected.notification_total));
  assert.equal(bootstrap.body.unreadCount, Number(expected.unread_count));
  assert.ok(
    bootstrap.body.unreadCount
      > bootstrap.body.notifications.filter(notification => !notification.readAt).length,
  );
  assert.equal(bootstrap.body.notifications[0].message, 'History notification 224');
  assert.equal(bootstrap.body.notifications.at(-1).message, 'History notification 25');
});

test('completion records activity and notifies every admin once', async (context) => {
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
  const event = admin.body.activity.find(item => item.kind === 'completed' && item.emailId === email.id);
  const completionNotifications = admin.body.notifications.filter(item => (
    item.kind === 'completion' && item.emailId === email.id
  ));

  assert.equal(completion.status, 200);
  assert.equal(repeatedCompletion.status, 200);
  assert.equal(event.actor.name, 'Maya Shah');
  assert.match(event.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(completionNotifications.length, 1);
  assert.equal(completionNotifications[0].readAt, null);
  assert.equal(harness.db.prepare(`
    SELECT count(*) AS count FROM notifications
    WHERE email_id = ? AND kind = 'completion'
  `).get(email.id).count, 2);
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

test('sync summaries never disclose another organization mailbox', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const now = '2026-08-26T09:00:00.000Z';
  const secondOrganizationId = Number(db.prepare(`
    INSERT INTO organizations
      (handle, join_code, name, normalized_domain, domain_verified, created_at, updated_at)
    VALUES ('second-org', 'SECOND-ORG', 'Second Org', 'second.example', 0, ?, ?)
  `).run(now, now).lastInsertRowid);
  const failingSource = (organizationId, provider, mailboxAddress) => ({
    organizationId,
    provider,
    mailboxAddress,
    cursorKey: `mail_cursor:${provider}:${organizationId}`,
    async fetchChanges() { throw new Error(`${provider} unavailable`); },
  });
  const runner = createSyncRunner({
    db,
    sources: [
      failingSource(1, 'gmail', 'private-one@example.test'),
      failingSource(secondOrganizationId, 'outlook', 'private-two@example.test'),
    ],
  });

  await assert.rejects(runner.run(), error => error.code === 'SYNC_FAILED');

  const firstError = one(
    db,
    "SELECT value FROM sync_state WHERE organization_id = 1 AND key = 'last_sync_error'",
  ).value;
  const secondError = one(
    db,
    "SELECT value FROM sync_state WHERE organization_id = ? AND key = 'last_sync_error'",
    secondOrganizationId,
  ).value;
  assert.match(firstError, /private-one@example\.test/u);
  assert.doesNotMatch(firstError, /private-two@example\.test/u);
  assert.match(secondError, /private-two@example\.test/u);
  assert.doesNotMatch(secondError, /private-one@example\.test/u);
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
    if (url.origin === 'https://openidconnect.googleapis.com') {
      assert.equal(options.headers.authorization, `Bearer ${accessToken}`);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            sub: 'google-stable-owner-id',
            email: 'owner@gmail.test',
            email_verified: true,
          };
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
  assert.deepEqual(authorizationUrl.searchParams.get('scope').split(' ').sort(), [
    'email',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'openid',
  ]);
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
  assert.equal(one(harness.db, `
    SELECT provider_account_id
    FROM mailbox_identities
    WHERE organization_id = 1 AND provider = 'gmail' AND normalized_mailbox = 'owner@gmail.test'
  `).provider_account_id, 'google-stable-owner-id');

  const adminBootstrap = await harness.get('/api/bootstrap', firstAdminCookie);
  const memberBootstrap = await harness.get('/api/bootstrap', memberCookie);
  assert.deepEqual(adminBootstrap.body.integrations.gmail, {
    provider: 'gmail',
    configured: true,
    connected: true,
    accountEmail: 'owner@gmail.test',
    lastSuccessAt: null,
    lastError: null,
    capabilities: { read: true, send: true },
    authorizationAvailable: true,
    disconnectAvailable: true,
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

test('conversation history API hides resources and exposes only provider-safe results', async context => {
  let historyService;
  const conversationHistory = {
    getForEmail(input) {
      return historyService.getForEmail(input);
    },
  };
  const harness = await createApiHarness(context, { conversationHistory });
  const adminCookie = await harness.login('admin@lexflow.local', 'admin123');
  const mayaCookie = await harness.login('maya@lexflow.local', 'welcome123');
  const mayaEmail = harness.emailAssignedTo('maya@lexflow.local');
  const connection = connectOutlookMailbox(harness.db, { capabilities: ['read'] });
  bindNativeSource(harness.db, mayaEmail, connection, 'native-history-maya');

  let providerFailure = null;
  historyService = createConversationHistoryService({
    db: harness.db,
    resolveMailboxConnection(input) {
      return resolveMailboxConnection(input);
    },
    loadProvider() {
      return {
        async fetchConversation() {
          if (providerFailure) throw providerFailure;
          return {
            messages: [{
              providerMessageId: 'provider-history-message-1',
              direction: 'received',
              sender: { name: 'Client', address: 'client@example.test' },
              occurredAt: '2026-08-26T08:00:00.000Z',
              preview: 'A safely formatted provider preview.',
              webUrl: 'https://outlook.office.com/mail/history-message-1',
            }],
            truncated: false,
          };
        },
      };
    },
  });

  const unauthenticated = await harness.get(`/api/emails/${mayaEmail.id}/conversation`);
  assert.equal(unauthenticated.status, 401);

  const adminHistory = await harness.get(
    `/api/emails/${mayaEmail.id}/conversation`,
    adminCookie,
  );
  assert.equal(adminHistory.status, 200);
  assert.equal(adminHistory.headers['cache-control'], 'private, no-store');
  assert.equal(adminHistory.body.conversation.messages.length, 1);
  assert.equal(
    adminHistory.body.conversation.messages[0].webUrl,
    'https://outlook.office.com/mail/history-message-1',
  );

  const currentMemberHistory = await harness.get(
    `/api/emails/${mayaEmail.id}/conversation`,
    mayaCookie,
  );
  assert.equal(currentMemberHistory.status, 200);
  assert.equal(currentMemberHistory.headers['cache-control'], 'private, no-store');
  assert.equal(currentMemberHistory.body.conversation.messages[0].webUrl, null);

  const priyaId = harness.userId('priya@lexflow.local');
  harness.db.prepare(`
    UPDATE conversations SET current_assignee_id = ? WHERE id = ?
  `).run(priyaId, mayaEmail.conversation_id);
  const formerAssignee = await harness.get(
    `/api/emails/${mayaEmail.id}/conversation`,
    mayaCookie,
  );
  assert.equal(formerAssignee.status, 404);
  assert.equal(formerAssignee.headers['cache-control'], 'private, no-store');
  assert.match(formerAssignee.headers.vary, /Cookie/u);
  assert.equal(formerAssignee.body.error.code, 'conversation_not_found');

  const otherOrganization = await harness.post(
    '/api/registrations/admin',
    organizationRegistration({
      organizationName: 'Second Workspace',
      organizationDomain: 'second.example',
      email: 'admin@second.example',
    }),
  );
  assert.equal(otherOrganization.status, 201);
  const crossOrganization = await harness.get(
    `/api/emails/${mayaEmail.id}/conversation`,
    otherOrganization.cookie,
  );
  assert.equal(crossOrganization.status, 404);
  assert.equal(crossOrganization.headers['cache-control'], 'private, no-store');
  assert.equal(crossOrganization.body.error.code, 'conversation_not_found');

  historyService.invalidateConversation(Number(mayaEmail.conversation_id));
  providerFailure = new Error('Bearer provider-secret refresh_token=raw-secret');
  const unavailable = await harness.get(
    `/api/emails/${mayaEmail.id}/conversation`,
    adminCookie,
  );
  assert.equal(unavailable.status, 502);
  assert.equal(unavailable.headers['cache-control'], 'private, no-store');
  assert.deepEqual(unavailable.body, {
    error: {
      code: 'CONVERSATION_HISTORY_UNAVAILABLE',
      message: 'Conversation history is temporarily unavailable. Try again.',
    },
  });
  assert.doesNotMatch(JSON.stringify(unavailable.body), /provider-secret|raw-secret/u);
});

test('delivery API, bootstrap projection, and unknown retry remain tenant-safe', async context => {
  const deliveryRuns = [];
  const harness = await createApiHarness(context, {
    deliveryRunner: {
      runOne(deliveryId) {
        deliveryRuns.push(Number(deliveryId));
        return Promise.resolve();
      },
    },
  });
  const adminCookie = await harness.login('admin@lexflow.local', 'admin123');
  const mayaCookie = await harness.login('maya@lexflow.local', 'welcome123');
  const mayaId = harness.userId('maya@lexflow.local');
  harness.db.prepare('UPDATE users SET mailbox_provider = ? WHERE id = ?')
    .run('gmail', mayaId);
  const email = harness.emailAssignedTo('maya@lexflow.local');
  const delivery = one(harness.db, `
    SELECT * FROM assignment_deliveries
    WHERE conversation_id = ? AND recipient_id = ?
  `, email.conversation_id, mayaId);
  assert.ok(delivery);
  harness.db.prepare(`
    UPDATE assignment_deliveries
    SET status = 'accepted', block_reason = NULL, attempt_count = 2,
        accepted_at = '2026-08-26T09:10:00.000Z',
        provider_message_id = 'provider-accepted-id',
        updated_at = '2026-08-26T09:10:00.000Z'
    WHERE id = ?
  `).run(delivery.id);

  const adminBootstrap = await harness.get('/api/bootstrap', adminCookie);
  const memberBootstrap = await harness.get('/api/bootstrap', mayaCookie);
  assert.equal(adminBootstrap.headers['cache-control'], 'private, no-store');
  assert.match(adminBootstrap.headers.vary, /Cookie/u);
  const adminEmail = adminBootstrap.body.emails.find(item => item.id === email.id);
  const memberEmail = memberBootstrap.body.emails.find(item => item.id === email.id);
  assert.deepEqual(Object.keys(adminEmail.delivery).sort(), [
    'acceptedAt',
    'attemptCount',
    'blockReason',
    'error',
    'id',
    'status',
    'updatedAt',
  ]);
  assert.equal(adminEmail.delivery.status, 'accepted');
  assert.equal(adminEmail.delivery.attemptCount, 2);
  assert.equal('searchUrl' in adminEmail.delivery, false);
  assert.equal(memberEmail.webUrl, null);
  assert.equal(memberEmail.outlookUrl, null);
  const searchUrl = new URL(memberEmail.delivery.searchUrl);
  assert.equal(searchUrl.origin, 'https://mail.google.com');
  assert.equal(searchUrl.searchParams.get('authuser'), 'maya@lexflow.local');
  assert.match(decodeURIComponent(searchUrl.hash), /rfc822msgid:<lf-[a-f0-9]{32}@127\.0\.0\.1>/u);
  assert.doesNotMatch(
    JSON.stringify([adminEmail.delivery, memberEmail.delivery]),
    /digest_token|lease_token|provider_message_id|encrypted/u,
  );

  const adminDelivery = await harness.get(`/api/deliveries/${delivery.id}`, adminCookie);
  assert.equal(adminDelivery.status, 200);
  assert.equal(adminDelivery.headers['cache-control'], 'private, no-store');
  assert.equal(adminDelivery.body.delivery.id, Number(delivery.id));
  assert.equal((await harness.get(`/api/deliveries/${delivery.id}`, mayaCookie)).status, 404);
  assert.equal((await harness.post(
    `/api/deliveries/${delivery.id}/retry`,
    { duplicateRiskConfirmed: true },
    mayaCookie,
  )).status, 404);

  const otherOrganization = await harness.post(
    '/api/registrations/admin',
    organizationRegistration({
      organizationName: 'Delivery Isolation',
      organizationDomain: 'delivery.example',
      email: 'admin@delivery.example',
    }),
  );
  assert.equal((await harness.get(
    `/api/deliveries/${delivery.id}`,
    otherOrganization.cookie,
  )).status, 404);

  harness.db.prepare(`
    UPDATE assignment_deliveries
    SET status = 'unknown', accepted_at = NULL,
        last_error_code = 'delivery_outcome_unknown',
        last_error_summary = 'Delivery may have been accepted.',
        updated_at = '2026-08-26T09:15:00.000Z'
    WHERE id = ?
  `).run(delivery.id);
  const missingConfirmation = await harness.post(
    `/api/deliveries/${delivery.id}/retry`,
    {},
    adminCookie,
  );
  assert.equal(missingConfirmation.status, 400);
  assert.equal(
    missingConfirmation.body.error.fields.duplicateRiskConfirmed,
    'Confirm that retrying may send a duplicate assignment email.',
  );
  assert.equal((await harness.post(
    `/api/deliveries/${delivery.id}/retry`,
    { duplicateRiskConfirmed: false },
    adminCookie,
  )).status, 400);

  const retried = await harness.post(
    `/api/deliveries/${delivery.id}/retry`,
    { duplicateRiskConfirmed: true },
    adminCookie,
  );
  assert.equal(retried.status, 202);
  assert.equal(retried.body.delivery.status, 'pending');
  assert.equal(deliveryRuns.at(-1), Number(delivery.id));
  const persistedRetry = one(
    harness.db,
    'SELECT status, duplicate_risk_confirmed_at FROM assignment_deliveries WHERE id = ?',
    delivery.id,
  );
  assert.equal(persistedRetry.status, 'pending');
  assert.ok(persistedRetry.duplicate_risk_confirmed_at);
});

test('admin bootstrap preserves sanitized warning history for former-recipient deliveries', async context => {
  const harness = await createApiHarness(context);
  const adminCookie = await harness.login('admin@lexflow.local', 'admin123');
  const mayaCookie = await harness.login('maya@lexflow.local', 'welcome123');
  const priyaCookie = await harness.login('priya@lexflow.local', 'welcome123');
  const mayaId = harness.userId('maya@lexflow.local');
  const priyaId = harness.userId('priya@lexflow.local');
  const email = harness.emailAssignedTo('maya@lexflow.local');
  const delivery = one(harness.db, `
    SELECT * FROM assignment_deliveries
    WHERE conversation_id = ? AND recipient_id = ?
  `, email.conversation_id, mayaId);
  const acceptedAt = '2026-08-26T09:10:00.000Z';
  harness.db.prepare(`
    UPDATE assignment_deliveries
    SET status = 'accepted', request_started_at = ?, accepted_at = ?, updated_at = ?
    WHERE id = ?
  `).run(acceptedAt, acceptedAt, acceptedAt, delivery.id);
  harness.db.prepare(`
    UPDATE conversations
    SET current_assignee_id = ?, completion_state = 'assigned', version = version + 1
    WHERE organization_id = 1 AND id = ?
  `).run(priyaId, email.conversation_id);

  const adminBootstrap = await harness.get('/api/bootstrap', adminCookie);
  const adminEmail = adminBootstrap.body.emails.find(item => item.id === email.id);
  const former = adminEmail.deliveryHistory.find(item => item.id === Number(delivery.id));
  assert.equal(adminEmail.delivery, null);
  assert.deepEqual(former, {
    id: Number(delivery.id),
    recipient: {
      id: mayaId,
      name: 'Maya Shah',
      email: 'maya@lexflow.local',
    },
    status: 'accepted',
    acceptedAt,
    updatedAt: acceptedAt,
    externalized: true,
    currentRecipient: false,
  });
  assert.doesNotMatch(
    JSON.stringify(adminEmail.deliveryHistory),
    /digest_token|message_id|lease_token|provider_message_id|encrypted/u,
  );

  const formerBootstrap = await harness.get('/api/bootstrap', mayaCookie);
  assert.equal(formerBootstrap.body.emails.some(item => item.id === email.id), false);
  const currentBootstrap = await harness.get('/api/bootstrap', priyaCookie);
  const currentEmail = currentBootstrap.body.emails.find(item => item.id === email.id);
  assert.ok(currentEmail);
  assert.equal('deliveryHistory' in currentEmail, false);
});

test('configured app origin reaches manual and rule assignment digests', async context => {
  const appBaseUrl = 'https://flow.lexflow.test';
  const runnerPromises = [];
  const captured = [];
  let runner;
  const deliveryRunner = {
    runOne(deliveryId) {
      const promise = runner.runOne(deliveryId);
      runnerPromises.push(promise);
      return promise;
    },
    run() {
      const promise = runner.run();
      runnerPromises.push(promise);
      return promise;
    },
  };
  const harness = await createApiHarness(context, {
    includeUnassigned: true,
    appBaseUrl,
    deliveryRunner,
  });
  const login = await harness.post('/api/login', {
    email: 'admin@lexflow.local',
    password: 'admin123',
  });
  assert.equal(login.status, 200);
  assert.match(login.headers['set-cookie'], /; Secure(?:;|$)/u);
  const adminCookie = login.cookie;
  const connection = connectOutlookMailbox(harness.db);
  const general = one(
    harness.db,
    'SELECT * FROM emails WHERE provider_id = ?',
    generalMessage.providerId,
  );
  bindNativeSource(harness.db, general, connection, 'native-manual-origin');

  runner = createDeliveryRunner({
    db: harness.db,
    trustedAppOrigin: appBaseUrl,
    resolveCurrentContext({ db, delivery }) {
      return resolveCurrentDeliveryContext({ db, delivery });
    },
    resolveSender() {
      return {
        async send(payload) {
          captured.push(payload);
          return {
            accepted: true,
            providerMessageId: `accepted-${captured.length}`,
          };
        },
      };
    },
    clock: () => new Date('2030-08-26T09:30:00.000Z'),
  });

  const manualAssignment = await harness.post(
    `/api/emails/${general.id}/assign`,
    { assigneeId: harness.userId('maya@lexflow.local') },
    adminCookie,
  );
  assert.equal(manualAssignment.status, 200);
  await Promise.all(runnerPromises.splice(0));
  const manualDelivery = one(harness.db, `
    SELECT assignment_deliveries.*, conversations.public_id
    FROM assignment_deliveries
    JOIN conversations ON conversations.id = assignment_deliveries.conversation_id
    WHERE assignment_deliveries.conversation_id = ?
      AND assignment_deliveries.recipient_id = ?
  `, general.conversation_id, harness.userId('maya@lexflow.local'));
  assert.equal(manualDelivery.status, 'accepted');
  assert.match(manualDelivery.message_id, /^<lf-[a-f0-9]{32}@flow\.lexflow\.test>$/u);
  assert.match(captured[0].rawMime, new RegExp(
    `Open securely in LexFlow: ${appBaseUrl.replaceAll('.', '\\.')}/\\?conversation=${manualDelivery.public_id}`,
    'u',
  ));
  assert.match(captured[0].rawMime, new RegExp(`Message-ID: ${manualDelivery.message_id}`, 'u'));

  await syncMailbox({
    db: harness.db,
    source: {
      organizationId: 1,
      connectionId: connection.id,
      mailboxIdentityId: connection.mailboxIdentityId,
      provider: 'outlook',
      mailboxAddress: connection.mailboxAddress,
      cursorKey: 'mail_cursor:origin-rule-fixture',
      async fetchChanges() {
        return {
          messages: [{
            providerId: 'origin-rule-message',
            nativeConversationId: 'native-rule-origin',
            subject: 'Origin rule marker request',
            senderName: 'Rule Sender',
            senderAddress: 'rule-sender@example.test',
            preview: 'origin-rule-marker',
            receivedAt: '2026-08-26T09:31:00.000Z',
            webUrl: 'https://outlook.office.com/mail/origin-rule-message',
          }],
          nextCursor: 'origin-rule-cursor',
        };
      },
    },
    trustedAppOrigin: appBaseUrl,
  });
  const ruleEmail = one(
    harness.db,
    'SELECT * FROM emails WHERE provider_id = ?',
    'origin-rule-message',
  );
  assert.equal(ruleEmail.status, 'unassigned');
  const createdRule = await harness.post('/api/rules', {
    name: 'Origin host rule',
    keywords: 'origin-rule-marker',
    senderFilter: '',
    assigneeId: harness.userId('priya@lexflow.local'),
    priority: 15,
  }, adminCookie);
  assert.equal(createdRule.status, 201);
  await Promise.all(runnerPromises.splice(0));
  const ruleDelivery = one(harness.db, `
    SELECT assignment_deliveries.*, conversations.public_id
    FROM assignment_deliveries
    JOIN conversations ON conversations.id = assignment_deliveries.conversation_id
    WHERE assignment_deliveries.conversation_id = ?
      AND assignment_deliveries.recipient_id = ?
  `, ruleEmail.conversation_id, harness.userId('priya@lexflow.local'));
  assert.equal(ruleDelivery.status, 'accepted');
  assert.match(ruleDelivery.message_id, /^<lf-[a-f0-9]{32}@flow\.lexflow\.test>$/u);
  const ruleSend = captured.find(item => Number(item.delivery.id) === Number(ruleDelivery.id));
  assert.ok(ruleSend);
  assert.match(ruleSend.rawMime, new RegExp(
    `Open securely in LexFlow: ${appBaseUrl.replaceAll('.', '\\.')}/\\?conversation=${ruleDelivery.public_id}`,
    'u',
  ));
  assert.match(ruleSend.rawMime, new RegExp(`Message-ID: ${ruleDelivery.message_id}`, 'u'));
});
