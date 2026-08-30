import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FEEDBACK_DURATION,
  createFeedbackQueue,
  feedbackFingerprint,
  pendingTaskNotice,
} from '../public/feedback.js';

function queueHarness(options = {}) {
  const scheduled = [];
  const cancelled = [];
  const snapshots = [];
  const queue = createFeedbackQueue({
    schedule(callback, delay) {
      const handle = { callback, delay };
      scheduled.push(handle);
      return handle;
    },
    cancel(handle) {
      cancelled.push(handle);
    },
    onChange(snapshot) {
      snapshots.push(snapshot);
    },
    ...options,
  });
  return { queue, scheduled, cancelled, snapshots };
}

test('feedback queue preserves order, durations, and a maximum of three visible entries', () => {
  const { queue, scheduled, cancelled } = queueHarness();
  queue.show({ type: 'success', message: 'Saved.' });
  queue.show({ type: 'info', message: 'Refreshing.' });
  queue.show({ type: 'error', message: 'Could not save.' });

  assert.deepEqual(queue.snapshot().map(item => item.message), ['Saved.', 'Refreshing.', 'Could not save.']);
  assert.deepEqual(scheduled.map(item => item.delay), [
    FEEDBACK_DURATION.success,
    FEEDBACK_DURATION.info,
    FEEDBACK_DURATION.error,
  ]);

  queue.show({ type: 'success', message: 'Connected.' });
  assert.deepEqual(queue.snapshot().map(item => item.message), ['Refreshing.', 'Could not save.', 'Connected.']);
  assert.equal(cancelled.length, 1);
});

test('feedback queue collapses duplicates, restarts their timer, and supports dismissal', () => {
  const { queue, scheduled, cancelled } = queueHarness();
  const firstId = queue.show({ type: 'error', message: 'Refresh failed.' });
  const duplicateId = queue.show({ type: 'error', message: 'Refresh failed.' });

  assert.equal(duplicateId, firstId);
  assert.equal(queue.snapshot().length, 1);
  assert.equal(scheduled.length, 2);
  assert.equal(cancelled.length, 1);

  queue.dismiss(firstId);
  assert.deepEqual(queue.snapshot(), []);
  assert.equal(cancelled.length, 2);
});

test('feedback fingerprints can be explicitly stabilized', () => {
  assert.equal(feedbackFingerprint({ type: 'error', message: 'One', fingerprint: 'poll' }), 'poll');
  assert.equal(
    feedbackFingerprint({ type: 'info', title: 'Pending', message: 'One', action: { label: 'Open', view: 'assigned' } }),
    'info|Pending|One|Open|assigned',
  );
});

test('pending task notice follows Member action priority', () => {
  assert.equal(pendingTaskNotice({ role: 'member', pendingTasks: {} }), null);

  const assigned = pendingTaskNotice({
    role: 'member',
    pendingTasks: { assignedToMe: 2, unassignedDepartment: 9, unreadNotifications: 1 },
  });
  assert.equal(assigned.type, 'info');
  assert.match(assigned.message, /2 assigned emails pending/iu);
  assert.match(assigned.message, /1 unread notification/iu);
  assert.deepEqual(assigned.action, { label: 'View my work', view: 'assigned' });

  const notifications = pendingTaskNotice({
    role: 'member',
    pendingTasks: { assignedToMe: 0, unreadNotifications: 3 },
  });
  assert.deepEqual(notifications.action, { label: 'View notifications', view: 'notifications' });
});

test('pending task notice follows DepAdmin action priority', () => {
  const inbox = pendingTaskNotice({
    role: 'dep_admin',
    pendingTasks: { unassignedDepartment: 4, assignedToMe: 2, unreadNotifications: 1 },
  });
  assert.match(inbox.message, /4 unassigned emails/iu);
  assert.match(inbox.message, /2 assigned to you/iu);
  assert.deepEqual(inbox.action, { label: 'Review inbox', view: 'inbox' });

  const assigned = pendingTaskNotice({
    role: 'dep_admin',
    pendingTasks: { unassignedDepartment: 0, assignedToMe: 1, unreadNotifications: 0 },
  });
  assert.deepEqual(assigned.action, { label: 'View assigned work', view: 'assigned' });
});
