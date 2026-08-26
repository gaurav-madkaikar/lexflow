import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import {
  ConversationHistoryError,
  createConversationHistoryService,
} from '../src/conversation-history.js';
import { normalizeMessagePreview } from '../src/message-preview.js';

function historyDatabase(context) {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      registration_status TEXT NOT NULL
    );
    CREATE TABLE conversations (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      current_assignee_id INTEGER,
      subject TEXT NOT NULL,
      version INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE emails (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      conversation_id INTEGER,
      provider_id TEXT NOT NULL,
      preview TEXT NOT NULL,
      status TEXT NOT NULL
    );
    CREATE TABLE conversation_sources (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      conversation_id INTEGER NOT NULL,
      mailbox_identity_id INTEGER,
      last_resolved_connection_id INTEGER,
      provider TEXT NOT NULL,
      normalized_mailbox TEXT NOT NULL,
      native_conversation_id TEXT,
      fallback_key TEXT
    );
    CREATE TABLE assignment_deliveries (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      conversation_id INTEGER NOT NULL,
      message_id TEXT NOT NULL
    );
    CREATE TABLE notifications (id INTEGER PRIMARY KEY, marker TEXT);
    CREATE TABLE activity (id INTEGER PRIMARY KEY, marker TEXT);
    CREATE TABLE alert_deliveries (id INTEGER PRIMARY KEY, marker TEXT);
    CREATE TABLE sync_state (id INTEGER PRIMARY KEY, marker TEXT);

    INSERT INTO users VALUES
      (1, 1, 'admin@northstar.test', 'Admin', 'admin', 'active'),
      (2, 1, 'maya@northstar.test', 'Maya', 'member', 'active'),
      (3, 1, 'priya@northstar.test', 'Priya', 'member', 'active'),
      (4, 2, 'admin@other.test', 'Other Admin', 'admin', 'active');
    INSERT INTO conversations VALUES
      (10, 1, 2, 'Acme renewal', 1, '2026-08-26T10:00:00.000Z'),
      (20, 2, NULL, 'Other tenant', 1, '2026-08-26T10:00:00.000Z');
    INSERT INTO emails VALUES
      (100, 1, 10, 'gmail-message-1', 'Local anchor', 'assigned'),
      (200, 2, 20, 'gmail-message-1', 'Other anchor', 'unassigned');
    INSERT INTO conversation_sources VALUES
      (1000, 1, 10, 50, 60, 'gmail', 'admin@northstar.test', 'gmail-thread-10', NULL),
      (2000, 2, 20, 50, 60, 'gmail', 'admin@other.test', 'gmail-thread-10', NULL);
    INSERT INTO assignment_deliveries VALUES
      (1, 1, 10, '<lf-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@lexflow.test>');
    INSERT INTO notifications VALUES (1, 'unchanged');
    INSERT INTO activity VALUES (1, 'unchanged');
    INSERT INTO alert_deliveries VALUES (1, 'unchanged');
    INSERT INTO sync_state VALUES (1, 'unchanged');
  `);
  context.after(() => db.close());
  return db;
}

function connection(overrides = {}) {
  return {
    id: 60,
    organizationId: 1,
    mailboxIdentityId: 50,
    provider: 'gmail',
    mailboxAddress: 'admin@northstar.test',
    generation: 4,
    active: true,
    capabilities: ['read', 'send'],
    ...overrides,
  };
}

function providerMessage(overrides = {}) {
  return {
    providerMessageId: 'provider-1',
    internetMessageId: '<provider-1@example.test>',
    direction: 'received',
    sender: { name: 'Acme Support', address: 'support@acme.test' },
    occurredAt: '2026-08-26T08:00:00.000Z',
    preview: 'Please review the renewal.',
    webUrl: 'https://mail.example.test/message/provider-1',
    ...overrides,
  };
}

function harness(context, {
  fetchConversation = mock.fn(async () => ({ messages: [providerMessage()], truncated: false })),
  resolveConnection,
  loadProvider,
  clock,
  ttlMs,
} = {}) {
  const db = historyDatabase(context);
  const connections = new Map([
    ['1:50', connection()],
    ['2:50', connection({
      organizationId: 2,
      mailboxAddress: 'admin@other.test',
    })],
  ]);
  const resolver = resolveConnection ?? (({ organizationId, mailboxIdentityId }) => (
    connections.get(`${organizationId}:${mailboxIdentityId}`) ?? null
  ));
  const loader = loadProvider ?? (() => ({ fetchConversation }));
  return {
    db,
    connections,
    fetchConversation,
    service: createConversationHistoryService({
      db,
      resolveMailboxConnection: resolver,
      loadProvider: loader,
      clock,
      ttlMs,
    }),
  };
}

test('preview normalization decodes entities, normalizes Unicode, and removes unsafe controls', () => {
  assert.deepEqual(normalizeMessagePreview('Ａ&amp;B\u200b\n\tC\u0000\ud800'), {
    preview: 'A&B C�',
    truncated: false,
  });
  assert.deepEqual(normalizeMessagePreview('&#x1F44B;&nbsp; hello'), {
    preview: '👋 hello',
    truncated: false,
  });
  assert.deepEqual(normalizeMessagePreview(null), { preview: '', truncated: false });
});

test('preview truncation observes the Unicode bound and nearest word boundary', () => {
  const result = normalizeMessagePreview(`${'word '.repeat(90)}tail`, 40);
  assert.equal([...result.preview].length <= 40, true);
  assert.equal(result.preview, 'word word word word word word word…');
  assert.equal(result.truncated, true);
  assert.deepEqual(normalizeMessagePreview('👩🏽‍⚖️'.repeat(20), 8), {
    preview: '👩🏽⚖️👩🏽⚖…',
    truncated: true,
  });
});

test('same-organization admins and the current assignee are authorized without client provider IDs', async context => {
  const { service, fetchConversation } = harness(context);
  const member = await service.getForEmail({ emailId: 100, userId: 2 });
  const admin = await service.getForEmail({ emailId: 100, userId: 1 });

  assert.equal(member.conversation.subject, 'Acme renewal');
  assert.equal(member.conversation.messages[0].webUrl, null);
  assert.equal(admin.conversation.messages[0].webUrl, 'https://mail.example.test/message/provider-1');
  assert.equal(fetchConversation.mock.callCount(), 1);
  assert.deepEqual(fetchConversation.mock.calls[0].arguments[0], {
    nativeConversationId: 'gmail-thread-10',
    deliveryMessageIds: ['<lf-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@lexflow.test>'],
    signal: undefined,
  });

  await assert.rejects(
    service.getForEmail({ emailId: 100, userId: 3 }),
    error => error instanceof ConversationHistoryError && error.status === 404,
  );
  await assert.rejects(
    service.getForEmail({ emailId: 100, userId: 4 }),
    error => error instanceof ConversationHistoryError && error.status === 404,
  );
});

test('coalesces one provider request while reauthorizing each caller after await', async context => {
  let release;
  const deferred = new Promise(resolve => { release = resolve; });
  const fetchConversation = mock.fn(() => deferred);
  const { service } = harness(context, { fetchConversation });

  const first = service.getForEmail({ emailId: 100, userId: 2 });
  const second = service.getForEmail({ emailId: 100, userId: 2 });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fetchConversation.mock.callCount(), 1);
  release({ messages: [providerMessage()], truncated: false });
  assert.deepEqual(await first, await second);
});

test('reassignment during a provider fetch hides the result from the former assignee', async context => {
  let release;
  const deferred = new Promise(resolve => { release = resolve; });
  const { db, service } = harness(context, {
    fetchConversation: mock.fn(() => deferred),
  });
  const pending = service.getForEmail({ emailId: 100, userId: 2 });
  await new Promise(resolve => setImmediate(resolve));
  db.prepare(`
    UPDATE conversations
    SET current_assignee_id = 3, version = version + 1,
        updated_at = '2026-08-26T10:01:00.000Z'
    WHERE id = 10
  `).run();
  release({ messages: [providerMessage()], truncated: false });

  await assert.rejects(pending, error => error.status === 404);
});

test('connection replacement during a provider fetch rejects stale history', async context => {
  let release;
  const deferred = new Promise(resolve => { release = resolve; });
  const { connections, service } = harness(context, {
    fetchConversation: mock.fn(() => deferred),
  });
  const pending = service.getForEmail({ emailId: 100, userId: 1 });
  await new Promise(resolve => setImmediate(resolve));
  connections.set('1:50', connection({ generation: 5 }));
  release({ messages: [providerMessage()], truncated: false });

  await assert.rejects(pending, error => error.status === 410);
});

test('merges scoped sources, excludes assignment digests, dedupes, and keeps the chronological latest 100', async context => {
  const messages = Array.from({ length: 105 }, (_, index) => providerMessage({
    providerMessageId: `gmail-${String(index).padStart(3, '0')}`,
    internetMessageId: `<gmail-${index}@example.test>`,
    occurredAt: new Date(Date.UTC(2026, 7, 26, 0, index)).toISOString(),
    preview: `Message&nbsp;${index}\u200b`,
  }));
  messages.push(providerMessage({
    providerMessageId: 'digest',
    internetMessageId: '<lf-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@lexflow.test>',
  }));
  messages.push(messages[104]);
  const { db, service } = harness(context, {
    fetchConversation: mock.fn(async ({ nativeConversationId }) => ({
      messages: nativeConversationId === 'gmail-thread-10' ? messages : [providerMessage({
        providerMessageId: 'outlook-1',
        internetMessageId: '<outlook-1@example.test>',
        direction: 'sent',
        sender: { name: 'Admin', address: 'admin@northstar.test' },
        occurredAt: '2026-08-26T01:30:00.000Z',
        preview: 'Sent update',
      })],
      truncated: nativeConversationId === 'gmail-thread-10',
    })),
    resolveConnection: ({ organizationId, mailboxIdentityId }) => (
      mailboxIdentityId === 51
        ? connection({
            id: 61,
            mailboxIdentityId: 51,
            provider: 'outlook',
            mailboxAddress: 'admin@northstar.test',
          })
        : connection({ organizationId, mailboxIdentityId })
    ),
  });
  db.prepare(`
    INSERT INTO conversation_sources VALUES
      (1001, 1, 10, 51, 61, 'outlook', 'admin@northstar.test', 'outlook-thread-10', NULL)
  `).run();

  const result = await service.getForEmail({ emailId: 100, userId: 1 });
  const timeline = result.conversation.messages;
  assert.equal(timeline.length, 100);
  assert.equal(result.conversation.truncated, true);
  assert.equal(timeline.some(item => item.id === 'digest'), false);
  assert.equal(timeline.filter(item => item.id === 'gmail-104').length, 1);
  assert.equal(timeline[0].occurredAt, '2026-08-26T00:06:00.000Z');
  assert.equal(timeline.at(-1).occurredAt, '2026-08-26T01:44:00.000Z');
  assert.equal(timeline.at(-1).preview, 'Message 104');
  const sent = timeline.find(item => item.id === 'outlook-1');
  assert.equal(sent.direction, 'sent');
  assert.deepEqual(sent.sender, { name: 'Admin', address: 'admin@northstar.test' });
  assert.equal(sent.mailboxAddress, 'admin@northstar.test');
});

test('cache is tenant-safe, expires after 30 seconds, and conversation version changes miss immediately', async context => {
  let now = new Date('2026-08-26T10:00:00.000Z');
  const { db, service, fetchConversation } = harness(context, { clock: () => now });

  await service.getForEmail({ emailId: 100, userId: 1 });
  await service.getForEmail({ emailId: 100, userId: 1 });
  assert.equal(fetchConversation.mock.callCount(), 1);
  now = new Date('2026-08-26T10:00:29.999Z');
  await service.getForEmail({ emailId: 100, userId: 1 });
  assert.equal(fetchConversation.mock.callCount(), 1);
  now = new Date('2026-08-26T10:00:30.001Z');
  await service.getForEmail({ emailId: 100, userId: 1 });
  assert.equal(fetchConversation.mock.callCount(), 2);

  db.prepare('UPDATE conversations SET version = 2 WHERE id = 10').run();
  await service.getForEmail({ emailId: 100, userId: 1 });
  assert.equal(fetchConversation.mock.callCount(), 3);
  assert.deepEqual(service.invalidateConversation(10, 2), { invalidated: 1, version: 2 });
  await service.getForEmail({ emailId: 100, userId: 1 });
  assert.equal(fetchConversation.mock.callCount(), 4);
  await service.getForEmail({ emailId: 200, userId: 4 });
  assert.equal(fetchConversation.mock.callCount(), 5);
});

test('overlapping conversation versions never coalesce or overwrite newer history', async context => {
  const pending = [];
  const fetchConversation = mock.fn(() => new Promise(resolve => pending.push(resolve)));
  const { db, service } = harness(context, { fetchConversation });

  const versionOne = service.getForEmail({ emailId: 100, userId: 1 });
  await new Promise(resolve => setImmediate(resolve));
  db.prepare(`
    UPDATE conversations
    SET version = 2, updated_at = '2026-08-26T10:01:00.000Z'
    WHERE id = 10
  `).run();
  const versionTwo = service.getForEmail({ emailId: 100, userId: 1 });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fetchConversation.mock.callCount(), 2);

  pending[1]({
    messages: [providerMessage({ providerMessageId: 'version-2', preview: 'Newest reply' })],
    truncated: false,
  });
  assert.equal((await versionTwo).conversation.messages[0].id, 'version-2');
  pending[0]({
    messages: [providerMessage({ providerMessageId: 'version-1', preview: 'Older history' })],
    truncated: false,
  });
  await assert.rejects(versionOne, error => error.status === 410);

  const cachedVersionTwo = await service.getForEmail({ emailId: 100, userId: 1 });
  assert.equal(cachedVersionTwo.conversation.messages[0].id, 'version-2');
  assert.equal(fetchConversation.mock.callCount(), 2);
});

test('history retrieval is a pure database read', async context => {
  const { db, service } = harness(context);
  const tables = [
    'emails', 'conversations', 'notifications', 'activity',
    'alert_deliveries', 'sync_state', 'assignment_deliveries',
  ];
  const snapshot = () => Object.fromEntries(tables.map(table => [
    table,
    db.prepare(`SELECT * FROM ${table} ORDER BY id`).all(),
  ]));
  const before = snapshot();
  await service.getForEmail({ emailId: 100, userId: 2 });
  assert.deepEqual(snapshot(), before);
});

test('provider failures and unavailable native sources fail with sanitized errors', async context => {
  const { db, service } = harness(context, {
    fetchConversation: mock.fn(async () => {
      throw new Error('Bearer SECRET for maya@northstar.test');
    }),
  });
  await assert.rejects(
    service.getForEmail({ emailId: 100, userId: 1 }),
    error => error.status === 502
      && !/SECRET|maya@northstar\.test/.test(`${error.message} ${JSON.stringify(error)}`),
  );

  db.prepare('DELETE FROM conversation_sources WHERE conversation_id = 10').run();
  await assert.rejects(
    service.getForEmail({ emailId: 100, userId: 1 }),
    error => error.status === 410,
  );
});
