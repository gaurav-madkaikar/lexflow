import assert from 'node:assert/strict';
import test from 'node:test';
import { conversationIdentity, normalizeFallbackSubject } from '../src/conversations.js';
import { createDatabase } from '../src/db.js';

test('native Outlook conversation identity is authoritative', () => {
  assert.deepEqual(conversationIdentity({
    conversationId: 'AAQk-thread',
    subject: 'Re: NDA',
    senderAddress: 'a@example.com',
  }, { receivedAt: '2026-08-31T10:00:00Z' }), {
    nativeConversationId: 'AAQk-thread',
    fallbackKey: null,
  });
});

test('fallback identity normalizes reply prefixes, sender, and time bucket', () => {
  assert.equal(normalizeFallbackSubject(' RE: Fwd:  NDA   Review '), 'nda review');
  const identity = conversationIdentity({
    subject: 'Re: NDA Review',
    senderAddress: 'A@Example.com',
  }, { receivedAt: '2026-08-31T10:00:00Z' });
  assert.match(identity.fallbackKey, /^nda review\|a@example\.com\|\d+$/);
});

test('database creates conversation task storage', () => {
  const db = createDatabase(':memory:');
  assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='conversations'").get());
  assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='assignment_cycles'").get());
  assert.ok(db.prepare("SELECT 1 FROM pragma_table_info('emails') WHERE name='conversation_id'").get());
  db.close();
});
