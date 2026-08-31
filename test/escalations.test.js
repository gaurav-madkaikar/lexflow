import assert from 'node:assert/strict';
import test from 'node:test';

import { createDatabase } from '../src/db.js';
import { evaluateEscalations } from '../src/escalations.js';
import { replaceEscalationRecipients, updateWorkspaceSettings } from '../src/workspace.js';

function fixture() {
  const db = createDatabase(':memory:');
  const startedAt = '2026-09-01T00:00:00.000Z';
  const departmentId = Number(db.prepare(`INSERT INTO departments (name, shared_mailbox, created_at, organization_id)
    VALUES ('Legal', 'legal@example.test', ?, 1)`).run(startedAt).lastInsertRowid);
  const userId = Number(db.prepare(`INSERT INTO users
    (email, name, initials, department, role, organization_id, auth_provider, account_status, department_id)
    VALUES ('maya@example.test', 'Maya Shah', 'MS', 'Legal', 'member', 1, 'entra', 'active', ?)`)
    .run(departmentId).lastInsertRowid);
  db.prepare('UPDATE departments SET head_user_id = ? WHERE id = ?').run(userId, departmentId);
  const emailId = Number(db.prepare(`INSERT INTO emails
    (provider_id, provider, mailbox_address, subject, sender_name, sender_address, preview, received_at, status, assignee_id, assigned_at, created_at, organization_id, department_id)
    VALUES ('m1', 'outlook', 'legal@example.test', 'Contract review', 'Client', 'client@example.test', 'private preview', ?, 'assigned', ?, ?, ?, 1, ?)`)
    .run(startedAt, userId, startedAt, startedAt, departmentId).lastInsertRowid);
  const conversationId = Number(db.prepare(`INSERT INTO conversations
    (organization_id, department_id, provider, normalized_mailbox, native_conversation_id, fallback_key, subject, status, assignee_id, first_received_at, latest_received_at, latest_email_id, message_count, version, created_at, updated_at)
    VALUES (1, ?, 'outlook', 'legal@example.test', 'thread-1', NULL, 'Contract review', 'assigned', ?, ?, ?, ?, 1, 1, ?, ?)`)
    .run(departmentId, userId, startedAt, startedAt, emailId, startedAt, startedAt).lastInsertRowid);
  db.prepare('UPDATE emails SET conversation_id = ? WHERE id = ?').run(conversationId, emailId);
  db.prepare(`INSERT INTO assignment_cycles
    (conversation_id, organization_id, department_id, assignee_id, assignment_source, priority, started_at, created_at)
    VALUES (?, 1, ?, ?, 'manual', 20, ?, ?)`)
    .run(conversationId, departmentId, userId, startedAt, startedAt);
  updateWorkspaceSettings({ db, organizationId: 1, timeUnassignedHours: 1, timeAssignedUnmarkedHours: 24, escalationIntervalHours: 24 });
  replaceEscalationRecipients({ db, organizationId: 1, departmentId, recipients: ['lead@example.test'], now: new Date(startedAt) });
  return { db, departmentId, conversationId };
}

test('due escalation sends one safe shared-mailbox message and records its level', async () => {
  const { db, departmentId } = fixture();
  const calls = [];
  const result = await evaluateEscalations({
    db, organizationId: 1, now: new Date('2026-09-02T00:01:00.000Z'),
    outlook: { async sendEscalation(payload) { calls.push(payload); return { requestId: 'request-1' }; } },
  });
  assert.deepEqual(result, { sent: 1, failed: 0, skipped: 0 });
  assert.equal(calls[0].departmentId, departmentId);
  assert.equal(calls[0].recipient, 'lead@example.test');
  assert.match(calls[0].subject, /^Escalation Level 1:/);
  assert.match(calls[0].html, /Maya Shah/);
  assert.doesNotMatch(calls[0].html, /private preview|Client/);
  assert.equal(db.prepare("SELECT state FROM escalation_deliveries").get().state, 'sent');
  db.close();
});

test('completion or a missing hierarchy level prevents obsolete sends', async () => {
  const { db, conversationId } = fixture();
  db.prepare("UPDATE conversations SET status = 'completed' WHERE id = ?").run(conversationId);
  const result = await evaluateEscalations({
    db, organizationId: 1, now: new Date('2026-09-02T00:01:00.000Z'),
    outlook: { async sendEscalation() { throw new Error('must not send'); } },
  });
  assert.equal(result.sent, 0);
  assert.equal(db.prepare("SELECT count(*) AS count FROM escalation_deliveries WHERE state = 'sent'").get().count, 0);
  db.close();
});
