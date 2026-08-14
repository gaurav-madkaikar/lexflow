const state = {
  session: null,
  view: 'inbox',
  department: 'All',
  query: '',
  selectedEmailId: null,
  sidebarOpen: false,
  pollTimer: null
};

const elements = {
  loginView: document.querySelector('#login-view'),
  loginForm: document.querySelector('#login-form'),
  loginError: document.querySelector('#login-error'),
  appView: document.querySelector('#app-view'),
  pageTitle: document.querySelector('#page-title'),
  modeChip: document.querySelector('#mode-chip'),
  adminNavigation: document.querySelector('#admin-navigation'),
  memberNavigation: document.querySelector('#member-navigation'),
  sidebarDepartment: document.querySelector('#sidebar-department'),
  sidebarMode: document.querySelector('#sidebar-mode'),
  sidebarSync: document.querySelector('#sidebar-sync'),
  sidebarAvatar: document.querySelector('#sidebar-avatar'),
  sidebarUser: document.querySelector('#sidebar-user'),
  sidebarRole: document.querySelector('#sidebar-role'),
  searchInput: document.querySelector('#search-input'),
  syncButton: document.querySelector('#sync-button'),
  notificationButton: document.querySelector('#notification-button'),
  notificationCount: document.querySelector('#notification-count'),
  departmentSwitch: document.querySelector('#department-switch'),
  metrics: document.querySelector('#metrics'),
  dashboardLayout: document.querySelector('#dashboard-layout'),
  queuePanel: document.querySelector('#queue-panel'),
  queueTitle: document.querySelector('#queue-title'),
  queueCaption: document.querySelector('#queue-caption'),
  emailCount: document.querySelector('#email-count'),
  emailList: document.querySelector('#email-list'),
  rulesPanel: document.querySelector('#rules-panel'),
  rulesCaption: document.querySelector('#rules-caption'),
  ruleList: document.querySelector('#rule-list'),
  activityPanel: document.querySelector('#activity-panel'),
  activityList: document.querySelector('#activity-list'),
  notificationsPanel: document.querySelector('#notifications-panel'),
  notificationsCaption: document.querySelector('#notifications-caption'),
  notificationList: document.querySelector('#notification-list'),
  statusBanner: document.querySelector('#status-banner'),
  ruleDialog: document.querySelector('#rule-dialog'),
  ruleForm: document.querySelector('#rule-form'),
  ruleError: document.querySelector('#rule-error'),
  ruleAssignee: document.querySelector('#rule-assignee'),
  emailDialog: document.querySelector('#email-dialog'),
  emailDialogTitle: document.querySelector('#email-dialog-title'),
  emailDialogStatus: document.querySelector('#email-dialog-status'),
  emailDetailSender: document.querySelector('#email-detail-sender'),
  emailDetailReceived: document.querySelector('#email-detail-received'),
  emailDetailAssignee: document.querySelector('#email-detail-assignee'),
  emailDetailDepartment: document.querySelector('#email-detail-department'),
  emailDetailPreview: document.querySelector('#email-detail-preview'),
  emailCompletionNote: document.querySelector('#email-completion-note'),
  outlookLink: document.querySelector('#outlook-link'),
  completeButton: document.querySelector('#complete-button'),
  toastRegion: document.querySelector('#toast-region')
};

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = String(text);
  return element;
}

function setText(element, value, fallback = '') {
  element.textContent = value === null || value === undefined || value === '' ? fallback : String(value);
}

function clearFieldErrors(form) {
  form.querySelectorAll('.field-error').forEach(message => message.remove());
  form.querySelectorAll('[aria-invalid="true"]').forEach(control => {
    control.removeAttribute('aria-invalid');
    control.removeAttribute('aria-describedby');
  });
}

function showFormError(form, errorElement, error) {
  setText(errorElement, error.message);
  errorElement.hidden = false;
  for (const [name, message] of Object.entries(error.fields ?? {})) {
    const control = form.elements.namedItem(name);
    if (!(control instanceof HTMLElement)) continue;
    const id = `${form.id}-${name}-error`;
    const detail = node('small', 'field-error', message);
    detail.id = id;
    control.insertAdjacentElement('afterend', detail);
    control.setAttribute('aria-invalid', 'true');
    control.setAttribute('aria-describedby', id);
  }
}

function countLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatDate(value, includeDate = true) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat(undefined, includeDate
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { hour: 'numeric', minute: '2-digit' }).format(date);
}

function safeWebUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const raw = await response.text();
  let payload = {};
  if (raw) {
    try { payload = JSON.parse(raw); } catch { payload = {}; }
  }
  if (response.status === 401) {
    state.session = null;
    showLogin();
  }
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'Something went wrong.');
    error.fields = payload.error?.fields ?? {};
    throw error;
  }
  return payload;
}

async function refresh({ quiet = false } = {}) {
  try {
    state.session = await api('/api/bootstrap');
    normalizeView();
    render();
    startPolling();
  } catch (error) {
    if (!quiet && state.session) showToast(error.message, true);
    throw error;
  }
}

async function mutate(path, method = 'POST', body) {
  const payload = await api(path, { method, body });
  await refresh({ quiet: true });
  return payload;
}

function showLogin() {
  stopPolling();
  closeSidebar();
  elements.appView.hidden = true;
  elements.loginView.hidden = false;
  elements.loginForm.email.focus();
}

function showApp() {
  elements.loginView.hidden = true;
  elements.appView.hidden = false;
}

function normalizeView() {
  const isAdmin = state.session?.user.role === 'admin';
  const allowed = isAdmin
    ? ['inbox', 'assigned', 'completed', 'rules', 'activity', 'notifications']
    : ['assigned', 'completed', 'notifications'];
  if (!allowed.includes(state.view)) state.view = isAdmin ? 'inbox' : 'assigned';
}

function showToast(message, isError = false) {
  const toast = node('div', `toast${isError ? ' error' : ''}`, message);
  elements.toastRegion.replaceChildren(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function setButtonBusy(button, busy, busyText) {
  if (!button.dataset.label) button.dataset.label = button.textContent.trim();
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
  button.textContent = busy ? busyText : button.dataset.label;
}

function emptyState(title, message, mark = '—') {
  const wrapper = node('div', 'empty-state');
  wrapper.append(node('span', 'empty-mark', mark), node('strong', '', title), node('p', '', message));
  return wrapper;
}

function metric(label, value, note) {
  const card = node('article', 'metric');
  card.append(
    node('span', 'metric-label', label),
    node('strong', 'metric-value', value),
    node('span', 'metric-note', note)
  );
  return card;
}

function counts() {
  const emails = state.session?.emails ?? [];
  return {
    inbox: emails.filter(email => email.status === 'unassigned').length,
    assigned: emails.filter(email => email.status === 'assigned').length,
    completed: emails.filter(email => email.status === 'completed').length,
    rules: (state.session?.rules ?? []).filter(rule => rule.enabled).length,
    notifications: state.session?.unreadCount ?? 0
  };
}

function renderMetrics() {
  const totals = counts();
  const isAdmin = state.session.user.role === 'admin';
  const items = isAdmin
    ? [
        ['Unassigned', totals.inbox, 'Awaiting an automation match'],
        ['Open assigned', totals.assigned, 'Across the team'],
        ['Completed', totals.completed, 'Recorded workflow items'],
        ['Active rules', totals.rules, 'Ordered by priority'],
        ['Unread', totals.notifications, 'Assignment notifications']
      ]
    : [
        ['Open assigned', totals.assigned, 'Ready for your review'],
        ['Completed', totals.completed, 'Work you have finished'],
        ['Unread', totals.notifications, 'Assignment notifications']
      ];
  elements.metrics.replaceChildren(...items.map(item => metric(...item)));
}

function emailMatchesDepartment(email) {
  if (state.department === 'All') return true;
  return email.status !== 'unassigned' && email.department === state.department;
}

function emailMatchesSearch(email) {
  if (!state.query) return true;
  const sender = `${email.sender?.name ?? ''} ${email.sender?.address ?? ''}`;
  const searchable = [email.subject, email.preview, sender, email.department, email.assignee?.name]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
  return searchable.includes(state.query);
}

function visibleEmails() {
  const status = state.view === 'inbox' ? 'unassigned' : state.view;
  return (state.session.emails ?? [])
    .filter(email => email.status === status)
    .filter(emailMatchesDepartment)
    .filter(emailMatchesSearch)
    .sort((left, right) => new Date(right.receivedAt) - new Date(left.receivedAt));
}

function renderEmailRow(email) {
  const row = node('button', `email-row ${email.status}`);
  row.type = 'button';
  row.dataset.emailId = String(email.id);
  row.setAttribute('aria-label', `Open ${email.subject}`);

  const dot = node('span', `status-dot ${email.status}`);
  dot.setAttribute('aria-hidden', 'true');

  const copy = node('span', 'email-copy');
  const subject = node('span', 'email-subject', email.subject || '(No subject)');
  const sender = [email.sender?.name, email.sender?.address].filter(Boolean).join(' · ') || 'Unknown sender';
  const meta = node('span', 'email-meta', `${sender} · ${formatDate(email.receivedAt, false)}`);
  const preview = node('span', 'email-preview', email.preview || 'No preview available.');
  const tags = node('span', 'email-tags');
  if (email.department) tags.append(node('span', `tag ${email.department.toLocaleLowerCase()}`, email.department));
  const statusLabel = email.status === 'unassigned' ? 'Unassigned' : email.status === 'completed' ? 'Completed' : 'Assigned';
  tags.append(node('span', `tag ${email.status}`, statusLabel));
  copy.append(subject, meta, preview, tags);

  const person = node('span', 'email-person');
  const initials = email.assignee?.initials || '—';
  person.append(node('span', 'avatar', initials), node('span', '', email.assignee?.name || 'Unassigned'));
  row.append(dot, copy, person);
  return row;
}

function renderEmails() {
  const emails = visibleEmails();
  const labels = {
    inbox: ['Unassigned inbox', 'New mailbox items awaiting a rule'],
    assigned: [state.session.user.role === 'admin' ? 'Assigned work' : 'My work', 'Open assignments'],
    completed: ['Completed work', 'Closed assignment history']
  };
  const [title, caption] = labels[state.view] ?? labels.assigned;
  setText(elements.queueTitle, title);
  setText(elements.queueCaption, caption);
  setText(elements.emailCount, countLabel(emails.length, 'email'));
  elements.emailList.replaceChildren(...(emails.length
    ? emails.map(renderEmailRow)
    : [emptyState('Nothing here', state.query ? 'No emails match your search and filters.' : 'This queue is clear.', '✓')]));
}

function renderRule(rule) {
  const item = node('article', `rule-item${rule.enabled ? '' : ' is-disabled'}`);
  const copy = node('div');
  copy.append(
    node('h4', '', rule.name),
    node('p', '', `${rule.keywords}${rule.senderFilter ? ` · From “${rule.senderFilter}”` : ''} → ${rule.assignee?.name || 'Unknown member'}`),
    node('p', '', `Priority ${rule.priority} · ${rule.enabled ? 'Active' : 'Paused'}`)
  );
  const actions = node('div', 'rule-actions');
  const toggle = node('button', 'toggle-rule', rule.enabled ? 'Pause' : 'Enable');
  toggle.type = 'button';
  toggle.dataset.ruleId = String(rule.id);
  toggle.dataset.enabled = String(rule.enabled);
  toggle.setAttribute('aria-label', `${rule.enabled ? 'Pause' : 'Enable'} ${rule.name}`);
  const remove = node('button', 'delete-rule', 'Delete');
  remove.type = 'button';
  remove.dataset.ruleId = String(rule.id);
  remove.setAttribute('aria-label', `Delete ${rule.name}`);
  actions.append(toggle, remove);
  item.append(copy, actions);
  return item;
}

function renderRules() {
  const rules = [...(state.session.rules ?? [])].sort((left, right) => left.priority - right.priority || left.id - right.id);
  const activeCount = rules.filter(rule => rule.enabled).length;
  setText(elements.rulesCaption, `${activeCount} active`);
  elements.ruleList.replaceChildren(...(rules.length
    ? rules.map(renderRule)
    : [emptyState('No automation rules', 'Create a rule to route matching email.', '⌘')]));
}

function renderActivityItem(item) {
  const wrapper = node('article', 'activity-item');
  const top = node('div', 'activity-top');
  top.append(
    node('strong', '', item.actor?.name || 'LexFlow'),
    node('time', '', formatDate(item.createdAt, false))
  );
  const message = node('p', '', item.message);
  const detail = node('small', '', item.subject || (item.kind === 'completed' ? 'Completed' : 'Assigned'));
  wrapper.append(top, message, detail);
  return wrapper;
}

function renderActivity() {
  const activity = state.session.activity ?? [];
  elements.activityList.replaceChildren(...(activity.length
    ? activity.map(renderActivityItem)
    : [emptyState('No activity yet', 'Assignments and completions will appear here.', '◷')]));
}

function renderNotification(item) {
  const wrapper = node('article', `notification-item${item.readAt ? '' : ' unread'}`);
  const top = node('div', 'notification-top');
  top.append(
    node('strong', '', item.readAt ? 'Assignment' : 'New assignment'),
    node('time', '', formatDate(item.createdAt, false))
  );
  wrapper.append(top, node('p', '', item.message));
  const actions = node('div', 'notification-actions');
  const email = (state.session.emails ?? []).find(candidate => candidate.id === item.emailId);
  if (email) {
    const open = node('button', 'open-notification', 'Open email');
    open.type = 'button';
    open.dataset.emailId = String(item.emailId);
    actions.append(open);
  }
  if (!item.readAt) {
    const read = node('button', 'read-notification', 'Mark read');
    read.type = 'button';
    read.dataset.notificationId = String(item.id);
    actions.append(read);
  }
  if (actions.childElementCount) wrapper.append(actions);
  return wrapper;
}

function renderNotifications() {
  const notifications = state.session.notifications ?? [];
  setText(elements.notificationsCaption, `${state.session.unreadCount ?? 0} unread`);
  elements.notificationList.replaceChildren(...(notifications.length
    ? notifications.map(renderNotification)
    : [emptyState('You are all caught up', 'New assignment notifications will appear here.', '✓')]));
}

function renderNav() {
  const totals = counts();
  document.querySelectorAll('[data-badge]').forEach(badge => {
    setText(badge, totals[badge.dataset.badge] ?? 0);
  });
  document.querySelectorAll('.nav-item[data-view]').forEach(button => {
    const active = button.dataset.view === state.view;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}

function renderPanels() {
  const isAdmin = state.session.user.role === 'admin';
  const isQueue = ['inbox', 'assigned', 'completed'].includes(state.view);
  const isFocus = !isQueue;
  elements.dashboardLayout.classList.toggle('focus-view', isFocus);
  elements.queuePanel.hidden = !isQueue;
  elements.rulesPanel.hidden = !isAdmin || (isFocus && state.view !== 'rules');
  elements.activityPanel.hidden = !isAdmin || (isFocus && state.view !== 'activity');
  elements.notificationsPanel.hidden = isFocus ? state.view !== 'notifications' : isAdmin;
  elements.departmentSwitch.hidden = !isQueue;
  elements.metrics.hidden = isFocus;
}

function renderHeader() {
  const titles = {
    inbox: state.department === 'All' ? 'Unified intake' : `${state.department} intake`,
    assigned: state.session.user.role === 'admin' ? 'Assigned work' : 'My work',
    completed: 'Completed',
    rules: 'Automation rules',
    activity: 'Activity',
    notifications: 'Notifications'
  };
  setText(elements.pageTitle, titles[state.view]);
  const connected = state.session.mode === 'graph';
  setText(elements.modeChip, connected ? 'Outlook connected' : 'Demo mailbox');
  elements.modeChip.classList.toggle('connected', connected);
  elements.searchInput.hidden = !['inbox', 'assigned', 'completed'].includes(state.view);
  elements.searchInput.parentElement.hidden = elements.searchInput.hidden;
}

function renderIdentity() {
  const { user, mode, sync } = state.session;
  setText(elements.sidebarAvatar, user.initials);
  setText(elements.sidebarUser, user.name);
  setText(elements.sidebarRole, `${user.role} · ${user.department}`);
  setText(elements.sidebarMode, mode === 'graph' ? 'Outlook connected' : 'Demo mailbox');
  setText(elements.sidebarSync, user.role === 'member'
    ? 'Sync managed by admin'
    : sync?.lastSuccessAt ? `Synced ${formatDate(sync.lastSuccessAt)}` : 'Waiting for first sync');
  elements.statusBanner.hidden = !sync?.lastError;
  setText(elements.statusBanner, sync?.lastError ? `Last sync failed: ${sync.lastError}` : '');
}

function render() {
  if (!state.session) {
    showLogin();
    return;
  }
  showApp();
  const isAdmin = state.session.user.role === 'admin';
  elements.adminNavigation.hidden = !isAdmin;
  elements.memberNavigation.hidden = isAdmin;
  elements.syncButton.hidden = !isAdmin;
  elements.sidebarDepartment.closest('.department-picker').hidden = !isAdmin;
  elements.sidebarDepartment.value = state.department;
  elements.departmentSwitch.querySelectorAll('[data-department]').forEach(button => {
    button.classList.toggle('active', button.dataset.department === state.department);
  });
  setText(elements.notificationCount, state.session.unreadCount || '');
  elements.notificationButton.setAttribute('aria-label', `View notifications, ${state.session.unreadCount ?? 0} unread`);
  renderIdentity();
  renderHeader();
  renderNav();
  renderMetrics();
  renderEmails();
  if (isAdmin) {
    renderRules();
    renderActivity();
  }
  renderNotifications();
  renderPanels();
}

function selectView(view) {
  state.view = view;
  normalizeView();
  closeSidebar();
  render();
}

function selectDepartment(department) {
  state.department = department;
  render();
}

function openSidebar() {
  state.sidebarOpen = true;
  elements.appView.classList.add('nav-open');
  document.querySelector('#nav-open').setAttribute('aria-expanded', 'true');
  document.querySelector('#nav-close').focus();
}

function closeSidebar() {
  state.sidebarOpen = false;
  elements.appView.classList.remove('nav-open');
  document.querySelector('#nav-open').setAttribute('aria-expanded', 'false');
}

function openEmail(emailId) {
  const email = (state.session.emails ?? []).find(item => item.id === Number(emailId));
  if (!email) return;
  state.selectedEmailId = email.id;
  setText(elements.emailDialogTitle, email.subject, '(No subject)');
  setText(elements.emailDialogStatus, email.status === 'completed' ? 'Completed email' : email.status === 'unassigned' ? 'Unassigned email' : 'Assigned email');
  const sender = [email.sender?.name, email.sender?.address].filter(Boolean).join(' · ');
  setText(elements.emailDetailSender, sender, 'Unknown sender');
  setText(elements.emailDetailReceived, formatDate(email.receivedAt));
  setText(elements.emailDetailAssignee, email.assignee?.name, 'Unassigned');
  setText(elements.emailDetailDepartment, email.department, 'Not assigned');
  setText(elements.emailDetailPreview, email.preview, 'No preview available.');

  const completed = email.status === 'completed';
  elements.emailCompletionNote.hidden = !completed;
  if (completed) {
    setText(elements.emailCompletionNote, `Completed by ${email.completedBy?.name || 'a team member'} on ${formatDate(email.completedAt)}.`);
  }
  elements.completeButton.hidden = state.session.user.role !== 'member' || email.status !== 'assigned';

  const outlookUrl = safeWebUrl(email.outlookUrl);
  elements.outlookLink.hidden = !outlookUrl;
  if (outlookUrl) elements.outlookLink.href = outlookUrl;
  else elements.outlookLink.removeAttribute('href');
  elements.emailDialog.showModal();
}

function openRuleDialog() {
  elements.ruleForm.reset();
  clearFieldErrors(elements.ruleForm);
  elements.ruleForm.priority.value = '30';
  elements.ruleError.hidden = true;
  const members = (state.session.team ?? []).filter(user => user.role === 'member');
  const options = members.map(member => {
    const option = node('option', '', `${member.name} · ${member.department}`);
    option.value = String(member.id);
    return option;
  });
  elements.ruleAssignee.replaceChildren(...options);
  elements.ruleDialog.showModal();
  elements.ruleForm.elements.namedItem('name').focus();
}

function closeDialog(id) {
  const dialog = document.getElementById(id);
  if (dialog?.open) dialog.close();
}

function startPolling() {
  stopPolling();
  if (!state.session || document.hidden) return;
  state.pollTimer = window.setInterval(() => refresh({ quiet: true }).catch(() => {}), 20_000);
}

function stopPolling() {
  if (state.pollTimer) window.clearInterval(state.pollTimer);
  state.pollTimer = null;
}

elements.loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  clearFieldErrors(elements.loginForm);
  elements.loginError.hidden = true;
  if (!elements.loginForm.reportValidity()) return;
  const submit = elements.loginForm.querySelector('[type="submit"]');
  setButtonBusy(submit, true, 'Signing in…');
  try {
    await api('/api/login', {
      method: 'POST',
      body: { email: elements.loginForm.email.value.trim(), password: elements.loginForm.password.value }
    });
    await refresh({ quiet: true });
    elements.loginForm.reset();
  } catch (error) {
    showFormError(elements.loginForm, elements.loginError, error);
  } finally {
    setButtonBusy(submit, false, 'Signing in…');
  }
});

document.querySelector('#logout-button').addEventListener('click', async () => {
  const button = document.querySelector('#logout-button');
  setButtonBusy(button, true, '…');
  try { await api('/api/logout', { method: 'POST' }); } catch (error) {
    if (state.session) showToast(error.message, true);
  } finally {
    state.session = null;
    state.view = 'inbox';
    state.department = 'All';
    state.query = '';
    elements.searchInput.value = '';
    showLogin();
    setButtonBusy(button, false, '…');
  }
});

document.querySelectorAll('.nav-item[data-view]').forEach(button => {
  button.addEventListener('click', () => selectView(button.dataset.view));
});

elements.departmentSwitch.addEventListener('click', event => {
  const button = event.target.closest('[data-department]');
  if (button) selectDepartment(button.dataset.department);
});

elements.sidebarDepartment.addEventListener('change', event => selectDepartment(event.target.value));
elements.searchInput.addEventListener('input', event => {
  state.query = event.target.value.trim().toLocaleLowerCase();
  renderEmails();
});

elements.emailList.addEventListener('click', event => {
  const row = event.target.closest('[data-email-id]');
  if (row) openEmail(row.dataset.emailId);
});

elements.notificationButton.addEventListener('click', () => selectView('notifications'));
document.querySelector('#nav-open').addEventListener('click', openSidebar);
document.querySelector('#nav-close').addEventListener('click', closeSidebar);
document.querySelector('#nav-backdrop').addEventListener('click', closeSidebar);

document.querySelector('#new-rule-button').addEventListener('click', openRuleDialog);
document.querySelectorAll('[data-close-dialog]').forEach(button => {
  button.addEventListener('click', () => closeDialog(button.dataset.closeDialog));
});

elements.ruleForm.addEventListener('submit', async event => {
  event.preventDefault();
  clearFieldErrors(elements.ruleForm);
  elements.ruleError.hidden = true;
  if (!elements.ruleForm.reportValidity()) return;
  const submit = elements.ruleForm.querySelector('[type="submit"]');
  setButtonBusy(submit, true, 'Creating…');
  const form = new FormData(elements.ruleForm);
  try {
    await mutate('/api/rules', 'POST', {
      name: String(form.get('name')).trim(),
      keywords: String(form.get('keywords')).trim(),
      senderFilter: String(form.get('senderFilter')).trim(),
      assigneeId: Number(form.get('assigneeId')),
      priority: Number(form.get('priority'))
    });
    elements.ruleDialog.close();
    showToast('Automation rule created.');
  } catch (error) {
    showFormError(elements.ruleForm, elements.ruleError, error);
  } finally {
    setButtonBusy(submit, false, 'Creating…');
  }
});

elements.ruleList.addEventListener('click', async event => {
  const toggle = event.target.closest('.toggle-rule');
  const remove = event.target.closest('.delete-rule');
  const button = toggle || remove;
  if (!button) return;
  if (remove && !window.confirm('Delete this automation rule? Existing assignments will stay unchanged.')) return;
  setButtonBusy(button, true, '…');
  try {
    if (toggle) {
      await mutate(`/api/rules/${toggle.dataset.ruleId}`, 'PATCH', { enabled: toggle.dataset.enabled !== 'true' });
      showToast(toggle.dataset.enabled === 'true' ? 'Rule paused.' : 'Rule enabled.');
    } else {
      await mutate(`/api/rules/${remove.dataset.ruleId}`, 'DELETE');
      showToast('Rule deleted.');
    }
  } catch (error) {
    showToast(error.message, true);
    setButtonBusy(button, false, '…');
  }
});

elements.syncButton.addEventListener('click', async () => {
  setButtonBusy(elements.syncButton, true, 'Syncing…');
  try {
    const result = await mutate('/api/sync');
    const imported = result.imported ?? result.result?.imported;
    const assigned = result.assigned ?? result.result?.assigned;
    showToast(Number.isInteger(imported) ? `Sync complete: ${imported} new, ${assigned ?? 0} assigned.` : 'Mailbox synced.');
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setButtonBusy(elements.syncButton, false, 'Syncing…');
  }
});

elements.completeButton.addEventListener('click', async () => {
  if (!state.selectedEmailId) return;
  setButtonBusy(elements.completeButton, true, 'Completing…');
  try {
    await mutate(`/api/emails/${state.selectedEmailId}/complete`);
    elements.emailDialog.close();
    showToast('Email marked complete.');
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setButtonBusy(elements.completeButton, false, 'Completing…');
  }
});

elements.notificationList.addEventListener('click', async event => {
  const open = event.target.closest('.open-notification');
  if (open) {
    openEmail(open.dataset.emailId);
    return;
  }
  const read = event.target.closest('.read-notification');
  if (!read) return;
  setButtonBusy(read, true, '…');
  try {
    await mutate(`/api/notifications/${read.dataset.notificationId}/read`);
  } catch (error) {
    showToast(error.message, true);
    setButtonBusy(read, false, '…');
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && state.sidebarOpen) closeSidebar();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPolling();
  else if (state.session) refresh({ quiet: true }).catch(() => startPolling());
});

refresh({ quiet: true }).catch(error => {
  if (state.session) showToast(error.message, true);
});
