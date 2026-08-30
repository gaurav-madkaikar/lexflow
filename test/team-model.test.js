import assert from 'node:assert/strict';
import test from 'node:test';

import {
  reconcileExpandedGroups,
  teamGroups,
  usernameFromEmail,
} from '../public/team-model.js';

test('usernameFromEmail returns the normalized corporate email local part', () => {
  assert.equal(usernameFromEmail('  JSAHOO@lexflow1.onmicrosoft.com  '), 'jsahoo');
  assert.equal(usernameFromEmail('not-an-email'), 'not-an-email');
  assert.equal(usernameFromEmail(null), '');
});

test('teamGroups assigns each person once and keeps unassigned people separate', () => {
  const departments = [
    { id: 8, name: 'Legal', headUser: { id: 2, email: 'jsahoo@example.test' } },
    { id: 9, name: 'Finance', headUser: null },
  ];
  const members = [
    { id: 1, email: 'member@example.test', departmentId: 8 },
    { id: 2, email: 'jsahoo@example.test', departmentId: 8 },
    { id: 3, email: 'admin@example.test', departmentId: null, role: 'org_admin' },
    { id: 4, email: 'orphan@example.test', departmentId: 99 },
  ];

  const groups = teamGroups({ departments, members });
  assert.deepEqual(groups.map(group => group.id), ['department:8', 'department:9', 'unassigned']);
  assert.deepEqual(groups[0].members.map(member => member.id), [1, 2]);
  assert.equal(groups[0].depAdminUsername, 'jsahoo');
  assert.deepEqual(groups[1].members, []);
  assert.equal(groups[1].depAdminUsername, null);
  assert.deepEqual(groups[2].members.map(member => member.id), [3, 4]);
  assert.equal(new Set(groups.flatMap(group => group.members.map(member => member.id))).size, members.length);
});

test('reconcileExpandedGroups keeps valid expansion state and removes deleted groups', () => {
  const result = reconcileExpandedGroups(
    new Set(['department:8', 'department:99', 'unassigned']),
    ['department:8', 'department:9', 'unassigned'],
  );
  assert.ok(result instanceof Set);
  assert.deepEqual([...result], ['department:8', 'unassigned']);
});
