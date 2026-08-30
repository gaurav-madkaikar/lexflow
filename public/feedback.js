export const FEEDBACK_DURATION = Object.freeze({
  success: 4500,
  info: 4500,
  error: 7000,
});

function normalizedType(value) {
  return Object.hasOwn(FEEDBACK_DURATION, value) ? value : 'info';
}

export function feedbackFingerprint(notification = {}) {
  if (notification.fingerprint) return String(notification.fingerprint);
  return [
    normalizedType(notification.type),
    notification.title ?? '',
    notification.message ?? '',
    notification.action?.label ?? '',
    notification.action?.view ?? '',
  ].map(value => String(value)).join('|');
}

export function createFeedbackQueue({
  schedule = setTimeout,
  cancel = clearTimeout,
  maxVisible = 3,
  onChange = () => {},
} = {}) {
  const entries = [];
  const timers = new Map();
  let nextId = 1;

  function snapshot() {
    return entries.map(entry => ({
      ...entry,
      action: entry.action ? { ...entry.action } : null,
    }));
  }

  function publish() {
    onChange(snapshot());
  }

  function clearTimer(id) {
    const timer = timers.get(id);
    if (timer !== undefined) {
      cancel(timer);
      timers.delete(id);
    }
  }

  function dismiss(id) {
    const index = entries.findIndex(entry => entry.id === id);
    if (index < 0) return false;
    clearTimer(id);
    entries.splice(index, 1);
    publish();
    return true;
  }

  function scheduleDismissal(entry) {
    if (entry.duration <= 0) return;
    timers.set(entry.id, schedule(() => dismiss(entry.id), entry.duration));
  }

  function show(notification = {}) {
    const message = String(notification.message ?? '').trim();
    if (!message) return null;
    const type = normalizedType(notification.type);
    const fingerprint = feedbackFingerprint({ ...notification, type });
    const existing = entries.find(entry => entry.fingerprint === fingerprint);
    if (existing) {
      clearTimer(existing.id);
      existing.duration = Number.isFinite(notification.duration)
        ? Math.max(0, Number(notification.duration))
        : FEEDBACK_DURATION[type];
      scheduleDismissal(existing);
      publish();
      return existing.id;
    }

    const entry = {
      id: nextId++,
      type,
      title: notification.title ? String(notification.title) : '',
      message,
      action: notification.action?.label && notification.action?.view
        ? { label: String(notification.action.label), view: String(notification.action.view) }
        : null,
      fingerprint,
      duration: Number.isFinite(notification.duration)
        ? Math.max(0, Number(notification.duration))
        : FEEDBACK_DURATION[type],
    };
    entries.push(entry);
    while (entries.length > Math.max(1, Number(maxVisible) || 1)) {
      const removed = entries.shift();
      clearTimer(removed.id);
    }
    scheduleDismissal(entry);
    publish();
    return entry.id;
  }

  function clear() {
    for (const entry of entries) clearTimer(entry.id);
    if (!entries.length) return;
    entries.splice(0, entries.length);
    publish();
  }

  return { show, dismiss, clear, snapshot };
}

function positiveCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function countLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function sentenceList(parts) {
  if (parts.length < 2) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`;
}

export function pendingTaskNotice({ role, pendingTasks = {} } = {}) {
  const assignedToMe = positiveCount(pendingTasks.assignedToMe);
  const unassignedDepartment = positiveCount(pendingTasks.unassignedDepartment);
  const unreadNotifications = positiveCount(pendingTasks.unreadNotifications);
  const parts = [];
  let action = null;

  if (role === 'member') {
    if (assignedToMe) parts.push(`${countLabel(assignedToMe, 'assigned email')} pending`);
    if (unreadNotifications) parts.push(countLabel(unreadNotifications, 'unread notification'));
    action = assignedToMe
      ? { label: 'View my work', view: 'assigned' }
      : unreadNotifications ? { label: 'View notifications', view: 'notifications' } : null;
  } else if (role === 'dep_admin') {
    if (unassignedDepartment) parts.push(countLabel(unassignedDepartment, 'unassigned email'));
    if (assignedToMe) parts.push(`${assignedToMe} assigned to you`);
    if (unreadNotifications) parts.push(countLabel(unreadNotifications, 'unread notification'));
    action = unassignedDepartment
      ? { label: 'Review inbox', view: 'inbox' }
      : assignedToMe
        ? { label: 'View assigned work', view: 'assigned' }
        : unreadNotifications ? { label: 'View notifications', view: 'notifications' } : null;
  }

  if (!parts.length || !action) return null;
  return {
    type: 'info',
    title: 'Pending tasks',
    message: `You have ${sentenceList(parts)}.`,
    action,
    fingerprint: `entry-pending:${role}`,
  };
}
