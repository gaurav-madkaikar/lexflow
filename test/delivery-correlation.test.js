import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import {
  correlateInboundReply,
  correlateInboundReplyDetailed,
} from '../src/delivery-correlation.js';

const TOKENS = Object.freeze({
  acmeAccepted: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  otherAccepted: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  acmeUnknown: 'cccccccccccccccccccccccccccccccc',
  pending: 'dddddddddddddddddddddddddddddddd',
  otherMailbox: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  unstarted: 'ffffffffffffffffffffffffffffffff',
  unknown: '999999999999999999999999999999',
});

function messageId(token) {
  return `<lf-${token}@lexflow.test>`;
}

function fixture(context) {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      registration_status TEXT NOT NULL
    );
    CREATE TABLE assignment_deliveries (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      conversation_id INTEGER NOT NULL,
      recipient_id INTEGER NOT NULL,
      mailbox_identity_id INTEGER,
      connection_generation INTEGER,
      provider TEXT,
      mailbox_address TEXT,
      message_id TEXT NOT NULL,
      status TEXT NOT NULL,
      request_started_at TEXT
    );
    CREATE TABLE delivery_attempts (
      id INTEGER PRIMARY KEY,
      delivery_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      request_started_at TEXT
    );
    CREATE TABLE conversation_sources (
      id INTEGER PRIMARY KEY,
      organization_id INTEGER NOT NULL,
      conversation_id INTEGER NOT NULL,
      mailbox_identity_id INTEGER,
      provider TEXT NOT NULL,
      normalized_mailbox TEXT NOT NULL,
      native_conversation_id TEXT
    );

    INSERT INTO users VALUES
      (7, 1, 'maya@example.test', 'active'),
      (8, 1, 'priya@example.test', 'active'),
      (9, 2, 'maya@example.test', 'active'),
      (10, 1, 'disabled@example.test', 'disabled');

    INSERT INTO assignment_deliveries VALUES
      (1, 1, 10, 7, 50, 2, 'gmail', 'admin@example.test',
       '${messageId(TOKENS.acmeAccepted)}', 'accepted', '2026-08-26T09:00:00.000Z'),
      (2, 1, 20, 8, 50, 5, 'gmail', 'admin@example.test',
       '${messageId(TOKENS.otherAccepted)}', 'accepted', '2026-08-26T09:01:00.000Z'),
      (3, 1, 10, 7, 50, 9, 'gmail', 'admin@example.test',
       '${messageId(TOKENS.acmeUnknown)}', 'unknown', '2026-08-26T09:02:00.000Z'),
      (4, 1, 10, 7, 50, 2, 'gmail', 'admin@example.test',
       '${messageId(TOKENS.pending)}', 'pending', NULL),
      (5, 1, 10, 7, 51, 2, 'gmail', 'other-admin@example.test',
       '${messageId(TOKENS.otherMailbox)}', 'accepted', '2026-08-26T09:03:00.000Z'),
      (6, 1, 10, 7, 50, 2, 'gmail', 'admin@example.test',
       '${messageId(TOKENS.unstarted)}', 'accepted', NULL);

    INSERT INTO delivery_attempts VALUES
      (1, 1, 'accepted', '2026-08-26T09:00:00.000Z'),
      (2, 2, 'accepted', '2026-08-26T09:01:00.000Z'),
      (3, 3, 'unknown', '2026-08-26T09:02:00.000Z'),
      (4, 5, 'accepted', '2026-08-26T09:03:00.000Z'),
      (5, 6, 'accepted', NULL);

    INSERT INTO conversation_sources VALUES
      (1, 1, 10, 50, 'gmail', 'admin@example.test', 'native-existing'),
      (2, 1, 20, 50, 'gmail', 'admin@example.test', 'native-conflict');
  `);
  context.after(() => db.close());
  return db;
}

function correlate(db, overrides = {}) {
  return correlateInboundReply({
    db,
    organizationId: 1,
    mailboxIdentityId: 50,
    provider: 'gmail',
    mailboxAddress: 'admin@example.test',
    nativeConversationId: 'native-new-reply',
    message: {
      senderAddress: 'maya@example.test',
      inReplyTo: messageId(TOKENS.acmeAccepted),
      references: [],
      subject: 'Re: Acme renewal',
    },
    ...overrides,
  });
}

test('an eligible exact reply correlates by durable mailbox identity across connection generations', context => {
  const db = fixture(context);
  assert.deepEqual(correlate(db), { conversationId: 10 });
  assert.deepEqual(correlate(db, {
    nativeConversationId: 'native-existing',
    message: {
      sender: { address: 'MAYA@EXAMPLE.TEST' },
      references: [
        '<ordinary@example.test>',
        messageId(TOKENS.acmeAccepted).toUpperCase(),
        messageId(TOKENS.acmeUnknown),
      ],
    },
  }), { conversationId: 10 });
});

test('subject-only, malformed, unknown, and mixed-known references fail closed', context => {
  const db = fixture(context);
  assert.equal(correlate(db, {
    message: { senderAddress: 'maya@example.test', subject: 'Re: Acme renewal' },
  }), null);
  assert.equal(correlate(db, {
    message: {
      senderAddress: 'maya@example.test',
      inReplyTo: '<lf-short@lexflow.test>',
    },
  }), null);
  assert.equal(correlate(db, {
    message: {
      senderAddress: 'maya@example.test',
      inReplyTo: messageId(TOKENS.unknown),
    },
  }), null);
  assert.equal(correlate(db, {
    message: {
      senderAddress: 'maya@example.test',
      references: [messageId(TOKENS.acmeAccepted), messageId(TOKENS.unknown)],
    },
  }), null);
});

test('references spanning multiple canonical conversations are rejected', context => {
  const db = fixture(context);
  assert.equal(correlate(db, {
    message: {
      senderAddress: 'maya@example.test',
      references: [
        messageId(TOKENS.acmeAccepted),
        messageId(TOKENS.otherAccepted),
      ],
    },
  }), null);
});

test('sender must exactly match every registered active delivery recipient', context => {
  const db = fixture(context);
  assert.equal(correlate(db, {
    message: {
      senderAddress: 'attacker@example.test',
      inReplyTo: messageId(TOKENS.acmeAccepted),
    },
  }), null);
  assert.equal(correlate(db, {
    message: {
      senderAddress: 'maya@example.test',
      references: [
        messageId(TOKENS.acmeAccepted),
        messageId(TOKENS.otherAccepted),
      ],
    },
  }), null);
});

test('organization, mailbox identity, provider, and mailbox scope are exact', context => {
  const db = fixture(context);
  assert.equal(correlate(db, { organizationId: 2 }), null);
  assert.equal(correlate(db, { mailboxIdentityId: 51 }), null);
  assert.equal(correlate(db, { provider: 'outlook' }), null);
  assert.equal(correlate(db, { mailboxAddress: 'other-admin@example.test' }), null);
});

test('pending or unstarted delivery attempts cannot establish correlation', context => {
  const db = fixture(context);
  assert.equal(correlate(db, {
    message: {
      senderAddress: 'maya@example.test',
      inReplyTo: messageId(TOKENS.pending),
    },
  }), null);
  assert.equal(correlate(db, {
    message: {
      senderAddress: 'maya@example.test',
      inReplyTo: messageId(TOKENS.unstarted),
    },
  }), null);
});

test('native source may be unmapped or mapped to the same canonical, never a conflicting one', context => {
  const db = fixture(context);
  assert.deepEqual(correlate(db, { nativeConversationId: 'native-existing' }), {
    conversationId: 10,
  });
  assert.equal(correlate(db, { nativeConversationId: 'native-conflict' }), null);
});

test('detailed failures expose sanitized reason codes only', context => {
  const db = fixture(context);
  assert.deepEqual(correlateInboundReplyDetailed({
    db,
    organizationId: 1,
    mailboxIdentityId: 50,
    provider: 'gmail',
    mailboxAddress: 'admin@example.test',
    nativeConversationId: 'native-new-reply',
    message: {
      senderAddress: 'attacker@example.test',
      inReplyTo: messageId(TOKENS.acmeAccepted),
    },
  }), { conversationId: null, reason: 'sender_mismatch' });
  const serialized = JSON.stringify(correlateInboundReplyDetailed({
    db,
    organizationId: 1,
    mailboxIdentityId: 50,
    provider: 'gmail',
    mailboxAddress: 'admin@example.test',
    nativeConversationId: 'native-new-reply',
    message: { inReplyTo: messageId(TOKENS.unknown) },
  }));
  assert.doesNotMatch(serialized, /999999|maya@|attacker@|admin@/i);
});

test('correlation performs no database writes', context => {
  const db = fixture(context);
  const before = db.serialize();
  assert.deepEqual(correlate(db), { conversationId: 10 });
  assert.deepEqual(db.serialize(), before);
});
