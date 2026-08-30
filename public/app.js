import { overviewPreview } from './overview-model.js';
import { createFeedbackQueue, pendingTaskNotice } from './feedback.js';
import { createMetricsView } from './metrics-view.js';
import {
  DEFAULT_TIMEZONE,
  formatDateKey,
  formatZonedDate,
  isDateKey,
  localDateKey,
} from './date-time.js';
import { reconcileExpandedGroups, teamGroups, usernameFromEmail } from './team-model.js';
import {
  DEFAULT_RULE_PRIORITY,
  RULE_PRIORITY_ERROR,
  isRulePriority,
  rulePriorityLabel,
} from './rule-priorities.js';

const state = {
  session: null,
  view: new URLSearchParams(window.location.search).get('view') || 'overview',
  department: 'All',
  query: '',
  dateFilter: '',
  selectedEmailId: null,
  emailLinkRequestId: 0,
  sidebarOpen: false,
  pollTimer: null,
  settingsDirty: false,
  organizationProfileDirty: false,
  editingOrganizationId: null,
  editingDepartmentId: null,
  lastUnreadCount: null,
  emailDialogOpener: null,
  ruleDialogOpener: null,
  editingRuleId: null,
  editingRuleSnapshot: null,
  integrationReturnHandled: false,
  entryNoticeShown: false,
  lastGraphOutcomeSequence: null,
  expandedTeamGroups: new Set(),
  expandedConversations: new Set(),
  conversationMessages: new Map(),
  pollFailureActive: false,
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
  sidebarBrandLogo: document.querySelector('#sidebar-brand-logo'),
  sidebarBrandName: document.querySelector('#sidebar-brand-name'),
  topbarBrandLogo: document.querySelector('#topbar-brand-logo'),
  topbarBrandName: document.querySelector('#topbar-brand-name'),
  pageTitle: document.querySelector('#page-title'),
  topbarAvatar: document.querySelector('#topbar-avatar'),
  topbarUser: document.querySelector('#topbar-user'),
  topbarRole: document.querySelector('#topbar-role'),
  modeChip: document.querySelector('#mode-chip'),
  depAdminNavigation: document.querySelector('#dep-admin-navigation'),
  orgAdminNavigation: document.querySelector('#org-admin-navigation'),
  memberNavigation: document.querySelector('#member-navigation'),
  platformNavigation: document.querySelector('#platform-navigation'),
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
  metricsPage: document.querySelector('#metrics-page'),
  dashboardLayout: document.querySelector('#dashboard-layout'),
  queuePanel: document.querySelector('#queue-panel'),
  queueTitle: document.querySelector('#queue-title'),
  queueCaption: document.querySelector('#queue-caption'),
  emailCount: document.querySelector('#email-count'),
  emailList: document.querySelector('#email-list'),
  inboxOverviewFooter: document.querySelector('#inbox-overview-footer'),
  inboxOverviewSummary: document.querySelector('#inbox-overview-summary'),
  inboxOverviewAction: document.querySelector('[data-overview-view="inbox"]'),
  rulesPanel: document.querySelector('#rules-panel'),
  rulesCaption: document.querySelector('#rules-caption'),
  ruleList: document.querySelector('#rule-list'),
  rulesOverviewFooter: document.querySelector('#rules-overview-footer'),
  rulesOverviewSummary: document.querySelector('#rules-overview-summary'),
  rulesOverviewAction: document.querySelector('[data-overview-view="rules"]'),
  activityPanel: document.querySelector('#activity-panel'),
  activityList: document.querySelector('#activity-list'),
  notificationsPanel: document.querySelector('#notifications-panel'),
  notificationsCaption: document.querySelector('#notifications-caption'),
  notificationList: document.querySelector('#notification-list'),
  platformPanel: document.querySelector('#platform-panel'),
  departmentsPanel: document.querySelector('#departments-panel'),
  departmentManagementForm: document.querySelector('#department-management-form'),
  departmentManagementError: document.querySelector('#department-management-error'),
  departmentManagementList: document.querySelector('#department-management-list'),
  organizationList: document.querySelector('#organization-list'),
  organizationForm: document.querySelector('#organization-form'),
  organizationError: document.querySelector('#organization-error'),
  newOrganizationButton: document.querySelector('#new-organization-button'),
  cancelOrganizationButton: document.querySelector('#cancel-organization-button'),
  settingsPanel: document.querySelector('#settings-panel'),
  organizationProfileForm: document.querySelector('#organization-profile-form'),
  organizationProfileError: document.querySelector('#organization-profile-error'),
  memberForm: document.querySelector('#member-form'),
  memberError: document.querySelector('#member-error'),
  settingsAdminList: document.querySelector('#settings-admin-list'),
  departmentLeadsList: document.querySelector('#department-leads-list'),
  integrationsTitle: document.querySelector('#integrations-title'),
  integrationList: document.querySelector('#integration-list'),
  timingForm: document.querySelector('#timing-form'),
  timingError: document.querySelector('#timing-error'),
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
  heroDateFilter: document.querySelector('#hero-date-filter'),
  heroDateClear: document.querySelector('#hero-date-clear'),
  heroDateFilterStatus: document.querySelector('#hero-date-filter-status'),
  ruleDialog: document.querySelector('#rule-dialog'),
  ruleDialogEyebrow: document.querySelector('#rule-dialog-eyebrow'),
  ruleDialogTitle: document.querySelector('#rule-dialog-title'),
  ruleFormHelp: document.querySelector('#rule-form-help'),
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
  emailLinkError: document.querySelector('#email-link-error'),
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

function svgIcon(symbol) {
  const namespace = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(namespace, 'svg');
  const use = document.createElementNS(namespace, 'use');
  icon.setAttribute('class', 'icon');
  icon.setAttribute('aria-hidden', 'true');
  use.setAttribute('href', symbol);
  icon.append(use);
  return icon;
}

function renderFeedback(entries) {
  elements.toastRegion.replaceChildren(...entries.map(entry => {
    const toast = node('section', `toast ${entry.type}`);
    toast.dataset.feedbackId = String(entry.id);
    toast.setAttribute('role', entry.type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', entry.type === 'error' ? 'assertive' : 'polite');
    toast.setAttribute('aria-atomic', 'true');

    const copy = node('div', 'toast-copy');
    if (entry.title) copy.append(node('strong', 'toast-title', entry.title));
    copy.append(node('p', 'toast-message', entry.message));

    const actions = node('div', 'toast-actions');
    if (entry.action) {
      const action = node('button', 'toast-action', entry.action.label);
      action.type = 'button';
      action.addEventListener('click', () => {
        feedback.dismiss(entry.id);
        selectView(entry.action.view);
      });
      actions.append(action);
    }
    const close = node('button', 'toast-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss notification');
    close.addEventListener('click', () => feedback.dismiss(entry.id));
    actions.append(close);
    toast.append(copy, actions);
    return toast;
  }));
}

const feedback = createFeedbackQueue({ onChange: renderFeedback });

function setText(element, value, fallback = '') {
  const next = value === null || value === undefined || value === '' ? fallback : String(value);
  if (element.textContent !== next) element.textContent = next;
}

function renderBrandLogo(element, organization) {
  element.replaceChildren();
  if (organization?.logoUrl) {
    const image = node('img', 'logo-image');
    image.src = organization.logoUrl;
    image.alt = '';
    element.append(image);
  } else {
    element.textContent = 'L';
  }
}

function readLogoFile(input) {
  const file = input.files?.[0];
  if (!file) return Promise.resolve(null);
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    return Promise.reject(new Error('Logo must be a PNG, JPG, or WebP image.'));
  }
  if (file.size > 2 * 1024 * 1024) {
    return Promise.reject(new Error('Logo must be 2 MiB or smaller.'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('The selected logo could not be read.'));
    reader.readAsDataURL(file);
  });
}

function clearFieldErrors(form) {
  form.querySelectorAll('.field-error').forEach(message => message.remove());
  form.querySelectorAll('[aria-invalid="true"]').forEach(control => {
    control.removeAttribute('aria-invalid');
    control.removeAttribute('aria-describedby');
  });
}

function showFormError(form, errorElement, error) {
  const message = error?.message || 'Something went wrong. Please try again.';
  setText(errorElement, message);
  errorElement.hidden = false;
  showToast(message, true);
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

function dateFromLocalKey(value) {
  return isDateKey(value) ? new Date(`${value}T12:00:00.000Z`) : null;
}

function selectedDateLabel(value, style = 'long') {
  return formatDateKey(value, { style });
}

function sessionTimezone() {
  return state.session?.organization?.timezone || DEFAULT_TIMEZONE;
}

function formatDate(value, includeDate = true) {
  return formatZonedDate(value, { timezone: sessionTimezone(), includeDate });
}

function emailProvider(email) {
  if (['gmail', 'outlook', 'demo'].includes(email?.provider)) return email.provider;
  return email?.outlookUrl ? 'outlook' : 'demo';
}

function providerLabel(provider) {
  return {
    gmail: 'Gmail',
    outlook: 'Outlook',
    demo: 'Demo'
  }[provider] || 'Email';
}

function mailboxSummary() {
  if (state.session?.user?.role === 'dep_admin' && state.session.department) {
    return {
      connectedCount: 1,
      label: state.session.department.sharedMailbox || state.session.department.name,
    };
  }
  const summary = state.session?.mailboxSummary;
  if (summary && typeof summary.label === 'string') {
    const providers = Array.isArray(summary.providers) ? summary.providers : [];
    const connectedCount = Number(summary.connectedCount) || 0;
    return {
      connectedCount,
      label: summary.label.trim() || (connectedCount
        ? `${countLabel(connectedCount, 'mailbox')} connected`
        : 'No mailbox connected')
    };
  }

  const connected = state.session?.mode === 'graph';
  return {
    connectedCount: connected ? 1 : 0,
    label: connected ? 'Outlook connected' : 'No mailbox connected'
  };
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

async function api(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const raw = await response.text();
  let payload = {};
  if (raw) {
    try { payload = JSON.parse(raw); } catch { payload = null; }
  }
  if (response.status === 401) {
    const hadSession = Boolean(state.session);
    state.session = null;
    showLogin();
    if (hadSession) {
      showToast('Your session expired. Sign in again to continue.', true, {
        fingerprint: 'session-expired',
      });
    }
  }
  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'Something went wrong. Please try again.');
    error.fields = payload?.error?.fields ?? {};
    error.status = response.status;
    error.code = payload?.error?.code;
    error.userSafe = true;
    error.authRequired = response.status === 401;
    throw error;
  }
  if (payload === null) {
    const error = new Error('LexFlow received an invalid response. Please try again.');
    error.userSafe = true;
    throw error;
  }
  return payload;
}

async function refresh({ quiet = false } = {}) {
  try {
    state.session = await api('/api/bootstrap');
    normalizeView();
    render();
    if (state.view === 'metrics') metricsView.activate(state.session, { poll: true });
    handleIntegrationReturn();
    startPolling();
    state.pollFailureActive = false;
  } catch (error) {
    if (!quiet && state.session) reportError(error);
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
  feedback.clear();
  closeSidebar();
  state.emailLinkRequestId += 1;
  if (elements.emailDialog.open) elements.emailDialog.close();
  if (elements.ruleDialog.open) elements.ruleDialog.close();
  state.selectedEmailId = null;
  state.dateFilter = '';
  state.emailDialogOpener = null;
  state.ruleDialogOpener = null;
  state.editingRuleId = null;
  state.editingRuleSnapshot = null;
  state.settingsDirty = false;
  state.organizationProfileDirty = false;
  state.editingOrganizationId = null;
  state.entryNoticeShown = false;
  state.lastGraphOutcomeSequence = null;
  state.expandedTeamGroups = new Set();
  state.pollFailureActive = false;
  metricsView.deactivate();
  for (const element of [
    elements.departmentManagementList,
    elements.settingsAdminList,
    elements.departmentLeadsList,
    elements.integrationList,
  ]) element?.removeAttribute('data-signature');
  elements.organizationForm.hidden = true;
  state.lastUnreadCount = null;
  elements.skipLink.hidden = true;
  elements.appView.hidden = true;
  elements.loginView.hidden = false;
  const url = new URL(window.location.href);
  const authResult = url.searchParams.get('auth');
  const authMessage = url.searchParams.get('message');
  if (authResult === 'error' && authMessage) {
    setText(elements.loginError, authMessage);
    elements.loginError.hidden = false;
    showToast(authMessage, true, { fingerprint: 'microsoft-sign-in' });
    url.searchParams.delete('auth');
    url.searchParams.delete('message');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  } else {
    elements.loginError.hidden = true;
    elements.loginError.textContent = '';
  }
  elements.loginForm.querySelector('[type="submit"]').focus();
}

function showApp() {
  elements.loginView.hidden = true;
  elements.appView.hidden = false;
  elements.skipLink.hidden = false;
}

function normalizeView() {
  const role = state.session?.user.role;
  const viewsByRole = {
    platform_admin: ['platform', 'metrics'],
    org_admin: ['settings', 'departments', 'metrics'],
    dep_admin: ['overview', 'inbox', 'assigned', 'completed', 'rules', 'activity', 'notifications', 'metrics'],
    member: ['assigned', 'completed', 'notifications', 'metrics'],
  };
  const allowed = viewsByRole[role] ?? viewsByRole.member;
  if (!allowed.includes(state.view)) state.view = allowed[0];
}

function showToast(message, isError = false, options = {}) {
  return feedback.show({
    ...options,
    type: isError ? 'error' : options.type || 'success',
    message,
  });
}

function reportError(error, fallback = 'Something went wrong. Please try again.', options = {}) {
  const message = error?.userSafe && error.message ? error.message : fallback;
  return showToast(message, true, options);
}

const metricsView = createMetricsView({
  root: elements.metricsPage,
  request: api,
  notify: (error, fallback) => reportError(error, fallback, { fingerprint: 'metrics-load' }),
  isActive: () => state.view === 'metrics',
});

function reportPollingFailure(error) {
  if (!state.session || state.pollFailureActive) return;
  state.pollFailureActive = true;
  reportError(
    error,
    'LexFlow could not refresh. It will retry automatically.',
    { fingerprint: 'background-refresh' },
  );
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

function renderOverviewFooter({ footer, summary, action, preview }) {
  const isOverview = state.view === 'overview';
  footer.hidden = !isOverview;
  if (!isOverview) return;

  setText(summary, preview.summary);
  action.hidden = !preview.hasMore;
  setText(action, preview.actionLabel);
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

function emailMatchesDate(email) {
  return !state.dateFilter || localDateKey(email.receivedAt, sessionTimezone()) === state.dateFilter;
}

function emailsForSelectedDate() {
  return (state.session?.emails ?? []).filter(emailMatchesDate);
}

function counts(emails = state.session?.emails ?? []) {
  return {
    inbox: emails.filter(email => email.status === 'unassigned').length,
    assigned: emails.filter(email => email.status === 'assigned').length,
    completed: emails.filter(email => email.status === 'completed').length,
    rules: (state.session?.rules ?? []).filter(rule => rule.enabled).length,
    notifications: state.session?.unreadCount ?? 0
  };
}

function renderMetrics() {
  const totals = counts(emailsForSelectedDate());
  const isAdmin = state.session.user.role === 'dep_admin';
  const periodNote = state.dateFilter ? `Received ${selectedDateLabel(state.dateFilter, 'short')}` : null;
  const items = isAdmin
    ? [
        ['Unassigned', totals.inbox, periodNote || 'Awaiting an automation match'],
        ['Open assigned', totals.assigned, periodNote || 'Across the team'],
        ['Completed', totals.completed, periodNote || 'Recorded workflow items'],
        ['Active rules', totals.rules, 'Ordered by priority'],
        ['Unread', totals.notifications, 'Work alerts and updates']
      ]
    : [
        ['Open assigned', totals.assigned, periodNote || 'Ready for your review'],
        ['Completed', totals.completed, periodNote || 'Work you have finished'],
        ['Unread', totals.notifications, 'Work alerts and updates']
      ];
  elements.metrics.style.setProperty('--metric-count', String(items.length));
  elements.metrics.replaceChildren(...items.map(item => metric(...item)));
}

function renderHero() {
  const displayedDateKey = state.dateFilter || localDateKey(new Date(), sessionTimezone());
  const displayedDate = dateFromLocalKey(displayedDateKey);
  const totals = counts(emailsForSelectedDate());
  const isAdmin = state.session.user.role === 'dep_admin';
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' }).format(displayedDate);
  const month = new Intl.DateTimeFormat(undefined, { month: 'long', timeZone: 'UTC' }).format(displayedDate);
  elements.heroDate.dateTime = displayedDateKey;
  elements.heroDate.classList.toggle('filtered', Boolean(state.dateFilter));
  setText(elements.heroDay, displayedDate.getDate());
  setText(elements.heroWeekday, weekday);
  setText(elements.heroMonth, month);
  setText(elements.heroEyebrow, state.dateFilter
    ? `Received · ${selectedDateLabel(state.dateFilter, 'short')}`
    : isAdmin ? 'Today’s workflow' : 'Your work today');
  setText(elements.heroTitle, isAdmin ? 'Keep every email moving.' : 'Your queue, ready when you are.');
  const assignedVerb = totals.assigned === 1 ? 'remains' : 'remain';
  const memberAssignedVerb = totals.assigned === 1 ? 'is' : 'are';
  setText(elements.heroSummary, isAdmin
    ? totals.inbox
      ? `${state.dateFilter ? 'On this date, ' : ''}${countLabel(totals.inbox, 'email')} ${totals.inbox === 1 ? 'needs' : 'need'} an owner. ${countLabel(totals.assigned, 'assignment')} ${assignedVerb} open.`
      : `${state.dateFilter ? 'No unassigned email on this date.' : 'The intake queue is clear.'} ${countLabel(totals.assigned, 'assignment')} ${assignedVerb} open across the team.`
    : `${state.dateFilter ? 'On this date, ' : ''}${countLabel(totals.assigned, 'assignment')} ${memberAssignedVerb} open${state.dateFilter ? '.' : `, with ${countLabel(totals.notifications, 'unread update')} waiting.`}`);

  elements.heroDateFilter.value = state.dateFilter;
  elements.heroDateFilter.closest('.hero-calendar').classList.toggle('active', Boolean(state.dateFilter));
  elements.heroDateClear.hidden = !state.dateFilter;
  const filterLabel = state.dateFilter ? selectedDateLabel(state.dateFilter) : '';
  elements.heroDateFilter.setAttribute('aria-label', state.dateFilter
    ? `Filter emails by received date, currently ${filterLabel}`
    : 'Filter emails by received date');
  elements.heroDateFilter.closest('.hero-calendar').title = state.dateFilter
    ? `Showing emails received ${filterLabel}`
    : 'Filter emails by received date';
  elements.heroDateClear.setAttribute('aria-label', state.dateFilter
    ? `Clear date filter for ${filterLabel}`
    : 'Clear date filter');
  setText(elements.heroDateFilterStatus, state.dateFilter
    ? `Showing emails received on ${filterLabel}.`
    : 'Showing emails from all received dates.');

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
  if (state.session.user.role !== 'org_admin') return;
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
  const searchable = [
    email.subject,
    email.preview,
    email.searchText,
    sender,
    email.department,
    email.assignee?.name,
    providerLabel(emailProvider(email))
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
  return searchable.includes(state.query);
}

function visibleEmails() {
  const status = ['overview', 'inbox'].includes(state.view) ? 'unassigned' : state.view;
  return (state.session.emails ?? [])
    .filter(email => email.status === status)
    .filter(emailMatchesDate)
    .filter(emailMatchesDepartment)
    .filter(emailMatchesSearch)
    .sort((left, right) => new Date(right.receivedAt) - new Date(left.receivedAt));
}

function renderEmailRow(email, { grouped = false, compact = false } = {}) {
  const row = node('button', `email-row ${email.status}${grouped ? ' grouped' : ''}${compact ? ' compact' : ''}`);
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
  const provider = emailProvider(email);
  tags.append(node('span', `tag source ${provider}`, providerLabel(provider)));
  if (email.department) tags.append(node('span', 'tag department', email.department));
  const statusLabel = email.status === 'unassigned' ? 'Unassigned' : email.status === 'completed' ? 'Completed' : 'Assigned';
  tags.append(node('span', `tag ${email.status}`, statusLabel));
  if (Number(email.messageCount) > 1) {
    tags.append(node('span', 'tag thread-count', `${email.messageCount} messages`));
  }
  if (email.reopened) tags.append(node('span', 'tag reopened', 'Reopened'));
  copy.append(subject, meta);
  if (!compact) copy.append(preview);
  copy.append(tags);

  row.append(dot, copy);
  if (!grouped && !compact) {
    const person = node('span', 'email-person');
    const avatar = node('span', 'avatar', email.assignee?.initials || '—');
    avatar.setAttribute('aria-hidden', 'true');
    person.append(avatar, node('span', '', email.assignee?.name || 'Unassigned'));
    row.append(person);
  }
  return row;
}

function renderConversationItem(email, options = {}) {
  const row = renderEmailRow(email, options);
  if (!email.conversationId || Number(email.messageCount) <= 1) return row;
  const expanded = state.expandedConversations.has(email.conversationId);
  const wrapper = node('section', `conversation-item${expanded ? ' is-expanded' : ''}`);
  const heading = node('div', 'conversation-heading');
  const toggle = node('button', 'conversation-toggle', expanded ? 'Collapse' : 'Expand');
  toggle.type = 'button';
  toggle.dataset.conversationId = String(email.conversationId);
  toggle.setAttribute('aria-expanded', String(expanded));
  toggle.setAttribute('aria-label', `${expanded ? 'Collapse' : 'Expand'} ${email.subject} thread, ${email.messageCount} messages`);
  heading.append(row, toggle);
  wrapper.append(heading);
  if (expanded) {
    const messages = state.conversationMessages.get(email.conversationId);
    const list = node('div', 'conversation-messages');
    if (messages) {
      list.append(...messages.map(message => renderEmailRow(message, { grouped: true, compact: false })));
    } else {
      list.append(node('p', 'conversation-loading', 'Loading thread…'));
    }
    wrapper.append(list);
  }
  return wrapper;
}

function assignedEmployeeGroups(emails) {
  const groups = new Map();
  for (const email of emails) {
    const assignee = email.assignee ?? {
      id: 'unknown',
      name: 'Unknown employee',
      initials: '—',
      email: '',
      department: email.department || 'No department'
    };
    const key = String(assignee.id ?? assignee.email ?? assignee.name);
    if (!groups.has(key)) groups.set(key, { assignee, emails: [] });
    groups.get(key).emails.push(email);
  }
  return [...groups.values()].sort((left, right) =>
    left.assignee.name.localeCompare(right.assignee.name, undefined, { sensitivity: 'base' }));
}

function renderEmployeeGroup(group, index) {
  const section = node('section', 'employee-email-group');
  const identifier = String(group.assignee.id ?? index).replace(/[^a-z0-9_-]/gi, '-');
  const headingId = `employee-group-${identifier}-title`;
  const countId = `employee-group-${identifier}-count`;
  section.setAttribute('aria-labelledby', headingId);
  section.setAttribute('aria-describedby', countId);

  const header = node('header', 'employee-group-head');
  const avatar = node('span', 'avatar', group.assignee.initials || '—');
  avatar.setAttribute('aria-hidden', 'true');
  const copy = node('div', 'employee-group-copy');
  const heading = node('h3', '', group.assignee.name || 'Unknown employee');
  heading.id = headingId;
  const details = [group.assignee.department, group.assignee.email].filter(Boolean).join(' · ');
  copy.append(heading, node('p', '', details || 'No employee details'));
  const count = node('span', 'employee-group-count', countLabel(group.emails.length, 'email'));
  count.id = countId;
  header.append(avatar, copy, count);

  const emailRows = node('div', 'employee-group-emails');
  emailRows.append(...group.emails.map(email => renderConversationItem(email, { grouped: true })));
  section.append(header, emailRows);
  return section;
}

function renderEmails() {
  const focusedEmailId = elements.emailList.contains(document.activeElement)
    ? document.activeElement.closest('[data-email-id]')?.dataset.emailId
    : null;
  const allEmails = visibleEmails();
  const preview = overviewPreview(allEmails);
  const isOverview = state.view === 'overview';
  const emails = isOverview ? preview.items : allEmails;
  const groupedAssigned = state.view === 'assigned' && state.session.user.role === 'dep_admin';
  const employeeGroups = groupedAssigned ? assignedEmployeeGroups(emails) : [];
  const labels = {
    overview: ['Unassigned inbox', 'Newest mailbox items awaiting a rule'],
    inbox: ['Unassigned inbox', 'New mailbox items awaiting a rule'],
    assigned: [
      state.session.user.role === 'dep_admin' ? 'Assigned by employee' : 'My work',
      state.session.user.role === 'dep_admin'
        ? `${countLabel(employeeGroups.length, 'employee')} with open assignments`
        : 'Open assignments ready for your review'
    ],
    completed: ['Completed work', 'Closed assignment history']
  };
  const [title, caption] = labels[state.view] ?? labels.assigned;
  setText(elements.queueTitle, title);
  const dateCaption = state.dateFilter ? ` · Received ${selectedDateLabel(state.dateFilter, 'short')}` : '';
  setText(elements.queueCaption, `${caption}${dateCaption}`);
  setText(elements.emailCount, groupedAssigned
    ? `${countLabel(employeeGroups.length, 'employee')} · ${countLabel(emails.length, 'email')}`
    : countLabel(allEmails.length, 'email'));
  elements.emailList.classList.toggle('employee-group-list', groupedAssigned && emails.length > 0);
  const hasFilters = Boolean(state.query || state.dateFilter || state.department !== 'All');
  const emptyMessage = state.dateFilter
    ? `No emails received on ${selectedDateLabel(state.dateFilter)} match the current filters.`
    : hasFilters ? 'No emails match your search and filters.' : 'This queue is clear.';
  elements.emailList.replaceChildren(...(emails.length
    ? groupedAssigned
      ? employeeGroups.map(renderEmployeeGroup)
      : emails.map(email => renderConversationItem(email, { compact: isOverview }))
    : [emptyState('Nothing here', emptyMessage)]));

  renderOverviewFooter({
    footer: elements.inboxOverviewFooter,
    summary: elements.inboxOverviewSummary,
    action: elements.inboxOverviewAction,
    preview,
  });

  if (focusedEmailId) {
    window.requestAnimationFrame(() => {
      const replacement = [...elements.emailList.querySelectorAll('[data-email-id]')]
        .find(row => row.dataset.emailId === focusedEmailId);
      (replacement || elements.pageTitle).focus({ preventScroll: true });
    });
  }
}

function renderRule(rule, { compact = false } = {}) {
  const item = node('article', `rule-item${rule.enabled ? '' : ' is-disabled'}${compact ? ' compact' : ''}`);
  const copy = node('div');
  const criteria = [
    rule.keywords ? `Keywords “${rule.keywords}”` : '',
    rule.senderFilter ? `Sender contains “${rule.senderFilter}”` : ''
  ].filter(Boolean).join(' · ');
  copy.append(
    node('h3', '', rule.name),
    node('p', '', `${criteria || 'No matching criteria'} · Assign to ${rule.assignee?.name || 'Unknown member'}`),
    node('p', '', `${rulePriorityLabel(rule.priority)} priority · ${rule.enabled ? 'Active' : 'Paused'}`)
  );
  const actions = node('div', 'rule-actions');
  const edit = node('button', 'edit-rule', 'Edit');
  edit.type = 'button';
  edit.dataset.ruleId = String(rule.id);
  edit.setAttribute('aria-label', `Edit ${rule.name}`);
  const toggle = node('button', 'toggle-rule', rule.enabled ? 'Pause' : 'Enable');
  toggle.type = 'button';
  toggle.dataset.ruleId = String(rule.id);
  toggle.dataset.enabled = String(rule.enabled);
  toggle.setAttribute('aria-label', `${rule.enabled ? 'Pause' : 'Enable'} ${rule.name}`);
  const remove = node('button', 'delete-rule', 'Delete');
  remove.type = 'button';
  remove.dataset.ruleId = String(rule.id);
  remove.setAttribute('aria-label', `Delete ${rule.name}`);
  actions.append(edit, toggle, remove);
  item.append(copy, actions);
  return item;
}

function renderRules() {
  const allRules = [...(state.session.rules ?? [])].sort((left, right) => left.priority - right.priority || left.id - right.id);
  const preview = overviewPreview(allRules);
  const isOverview = state.view === 'overview';
  const rules = isOverview ? preview.items : allRules;
  const activeCount = allRules.filter(rule => rule.enabled).length;
  setText(elements.rulesCaption, `${activeCount} active`);
  elements.ruleList.replaceChildren(...(rules.length
    ? rules.map(rule => renderRule(rule, { compact: isOverview }))
    : [emptyState('No automation rules', 'Create a rule to route matching email.')]));

  renderOverviewFooter({
    footer: elements.rulesOverviewFooter,
    summary: elements.rulesOverviewSummary,
    action: elements.rulesOverviewAction,
    preview,
  });
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

function renderSettingsAdministrator(member) {
  const row = node('article', 'settings-summary-row');
  const identity = node('div', 'settings-summary-identity');
  const avatar = node('span', 'avatar', member.initials || '—');
  avatar.setAttribute('aria-hidden', 'true');
  const copy = node('span');
  copy.append(node('strong', '', member.name), node('small', '', member.email));
  identity.append(avatar, copy);
  row.append(identity, node('span', 'tag', 'OrgAdmin'));
  return row;
}

function renderDepartmentLead(department) {
  const row = node('article', 'settings-summary-row department-lead-row');
  const copy = node('div', 'settings-summary-copy');
  copy.append(node('strong', '', department.name), node('small', '', department.sharedMailbox));
  const username = usernameFromEmail(department.headUser?.email);
  row.append(copy, node('span', `tag${username ? ' dep-admin' : ''}`, username || 'Lead not assigned'));
  return row;
}

function integrationState(integration) {
  if (integration.connected && integration.inProgress) return { key: 'progress', label: 'In Progress' };
  if (integration.lastError) return { key: 'attention', label: 'Needs attention' };
  if (integration.connected) return { key: 'connected', label: 'Connected' };
  if (integration.configured) return { key: 'disconnected', label: 'Not connected' };
  return { key: 'setup', label: 'Setup required' };
}

function renderIntegration(provider, integration = {}) {
  const connection = {
    configured: Boolean(integration.configured),
    connected: Boolean(integration.connected),
    mailboxCount: Math.max(0, Number(integration.mailboxCount) || 0),
    lastSuccessAt: integration.lastSuccessAt || null,
    lastError: integration.lastError || '',
    inProgress: Boolean(integration.inProgress),
    sequence: Math.max(0, Number(integration.sequence) || 0),
    outcome: ['success', 'error'].includes(integration.outcome) ? integration.outcome : null,
  };
  const status = integrationState(connection);
  const row = node('article', 'integration-row graph');
  row.dataset.provider = provider;

  const mark = node('span', 'integration-mark');
  mark.setAttribute('aria-hidden', 'true');
  mark.append(svgIcon('#icon-mail'));

  const copy = node('div', 'integration-copy');
  const heading = node('div', 'integration-heading');
  const statusElement = node('span', `integration-status ${status.key}`);
  if (status.key === 'progress') {
    const spinner = node('span', 'integration-spinner');
    spinner.setAttribute('aria-hidden', 'true');
    statusElement.append(spinner);
  }
  statusElement.append(document.createTextNode(status.label));
  heading.append(node('h4', '', 'Microsoft Graph'), statusElement);
  copy.append(heading);

  const accountElement = node(
    'p',
    'integration-account',
    connection.configured
      ? 'Organization-wide connection for Microsoft 365 department shared mailboxes.'
      : 'Complete the Entra application configuration on this server before connecting.'
  );
  accountElement.id = `integration-${provider}-account`;
  copy.append(accountElement);

  const facts = node('dl', 'integration-facts');
  for (const [label, value] of [
    ['Tenant consent', connection.connected ? 'Granted' : connection.configured ? 'Required' : 'Unavailable'],
    ['Shared mailboxes', `${connection.mailboxCount} configured`],
    ['Last successful sync', connection.lastSuccessAt ? formatDate(connection.lastSuccessAt) : 'Not synced yet'],
  ]) {
    const fact = node('div', 'integration-fact');
    fact.append(node('dt', '', label), node('dd', '', value));
    facts.append(fact);
  }
  copy.append(facts);

  const actions = node('div', 'integration-actions');
  if (connection.configured) {
    const authorize = node('a', 'button', connection.connected ? 'Reconnect' : 'Connect Microsoft 365');
    authorize.href = '/api/integrations/outlook/authorize';
    authorize.dataset.integrationAction = 'authorize';
    authorize.setAttribute('aria-label', `${connection.connected ? 'Reconnect' : 'Connect'} Microsoft 365 tenant`);
    actions.append(authorize);
    if (connection.connected) {
      const disconnect = node('button', 'button integration-disconnect', 'Disconnect');
      disconnect.type = 'button';
      disconnect.dataset.integrationAction = 'disconnect';
      disconnect.setAttribute('aria-label', 'Disconnect Microsoft 365 tenant');
      actions.append(disconnect);
    }
  } else {
    const unavailable = node('button', 'button', 'Connect Microsoft 365');
    unavailable.type = 'button';
    unavailable.disabled = true;
    unavailable.setAttribute('aria-describedby', accountElement.id);
    actions.append(unavailable);
  }

  row.append(mark, copy, actions);
  return row;
}

function renderIntegrations() {
  const integrations = state.session.integrations ?? {};
  const providers = ['outlook'];
  const signature = JSON.stringify(providers.map(provider => {
    const integration = integrations[provider] ?? {};
    return [
      provider,
      Boolean(integration.configured),
      Boolean(integration.connected),
      Number(integration.mailboxCount) || 0,
      integration.lastSuccessAt || '',
      Boolean(integration.lastError),
      Boolean(integration.inProgress),
      Number(integration.sequence) || 0,
      integration.outcome || '',
    ];
  }));
  const outlook = integrations.outlook ?? {};
  const completedSequence = Number(outlook.sequence) || 0;
  if (!outlook.inProgress && completedSequence > 0 && completedSequence !== state.lastGraphOutcomeSequence) {
    state.lastGraphOutcomeSequence = completedSequence;
    if (outlook.connected && outlook.outcome === 'error') {
      showToast(
        'Microsoft Graph synchronization needs attention. LexFlow will retry automatically.',
        true,
        { fingerprint: `graph-sync:${completedSequence}` },
      );
    }
  }
  if (elements.integrationList.dataset.signature === signature) return;

  const focused = elements.integrationList.contains(document.activeElement)
    ? {
        provider: document.activeElement.closest('[data-provider]')?.dataset.provider,
        action: document.activeElement.dataset.integrationAction
      }
    : null;
  elements.integrationList.replaceChildren(
    ...providers.map(provider => renderIntegration(provider, integrations[provider]))
  );
  elements.integrationList.dataset.signature = signature;

  if (focused?.provider && focused.action) {
    window.requestAnimationFrame(() => {
      elements.integrationList
        .querySelector(`[data-provider="${focused.provider}"] [data-integration-action="${focused.action}"]`)
        ?.focus();
    });
  }
}

function renderSettings() {
  if (state.session.user.role !== 'org_admin') return;
  const organization = state.session.organization;
  if (organization && !state.organizationProfileDirty && !elements.organizationProfileForm.contains(document.activeElement)) {
    elements.organizationProfileForm.elements.namedItem('name').value = organization.name ?? '';
    elements.organizationProfileForm.elements.namedItem('domain').value = organization.domain ?? '';
    elements.organizationProfileForm.elements.namedItem('timezone').value = organization.timezone ?? DEFAULT_TIMEZONE;
  }
  renderIntegrations();
  const settings = state.session.settings;
  if (settings && !state.settingsDirty) {
    elements.timingForm.elements.namedItem('timeUnassignedHours').value = String(settings.timeUnassignedHours);
    elements.timingForm.elements.namedItem('timeAssignedUnmarkedHours').value = String(settings.timeAssignedUnmarkedHours);
  }

  const activeAdmins = (state.session.members ?? []).filter(member => (
    member.role === 'org_admin' && member.status === 'active'
  ));
  const adminSignature = activeAdmins.map(member => `${member.id}:${member.name}:${member.email}`).join('|');
  if (elements.settingsAdminList.dataset.signature !== adminSignature) {
    elements.settingsAdminList.replaceChildren(...(activeAdmins.length
      ? activeAdmins.map(renderSettingsAdministrator)
      : [emptyState('No active OrgAdmins', 'Use Team to activate an organization administrator.')]
    ));
    elements.settingsAdminList.dataset.signature = adminSignature;
  }

  const departments = state.session.departments ?? [];
  const leadsSignature = departments.map(department => (
    `${department.id}:${department.name}:${department.sharedMailbox}:${department.headUser?.id ?? ''}:${department.headUser?.email ?? ''}`
  )).join('|');
  if (elements.departmentLeadsList.dataset.signature !== leadsSignature) {
    elements.departmentLeadsList.replaceChildren(...(departments.length
      ? departments.map(renderDepartmentLead)
      : [emptyState('No departments', 'Use Team to create the first department and shared mailbox.')]
    ));
    elements.departmentLeadsList.dataset.signature = leadsSignature;
  }
}

function renderOrganization(item) {
  const row = node('article', `organization-item ${item.status}`);
  const copy = node('div', 'organization-item-copy');
  const title = node('h3', '', item.name);
  const details = node('p', '', `${item.domain} · ${item.entraTenantId}`);
  const status = node('span', `tag ${item.status}`, item.status === 'active' ? 'Active' : 'Archived');
  copy.append(title, details, status);
  const actions = node('div', 'rule-actions');
  const edit = node('button', 'button', 'Edit');
  edit.type = 'button'; edit.dataset.organizationAction = 'edit'; edit.dataset.organizationId = String(item.id);
  const lifecycle = node('button', 'button', item.status === 'active' ? 'Archive' : 'Restore');
  lifecycle.type = 'button'; lifecycle.dataset.organizationAction = item.status === 'active' ? 'archive' : 'restore'; lifecycle.dataset.organizationId = String(item.id);
  actions.append(edit, lifecycle);
  row.append(copy, actions);
  return row;
}

function renderPlatform() {
  if (state.session.user.role !== 'platform_admin') return;
  const organizations = state.session.organizations ?? [];
  elements.organizationList.replaceChildren(...(organizations.length
    ? organizations.map(renderOrganization)
    : [emptyState('No customer organizations', 'Create the first Entra tenant configuration to begin onboarding.')]
  ));
}

function renderDepartmentManagement() {
  if (state.session.user.role !== 'org_admin') return;
  const departments = state.session.departments ?? [];
  const members = state.session.members ?? [];
  const groups = teamGroups({ departments, members });
  state.expandedTeamGroups = reconcileExpandedGroups(
    state.expandedTeamGroups,
    groups.map(group => group.id),
  );
  const signature = JSON.stringify({
    departments: departments.map(department => [
      department.id,
      department.name,
      department.sharedMailbox,
      department.headUser?.id ?? null,
      department.headUser?.email ?? null,
    ]),
    members: members.map(member => [
      member.id,
      member.name,
      member.email,
      member.initials,
      member.departmentId,
      member.role,
      member.status,
    ]),
  });
  if (elements.departmentManagementList.dataset.signature === signature) return;

  const focusedKey = elements.departmentManagementList.contains(document.activeElement)
    ? document.activeElement.dataset.focusKey
    : null;
  const cards = groups.map(group => renderTeamGroup(group, departments));
  if (!departments.length) {
    cards.unshift(emptyState('No departments', 'Create a department with its required shared mailbox.'));
  }
  elements.departmentManagementList.replaceChildren(...cards);
  elements.departmentManagementList.dataset.signature = signature;
  if (focusedKey) {
    window.requestAnimationFrame(() => {
      [...elements.departmentManagementList.querySelectorAll('[data-focus-key]')]
        .find(control => control.dataset.focusKey === focusedKey)
        ?.focus({ preventScroll: true });
    });
  }
}

function renderTeamGroup(group, departments) {
  const details = node('details', `department-management-card team-group${group.department ? '' : ' unassigned-members-card'}`);
  details.dataset.teamGroupId = group.id;
  details.open = state.expandedTeamGroups.has(group.id);
  details.addEventListener('toggle', () => {
    if (details.open) state.expandedTeamGroups.add(group.id);
    else state.expandedTeamGroups.delete(group.id);
  });

  const summary = node('summary', 'team-group-summary');
  const copy = node('span', 'team-group-copy');
  copy.append(
    node('strong', '', group.department?.name ?? 'Unassigned members'),
    node('small', '', group.department?.sharedMailbox ?? 'People who are not currently placed in a department.'),
  );
  const facts = node('span', 'team-group-facts');
  facts.append(node('span', 'tag', countLabel(group.members.length, 'member')));
  if (group.department) {
    facts.append(node(
      'span',
      `tag${group.depAdminUsername ? ' dep-admin' : ''}`,
      group.depAdminUsername ? `DepAdmin: ${group.depAdminUsername}` : 'Lead not assigned',
    ));
  }
  summary.append(copy, facts);

  const body = node('div', 'team-group-body');
  if (group.department) {
    const actions = node('div', 'department-management-actions');
    const edit = node('button', 'button', 'Edit department');
    edit.type = 'button';
    edit.dataset.departmentAction = 'edit';
    edit.dataset.departmentId = String(group.department.id);
    edit.dataset.focusKey = `department-edit:${group.department.id}`;
    const remove = node('button', 'button department-delete-button', 'Remove department');
    remove.type = 'button';
    remove.dataset.departmentAction = 'delete';
    remove.dataset.departmentId = String(group.department.id);
    remove.dataset.focusKey = `department-delete:${group.department.id}`;
    actions.append(edit, remove);
    body.append(actions, renderDepartmentHeadControl(group));
  }

  const list = node('div', 'department-member-list');
  list.append(...(group.members.length
    ? group.members.map(member => renderDepartmentMember(member, departments, { unassigned: !group.department }))
    : [emptyState(
        group.department ? 'No members' : 'No unassigned members',
        group.department
          ? 'Move a member here from another Team group.'
          : 'People without a department will appear here.',
      )]
  ));
  body.append(list);
  details.append(summary, body);
  return details;
}

function renderDepartmentHeadControl(group) {
  const department = group.department;
  const headControl = node('div', 'department-head-control');
  const headCopy = node('div', 'department-head-copy');
  headCopy.append(
    node('strong', '', 'Department administrator'),
    node('small', '', 'Leads this shared mailbox workflow and remains a working member.'),
  );
  const candidates = group.members.filter(member => (
    ['member', 'dep_admin'].includes(member.role) && ['pending', 'active'].includes(member.status)
  ));
  const headSelect = node('select');
  headSelect.dataset.departmentHeadId = String(department.id);
  headSelect.dataset.previousValue = department.headUser?.id ? String(department.headUser.id) : '';
  headSelect.dataset.focusKey = `department-head:${department.id}`;
  headSelect.setAttribute('aria-label', `Department administrator for ${department.name}`);
  if (!candidates.length) {
    const option = node('option', '', 'Assign an active member first');
    option.value = '';
    headSelect.append(option);
    headSelect.disabled = true;
  } else {
    headSelect.append(...candidates.map(member => {
      const option = node('option', '', `${member.name}${member.id === department.headUser?.id ? ' · DepAdmin' : ''}`);
      option.value = String(member.id);
      option.selected = member.id === department.headUser?.id;
      return option;
    }));
  }
  headControl.append(headCopy, headSelect);
  return headControl;
}

function renderDepartmentMember(member, departments, { unassigned = false } = {}) {
  const row = node('article', 'department-member-row');
  row.dataset.memberRowId = String(member.id);
  const identity = node('div', 'team-member-copy');
  const avatar = node('span', 'avatar', member.initials || '—');
  avatar.setAttribute('aria-hidden', 'true');
  const copy = node('span');
  const name = node('strong', '', member.name);
  if (member.role === 'dep_admin') name.append(node('span', 'tag dep-admin', 'DepAdmin'));
  if (member.role === 'org_admin') name.append(node('span', 'tag', 'OrgAdmin'));
  copy.append(name, node('small', '', `${member.email} · ${member.status}`));
  identity.append(avatar, copy);

  const controls = node('div', 'department-member-controls');
  if (member.role !== 'org_admin') {
    const department = node('select');
    department.dataset.departmentMemberId = String(member.id);
    department.dataset.previousValue = member.departmentId == null ? '' : String(member.departmentId);
    department.dataset.focusKey = `member-department:${member.id}`;
    department.setAttribute('aria-label', `Department for ${member.name}`);
    if (unassigned) {
      const placeholder = node('option', '', departments.length ? 'Choose department' : 'Create a department first');
      placeholder.value = '';
      placeholder.selected = true;
      placeholder.disabled = true;
      department.append(placeholder);
    }
    department.append(...departments.map(item => {
      const option = node('option', '', item.name);
      option.value = String(item.id);
      option.selected = item.id === Number(member.departmentId);
      return option;
    }));
    if (!departments.length) department.disabled = true;
    controls.append(department);
  } else {
    controls.append(node('span', 'team-member-scope', 'Organization-wide'));
  }

  const role = node('select');
  role.dataset.memberAction = 'role'; role.dataset.memberId = String(member.id);
  role.dataset.focusKey = `member-role:${member.id}`;
  role.setAttribute('aria-label', `Role for ${member.name}`);
  const memberRole = node('option', '', 'Member'); memberRole.value = 'member';
  const adminRole = node('option', '', 'OrgAdmin'); adminRole.value = 'org_admin';
  role.append(memberRole, adminRole);
  role.value = member.role === 'org_admin' ? 'org_admin' : 'member';
  role.dataset.previousValue = role.value;
  const status = node('select');
  status.dataset.memberAction = 'status'; status.dataset.memberId = String(member.id);
  status.dataset.focusKey = `member-status:${member.id}`;
  status.setAttribute('aria-label', `Status for ${member.name}`);
  for (const value of ['pending', 'active', 'disabled']) {
    const option = node('option', '', value[0].toUpperCase() + value.slice(1));
    option.value = value;
    status.append(option);
  }
  status.value = member.status;
  status.dataset.previousValue = status.value;
  controls.append(role, status);
  row.append(identity, controls);
  return row;
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
  const isDepAdmin = state.session.user.role === 'dep_admin';
  const isOrgAdmin = state.session.user.role === 'org_admin';
  const isPlatform = state.session.user.role === 'platform_admin';
  const isMetrics = state.view === 'metrics';
  const isOverview = isDepAdmin && state.view === 'overview';
  const isQueue = ['dep_admin', 'member'].includes(state.session.user.role)
    && ['inbox', 'assigned', 'completed'].includes(state.view);
  const isFocus = !isMetrics && !isOverview && !isQueue;
  elements.dashboardLayout.classList.toggle('overview-view', isOverview);
  elements.dashboardLayout.classList.toggle('focus-view', isFocus);
  elements.dashboardLayout.classList.toggle('single-column', !isOverview);
  elements.queuePanel.hidden = !(isOverview || isQueue);
  elements.rulesPanel.hidden = !isDepAdmin || !['overview', 'rules'].includes(state.view);
  elements.activityPanel.hidden = !isDepAdmin || state.view !== 'activity';
  elements.settingsPanel.hidden = !isOrgAdmin || state.view !== 'settings';
  elements.departmentsPanel.hidden = !isOrgAdmin || state.view !== 'departments';
  elements.notificationsPanel.hidden = !['dep_admin', 'member'].includes(state.session.user.role)
    || state.view !== 'notifications';
  elements.platformPanel.hidden = !isPlatform || state.view !== 'platform';
  elements.metricsPage.hidden = !isMetrics;
  elements.dashboardLayout.hidden = isMetrics;
  elements.departmentSwitch.hidden = true;
  elements.workspaceToolbar.hidden = true;
  elements.metrics.hidden = isFocus;
  elements.dashboardHero.hidden = isFocus || isMetrics;
}

function renderHeader() {
  const titles = {
    overview: state.session.department?.name ? `${state.session.department.name} overview` : 'Department overview',
    inbox: state.session.department?.name ? `${state.session.department.name} intake` : 'Department intake',
    assigned: state.session.user.role === 'dep_admin' ? 'Assigned work' : 'My work',
    completed: 'Completed',
    rules: 'Automation rules',
    activity: 'Activity',
    settings: 'Workspace settings',
    departments: 'Team',
    notifications: 'Notifications',
    platform: 'Organizations',
    metrics: 'Metrics',
  };
  setText(elements.pageTitle, titles[state.view]);
  const mailbox = mailboxSummary();
  const connected = mailbox.connectedCount > 0;
  setText(elements.modeChip, mailbox.label);
  elements.modeChip.classList.toggle('connected', connected);
  elements.searchInput.hidden = !['inbox', 'assigned', 'completed'].includes(state.view);
  elements.searchInput.parentElement.hidden = elements.searchInput.hidden;
}

function renderIdentity() {
  const { user, sync } = state.session;
  const organization = state.session.organization;
  const mailbox = mailboxSummary();
  const connectedIntegrations = Object.values(state.session.integrations ?? {})
    .filter(integration => integration.connected);
  const connectedIntegrationErrors = connectedIntegrations
    .filter(integration => integration.lastError);
  const staleSourceSummary = sync?.lastError?.startsWith('Sync needs attention:')
    && connectedIntegrationErrors.length === 0;
  const syncError = staleSourceSummary ? null : sync?.lastError;
  const connectedSyncAt = connectedIntegrations
    .map(integration => integration.lastSuccessAt)
    .filter(Boolean)
    .sort((left, right) => new Date(right) - new Date(left))[0] ?? null;
  const lastSyncAt = state.session.mode === 'demo' ? sync?.lastSuccessAt : connectedSyncAt;
  setText(elements.sidebarBrandName, organization?.name, 'LexFlow');
  setText(elements.topbarBrandName, organization?.name, 'LexFlow');
  renderBrandLogo(elements.sidebarBrandLogo, organization);
  renderBrandLogo(elements.topbarBrandLogo, organization);
  setText(elements.sidebarAvatar, user.initials);
  setText(elements.sidebarUser, user.name);
  const roleLabel = {
    platform_admin: 'PlatformAdmin',
    org_admin: 'OrgAdmin',
    dep_admin: 'DepAdmin',
    member: 'Member',
  }[user.role] ?? user.role;
  const identityDetail = [roleLabel, user.department].filter(Boolean).join(' · ');
  setText(elements.sidebarRole, identityDetail);
  setText(elements.topbarAvatar, user.initials);
  setText(elements.topbarUser, user.name);
  setText(elements.topbarRole, identityDetail);
  const hideMailboxStatus = user.role === 'member';
  elements.sidebarMode.closest('.mailbox-card').hidden = hideMailboxStatus;
  elements.modeChip.hidden = hideMailboxStatus;
  setText(elements.sidebarMode, mailbox.label);
  elements.sidebarMode.closest('.mailbox-card').classList.toggle('connected', mailbox.connectedCount > 0);
  setText(elements.sidebarSync, user.role === 'dep_admin'
    ? 'Mailbox sync managed by OrgAdmin'
    : lastSyncAt ? `Synced ${formatDate(lastSyncAt)}` : 'Waiting for first sync');
  elements.statusBanner.hidden = !syncError;
  setText(elements.statusBanner, syncError
    ? syncError.startsWith('Sync needs attention:') ? syncError : `Sync needs attention: ${syncError}`
    : '');
}

function render() {
  if (!state.session) {
    showLogin();
    return;
  }
  showApp();
  const isOrgAdmin = state.session.user.role === 'org_admin';
  const isDepAdmin = state.session.user.role === 'dep_admin';
  const isPlatform = state.session.user.role === 'platform_admin';
  elements.orgAdminNavigation.hidden = !isOrgAdmin;
  elements.depAdminNavigation.hidden = !isDepAdmin;
  elements.memberNavigation.hidden = state.session.user.role !== 'member';
  elements.platformNavigation.hidden = !isPlatform;
  elements.syncButton.hidden = true;
  elements.notificationButton.hidden = !['dep_admin', 'member'].includes(state.session.user.role);
  elements.sidebarDepartment.closest('.department-picker').hidden = true;
  if (isOrgAdmin && state.view === 'departments') renderDepartmentManagement();
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
  if (isDepAdmin) {
    renderRules();
    renderActivity();
  }
  if (isOrgAdmin) renderSettings();
  if (isPlatform) renderPlatform();
  renderNotifications();
  renderPanels();
  if (state.view === 'metrics') metricsView.activate(state.session);
  else metricsView.deactivate();
  if (!state.entryNoticeShown) {
    state.entryNoticeShown = true;
    const notice = pendingTaskNotice({
      role: state.session.user.role,
      pendingTasks: state.session.pendingTasks,
    });
    if (notice) feedback.show(notice);
  }
}

function handleIntegrationReturn() {
  if (state.integrationReturnHandled || state.session?.user.role !== 'org_admin') return;
  const url = new URL(window.location.href);
  const result = url.searchParams.get('integration');
  if (!['gmail-connected', 'gmail-error', 'outlook-connected', 'outlook-error'].includes(result)) return;

  state.integrationReturnHandled = true;
  url.searchParams.delete('integration');
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  state.view = 'settings';
  normalizeView();
  render();

  const provider = result.startsWith('outlook-') ? 'Microsoft 365' : 'Gmail';
  const isError = result.endsWith('-error');
  showToast(
    isError
      ? `${provider} authorization could not be completed. Check administrator consent and try again.`
      : `${provider} connected to this workspace.`,
    isError,
  );
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    elements.integrationsTitle.focus({ preventScroll: true });
  });
}

function selectView(view, { history = true } = {}) {
  state.view = view;
  if (view === 'inbox') state.department = 'All';
  normalizeView();
  const url = new URL(window.location.href);
  for (const key of ['metricsPreset', 'metricsFrom', 'metricsTo', 'departmentId', 'employeeId', 'metricsView']) {
    if (state.view !== 'metrics') url.searchParams.delete(key);
  }
  url.searchParams.set('view', state.view);
  if (history) window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`);
  else window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
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

function setEmailLinkReady(email, webUrl) {
  const sourceName = providerLabel(emailProvider(email));
  const openLabel = `Open in ${sourceName}`;
  elements.outlookLink.hidden = false;
  elements.outlookLink.href = webUrl;
  elements.outlookLink.removeAttribute('aria-busy');
  elements.outlookLink.removeAttribute('aria-disabled');
  setText(elements.outlookLink, openLabel);
  elements.outlookLink.setAttribute('aria-label', `${openLabel}: ${email.subject || 'No subject'}`);
}

function setEmailLinkUnavailable() {
  elements.outlookLink.hidden = true;
  elements.outlookLink.removeAttribute('href');
  elements.outlookLink.removeAttribute('aria-busy');
  elements.outlookLink.setAttribute('aria-disabled', 'true');
}

function emailLinkRequestIsStale(requestId, email) {
  return requestId !== state.emailLinkRequestId
    || state.selectedEmailId !== email.id
    || !elements.emailDialog.open;
}

async function prepareEmailLink(email, requestId) {
  elements.emailLinkError.hidden = true;
  elements.emailLinkError.textContent = '';
  const provider = emailProvider(email);
  if (provider !== 'outlook') {
    const directWebUrl = safeWebUrl(email.webUrl || email.outlookUrl);
    if (directWebUrl) setEmailLinkReady(email, directWebUrl);
    else setEmailLinkUnavailable();
    return;
  }

  elements.outlookLink.hidden = false;
  elements.outlookLink.removeAttribute('href');
  elements.outlookLink.setAttribute('aria-busy', 'true');
  elements.outlookLink.setAttribute('aria-disabled', 'true');
  setText(elements.outlookLink, 'Preparing Outlook link…');
  elements.outlookLink.setAttribute('aria-label', `Preparing Outlook link: ${email.subject || 'No subject'}`);

  try {
    const payload = await api(`/api/emails/${email.id}/open-link`);
    if (emailLinkRequestIsStale(requestId, email)) return;
    const webUrl = safeWebUrl(payload.webUrl);
    if (!webUrl) throw new Error('Outlook returned an invalid message link.');
    setEmailLinkReady(email, webUrl);
  } catch (error) {
    if (emailLinkRequestIsStale(requestId, email)) return;
    setEmailLinkUnavailable();
    const fallback = 'Outlook could not prepare this message link.';
    setText(elements.emailLinkError, error?.userSafe ? error.message : fallback, fallback);
    elements.emailLinkError.hidden = false;
    reportError(error, fallback, { fingerprint: `outlook-link:${email.id}` });
  }
}

function openEmail(emailId, opener = document.activeElement) {
  const email = (state.session.emails ?? []).find(item => item.id === Number(emailId))
    ?? [...state.conversationMessages.values()].flat().find(item => item.id === Number(emailId));
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
  elements.completeButton.hidden = !['member', 'dep_admin'].includes(state.session.user.role)
    || email.status !== 'assigned'
    || Number(email.assignee?.id) !== Number(state.session.user.id);

  clearFieldErrors(elements.emailAssignmentForm);
  elements.assignmentError.hidden = true;
  const canAssign = state.session.user.role === 'dep_admin' && !completed;
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

  const emailLinkRequestId = ++state.emailLinkRequestId;
  elements.emailDialog.showModal();
  void prepareEmailLink(email, emailLinkRequestId);
}

function normalizedRuleValues(source) {
  return {
    name: String(source.name ?? '').trim(),
    keywords: String(source.keywords ?? '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)
      .join(','),
    senderFilter: String(source.senderFilter ?? '').trim(),
    assigneeId: Number(source.assigneeId ?? source.assignee?.id),
    priority: Number(source.priority)
  };
}

function ruleFormValues() {
  const form = new FormData(elements.ruleForm);
  return normalizedRuleValues({
    name: form.get('name'),
    keywords: form.get('keywords'),
    senderFilter: form.get('senderFilter'),
    assigneeId: form.get('assigneeId'),
    priority: form.get('priority')
  });
}

function validateRuleValues(values) {
  const fields = {};
  if (!values.name || values.name.length > 80) {
    fields.name = 'Enter a rule name of 80 characters or fewer.';
  }
  if (!values.keywords && !values.senderFilter) {
    fields.keywords = 'Enter keywords, a sender filter, or both.';
  }
  if (!Number.isInteger(values.assigneeId) || values.assigneeId < 1) {
    fields.assigneeId = 'Choose a valid team member.';
  }
  if (!isRulePriority(values.priority)) {
    fields.priority = RULE_PRIORITY_ERROR;
  }
  if (!Object.keys(fields).length) return null;
  const error = new Error(Object.values(fields)[0]);
  error.fields = fields;
  return error;
}

function openRuleDialog(rule = null, opener = document.activeElement) {
  if (state.session?.user.role !== 'dep_admin') return;
  elements.ruleForm.reset();
  clearFieldErrors(elements.ruleForm);
  elements.ruleError.hidden = true;
  state.ruleDialogOpener = opener instanceof HTMLElement ? opener : null;
  state.editingRuleId = rule?.id ?? null;
  state.editingRuleSnapshot = rule ? normalizedRuleValues(rule) : null;

  const editing = Boolean(rule);
  setText(elements.ruleDialogEyebrow, editing ? 'Update routing' : 'DepAdmin only');
  setText(elements.ruleDialogTitle, editing ? `Edit ${rule.name}` : 'Create automation rule');
  setText(elements.ruleFormHelp, editing
    ? 'Change at least one field. A name, teammate, priority, and one matching condition must remain.'
    : 'Set a rule name, teammate, priority, and at least one matching condition.');
  setButtonLabel(elements.ruleForm.querySelector('[type="submit"]'), editing ? 'Save changes' : 'Create rule');

  const members = (state.session.team ?? []).filter(user => (
    ['member', 'dep_admin'].includes(user.role)
  ));
  const options = members.map(member => {
    const option = node('option', '', `${member.name} · ${member.department}`);
    option.value = String(member.id);
    option.selected = member.id === rule?.assignee?.id;
    return option;
  });
  elements.ruleAssignee.replaceChildren(...options);
  ['name', 'assigneeId', 'priority'].forEach(name => {
    elements.ruleForm.elements.namedItem(name).required = !editing;
  });
  elements.ruleForm.elements.namedItem('keywords').required = false;

  if (editing) {
    const values = state.editingRuleSnapshot;
    elements.ruleForm.elements.namedItem('name').value = values.name;
    elements.ruleForm.elements.namedItem('keywords').value = values.keywords;
    elements.ruleForm.elements.namedItem('senderFilter').value = values.senderFilter;
    elements.ruleForm.elements.namedItem('assigneeId').value = String(values.assigneeId);
    elements.ruleForm.elements.namedItem('priority').value = String(values.priority);
  } else {
    elements.ruleForm.elements.namedItem('priority').value = String(DEFAULT_RULE_PRIORITY);
  }
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
  state.pollTimer = window.setInterval(() => refresh({ quiet: true }).catch(reportPollingFailure), 20_000);
}

function stopPolling() {
  if (state.pollTimer) window.clearInterval(state.pollTimer);
  state.pollTimer = null;
}

elements.loginForm.addEventListener('submit', event => {
  event.preventDefault();
  window.location.assign('/api/auth/outlook/start');
});

function setOrganizationFormMode(organization = null) {
  state.editingOrganizationId = organization?.id ?? null;
  elements.organizationForm.hidden = false;
  const editing = Boolean(organization);
  elements.organizationForm.reset();
  clearFieldErrors(elements.organizationForm);
  elements.organizationError.hidden = true;
  elements.organizationForm.elements.namedItem('id').value = organization?.id ?? '';
  elements.organizationForm.elements.namedItem('name').value = organization?.name ?? '';
  elements.organizationForm.elements.namedItem('domain').value = organization?.domain ?? '';
  elements.organizationForm.elements.namedItem('entraTenantId').value = organization?.entraTenantId ?? '';
  elements.organizationForm.elements.namedItem('initialAdminEmail').value = organization?.initialAdminEmail ?? '';
  elements.organizationForm.elements.namedItem('logo').value = '';
  for (const name of ['entraTenantId']) {
    const field = elements.organizationForm.elements.namedItem(name);
    field.required = true;
    field.disabled = editing;
  }
  for (const name of ['initialAdminEmail']) {
    const field = elements.organizationForm.elements.namedItem(name);
    field.required = true;
    field.closest('.field').hidden = false;
    field.disabled = false;
  }
  setButtonLabel(elements.organizationForm.querySelector('[type="submit"]'), editing ? 'Save organization' : 'Create organization');
  elements.organizationForm.elements.namedItem('name').focus();
}

elements.newOrganizationButton.addEventListener('click', () => setOrganizationFormMode());
elements.cancelOrganizationButton.addEventListener('click', () => {
  elements.organizationForm.hidden = true;
  state.editingOrganizationId = null;
});

elements.organizationForm.addEventListener('submit', async event => {
  event.preventDefault();
  clearFieldErrors(elements.organizationForm);
  elements.organizationError.hidden = true;
  if (!elements.organizationForm.reportValidity()) return;
  const form = new FormData(elements.organizationForm);
  const editing = Boolean(state.editingOrganizationId);
  let logo;
  try {
    logo = await readLogoFile(elements.organizationForm.elements.namedItem('logo'));
  } catch (error) {
    showFormError(elements.organizationForm, elements.organizationError, error);
    return;
  }
  const body = {
    name: String(form.get('name') ?? '').trim(),
    domain: String(form.get('domain') ?? '').trim(),
  };
  if (logo) body.logo = logo;
  if (!editing) Object.assign(body, {
    entraTenantId: String(form.get('entraTenantId') ?? '').trim(),
  });
  Object.assign(body, {
    initialAdminEmail: String(form.get('initialAdminEmail') ?? '').trim(),
  });
  const submit = elements.organizationForm.querySelector('[type="submit"]');
  setButtonBusy(submit, true, editing ? 'Saving…' : 'Creating…');
  try {
    await mutate(editing ? `/api/platform/organizations/${state.editingOrganizationId}` : '/api/platform/organizations', editing ? 'PATCH' : 'POST', body);
    elements.organizationForm.hidden = true;
    state.editingOrganizationId = null;
    showToast(editing ? 'Organization updated.' : 'Organization created.');
  } catch (error) {
    if (state.session) showFormError(elements.organizationForm, elements.organizationError, error);
  } finally {
    setButtonBusy(submit, false, editing ? 'Saving…' : 'Creating…');
  }
});

elements.organizationList.addEventListener('click', async event => {
  const action = event.target.closest('[data-organization-action]');
  if (!action || state.session?.user.role !== 'platform_admin') return;
  const organization = (state.session.organizations ?? []).find(item => item.id === Number(action.dataset.organizationId));
  if (!organization) return;
  if (action.dataset.organizationAction === 'edit') {
    setOrganizationFormMode(organization);
    return;
  }
  const archive = action.dataset.organizationAction === 'archive';
  if (!window.confirm(`${archive ? 'Archive' : 'Restore'} ${organization.name}?`)) return;
  setButtonBusy(action, true, '…');
  try {
    await mutate(`/api/platform/organizations/${organization.id}/${archive ? 'archive' : 'restore'}`);
    showToast(`${organization.name} ${archive ? 'archived' : 'restored'}.`);
  } catch (error) {
    reportError(error);
    setButtonBusy(action, false, '…');
  }
});

elements.organizationProfileForm.addEventListener('input', () => {
  state.organizationProfileDirty = true;
});

elements.organizationProfileForm.addEventListener('submit', async event => {
  event.preventDefault();
  clearFieldErrors(elements.organizationProfileForm);
  elements.organizationProfileError.hidden = true;
  if (!elements.organizationProfileForm.reportValidity()) return;
  const form = new FormData(elements.organizationProfileForm);
  const submit = elements.organizationProfileForm.querySelector('[type="submit"]');
  setButtonBusy(submit, true, 'Saving…');
  let logo;
  try {
    logo = await readLogoFile(elements.organizationProfileForm.elements.namedItem('logo'));
  } catch (error) {
    showFormError(elements.organizationProfileForm, elements.organizationProfileError, error);
    return;
  }
  try {
    const body = {
      name: String(form.get('name') ?? '').trim(),
      domain: String(form.get('domain') ?? '').trim(),
      timezone: String(form.get('timezone') ?? '').trim(),
    };
    if (logo) body.logo = logo;
    const result = await api('/api/organization', {
      method: 'PATCH',
      body,
    });
    state.session.organization = result.organization;
    state.organizationProfileDirty = false;
    renderSettings();
    showToast('Organization profile updated. Sign in again if your domain changed.');
  } catch (error) {
    if (state.session) showFormError(elements.organizationProfileForm, elements.organizationProfileError, error);
  } finally {
    setButtonBusy(submit, false, 'Saving…');
  }
});

elements.memberForm.addEventListener('submit', async event => {
  event.preventDefault();
  clearFieldErrors(elements.memberForm);
  elements.memberError.hidden = true;
  if (!elements.memberForm.reportValidity()) return;
  const form = new FormData(elements.memberForm);
  const submit = elements.memberForm.querySelector('[type="submit"]');
  setButtonBusy(submit, true, 'Adding…');
  try {
    await mutate('/api/members', 'POST', {
      email: String(form.get('email') ?? '').trim(),
      role: form.get('role'),
    });
    elements.memberForm.reset();
    showToast('Person pre-provisioned.');
  } catch (error) {
    if (state.session) showFormError(elements.memberForm, elements.memberError, error);
  } finally {
    setButtonBusy(submit, false, 'Adding…');
  }
});

elements.departmentManagementList.addEventListener('change', async event => {
  const control = event.target.closest('[data-member-action]');
  if (!control || state.session?.user.role !== 'org_admin') return;
  const member = (state.session.members ?? []).find(item => item.id === Number(control.dataset.memberId));
  if (!member) return;
  const body = { [control.dataset.memberAction]: control.value };
  const previousValue = control.dataset.previousValue;
  control.disabled = true;
  try {
    await mutate(`/api/members/${member.id}`, 'PATCH', body);
    control.dataset.previousValue = control.value;
    showToast(`${member.name} updated.`);
  } catch (error) {
    control.value = previousValue;
    reportError(error);
  } finally {
    control.disabled = false;
  }
});

document.querySelector('#logout-button').addEventListener('click', async () => {
  const button = document.querySelector('#logout-button');
  setButtonBusy(button, true, '…');
  let logoutError = null;
  try { await api('/api/logout', { method: 'POST' }); } catch (error) {
    logoutError = error;
  } finally {
    state.session = null;
    state.view = 'overview';
    state.department = 'All';
    state.query = '';
    state.selectedEmailId = null;
    state.emailDialogOpener = null;
    state.settingsDirty = false;
    state.lastUnreadCount = null;
    elements.searchInput.value = '';
    showLogin();
    setButtonBusy(button, false, '…');
    if (logoutError) reportError(logoutError, 'LexFlow could not complete sign-out on the server.');
    else showToast('Signed out.');
  }
});

document.querySelectorAll('.nav-item[data-view]').forEach(button => {
  button.addEventListener('click', () => selectView(button.dataset.view));
});

document.querySelectorAll('[data-view-link]').forEach(button => {
  button.addEventListener('click', () => selectView(button.dataset.viewLink));
});

document.querySelectorAll('[data-overview-view]').forEach(button => {
  button.addEventListener('click', () => selectView(button.dataset.overviewView));
});

window.addEventListener('popstate', () => {
  if (!state.session) return;
  state.view = new URLSearchParams(window.location.search).get('view') || ({
    platform_admin: 'platform',
    org_admin: 'settings',
    dep_admin: 'overview',
    member: 'assigned',
  }[state.session.user.role] ?? 'assigned');
  normalizeView();
  render();
  if (state.view === 'metrics') metricsView.restoreFromUrl();
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
elements.heroDateFilter.addEventListener('change', event => {
  state.dateFilter = isDateKey(event.target.value) ? event.target.value : '';
  render();
});
elements.heroDateClear.addEventListener('click', () => {
  state.dateFilter = '';
  render();
  window.requestAnimationFrame(() => elements.heroDateFilter.focus({ preventScroll: true }));
});

elements.emailList.addEventListener('click', event => {
  const toggle = event.target.closest('[data-conversation-id]');
  if (toggle) {
    const conversationId = Number(toggle.dataset.conversationId);
    if (state.expandedConversations.has(conversationId)) {
      state.expandedConversations.delete(conversationId);
      renderEmails();
      return;
    }
    state.expandedConversations.add(conversationId);
    renderEmails();
    if (!state.conversationMessages.has(conversationId)) {
      api(`/api/conversations/${conversationId}/messages`)
        .then(payload => {
          state.conversationMessages.set(conversationId, payload.messages ?? []);
          renderEmails();
        })
        .catch(error => {
          state.expandedConversations.delete(conversationId);
          reportError(error, 'The email thread could not be loaded.');
          renderEmails();
        });
    }
    return;
  }
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

document.querySelector('#new-rule-button').addEventListener('click', event => openRuleDialog(null, event.currentTarget));
document.querySelectorAll('[data-close-dialog]').forEach(button => {
  button.addEventListener('click', () => closeDialog(button.dataset.closeDialog));
});

elements.ruleDialog.addEventListener('close', () => {
  const opener = state.ruleDialogOpener;
  const editedRuleId = state.editingRuleId;
  state.ruleDialogOpener = null;
  state.editingRuleId = null;
  state.editingRuleSnapshot = null;
  if (!state.session || elements.appView.hidden) return;
  window.requestAnimationFrame(() => {
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    else if (editedRuleId) {
      elements.ruleList.querySelector(`.edit-rule[data-rule-id="${editedRuleId}"]`)?.focus({ preventScroll: true });
    } else elements.pageTitle.focus({ preventScroll: true });
  });
});

elements.emailDialog.addEventListener('close', () => {
  const opener = state.emailDialogOpener;
  state.emailLinkRequestId += 1;
  state.selectedEmailId = null;
  state.emailDialogOpener = null;
  if (state.session && !elements.appView.hidden && (!opener || !opener.isConnected)) {
    elements.pageTitle.focus({ preventScroll: true });
  }
});

elements.integrationList.addEventListener('click', async event => {
  const action = event.target.closest('[data-integration-action]');
  if (!action || state.session?.user.role !== 'org_admin') return;

  if (action.dataset.integrationAction === 'authorize') {
    event.preventDefault();
    action.setAttribute('aria-busy', 'true');
    action.setAttribute('aria-disabled', 'true');
    setText(action, 'Connecting…');
    window.location.assign(action.href);
    return;
  }

  if (action.dataset.integrationAction !== 'disconnect') return;
  const provider = action.closest('[data-provider]')?.dataset.provider;
  if (!provider) return;
  const label = provider === 'outlook' ? 'Microsoft 365' : 'Gmail';
  if (!window.confirm(`Disconnect ${label} from this workspace? New messages will stop syncing.`)) return;

  setButtonBusy(action, true, 'Disconnecting…');
  try {
    await mutate(`/api/integrations/${provider}`, 'DELETE');
    showToast(`${label} disconnected from this workspace.`);
    window.requestAnimationFrame(() => {
      elements.integrationList.querySelector('[data-integration-action="authorize"]')?.focus();
    });
  } catch (error) {
    if (!state.session) return;
    reportError(error, `${label} could not be disconnected. Please try again.`);
    action.focus();
  } finally {
    if (action.isConnected) setButtonBusy(action, false, 'Disconnecting…');
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

elements.departmentManagementForm.addEventListener('submit', async event => {
  event.preventDefault();
  clearFieldErrors(elements.departmentManagementForm);
  elements.departmentManagementError.hidden = true;
  if (!elements.departmentManagementForm.reportValidity()) return;
  const form = new FormData(elements.departmentManagementForm);
  const editing = Boolean(state.editingDepartmentId);
  const body = {
    name: String(form.get('name') ?? '').trim(),
    sharedMailbox: String(form.get('sharedMailbox') ?? '').trim(),
  };
  const submit = elements.departmentManagementForm.querySelector('[type="submit"]');
  setButtonBusy(submit, true, editing ? 'Saving…' : 'Adding…');
  try {
    await mutate(editing ? `/api/departments/${state.editingDepartmentId}` : '/api/departments', editing ? 'PATCH' : 'POST', body);
    elements.departmentManagementForm.reset();
    state.editingDepartmentId = null;
    setButtonLabel(submit, 'Add department');
    showToast(editing ? 'Department updated.' : 'Department added.');
  } catch (error) {
    showFormError(elements.departmentManagementForm, elements.departmentManagementError, error);
  } finally {
    setButtonBusy(submit, false, editing ? 'Saving…' : 'Adding…');
  }
});

elements.departmentManagementList.addEventListener('click', async event => {
  const action = event.target.closest('[data-department-action]');
  if (!action) return;
  const department = (state.session.departments ?? []).find(item => item.id === Number(action.dataset.departmentId));
  if (!department) return;
  if (action.dataset.departmentAction === 'delete') {
    const memberCount = (state.session.members ?? []).filter(member => (
      ['member', 'dep_admin'].includes(member.role) && Number(member.departmentId) === department.id
    )).length;
    const memberMessage = memberCount
      ? ` ${memberCount} member${memberCount === 1 ? '' : 's'} will become unassigned.`
      : '';
    if (!window.confirm(`Remove ${department.name}?${memberMessage} Historical email records will stay available and syncing from ${department.sharedMailbox} will stop.`)) return;
    setButtonBusy(action, true, 'Removing…');
    try {
      await mutate(`/api/departments/${department.id}`, 'DELETE');
      if (state.editingDepartmentId === department.id) {
        elements.departmentManagementForm.reset();
        state.editingDepartmentId = null;
        setButtonLabel(elements.departmentManagementForm.querySelector('[type="submit"]'), 'Add department');
      }
      showToast(`${department.name} removed${memberCount ? `; ${memberCount} member${memberCount === 1 ? '' : 's'} unassigned` : ''}.`);
    } catch (error) {
      reportError(error);
      if (action.isConnected) setButtonBusy(action, false, 'Removing…');
    }
    return;
  }
  const edit = action;
  state.editingDepartmentId = department.id;
  elements.departmentManagementForm.elements.namedItem('name').value = department.name;
  elements.departmentManagementForm.elements.namedItem('sharedMailbox').value = department.sharedMailbox;
  setButtonLabel(elements.departmentManagementForm.querySelector('[type="submit"]'), 'Save department');
  elements.departmentManagementForm.elements.namedItem('name').focus();
});

elements.departmentManagementList.addEventListener('change', async event => {
  const headSelect = event.target.closest('select[data-department-head-id]');
  if (headSelect) {
    const previous = headSelect.dataset.previousValue ?? '';
    const card = headSelect.closest('.department-management-card');
    card?.querySelector('.department-control-error')?.remove();
    headSelect.disabled = true;
    try {
      await mutate(`/api/departments/${headSelect.dataset.departmentHeadId}/head`, 'PATCH', {
        memberId: Number(headSelect.value),
      });
      headSelect.dataset.previousValue = headSelect.value;
      showToast('Department administrator updated.');
    } catch (error) {
      headSelect.value = previous;
      const detail = node('small', 'field-error department-control-error', error.message);
      detail.setAttribute('role', 'alert');
      card?.append(detail);
      reportError(error);
      headSelect.focus();
    } finally {
      headSelect.disabled = false;
    }
    return;
  }
  const select = event.target.closest('select[data-department-member-id]');
  if (!select) return;
  const previous = select.dataset.previousValue ?? '';
  const row = select.closest('.department-member-row');
  row?.querySelector('.department-control-error')?.remove();
  const memberId = select.dataset.departmentMemberId;
  select.disabled = true;
  try {
    await mutate(`/api/team/${memberId}/department`, 'PATCH', { departmentId: Number(select.value) });
    select.dataset.previousValue = select.value;
    showToast('Member moved.');
  } catch (error) {
    select.value = previous;
    const detail = node('small', 'field-error department-control-error', error.message);
    detail.setAttribute('role', 'alert');
    row?.append(detail);
    reportError(error);
    select.focus();
  } finally {
    select.disabled = false;
  }
});

elements.ruleForm.addEventListener('submit', async event => {
  event.preventDefault();
  clearFieldErrors(elements.ruleForm);
  elements.ruleError.hidden = true;
  if (!elements.ruleForm.reportValidity()) return;
  const values = ruleFormValues();
  const validationError = validateRuleValues(values);
  if (validationError) {
    showFormError(elements.ruleForm, elements.ruleError, validationError);
    return;
  }

  const editingRuleId = state.editingRuleId;
  const editing = Number.isInteger(editingRuleId);
  let body = values;
  if (editing) {
    body = {};
    for (const key of ['name', 'keywords', 'senderFilter', 'assigneeId', 'priority']) {
      if (values[key] !== state.editingRuleSnapshot[key]) body[key] = values[key];
    }
    if (!Object.keys(body).length) {
      const error = new Error('Change at least one field before saving.');
      showFormError(elements.ruleForm, elements.ruleError, error);
      return;
    }
  }

  const submit = elements.ruleForm.querySelector('[type="submit"]');
  setButtonBusy(submit, true, editing ? 'Saving…' : 'Creating…');
  try {
    await mutate(editing ? `/api/rules/${editingRuleId}` : '/api/rules', editing ? 'PATCH' : 'POST', body);
    elements.ruleDialog.close();
    showToast(editing ? 'Automation rule updated.' : 'Automation rule created.');
  } catch (error) {
    showFormError(elements.ruleForm, elements.ruleError, error);
  } finally {
    setButtonBusy(submit, false, editing ? 'Saving…' : 'Creating…');
  }
});

elements.ruleList.addEventListener('click', async event => {
  const edit = event.target.closest('.edit-rule');
  if (edit) {
    const rule = (state.session.rules ?? []).find(item => item.id === Number(edit.dataset.ruleId));
    if (rule) openRuleDialog(rule, edit);
    return;
  }
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
    reportError(error);
    setButtonBusy(button, false, '…');
  }
});

elements.syncButton.addEventListener('click', async () => {
  setButtonBusy(elements.syncButton, true, 'Syncing…');
  try {
    const result = await mutate('/api/sync');
    const imported = result.imported ?? result.result?.imported;
    const assigned = result.assigned ?? result.result?.assigned;
    const failed = Number(result.failed ?? result.result?.failed) || 0;
    const attention = failed > 0
      ? `; ${countLabel(failed, 'mailbox')} ${failed === 1 ? 'needs' : 'need'} attention.`
      : '.';
    showToast(Number.isInteger(imported)
      ? `Sync complete: ${imported} new, ${assigned ?? 0} assigned${attention}`
      : failed > 0 ? `${countLabel(failed, 'mailbox')} ${failed === 1 ? 'needs' : 'need'} attention.` : 'Mailboxes synced.');
  } catch (error) {
    reportError(error);
  } finally {
    setButtonBusy(elements.syncButton, false, 'Syncing…');
  }
});

elements.emailAssignmentForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!state.selectedEmailId || state.session?.user.role !== 'dep_admin') return;
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
    if (email.conversationId) {
      state.conversationMessages.delete(email.conversationId);
      state.expandedConversations.delete(email.conversationId);
    }
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
    const selected = (state.session.emails ?? []).find(item => item.id === state.selectedEmailId);
    if (selected?.conversationId) {
      state.conversationMessages.delete(selected.conversationId);
      state.expandedConversations.delete(selected.conversationId);
    }
    await mutate(`/api/emails/${state.selectedEmailId}/complete`);
    elements.emailDialog.close();
    elements.pageTitle.focus({ preventScroll: true });
    showToast('Email marked complete.');
  } catch (error) {
    reportError(error);
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
    showToast('Notification marked as read.');
  } catch (error) {
    reportError(error);
    setButtonBusy(read, false, '…');
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && state.sidebarOpen) closeSidebar(true);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPolling();
  else if (state.session) refresh({ quiet: true }).catch(error => {
    reportPollingFailure(error);
    startPolling();
  });
});

window.addEventListener('unhandledrejection', () => {
  reportError(null, 'LexFlow encountered an unexpected error. Please try again.', {
    fingerprint: 'unexpected-client-error',
  });
});

window.addEventListener('error', () => {
  reportError(null, 'LexFlow encountered an unexpected error. Please try again.', {
    fingerprint: 'unexpected-client-error',
  });
});

refresh({ quiet: true }).catch(error => {
  if (error?.authRequired) return;
  if (state.session) reportError(error, 'LexFlow could not load. Please try again.');
  else if (elements.loginError.hidden) {
    const message = error?.userSafe ? error.message : 'LexFlow could not load. Please try again.';
    setText(elements.loginError, message);
    elements.loginError.hidden = false;
    showToast(message, true, { fingerprint: 'initial-load' });
  }
});
