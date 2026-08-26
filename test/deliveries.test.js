import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import {
  buildAssignmentDigest,
  createDigestToken,
  normalizeMessagePreview,
} from '../src/assignment-digest.js';
import {
  cancelFormerRecipientDeliveries,
  claimPendingDelivery,
  createDeliveryRunner,
  ensureAssignmentDelivery,
  migrateDeliverySchema,
  refreshBlockedDeliveries,
  recoverExpiredDeliveryLeases,
  retryUnknownDelivery,
} from '../src/deliveries.js';
import {
  DeliverySendError,
  createProviderDeliverySender,
} from '../src/delivery-senders.js';

const ORIGIN = 'https://lexflow.example.test';
const BASE_NOW = new Date('2026-08-26T10:00:00.000Z');

function createDeliveryDb(context) {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`
    CREATE TABLE organizations (id INTEGER PRIMARY KEY);
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      UNIQUE (organization_id, id)
    );
    CREATE TABLE conversations (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      current_assignee_id INTEGER,
      UNIQUE (organization_id, id)
    );
    CREATE TABLE mailbox_identities (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      UNIQUE (organization_id, id)
    );
    CREATE TABLE mailbox_connections (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      mailbox_identity_id INTEGER NOT NULL,
      UNIQUE (organization_id, id),
      UNIQUE (organization_id, id, mailbox_identity_id)
    );
    INSERT INTO organizations (id) VALUES (2), (3);
    INSERT INTO users (id, organization_id) VALUES (7, 2), (8, 2), (9, 3);
    INSERT INTO conversations (id, organization_id, current_assignee_id)
      VALUES (42, 2, 7), (43, 2, 7), (44, 3, 9);
    INSERT INTO mailbox_identities (id, organization_id) VALUES (10, 2), (20, 3);
    INSERT INTO mailbox_connections (id, organization_id, mailbox_identity_id)
      VALUES (11, 2, 10), (21, 3, 20);
  `);
  migrateDeliverySchema(db);
  context.after(() => db.close());
  return db;
}

function deliveryContext(overrides = {}) {
  return {
    currentAssigneeId: 7,
    mailboxIdentityId: 10,
    connectionId: 11,
    connectionGeneration: 3,
    connectionActive: true,
    provider: 'gmail',
    mailboxAddress: 'admin@example.test',
    nativeConversationId: 'gmail-thread-42',
    sendCapable: true,
    organizationName: 'Northstar Legal',
    recipientName: 'Maya Singh',
    recipientEmail: 'maya@example.test',
    conversationPublicId: 'cv_0123456789abcdef',
    conversationSubject: 'Acme renewal',
    previews: [
      {
        receivedAt: '2026-08-26T08:00:00.000Z',
        senderName: 'Acme',
        senderAddress: 'acme@example.test',
        preview: 'Please review the renewal.',
      },
    ],
    ...overrides,
  };
}

function addDelivery(db, overrides = {}) {
  const conversationId = overrides.conversationId ?? 42;
  const context = overrides.context ?? deliveryContext({
    nativeConversationId: `gmail-thread-${conversationId}`,
  });
  return ensureAssignmentDelivery({
    db,
    organizationId: 2,
    conversationId,
    recipientId: 7,
    trustedAppOrigin: ORIGIN,
    now: BASE_NOW,
    context,
    ...overrides,
  });
}

function row(db, deliveryId) {
  return db.prepare('SELECT * FROM assignment_deliveries WHERE id = ?').get(deliveryId);
}

test('digest uses one deterministic Message-ID and a bounded chronological plain-text preview', () => {
  const token = createDigestToken(() => Buffer.alloc(16, 0xab));
  assert.equal(token, 'abababababababababababababababab');
  const normalizedPreview = normalizeMessagePreview(`  hello\r\nworld\u0000 ${'x'.repeat(400)}`);
  assert.ok(normalizedPreview.length <= 320);
  assert.equal(normalizedPreview, 'hello world…');

  const previews = Array.from({ length: 105 }, (_, index) => ({
    receivedAt: new Date(Date.UTC(2026, 7, 26, 0, index)).toISOString(),
    senderName: `Sender ${index}`,
    senderAddress: `sender-${index}@example.test`,
    preview: `${index} ${'p'.repeat(500)}`,
  })).reverse();
  const digest = buildAssignmentDigest({
    digestToken: token,
    trustedAppOrigin: ORIGIN,
    createdAt: BASE_NOW,
    organizationName: 'Northstar\r\nBcc: attacker@example.test',
    mailboxAddress: 'admin@example.test',
    recipientName: 'Maya',
    recipientEmail: 'maya@example.test',
    conversationId: 42,
    conversationPublicId: 'cv_0123456789abcdef',
    subject: 'Renewal\r\nBcc: attacker@example.test',
    previews,
  });

  assert.equal(digest.messageId, `<lf-${token}@lexflow.example.test>`);
  assert.match(digest.rawMime, /Message-ID: <lf-abab.+@lexflow\.example\.test>\r\n/);
  assert.match(digest.rawMime, /https:\/\/lexflow\.example\.test\/?\?conversation=cv_0123456789abcdef/);
  assert.doesNotMatch(digest.rawMime, /^Bcc:/m);
  assert.doesNotMatch(digest.rawMime, /attacker@example\.test/);
  assert.doesNotMatch(digest.rawMime, /javascript:|remote-content\.test/i);
  assert.equal(digest.previews.length, 100);
  assert.equal(digest.previews[0].senderName, 'Sender 5');
  assert.equal(digest.previews.at(-1).senderName, 'Sender 104');
  assert.ok(digest.previews.every(preview => preview.preview.length <= 320));
  assert.equal(digest.rawMime.replaceAll('\r\n', '').includes('\n'), false);
});

test('assignment records one pending delivery without provider I/O and duplicate assignment reuses it', context => {
  const db = createDeliveryDb(context);
  const sendAssignmentDigest = mock.fn();

  const first = addDelivery(db);
  const second = addDelivery(db);

  assert.equal(first.id, second.id);
  assert.equal(first.status, 'pending');
  assert.equal(sendAssignmentDigest.mock.callCount(), 0);
  assert.equal(db.prepare('SELECT count(*) AS count FROM assignment_deliveries').get().count, 1);
});

test('a newly connected send-capable mailbox promotes blocked assignments before delivery', async context => {
  const db = createDeliveryDb(context);
  const blocked = addDelivery(db, {
    trustedAppOrigin: 'http://127.0.0.1:3000',
    context: deliveryContext({
      mailboxIdentityId: null,
      connectionId: null,
      connectionGeneration: null,
      connectionActive: false,
      sendCapable: false,
    }),
  });
  assert.equal(blocked.status, 'blocked');

  const refreshed = refreshBlockedDeliveries({
    db,
    organizationId: 2,
    trustedAppOrigin: ORIGIN,
    resolveDeliveryContext: () => deliveryContext(),
    now: BASE_NOW,
  });

  assert.deepEqual(refreshed, { checked: 1, promoted: 1 });
  const pending = row(db, blocked.id);
  assert.equal(pending.status, 'pending');
  assert.equal(pending.block_reason, null);
  assert.match(pending.message_id, /@lexflow\.example\.test>$/u);

  const sendAssignmentDigest = mock.fn(async () => ({ providerMessageId: 'gmail-sent-1' }));
  const runner = createDeliveryRunner({
    db,
    trustedAppOrigin: ORIGIN,
    resolveCurrentContext: () => deliveryContext(),
    resolveSender: () => ({ capabilities: { send: true }, sendAssignmentDigest }),
    clock: () => BASE_NOW,
  });
  await runner.run();
  assert.equal(row(db, blocked.id).status, 'accepted');
  assert.equal(sendAssignmentDigest.mock.callCount(), 1);
});

test('provider preparation failures stay recoverable and send after reconnect', async context => {
  const db = createDeliveryDb(context);
  const created = addDelivery(db);
  const firstRunner = createDeliveryRunner({
    db,
    trustedAppOrigin: ORIGIN,
    resolveCurrentContext: () => deliveryContext(),
    resolveSender: async () => {
      throw new Error('stored provider grant is temporarily unavailable');
    },
    clock: () => BASE_NOW,
  });

  const blocked = await firstRunner.runOne(created.id);
  assert.equal(blocked.status, 'blocked');
  assert.equal(row(db, created.id).request_started_at, null);

  const sendAssignmentDigest = mock.fn(async () => ({ providerMessageId: 'gmail-after-reconnect' }));
  const reconnectedRunner = createDeliveryRunner({
    db,
    trustedAppOrigin: ORIGIN,
    resolveCurrentContext: () => deliveryContext({ connectionGeneration: 4 }),
    resolveSender: () => ({ capabilities: { send: true }, sendAssignmentDigest }),
    clock: () => new Date('2026-08-26T10:01:00.000Z'),
  });
  const summary = await reconnectedRunner.run();

  assert.equal(summary.accepted, 1);
  assert.equal(row(db, created.id).status, 'accepted');
  assert.equal(row(db, created.id).connection_generation, 4);
  assert.equal(sendAssignmentDigest.mock.callCount(), 1);
});

test('delivery foreign keys reject a recipient or connection from another organization', context => {
  const db = createDeliveryDb(context);
  assert.throws(() => addDelivery(db, {
    recipientId: 9,
    context: deliveryContext({ currentAssigneeId: 9 }),
  }), /foreign key constraint failed/i);
  assert.throws(() => addDelivery(db, {
    context: deliveryContext({ mailboxIdentityId: 20, connectionId: 21 }),
  }), /foreign key constraint failed/i);
  assert.equal(db.prepare('SELECT count(*) AS count FROM assignment_deliveries').get().count, 0);
});

test('reassignment before request start cancels a stale lease and sends nothing', async context => {
  const db = createDeliveryDb(context);
  const created = addDelivery(db);
  const claim = claimPendingDelivery({ db, now: BASE_NOW });
  const send = mock.fn();
  const current = deliveryContext({ currentAssigneeId: 8 });

  assert.equal(claim.id, created.id);
  assert.equal(cancelFormerRecipientDeliveries({
    db,
    organizationId: 2,
    conversationId: 42,
    currentRecipientId: 8,
    now: new Date('2026-08-26T10:00:01.000Z'),
  }).cancelled, 1);

  const runner = createDeliveryRunner({
    db,
    trustedAppOrigin: ORIGIN,
    resolveCurrentContext: () => current,
    resolveSender: () => ({ send }),
    clock: () => new Date('2026-08-26T10:00:02.000Z'),
  });
  const result = await runner.runOne(created.id);

  assert.equal(result.status, 'cancelled');
  assert.equal(send.mock.callCount(), 0);
});

test('runner accepts a provider response once and coalesces overlapping drains', async context => {
  const db = createDeliveryDb(context);
  const created = addDelivery(db);
  let release;
  const deferred = new Promise(resolve => { release = resolve; });
  const send = mock.fn(async () => {
    await deferred;
    return { accepted: true, providerMessageId: 'gmail-message-1' };
  });
  const runner = createDeliveryRunner({
    db,
    trustedAppOrigin: ORIGIN,
    resolveCurrentContext: () => deliveryContext(),
    resolveSender: () => ({ send }),
    clock: () => BASE_NOW,
  });

  const first = runner.run();
  const second = runner.run();
  assert.equal(first, second);
  await new Promise(resolve => setImmediate(resolve));
  release();
  assert.deepEqual(await first, { accepted: 1, blocked: 0, cancelled: 0, failed: 0, unknown: 0 });
  assert.equal(send.mock.callCount(), 1);
  assert.equal(row(db, created.id).status, 'accepted');
  assert.equal(row(db, created.id).provider_message_id, 'gmail-message-1');
});

test('known rejected requests retry safely while ambiguous requests become unknown', async context => {
  const db = createDeliveryDb(context);
  const safe = addDelivery(db, { conversationId: 42 });
  const ambiguous = addDelivery(db, { conversationId: 43 });
  let calls = 0;
  const runner = createDeliveryRunner({
    db,
    trustedAppOrigin: ORIGIN,
    resolveCurrentContext: ({ delivery }) => deliveryContext({
      nativeConversationId: `gmail-thread-${delivery.conversation_id}`,
    }),
    resolveSender: () => ({
      async send() {
        calls += 1;
        if (calls === 1) {
          throw new DeliverySendError('Provider is busy.', {
            code: 'provider_busy', retryable: true, ambiguous: false,
          });
        }
        throw new Error('request failed with bearer SECRET and maya@example.test');
      },
    }),
    retryDelay: () => 60_000,
    clock: () => BASE_NOW,
  });

  assert.equal((await runner.runOne(safe.id)).status, 'pending');
  assert.equal(row(db, safe.id).next_attempt_at, '2026-08-26T10:01:00.000Z');
  assert.equal((await runner.runOne(ambiguous.id)).status, 'unknown');
  const ambiguousRow = row(db, ambiguous.id);
  assert.equal(ambiguousRow.last_error_code, 'delivery_outcome_unknown');
  assert.equal(ambiguousRow.last_error_summary, 'The provider response was not received; delivery may have been accepted.');
  assert.doesNotMatch(JSON.stringify(ambiguousRow), /SECRET|maya@example\.test/);
});

test('expired leases recover based on whether provider I/O started', context => {
  const db = createDeliveryDb(context);
  const unstarted = addDelivery(db, { conversationId: 42 });
  const started = addDelivery(db, { conversationId: 43 });
  const first = claimPendingDelivery({
    db, deliveryId: unstarted.id, now: BASE_NOW, leaseMs: 1_000,
  });
  const second = claimPendingDelivery({
    db, deliveryId: started.id, now: BASE_NOW, leaseMs: 1_000,
  });
  db.prepare(`
    UPDATE assignment_deliveries SET request_started_at = ? WHERE id = ?
  `).run(BASE_NOW.toISOString(), second.id);
  db.prepare(`
    UPDATE assignment_delivery_attempts SET status = 'started', request_started_at = ?
    WHERE delivery_id = ? AND lease_token = ?
  `).run(BASE_NOW.toISOString(), second.id, second.lease_token);

  assert.deepEqual(recoverExpiredDeliveryLeases({
    db, now: new Date('2026-08-26T10:00:02.000Z'),
  }), { requeued: 1, unknown: 1 });
  assert.equal(row(db, unstarted.id).status, 'pending');
  assert.equal(row(db, started.id).status, 'unknown');
  assert.equal(first.status, 'leased');
});

test('startup recovery reconciles a started Gmail attempt by deterministic Message-ID without resending', async context => {
  const db = createDeliveryDb(context);
  const created = addDelivery(db);
  const claim = claimPendingDelivery({ db, now: BASE_NOW, leaseMs: 1_000 });
  db.prepare(`
    UPDATE assignment_deliveries SET request_started_at = ? WHERE id = ?
  `).run(BASE_NOW.toISOString(), claim.id);
  db.prepare(`
    UPDATE assignment_delivery_attempts SET status = 'started', request_started_at = ?
    WHERE delivery_id = ? AND lease_token = ?
  `).run(BASE_NOW.toISOString(), claim.id, claim.lease_token);
  const sendAssignmentDigest = mock.fn();
  const reconcileMessageId = mock.fn(async ({ internetMessageId }) => ({
    found: internetMessageId === created.message_id,
    providerMessageId: 'gmail-reconciled-1',
  }));
  const runner = createDeliveryRunner({
    db,
    trustedAppOrigin: ORIGIN,
    resolveCurrentContext: () => deliveryContext(),
    resolveSender: () => ({
      capabilities: { read: true, send: true },
      sendAssignmentDigest,
      reconcileMessageId,
    }),
    clock: () => new Date('2026-08-26T10:00:02.000Z'),
  });

  assert.deepEqual(await runner.run(), {
    accepted: 1, blocked: 0, cancelled: 0, failed: 0, unknown: 0,
  });
  assert.equal(row(db, created.id).status, 'accepted');
  assert.equal(row(db, created.id).provider_message_id, 'gmail-reconciled-1');
  assert.equal(sendAssignmentDigest.mock.callCount(), 0);
  assert.equal(reconcileMessageId.mock.callCount(), 1);
});

test('unknown retry requires explicit duplicate-risk confirmation', async context => {
  const db = createDeliveryDb(context);
  const created = addDelivery(db);
  db.prepare(`UPDATE assignment_deliveries SET status = 'unknown' WHERE id = ?`).run(created.id);

  assert.throws(
    () => retryUnknownDelivery({ db, deliveryId: created.id, now: BASE_NOW }),
    error => error.code === 'duplicate_risk_confirmation_required',
  );
  const retried = retryUnknownDelivery({
    db,
    deliveryId: created.id,
    duplicateRiskConfirmed: true,
    now: BASE_NOW,
  });
  assert.equal(retried.status, 'pending');
  assert.equal(retried.duplicate_risk_confirmed_at, BASE_NOW.toISOString());
});

test('stale connection generation and removed send consent block before provider I/O', async context => {
  const db = createDeliveryDb(context);
  const stale = addDelivery(db, { conversationId: 42 });
  const noConsent = addDelivery(db, { conversationId: 43 });
  const send = mock.fn();
  const runner = createDeliveryRunner({
    db,
    trustedAppOrigin: ORIGIN,
    resolveCurrentContext: ({ delivery }) => deliveryContext(
      delivery.id === stale.id
        ? { connectionGeneration: 4 }
        : { nativeConversationId: 'gmail-thread-43', sendCapable: false },
    ),
    resolveSender: () => ({ send }),
    clock: () => BASE_NOW,
  });

  assert.equal((await runner.runOne(stale.id)).blockReason, 'stale_connection_generation');
  assert.equal((await runner.runOne(noConsent.id)).blockReason, 'send_permission_required');
  assert.equal(send.mock.callCount(), 0);
});

test('new consent promotes a blocked delivery, while assigning back never revives cancelled history', context => {
  const db = createDeliveryDb(context);
  const blocked = addDelivery(db, {
    context: deliveryContext({ sendCapable: false }),
  });
  assert.equal(blocked.status, 'blocked');

  const promoted = addDelivery(db, {
    context: deliveryContext({ connectionGeneration: 4, sendCapable: true }),
  });
  assert.equal(promoted.id, blocked.id);
  assert.equal(promoted.status, 'pending');
  assert.equal(promoted.connection_generation, 4);

  cancelFormerRecipientDeliveries({
    db,
    organizationId: 2,
    conversationId: 42,
    currentRecipientId: 8,
    now: BASE_NOW,
  });
  assert.equal(row(db, blocked.id).status, 'cancelled');
  assert.equal(addDelivery(db).status, 'cancelled');
});

test('provider adapter normalizes accepted output, capability blocking, and reconciliation', async () => {
  const sendAssignmentDigest = mock.fn(async () => ({ providerMessageId: 'graph-1' }));
  const reconcileMessageId = mock.fn(async () => ({ found: true, providerMessageId: 'graph-1' }));
  const sender = createProviderDeliverySender({
    capabilities: { read: true, send: true },
    sendAssignmentDigest,
    reconcileMessageId,
  });

  assert.deepEqual(await sender.send({ rawMime: 'MIME', signal: undefined }), {
    accepted: true,
    providerMessageId: 'graph-1',
  });
  assert.deepEqual(await sender.reconcile({ messageId: '<lf-token@example.test>' }), {
    found: true,
    providerMessageId: 'graph-1',
  });
  assert.equal(sendAssignmentDigest.mock.calls[0].arguments[0].rawMime, 'MIME');
  assert.equal(reconcileMessageId.mock.calls[0].arguments[0].internetMessageId, '<lf-token@example.test>');

  await assert.rejects(
    () => createProviderDeliverySender({
      capabilities: { read: true, send: false },
      sendAssignmentDigest,
    }).send({ rawMime: 'MIME' }),
    error => error.code === 'send_permission_required' && error.ambiguous === false,
  );
});
