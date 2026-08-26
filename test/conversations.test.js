import assert from 'node:assert/strict';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import { evaluateOverdueAlerts } from '../src/alerts.js';
import { createApp } from '../src/app.js';
import { hashPassword } from '../src/auth.js';
import {
  deriveThreadKey,
  displayThreadSubject,
  normalizeThreadSubject,
} from '../src/conversations.js';
import {
  backfillNativeConversation,
  bindConversationSource,
  conversationForEmail,
} from '../src/canonical-conversations.js';
import { retryUnknownDelivery } from '../src/deliveries.js';
import { createDatabase, migrate, seedDemoData } from '../src/db.js';
import {
  disconnectMailboxConnection,
  replaceConnectionGeneration,
  resolveMailboxConnection,
} from '../src/mailbox-connections.js';
import { updateWorkspaceSettings } from '../src/workspace.js';
import {
  applyRuleToUnassigned,
  assignEmailManually,
  completeAssignedEmail,
  createSyncRunner,
  syncMailbox,
} from '../src/workflows.js';

function one(db, sql, ...parameters) {
  return db.prepare(sql).get(...parameters);
}

function userId(db, email) {
  return Number(one(db, 'SELECT id FROM users WHERE email = ?', email).id);
}

function message({
  id,
  subject,
  receivedAt,
  preview = 'Please review this request.',
  senderAddress = 'sender@example.test',
  provider,
  mailboxAddress,
  nativeConversationId,
  internetMessageId,
  inReplyTo,
  references,
  direction,
}) {
  return {
    providerId: id,
    ...(provider ? { provider } : {}),
    ...(mailboxAddress ? { mailboxAddress } : {}),
    ...(nativeConversationId ? { nativeConversationId } : {}),
    ...(internetMessageId ? { internetMessageId } : {}),
    ...(inReplyTo ? { inReplyTo } : {}),
    ...(references ? { references } : {}),
    ...(direction ? { direction } : {}),
    subject,
    senderName: 'Example Sender',
    senderAddress,
    preview,
    receivedAt,
    webUrl: null,
  };
}

function source(messages, {
  provider = 'gmail',
  mailboxAddress = 'team@example.test',
  cursorKey = `mail_cursor:${provider}:${mailboxAddress}`,
  nextCursor = 'cursor-after-sync',
  removedProviderIds,
  organizationId = 1,
  connectionId,
  mailboxIdentityId,
  capabilities,
} = {}) {
  return {
    provider,
    organizationId,
    mailboxAddress,
    ...(connectionId ? { connectionId } : {}),
    ...(mailboxIdentityId ? { mailboxIdentityId } : {}),
    ...(capabilities ? { capabilities } : {}),
    cursorKey,
    async fetchChanges() {
      return {
        messages,
        ...(removedProviderIds === undefined ? {} : { removedProviderIds }),
        nextCursor,
      };
    },
  };
}

async function syncMessages(db, messages, options) {
  return syncMailbox({ db, source: source(messages, options) });
}

function email(db, providerId) {
  return one(db, 'SELECT * FROM emails WHERE provider_id = ?', providerId);
}

function replaceRules(db, definitions) {
  db.prepare('DELETE FROM rules').run();
  const insert = db.prepare(`
    INSERT INTO rules
      (name, keywords, sender_filter, assignee_id, priority, enabled, created_at)
    VALUES (?, ?, '', ?, ?, 1, '2026-08-01T00:00:00.000Z')
  `);
  for (const definition of definitions) {
    insert.run(
      definition.name,
      definition.keywords,
      definition.assigneeId,
      definition.priority,
    );
  }
}

function createMailboxFixture(db, {
  provider = 'gmail',
  mailboxAddress = 'admin@lexflow.local',
  providerAccountId = 'provider-account-1',
  encryptedGrant = 'encrypted-grant-v1',
  capabilities = ['read'],
  now = new Date('2026-08-26T10:00:00.000Z'),
} = {}) {
  const adminUserId = userId(db, 'admin@lexflow.local');
  return replaceConnectionGeneration({
    db,
    organizationId: 1,
    provider,
    account: {
      mailboxAddress,
      providerAccountId,
      adminUserId,
      encryptedGrant,
      grantKind: 'oauth',
      capabilities,
    },
    now,
  });
}

test('thread subjects normalize prefixes, Unicode, case, whitespace, and mailbox scope', () => {
  const decorated = '  RE:  Fw: FWD:\tCafe\u0301\u00a0  NDA  ';
  assert.equal(normalizeThreadSubject(decorated), 'caf\u00e9 nda');
  assert.equal(normalizeThreadSubject(decorated), normalizeThreadSubject('Caf\u00e9 NDA'));
  assert.equal(displayThreadSubject(decorated), 'Caf\u00e9 NDA');

  const base = {
    provider: 'gmail',
    mailboxAddress: ' Team@Example.Test ',
    subject: decorated,
    providerId: 'gmail:team@example.test:message-1',
  };
  assert.equal(
    deriveThreadKey(base),
    deriveThreadKey({
      ...base,
      mailboxAddress: 'team@example.test',
      subject: 'caf\u00e9 nda',
      providerId: 'gmail:team@example.test:message-2',
    }),
  );
  assert.notEqual(
    deriveThreadKey(base),
    deriveThreadKey({ ...base, mailboxAddress: 'other@example.test' }),
  );
  assert.notEqual(
    deriveThreadKey(base),
    deriveThreadKey({ ...base, provider: 'outlook' }),
  );

  const noSubject = { ...base, subject: '(No subject)' };
  assert.notEqual(
    deriveThreadKey({ ...noSubject, providerId: 'no-subject-1' }),
    deriveThreadKey({ ...noSubject, providerId: 'no-subject-2' }),
  );
});

test('migration backfills thread keys and the latest assignee as sticky owner idempotently', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      department TEXT NOT NULL,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL
    );
    CREATE TABLE emails (
      id INTEGER PRIMARY KEY,
      provider_id TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL DEFAULT 'outlook',
      mailbox_address TEXT,
      subject TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_address TEXT NOT NULL,
      preview TEXT NOT NULL,
      received_at TEXT NOT NULL,
      outlook_url TEXT,
      status TEXT NOT NULL,
      assignee_id INTEGER,
      assigned_at TEXT,
      completed_by INTEGER,
      completed_at TEXT,
      created_at TEXT NOT NULL
    );
    INSERT INTO users VALUES
      (1, 'admin@legacy.test', 'Legacy Admin', 'LA', 'Operations', 'admin', 'hash'),
      (2, 'maya@legacy.test', 'Maya Legacy', 'ML', 'Legal', 'member', 'hash'),
      (3, 'priya@legacy.test', 'Priya Legacy', 'PL', 'Finance', 'member', 'hash');
    INSERT INTO emails VALUES
      (1, 'legacy-thread-1', 'outlook', 'shared@example.test', 'Contract renewal',
       'Sender', 'sender@example.test', 'First message', '2026-08-10T08:00:00.000Z',
       NULL, 'assigned', 2, '2026-08-10T08:01:00.000Z', NULL, NULL,
       '2026-08-10T08:00:00.000Z'),
      (2, 'legacy-thread-2', 'outlook', 'shared@example.test', 'Re: Contract renewal',
       'Sender', 'sender@example.test', 'Latest message', '2026-08-11T08:00:00.000Z',
       NULL, 'completed', 3, '2026-08-11T08:01:00.000Z', 3,
       '2026-08-11T09:00:00.000Z', '2026-08-11T08:00:00.000Z');
  `);

  migrate(db);
  const afterFirstMigration = db.prepare(`
    SELECT thread_key FROM emails ORDER BY id
  `).all().map(row => row.thread_key);
  const ownersAfterFirstMigration = db.prepare(`
    SELECT thread_key, assignee_id, updated_at
    FROM email_thread_owners ORDER BY thread_key
  `).all().map(row => ({ ...row }));
  migrate(db);

  assert.ok(afterFirstMigration[0]);
  assert.equal(afterFirstMigration[0], afterFirstMigration[1]);
  assert.deepEqual(
    db.prepare('SELECT thread_key FROM emails ORDER BY id').all().map(row => row.thread_key),
    afterFirstMigration,
  );
  assert.deepEqual(
    db.prepare(`
      SELECT thread_key, assignee_id, updated_at
      FROM email_thread_owners ORDER BY thread_key
    `).all().map(row => ({ ...row })),
    ownersAfterFirstMigration,
  );
  assert.equal(ownersAfterFirstMigration.length, 1);
  assert.equal(Number(ownersAfterFirstMigration[0].assignee_id), 3);

  db.prepare(`
    INSERT INTO rules
      (name, keywords, sender_filter, assignee_id, priority, enabled, created_at)
    VALUES ('New contract rule', 'contract', '', 2, 1, 1, '2026-08-12T00:00:00.000Z')
  `).run();
  const result = await syncMessages(db, [message({
    id: 'legacy-thread-3',
    subject: 'Fwd: Re: Contract renewal',
    receivedAt: '2026-08-12T08:00:00.000Z',
  })], {
    provider: 'outlook',
    mailboxAddress: 'shared@example.test',
  });

  assert.deepEqual(result, { imported: 1, assigned: 1 });
  assert.equal(Number(email(db, 'legacy-thread-3').assignee_id), 3);
  db.close();
});

test('a reply reopens a completed thread for its sticky owner before evaluating newer rules', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const maya = userId(db, 'maya@lexflow.local');
  const priya = userId(db, 'priya@lexflow.local');
  replaceRules(db, [{ name: 'Maya contract route', keywords: 'contract', assigneeId: maya, priority: 20 }]);

  await syncMessages(db, [message({
    id: 'sticky-base',
    subject: 'Contract renewal',
    receivedAt: '2026-08-10T08:00:00.000Z',
  })]);
  const base = email(db, 'sticky-base');
  assert.equal(Number(base.assignee_id), maya);
  completeAssignedEmail({
    db,
    emailId: Number(base.id),
    userId: maya,
    now: new Date('2026-08-10T09:00:00.000Z'),
  });

  db.prepare(`
    INSERT INTO rules
      (name, keywords, sender_filter, assignee_id, priority, enabled, created_at)
    VALUES ('Higher priority Priya route', 'contract', '', ?, 1, 1, ?)
  `).run(priya, '2026-08-10T10:00:00.000Z');
  const result = await syncMessages(db, [message({
    id: 'sticky-reply',
    subject: 'RE: Fwd: Contract renewal',
    receivedAt: '2026-08-11T08:00:00.000Z',
  })]);
  const reply = email(db, 'sticky-reply');

  assert.deepEqual(result, { imported: 1, assigned: 1 });
  assert.equal(email(db, 'sticky-base').status, 'completed');
  assert.equal(reply.status, 'assigned');
  assert.equal(Number(reply.assignee_id), maya);
  assert.equal(reply.thread_key, base.thread_key);
  assert.equal(one(db, `
    SELECT count(*) AS count FROM notifications
    WHERE email_id = ? AND user_id = ? AND kind = 'assignment'
  `, reply.id, priya).count, 0);
});

test('verified Gmail reconnect adopts legacy rows without replaying workflow state', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  replaceRules(db, [{
    name: 'Maya contract route',
    keywords: 'contract',
    assigneeId: userId(db, 'maya@lexflow.local'),
    priority: 1,
  }]);
  const maya = userId(db, 'maya@lexflow.local');
  const mailboxAddress = 'owner@gmail.test';
  const legacy = createMailboxFixture(db, {
    mailboxAddress,
    providerAccountId: mailboxAddress,
  });
  const providerMessage = message({
    id: 'gmail:owner@gmail.test:legacy-message',
    provider: 'gmail',
    mailboxAddress,
    nativeConversationId: 'gmail-thread-1',
    subject: 'Contract review',
    receivedAt: '2026-08-26T10:00:00.000Z',
  });
  assert.deepEqual(await syncMessages(db, [providerMessage], {
    provider: 'gmail',
    mailboxAddress,
    connectionId: legacy.id,
    mailboxIdentityId: legacy.mailboxIdentityId,
  }), { imported: 1, assigned: 1 });
  const original = email(db, providerMessage.providerId);
  completeAssignedEmail({
    db,
    emailId: Number(original.id),
    userId: maya,
    now: new Date('2026-08-26T10:30:00.000Z'),
  });
  const before = email(db, providerMessage.providerId);
  const conversationBefore = one(db, 'SELECT * FROM conversations WHERE id = ?', before.conversation_id);
  const activityBefore = Number(one(db, 'SELECT count(*) AS count FROM activity').count);
  const notificationBefore = Number(one(db, 'SELECT count(*) AS count FROM notifications').count);
  const deliveryBefore = one(db, `
    SELECT * FROM assignment_deliveries
    WHERE organization_id = 1 AND conversation_id = ?
  `, before.conversation_id);

  disconnectMailboxConnection({
    db,
    organizationId: 1,
    mailboxIdentityId: legacy.mailboxIdentityId,
    now: new Date('2026-08-26T11:00:00.000Z'),
  });
  const verified = createMailboxFixture(db, {
    mailboxAddress,
    providerAccountId: 'google-stable-subject',
    encryptedGrant: 'verified-encrypted-grant',
    now: new Date('2026-08-26T11:01:00.000Z'),
  });
  assert.notEqual(verified.id, legacy.id);
  assert.notEqual(verified.mailboxIdentityId, legacy.mailboxIdentityId);

  assert.deepEqual(await syncMessages(db, [providerMessage], {
    provider: 'gmail',
    mailboxAddress,
    connectionId: verified.id,
    mailboxIdentityId: verified.mailboxIdentityId,
  }), { imported: 0, assigned: 0 });
  const after = email(db, providerMessage.providerId);
  assert.equal(Number(one(db, `
    SELECT count(*) AS count FROM emails
    WHERE organization_id = 1 AND provider_id = ?
  `, providerMessage.providerId).count), 1);
  assert.equal(Number(after.id), Number(before.id));
  assert.equal(Number(after.connection_id), verified.id);
  for (const field of [
    'status', 'assignee_id', 'assigned_at', 'completed_by', 'completed_at',
    'conversation_id',
  ]) assert.equal(after[field], before[field]);
  const conversationAfter = one(db, 'SELECT * FROM conversations WHERE id = ?', after.conversation_id);
  assert.equal(conversationAfter.completion_state, conversationBefore.completion_state);
  assert.equal(conversationAfter.current_assignee_id, conversationBefore.current_assignee_id);
  assert.equal(conversationAfter.data_conflict, null);
  const verifiedSource = one(db, `
    SELECT mailbox_identity_id, last_resolved_connection_id
    FROM conversation_sources
    WHERE organization_id = 1 AND conversation_id = ?
      AND mailbox_identity_id = ? AND native_conversation_id = ?
  `, after.conversation_id, verified.mailboxIdentityId, providerMessage.nativeConversationId);
  assert.equal(Number(verifiedSource.mailbox_identity_id), verified.mailboxIdentityId);
  assert.equal(Number(verifiedSource.last_resolved_connection_id), verified.id);
  assert.deepEqual(
    { ...one(db, 'SELECT * FROM assignment_deliveries WHERE id = ?', deliveryBefore.id) },
    { ...deliveryBefore },
  );
  assert.equal(Number(one(db, 'SELECT count(*) AS count FROM activity').count), activityBefore);
  assert.equal(Number(one(db, 'SELECT count(*) AS count FROM notifications').count), notificationBefore);
});

test('manual reassignment changes the owner used by future replies', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const admin = userId(db, 'admin@lexflow.local');
  const maya = userId(db, 'maya@lexflow.local');
  const priya = userId(db, 'priya@lexflow.local');
  replaceRules(db, [{ name: 'Maya matter route', keywords: 'matter', assigneeId: maya, priority: 1 }]);

  await syncMessages(db, [message({
    id: 'manual-base',
    subject: 'Customer matter',
    receivedAt: '2026-08-10T08:00:00.000Z',
  })]);
  const base = email(db, 'manual-base');
  assignEmailManually({
    db,
    emailId: Number(base.id),
    assigneeId: priya,
    adminId: admin,
    now: new Date('2026-08-10T09:00:00.000Z'),
  });

  await syncMessages(db, [message({
    id: 'manual-reply',
    subject: 'Re: Customer matter',
    receivedAt: '2026-08-11T08:00:00.000Z',
  })]);

  assert.equal(Number(email(db, 'manual-reply').assignee_id), priya);
  assert.equal(Number(one(db, `
    SELECT assignee_id FROM email_thread_owners WHERE thread_key = ?
  `, base.thread_key).assignee_id), priya);
});

test('manual assignment moves every open message and emits one clean conversation event', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  replaceRules(db, []);
  updateWorkspaceSettings({ db, timeUnassignedHours: 1, timeAssignedUnmarkedHours: 1 });
  const admin = userId(db, 'admin@lexflow.local');
  const maya = userId(db, 'maya@lexflow.local');
  const priya = userId(db, 'priya@lexflow.local');

  await syncMessages(db, [
    message({ id: 'manual-group-1', subject: 'Grouped manual work', receivedAt: '2026-08-14T07:00:00.000Z' }),
    message({ id: 'manual-group-2', subject: 'Re: Grouped manual work', receivedAt: '2026-08-14T08:00:00.000Z' }),
  ]);
  const first = email(db, 'manual-group-1');
  const second = email(db, 'manual-group-2');

  evaluateOverdueAlerts({ db, now: new Date('2026-08-14T10:00:00.000Z') });
  assert.equal(one(db, `
    SELECT count(*) AS count FROM notifications
    WHERE kind = 'unassigned_overdue' AND email_id IN (?, ?)
  `, first.id, second.id).count, 1);

  assignEmailManually({
    db,
    emailId: Number(first.id),
    assigneeId: maya,
    adminId: admin,
    now: new Date('2026-08-14T10:00:00.000Z'),
  });
  assert.deepEqual(db.prepare(`
    SELECT provider_id, status, assignee_id, assigned_at
    FROM emails WHERE thread_key = ? ORDER BY received_at
  `).all(first.thread_key).map(row => ({ ...row })), [
    {
      provider_id: 'manual-group-1',
      status: 'assigned',
      assignee_id: maya,
      assigned_at: '2026-08-14T10:00:00.000Z',
    },
    {
      provider_id: 'manual-group-2',
      status: 'assigned',
      assignee_id: maya,
      assigned_at: '2026-08-14T10:00:00.000Z',
    },
  ]);
  assert.equal(one(db, `
    SELECT count(*) AS count FROM notifications
    WHERE email_id IN (?, ?) AND kind = 'assignment'
  `, first.id, second.id).count, 1);
  assert.equal(one(db, `
    SELECT count(*) AS count FROM notifications
    WHERE email_id IN (?, ?) AND kind = 'unassigned_overdue'
  `, first.id, second.id).count, 0);

  evaluateOverdueAlerts({ db, now: new Date('2026-08-14T12:00:00.000Z') });
  assert.equal(one(db, `
    SELECT count(*) AS count FROM notifications
    WHERE email_id IN (?, ?) AND kind = 'assigned_overdue'
  `, first.id, second.id).count, 2);

  assignEmailManually({
    db,
    emailId: Number(second.id),
    assigneeId: priya,
    adminId: admin,
    now: new Date('2026-08-14T13:00:00.000Z'),
  });
  assert.deepEqual(db.prepare(`
    SELECT DISTINCT status, assignee_id, assigned_at
    FROM emails WHERE thread_key = ? AND status IN ('unassigned', 'assigned')
  `).all(first.thread_key).map(row => ({ ...row })), [{
    status: 'assigned',
    assignee_id: priya,
    assigned_at: '2026-08-14T13:00:00.000Z',
  }]);
  assert.equal(one(db, `
    SELECT count(*) AS count FROM notifications
    WHERE email_id IN (?, ?)
      AND kind IN ('assignment', 'unassigned_overdue', 'assigned_overdue')
      AND user_id <> ?
  `, first.id, second.id, priya).count, 0);
  assert.equal(one(db, `
    SELECT count(*) AS count FROM notifications
    WHERE email_id IN (?, ?) AND kind = 'assignment' AND user_id = ?
  `, first.id, second.id, priya).count, 1);
  assert.equal(one(db, `
    SELECT count(*) AS count FROM alert_deliveries WHERE email_id IN (?, ?)
  `, first.id, second.id).count, 0);
  assert.equal(one(db, `
    SELECT count(*) AS count FROM activity
    WHERE kind = 'assigned' AND email_id IN (?, ?)
  `, first.id, second.id).count, 2);

  completeAssignedEmail({
    db,
    emailId: Number(first.id),
    userId: priya,
    now: new Date('2026-08-14T14:00:00.000Z'),
  });
  assert.equal(one(db, `
    SELECT count(*) AS count FROM emails
    WHERE thread_key = ? AND status <> 'completed'
  `, first.thread_key).count, 0);
  assert.equal(one(db, `
    SELECT count(*) AS count FROM activity
    WHERE kind = 'completed' AND email_id IN (?, ?)
  `, first.id, second.id).count, 1);
  assert.equal(one(db, `
    SELECT count(*) AS count FROM notifications
    WHERE kind = 'completion' AND email_id IN (?, ?)
  `, first.id, second.id).count, 1);
});

test('completion rejects mixed open ownership until an admin normalizes the thread', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const admin = userId(db, 'admin@lexflow.local');
  const maya = userId(db, 'maya@lexflow.local');
  const priya = userId(db, 'priya@lexflow.local');
  replaceRules(db, [{ name: 'Mixed route', keywords: 'mixed', assigneeId: maya, priority: 1 }]);

  await syncMessages(db, [
    message({ id: 'mixed-owner-1', subject: 'Mixed ownership', receivedAt: '2026-08-14T08:00:00.000Z' }),
    message({ id: 'mixed-owner-2', subject: 'Re: Mixed ownership', receivedAt: '2026-08-14T09:00:00.000Z' }),
  ]);
  const first = email(db, 'mixed-owner-1');
  const second = email(db, 'mixed-owner-2');
  db.prepare('UPDATE emails SET assignee_id = ? WHERE id = ?').run(priya, second.id);

  assert.throws(
    () => completeAssignedEmail({ db, emailId: Number(first.id), userId: maya }),
    error => error.code === 'CONFLICT' && /mixed ownership/i.test(error.message),
  );
  assert.equal(one(db, `
    SELECT count(*) AS count FROM emails
    WHERE thread_key = ? AND status = 'assigned'
  `, first.thread_key).count, 2);

  assignEmailManually({
    db,
    emailId: Number(first.id),
    assigneeId: maya,
    adminId: admin,
  });
  completeAssignedEmail({ db, emailId: Number(second.id), userId: maya });
  assert.equal(one(db, `
    SELECT count(*) AS count FROM emails
    WHERE thread_key = ? AND status = 'completed'
  `, first.thread_key).count, 2);
});

test('rule application assigns the complete unassigned conversation and honors an existing owner', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const maya = userId(db, 'maya@lexflow.local');
  replaceRules(db, []);

  await syncMessages(db, [
    message({
      id: 'rule-thread-old',
      subject: 'Conversation backlog',
      preview: 'Older message without the matching phrase.',
      receivedAt: '2026-08-14T08:00:00.000Z',
    }),
    message({
      id: 'rule-thread-new',
      subject: 'Re: Conversation backlog',
      preview: 'route-this message',
      receivedAt: '2026-08-14T09:00:00.000Z',
    }),
  ]);
  const ruleId = Number(db.prepare(`
    INSERT INTO rules
      (name, keywords, sender_filter, assignee_id, priority, enabled, created_at)
    VALUES ('Backlog route', 'route-this', '', ?, 1, 1, '2026-08-14T10:00:00.000Z')
  `).run(maya).lastInsertRowid);

  assert.deepEqual(applyRuleToUnassigned(db, ruleId), { assigned: 2 });
  assert.deepEqual(
    db.prepare(`
      SELECT provider_id, status, assignee_id
      FROM emails WHERE provider_id IN ('rule-thread-old', 'rule-thread-new')
      ORDER BY received_at
    `).all().map(row => ({ ...row })),
    [
      { provider_id: 'rule-thread-old', status: 'assigned', assignee_id: maya },
      { provider_id: 'rule-thread-new', status: 'assigned', assignee_id: maya },
    ],
  );

  db.prepare(`
    UPDATE emails
    SET status = 'unassigned', assignee_id = NULL, assigned_at = NULL
    WHERE provider_id = 'rule-thread-new'
  `).run();
  const unrelatedRuleId = Number(db.prepare(`
    INSERT INTO rules
      (name, keywords, sender_filter, assignee_id, priority, enabled, created_at)
    VALUES ('Unrelated route', 'does-not-match', '', ?, 2, 1, '2026-08-14T10:01:00.000Z')
  `).run(maya).lastInsertRowid);

  assert.deepEqual(applyRuleToUnassigned(db, unrelatedRuleId), { assigned: 1 });
  assert.equal(email(db, 'rule-thread-new').status, 'assigned');
  assert.equal(Number(email(db, 'rule-thread-new').assignee_id), maya);
});

test('replaying an old completion does not close a newly reopened reply', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const maya = userId(db, 'maya@lexflow.local');
  replaceRules(db, [{ name: 'Replay route', keywords: 'replay', assigneeId: maya, priority: 1 }]);

  await syncMessages(db, [message({
    id: 'completion-replay-base',
    subject: 'Replay request',
    receivedAt: '2026-08-14T08:00:00.000Z',
  })]);
  const base = email(db, 'completion-replay-base');
  completeAssignedEmail({
    db,
    emailId: Number(base.id),
    userId: maya,
    now: new Date('2026-08-14T09:00:00.000Z'),
  });
  await syncMessages(db, [message({
    id: 'completion-replay-reply',
    subject: 'Re: Replay request',
    receivedAt: '2026-08-14T10:00:00.000Z',
  })]);
  const reply = email(db, 'completion-replay-reply');
  assert.equal(reply.status, 'assigned');

  const replayResult = completeAssignedEmail({
    db,
    emailId: Number(base.id),
    userId: maya,
    now: new Date('2026-08-14T11:00:00.000Z'),
  });

  assert.equal(replayResult.id, base.id);
  assert.equal(email(db, 'completion-replay-base').completed_at, '2026-08-14T09:00:00.000Z');
  assert.equal(email(db, 'completion-replay-reply').status, 'assigned');
  assert.equal(one(db, `
    SELECT count(*) AS count FROM activity
    WHERE kind = 'completed' AND email_id IN (?, ?)
  `, base.id, reply.id).count, 1);
});

test('sticky ownership survives pruning and a discarded old reply has no workflow effects', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const maya = userId(db, 'maya@lexflow.local');
  replaceRules(db, [{ name: 'Maya renewal route', keywords: 'renewal', assigneeId: maya, priority: 1 }]);
  const cursorKey = 'mail_cursor:gmail:retention@example.test';

  await syncMessages(db, [message({
    id: 'retained-owner-base',
    subject: 'Annual renewal',
    receivedAt: '2026-08-01T08:00:00.000Z',
  })], { mailboxAddress: 'retention@example.test', cursorKey, nextCursor: 'base-cursor' });
  const base = email(db, 'retained-owner-base');
  completeAssignedEmail({
    db,
    emailId: Number(base.id),
    userId: maya,
    now: new Date('2026-08-01T09:00:00.000Z'),
  });

  const filler = Array.from({ length: 499 }, (_, index) => message({
    id: `retention-filler-${index}`,
    subject: `Unrelated retained message ${index}`,
    receivedAt: new Date(Date.UTC(2026, 7, 2, 0, 0, index)).toISOString(),
  }));
  await syncMessages(db, filler, {
    mailboxAddress: 'retention@example.test',
    cursorKey,
    nextCursor: 'filler-cursor',
  });
  assert.equal(one(db, 'SELECT count(*) AS count FROM emails').count, 500);

  await syncMessages(db, [message({
    id: 'retained-owner-reply',
    subject: 'Re: Annual renewal',
    receivedAt: '2026-08-20T08:00:00.000Z',
  })], {
    mailboxAddress: 'retention@example.test',
    cursorKey,
    nextCursor: 'new-reply-cursor',
  });
  const reply = email(db, 'retained-owner-reply');
  assert.equal(email(db, 'retained-owner-base'), undefined);
  assert.equal(Number(reply.assignee_id), maya);
  completeAssignedEmail({
    db,
    emailId: Number(reply.id),
    userId: maya,
    now: new Date('2026-08-20T09:00:00.000Z'),
  });

  const beforeDiscard = one(db, `
    SELECT
      (SELECT count(*) FROM notifications) AS notification_count,
      (SELECT count(*) FROM activity) AS activity_count,
      (SELECT count(*) FROM emails) AS email_count
  `);
  let cursorSeen;
  const discarded = await syncMailbox({
    db,
    source: {
      provider: 'gmail',
      mailboxAddress: 'retention@example.test',
      cursorKey,
      async fetchChanges(cursor) {
        cursorSeen = cursor;
        return {
          messages: [message({
            id: 'discarded-old-reply',
            subject: 'Fwd: Annual renewal',
            receivedAt: '2026-07-01T08:00:00.000Z',
          })],
          nextCursor: 'discarded-reply-cursor',
        };
      },
    },
  });

  assert.equal(cursorSeen, 'new-reply-cursor');
  assert.deepEqual(discarded, { imported: 0, assigned: 0 });
  assert.equal(email(db, 'discarded-old-reply'), undefined);
  assert.deepEqual(one(db, `
    SELECT
      (SELECT count(*) FROM notifications) AS notification_count,
      (SELECT count(*) FROM activity) AS activity_count,
      (SELECT count(*) FROM emails) AS email_count
  `), beforeDiscard);
  assert.equal(email(db, 'retained-owner-reply').status, 'completed');
  assert.equal(
    one(db, 'SELECT value FROM sync_state WHERE key = ?', cursorKey).value,
    'discarded-reply-cursor',
  );
});

test('sync preselects the global newest 500 before writing a large fetched batch', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  replaceRules(db, []);
  const cursorKey = 'mail_cursor:gmail:bounded@example.test';

  const existing = Array.from({ length: 500 }, (_, index) => message({
    id: `bounded-existing-${index}`,
    subject: `Existing message ${index}`,
    receivedAt: new Date(Date.UTC(2026, 7, 1, 0, 0, index)).toISOString(),
  }));
  assert.deepEqual(await syncMessages(db, existing, {
    mailboxAddress: 'bounded@example.test',
    cursorKey,
    nextCursor: 'bounded-initial',
  }), { imported: 500, assigned: 0 });

  db.exec(`
    CREATE TRIGGER reject_unbounded_email_batch
    BEFORE INSERT ON emails
    WHEN (SELECT count(*) FROM emails) >= 1000
    BEGIN
      SELECT RAISE(ABORT, 'sync inserted an unbounded batch');
    END;
  `);
  const fetched = [message({
    id: 'bounded-existing-0',
    subject: 'Existing message corrected',
    preview: 'Updated provider metadata must still be applied.',
    receivedAt: '2026-09-01T00:00:00.000Z',
  })];
  fetched.push(...Array.from({ length: 2_000 }, (_, index) => message({
    id: `bounded-new-${index}`,
    subject: `Fetched message ${index}`,
    receivedAt: new Date(Date.UTC(2026, 7, 20, 0, 0, index)).toISOString(),
  })));

  const result = await syncMessages(db, fetched, {
    mailboxAddress: 'bounded@example.test',
    cursorKey,
    nextCursor: 'bounded-after-large-batch',
  });

  assert.deepEqual(result, { imported: 499, assigned: 0 });
  assert.equal(one(db, 'SELECT count(*) AS count FROM emails').count, 500);
  assert.equal(email(db, 'bounded-existing-0').subject, 'Existing message corrected');
  assert.equal(email(db, 'bounded-new-1500'), undefined);
  assert.ok(email(db, 'bounded-new-1501'));
  assert.ok(email(db, 'bounded-new-1999'));
  assert.equal(
    one(db, 'SELECT value FROM sync_state WHERE key = ?', cursorKey).value,
    'bounded-after-large-batch',
  );
});

test('equal received times retain later prospective email ids deterministically', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  replaceRules(db, []);
  const receivedAt = '2026-08-20T08:00:00.000Z';

  const result = await syncMessages(db, Array.from({ length: 600 }, (_, index) => message({
    id: `same-time-${index}`,
    subject: `Same time ${index}`,
    receivedAt,
  })));

  assert.deepEqual(result, { imported: 500, assigned: 0 });
  assert.equal(email(db, 'same-time-99'), undefined);
  assert.ok(email(db, 'same-time-100'));
  assert.ok(email(db, 'same-time-599'));
});

test('provider updates move only standalone unowned messages between thread keys', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  replaceRules(db, []);

  await syncMessages(db, [message({
    id: 'mutable-unassigned',
    subject: 'Incorrect subject',
    receivedAt: '2026-08-14T08:00:00.000Z',
  })], { provider: 'gmail', mailboxAddress: 'first@example.test' });
  const originalUnassignedKey = email(db, 'mutable-unassigned').thread_key;
  const unassignedUpdate = await syncMessages(db, [message({
    id: 'mutable-unassigned',
    subject: 'Corrected subject',
    preview: 'Corrected preview',
    receivedAt: '2026-08-14T08:05:00.000Z',
    provider: 'outlook',
    mailboxAddress: 'second@example.test',
  })], { provider: 'outlook', mailboxAddress: 'second@example.test' });
  const corrected = email(db, 'mutable-unassigned');

  assert.deepEqual(unassignedUpdate, { imported: 0, assigned: 0 });
  assert.notEqual(corrected.thread_key, originalUnassignedKey);
  assert.equal(corrected.thread_key, deriveThreadKey({
    provider: 'outlook',
    mailboxAddress: 'second@example.test',
    subject: 'Corrected subject',
    providerId: 'mutable-unassigned',
  }));
  assert.equal(corrected.provider, 'outlook');
  assert.equal(corrected.mailbox_address, 'second@example.test');

  const maya = userId(db, 'maya@lexflow.local');
  replaceRules(db, [{ name: 'Protected route', keywords: 'protected', assigneeId: maya, priority: 1 }]);
  await syncMessages(db, [message({
    id: 'immutable-owned',
    subject: 'Protected conversation',
    receivedAt: '2026-08-14T09:00:00.000Z',
  })], { provider: 'gmail', mailboxAddress: 'first@example.test' });
  const ownedKey = email(db, 'immutable-owned').thread_key;
  await syncMessages(db, [message({
    id: 'immutable-owned',
    subject: 'Entirely different subject',
    receivedAt: '2026-08-14T09:05:00.000Z',
    provider: 'outlook',
    mailboxAddress: 'second@example.test',
  })], { provider: 'outlook', mailboxAddress: 'second@example.test' });
  const owned = email(db, 'immutable-owned');
  assert.equal(owned.subject, 'Entirely different subject');
  assert.equal(owned.provider, 'outlook');
  assert.equal(owned.mailbox_address, 'second@example.test');
  assert.equal(owned.thread_key, ownedKey);
  assert.equal(Number(owned.assignee_id), maya);

  completeAssignedEmail({ db, emailId: Number(owned.id), userId: maya });
  await syncMessages(db, [message({
    id: 'immutable-owned',
    subject: 'Changed after completion',
    receivedAt: '2026-08-14T09:10:00.000Z',
    provider: 'outlook',
    mailboxAddress: 'third@example.test',
  })], { provider: 'outlook', mailboxAddress: 'third@example.test' });
  assert.equal(email(db, 'immutable-owned').thread_key, ownedKey);
});

test('an unassigned row keeps a thread key that already carries continuity', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const maya = userId(db, 'maya@lexflow.local');
  replaceRules(db, [{ name: 'Continuity route', keywords: 'continuity', assigneeId: maya, priority: 1 }]);

  await syncMessages(db, [message({
    id: 'continuity-existing',
    subject: 'Continuity case',
    receivedAt: '2026-08-14T08:00:00.000Z',
  })]);
  const before = email(db, 'continuity-existing');
  db.prepare(`
    UPDATE emails
    SET status = 'unassigned', assignee_id = NULL, assigned_at = NULL
    WHERE id = ?
  `).run(before.id);

  const result = await syncMessages(db, [message({
    id: 'continuity-existing',
    subject: 'Provider supplied a different subject',
    receivedAt: '2026-08-14T08:05:00.000Z',
    provider: 'outlook',
    mailboxAddress: 'moved@example.test',
  })], { provider: 'outlook', mailboxAddress: 'moved@example.test' });
  const after = email(db, 'continuity-existing');

  assert.deepEqual(result, { imported: 0, assigned: 1 });
  assert.equal(after.thread_key, before.thread_key);
  assert.equal(after.status, 'assigned');
  assert.equal(Number(after.assignee_id), maya);
});

test('sync rejects an invalid message list without advancing its cursor', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const cursorKey = 'mail_cursor:invalid-list';
  db.prepare('INSERT INTO sync_state (key, value) VALUES (?, ?)').run(cursorKey, 'before');

  await assert.rejects(
    syncMailbox({
      db,
      source: {
        cursorKey,
        async fetchChanges() {
          return { messages: null, nextCursor: 'after' };
        },
      },
    }),
    error => error.code === 'INVALID_SYNC_RESPONSE',
  );
  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', cursorKey).value, 'before');
});

test('sync removes only provider-confirmed emails in its mailbox scope and preserves audit ownership', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const maya = userId(db, 'maya@lexflow.local');
  const cursorKey = 'mail_cursor:gmail:team@example.test';
  const removedId = 'gmail:team@example.test:removed-target';
  const otherProviderId = 'outlook-other-target';
  const otherMailboxId = 'gmail:other@example.test:other-target';

  await syncMessages(db, [message({
    id: removedId,
    subject: 'ACME NDA removal',
    receivedAt: '2026-08-14T08:00:00.000Z',
  })], {
    provider: 'gmail',
    mailboxAddress: 'team@example.test',
    cursorKey,
    nextCursor: 'before-removal',
  });
  await syncMessages(db, [message({
    id: otherProviderId,
    subject: 'Other provider message',
    receivedAt: '2026-08-14T09:00:00.000Z',
  })], {
    provider: 'outlook',
    mailboxAddress: 'team@example.test',
  });
  await syncMessages(db, [message({
    id: otherMailboxId,
    subject: 'Other mailbox message',
    receivedAt: '2026-08-14T10:00:00.000Z',
  })], {
    provider: 'gmail',
    mailboxAddress: 'other@example.test',
  });

  const removedEmail = email(db, removedId);
  const threadKey = removedEmail.thread_key;
  const activityId = one(db, `
    SELECT id FROM activity WHERE email_id = ? ORDER BY id DESC LIMIT 1
  `, removedEmail.id).id;
  db.prepare(`
    INSERT INTO alert_deliveries (email_id, user_id, kind, last_notified_at)
    VALUES (?, ?, 'assigned_overdue', '2026-08-14T10:00:00.000Z')
  `).run(removedEmail.id, maya);

  const result = await syncMailbox({
    db,
    source: source([], {
      provider: 'gmail',
      mailboxAddress: 'TEAM@example.test',
      cursorKey,
      nextCursor: 'after-removal',
      removedProviderIds: [removedId, otherProviderId, otherMailboxId],
    }),
  });

  assert.deepEqual(result, { imported: 0, assigned: 0 });
  assert.equal(email(db, removedId), undefined);
  assert.ok(email(db, otherProviderId));
  assert.ok(email(db, otherMailboxId));
  assert.equal(one(db, 'SELECT count(*) AS count FROM notifications WHERE email_id = ?', removedEmail.id).count, 0);
  assert.equal(one(db, 'SELECT count(*) AS count FROM alert_deliveries WHERE email_id = ?', removedEmail.id).count, 0);
  assert.equal(one(db, 'SELECT email_id FROM activity WHERE id = ?', activityId).email_id, null);
  assert.equal(Number(one(db, `
    SELECT assignee_id FROM email_thread_owners WHERE thread_key = ?
  `, threadKey).assignee_id), maya);
  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', cursorKey).value, 'after-removal');
});

test('sync rolls back provider removals when cursor advancement fails', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const cursorKey = 'mail_cursor:gmail:rollback@example.test';
  const providerId = 'gmail:rollback@example.test:rollback-target';

  await syncMessages(db, [message({
    id: providerId,
    subject: 'Rollback target',
    receivedAt: '2026-08-14T08:00:00.000Z',
  })], {
    provider: 'gmail',
    mailboxAddress: 'rollback@example.test',
    cursorKey,
    nextCursor: 'before-removal',
  });
  db.exec(`
    CREATE TRIGGER reject_removal_cursor_update
    BEFORE UPDATE ON sync_state
    WHEN OLD.key = '${cursorKey}'
    BEGIN
      SELECT RAISE(ABORT, 'cursor update failed');
    END;
  `);

  await assert.rejects(
    syncMailbox({
      db,
      source: source([], {
        provider: 'gmail',
        mailboxAddress: 'rollback@example.test',
        cursorKey,
        nextCursor: 'after-removal',
        removedProviderIds: [providerId],
      }),
    }),
    /cursor update failed/,
  );

  assert.ok(email(db, providerId));
  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', cursorKey).value, 'before-removal');
});

test('sync skips provider removals when the connection becomes stale after fetching', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const cursorKey = 'mail_cursor:gmail:stale@example.test';
  const providerId = 'gmail:stale@example.test:stale-target';

  await syncMessages(db, [message({
    id: providerId,
    subject: 'Stale connection target',
    receivedAt: '2026-08-14T08:00:00.000Z',
  })], {
    provider: 'gmail',
    mailboxAddress: 'stale@example.test',
    cursorKey,
    nextCursor: 'before-removal',
  });
  let connectionChecks = 0;

  const result = await syncMailbox({
    db,
    source: {
      provider: 'gmail',
      mailboxAddress: 'stale@example.test',
      cursorKey,
      isCurrentConnection() {
        connectionChecks += 1;
        return connectionChecks === 1;
      },
      async fetchChanges() {
        return {
          messages: [],
          removedProviderIds: [providerId],
          nextCursor: 'after-removal',
        };
      },
    },
  });

  assert.deepEqual(result, { imported: 0, assigned: 0, skipped: true });
  assert.ok(email(db, providerId));
  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', cursorKey).value, 'before-removal');
});

test('sync rejects ambiguous or malformed provider removal responses before changing state', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const cursorKey = 'mail_cursor:gmail:invalid-removals@example.test';
  db.prepare('INSERT INTO sync_state (key, value) VALUES (?, ?)').run(cursorKey, 'before');

  const invalidResponses = [
    { messages: [], removedProviderIds: 'not-an-array', nextCursor: 'after' },
    { messages: [], removedProviderIds: [''], nextCursor: 'after' },
    { messages: [], removedProviderIds: [' padded-id '], nextCursor: 'after' },
    {
      messages: [message({
        id: 'ambiguous-id',
        subject: 'Ambiguous message',
        receivedAt: '2026-08-14T08:00:00.000Z',
      })],
      removedProviderIds: ['ambiguous-id'],
      nextCursor: 'after',
    },
  ];

  for (const response of invalidResponses) {
    await assert.rejects(
      syncMailbox({
        db,
        source: {
          provider: 'gmail',
          mailboxAddress: 'invalid-removals@example.test',
          cursorKey,
          async fetchChanges() {
            return response;
          },
        },
      }),
      error => error.code === 'INVALID_SYNC_RESPONSE' && error.status === 502,
    );
  }

  await assert.rejects(
    syncMailbox({
      db,
      source: {
        cursorKey,
        async fetchChanges() {
          return { messages: [], removedProviderIds: ['missing-scope'], nextCursor: 'after' };
        },
      },
    }),
    error => error.code === 'INVALID_SYNC_RESPONSE' && error.status === 502,
  );
  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', cursorKey).value, 'before');
});

test('sync reconciles scoped Inbox membership once and lets current membership override delta', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const cursorKey = 'mail_cursor:gmail:reconcile@example.test';
  const reconciliationKey = 'mail_reconciliation:gmail:test:v1';
  const presentId = 'gmail:reconcile@example.test:present';
  const removedId = 'gmail:reconcile@example.test:removed';
  const otherProviderId = 'outlook-reconcile-scope';
  const otherMailboxId = 'gmail:other@example.test:reconcile-scope';

  await syncMessages(db, [
    message({
      id: presentId,
      subject: 'Current Inbox message',
      receivedAt: '2026-08-14T08:00:00.000Z',
    }),
    message({
      id: removedId,
      subject: 'Stale local message',
      receivedAt: '2026-08-14T09:00:00.000Z',
    }),
  ], {
    provider: 'gmail',
    mailboxAddress: 'reconcile@example.test',
    cursorKey,
    nextCursor: 'before-reconciliation',
  });
  await syncMessages(db, [message({
    id: otherProviderId,
    subject: 'Other provider reconciliation row',
    receivedAt: '2026-08-14T10:00:00.000Z',
  })], {
    provider: 'outlook',
    mailboxAddress: 'reconcile@example.test',
  });
  await syncMessages(db, [message({
    id: otherMailboxId,
    subject: 'Other mailbox reconciliation row',
    receivedAt: '2026-08-14T11:00:00.000Z',
  })], {
    provider: 'gmail',
    mailboxAddress: 'other@example.test',
  });

  let fetchCalls = 0;
  let reconciliationCalls = 0;
  let reconciledProviderIds;
  const reconciliationSource = {
    provider: 'gmail',
    mailboxAddress: 'RECONCILE@example.test',
    cursorKey,
    reconciliationKey,
    async fetchChanges() {
      fetchCalls += 1;
      if (fetchCalls === 1) {
        return {
          messages: [message({
            id: removedId,
            subject: 'Delta incorrectly says present',
            receivedAt: '2026-08-14T09:05:00.000Z',
          })],
          removedProviderIds: [presentId],
          nextCursor: 'after-reconciliation',
        };
      }
      return { messages: [], removedProviderIds: [], nextCursor: 'after-second-sync' };
    },
    async reconcileInbox(providerIds) {
      reconciliationCalls += 1;
      reconciledProviderIds = providerIds;
      return {
        presentProviderIds: [presentId],
        removedProviderIds: [removedId],
      };
    },
  };

  assert.deepEqual(
    await syncMailbox({ db, source: reconciliationSource }),
    { imported: 0, assigned: 0 },
  );
  assert.deepEqual(reconciledProviderIds, [presentId, removedId]);
  assert.ok(email(db, presentId));
  assert.equal(email(db, removedId), undefined);
  assert.ok(email(db, otherProviderId));
  assert.ok(email(db, otherMailboxId));
  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', cursorKey).value, 'after-reconciliation');
  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', reconciliationKey).value, 'complete');

  assert.deepEqual(
    await syncMailbox({ db, source: reconciliationSource }),
    { imported: 0, assigned: 0 },
  );
  assert.equal(fetchCalls, 2);
  assert.equal(reconciliationCalls, 1);
  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', cursorKey).value, 'after-second-sync');
});

test('sync honors forced reconciliation after a completed marker and commits its removal and cursor', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const provider = 'gmail';
  const mailboxAddress = 'forced-reconciliation@example.test';
  const cursorKey = `mail_cursor:${provider}:${mailboxAddress}`;
  const reconciliationKey = 'mail_reconciliation:gmail:forced-test:v1';
  const providerId = 'gmail:forced-reconciliation@example.test:target';

  await syncMessages(db, [message({
    id: providerId,
    subject: 'Forced reconciliation target',
    receivedAt: '2026-08-14T08:00:00.000Z',
  })], { provider, mailboxAddress, cursorKey, nextCursor: 'expired-cursor' });
  db.prepare(`
    INSERT INTO sync_state (key, value) VALUES (?, 'complete')
  `).run(reconciliationKey);
  let reconciliationCalls = 0;
  let reconciledProviderIds;

  const result = await syncMailbox({
    db,
    source: {
      provider,
      mailboxAddress,
      cursorKey,
      reconciliationKey,
      async fetchChanges() {
        return {
          messages: [],
          removedProviderIds: [],
          reconciliationRequired: true,
          nextCursor: 'recovered-cursor',
        };
      },
      async reconcileInbox(providerIds) {
        reconciliationCalls += 1;
        reconciledProviderIds = providerIds;
        return { presentProviderIds: [], removedProviderIds: [providerId] };
      },
    },
  });

  assert.deepEqual(result, { imported: 0, assigned: 0 });
  assert.equal(reconciliationCalls, 1);
  assert.deepEqual(reconciledProviderIds, [providerId]);
  assert.equal(email(db, providerId), undefined);
  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', cursorKey).value, 'recovered-cursor');
  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', reconciliationKey).value, 'complete');
});

test('sync rejects invalid or unsupported forced-reconciliation flags without advancing state', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const cursorKey = 'mail_cursor:gmail:invalid-force@example.test';
  db.prepare('INSERT INTO sync_state (key, value) VALUES (?, ?)').run(cursorKey, 'before');

  await assert.rejects(
    syncMailbox({
      db,
      source: {
        provider: 'gmail',
        mailboxAddress: 'invalid-force@example.test',
        cursorKey,
        reconciliationKey: 'mail_reconciliation:gmail:invalid-force-test:v1',
        async fetchChanges() {
          return {
            messages: [],
            removedProviderIds: [],
            reconciliationRequired: 'true',
            nextCursor: 'after',
          };
        },
        async reconcileInbox() {
          return { presentProviderIds: [], removedProviderIds: [] };
        },
      },
    }),
    error => error.code === 'INVALID_SYNC_RESPONSE' && error.status === 502,
  );

  await assert.rejects(
    syncMailbox({
      db,
      source: {
        provider: 'gmail',
        mailboxAddress: 'invalid-force@example.test',
        cursorKey,
        async fetchChanges() {
          return {
            messages: [],
            removedProviderIds: [],
            reconciliationRequired: true,
            nextCursor: 'after',
          };
        },
      },
    }),
    error => error.code === 'INVALID_SYNC_RESPONSE' && error.status === 502,
  );

  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', cursorKey).value, 'before');
});

test('sync rejects incomplete or malformed reconciliation classifications before changing state', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const provider = 'gmail';
  const mailboxAddress = 'invalid-reconciliation@example.test';
  const cursorKey = `mail_cursor:${provider}:${mailboxAddress}`;
  const reconciliationKey = 'mail_reconciliation:gmail:invalid-test:v1';
  const firstId = 'gmail:invalid-reconciliation@example.test:first';
  const secondId = 'gmail:invalid-reconciliation@example.test:second';

  await syncMessages(db, [
    message({
      id: firstId,
      subject: 'First reconciliation target',
      receivedAt: '2026-08-14T08:00:00.000Z',
    }),
    message({
      id: secondId,
      subject: 'Second reconciliation target',
      receivedAt: '2026-08-14T09:00:00.000Z',
    }),
  ], { provider, mailboxAddress, cursorKey, nextCursor: 'before-reconciliation' });

  const invalidClassifications = [
    { presentProviderIds: null, removedProviderIds: [firstId, secondId] },
    { presentProviderIds: [' padded-id '], removedProviderIds: [firstId, secondId] },
    { presentProviderIds: [firstId, firstId], removedProviderIds: [secondId] },
    { presentProviderIds: [firstId], removedProviderIds: [firstId, secondId] },
    { presentProviderIds: [firstId, 'unknown-id'], removedProviderIds: [secondId] },
    { presentProviderIds: [firstId], removedProviderIds: [] },
  ];

  for (const classification of invalidClassifications) {
    await assert.rejects(
      syncMailbox({
        db,
        source: {
          provider,
          mailboxAddress,
          cursorKey,
          reconciliationKey,
          async fetchChanges() {
            return { messages: [], removedProviderIds: [], nextCursor: 'after-reconciliation' };
          },
          async reconcileInbox() {
            return classification;
          },
        },
      }),
      error => error.code === 'INVALID_SYNC_RESPONSE' && error.status === 502,
    );
  }

  assert.ok(email(db, firstId));
  assert.ok(email(db, secondId));
  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', cursorKey).value, 'before-reconciliation');
  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', reconciliationKey), undefined);
});

test('sync rolls back reconciled removals and cursor when the completion marker cannot persist', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const provider = 'gmail';
  const mailboxAddress = 'rollback-reconciliation@example.test';
  const cursorKey = `mail_cursor:${provider}:${mailboxAddress}`;
  const reconciliationKey = 'mail_reconciliation:gmail:rollback-test:v1';
  const providerId = 'gmail:rollback-reconciliation@example.test:target';

  await syncMessages(db, [message({
    id: providerId,
    subject: 'Reconciliation rollback target',
    receivedAt: '2026-08-14T08:00:00.000Z',
  })], { provider, mailboxAddress, cursorKey, nextCursor: 'before-reconciliation' });
  db.exec(`
    CREATE TRIGGER reject_reconciliation_marker
    BEFORE INSERT ON sync_state
    WHEN NEW.key = '${reconciliationKey}'
    BEGIN
      SELECT RAISE(ABORT, 'reconciliation marker failed');
    END;
  `);

  await assert.rejects(
    syncMailbox({
      db,
      source: {
        provider,
        mailboxAddress,
        cursorKey,
        reconciliationKey,
        async fetchChanges() {
          return { messages: [], removedProviderIds: [], nextCursor: 'after-reconciliation' };
        },
        async reconcileInbox() {
          return { presentProviderIds: [], removedProviderIds: [providerId] };
        },
      },
    }),
    /reconciliation marker failed/,
  );

  assert.ok(email(db, providerId));
  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', cursorKey).value, 'before-reconciliation');
  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', reconciliationKey), undefined);
});

test('sync skips reconciliation when the source becomes stale after fetching', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const provider = 'gmail';
  const mailboxAddress = 'stale-reconciliation@example.test';
  const cursorKey = `mail_cursor:${provider}:${mailboxAddress}`;
  const reconciliationKey = 'mail_reconciliation:gmail:stale-test:v1';
  const providerId = 'gmail:stale-reconciliation@example.test:target';

  await syncMessages(db, [message({
    id: providerId,
    subject: 'Stale reconciliation target',
    receivedAt: '2026-08-14T08:00:00.000Z',
  })], { provider, mailboxAddress, cursorKey, nextCursor: 'before-reconciliation' });
  let connectionChecks = 0;
  let reconciliationCalls = 0;

  const result = await syncMailbox({
    db,
    source: {
      provider,
      mailboxAddress,
      cursorKey,
      reconciliationKey,
      isCurrentConnection() {
        connectionChecks += 1;
        return connectionChecks === 1;
      },
      async fetchChanges() {
        return { messages: [], removedProviderIds: [], nextCursor: 'after-reconciliation' };
      },
      async reconcileInbox() {
        reconciliationCalls += 1;
        return { presentProviderIds: [], removedProviderIds: [providerId] };
      },
    },
  });

  assert.deepEqual(result, { imported: 0, assigned: 0, skipped: true });
  assert.equal(reconciliationCalls, 0);
  assert.ok(email(db, providerId));
  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', cursorKey).value, 'before-reconciliation');
  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', reconciliationKey), undefined);
});

test('sync leaves reconciliation pending when the source becomes stale during reconciliation', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const provider = 'gmail';
  const mailboxAddress = 'mid-reconciliation-stale@example.test';
  const cursorKey = `mail_cursor:${provider}:${mailboxAddress}`;
  const reconciliationKey = 'mail_reconciliation:gmail:mid-stale-test:v1';
  const providerId = 'gmail:mid-reconciliation-stale@example.test:target';

  await syncMessages(db, [message({
    id: providerId,
    subject: 'Mid-reconciliation stale target',
    receivedAt: '2026-08-14T08:00:00.000Z',
  })], { provider, mailboxAddress, cursorKey, nextCursor: 'before-reconciliation' });
  let connectionChecks = 0;
  let reconciliationCalls = 0;

  const result = await syncMailbox({
    db,
    source: {
      provider,
      mailboxAddress,
      cursorKey,
      reconciliationKey,
      isCurrentConnection() {
        connectionChecks += 1;
        return connectionChecks < 3;
      },
      async fetchChanges() {
        return { messages: [], removedProviderIds: [], nextCursor: 'after-reconciliation' };
      },
      async reconcileInbox() {
        reconciliationCalls += 1;
        return { presentProviderIds: [], removedProviderIds: [providerId] };
      },
    },
  });

  assert.deepEqual(result, { imported: 0, assigned: 0, skipped: true });
  assert.equal(reconciliationCalls, 1);
  assert.ok(email(db, providerId));
  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', cursorKey).value, 'before-reconciliation');
  assert.equal(one(db, 'SELECT value FROM sync_state WHERE key = ?', reconciliationKey), undefined);
});

test('overdue alerts target only the latest message in each thread', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const maya = userId(db, 'maya@lexflow.local');
  replaceRules(db, [{ name: 'Maya alert route', keywords: 'alert', assigneeId: maya, priority: 1 }]);
  updateWorkspaceSettings({ db, timeUnassignedHours: 1, timeAssignedUnmarkedHours: 1 });

  await syncMessages(db, [
    message({ id: 'assigned-alert-old', subject: 'Alert case', receivedAt: '2026-08-14T07:00:00.000Z' }),
    message({ id: 'assigned-alert-new', subject: 'Re: Alert case', receivedAt: '2026-08-14T08:00:00.000Z' }),
    message({ id: 'unassigned-alert-old', subject: 'General question', receivedAt: '2026-08-14T07:10:00.000Z' }),
    message({ id: 'unassigned-alert-new', subject: 'Fwd: General question', receivedAt: '2026-08-14T08:10:00.000Z' }),
  ]);
  db.prepare(`
    UPDATE emails SET assigned_at = '2026-08-14T08:00:00.000Z'
    WHERE thread_key = (SELECT thread_key FROM emails WHERE provider_id = 'assigned-alert-new')
  `).run();

  assert.deepEqual(
    evaluateOverdueAlerts({ db, now: new Date('2026-08-14T10:00:00.000Z') }),
    { created: 3 },
  );
  assert.deepEqual(
    db.prepare(`
      SELECT emails.provider_id, notifications.kind, count(*) AS recipient_count
      FROM notifications
      JOIN emails ON emails.id = notifications.email_id
      WHERE notifications.kind IN ('assigned_overdue', 'unassigned_overdue')
      GROUP BY emails.provider_id, notifications.kind
      ORDER BY notifications.kind
    `).all().map(row => ({ ...row })),
    [
      { provider_id: 'assigned-alert-new', kind: 'assigned_overdue', recipient_count: 2 },
      { provider_id: 'unassigned-alert-new', kind: 'unassigned_overdue', recipient_count: 1 },
    ],
  );
});

test('completing one assigned message completes its thread once and notifies admins once', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const maya = userId(db, 'maya@lexflow.local');
  replaceRules(db, [{ name: 'Maya grouped route', keywords: 'grouped', assigneeId: maya, priority: 1 }]);

  await syncMessages(db, [
    message({ id: 'grouped-1', subject: 'Grouped request', receivedAt: '2026-08-14T08:00:00.000Z' }),
    message({ id: 'grouped-2', subject: 'Re: Grouped request', receivedAt: '2026-08-14T09:00:00.000Z' }),
  ]);
  const first = email(db, 'grouped-1');
  const second = email(db, 'grouped-2');
  assert.equal(first.thread_key, second.thread_key);

  completeAssignedEmail({
    db,
    emailId: Number(first.id),
    userId: maya,
    now: new Date('2026-08-14T10:00:00.000Z'),
  });
  completeAssignedEmail({
    db,
    emailId: Number(second.id),
    userId: maya,
    now: new Date('2026-08-14T10:01:00.000Z'),
  });

  assert.deepEqual(
    db.prepare(`
      SELECT provider_id, status, completed_by, completed_at
      FROM emails WHERE thread_key = ? ORDER BY received_at
    `).all(first.thread_key).map(row => ({ ...row })),
    [
      {
        provider_id: 'grouped-1',
        status: 'completed',
        completed_by: maya,
        completed_at: '2026-08-14T10:00:00.000Z',
      },
      {
        provider_id: 'grouped-2',
        status: 'completed',
        completed_by: maya,
        completed_at: '2026-08-14T10:00:00.000Z',
      },
    ],
  );
  assert.equal(one(db, `
    SELECT count(*) AS count FROM activity
    WHERE kind = 'completed' AND email_id IN (?, ?)
  `, first.id, second.id).count, 1);
  assert.equal(one(db, `
    SELECT count(*) AS count FROM notifications
    WHERE kind = 'completion' AND email_id IN (?, ?)
  `, first.id, second.id).count, 1);
});

test('bootstrap exposes thread metadata while preserving member isolation', async (context) => {
  const db = createDatabase(':memory:');
  const [adminPasswordHash, memberPasswordHash] = await Promise.all([
    hashPassword('admin123'),
    hashPassword('welcome123'),
  ]);
  seedDemoData(db, { adminPasswordHash, memberPasswordHash });
  const admin = userId(db, 'admin@lexflow.local');
  const maya = userId(db, 'maya@lexflow.local');
  const priya = userId(db, 'priya@lexflow.local');
  replaceRules(db, []);

  await syncMessages(db, [
    message({ id: 'maya-thread-1', subject: 'Shared case', receivedAt: '2026-08-14T08:00:00.000Z' }),
    message({ id: 'maya-thread-2', subject: 'Re: Shared case', receivedAt: '2026-08-14T09:00:00.000Z' }),
  ], { mailboxAddress: 'legal@example.test' });
  await syncMessages(db, [
    message({ id: 'priya-thread-1', subject: 'Shared case', receivedAt: '2026-08-14T10:00:00.000Z' }),
  ], { mailboxAddress: 'finance@example.test' });
  for (const providerId of ['maya-thread-1', 'maya-thread-2']) {
    assignEmailManually({
      db,
      emailId: Number(email(db, providerId).id),
      assigneeId: maya,
      adminId: admin,
    });
  }
  assignEmailManually({
    db,
    emailId: Number(email(db, 'priya-thread-1').id),
    assigneeId: priya,
    adminId: admin,
  });
  const conflictedConversation = conversationForEmail(
    db,
    Number(email(db, 'maya-thread-1').id),
  );
  db.prepare(`
    UPDATE conversations
    SET data_conflict = 'native_merge_started_delivery',
        updated_at = '2026-08-26T11:00:00.000Z'
    WHERE id = ?
  `).run(conflictedConversation.id);

  const server = createApp({ db, syncRunner: { run: async () => ({}) } }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  context.after(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    db.close();
  });

  async function login(emailAddress, password) {
    const response = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: emailAddress, password }),
    });
    assert.equal(response.status, 200);
    return response.headers.get('set-cookie').split(';', 1)[0];
  }

  async function bootstrap(cookie) {
    const response = await fetch(`${baseUrl}/api/bootstrap`, { headers: { cookie } });
    assert.equal(response.status, 200);
    return response.json();
  }

  const mayaPayload = await bootstrap(await login('maya@lexflow.local', 'welcome123'));
  const priyaPayload = await bootstrap(await login('priya@lexflow.local', 'welcome123'));
  const adminPayload = await bootstrap(await login('admin@lexflow.local', 'admin123'));

  assert.deepEqual(mayaPayload.emails.map(item => item.subject), ['Re: Shared case', 'Shared case']);
  assert.ok(mayaPayload.emails.every(item => item.assignee.id === maya));
  assert.ok(mayaPayload.emails.every(item => item.threadKey && item.threadSubject === 'Shared case'));
  assert.equal(mayaPayload.emails[0].threadKey, mayaPayload.emails[1].threadKey);

  assert.deepEqual(priyaPayload.emails.map(item => item.subject), ['Shared case']);
  assert.ok(priyaPayload.emails.every(item => item.assignee.id === priya));
  assert.notEqual(priyaPayload.emails[0].threadKey, mayaPayload.emails[0].threadKey);
  assert.equal('conversationConflicts' in mayaPayload, false);
  assert.equal('conversationConflictTotal' in mayaPayload, false);
  assert.equal('conversationConflicts' in priyaPayload, false);

  assert.equal(adminPayload.emails.length, 3);
  assert.ok(adminPayload.emails.every(item => item.threadKey && item.threadSubject));
  assert.equal(adminPayload.conversationConflictTotal, 1);
  assert.deepEqual(adminPayload.conversationConflicts, [{
    conversationPublicId: conflictedConversation.publicId,
    subject: 'Shared case',
    type: 'merge_blocked',
    message: 'Related provider threads could not be combined because an assignment email had already started sending. Existing assignments were preserved.',
    detectedAt: '2026-08-26T11:00:00.000Z',
  }]);
  assert.doesNotMatch(JSON.stringify(adminPayload), /native_merge_started_delivery/u);
});

test('native backfill splits and merges legacy groups deterministically and idempotently', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);

  const maya = userId(db, 'maya@lexflow.local');
  const priya = userId(db, 'priya@lexflow.local');
  const connection = createMailboxFixture(db);
  const insertEmail = db.prepare(`
    INSERT INTO emails
      (organization_id, connection_id, provider_id, provider, mailbox_address,
       subject, thread_key, sender_name, sender_address, preview, received_at,
       status, assignee_id, assigned_at, created_at)
    VALUES (1, ?, ?, 'gmail', 'admin@lexflow.local', ?, ?, 'Sender',
            'sender@example.test', 'Preview', ?, 'assigned', ?, ?, ?)
  `);
  const first = insertEmail.run(
    connection.id,
    'canonical-a-1',
    'Matter Alpha',
    'legacy-alpha',
    '2026-08-26T08:00:00.000Z',
    maya,
    '2026-08-26T08:01:00.000Z',
    '2026-08-26T08:00:00.000Z',
  );
  const split = insertEmail.run(
    connection.id,
    'canonical-b-1',
    'Re: Matter Alpha',
    'legacy-alpha',
    '2026-08-26T09:00:00.000Z',
    maya,
    '2026-08-26T09:01:00.000Z',
    '2026-08-26T09:00:00.000Z',
  );
  const merge = insertEmail.run(
    connection.id,
    'canonical-a-2',
    'Different legacy subject',
    'legacy-beta',
    '2026-08-26T10:00:00.000Z',
    priya,
    '2026-08-26T10:01:00.000Z',
    '2026-08-26T10:00:00.000Z',
  );
  db.prepare(`
    INSERT INTO email_thread_owners (organization_id, thread_key, assignee_id, updated_at)
    VALUES (1, 'legacy-alpha', ?, '2026-08-26T11:00:00.000Z'),
           (1, 'legacy-beta', ?, '2026-08-26T11:00:00.000Z')
  `).run(maya, priya);

  migrate(db, { now: new Date('2026-08-26T12:00:00.000Z') });
  const nativeA = {
    organizationId: 1,
    mailboxIdentityId: connection.mailboxIdentityId,
    connectionId: connection.id,
    provider: 'gmail',
    mailboxAddress: 'ADMIN@LEXFLOW.LOCAL',
    nativeConversationId: 'native-a',
    emailIds: [Number(first.lastInsertRowid), Number(merge.lastInsertRowid)],
    now: new Date('2026-08-26T12:01:00.000Z'),
  };
  const nativeB = {
    ...nativeA,
    nativeConversationId: 'native-b',
    emailIds: [Number(split.lastInsertRowid)],
    now: new Date('2026-08-26T12:02:00.000Z'),
  };
  backfillNativeConversation(db, nativeA);
  backfillNativeConversation(db, nativeB);

  const snapshot = () => ({
    conversations: db.prepare(`
      SELECT id, current_assignee_id, completion_state, subject, version, data_conflict
      FROM conversations WHERE organization_id = 1 ORDER BY id
    `).all().map(row => ({ ...row })),
    sources: db.prepare(`
      SELECT conversation_id, provider, normalized_mailbox, native_conversation_id,
             fallback_key, mailbox_identity_id, last_resolved_connection_id
      FROM conversation_sources WHERE organization_id = 1
      ORDER BY coalesce(native_conversation_id, fallback_key), id
    `).all().map(row => ({ ...row })),
    emails: db.prepare(`
      SELECT id, conversation_id FROM emails
      WHERE id IN (?, ?, ?) ORDER BY id
    `).all(first.lastInsertRowid, split.lastInsertRowid, merge.lastInsertRowid)
      .map(row => ({ ...row })),
  });
  const afterFirst = snapshot();

  backfillNativeConversation(db, nativeB);
  backfillNativeConversation(db, nativeA);
  assert.deepEqual(snapshot(), afterFirst);

  const nativeASource = db.prepare(`
    SELECT conversation_id FROM conversation_sources
    WHERE native_conversation_id = 'native-a'
  `).get();
  const nativeBSource = db.prepare(`
    SELECT conversation_id FROM conversation_sources
    WHERE native_conversation_id = 'native-b'
  `).get();
  assert.notEqual(nativeASource.conversation_id, nativeBSource.conversation_id);
  assert.equal(
    Number(db.prepare('SELECT current_assignee_id FROM conversations WHERE id = ?')
      .get(nativeASource.conversation_id).current_assignee_id),
    priya,
    'an exact owner timestamp tie is broken by greatest legacy thread key',
  );
  assert.equal(
    Number(db.prepare('SELECT current_assignee_id FROM conversations WHERE id = ?')
      .get(nativeBSource.conversation_id).current_assignee_id),
    maya,
  );
  assert.equal(conversationForEmail(db, Number(first.lastInsertRowid)).id, nativeASource.conversation_id);
  assert.equal(conversationForEmail(db, Number(merge.lastInsertRowid)).id, nativeASource.conversation_id);
  assert.equal(conversationForEmail(db, Number(split.lastInsertRowid)).id, nativeBSource.conversation_id);
});

test('a confirmed unknown retry still blocks unsafe native conversation merges', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const maya = userId(db, 'maya@lexflow.local');
  replaceRules(db, [{ name: 'Merge guard', keywords: 'merge guard', assigneeId: maya, priority: 1 }]);
  const connection = createMailboxFixture(db, { capabilities: ['read', 'send'] });
  const sourceOptions = {
    provider: 'gmail',
    mailboxAddress: 'admin@lexflow.local',
    connectionId: connection.id,
    mailboxIdentityId: connection.mailboxIdentityId,
    capabilities: { read: true, send: true },
  };
  await syncMailbox({
    db,
    source: source([
      message({
        id: 'merge-guard-a',
        subject: 'Merge guard alpha',
        nativeConversationId: 'native-merge-a',
        receivedAt: '2026-08-26T08:00:00.000Z',
      }),
      message({
        id: 'merge-guard-b',
        subject: 'Merge guard beta',
        nativeConversationId: 'native-merge-b',
        receivedAt: '2026-08-26T09:00:00.000Z',
      }),
    ], sourceOptions),
    trustedAppOrigin: 'https://lexflow.example.test',
  });
  const first = email(db, 'merge-guard-a');
  const second = email(db, 'merge-guard-b');
  const firstConversation = conversationForEmail(db, Number(first.id));
  const secondConversation = conversationForEmail(db, Number(second.id));
  assert.notEqual(firstConversation.id, secondConversation.id);
  const delivery = one(db, `
    SELECT * FROM assignment_deliveries
    WHERE conversation_id = ? AND recipient_id = ?
  `, firstConversation.id, maya);
  const startedAt = '2026-08-26T09:30:00.000Z';
  db.prepare(`
    UPDATE assignment_deliveries
    SET status = 'unknown', request_started_at = NULL, updated_at = ?
    WHERE id = ?
  `).run(startedAt, delivery.id);
  db.prepare(`
    INSERT INTO assignment_delivery_attempts
      (delivery_id, attempt_number, lease_token, status, request_started_at,
       finished_at, created_at)
    VALUES (?, 1, 'merge-guard-lease', 'unknown', ?, ?, ?)
  `).run(delivery.id, startedAt, startedAt, startedAt);
  retryUnknownDelivery({
    db,
    deliveryId: Number(delivery.id),
    organizationId: 1,
    duplicateRiskConfirmed: true,
    now: new Date('2026-08-26T09:31:00.000Z'),
  });
  assert.equal(one(db, 'SELECT status FROM assignment_deliveries WHERE id = ?', delivery.id).status, 'pending');

  const conflictOptions = {
    organizationId: 1,
    conversationId: firstConversation.id,
    emailIds: [Number(first.id), Number(second.id)],
    mailboxIdentityId: connection.mailboxIdentityId,
    connectionId: connection.id,
    provider: 'gmail',
    mailboxAddress: 'admin@lexflow.local',
    nativeConversationId: 'native-merge-candidate',
    now: new Date('2026-08-26T10:00:00.000Z'),
  };
  const conflict = bindConversationSource(db, conflictOptions);
  assert.equal(conflict.dataConflict, 'native_merge_started_delivery');
  assert.equal(conversationForEmail(db, Number(first.id)).id, firstConversation.id);
  assert.equal(conversationForEmail(db, Number(second.id)).id, secondConversation.id);
  assert.equal(one(db, 'SELECT conversation_id FROM assignment_deliveries WHERE id = ?', delivery.id).conversation_id, firstConversation.id);
  assert.deepEqual(db.prepare(`
    SELECT id, data_conflict FROM conversations WHERE id IN (?, ?) ORDER BY id
  `).all(firstConversation.id, secondConversation.id).map(row => ({ ...row })), [
    { id: Math.min(firstConversation.id, secondConversation.id), data_conflict: 'native_merge_started_delivery' },
    { id: Math.max(firstConversation.id, secondConversation.id), data_conflict: 'native_merge_started_delivery' },
  ]);

  const durableSnapshot = {
    conversations: db.prepare(`
      SELECT id, version, data_conflict, updated_at
      FROM conversations WHERE id IN (?, ?) ORDER BY id
    `).all(firstConversation.id, secondConversation.id).map(row => ({ ...row })),
    mappings: db.prepare(`
      SELECT id, conversation_id FROM emails WHERE id IN (?, ?) ORDER BY id
    `).all(first.id, second.id).map(row => ({ ...row })),
    delivery: { ...one(db, `
      SELECT conversation_id, status FROM assignment_deliveries WHERE id = ?
    `, delivery.id) },
  };
  bindConversationSource(db, {
    ...conflictOptions,
    now: new Date('2026-08-26T10:05:00.000Z'),
  });
  assert.deepEqual({
    conversations: db.prepare(`
      SELECT id, version, data_conflict, updated_at
      FROM conversations WHERE id IN (?, ?) ORDER BY id
    `).all(firstConversation.id, secondConversation.id).map(row => ({ ...row })),
    mappings: db.prepare(`
      SELECT id, conversation_id FROM emails WHERE id IN (?, ?) ORDER BY id
    `).all(first.id, second.id).map(row => ({ ...row })),
    delivery: { ...one(db, `
      SELECT conversation_id, status FROM assignment_deliveries WHERE id = ?
    `, delivery.id) },
  }, durableSnapshot);
});

test('legitimate reconnect rotates one durable connection and keeps native source identity fetchable', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const before = createMailboxFixture(db);

  const emailRow = db.prepare(`
    INSERT INTO emails
      (organization_id, connection_id, provider_id, provider, mailbox_address,
       subject, thread_key, sender_name, sender_address, preview, received_at,
       status, created_at)
    VALUES (1, ?, 'reconnect-message', 'gmail', 'admin@lexflow.local',
            'Reconnect test', 'reconnect-fallback', 'Sender', 'sender@example.test',
            'Preview', '2026-08-26T10:01:00.000Z', 'unassigned',
            '2026-08-26T10:01:00.000Z')
  `).run(before.id);
  migrate(db, { now: new Date('2026-08-26T10:02:00.000Z') });
  const canonical = conversationForEmail(db, Number(emailRow.lastInsertRowid));
  bindConversationSource(db, {
    organizationId: 1,
    conversationId: canonical.id,
    emailId: Number(emailRow.lastInsertRowid),
    mailboxIdentityId: before.mailboxIdentityId,
    connectionId: before.id,
    provider: 'gmail',
    mailboxAddress: 'admin@lexflow.local',
    nativeConversationId: 'native-reconnect-thread',
    fallbackKey: 'reconnect-fallback',
    now: new Date('2026-08-26T10:03:00.000Z'),
  });

  const after = replaceConnectionGeneration({
    db,
    organizationId: 1,
    provider: 'gmail',
    account: {
      mailboxAddress: 'ADMIN@LEXFLOW.LOCAL',
      providerAccountId: 'provider-account-1',
      adminUserId: userId(db, 'admin@lexflow.local'),
      encryptedGrant: 'encrypted-grant-v2',
      grantKind: 'oauth',
      capabilities: ['send', 'read', 'send'],
    },
    now: new Date('2026-08-26T10:04:00.000Z'),
  });

  assert.equal(after.id, before.id);
  assert.equal(after.mailboxIdentityId, before.mailboxIdentityId);
  assert.equal(after.generation, before.generation + 1);
  assert.deepEqual(after.capabilities, ['read', 'send']);
  assert.equal(resolveMailboxConnection({
    db,
    organizationId: 1,
    mailboxIdentityId: before.mailboxIdentityId,
  }).encryptedGrant, 'encrypted-grant-v2');
  assert.equal(db.prepare(`
    SELECT mailbox_identity_id FROM conversation_sources
    WHERE native_conversation_id = 'native-reconnect-thread'
  `).get().mailbox_identity_id, before.mailboxIdentityId);
  assert.equal(db.prepare(`
    SELECT last_resolved_connection_id FROM conversation_sources
    WHERE native_conversation_id = 'native-reconnect-thread'
  `).get().last_resolved_connection_id, before.id);

  assert.throws(
    () => replaceConnectionGeneration({
      db,
      organizationId: 1,
      provider: 'gmail',
      account: {
        mailboxAddress: 'different@lexflow.local',
        providerAccountId: 'provider-account-2',
        adminUserId: userId(db, 'admin@lexflow.local'),
        encryptedGrant: 'must-not-replace',
        capabilities: ['read', 'send'],
      },
    }),
    error => error.code === 'MAILBOX_IDENTITY_MISMATCH',
  );
  assert.equal(resolveMailboxConnection({ db, organizationId: 1, provider: 'gmail' }).id, before.id);
});

test('a native Inbox reply reopens one canonical conversation for its sticky assignee', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const maya = userId(db, 'maya@lexflow.local');
  replaceRules(db, [{
    name: 'Maya native route',
    keywords: 'native renewal',
    assigneeId: maya,
    priority: 1,
  }]);
  const connection = createMailboxFixture(db, { capabilities: ['read', 'send'] });
  const sourceOptions = {
    provider: 'gmail',
    mailboxAddress: 'admin@lexflow.local',
    connectionId: connection.id,
    mailboxIdentityId: connection.mailboxIdentityId,
    capabilities: { read: true, send: true },
  };

  await syncMailbox({
    db,
    source: source([message({
      id: 'native-reopen-base',
      subject: 'Native renewal',
      nativeConversationId: 'gmail-thread-native-reopen',
      receivedAt: '2026-08-26T08:00:00.000Z',
    })], sourceOptions),
    trustedAppOrigin: 'https://lexflow.example.test',
  });
  const base = email(db, 'native-reopen-base');
  const canonicalBeforeCompletion = conversationForEmail(db, Number(base.id));
  assert.equal(canonicalBeforeCompletion.currentAssigneeId, maya);
  assert.equal(canonicalBeforeCompletion.completionState, 'assigned');
  assert.equal(db.prepare(`
    SELECT count(*) AS count FROM assignment_deliveries
    WHERE conversation_id = ? AND recipient_id = ?
  `).get(canonicalBeforeCompletion.id, maya).count, 1);

  completeAssignedEmail({
    db,
    emailId: Number(base.id),
    userId: maya,
    now: new Date('2026-08-26T09:00:00.000Z'),
  });
  const completed = conversationForEmail(db, Number(base.id));
  assert.equal(completed.completionState, 'completed');

  await syncMailbox({
    db,
    source: source([message({
      id: 'native-reopen-reply',
      subject: 'Re: Native renewal',
      nativeConversationId: 'gmail-thread-native-reopen',
      receivedAt: '2026-08-26T10:00:00.000Z',
    })], { ...sourceOptions, nextCursor: 'cursor-after-reply' }),
    trustedAppOrigin: 'https://lexflow.example.test',
  });
  const reply = email(db, 'native-reopen-reply');
  const reopened = conversationForEmail(db, Number(reply.id));

  assert.equal(reopened.id, completed.id);
  assert.equal(reopened.currentAssigneeId, maya);
  assert.equal(reopened.completionState, 'assigned');
  assert.equal(canonicalBeforeCompletion.version, 1);
  assert.equal(completed.version, 2);
  assert.equal(reopened.version, 3);
  assert.equal(reply.status, 'assigned');
  assert.equal(Number(reply.assignee_id), maya);
  assert.equal(email(db, 'native-reopen-base').status, 'completed');
  assert.equal(db.prepare(`
    SELECT count(*) AS count FROM assignment_deliveries
    WHERE conversation_id = ? AND recipient_id = ?
  `).get(reopened.id, maya).count, 1, 'a reply must not create a second delivery');

  await syncMailbox({
    db,
    source: source([message({
      id: 'native-reopen-reply',
      subject: 'Re: Native renewal',
      nativeConversationId: 'gmail-thread-native-reopen',
      receivedAt: '2026-08-26T10:00:00.000Z',
    })], { ...sourceOptions, nextCursor: 'cursor-after-replay' }),
    trustedAppOrigin: 'https://lexflow.example.test',
  });
  assert.equal(conversationForEmail(db, Number(reply.id)).version, 3);
});

test('manual reassignment follows canonical state when invoked from a completed child row', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const admin = userId(db, 'admin@lexflow.local');
  const maya = userId(db, 'maya@lexflow.local');
  const priya = userId(db, 'priya@lexflow.local');
  replaceRules(db, [{ name: 'Maya canonical route', keywords: 'canonical', assigneeId: maya, priority: 1 }]);

  await syncMessages(db, [message({
    id: 'canonical-manual-base',
    subject: 'Canonical ownership',
    receivedAt: '2026-08-26T08:00:00.000Z',
  })]);
  const base = email(db, 'canonical-manual-base');
  completeAssignedEmail({
    db,
    emailId: Number(base.id),
    userId: maya,
    now: new Date('2026-08-26T09:00:00.000Z'),
  });
  await syncMessages(db, [message({
    id: 'canonical-manual-reply',
    subject: 'Re: Canonical ownership',
    receivedAt: '2026-08-26T10:00:00.000Z',
  })]);

  const result = assignEmailManually({
    db,
    emailId: Number(base.id),
    assigneeId: priya,
    adminId: admin,
    now: new Date('2026-08-26T11:00:00.000Z'),
  });
  const reply = email(db, 'canonical-manual-reply');

  assert.equal(result.changed, true);
  assert.equal(email(db, 'canonical-manual-base').status, 'completed');
  assert.equal(Number(reply.assignee_id), priya);
  assert.equal(conversationForEmail(db, Number(reply.id)).currentAssigneeId, priya);
});

test('a verified assignment-digest reply rejoins and reopens the current canonical assignee', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const admin = userId(db, 'admin@lexflow.local');
  const maya = userId(db, 'maya@lexflow.local');
  const priya = userId(db, 'priya@lexflow.local');
  replaceRules(db, [{ name: 'Original Maya route', keywords: 'digest source', assigneeId: maya, priority: 1 }]);
  const connection = createMailboxFixture(db, { capabilities: ['read', 'send'] });
  const sourceOptions = {
    provider: 'gmail',
    mailboxAddress: 'admin@lexflow.local',
    connectionId: connection.id,
    mailboxIdentityId: connection.mailboxIdentityId,
  };

  await syncMailbox({
    db,
    source: source([message({
      id: 'digest-correlation-base',
      subject: 'Digest source matter',
      nativeConversationId: 'native-original-source',
      receivedAt: '2026-08-26T08:00:00.000Z',
    })], sourceOptions),
    trustedAppOrigin: 'https://lexflow.example.test',
  });
  const base = email(db, 'digest-correlation-base');
  const original = conversationForEmail(db, Number(base.id));
  const delivery = one(db, `
    SELECT * FROM assignment_deliveries
    WHERE conversation_id = ? AND recipient_id = ?
  `, original.id, maya);
  const acceptedAt = '2026-08-26T08:30:00.000Z';
  db.prepare(`
    UPDATE assignment_deliveries
    SET status = 'accepted', attempt_count = 1, next_attempt_at = NULL,
        request_started_at = ?, accepted_at = ?, updated_at = ?
    WHERE id = ?
  `).run(acceptedAt, acceptedAt, acceptedAt, delivery.id);
  db.prepare(`
    INSERT INTO assignment_delivery_attempts
      (delivery_id, attempt_number, lease_token, status, request_started_at,
       finished_at, created_at)
    VALUES (?, 1, 'digest-correlation-lease', 'accepted', ?, ?, ?)
  `).run(delivery.id, acceptedAt, acceptedAt, acceptedAt);

  assignEmailManually({
    db,
    emailId: Number(base.id),
    assigneeId: priya,
    adminId: admin,
    now: new Date('2026-08-26T09:00:00.000Z'),
  });
  completeAssignedEmail({
    db,
    emailId: Number(base.id),
    userId: priya,
    now: new Date('2026-08-26T09:30:00.000Z'),
  });
  const beforeReply = conversationForEmail(db, Number(base.id));

  await syncMailbox({
    db,
    source: source([message({
      id: 'digest-correlation-reply',
      subject: 'A renamed response that cannot match by subject',
      senderAddress: 'maya@lexflow.local',
      nativeConversationId: 'native-delivery-reply',
      inReplyTo: delivery.message_id,
      receivedAt: '2026-08-26T10:00:00.000Z',
    })], { ...sourceOptions, nextCursor: 'cursor-after-correlated-reply' }),
    trustedAppOrigin: 'https://lexflow.example.test',
  });
  const reply = email(db, 'digest-correlation-reply');
  const reopened = conversationForEmail(db, Number(reply.id));

  assert.equal(reopened.id, original.id);
  assert.equal(reopened.currentAssigneeId, priya);
  assert.equal(reopened.completionState, 'assigned');
  assert.equal(reopened.version, beforeReply.version + 1);
  assert.equal(Number(reply.assignee_id), priya);
  assert.equal(one(db, `
    SELECT conversation_id FROM conversation_sources
    WHERE native_conversation_id = 'native-delivery-reply'
  `).conversation_id, original.id);

  const originalVersion = reopened.version;
  await syncMailbox({
    db,
    source: source([message({
      id: 'digest-correlation-outbound',
      subject: 'Outbound context must not reopen work',
      senderAddress: 'maya@lexflow.local',
      nativeConversationId: 'native-outbound-copy',
      inReplyTo: delivery.message_id,
      direction: 'sent',
      receivedAt: '2026-08-26T11:00:00.000Z',
    })], { ...sourceOptions, nextCursor: 'cursor-after-outbound' }),
    trustedAppOrigin: 'https://lexflow.example.test',
  });
  const outbound = email(db, 'digest-correlation-outbound');
  assert.notEqual(conversationForEmail(db, Number(outbound.id)).id, original.id);
  assert.equal(outbound.status, 'unassigned');
  assert.equal(conversationForEmail(db, Number(reply.id)).version, originalVersion);
});

test('manual canonical reassignment atomically cancels an unstarted former delivery', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const admin = userId(db, 'admin@lexflow.local');
  const maya = userId(db, 'maya@lexflow.local');
  const priya = userId(db, 'priya@lexflow.local');
  replaceRules(db, [{ name: 'Maya handoff', keywords: 'handoff', assigneeId: maya, priority: 1 }]);
  const connection = createMailboxFixture(db, { capabilities: ['read', 'send'] });

  await syncMailbox({
    db,
    source: source([message({
      id: 'canonical-handoff',
      subject: 'Handoff matter',
      nativeConversationId: 'gmail-thread-handoff',
      receivedAt: '2026-08-26T08:00:00.000Z',
    })], {
      provider: 'gmail',
      mailboxAddress: 'admin@lexflow.local',
      connectionId: connection.id,
      mailboxIdentityId: connection.mailboxIdentityId,
      capabilities: { read: true, send: true },
    }),
    trustedAppOrigin: 'https://lexflow.example.test',
  });
  const row = email(db, 'canonical-handoff');
  const canonical = conversationForEmail(db, Number(row.id));
  assert.equal(db.prepare(`
    SELECT status FROM assignment_deliveries
    WHERE conversation_id = ? AND recipient_id = ?
  `).get(canonical.id, maya).status, 'pending');

  assignEmailManually({
    db,
    emailId: Number(row.id),
    assigneeId: priya,
    adminId: admin,
    trustedAppOrigin: 'https://lexflow.example.test',
    now: new Date('2026-08-26T09:00:00.000Z'),
  });

  assert.equal(conversationForEmail(db, Number(row.id)).currentAssigneeId, priya);
  assert.deepEqual(
    db.prepare(`
      SELECT recipient_id, status FROM assignment_deliveries
      WHERE conversation_id = ? ORDER BY recipient_id
    `).all(canonical.id).map(item => ({ ...item })),
    [
      { recipient_id: maya, status: 'cancelled' },
      { recipient_id: priya, status: 'pending' },
    ],
  );
});

test('manual organization sync neither fetches nor returns another organization source', async (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  const createdAt = '2026-08-26T10:00:00.000Z';
  const otherOrganizationId = Number(db.prepare(`
    INSERT INTO organizations
      (handle, join_code, name, normalized_domain, domain_verified, created_at, updated_at)
    VALUES ('sync-org-two', 'SYNC-ORG-TWO', 'Sync Org Two', 'sync-two.test', 0, ?, ?)
  `).run(createdAt, createdAt).lastInsertRowid);
  db.prepare(`
    INSERT INTO workspace_settings
      (organization_id, time_unassigned_hours, time_assigned_unmarked_hours)
    VALUES (?, 1, 24)
  `).run(otherOrganizationId);
  const calls = { first: 0, second: 0 };
  const makeSource = (organizationId, mailboxAddress, key) => ({
    organizationId,
    provider: 'gmail',
    mailboxAddress,
    cursorKey: `mail_cursor:${key}`,
    async fetchChanges() {
      calls[key] += 1;
      return { messages: [], removedProviderIds: [], nextCursor: `${key}-cursor` };
    },
  });
  const runner = createSyncRunner({
    db,
    sources: [
      makeSource(1, 'first@example.test', 'first'),
      makeSource(otherOrganizationId, 'second@example.test', 'second'),
    ],
  });

  const first = runner.run({ organizationId: 1 });
  assert.equal(runner.run({ organizationId: 1 }), first);
  const result = await first;

  assert.equal(calls.first, 1);
  assert.equal(calls.second, 0);
  assert.deepEqual(result.sources, [{
    provider: 'gmail',
    account: 'first@example.test',
    imported: 0,
    assigned: 0,
  }]);
  assert.ok(result.sources.every(item => item.account !== 'second@example.test'));
});
