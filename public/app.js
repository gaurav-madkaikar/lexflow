const state = {
  session: null,
  view: 'inbox',
  department: 'All',
  query: '',
  selectedEmailId: null,
  sidebarOpen: false,
  pollTimer: null,
  settingsDirty: false,
  lastUnreadCount: null,
  emailDialogOpener: null
};

const elements = {
  skipLink: document.querySelector('#skip-link'),
  loginView: document.querySelector('#login-view'),
  loginForm: document.querySelector('#login-form'),
  loginError: document.querySelector('#login-error'),
  appView: document.querySelector('#app-view'),
  navBackdrop: document.querySelector('#nav-backdrop'),
  sidebar: document.querySelector('#sidebar'),
  mainColumn: document.querySelector('#main-column'),
  navOpen: document.querySelector('#nav-open'),
  navClose: document.querySelector('#nav-close'),
  pageTitle: document.querySelector('#page-title'),
  topbarAvatar: document.querySelector('#topbar-avatar'),
  topbarUser: document.querySelector('#topbar-user'),
  topbarRole: document.querySelector('#topbar-role'),
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
  notificationAnnouncement: document.querySelector('#notification-announcement'),
  workspaceToolbar: document.querySelector('#workspace-toolbar'),
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
  settingsPanel: document.querySelector('#settings-panel'),
  timingForm: document.querySelector('#timing-form'),
  timingError: document.querySelector('#timing-error'),
  departmentForm: document.querySelector('#department-form'),
  departmentError: document.querySelector('#department-error'),
  teamDepartmentList: document.querySelector('#team-department-list'),
  statusBanner: document.querySelector('#status-banner'),
  dashboardHero: document.querySelector('#dashboard-hero'),
  heroDate: document.querySelector('#hero-date'),
  heroDay: document.querySelector('#hero-day'),
  heroWeekday: document.querySelector('#hero-weekday'),
  heroMonth: document.querySelector('#hero-month'),
  heroEyebrow: document.querySelector('#hero-eyebrow'),
  heroTitle: document.querySelector('#hero-title'),
  heroSummary: document.querySelector('#hero-summary'),
  heroAction: document.querySelector('#hero-action'),
  heroActionLabel: document.querySelector('#hero-action-label'),
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
  emailAssignmentForm: document.querySelector('#email-assignment-form'),
  emailAssigneeSelect: document.querySelector('#email-assignee-select'),
  emailAssignmentLabel: document.querySelector('#email-assignment-label'),
  assignmentError: document.querySelector('#assignment-error'),
  assignButton: document.querySelector('#assign-button'),
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
  const next = value === null || value === undefined || value === '' ? fallback : String(value);
  if (element.textContent !== next) element.textContent = next;
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
  let firstInvalid = null;
  for (const [name, message] of Object.entries(error.fields ?? {})) {
    const control = form.elements.namedItem(name);
    if (!(control instanceof HTMLElement)) continue;
    const id = `${form.id}-${name}-error`;
    const detail = node('small', 'field-error', message);
    detail.id = id;
    control.insertAdjacentElement('afterend', detail);
    control.setAttribute('aria-invalid', 'true');
    control.setAttribute('aria-describedby', id);
    firstInvalid ??= control;
  }
  if (firstInvalid) firstInvalid.focus();
  else {
    errorElement.tabIndex = -1;
    errorElement.focus();
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
  if (elements.emailDialog.open) elements.emailDialog.close();
  if (elements.ruleDialog.open) elements.ruleDialog.close();
  state.selectedEmailId = null;
  state.emailDialogOpener = null;
  state.settingsDirty = false;
  state.lastUnreadCount = null;
  elements.skipLink.hidden = true;
  elements.appView.hidden = true;
  elements.loginView.hidden = false;
  elements.loginForm.email.focus();
}

function showApp() {
  elements.loginView.hidden = true;
  elements.appView.hidden = false;
  elements.skipLink.hidden = false;
}

function normalizeView() {
  const isAdmin = state.session?.user.role === 'admin';
  const allowed = isAdmin
    ? ['inbox', 'assigned', 'completed', 'rules', 'activity', 'settings', 'notifications']
    : ['assigned', 'completed', 'notifications'];
  if (!allowed.includes(state.view)) state.view = isAdmin ? 'inbox' : 'assigned';
}

function showToast(message, isError = false) {
  const toast = node('div', `toast${isError ? ' error' : ''}`, message);
  elements.toastRegion.replaceChildren(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function buttonLabelElement(button) {
  return button.querySelector('[data-button-label], .button-label, .action-label');
}

function setButtonLabel(button, label) {
  const target = buttonLabelElement(button);
  if (target) target.textContent = label;
  else button.textContent = label;
  button.dataset.label = label;
}

function setButtonBusy(button, busy, busyText) {
  const target = buttonLabelElement(button);
  if (!button.dataset.label) button.dataset.label = (target ?? button).textContent.trim();
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
  const label = busy ? busyText : button.dataset.label;
  if (target) target.textContent = label;
  else button.textContent = label;
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
        ['Unread', totals.notifications, 'Work alerts and updates']
      ]
    : [
        ['Open assigned', totals.assigned, 'Ready for your review'],
        ['Completed', totals.completed, 'Work you have finished'],
        ['Unread', totals.notifications, 'Work alerts and updates']
      ];
  elements.metrics.style.setProperty('--metric-count', String(items.length));
  elements.metrics.replaceChildren(...items.map(item => metric(...item)));
}

function renderHero() {
  const totals = counts();
  const today = new Date();
  const isAdmin = state.session.user.role === 'admin';
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(today);
  const month = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(today);
  elements.heroDate.dateTime = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('-');
  setText(elements.heroDay, today.getDate());
  setText(elements.heroWeekday, weekday);
  setText(elements.heroMonth, month);
  setText(elements.heroEyebrow, isAdmin ? 'Today’s workflow' : 'Your work today');
  setText(elements.heroTitle, isAdmin ? 'Keep every email moving.' : 'Your queue, ready when you are.');
  const assignedVerb = totals.assigned === 1 ? 'remains' : 'remain';
  const memberAssignedVerb = totals.assigned === 1 ? 'is' : 'are';
  setText(elements.heroSummary, isAdmin
    ? totals.inbox
      ? `${countLabel(totals.inbox, 'email')} ${totals.inbox === 1 ? 'needs' : 'need'} an owner. ${countLabel(totals.assigned, 'assignment')} ${assignedVerb} open.`
      : `The intake queue is clear. ${countLabel(totals.assigned, 'assignment')} ${assignedVerb} open across the team.`
    : `${countLabel(totals.assigned, 'assignment')} ${memberAssignedVerb} open, with ${countLabel(totals.notifications, 'unread update')} waiting.`);
  const actionView = isAdmin
    ? totals.inbox > 0 ? 'inbox' : totals.assigned > 0 ? 'assigned' : totals.notifications > 0 ? 'notifications' : 'completed'
    : totals.assigned > 0 ? 'assigned' : totals.notifications > 0 ? 'notifications' : 'completed';
  elements.heroAction.dataset.view = actionView;
  const actionLabels = {
    inbox: 'Review inbox',
    assigned: isAdmin ? 'View assigned' : 'Open my work',
    notifications: 'View updates',
    completed: 'View completed'
  };
  setText(elements.heroActionLabel, actionLabels[actionView]);
}

function renderDepartments() {
  if (state.session.user.role !== 'admin') return;
  const departments = state.session.departments ?? [];
  const validDepartments = new Set(['All', ...departments.map(department => department.name)]);
  if (!validDepartments.has(state.department)) state.department = 'All';
  const signature = departments.map(department => `${department.id}:${department.name}`).join('|');

  if (elements.sidebarDepartment.dataset.signature !== signature) {
    const allOption = node('option', '', 'All departments');
    allOption.value = 'All';
    const departmentOptions = departments.map(department => {
      const option = node('option', '', department.name);
      option.value = department.name;
      return option;
    });
    elements.sidebarDepartment.replaceChildren(allOption, ...departmentOptions);
    elements.sidebarDepartment.dataset.signature = signature;
  }
  elements.sidebarDepartment.value = state.department;

  if (elements.departmentSwitch.dataset.signature !== signature) {
    const filterButtons = ['All', ...departments.map(department => department.name)].map(name => {
      const button = node('button', '', name);
      button.type = 'button';
      button.dataset.department = name;
      return button;
    });
    elements.departmentSwitch.replaceChildren(...filterButtons);
    elements.departmentSwitch.dataset.signature = signature;
  }
  elements.departmentSwitch.querySelectorAll('[data-department]').forEach(button => {
    const active = button.dataset.department === state.department;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
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

  const dot = node('span', `status-dot ${email.status}`);
  dot.setAttribute('aria-hidden', 'true');

  const copy = node('span', 'email-copy');
  const subject = node('span', 'email-subject', email.subject || '(No subject)');
  const sender = [email.sender?.name, email.sender?.address].filter(Boolean).join(' · ') || 'Unknown sender';
  const meta = node('span', 'email-meta', `${sender} · ${formatDate(email.receivedAt, false)}`);
  const preview = node('span', 'email-preview', email.preview || 'No preview available.');
  const tags = node('span', 'email-tags');
  if (email.department) tags.append(node('span', 'tag department', email.department));
  const statusLabel = email.status === 'unassigned' ? 'Unassigned' : email.status === 'completed' ? 'Completed' : 'Assigned';
  tags.append(node('span', `tag ${email.status}`, statusLabel));
  copy.append(subject, meta, preview, tags);

  const person = node('span', 'email-person');
  const initials = email.assignee?.initials || '—';
  const avatar = node('span', 'avatar', initials);
  avatar.setAttribute('aria-hidden', 'true');
  person.append(avatar, node('span', '', email.assignee?.name || 'Unassigned'));
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
    : [emptyState('Nothing here', state.query ? 'No emails match your search and filters.' : 'This queue is clear.')]));
}

function renderRule(rule) {
  const item = node('article', `rule-item${rule.enabled ? '' : ' is-disabled'}`);
  const copy = node('div');
  copy.append(
    node('h3', '', rule.name),
    node('p', '', `${rule.keywords}${rule.senderFilter ? ` · From “${rule.senderFilter}”` : ''} · Assign to ${rule.assignee?.name || 'Unknown member'}`),
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
    : [emptyState('No automation rules', 'Create a rule to route matching email.')]));
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
    : [emptyState('No activity yet', 'Assignments and completions will appear here.')]));
}

function renderNotification(item) {
  const wrapper = node('article', `notification-item${item.readAt ? '' : ' unread'}`);
  const top = node('div', 'notification-top');
  const titles = {
    assignment: item.readAt ? 'Assignment' : 'New assignment',
    completion: 'Email completed',
    unassigned_overdue: 'Unassigned email overdue',
    assigned_overdue: 'Assigned work overdue'
  };
  top.append(
    node('strong', '', titles[item.kind] || 'Workflow update'),
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
    : [emptyState('You are all caught up', 'Assignments, completions, and overdue work will appear here.')]));
}

function renderTeamMember(member, departments) {
  const item = node('article', 'team-member');
  const identity = node('div', 'team-member-copy');
  const avatar = node('span', 'avatar', member.initials || '—');
  avatar.setAttribute('aria-hidden', 'true');
  const copy = node('span');
  copy.append(node('strong', '', member.name), node('small', '', member.email));
  identity.append(avatar, copy);

  const control = node('label', 'team-member-control');
  const label = node('span', 'visually-hidden', `Department for ${member.name}`);
  const select = node('select');
  select.name = 'departmentId';
  select.dataset.memberId = String(member.id);
  select.setAttribute('aria-label', `Department for ${member.name}`);
  const options = departments.map(department => {
    const option = node('option', '', department.name);
    option.value = String(department.id);
    option.selected = department.name === member.department;
    return option;
  });
  select.replaceChildren(...options);
  if (!options.some(option => option.selected) && options[0]) options[0].selected = true;
  select.dataset.previousValue = select.value;
  control.append(label, select);
  item.append(identity, control);
  return item;
}

function renderSettings() {
  if (state.session.user.role !== 'admin') return;
  const settings = state.session.settings;
  if (settings && !state.settingsDirty) {
    elements.timingForm.elements.namedItem('timeUnassignedHours').value = String(settings.timeUnassignedHours);
    elements.timingForm.elements.namedItem('timeAssignedUnmarkedHours').value = String(settings.timeAssignedUnmarkedHours);
  }

  const departments = state.session.departments ?? [];
  const members = state.session.team ?? [];
  const signature = [
    ...departments.map(department => `d:${department.id}:${department.name}`),
    ...members.map(member => `m:${member.id}:${member.department}`)
  ].join('|');
  if (elements.teamDepartmentList.dataset.signature !== signature) {
    elements.teamDepartmentList.replaceChildren(...(members.length
      ? members.map(member => renderTeamMember(member, departments))
      : [emptyState('No team members', 'Add member accounts before assigning departments.')]
    ));
    elements.teamDepartmentList.dataset.signature = signature;
  }
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
  const canFilterDepartment = isAdmin && ['assigned', 'completed'].includes(state.view);
  const isFocus = !isQueue;
  const hasRail = isQueue;
  elements.dashboardLayout.classList.toggle('focus-view', isFocus);
  elements.dashboardLayout.classList.toggle('single-column', !hasRail);
  elements.queuePanel.hidden = !isQueue;
  elements.rulesPanel.hidden = !isAdmin || (isFocus && state.view !== 'rules');
  elements.activityPanel.hidden = !isAdmin || (isFocus && state.view !== 'activity');
  elements.settingsPanel.hidden = !isAdmin || state.view !== 'settings';
  elements.notificationsPanel.hidden = isFocus ? state.view !== 'notifications' : isAdmin;
  elements.departmentSwitch.hidden = !canFilterDepartment;
  elements.workspaceToolbar.hidden = !canFilterDepartment;
  elements.metrics.hidden = isFocus;
  elements.dashboardHero.hidden = isFocus;
}

function renderHeader() {
  const titles = {
    inbox: state.department === 'All' ? 'Unified intake' : `${state.department} intake`,
    assigned: state.session.user.role === 'admin' ? 'Assigned work' : 'My work',
    completed: 'Completed',
    rules: 'Automation rules',
    activity: 'Activity',
    settings: 'Workspace settings',
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
  setText(elements.topbarAvatar, user.initials);
  setText(elements.topbarUser, user.name);
  setText(elements.topbarRole, `${user.role} · ${user.department}`);
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
  elements.sidebarDepartment.closest('.department-picker').hidden = !isAdmin || !['assigned', 'completed'].includes(state.view);
  if (isAdmin) renderDepartments();
  const unreadCount = state.session.unreadCount ?? 0;
  setText(elements.notificationCount, unreadCount || '');
  elements.notificationButton.setAttribute('aria-label', `View notifications, ${unreadCount} unread`);
  if (state.lastUnreadCount !== null && unreadCount > state.lastUnreadCount) {
    setText(elements.notificationAnnouncement, `${countLabel(unreadCount, 'unread notification')} available.`);
  } else setText(elements.notificationAnnouncement, '');
  state.lastUnreadCount = unreadCount;
  renderIdentity();
  renderHeader();
  renderNav();
  renderHero();
  renderMetrics();
  renderEmails();
  if (isAdmin) {
    renderRules();
    renderActivity();
    renderSettings();
  }
  renderNotifications();
  renderPanels();
}

function selectView(view) {
  state.view = view;
  if (view === 'inbox') state.department = 'All';
  normalizeView();
  closeSidebar();
  render();
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    elements.pageTitle.focus({ preventScroll: true });
  });
}

function selectDepartment(department) {
  state.department = department;
  render();
}

function updateSidebarAccessibility() {
  const closed = !state.sidebarOpen;
  elements.sidebar.inert = closed;
  elements.mainColumn.inert = !closed;
  elements.navBackdrop.hidden = closed;
  if (closed) elements.sidebar.setAttribute('aria-hidden', 'true');
  else elements.sidebar.removeAttribute('aria-hidden');
}

function openSidebar() {
  state.sidebarOpen = true;
  elements.appView.classList.add('nav-open');
  elements.navOpen.setAttribute('aria-expanded', 'true');
  updateSidebarAccessibility();
  elements.navClose.focus();
}

function closeSidebar(restoreFocus = false) {
  const wasOpen = state.sidebarOpen;
  state.sidebarOpen = false;
  elements.appView.classList.remove('nav-open');
  elements.navOpen.setAttribute('aria-expanded', 'false');
  updateSidebarAccessibility();
  if (restoreFocus && wasOpen) elements.navOpen.focus();
}

function openEmail(emailId, opener = document.activeElement) {
  const email = (state.session.emails ?? []).find(item => item.id === Number(emailId));
  if (!email) return;
  state.emailDialogOpener = opener instanceof HTMLElement ? opener : null;
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

  clearFieldErrors(elements.emailAssignmentForm);
  elements.assignmentError.hidden = true;
  const canAssign = state.session.user.role === 'admin' && !completed;
  elements.emailAssignmentForm.hidden = !canAssign;
  elements.assignButton.hidden = !canAssign;
  if (canAssign) {
    const members = state.session.team ?? [];
    const options = members.map(member => {
      const option = node('option', '', `${member.name} · ${member.department}`);
      option.value = String(member.id);
      option.selected = member.id === email.assignee?.id;
      return option;
    });
    elements.emailAssigneeSelect.replaceChildren(...options);
    if (!options.some(option => option.selected) && options[0]) options[0].selected = true;
    const reassigning = email.status === 'assigned';
    setText(elements.emailAssignmentLabel, reassigning ? 'Reassign to' : 'Assign to');
    setButtonLabel(elements.assignButton, reassigning ? 'Reassign' : 'Assign');
    elements.assignButton.disabled = options.length === 0;
    if (!options.length) {
      setText(elements.assignmentError, 'Add a team member before assigning email.');
      elements.assignmentError.hidden = false;
    }
  } else {
    elements.emailAssigneeSelect.replaceChildren();
  }

  const outlookUrl = safeWebUrl(email.outlookUrl);
  elements.outlookLink.hidden = !outlookUrl;
  if (outlookUrl) elements.outlookLink.href = outlookUrl;
  else elements.outlookLink.removeAttribute('href');
  elements.emailDialog.showModal();
}

function openRuleDialog() {
  if (state.session?.user.role !== 'admin') return;
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
    state.selectedEmailId = null;
    state.emailDialogOpener = null;
    state.settingsDirty = false;
    state.lastUnreadCount = null;
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
elements.timingForm.addEventListener('input', () => {
  state.settingsDirty = true;
});
elements.searchInput.addEventListener('input', event => {
  state.query = event.target.value.trim().toLocaleLowerCase();
  renderEmails();
});

elements.emailList.addEventListener('click', event => {
  const row = event.target.closest('[data-email-id]');
  if (row) openEmail(row.dataset.emailId);
});

elements.notificationButton.addEventListener('click', () => selectView('notifications'));
elements.heroAction.addEventListener('click', () => selectView(elements.heroAction.dataset.view));
elements.navOpen.addEventListener('click', openSidebar);
elements.navClose.addEventListener('click', () => closeSidebar(true));
elements.navBackdrop.addEventListener('click', () => closeSidebar(true));

elements.sidebar.addEventListener('keydown', event => {
  if (event.key !== 'Tab' || !state.sidebarOpen) return;
  const focusable = [...elements.sidebar.querySelectorAll('button:not(:disabled), select:not(:disabled)')]
    .filter(control => control.getClientRects().length > 0);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

updateSidebarAccessibility();

document.querySelector('#new-rule-button').addEventListener('click', openRuleDialog);
document.querySelectorAll('[data-close-dialog]').forEach(button => {
  button.addEventListener('click', () => closeDialog(button.dataset.closeDialog));
});

elements.emailDialog.addEventListener('close', () => {
  const opener = state.emailDialogOpener;
  state.emailDialogOpener = null;
  if (state.session && !elements.appView.hidden && (!opener || !opener.isConnected)) {
    elements.pageTitle.focus({ preventScroll: true });
  }
});

elements.timingForm.addEventListener('submit', async event => {
  event.preventDefault();
  clearFieldErrors(elements.timingForm);
  elements.timingError.hidden = true;
  if (!elements.timingForm.reportValidity()) return;
  const submit = elements.timingForm.querySelector('[type="submit"]');
  const form = new FormData(elements.timingForm);
  setButtonBusy(submit, true, 'Saving…');
  try {
    const result = await api('/api/settings', {
      method: 'PATCH',
      body: {
        timeUnassignedHours: Number(form.get('timeUnassignedHours')),
        timeAssignedUnmarkedHours: Number(form.get('timeAssignedUnmarkedHours'))
      }
    });
    state.session.settings = result.settings;
    state.settingsDirty = false;
    renderSettings();
    showToast('Response timing updated for the workspace.');
  } catch (error) {
    if (!state.session) return;
    state.settingsDirty = true;
    showFormError(elements.timingForm, elements.timingError, error);
  } finally {
    setButtonBusy(submit, false, 'Saving…');
  }
});

elements.departmentForm.addEventListener('submit', async event => {
  event.preventDefault();
  clearFieldErrors(elements.departmentForm);
  elements.departmentError.hidden = true;
  if (!elements.departmentForm.reportValidity()) return;
  const submit = elements.departmentForm.querySelector('[type="submit"]');
  const name = elements.departmentForm.elements.namedItem('name').value.trim();
  setButtonBusy(submit, true, 'Adding…');
  try {
    await mutate('/api/departments', 'POST', { name });
    elements.departmentForm.reset();
    elements.departmentForm.elements.namedItem('name').focus();
    showToast(`${name} added to the workspace.`);
  } catch (error) {
    if (!state.session) return;
    showFormError(elements.departmentForm, elements.departmentError, error);
  } finally {
    setButtonBusy(submit, false, 'Adding…');
  }
});

elements.teamDepartmentList.addEventListener('change', async event => {
  const select = event.target.closest('select[data-member-id]');
  if (!select || state.session?.user.role !== 'admin') return;
  const item = select.closest('.team-member');
  const priorError = item.querySelector('.team-change-error');
  if (priorError) priorError.remove();
  select.removeAttribute('aria-invalid');
  select.removeAttribute('aria-describedby');
  const previousValue = select.dataset.previousValue;
  const memberName = item.querySelector('strong')?.textContent || 'Team member';
  select.disabled = true;
  select.setAttribute('aria-busy', 'true');
  try {
    await api(`/api/team/${select.dataset.memberId}/department`, {
      method: 'PATCH',
      body: { departmentId: Number(select.value) }
    });
    select.dataset.previousValue = select.value;
    await refresh({ quiet: true });
    showToast(`${memberName} moved to the selected department.`);
  } catch (error) {
    if (!state.session) return;
    select.value = previousValue;
    const detail = node('small', 'field-error team-change-error', error.message);
    detail.id = `team-member-${select.dataset.memberId}-error`;
    detail.setAttribute('role', 'alert');
    item.append(detail);
    select.setAttribute('aria-invalid', 'true');
    select.setAttribute('aria-describedby', detail.id);
    select.focus();
  } finally {
    select.disabled = false;
    select.setAttribute('aria-busy', 'false');
  }
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

elements.emailAssignmentForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!state.selectedEmailId || state.session?.user.role !== 'admin') return;
  clearFieldErrors(elements.emailAssignmentForm);
  elements.assignmentError.hidden = true;
  if (!elements.emailAssignmentForm.reportValidity()) return;

  const email = (state.session.emails ?? []).find(item => item.id === state.selectedEmailId);
  if (!email || email.status === 'completed') {
    const error = new Error('Completed email cannot be reassigned.');
    showFormError(elements.emailAssignmentForm, elements.assignmentError, error);
    return;
  }

  const assigneeId = Number(elements.emailAssigneeSelect.value);
  const selectedMember = (state.session.team ?? []).find(member => member.id === assigneeId);
  const wasAssigned = email.status === 'assigned';
  setButtonBusy(elements.assignButton, true, wasAssigned ? 'Reassigning…' : 'Assigning…');
  try {
    const result = await mutate(`/api/emails/${email.id}/assign`, 'POST', { assigneeId });
    elements.emailDialog.close();
    state.selectedEmailId = null;
    elements.pageTitle.focus({ preventScroll: true });
    showToast(result.changed
      ? `${wasAssigned ? 'Reassigned' : 'Assigned'} to ${selectedMember?.name || 'the selected team member'}.`
      : `Already assigned to ${selectedMember?.name || 'the selected team member'}.`);
  } catch (error) {
    if (!state.session) return;
    showFormError(elements.emailAssignmentForm, elements.assignmentError, error);
  } finally {
    setButtonBusy(elements.assignButton, false, wasAssigned ? 'Reassigning…' : 'Assigning…');
  }
});

elements.completeButton.addEventListener('click', async () => {
  if (!state.selectedEmailId) return;
  setButtonBusy(elements.completeButton, true, 'Completing…');
  try {
    await mutate(`/api/emails/${state.selectedEmailId}/complete`);
    elements.emailDialog.close();
    elements.pageTitle.focus({ preventScroll: true });
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
  if (event.key === 'Escape' && state.sidebarOpen) closeSidebar(true);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPolling();
  else if (state.session) refresh({ quiet: true }).catch(() => startPolling());
});

refresh({ quiet: true }).catch(error => {
  if (state.session) showToast(error.message, true);
});
