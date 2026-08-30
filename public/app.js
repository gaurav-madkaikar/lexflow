import { animate, stagger } from '/vendor/animejs/anime.esm.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let notificationAudioContext = null;

function armNotificationAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  if (!notificationAudioContext) notificationAudioContext = new AudioContextClass();
  if (notificationAudioContext.state === 'suspended') {
    notificationAudioContext.resume().catch(() => {});
  }
}

function playChime(tones, oscillatorType = 'sine') {
  const audioContext = notificationAudioContext;
  if (!audioContext || audioContext.state !== 'running') return;

  const now = audioContext.currentTime;
  tones.forEach(tone => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = now + tone.offset;
    oscillator.type = oscillatorType;
    oscillator.frequency.setValueAtTime(tone.frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(tone.volume, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + tone.duration + 0.02);
  });
}

function playNotificationChime() {
  playChime([
    { frequency: 659.25, offset: 0, duration: 0.34, volume: 0.045 },
    { frequency: 987.77, offset: 0.1, duration: 0.42, volume: 0.035 }
  ]);
}

function playCompletionChime() {
  playChime([
    { frequency: 523.25, offset: 0, duration: 0.28, volume: 0.035 },
    { frequency: 659.25, offset: 0.075, duration: 0.32, volume: 0.038 },
    { frequency: 783.99, offset: 0.15, duration: 0.44, volume: 0.032 }
  ]);
}

function playReadChime() {
  playChime([
    { frequency: 783.99, offset: 0, duration: 0.22, volume: 0.03 },
    { frequency: 659.25, offset: 0.065, duration: 0.3, volume: 0.026 }
  ]);
}

function playVacationOnSound() {
  const audioContext = notificationAudioContext;
  if (!audioContext || audioContext.state !== 'running') return;
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(180, now);
  oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.48);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(650, now);
  filter.frequency.exponentialRampToValueAtTime(4200, now + 0.42);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.045, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.58);
}

function playVacationOffSound() {
  const audioContext = notificationAudioContext;
  if (!audioContext || audioContext.state !== 'running') return;
  const now = audioContext.currentTime;
  const buffer = audioContext.createBuffer(1, Math.floor(audioContext.sampleRate * 0.42), audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    const decay = Math.pow(1 - index / data.length, 3.2);
    data[index] = (Math.random() * 2 - 1) * decay;
  }
  [0, 0.055, 0.12].forEach((offset, index) => {
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    source.buffer = buffer;
    source.playbackRate.value = 1.25 + index * 0.42;
    filter.type = 'highpass';
    filter.frequency.value = 1800 + index * 900;
    gain.gain.value = 0.022 - index * 0.004;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    source.start(now + offset);
  });
}

document.addEventListener('pointerdown', armNotificationAudio, { once: true, capture: true });
document.addEventListener('keydown', armNotificationAudio, { once: true, capture: true });

const state = {
  session: null,
  view: 'inbox',
  department: 'All',
  query: '',
  dateFilter: '',
  selectedEmailId: null,
  sidebarOpen: false,
  pollTimer: null,
  settingsDirty: false,
  lastUnreadCount: null,
  emailDialogOpener: null,
  ruleDialogOpener: null,
  editingRuleId: null,
  editingRuleSnapshot: null,
  integrationReturnHandled: false,
  emailAnimationKey: '',
  metricsAnimationKey: '',
  vacationBriefings: null,
  briefingShownId: null
};

const elements = {
  skipLink: document.querySelector('#skip-link'),
  loginView: document.querySelector('#login-view'),
  loginForm: document.querySelector('#login-form'),
  loginError: document.querySelector('#login-error'),
  cfoView: document.querySelector('#cfo-view'),
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
  accountMenuButton: document.querySelector('#account-menu-button'),
  accountMenu: document.querySelector('#account-menu'),
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
  workflowChartRoot: document.querySelector('#workflow-chart-root'),
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
  vacationPanel: document.querySelector('#vacation-panel'),
  vacationContent: document.querySelector('#vacation-content'),
  vacationRefresh: document.querySelector('#vacation-refresh'),
  settingsPanel: document.querySelector('#settings-panel'),
  integrationsTitle: document.querySelector('#integrations-title'),
  integrationList: document.querySelector('#integration-list'),
  integrationFeedback: document.querySelector('#integration-feedback'),
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
  assignButton: document.querySelector('#assign-button'),
  outlookLink: document.querySelector('#outlook-link'),
  completeButton: document.querySelector('#complete-button'),
  returnBriefingDialog: document.querySelector('#return-briefing-dialog'),
  returnBriefingBody: document.querySelector('#return-briefing-body'),
  returnBriefingClose: document.querySelector('#return-briefing-close'),
  vacationSetupDialog: document.querySelector('#vacation-setup-dialog'),
  vacationSetupForm: document.querySelector('#vacation-setup-form'),
  vacationSetupClose: document.querySelector('#vacation-setup-close'),
  vacationSetupCancel: document.querySelector('#vacation-setup-cancel'),
  vacationSetupError: document.querySelector('#vacation-setup-error'),
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

function setText(element, value, fallback = '') {
  const next = value === null || value === undefined || value === '' ? fallback : String(value);
  if (element.textContent !== next) element.textContent = next;
}

function closeAccountMenu({ restoreFocus = false } = {}) {
  if (elements.accountMenu.hidden) return;
  elements.accountMenu.hidden = true;
  elements.accountMenuButton.setAttribute('aria-expanded', 'false');
  if (restoreFocus) elements.accountMenuButton.focus({ preventScroll: true });
}

function toggleAccountMenu() {
  const opening = elements.accountMenu.hidden;
  elements.accountMenu.hidden = !opening;
  elements.accountMenuButton.setAttribute('aria-expanded', String(opening));
  if (opening) {
    window.requestAnimationFrame(() => {
      if (!reducedMotion.matches) {
        animate(elements.accountMenu, {
          opacity: { from: 0 },
          translateY: { from: -7 },
          scale: { from: 0.98 },
          duration: 240,
          ease: 'out(3)'
        });
      }
      elements.accountMenu.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
    });
  }
}

function animateWorkspaceModule() {
  if (reducedMotion.matches) return;
  window.requestAnimationFrame(() => {
    const targets = document.querySelectorAll([
      '#metrics:not([hidden]) .metric',
      '#queue-panel:not([hidden])',
      '#rules-panel:not([hidden])',
      '#activity-panel:not([hidden])',
      '#notifications-panel:not([hidden])',
      '#settings-panel:not([hidden])',
      '#workflow-chart-root:not([hidden])'
    ].join(','));
    if (!targets.length) return;
    animate(targets, {
      opacity: { from: 0 },
      translateY: { from: 14 },
      delay: stagger(42),
      duration: 420,
      ease: 'out(3)'
    });
  });
}

function animateEmailList(emails, grouped) {
  const animationKey = JSON.stringify({
    view: state.view,
    department: state.department,
    query: state.query,
    date: state.dateFilter,
    emails: emails.map(email => [email.id, email.status, email.assignee?.id ?? null])
  });
  if (reducedMotion.matches || animationKey === state.emailAnimationKey) return;
  state.emailAnimationKey = animationKey;

  const targets = grouped
    ? elements.emailList.querySelectorAll('.employee-email-group')
    : elements.emailList.querySelectorAll('.email-row');
  if (!targets.length) return;

  animate(targets, {
    opacity: { from: 0 },
    translateY: { from: 12 },
    scale: { from: 0.985 },
    delay: stagger(42),
    duration: 420,
    ease: 'out(3)'
  });
}

function animateEmailDrawer() {
  if (reducedMotion.matches) return;
  const targets = elements.emailDialog.querySelectorAll([
    '.email-dialog-head > div',
    '.detail-grid > div',
    '.message-preview',
    '.assignment-control:not([hidden])',
    '.completion-note:not([hidden])',
    '.detail-actions > *:not([hidden])'
  ].join(','));
  animate(targets, {
    opacity: { from: 0 },
    translateX: { from: 14 },
    delay: stagger(34),
    duration: 360,
    ease: 'out(3)'
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

function localDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function dateFromLocalKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return localDateKey(date) === value ? date : null;
}

function selectedDateLabel(value, style = 'long') {
  const date = dateFromLocalKey(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(undefined, style === 'short'
    ? { month: 'short', day: 'numeric', year: 'numeric' }
    : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

function formatDate(value, includeDate = true) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat(undefined, includeDate
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { hour: 'numeric', minute: '2-digit' }).format(date);
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
  const summary = state.session?.mailboxSummary;
  if (summary && typeof summary.label === 'string') {
    const providers = Array.isArray(summary.providers) ? summary.providers : [];
    const connectedCount = Number(summary.connectedCount) || 0;
    return {
      connectedCount,
      label: summary.label.trim() || (connectedCount
        ? `${countLabel(connectedCount, 'mailbox')} connected`
        : providers.includes('demo') ? 'Demo mailbox' : 'No mailbox connected')
    };
  }

  const connected = state.session?.mode === 'graph';
  return {
    connectedCount: connected ? 1 : 0,
    label: connected ? 'Outlook connected' : 'Demo mailbox'
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
    handleIntegrationReturn();
    if (state.session.user.role === 'cfo') stopPolling();
    else startPolling();
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
  window.__lexflowCfoUser = null;
  closeSidebar();
  if (elements.emailDialog.open) elements.emailDialog.close();
  if (elements.ruleDialog.open) elements.ruleDialog.close();
  if (elements.returnBriefingDialog.open) elements.returnBriefingDialog.close();
  if (elements.vacationSetupDialog.open) elements.vacationSetupDialog.close();
  state.selectedEmailId = null;
  state.dateFilter = '';
  state.emailDialogOpener = null;
  state.ruleDialogOpener = null;
  state.editingRuleId = null;
  state.editingRuleSnapshot = null;
  state.settingsDirty = false;
  state.lastUnreadCount = null;
  state.vacationBriefings = null;
  state.briefingShownId = null;
  elements.skipLink.hidden = true;
  elements.cfoView.hidden = true;
  elements.appView.hidden = true;
  elements.loginView.hidden = false;
  elements.loginForm.email.focus();
}

function showApp() {
  elements.loginView.hidden = true;
  elements.cfoView.hidden = true;
  elements.appView.hidden = false;
  elements.skipLink.hidden = false;
}

function showCfo() {
  stopPolling();
  elements.loginView.hidden = true;
  elements.appView.hidden = true;
  elements.cfoView.hidden = false;
  elements.skipLink.hidden = true;
  window.__lexflowCfoUser = state.session.user;
  window.dispatchEvent(new CustomEvent('lexflow:cfo-session', {
    detail: { user: state.session.user }
  }));
}

function normalizeView() {
  if (state.session?.user.role === 'cfo') return;
  const isAdmin = state.session?.user.role === 'admin';
  const allowed = isAdmin
    ? ['inbox', 'assigned', 'completed', 'rules', 'activity', 'settings', 'notifications']
    : ['assigned', 'completed', 'notifications', 'vacation'];
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

function metric(label, value, note, targetView = null, share = 0) {
  const interactive = Boolean(targetView && Number(value) > 0);
  const card = node(interactive ? 'button' : 'article', `metric spotlight-card${interactive ? ' metric-link' : ''}`);
  if (interactive) {
    card.type = 'button';
    card.dataset.view = targetView;
    card.setAttribute('aria-label', `Open ${label}, ${countLabel(Number(value), 'item')}`);
  }
  const meter = node('span', 'metric-meter');
  const fill = node('span', 'metric-meter-fill');
  fill.style.width = `${Math.max(4, Math.min(100, share))}%`;
  meter.setAttribute('aria-hidden', 'true');
  meter.append(fill);
  const content = [
    node('span', 'metric-label', label),
    node('strong', 'metric-value', value),
    node('span', 'metric-note', note),
    meter
  ];
  if (interactive) content.unshift(node('span', 'metric-action', 'View'));
  card.append(...content);
  if (interactive) card.addEventListener('click', () => selectView(targetView));
  card.addEventListener('pointermove', event => {
    const bounds = card.getBoundingClientRect();
    card.style.setProperty('--spotlight-x', `${event.clientX - bounds.left}px`);
    card.style.setProperty('--spotlight-y', `${event.clientY - bounds.top}px`);
  });
  card.addEventListener('pointerenter', () => {
    if (!reducedMotion.matches) animate(card, { scale: 1.015, duration: 220, ease: 'out(3)' });
  });
  card.addEventListener('pointerleave', () => {
    if (!reducedMotion.matches) animate(card, { scale: 1, duration: 280, ease: 'out(3)' });
  });
  return card;
}

function emailMatchesDate(email) {
  return !state.dateFilter || localDateKey(email.receivedAt) === state.dateFilter;
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
    ,briefings: state.session?.vacation?.briefingCount ?? 0
  };
}

function renderMetrics() {
  const totals = counts(emailsForSelectedDate());
  const isAdmin = state.session.user.role === 'admin';
  const periodNote = state.dateFilter ? `Received ${selectedDateLabel(state.dateFilter, 'short')}` : null;
  const items = isAdmin
    ? [
        ['Unassigned', totals.inbox, periodNote || 'Awaiting an automation match'],
        ['Open assigned', totals.assigned, periodNote || 'Across the team', 'assigned'],
        ['Completed', totals.completed, periodNote || 'Recorded workflow items', 'completed'],
        ['Active rules', totals.rules, 'Ordered by priority'],
        ['Unread', totals.notifications, 'Work alerts and updates', 'notifications']
      ]
    : [
        ['Open assigned', totals.assigned, periodNote || 'Ready for your review', 'assigned'],
        ['Completed', totals.completed, periodNote || 'Work you have finished', 'completed'],
        ['Unread', totals.notifications, 'Work alerts and updates', 'notifications']
      ];
  elements.metrics.style.setProperty('--metric-count', String(items.length));
  const maxValue = Math.max(1, ...items.map(item => Number(item[1]) || 0));
  elements.metrics.replaceChildren(...items.map(([label, value, note, targetView]) => (
    metric(label, value, note, targetView, (Number(value) || 0) / maxValue * 100)
  )));
  const animationKey = JSON.stringify(items.map(item => [item[0], item[1]]));
  if (!reducedMotion.matches && animationKey !== state.metricsAnimationKey) {
    animate(elements.metrics.querySelectorAll('.metric'), {
      opacity: { from: 0 },
      translateY: { from: 10 },
      delay: stagger(38),
      duration: 380,
      ease: 'out(3)'
    });
    animate(elements.metrics.querySelectorAll('.metric-meter-fill'), {
      scaleX: { from: 0 },
      delay: stagger(45, { start: 110 }),
      duration: 620,
      ease: 'out(4)'
    });
  }
  state.metricsAnimationKey = animationKey;
  window.__lexflowEmails = state.session?.emails ?? [];
  window.dispatchEvent(new CustomEvent('lexflow:emails', {
    detail: window.__lexflowEmails
  }));
}

function renderHero() {
  const today = new Date();
  const displayedDate = dateFromLocalKey(state.dateFilter) || today;
  const displayedDateKey = localDateKey(displayedDate);
  const totals = counts(emailsForSelectedDate());
  const isAdmin = state.session.user.role === 'admin';
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(displayedDate);
  const month = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(displayedDate);
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
  const searchable = [
    email.subject,
    email.preview,
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
  const status = state.view === 'inbox' ? 'unassigned' : state.view;
  return (state.session.emails ?? [])
    .filter(email => email.status === status)
    .filter(emailMatchesDate)
    .filter(emailMatchesDepartment)
    .filter(emailMatchesSearch)
    .sort((left, right) => new Date(right.receivedAt) - new Date(left.receivedAt));
}

function renderEmailRow(email, { grouped = false } = {}) {
  const row = node('button', `email-row ${email.status}${grouped ? ' grouped' : ''}`);
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
  if (email.vacationHold) {
    tags.append(node('span', 'tag vacation-hold', `OOO hold · ${email.vacationHold.intendedMember.name}`));
  }
  copy.append(subject, meta, preview, tags);

  row.append(dot, copy);
  if (!grouped) {
    const person = node('span', 'email-person');
    const avatar = node('span', 'avatar', email.assignee?.initials || '—');
    avatar.setAttribute('aria-hidden', 'true');
    person.append(avatar, node('span', '', email.assignee?.name || 'Unassigned'));
    row.append(person);
  }
  return row;
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
  emailRows.append(...group.emails.map(email => renderEmailRow(email, { grouped: true })));
  section.append(header, emailRows);
  return section;
}

function renderEmails() {
  const focusedEmailId = elements.emailList.contains(document.activeElement)
    ? document.activeElement.closest('[data-email-id]')?.dataset.emailId
    : null;
  const emails = visibleEmails();
  const groupedAssigned = state.view === 'assigned' && state.session.user.role === 'admin';
  const employeeGroups = groupedAssigned ? assignedEmployeeGroups(emails) : [];
  const labels = {
    inbox: ['Unassigned inbox', 'New mailbox items awaiting a rule'],
    assigned: [
      state.session.user.role === 'admin' ? 'Assigned by employee' : 'My work',
      state.session.user.role === 'admin'
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
    : countLabel(emails.length, 'email'));
  elements.emailList.classList.toggle('employee-group-list', groupedAssigned && emails.length > 0);
  const hasFilters = Boolean(state.query || state.dateFilter || state.department !== 'All');
  const emptyMessage = state.dateFilter
    ? `No emails received on ${selectedDateLabel(state.dateFilter)} match the current filters.`
    : hasFilters ? 'No emails match your search and filters.' : 'This queue is clear.';
  elements.emailList.replaceChildren(...(emails.length
    ? groupedAssigned
      ? employeeGroups.map(renderEmployeeGroup)
      : emails.map(renderEmailRow)
    : [emptyState('Nothing here', emptyMessage)]));
  animateEmailList(emails, groupedAssigned);

  if (focusedEmailId) {
    window.requestAnimationFrame(() => {
      const replacement = [...elements.emailList.querySelectorAll('[data-email-id]')]
        .find(row => row.dataset.emailId === focusedEmailId);
      (replacement || elements.pageTitle).focus({ preventScroll: true });
    });
  }
}

function renderRule(rule) {
  const item = node('article', `rule-item${rule.enabled ? '' : ' is-disabled'}`);
  const copy = node('div');
  const criteria = [
    rule.keywords ? `Keywords “${rule.keywords}”` : '',
    rule.senderFilter ? `Sender contains “${rule.senderFilter}”` : ''
  ].filter(Boolean).join(' · ');
  copy.append(
    node('h3', '', rule.name),
    node('p', '', `${criteria || 'No matching criteria'} · Assign to ${rule.assignee?.name || 'Unknown member'}`),
    node('p', '', `Priority ${rule.priority} · ${rule.enabled ? 'Active' : 'Paused'}`)
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
    assigned_overdue: 'Assigned work overdue',
    return_briefing: 'Welcome back'
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
    open.dataset.notificationId = String(item.id);
    actions.append(open);
  }
  if (item.kind === 'return_briefing' && item.briefingId) {
    const open = node('button', 'open-return-briefing', 'Open briefing');
    open.type = 'button';
    open.dataset.briefingId = String(item.briefingId);
    open.dataset.notificationId = String(item.id);
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

function vacationStatusLabel(vacation) {
  if (vacation.period?.status === 'active') return 'Out of office';
  if (vacation.period?.status === 'scheduled') return 'Upcoming vacation';
  if (vacation.sync?.status === 'error') return 'Connection needs attention';
  return 'Available';
}

function datetimeLocalValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function sampleBriefing() {
  return {
    status: 'ready',
    sample: true,
    items: [
      { type: 'email', section: 'open', title: 'Urgent renewal approval · Northstar', summary: 'A commercial renewal needs your approval before tomorrow’s deadline.', occurredAt: new Date(Date.now() - 3_600_000).toISOString(), priority: { score: 110, level: 'high', reasons: ['Beyond response SLA', 'Urgent language', 'Still open'] } },
      { type: 'meeting', section: 'meetings', title: 'Q3 operating review', summary: 'Finance Director · Teams', occurredAt: new Date(Date.now() - 5 * 3_600_000).toISOString(), webUrl: 'https://teams.microsoft.com/', priority: { score: 70, level: 'high', reasons: ['You organized', 'Accepted meeting'] } },
      { type: 'email', section: 'handled', title: 'Vendor bank-detail confirmation', summary: 'Priya covered this request while you were away.', occurredAt: new Date(Date.now() - 22 * 3_600_000).toISOString(), priority: { score: 25, level: 'normal', reasons: ['Handled by the team'] } },
    ],
  };
}

function animateVacationSwitch() {
  if (reducedMotion.matches) return;
  const toggle = elements.vacationContent.querySelector('.vacation-toggle');
  const thumb = toggle?.querySelector('.vacation-toggle-thumb');
  if (!toggle || !thumb) return;
  animate(toggle, { scale: [{ to: 1.07 }, { to: 1 }], duration: 430, ease: 'out(4)' });
  animate(thumb, { scale: [{ to: 0.82 }, { to: 1.08 }, { to: 1 }], duration: 520, ease: 'out(4)' });
}

function renderVacation() {
  if (state.session.user.role !== 'member') return;
  const vacation = state.session.vacation ?? {};
  const switchedOn = Boolean(vacation.manual?.enabled || ['active', 'scheduled'].includes(vacation.period?.status));
  const status = node('section', `vacation-status vacation-${vacation.period?.status || vacation.sync?.status || 'available'}`);
  const copy = node('div');
  copy.append(node('span', 'vacation-state-label', vacationStatusLabel(vacation)));
  const detail = vacation.period
    ? `${formatDate(vacation.period.startsAt)}${vacation.period.endsAt ? ` – ${formatDate(vacation.period.endsAt)}` : ' · No return time detected'}`
    : vacation.manual ? 'Vacation Mode is off. Turn it on when you plan time away.'
      : vacation.configured ? `Last checked ${vacation.sync?.lastSuccessAt ? formatDate(vacation.sync.lastSuccessAt) : 'not yet'}` : 'Set your time away here, or ask an administrator to connect Microsoft 365.';
  copy.append(node('p', '', detail));
  if (vacation.sync?.lastError) copy.append(node('small', 'vacation-sync-error', vacation.sync.lastError));
  const toggleWrap = node('div', 'vacation-toggle-wrap');
  toggleWrap.append(node('span', 'vacation-toggle-label', switchedOn ? 'On' : 'Off'));
  const toggle = node('button', `vacation-toggle${switchedOn ? ' is-on' : ''}`);
  toggle.type = 'button';
  toggle.dataset.vacationToggle = switchedOn ? 'off' : 'on';
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-checked', String(switchedOn));
  toggle.setAttribute('aria-label', switchedOn ? 'Turn Vacation Mode off' : 'Turn Vacation Mode on');
  toggle.append(node('span', 'vacation-toggle-thumb'));
  toggleWrap.append(toggle);
  status.append(copy, toggleWrap);

  const sample = node('section', 'vacation-sample-card');
  const sampleCopy = node('div');
  sampleCopy.append(node('span', 'sample-label', 'Sample data'), node('h3', '', 'Preview your return briefing'), node('p', '', 'See how priority emails, missed meetings, and work handled by the team will be summarized.'));
  const preview = node('button', 'small-button', 'View sample summary');
  preview.type = 'button';
  preview.dataset.sampleBriefing = 'true';
  sample.append(sampleCopy, preview);

  const history = node('section', 'briefing-history');
  history.append(node('h3', '', 'Return briefings'));
  const briefings = state.vacationBriefings;
  if (briefings === null) history.append(node('p', 'vacation-placeholder', 'Open this view to load your briefing history.'));
  else if (!briefings.length) history.append(emptyState('No return briefings yet', 'A prioritized briefing will appear after Outlook marks you back.'));
  else {
    const list = node('div', 'briefing-history-list');
    briefings.forEach(briefing => {
      const button = node('button', 'briefing-history-item');
      button.type = 'button';
      button.dataset.briefingId = String(briefing.id);
      const total = Object.values(briefing.counts ?? {}).reduce((sum, value) => sum + Number(value), 0);
      button.append(node('strong', '', `Return briefing · ${formatDate(briefing.createdAt, false)}`), node('span', '', `${countLabel(total, 'priority item')} · ${briefing.status === 'partial' ? 'Calendar syncing' : 'Complete'}`));
      list.append(button);
    });
    history.append(list);
  }
  elements.vacationContent.replaceChildren(status, sample, history);
}

function briefingItemNode(item) {
  const article = node('article', `return-item priority-${item.priority.level}`);
  const top = node('div', 'return-item-top');
  top.append(node('span', 'priority-pill', item.priority.level), node('time', '', formatDate(item.occurredAt, false)));
  article.append(top, node('h4', '', item.title), node('p', '', item.summary));
  if (item.priority.reasons?.length) {
    const reasons = node('div', 'priority-reasons');
    item.priority.reasons.forEach(reason => reasons.append(node('span', '', reason)));
    article.append(reasons);
  }
  if (item.webUrl && safeWebUrl(item.webUrl)) {
    const link = node('a', '', item.type === 'meeting' ? 'Open meeting' : 'Open email');
    link.href = safeWebUrl(item.webUrl);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    article.append(link);
  }
  return article;
}

function displayReturnBriefing(briefing, id = null) {
  const intro = node('div', `briefing-summary ${briefing.status}`);
  intro.append(node('strong', '', briefing.sample ? 'Sample return summary' : briefing.status === 'partial' ? 'Email summary ready · Calendar still syncing' : 'Your return summary is ready'), node('p', '', 'Items are ranked using response timing, urgency, assignment state, and meeting responsibility.'));
  const groups = [
    ['high', 'High priority', briefing.items.filter(item => item.priority.level === 'high')],
    ['open', 'Open emails', briefing.items.filter(item => item.section === 'open' && item.priority.level !== 'high')],
    ['meetings', 'Missed meetings', briefing.items.filter(item => item.section === 'meetings' && item.priority.level !== 'high')],
    ['handled', 'Handled by the team', briefing.items.filter(item => item.section === 'handled' && item.priority.level !== 'high')],
  ];
  const content = [intro];
  groups.forEach(([, label, items]) => {
    if (!items.length) return;
    const section = node('section', 'return-group');
    section.append(node('h3', '', `${label} · ${items.length}`));
    const list = node('div', 'return-items');
    items.forEach(item => list.append(briefingItemNode(item)));
    section.append(list);
    content.push(section);
  });
  elements.returnBriefingBody.replaceChildren(...content);
  if (id) elements.returnBriefingDialog.dataset.briefingId = String(id);
  else delete elements.returnBriefingDialog.dataset.briefingId;
  if (!elements.returnBriefingDialog.open) elements.returnBriefingDialog.showModal();
  if (!reducedMotion.matches) animate(elements.returnBriefingBody.querySelectorAll('.return-item'), { opacity: { from: 0 }, translateY: { from: 10 }, delay: stagger(35), duration: 360, ease: 'out(3)' });
}

async function openReturnBriefing(id) {
  const result = await api(`/api/vacation/briefings/${id}`);
  displayReturnBriefing(result.briefing, id);
}

async function loadVacationBriefings() {
  const result = await api('/api/vacation/briefings');
  state.vacationBriefings = result.briefings;
  if (state.view === 'vacation') renderVacation();
}

function renderTeamMember(member, departments) {
  const item = node('article', 'team-member');
  const identity = node('div', 'team-member-copy');
  const avatar = node('span', 'avatar', member.initials || '—');
  avatar.setAttribute('aria-hidden', 'true');
  const copy = node('span');
  copy.append(node('strong', '', member.name), node('small', '', member.email));
  identity.append(avatar, copy);

  const controls = node('div', 'team-member-controls');
  const vacationBadge = node('span', `member-vacation-badge ${member.vacation?.status || 'available'}`, member.vacation?.status === 'active' ? `Away · ${countLabel(member.vacation.heldCount, 'held email')}` : member.vacation?.status === 'scheduled' ? 'OOO scheduled' : member.vacation?.status === 'error' ? 'OOO sync error' : 'Available');
  identity.querySelector('span:last-child').append(vacationBadge);
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
  const principalForm = node('form', 'microsoft-principal-form');
  principalForm.dataset.memberId = String(member.id);
  const principalLabel = node('label');
  principalLabel.append(node('span', 'visually-hidden', `Microsoft principal for ${member.name}`));
  const principalInput = node('input');
  principalInput.type = 'email';
  principalInput.name = 'microsoftPrincipal';
  principalInput.placeholder = 'user@company.com';
  principalInput.value = member.microsoftPrincipal || '';
  principalInput.setAttribute('aria-label', `Microsoft principal for ${member.name}`);
  principalLabel.append(principalInput);
  const save = node('button', 'small-button', 'Save Microsoft');
  save.type = 'submit';
  principalForm.append(principalLabel, save);
  controls.append(control, principalForm);
  item.append(identity, controls);
  return item;
}

function integrationState(provider, integration) {
  if (integration.lastError) return { key: 'attention', label: 'Needs attention' };
  if (integration.connected) return { key: 'connected', label: 'Connected' };
  if (provider === 'outlook' && integration.configured) return { key: 'configured', label: 'Configured' };
  if (integration.configured) return { key: 'disconnected', label: 'Not connected' };
  return { key: 'setup', label: 'Setup required' };
}

function renderIntegration(provider, integration = {}) {
  const name = providerLabel(provider);
  const connection = {
    configured: Boolean(integration.configured),
    connected: Boolean(integration.connected),
    accountEmail: integration.accountEmail || '',
    lastSuccessAt: integration.lastSuccessAt || null,
    lastError: integration.lastError || ''
  };
  const status = integrationState(provider, connection);
  const row = node('article', `integration-row ${provider}`);
  row.dataset.provider = provider;

  const mark = node('span', 'integration-mark');
  mark.setAttribute('aria-hidden', 'true');
  mark.append(svgIcon('#icon-mail'));

  const copy = node('div', 'integration-copy');
  const heading = node('div', 'integration-heading');
  heading.append(
    node('h4', '', name),
    node('span', `integration-status ${status.key}`, status.label)
  );
  copy.append(heading);

  const account = connection.accountEmail || (provider === 'outlook'
    ? connection.configured ? 'Managed through server configuration.' : 'Microsoft Graph is not configured.'
    : connection.configured ? 'No Gmail account connected.' : 'Google OAuth is not configured on this server.');
  const accountElement = node('p', 'integration-account', account);
  accountElement.id = `integration-${provider}-account`;
  copy.append(accountElement);

  if (connection.lastSuccessAt) {
    copy.append(node('p', 'integration-meta', `Last synced ${formatDate(connection.lastSuccessAt)}`));
  } else if (connection.connected) {
    copy.append(node('p', 'integration-meta', 'Waiting for the first sync.'));
  }

  if (connection.lastError) {
    const error = node('p', 'integration-error', connection.lastError);
    error.setAttribute('role', 'alert');
    copy.append(error);
  }

  const actions = node('div', 'integration-actions');
  if (provider === 'gmail') {
    if (connection.configured) {
      const reconnecting = connection.connected || connection.accountEmail || connection.lastError;
      const authorize = node('a', 'button', reconnecting ? 'Reconnect' : 'Connect Gmail');
      authorize.href = '/api/integrations/gmail/authorize';
      authorize.dataset.integrationAction = 'authorize';
      authorize.setAttribute('aria-label', `${reconnecting ? 'Reconnect' : 'Connect'} Gmail account`);
      actions.append(authorize);
    } else {
      const unavailable = node('button', 'button', 'Connect Gmail');
      unavailable.type = 'button';
      unavailable.disabled = true;
      unavailable.setAttribute('aria-describedby', accountElement.id);
      actions.append(unavailable);
    }

    if (connection.connected) {
      const disconnect = node('button', 'button integration-disconnect', 'Disconnect');
      disconnect.type = 'button';
      disconnect.dataset.integrationAction = 'disconnect';
      disconnect.setAttribute('aria-label', `Disconnect Gmail account ${connection.accountEmail}`.trim());
      actions.append(disconnect);
    }
  } else {
    actions.append(node('span', 'integration-managed', connection.configured ? 'Server managed' : 'Server setup'));
  }

  row.append(mark, copy, actions);
  return row;
}

function renderIntegrations() {
  const integrations = state.session.integrations ?? {};
  const providers = ['outlook', 'gmail'];
  const signature = JSON.stringify(providers.map(provider => {
    const integration = integrations[provider] ?? {};
    return [
      provider,
      Boolean(integration.configured),
      Boolean(integration.connected),
      integration.accountEmail || '',
      integration.lastSuccessAt || '',
      integration.lastError || ''
    ];
  }));
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

function setIntegrationFeedback(message, isError = false) {
  setText(elements.integrationFeedback, message);
  elements.integrationFeedback.classList.toggle('error', isError);
  elements.integrationFeedback.setAttribute('role', isError ? 'alert' : 'status');
  elements.integrationFeedback.setAttribute('aria-live', isError ? 'assertive' : 'polite');
}

function renderSettings() {
  if (state.session.user.role !== 'admin') return;
  renderIntegrations();
  const settings = state.session.settings;
  if (settings && !state.settingsDirty) {
    elements.timingForm.elements.namedItem('timeUnassignedHours').value = String(settings.timeUnassignedHours);
    elements.timingForm.elements.namedItem('timeAssignedUnmarkedHours').value = String(settings.timeAssignedUnmarkedHours);
  }

  const departments = state.session.departments ?? [];
  const members = state.session.team ?? [];
  const signature = [
    ...departments.map(department => `d:${department.id}:${department.name}`),
    ...members.map(member => `m:${member.id}:${member.department}:${member.microsoftPrincipal || ''}:${member.vacation?.status || ''}:${member.vacation?.heldCount || 0}`)
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
  elements.vacationPanel.hidden = isAdmin || state.view !== 'vacation';
  elements.departmentSwitch.hidden = !canFilterDepartment;
  elements.workspaceToolbar.hidden = !canFilterDepartment;
  elements.metrics.hidden = isFocus;
  elements.workflowChartRoot.hidden = isFocus;
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
    notifications: 'Notifications',
    vacation: 'Vacation Mode'
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
  setText(elements.sidebarAvatar, user.initials);
  setText(elements.sidebarUser, user.name);
  setText(elements.sidebarRole, `${user.role} · ${user.department}`);
  setText(elements.topbarAvatar, user.initials);
  setText(elements.topbarUser, user.name);
  setText(elements.topbarRole, `${user.role} · ${user.department}`);
  setText(elements.sidebarMode, mailbox.label);
  elements.sidebarMode.closest('.mailbox-card').classList.toggle('connected', mailbox.connectedCount > 0);
  setText(elements.sidebarSync, user.role === 'member'
    ? 'Sync managed by admin'
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
  if (state.session.user.role === 'cfo') {
    showCfo();
    return;
  }
  showApp();
  const isAdmin = state.session.user.role === 'admin';
  elements.adminNavigation.hidden = !isAdmin;
  elements.memberNavigation.hidden = isAdmin;
  elements.syncButton.hidden = !isAdmin
    || (state.session.mode !== 'demo' && mailboxSummary().connectedCount === 0);
  elements.sidebarDepartment.closest('.department-picker').hidden = !isAdmin || !['assigned', 'completed'].includes(state.view);
  if (isAdmin) renderDepartments();
  const unreadCount = state.session.unreadCount ?? 0;
  setText(elements.notificationCount, unreadCount || '');
  elements.notificationButton.setAttribute('aria-label', `View notifications, ${unreadCount} unread`);
  if (state.lastUnreadCount !== null && unreadCount > state.lastUnreadCount) {
    setText(elements.notificationAnnouncement, `${countLabel(unreadCount, 'unread notification')} available.`);
    playNotificationChime();
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
  if (!isAdmin) renderVacation();
  renderPanels();
  const pendingBriefing = !isAdmin ? state.session.vacation?.pendingBriefing : null;
  if (pendingBriefing && state.briefingShownId !== pendingBriefing.id) {
    state.briefingShownId = pendingBriefing.id;
    window.requestAnimationFrame(() => openReturnBriefing(pendingBriefing.id).catch(error => showToast(error.message, true)));
  }
}

function handleIntegrationReturn() {
  if (state.integrationReturnHandled || state.session?.user.role !== 'admin') return;
  const url = new URL(window.location.href);
  const result = url.searchParams.get('integration');
  if (!['gmail-connected', 'gmail-error'].includes(result)) return;

  state.integrationReturnHandled = true;
  url.searchParams.delete('integration');
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  state.view = 'settings';
  normalizeView();
  render();

  const isError = result === 'gmail-error';
  setIntegrationFeedback(
    isError
      ? 'Gmail authorization could not be completed. Try again.'
      : 'Gmail connected to this workspace.',
    isError
  );
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    elements.integrationsTitle.focus({ preventScroll: true });
  });
}

function selectView(view) {
  state.view = view;
  if (view === 'inbox') state.department = 'All';
  normalizeView();
  closeSidebar();
  render();
  if (view === 'vacation' && state.session?.user.role === 'member') {
    loadVacationBriefings().catch(error => showToast(error.message, true));
  }
  animateWorkspaceModule();
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    elements.pageTitle.focus({ preventScroll: true });
  });
}

function selectDepartment(department) {
  state.department = department;
  render();
  animateWorkspaceModule();
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
      const away = member.vacation?.status === 'active';
      const option = node('option', '', `${member.name} · ${member.department}${away ? ' · Away' : ''}`);
      option.value = String(member.id);
      option.selected = member.id === email.assignee?.id;
      option.disabled = away && member.id !== email.assignee?.id;
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

  const webUrl = safeWebUrl(email.webUrl || email.outlookUrl);
  const sourceName = providerLabel(emailProvider(email));
  const openLabel = `Open in ${sourceName}`;
  elements.outlookLink.hidden = !webUrl;
  setText(elements.outlookLink, openLabel);
  elements.outlookLink.setAttribute('aria-label', `${openLabel}: ${email.subject || 'No subject'}`);
  if (webUrl) elements.outlookLink.href = webUrl;
  else elements.outlookLink.removeAttribute('href');
  elements.emailDialog.showModal();
  window.requestAnimationFrame(animateEmailDrawer);
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
  if (!Number.isInteger(values.priority) || values.priority < 1 || values.priority > 999) {
    fields.priority = 'Priority must be between 1 and 999.';
  }
  if (!Object.keys(fields).length) return null;
  const error = new Error(Object.values(fields)[0]);
  error.fields = fields;
  return error;
}

function openRuleDialog(rule = null, opener = document.activeElement) {
  if (state.session?.user.role !== 'admin') return;
  elements.ruleForm.reset();
  clearFieldErrors(elements.ruleForm);
  elements.ruleError.hidden = true;
  state.ruleDialogOpener = opener instanceof HTMLElement ? opener : null;
  state.editingRuleId = rule?.id ?? null;
  state.editingRuleSnapshot = rule ? normalizedRuleValues(rule) : null;

  const editing = Boolean(rule);
  setText(elements.ruleDialogEyebrow, editing ? 'Update routing' : 'Admin only');
  setText(elements.ruleDialogTitle, editing ? `Edit ${rule.name}` : 'Create automation rule');
  setText(elements.ruleFormHelp, editing
    ? 'Change at least one field. A name, teammate, priority, and one matching condition must remain.'
    : 'Set a rule name, teammate, priority, and at least one matching condition.');
  setButtonLabel(elements.ruleForm.querySelector('[type="submit"]'), editing ? 'Save changes' : 'Create rule');

  const members = (state.session.team ?? []).filter(user => user.role === 'member');
  const options = members.map(member => {
    const away = member.vacation?.status === 'active';
    const option = node('option', '', `${member.name} · ${member.department}${away ? ' · Away' : ''}`);
    option.value = String(member.id);
    option.selected = member.id === rule?.assignee?.id;
    option.disabled = away && member.id !== rule?.assignee?.id;
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
    elements.ruleForm.elements.namedItem('priority').value = '30';
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
  closeAccountMenu();
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

window.addEventListener('lexflow:cfo-logout', () => {
  state.session = null;
  state.view = 'inbox';
  state.department = 'All';
  state.query = '';
  state.dateFilter = '';
  showLogin();
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
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
    event.preventDefault();
    elements.searchInput.focus();
    elements.searchInput.select();
  }
});
elements.heroDateFilter.addEventListener('change', event => {
  state.dateFilter = dateFromLocalKey(event.target.value) ? event.target.value : '';
  render();
});
elements.heroDateClear.addEventListener('click', () => {
  state.dateFilter = '';
  render();
  window.requestAnimationFrame(() => elements.heroDateFilter.focus({ preventScroll: true }));
});

elements.emailList.addEventListener('click', event => {
  const row = event.target.closest('[data-email-id]');
  if (row) openEmail(row.dataset.emailId);
});

elements.notificationButton.addEventListener('click', () => selectView('notifications'));
elements.vacationRefresh.addEventListener('click', async () => {
  setButtonBusy(elements.vacationRefresh, true, 'Checking…');
  try {
    await api('/api/vacation/refresh', { method: 'POST' });
    await refresh({ quiet: true });
    showToast('Outlook Vacation Mode status refreshed.');
  } catch (error) {
    if (state.session) showToast(error.message, true);
  } finally {
    setButtonBusy(elements.vacationRefresh, false, 'Checking…');
  }
});
elements.vacationContent.addEventListener('click', event => {
  const briefing = event.target.closest('[data-briefing-id]');
  if (briefing) {
    openReturnBriefing(briefing.dataset.briefingId).catch(error => showToast(error.message, true));
    return;
  }
  if (event.target.closest('[data-sample-briefing]')) {
    displayReturnBriefing(sampleBriefing());
    return;
  }
  const toggle = event.target.closest('[data-vacation-toggle]');
  if (!toggle) return;
  armNotificationAudio();
  if (toggle.dataset.vacationToggle === 'on') {
    const start = new Date();
    start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
    const end = new Date(start.getTime() + 7 * 86_400_000);
    elements.vacationSetupForm.elements.namedItem('startsAt').value = datetimeLocalValue(start);
    elements.vacationSetupForm.elements.namedItem('endsAt').value = datetimeLocalValue(end);
    elements.vacationSetupError.hidden = true;
    elements.vacationSetupDialog.showModal();
    elements.vacationSetupForm.elements.namedItem('startsAt').focus();
    return;
  }
  const wasActive = state.session.vacation?.period?.status === 'active';
  toggle.disabled = true;
  api('/api/vacation/manual', { method: 'PUT', body: { enabled: false } })
    .then(() => {
      playVacationOffSound();
      return refresh({ quiet: true });
    })
    .then(() => {
      animateVacationSwitch();
      showToast(wasActive
        ? 'Vacation Mode is off. Your return briefing is ready.'
        : 'Vacation Mode is off. The scheduled time away was cancelled.');
    })
    .catch(error => {
      if (state.session) showToast(error.message, true);
      toggle.disabled = false;
    });
});
elements.accountMenuButton.addEventListener('click', event => {
  event.stopPropagation();
  toggleAccountMenu();
});
document.addEventListener('click', event => {
  if (!event.target.closest('.account-menu')) closeAccountMenu();
});
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
  state.emailDialogOpener = null;
  if (state.session && !elements.appView.hidden && (!opener || !opener.isConnected)) {
    elements.pageTitle.focus({ preventScroll: true });
  }
});

elements.returnBriefingClose.addEventListener('click', () => elements.returnBriefingDialog.close());
elements.vacationSetupClose.addEventListener('click', () => elements.vacationSetupDialog.close());
elements.vacationSetupCancel.addEventListener('click', () => elements.vacationSetupDialog.close());
elements.vacationSetupForm.addEventListener('submit', async event => {
  event.preventDefault();
  elements.vacationSetupError.hidden = true;
  const startValue = elements.vacationSetupForm.elements.namedItem('startsAt').value;
  const endValue = elements.vacationSetupForm.elements.namedItem('endsAt').value;
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (!startValue || !endValue || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    setText(elements.vacationSetupError, 'Choose a return time after your start time.');
    elements.vacationSetupError.hidden = false;
    return;
  }
  const submit = elements.vacationSetupForm.querySelector('[type="submit"]');
  setButtonBusy(submit, true, 'Turning on…');
  try {
    await api('/api/vacation/manual', {
      method: 'PUT',
      body: { enabled: true, startsAt: start.toISOString(), endsAt: end.toISOString() }
    });
    elements.vacationSetupDialog.close();
    playVacationOnSound();
    await refresh({ quiet: true });
    animateVacationSwitch();
    showToast('Vacation Mode is on. New work will be held during your time away.');
  } catch (error) {
    if (!state.session) return;
    setText(elements.vacationSetupError, error.message);
    elements.vacationSetupError.hidden = false;
  } finally {
    setButtonBusy(submit, false, 'Turning on…');
  }
});
elements.returnBriefingDialog.addEventListener('close', async () => {
  const id = Number(elements.returnBriefingDialog.dataset.briefingId);
  delete elements.returnBriefingDialog.dataset.briefingId;
  if (state.session && !elements.appView.hidden) {
    window.requestAnimationFrame(() => elements.pageTitle.focus({ preventScroll: true }));
  }
  if (!Number.isInteger(id) || !state.session || state.session.user.role !== 'member') return;
  try {
    await api(`/api/vacation/briefings/${id}/reviewed`, { method: 'POST' });
    await refresh({ quiet: true });
    if (state.vacationBriefings !== null) await loadVacationBriefings();
  } catch (error) {
    if (state.session) showToast(error.message, true);
  }
});

elements.integrationList.addEventListener('click', async event => {
  const action = event.target.closest('[data-integration-action]');
  if (!action || state.session?.user.role !== 'admin') return;

  if (action.dataset.integrationAction === 'authorize') {
    event.preventDefault();
    action.setAttribute('aria-busy', 'true');
    action.setAttribute('aria-disabled', 'true');
    setText(action, 'Connecting…');
    window.location.assign(action.href);
    return;
  }

  if (action.dataset.integrationAction !== 'disconnect') return;
  if (!window.confirm('Disconnect Gmail from this workspace? New Gmail messages will stop syncing.')) return;

  setButtonBusy(action, true, 'Disconnecting…');
  setIntegrationFeedback('');
  try {
    await mutate('/api/integrations/gmail', 'DELETE');
    setIntegrationFeedback('Gmail disconnected from this workspace.');
    window.requestAnimationFrame(() => {
      elements.integrationList.querySelector('[data-integration-action="authorize"]')?.focus();
    });
  } catch (error) {
    if (!state.session) return;
    setIntegrationFeedback(`Gmail could not be disconnected: ${error.message}`, true);
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

elements.teamDepartmentList.addEventListener('submit', async event => {
  const form = event.target.closest('.microsoft-principal-form');
  if (!form || state.session?.user.role !== 'admin') return;
  event.preventDefault();
  const submit = form.querySelector('[type="submit"]');
  const memberName = form.closest('.team-member')?.querySelector('strong')?.textContent || 'Team member';
  setButtonBusy(submit, true, 'Saving…');
  try {
    await api(`/api/team/${form.dataset.memberId}/microsoft-principal`, {
      method: 'PATCH',
      body: { microsoftPrincipal: form.elements.namedItem('microsoftPrincipal').value.trim() }
    });
    await refresh({ quiet: true });
    showToast(`${memberName}'s Microsoft identity was updated.`);
  } catch (error) {
    if (state.session) showToast(error.message, true);
  } finally {
    setButtonBusy(submit, false, 'Saving…');
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
    const failed = Number(result.failed ?? result.result?.failed) || 0;
    const attention = failed > 0
      ? `; ${countLabel(failed, 'mailbox')} ${failed === 1 ? 'needs' : 'need'} attention.`
      : '.';
    showToast(Number.isInteger(imported)
      ? `Sync complete: ${imported} new, ${assigned ?? 0} assigned${attention}`
      : failed > 0 ? `${countLabel(failed, 'mailbox')} ${failed === 1 ? 'needs' : 'need'} attention.` : 'Mailboxes synced.');
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
    playCompletionChime();
    showToast('Email marked complete.');
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setButtonBusy(elements.completeButton, false, 'Completing…');
  }
});

elements.notificationList.addEventListener('click', async event => {
  const returnBriefing = event.target.closest('.open-return-briefing');
  if (returnBriefing) {
    try {
      await openReturnBriefing(returnBriefing.dataset.briefingId);
      await mutate(`/api/notifications/${returnBriefing.dataset.notificationId}/read`);
      playReadChime();
    } catch (error) {
      showToast(error.message, true);
    }
    return;
  }
  const open = event.target.closest('.open-notification');
  if (open) {
    openEmail(open.dataset.emailId);
    try {
      await mutate(`/api/notifications/${open.dataset.notificationId}/read`);
      playReadChime();
    } catch (error) {
      showToast(error.message, true);
    }
    return;
  }
  const read = event.target.closest('.read-notification');
  if (!read) return;
  setButtonBusy(read, true, '…');
  try {
    await mutate(`/api/notifications/${read.dataset.notificationId}/read`);
    playReadChime();
  } catch (error) {
    showToast(error.message, true);
    setButtonBusy(read, false, '…');
  }
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (!elements.accountMenu.hidden) closeAccountMenu({ restoreFocus: true });
  if (state.sidebarOpen) closeSidebar(true);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPolling();
  else if (state.session) refresh({ quiet: true }).catch(() => startPolling());
});

refresh({ quiet: true }).catch(error => {
  if (state.session) showToast(error.message, true);
});
