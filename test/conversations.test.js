import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attachEmailToConversation,
  conversationIdentity,
  normalizeFallbackSubject,
  reconcileConversationWorkflowState,
} from '../src/conversations.js';
import { createDatabase } from '../src/db.js';
import { recordTaskEvent } from '../src/reporting-events.js';
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

test('workflow reconciliation uses the latest assignment event and normalizes every message', () => {
  const db = createDatabase(':memory:');
  const createdAt = '2026-08-31T08:00:00.000Z';
  const departmentId = Number(db.prepare(`
    INSERT INTO departments (name, shared_mailbox, created_at, organization_id)
    VALUES ('Legal', 'legal@example.test', ?, 1)
  `).run(createdAt).lastInsertRowid);
  const addUser = db.prepare(`
    INSERT INTO users
      (email, name, initials, department, role, organization_id, auth_provider,
       account_status, department_id)
    VALUES (?, ?, ?, 'Legal', 'member', 1, 'entra', 'active', ?)
  `);
  const firstUser = Number(addUser.run('first@example.test', 'First User', 'FU', departmentId).lastInsertRowid);
  const secondUser = Number(addUser.run('second@example.test', 'Second User', 'SU', departmentId).lastInsertRowid);
  const addEmail = db.prepare(`
    INSERT INTO emails
      (provider_id, provider, mailbox_address, provider_conversation_id, subject,
       sender_name, sender_address, preview, received_at, status, created_at,
       organization_id, department_id)
    VALUES (?, 'outlook', 'legal@example.test', 'thread-reconcile', 'Case',
      'Client', 'client@example.test', '', ?, 'unassigned', ?, 1, ?)
  `);
  const firstEmail = Number(addEmail.run('reconcile-1', createdAt, createdAt, departmentId).lastInsertRowid);
  const secondEmail = Number(addEmail.run('reconcile-2', '2026-08-31T09:00:00.000Z', createdAt, departmentId).lastInsertRowid);
  attachEmailToConversation(db, firstEmail);
  const { conversation } = attachEmailToConversation(db, secondEmail);
  recordTaskEvent(db, {
    organizationId: 1, departmentId, emailId: firstEmail, assigneeId: firstUser,
    eventType: 'assigned', assignmentSource: 'manual', receivedAt: createdAt,
    occurredAt: '2026-08-31T08:30:00.000Z', assigneeNameSnapshot: 'First User',
  });
  recordTaskEvent(db, {
    organizationId: 1, departmentId, emailId: secondEmail, assigneeId: secondUser,
    eventType: 'assigned', assignmentSource: 'rule', receivedAt: '2026-08-31T09:00:00.000Z',
    occurredAt: '2026-08-31T09:30:00.000Z', assigneeNameSnapshot: 'Second User',
  });

  reconcileConversationWorkflowState(db);

  assert.equal(Number(db.prepare('SELECT assignee_id FROM conversations WHERE id = ?').get(conversation.id).assignee_id), secondUser);
  assert.deepEqual(
    db.prepare('SELECT DISTINCT status, assignee_id FROM emails WHERE conversation_id = ?').all(conversation.id)
      .map(row => ({ status: row.status, assignee_id: Number(row.assignee_id) })),
    [{ status: 'assigned', assignee_id: secondUser }],
  );
  db.close();
});
