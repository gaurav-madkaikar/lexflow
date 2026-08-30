import assert from 'node:assert/strict';
import test from 'node:test';
import { conversationIdentity, normalizeFallbackSubject } from '../src/conversations.js';
import { createDatabase } from '../src/db.js';
import { completeAssignedEmail, syncMailbox } from '../src/workflows.js';

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

test('a new Outlook reply reopens a completed conversation to its previous assignee once', async () => {
  const db = createDatabase(':memory:');
  const now = '2026-08-31T10:00:00.000Z';
  const departmentId = Number(db.prepare(`
    INSERT INTO departments (name, shared_mailbox, created_at, organization_id)
    VALUES ('Legal', 'legal@example.test', ?, 1)
  `).run(now).lastInsertRowid);
  const userId = Number(db.prepare(`
    INSERT INTO users
      (email, name, initials, department, role, organization_id, auth_provider,
       account_status, department_id)
    VALUES ('member@example.test', 'Member One', 'MO', 'Legal', 'member', 1,
      'entra', 'active', ?)
  `).run(departmentId).lastInsertRowid);
  db.prepare('UPDATE departments SET head_user_id = ? WHERE id = ?').run(userId, departmentId);
  db.prepare(`
    INSERT INTO rules
      (name, keywords, sender_filter, assignee_id, priority, enabled, created_at,
       organization_id, department_id)
    VALUES ('Case rule', 'case', '', ?, 10, 1, ?, 1, ?)
  `).run(userId, now, departmentId);

  let round = 0;
  const source = {
    provider: 'outlook', organizationId: 1, departmentId,
    mailboxAddress: 'legal@example.test', cursorKey: 'thread-test',
    async fetchChanges() {
      round += 1;
      return {
        messages: [{
          providerId: `outlook:legal@example.test:m${round}`,
          conversationId: 'native-thread-1', internetMessageId: `<m${round}@example.test>`,
          provider: 'outlook', mailboxAddress: 'legal@example.test',
          subject: round === 1 ? 'Case review' : 'Re: Case review',
          senderName: 'Client', senderAddress: 'client@example.test', preview: `Message ${round}`,
          receivedAt: `2026-08-31T1${round}:00:00.000Z`, webUrl: null,
        }],
        nextCursor: `cursor-${round}`,
      };
    },
  };

  await syncMailbox({ db, source });
  const first = db.prepare('SELECT * FROM emails ORDER BY id LIMIT 1').get();
  completeAssignedEmail({ db, emailId: first.id, userId, organizationId: 1, now: new Date('2026-08-31T11:30:00.000Z') });
  await syncMailbox({ db, source });
  await syncMailbox({ db, source: { ...source, async fetchChanges() { return { messages: [], nextCursor: 'cursor-2' }; } } });

  const conversation = db.prepare('SELECT * FROM conversations WHERE native_conversation_id = ?').get('native-thread-1');
  assert.equal(conversation.message_count, 2);
  assert.equal(conversation.status, 'assigned');
  assert.equal(Number(conversation.assignee_id), userId);
  assert.deepEqual(
    db.prepare('SELECT assignment_source FROM assignment_cycles WHERE conversation_id = ? ORDER BY id').all(conversation.id)
      .map(row => row.assignment_source),
    ['rule', 'reopen_previous'],
  );
  db.close();
});
