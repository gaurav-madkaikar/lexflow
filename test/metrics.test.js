import assert from 'node:assert/strict';
import test from 'node:test';

import { createDatabase, seedDemoData } from '../src/db.js';
import {
  getDepartmentMetrics,
  getMemberMetrics,
  getOrganizationMetrics,
  getPlatformMetrics,
  normalizeMetricsQuery,
} from '../src/metrics.js';
import { recordRuleAssignment, recordTaskEvent } from '../src/reporting-events.js';

function card(payload, id) {
  return payload.cards.find(item => item.id === id);
}

test('metric ranges honor IANA zones, DST, and automatic bucket boundaries', () => {
  const dst = normalizeMetricsQuery({
    query: { preset: 'custom', from: '2026-03-08', to: '2026-03-08' },
    timezone: 'America/New_York',
    now: new Date('2026-03-08T12:00:00.000Z'),
  });
  assert.equal(dst.from, '2026-03-08T05:00:00.000Z');
  assert.equal(dst.to, '2026-03-09T04:00:00.000Z');
  assert.equal(dst.bucket, 'day');

  const weekly = normalizeMetricsQuery({
    query: { preset: 'custom', from: '2026-01-01', to: '2026-02-01' },
    timezone: 'UTC',
    now: new Date('2026-02-01T12:00:00.000Z'),
  });
  assert.equal(weekly.bucket, 'week');

  const monthly = normalizeMetricsQuery({
    query: { preset: 'custom', from: '2026-01-01', to: '2026-07-01' },
    timezone: 'UTC',
    now: new Date('2026-07-01T12:00:00.000Z'),
  });
  assert.equal(monthly.bucket, 'month');
});

test('department and member metrics apply cohort, SLA, employee, and rule definitions', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  const legal = db.prepare("SELECT id, head_user_id FROM departments WHERE name = 'Legal'").get();
  const maya = db.prepare("SELECT id, name FROM users WHERE email = 'maya@lexflow.local'").get();
  const noah = db.prepare(`
    INSERT INTO users
      (email, name, initials, department, role, organization_id, auth_provider,
       account_status, department_id)
    VALUES ('noah.metrics@lexflow.local', 'Noah Metrics', 'NM', 'Legal', 'member', 1,
      'local', 'active', ?)
    RETURNING id, name
  `).get(legal.id);
  db.prepare('UPDATE workspace_settings SET time_assigned_unmarked_hours = 24 WHERE organization_id = 1').run();

  const insertEmail = db.prepare(`
    INSERT INTO emails
      (provider_id, provider, mailbox_address, subject, sender_name, sender_address,
       preview, received_at, status, created_at, organization_id, department_id)
    VALUES (?, 'outlook', 'legal@lexflow.local', ?, 'Sender', 'sender@example.test',
      'Preview', ?, 'unassigned', ?, 1, ?)
    RETURNING id
  `);
  const first = insertEmail.get('metric-1', 'First confidential subject', '2026-08-01T08:00:00.000Z', '2026-08-01T08:00:00.000Z', legal.id);
  const second = insertEmail.get('metric-2', 'Second confidential subject', '2026-08-03T08:00:00.000Z', '2026-08-03T08:00:00.000Z', legal.id);
  const third = insertEmail.get('metric-3', 'Third confidential subject', '2026-08-05T08:00:00.000Z', '2026-08-05T08:00:00.000Z', legal.id);
  const rule = db.prepare(`
    INSERT INTO rules
      (name, keywords, sender_filter, assignee_id, priority, enabled, created_at,
       organization_id, department_id)
    VALUES ('NDA route', 'NDA', '', ?, 2, 1, '2026-08-01T00:00:00.000Z', 1, ?)
    RETURNING id
  `).get(maya.id, legal.id);
  db.prepare(`
    INSERT INTO rules
      (name, keywords, sender_filter, assignee_id, priority, enabled, created_at,
       organization_id, department_id)
    VALUES ('Zero assignment route', 'never-matched', '', ?, 3, 1,
      '2026-08-01T00:00:00.000Z', 1, ?)
  `).run(maya.id, legal.id);

  const firstAssignment = recordTaskEvent(db, {
    organizationId: 1, departmentId: legal.id, emailId: first.id,
    assigneeId: maya.id, eventType: 'assigned', assignmentSource: 'rule',
    departmentNameSnapshot: 'Legal', assigneeNameSnapshot: maya.name,
    receivedAt: '2026-08-01T08:00:00.000Z', occurredAt: '2026-08-01T09:00:00.000Z',
  });
  recordRuleAssignment(db, {
    taskEventId: firstAssignment, organizationId: 1, departmentId: legal.id,
    ruleId: rule.id, assigneeId: maya.id, ruleNameSnapshot: 'NDA route',
    departmentNameSnapshot: 'Legal', assigneeNameSnapshot: maya.name,
    prioritySnapshot: 2, occurredAt: '2026-08-01T09:00:00.000Z',
  });
  recordTaskEvent(db, {
    organizationId: 1, departmentId: legal.id, emailId: first.id,
    actorId: maya.id, assigneeId: maya.id, eventType: 'completed',
    departmentNameSnapshot: 'Legal', assigneeNameSnapshot: maya.name,
    receivedAt: '2026-08-01T08:00:00.000Z', occurredAt: '2026-08-01T11:00:00.000Z',
  });
  recordTaskEvent(db, {
    organizationId: 1, departmentId: legal.id, emailId: second.id,
    assigneeId: noah.id, eventType: 'assigned', assignmentSource: 'manual',
    departmentNameSnapshot: 'Legal', assigneeNameSnapshot: noah.name,
    receivedAt: '2026-08-03T08:00:00.000Z', occurredAt: '2026-08-03T09:00:00.000Z',
  });
  recordTaskEvent(db, {
    organizationId: 1, departmentId: legal.id, emailId: third.id,
    assigneeId: maya.id, eventType: 'assigned', assignmentSource: 'manual',
    departmentNameSnapshot: 'Legal', assigneeNameSnapshot: maya.name,
    receivedAt: '2026-08-05T08:00:00.000Z', occurredAt: '2026-08-05T09:00:00.000Z',
  });
  recordTaskEvent(db, {
    organizationId: 1, departmentId: legal.id, emailId: third.id,
    actorId: maya.id, assigneeId: maya.id, eventType: 'completed',
    departmentNameSnapshot: 'Legal', assigneeNameSnapshot: maya.name,
    receivedAt: '2026-08-05T08:00:00.000Z', occurredAt: '2026-08-12T09:00:00.000Z',
  });
  db.prepare('UPDATE rules SET enabled = 0 WHERE id = ?').run(rule.id);

  const period = normalizeMetricsQuery({
    query: { preset: 'custom', from: '2026-08-01', to: '2026-08-10' },
    timezone: 'UTC',
    now: new Date('2026-08-10T12:00:00.000Z'),
  });
  const department = getDepartmentMetrics({
    db, organizationId: 1, departmentId: legal.id, period,
    now: new Date('2026-08-10T12:00:00.000Z'),
  });

  assert.equal(card(department, 'assigned').value, 3);
  assert.equal(card(department, 'completed').value, 1);
  assert.equal(card(department, 'completed').secondary.value, 1 / 3);
  assert.equal(card(department, 'nonCompletions').value, 2);
  assert.equal(card(department, 'nonCompletions').secondary.overdue, 2);
  assert.equal(card(department, 'resolution').value, 3 * 60 * 60 * 1_000);
  assert.equal(card(department, 'handling').value, 2 * 60 * 60 * 1_000);
  const outcomeTable = department.plots.find(plot => plot.id === 'outcomes').table;
  assert.equal(outcomeTable.find(row => row.label === 'Aug 1').completed, 1);
  assert.equal(outcomeTable.find(row => row.label === 'Aug 2').completed, null);
  assert.equal(outcomeTable.find(row => row.label === 'Aug 2').overdue, null);
  const rulePlot = department.plots.find(plot => plot.id === 'rules');
  assert.equal(rulePlot.hasData, true);
  assert.deepEqual(
    rulePlot.table.map(row => [row.label, row.assignments]),
    [['NDA route', 1], ['ACME NDA review', 0], ['Zero assignment route', 0], ['Manual assignment', 2]],
  );
  assert.equal(department.plots.find(plot => plot.id === 'outcomes').hasData, true);
  assert.equal(department.plots.find(plot => plot.id === 'employees').hasData, true);

  const member = getMemberMetrics({
    db, organizationId: 1, userId: maya.id, period,
    now: new Date('2026-08-10T12:00:00.000Z'),
  });
  assert.equal(card(member, 'assigned').value, 2);
  assert.equal(card(member, 'completed').value, 1);
  assert.equal(member.plots.find(plot => plot.id === 'workload').hasData, true);
  assert.equal(member.plots.find(plot => plot.id === 'handlingTrend').hasData, true);
  const serialized = JSON.stringify(member);
  assert.doesNotMatch(serialized, /Noah Metrics|confidential subject|sender@example\.test/iu);

  const emptyPeriod = normalizeMetricsQuery({
    query: { preset: 'custom', from: '2026-07-01', to: '2026-07-02' },
    timezone: 'UTC',
    now: new Date('2026-08-10T12:00:00.000Z'),
  });
  const emptyDepartment = getDepartmentMetrics({
    db, organizationId: 1, departmentId: legal.id, period: emptyPeriod,
    now: new Date('2026-08-10T12:00:00.000Z'),
  });
  assert.equal(emptyDepartment.plots.find(plot => plot.id === 'outcomes').hasData, false);
  assert.equal(emptyDepartment.plots.find(plot => plot.id === 'employees').hasData, false);
  assert.equal(emptyDepartment.plots.find(plot => plot.id === 'rules').hasData, false);
  assert.deepEqual(
    emptyDepartment.plots.find(plot => plot.id === 'rules').table.map(row => [row.label, row.assignments]),
    [['ACME NDA review', 0], ['Zero assignment route', 0]],
  );
  const emptyMember = getMemberMetrics({
    db, organizationId: 1, userId: maya.id, period: emptyPeriod,
    now: new Date('2026-08-10T12:00:00.000Z'),
  });
  assert.equal(emptyMember.plots.find(plot => plot.id === 'workload').hasData, false);
  assert.equal(emptyMember.plots.find(plot => plot.id === 'handlingTrend').hasData, false);
});

test('platform and OrgAdmin payloads remain email-blind', (context) => {
  const db = createDatabase(':memory:');
  context.after(() => db.close());
  seedDemoData(db);
  db.prepare(`
    INSERT INTO graph_sync_runs
      (run_id, organization_id, started_at, completed_at, duration_ms, outcome)
    VALUES ('zero-duration', 1, '2026-08-20T08:00:00.000Z',
      '2026-08-20T08:00:00.000Z', 0, 'success')
  `).run();
  const period = normalizeMetricsQuery({
    query: { preset: '30-days' },
    timezone: 'UTC',
    now: new Date('2026-08-30T12:00:00.000Z'),
  });

  const platform = getPlatformMetrics({ db, period });
  const organization = getOrganizationMetrics({
    db, organizationId: 1, departmentId: null, period,
    now: new Date('2026-08-30T12:00:00.000Z'),
  });
  assert.equal(platform.scope, 'platform');
  assert.equal(organization.scope, 'organization');
  assert.equal(platform.plots.find(plot => plot.id === 'tenantStatus').hasData, false);
  assert.equal(organization.plots.find(plot => plot.id === 'peopleLifecycle').hasData, false);
  assert.equal(organization.plots.find(plot => plot.id === 'graphHealth').hasData, true);
  for (const payload of [platform, organization]) {
    const serialized = JSON.stringify(payload);
    assert.doesNotMatch(serialized, /subject|sender|preview|providerId|outlookUrl/iu);
  }
});
