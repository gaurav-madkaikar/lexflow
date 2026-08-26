import { createConversationCache } from './conversation-cache.js';

const state = {
  session: null,
  view: 'inbox',
  department: 'All',
  query: '',
  dateFilter: '',
  expandedThreadKeys: new Set(),
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
  conversationReturnHandled: false,
  membershipRequests: [],
  membershipRequestsLoaded: false,
  membershipRequestsLoading: false,
  membershipRequestsError: '',
  membershipInviteLinks: new Map(),
  selectedConversationKey: null,
  retryDeliveryId: null,
  deliveryRetryOpener: null
};

const registrationState = {
  role: 'admin',
  email: '',
  mailboxProvider: null,
  step: 'entry',
  logoDataUrl: null,
  selectedOrganization: null,
  selectedOrganizationKey: '',
  inviteToken: null,
  invite: null
};

const elements = {
  skipLink: document.querySelector('#skip-link'),
  loginView: document.querySelector('#login-view'),
  loginForm: document.querySelector('#login-form'),
  loginError: document.querySelector('#login-error'),
  registerOpen: document.querySelector('#register-open'),
  registerView: document.querySelector('#register-view'),
  registerBackLogin: document.querySelector('#register-back-login'),
  registerRole: document.querySelector('#register-role'),
  registerEntryStep: document.querySelector('#register-entry-step'),
  registerEntryForm: document.querySelector('#register-entry-form'),
  registerEntryError: document.querySelector('#register-entry-error'),
  registerProviderField: document.querySelector('#register-provider-field'),
  registerProviderStatus: document.querySelector('#register-provider-status'),
  registrationProgress: document.querySelector('#registration-progress'),
  registrationStepLabel: document.querySelector('#registration-step-label'),
  organizationStep: document.querySelector('#organization-step'),
  organizationStepTitle: document.querySelector('#organization-step-title'),
  organizationForm: document.querySelector('#organization-form'),
  organizationError: document.querySelector('#organization-error'),
  organizationLogoPreview: document.querySelector('#organization-logo-preview'),
  organizationLogoFrame: document.querySelector('#organization-logo-frame'),
  adminAccountStep: document.querySelector('#admin-account-step'),
  adminAccountTitle: document.querySelector('#admin-account-title'),
  adminRegistrationForm: document.querySelector('#admin-registration-form'),
  adminRegistrationError: document.querySelector('#admin-registration-error'),
  joinStep: document.querySelector('#join-step'),
  joinStepTitle: document.querySelector('#join-step-title'),
  joinRequestForm: document.querySelector('#join-request-form'),
  joinRequestError: document.querySelector('#join-request-error'),
  organizationLookupButton: document.querySelector('#organization-lookup-button'),
  organizationMatch: document.querySelector('#organization-match'),
  organizationMatchLogo: document.querySelector('#organization-match-logo'),
  organizationMatchMark: document.querySelector('#organization-match-mark'),
  organizationMatchName: document.querySelector('#organization-match-name'),
  organizationMatchDomain: document.querySelector('#organization-match-domain'),
  joinRequestSubmit: document.querySelector('#join-request-submit'),
  joinConfirmationStep: document.querySelector('#join-confirmation-step'),
  joinConfirmationTitle: document.querySelector('#join-confirmation-title'),
  joinConfirmationCopy: document.querySelector('#join-confirmation-copy'),
  inviteStep: document.querySelector('#invite-step'),
  inviteStepTitle: document.querySelector('#invite-step-title'),
  inviteLoading: document.querySelector('#invite-loading'),
  inviteForm: document.querySelector('#invite-form'),
  inviteError: document.querySelector('#invite-error'),
  inviteOrganizationLogo: document.querySelector('#invite-organization-logo'),
  inviteOrganizationMark: document.querySelector('#invite-organization-mark'),
  inviteOrganizationName: document.querySelector('#invite-organization-name'),
  inviteOrganizationDomain: document.querySelector('#invite-organization-domain'),
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
  organizationProfile: document.querySelector('#organization-profile'),
  organizationProfileLogo: document.querySelector('#organization-profile-logo'),
  organizationProfileName: document.querySelector('#organization-profile-name'),
  organizationProfileDomain: document.querySelector('#organization-profile-domain'),
  organizationHandle: document.querySelector('#organization-handle'),
  organizationJoinCode: document.querySelector('#organization-join-code'),
  organizationCopyFeedback: document.querySelector('#organization-copy-feedback'),
  integrationsTitle: document.querySelector('#integrations-title'),
  integrationList: document.querySelector('#integration-list'),
  integrationFeedback: document.querySelector('#integration-feedback'),
  membershipRequestList: document.querySelector('#membership-request-list'),
  membershipRequestFeedback: document.querySelector('#membership-request-feedback'),
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
  emailDeliveryCard: document.querySelector('#email-delivery-card'),
  emailDeliveryTitle: document.querySelector('#email-delivery-title'),
  emailDeliveryCopy: document.querySelector('#email-delivery-copy'),
  emailDeliveryRetry: document.querySelector('#email-delivery-retry'),
  emailDeliveryHistory: document.querySelector('#email-delivery-history'),
  emailDeliveryHistoryList: document.querySelector('#email-delivery-history-list'),
  conversationDetail: document.querySelector('#conversation-detail'),
  conversationTitle: document.querySelector('#conversation-title'),
  conversationCount: document.querySelector('#conversation-count'),
  conversationFeedback: document.querySelector('#conversation-feedback'),
  conversationList: document.querySelector('#conversation-list'),
  conversationRetry: document.querySelector('#conversation-retry'),
  deliveryRetryDialog: document.querySelector('#delivery-retry-dialog'),
  deliveryRetryError: document.querySelector('#delivery-retry-error'),
  deliveryRetryConfirm: document.querySelector('#delivery-retry-confirm'),
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

function formError(message, fields = {}) {
  const error = new Error(message);
  error.fields = fields;
  return error;
}

function resetFormFeedback(form, errorElement) {
  clearFieldErrors(form);
  errorElement.hidden = true;
  setText(errorElement, '');
}

function normalizeRegistrationEmail(value) {
  const email = String(value ?? '').trim().toLocaleLowerCase('en-US');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw formError('Enter a valid email address to continue.', { email: 'Enter a valid email address.' });
  }
  return email;
}

function automaticMailboxProvider(email) {
  const domain = String(email).split('@')[1]?.toLocaleLowerCase('en-US');
  if (domain === 'gmail.com') return 'gmail';
  if (['outlook.com', 'hotmail.com', 'live.com'].includes(domain)) return 'outlook';
  return null;
}

function mailboxProviderName(provider) {
  return provider === 'outlook' ? 'Outlook' : provider === 'gmail' ? 'Gmail' : '';
}

function updateRegistrationProvider() {
  const emailControl = elements.registerEntryForm.elements.namedItem('email');
  const providerControl = elements.registerEntryForm.elements.namedItem('mailboxProvider');
  const value = String(emailControl.value).trim();
  const automatic = automaticMailboxProvider(value);
  const hasAddressDomain = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const needsChoice = hasAddressDomain && !automatic;

  elements.registerProviderField.hidden = !needsChoice;
  providerControl.required = needsChoice;
  setText(elements.registerProviderStatus, automatic
    ? `${mailboxProviderName(automatic)} selected from this email address.`
    : needsChoice ? 'Choose the service that hosts this mailbox.' : '');
}

function setRegistrationRole(role) {
  registrationState.role = role === 'member' ? 'member' : 'admin';
  elements.registerRole.querySelectorAll('[data-register-role]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.registerRole === registrationState.role));
  });
  const labels = registrationState.role === 'member'
    ? ['Choose account', 'Find organization', 'Request sent']
    : ['Choose account', 'Organization', 'Account details'];
  elements.registrationProgress.querySelectorAll('strong').forEach((label, index) => {
    setText(label, labels[index]);
  });
}

function registrationStepMeta(step) {
  if (step === 'invite') return { label: 'Approved invitation', progress: null, focus: elements.inviteStepTitle };
  const member = registrationState.role === 'member';
  const steps = member
    ? { entry: [0, 'Step 1 of 2'], join: [1, 'Step 2 of 2'], confirmation: [2, 'Request complete'] }
    : { entry: [0, 'Step 1 of 3'], organization: [1, 'Step 2 of 3'], account: [2, 'Step 3 of 3'] };
  const [progress, label] = steps[step] ?? steps.entry;
  const focus = {
    entry: document.querySelector('#register-title'),
    organization: elements.organizationStepTitle,
    account: elements.adminAccountTitle,
    join: elements.joinStepTitle,
    confirmation: elements.joinConfirmationTitle
  }[step];
  return { label, progress, focus };
}

function showRegistrationStep(step, { focus = true } = {}) {
  registrationState.step = step;
  const sections = {
    entry: elements.registerEntryStep,
    organization: elements.organizationStep,
    account: elements.adminAccountStep,
    join: elements.joinStep,
    confirmation: elements.joinConfirmationStep,
    invite: elements.inviteStep
  };
  Object.entries(sections).forEach(([name, section]) => {
    section.hidden = name !== step;
  });

  const meta = registrationStepMeta(step);
  setText(elements.registrationStepLabel, meta.label);
  elements.registrationProgress.hidden = meta.progress === null;
  elements.registrationProgress.querySelectorAll('[data-registration-progress]').forEach((item, index) => {
    item.classList.toggle('current', index === meta.progress);
    item.classList.toggle('complete', meta.progress !== null && index < meta.progress);
    if (index === meta.progress) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
  if (focus) window.requestAnimationFrame(() => meta.focus?.focus({ preventScroll: true }));
}

function clearInviteQuery() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('invite')) return;
  url.searchParams.delete('invite');
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

function resetRegistration() {
  registrationState.role = 'admin';
  registrationState.email = '';
  registrationState.mailboxProvider = null;
  registrationState.logoDataUrl = null;
  registrationState.selectedOrganization = null;
  registrationState.selectedOrganizationKey = '';
  registrationState.inviteToken = null;
  registrationState.invite = null;
  for (const [form, error] of [
    [elements.registerEntryForm, elements.registerEntryError],
    [elements.organizationForm, elements.organizationError],
    [elements.adminRegistrationForm, elements.adminRegistrationError],
    [elements.joinRequestForm, elements.joinRequestError],
    [elements.inviteForm, elements.inviteError]
  ]) {
    form.reset();
    resetFormFeedback(form, error);
  }
  setRegistrationRole('admin');
  elements.organizationLogoPreview.hidden = true;
  elements.organizationLogoPreview.removeAttribute('src');
  elements.organizationLogoPreview.alt = '';
  elements.organizationLogoFrame.classList.remove('has-image');
  elements.organizationMatch.hidden = true;
  elements.joinRequestSubmit.disabled = true;
  elements.inviteForm.hidden = true;
  elements.inviteLoading.hidden = false;
  elements.inviteLoading.classList.remove('error');
  setText(elements.inviteLoading, 'Checking this invitation…');
  updateRegistrationProvider();
}

function openRegistration() {
  stopPolling();
  closeSidebar();
  resetRegistration();
  elements.skipLink.hidden = true;
  elements.appView.hidden = true;
  elements.loginView.hidden = true;
  elements.registerView.hidden = false;
  showRegistrationStep('entry');
}

function setOrganizationImage(image, mark, value, alt) {
  const source = safeWebUrl(value);
  image.hidden = !source;
  mark.hidden = Boolean(source);
  if (source) {
    image.src = source;
    image.alt = alt;
  } else {
    image.removeAttribute('src');
    image.alt = '';
  }
}

function readBoundedDataUrl(file, maxBytes) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(formError('Choose an organization logo.', { organizationLogo: 'Choose a logo file.' }));
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      reject(formError('Choose a PNG, JPEG, or WebP logo.', { organizationLogo: 'Unsupported image format.' }));
      return;
    }
    if (file.size > maxBytes) {
      reject(formError('The organization logo must be no more than 2 MB.', { organizationLogo: 'Choose a file smaller than 2 MB.' }));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(formError('The logo could not be read. Choose it again.', { organizationLogo: 'Choose this file again.' }));
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      const image = new Image();
      image.onerror = () => reject(formError('The logo is not a valid image.', { organizationLogo: 'Choose a valid image.' }));
      image.onload = () => {
        if (image.naturalWidth < 64 || image.naturalWidth > 2048 || image.naturalHeight < 64 || image.naturalHeight > 2048) {
          reject(formError('The logo dimensions must be between 64 and 2,048 pixels.', {
            organizationLogo: 'Use an image between 64 and 2,048 pixels in both dimensions.'
          }));
          return;
        }
        resolve(dataUrl);
      };
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

function populateAdminAccount() {
  const form = elements.adminRegistrationForm;
  form.elements.namedItem('email').value = registrationState.email;
  form.elements.namedItem('organization').value = elements.organizationForm.elements.namedItem('organizationName').value.trim();
  form.elements.namedItem('mailboxProvider').value = mailboxProviderName(registrationState.mailboxProvider);
}

function populateJoinIdentity() {
  const form = elements.joinRequestForm;
  form.elements.namedItem('email').value = registrationState.email;
  form.elements.namedItem('mailboxProvider').value = mailboxProviderName(registrationState.mailboxProvider);
}

function showOrganizationMatch(organization) {
  registrationState.selectedOrganization = organization;
  setText(elements.organizationMatchName, organization.name);
  setText(elements.organizationMatchDomain, organization.domain || organization.handle);
  setOrganizationImage(
    elements.organizationMatchLogo,
    elements.organizationMatchMark,
    organization.logoUrl,
    `${organization.name} logo`
  );
  elements.organizationMatch.hidden = false;
  elements.joinRequestSubmit.disabled = false;
}

async function inspectRegistrationInvite(token) {
  registrationState.inviteToken = token;
  elements.skipLink.hidden = true;
  elements.appView.hidden = true;
  elements.loginView.hidden = true;
  elements.registerView.hidden = false;
  showRegistrationStep('invite');
  elements.inviteForm.hidden = true;
  elements.inviteLoading.hidden = false;
  elements.inviteLoading.classList.remove('error');
  setText(elements.inviteLoading, 'Checking this invitation…');

  try {
    const payload = await api(`/api/registration-invites/${encodeURIComponent(token)}`);
    const invite = payload.invite;
    registrationState.invite = invite;
    setText(elements.inviteOrganizationName, invite.organization.name);
    setText(elements.inviteOrganizationDomain, invite.organization.domain);
    setOrganizationImage(
      elements.inviteOrganizationLogo,
      elements.inviteOrganizationMark,
      invite.organization.logoUrl,
      `${invite.organization.name} logo`
    );
    elements.inviteForm.elements.namedItem('email').value = invite.email;
    elements.inviteForm.elements.namedItem('mailboxProvider').value = mailboxProviderName(invite.mailboxProvider);
    elements.inviteLoading.hidden = true;
    elements.inviteForm.hidden = false;
    window.requestAnimationFrame(() => elements.inviteForm.elements.namedItem('name').focus());
  } catch (error) {
    elements.inviteLoading.classList.add('error');
    setText(elements.inviteLoading, `${error.message} Ask your administrator for a new invitation.`);
    elements.inviteLoading.tabIndex = -1;
    elements.inviteLoading.focus();
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

const conversationCache = createConversationCache({
  fetchConversation: email => api(`/api/emails/${encodeURIComponent(email.id)}/conversation`),
});

async function refresh({ quiet = false } = {}) {
  try {
    const previousSelectedEmail = (state.session?.emails ?? [])
      .find(email => Number(email.id) === Number(state.selectedEmailId));
    const detailScrollTop = elements.emailDialog.open
      ? elements.emailDialog.querySelector('.email-detail')?.scrollTop ?? 0
      : 0;
    state.session = await api('/api/bootstrap');
    for (const email of state.session.emails ?? []) conversationCache.invalidateVersion(email);
    const selectedEmailRemoved = state.selectedEmailId !== null
      && !(state.session.emails ?? []).some(email => (
        Number(email.id) === Number(state.selectedEmailId)
      ));
    const closeRemovedEmail = selectedEmailRemoved && elements.emailDialog.open;
    if (selectedEmailRemoved) {
      state.selectedEmailId = null;
      state.emailDialogOpener = null;
      if (closeRemovedEmail) elements.emailDialog.close();
    }
    normalizeView();
    render();
    const selectedEmail = (state.session.emails ?? [])
      .find(email => Number(email.id) === Number(state.selectedEmailId));
    if (selectedEmail && elements.emailDialog.open) {
      renderEmailDelivery(selectedEmail);
      const previousVersion = Number(previousSelectedEmail?.conversation?.version ?? 0);
      const nextVersion = Number(selectedEmail.conversation?.version ?? 0);
      const cached = conversationCache.entryFor(selectedEmail);
      if (cached) renderDrawerConversation(cached.value);
      else if (previousVersion !== nextVersion) ensureConversation(selectedEmail, { drawer: true });
      const detail = elements.emailDialog.querySelector('.email-detail');
      if (detail && previousVersion === nextVersion) detail.scrollTop = detailScrollTop;
    }
    if (closeRemovedEmail) showToast('This email is no longer available.');
    handleIntegrationReturn();
    handleConversationLink();
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
  if (elements.deliveryRetryDialog.open) elements.deliveryRetryDialog.close();
  state.selectedEmailId = null;
  state.selectedConversationKey = null;
  state.retryDeliveryId = null;
  state.deliveryRetryOpener = null;
  state.dateFilter = '';
  state.expandedThreadKeys.clear();
  state.emailDialogOpener = null;
  state.ruleDialogOpener = null;
  state.editingRuleId = null;
  state.editingRuleSnapshot = null;
  state.settingsDirty = false;
  state.lastUnreadCount = null;
  state.membershipRequests = [];
  state.membershipRequestsLoaded = false;
  state.membershipRequestsLoading = false;
  state.membershipRequestsError = '';
  state.membershipInviteLinks.clear();
  conversationCache.clear();
  elements.skipLink.hidden = true;
  elements.appView.hidden = true;
  elements.registerView.hidden = true;
  elements.loginView.hidden = false;
  elements.loginForm.email.focus();
}

function showApp() {
  elements.loginView.hidden = true;
  elements.registerView.hidden = true;
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

function emailMatchesDate(email) {
  return !state.dateFilter || localDateKey(email.receivedAt) === state.dateFilter;
}

function compareEmailsNewestFirst(left, right) {
  const receivedDifference = new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime();
  return receivedDifference || Number(right.id) - Number(left.id);
}

function emailThreadKey(email) {
  return typeof email.threadKey === 'string' && email.threadKey
    ? email.threadKey
    : `email:${email.id}`;
}

function buildEmailThreads(emails = state.session?.emails ?? []) {
  const groups = new Map();
  for (const email of emails) {
    const key = emailThreadKey(email);
    if (!groups.has(key)) groups.set(key, { key, messages: [] });
    groups.get(key).messages.push(email);
  }

  return [...groups.values()]
    .map(thread => {
      thread.messages.sort(compareEmailsNewestFirst);
      thread.latest = thread.messages[0];
      thread.subject = thread.latest.threadSubject || thread.latest.subject || '(No subject)';
      return thread;
    })
    .sort((left, right) => compareEmailsNewestFirst(left.latest, right.latest));
}

function threadMatchesDate(thread) {
  return !state.dateFilter || thread.messages.some(emailMatchesDate);
}

function threadsForSelectedDate() {
  return buildEmailThreads().filter(threadMatchesDate);
}

function counts(threads = buildEmailThreads()) {
  return {
    inbox: threads.filter(thread => thread.latest.status === 'unassigned').length,
    assigned: threads.filter(thread => thread.latest.status === 'assigned').length,
    completed: threads.filter(thread => thread.latest.status === 'completed').length,
    rules: (state.session?.rules ?? []).filter(rule => rule.enabled).length,
    notifications: state.session?.unreadCount ?? 0
  };
}

function renderMetrics() {
  const totals = counts(threadsForSelectedDate());
  const isAdmin = state.session.user.role === 'admin';
  const periodNote = state.dateFilter ? `Contains email from ${selectedDateLabel(state.dateFilter, 'short')}` : null;
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
  const today = new Date();
  const displayedDate = dateFromLocalKey(state.dateFilter) || today;
  const displayedDateKey = localDateKey(displayedDate);
  const totals = counts(threadsForSelectedDate());
  const isAdmin = state.session.user.role === 'admin';
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(displayedDate);
  const month = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(displayedDate);
  elements.heroDate.dateTime = displayedDateKey;
  elements.heroDate.classList.toggle('filtered', Boolean(state.dateFilter));
  setText(elements.heroDay, displayedDate.getDate());
  setText(elements.heroWeekday, weekday);
  setText(elements.heroMonth, month);
  setText(elements.heroEyebrow, state.dateFilter
    ? `Thread activity · ${selectedDateLabel(state.dateFilter, 'short')}`
    : isAdmin ? 'Today’s workflow' : 'Your work today');
  setText(elements.heroTitle, isAdmin ? 'Keep every email moving.' : 'Your queue, ready when you are.');
  const assignedVerb = totals.assigned === 1 ? 'remains' : 'remain';
  const memberAssignedVerb = totals.assigned === 1 ? 'is' : 'are';
  setText(elements.heroSummary, isAdmin
    ? totals.inbox
      ? `${state.dateFilter ? 'For threads active on this date, ' : ''}${countLabel(totals.inbox, 'thread')} ${totals.inbox === 1 ? 'needs' : 'need'} an owner. ${countLabel(totals.assigned, 'thread')} ${assignedVerb} open.`
      : `${state.dateFilter ? 'No unassigned thread has email on this date.' : 'The intake queue is clear.'} ${countLabel(totals.assigned, 'thread')} ${assignedVerb} open across the team.`
    : `${state.dateFilter ? 'For threads active on this date, ' : ''}${countLabel(totals.assigned, 'thread')} ${memberAssignedVerb} open${state.dateFilter ? '.' : `, with ${countLabel(totals.notifications, 'unread update')} waiting.`}`);

  elements.heroDateFilter.value = state.dateFilter;
  elements.heroDateFilter.closest('.hero-calendar').classList.toggle('active', Boolean(state.dateFilter));
  elements.heroDateClear.hidden = !state.dateFilter;
  const filterLabel = state.dateFilter ? selectedDateLabel(state.dateFilter) : '';
  elements.heroDateFilter.setAttribute('aria-label', state.dateFilter
    ? `Filter threads by email received date, currently ${filterLabel}`
    : 'Filter threads by email received date');
  elements.heroDateFilter.closest('.hero-calendar').title = state.dateFilter
    ? `Showing threads with email received ${filterLabel}`
    : 'Filter threads by email received date';
  elements.heroDateClear.setAttribute('aria-label', state.dateFilter
    ? `Clear date filter for ${filterLabel}`
    : 'Clear date filter');
  setText(elements.heroDateFilterStatus, state.dateFilter
    ? `Showing threads containing email received on ${filterLabel}.`
    : 'Showing threads from all received dates.');

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

function threadMatchesDepartment(thread) {
  if (state.department === 'All') return true;
  return thread.latest.status !== 'unassigned' && thread.latest.department === state.department;
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
    email.threadSubject,
    providerLabel(emailProvider(email))
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
  return searchable.includes(state.query);
}

function threadMatchesSearch(thread) {
  return !state.query || thread.messages.some(emailMatchesSearch);
}

function visibleThreads(threads = buildEmailThreads()) {
  const status = state.view === 'inbox' ? 'unassigned' : state.view;
  return threads
    .filter(thread => thread.latest.status === status)
    .filter(threadMatchesDate)
    .filter(threadMatchesDepartment)
    .filter(threadMatchesSearch);
}

function statusLabel(status) {
  return status === 'unassigned' ? 'Unassigned' : status === 'completed' ? 'Completed' : 'Assigned';
}

function renderEmailTags(email, messageCount = 0) {
  const tags = node('span', 'email-tags');
  const provider = emailProvider(email);
  tags.append(node('span', `tag source ${provider}`, providerLabel(provider)));
  if (email.department) tags.append(node('span', 'tag department', email.department));
  tags.append(node('span', `tag ${email.status}`, statusLabel(email.status)));
  if (messageCount > 1) tags.append(node('span', 'tag thread-count', countLabel(messageCount, 'email')));
  return tags;
}

function renderEmailPerson(email) {
  const person = node('span', 'email-person');
  const avatar = node('span', 'avatar', email.assignee?.initials || '—');
  avatar.setAttribute('aria-hidden', 'true');
  person.append(avatar, node('span', '', email.assignee?.name || 'Unassigned'));
  return person;
}

function renderEmailRow(email, { grouped = false, threadChild = false } = {}) {
  const row = node('button', `email-row ${email.status}${grouped ? ' grouped' : ''}${threadChild ? ' thread-message' : ''}`);
  row.type = 'button';
  row.dataset.emailId = String(email.id);

  const dot = node('span', `status-dot ${email.status}`);
  dot.setAttribute('aria-hidden', 'true');

  const copy = node('span', 'email-copy');
  const subject = node('span', 'email-subject', email.subject || '(No subject)');
  const sender = [email.sender?.name, email.sender?.address].filter(Boolean).join(' · ') || 'Unknown sender';
  const meta = node('span', 'email-meta', `${sender} · ${formatDate(email.receivedAt, threadChild)}`);
  const preview = node('span', 'email-preview', email.preview || 'No preview available.');
  const tags = renderEmailTags(email);
  copy.append(subject, meta, preview, tags);

  row.append(dot, copy);
  if (!grouped) row.append(renderEmailPerson(email));
  return row;
}

function conversationPayload(value) {
  return value?.conversation && typeof value.conversation === 'object'
    ? value.conversation
    : value ?? {};
}

function conversationMessageTime(message) {
  return message.occurredAt ?? message.sentAt ?? message.receivedAt ?? null;
}

function conversationMessageSender(message) {
  return message.sender ?? message.author ?? {};
}

function renderConversationMessage(message) {
  const item = node('li', 'conversation-message');
  item.dataset.conversationMessageId = String(message.id ?? message.providerMessageId ?? 'message');
  const card = node('article', `conversation-message-card ${message.direction === 'sent' ? 'sent' : 'received'}`);
  const header = node('header', 'conversation-message-head');
  const sender = conversationMessageSender(message);
  const heading = node('strong', '', [sender.name, sender.address].filter(Boolean).join(' · ') || 'Unknown sender');
  const direction = message.direction === 'sent' ? 'Sent' : 'Received';
  const badge = node('span', `conversation-direction ${message.direction === 'sent' ? 'sent' : 'received'}`, direction);
  const timeValue = conversationMessageTime(message);
  const time = node('time', '', formatDate(timeValue));
  if (timeValue) time.dateTime = timeValue;
  header.append(heading, badge, time);
  const preview = node('p', 'conversation-message-preview', message.preview || 'No preview available.');
  card.append(header, preview);
  const webUrl = safeWebUrl(message.webUrl);
  if (webUrl) {
    const action = node('a', 'conversation-message-action', `Open in ${providerLabel(message.provider)}`);
    action.href = webUrl;
    action.target = '_blank';
    action.rel = 'noopener noreferrer';
    action.setAttribute('aria-label', `${action.textContent}: ${heading.textContent}`);
    card.append(action);
  }
  item.append(card);
  return item;
}

function conversationMessages(value) {
  const conversation = conversationPayload(value);
  return Array.isArray(conversation.messages) ? conversation.messages : [];
}

function renderInlineConversation(region, value) {
  const conversation = conversationPayload(value);
  const messages = conversationMessages(value);
  const list = node('ol', 'conversation-timeline inline');
  if (messages.length) list.append(...messages.map(renderConversationMessage));
  region.replaceChildren(messages.length
    ? list
    : emptyState('No provider history', 'No received or sent previews are available for this conversation.'));
  region.dataset.historyLoaded = 'true';
  region.setAttribute('aria-busy', 'false');
  region.dataset.historyCount = String(messages.length);
  if (conversation.truncated) {
    region.append(node('p', 'conversation-limit-note', 'Showing the latest 100 messages.'));
  }
}

function showInlineConversationError(region, email, error) {
  region.querySelector('.conversation-inline-feedback')?.remove();
  const feedback = node('div', 'conversation-inline-feedback error');
  feedback.setAttribute('role', 'alert');
  feedback.append(node('span', '', error.message || 'Conversation history could not be loaded.'));
  const retry = node('button', 'small-button', 'Retry');
  retry.type = 'button';
  retry.dataset.conversationRetryEmailId = String(email.id);
  feedback.append(retry);
  region.append(feedback);
  region.setAttribute('aria-busy', 'false');
}

function renderDrawerConversation(value) {
  const conversation = conversationPayload(value);
  const messages = conversationMessages(value);
  setText(elements.conversationCount, countLabel(messages.length, 'message'));
  elements.conversationFeedback.hidden = true;
  setText(elements.conversationFeedback, '');
  elements.conversationRetry.hidden = true;
  elements.conversationList.replaceChildren(...messages.map(renderConversationMessage));
  if (!messages.length) {
    elements.conversationFeedback.hidden = false;
    setText(elements.conversationFeedback, 'No received or sent previews are available for this conversation.');
  } else if (conversation.truncated) {
    elements.conversationFeedback.hidden = false;
    setText(elements.conversationFeedback, 'Showing the latest 100 messages.');
  }
  elements.conversationDetail.setAttribute('aria-busy', 'false');
}

function showDrawerConversationLoading() {
  elements.conversationList.replaceChildren();
  setText(elements.conversationCount, '');
  setText(elements.conversationFeedback, 'Loading received and sent previews…');
  elements.conversationFeedback.hidden = false;
  elements.conversationRetry.hidden = true;
  elements.conversationDetail.setAttribute('aria-busy', 'true');
}

function showDrawerConversationError(error) {
  elements.conversationList.replaceChildren();
  setText(elements.conversationCount, '');
  setText(elements.conversationFeedback, error.message || 'Conversation history could not be loaded.');
  elements.conversationFeedback.hidden = false;
  elements.conversationRetry.hidden = false;
  elements.conversationDetail.setAttribute('aria-busy', 'false');
}

async function ensureConversation(email, { force = false, drawer = false } = {}) {
  if (!email) return;
  const key = emailThreadKey(email);
  if (drawer) showDrawerConversationLoading();
  const inlineRegion = elements.emailList.querySelector(`.thread-messages[data-thread-key="${CSS.escape(key)}"]`);
  if (inlineRegion && !inlineRegion.dataset.historyLoaded) {
    inlineRegion.setAttribute('aria-busy', 'true');
    if (!inlineRegion.querySelector('.conversation-inline-feedback')) {
      inlineRegion.append(node('p', 'conversation-inline-feedback', 'Loading received and sent previews…'));
    }
  }
  try {
    const value = await conversationCache.load(email, { force });
    const currentRegion = elements.emailList.querySelector(`.thread-messages[data-thread-key="${CSS.escape(key)}"]`);
    if (currentRegion && state.expandedThreadKeys.has(key)) renderInlineConversation(currentRegion, value);
    if (state.selectedConversationKey === key && elements.emailDialog.open) {
      renderDrawerConversation(value);
    }
  } catch (error) {
    const currentRegion = elements.emailList.querySelector(`.thread-messages[data-thread-key="${CSS.escape(key)}"]`);
    if (currentRegion && state.expandedThreadKeys.has(key)) showInlineConversationError(currentRegion, email, error);
    if (state.selectedConversationKey === key && elements.emailDialog.open) {
      showDrawerConversationError(error);
    }
  }
}

function renderEmailThread(thread, { grouped = false } = {}) {
  if (thread.messages.length === 1) {
    const row = renderEmailRow(thread.latest, { grouped });
    row.dataset.threadKey = thread.key;
    return row;
  }

  const latest = thread.latest;
  const expanded = state.expandedThreadKeys.has(thread.key);
  const baseId = `email-thread-${latest.id}`;
  const titleId = `${baseId}-title`;
  const messagesId = `${baseId}-messages`;
  const wrapper = node('article', 'email-thread');
  wrapper.dataset.threadKey = thread.key;
  wrapper.setAttribute('aria-labelledby', titleId);

  const toggle = node('button', `thread-toggle ${latest.status}${grouped ? ' grouped' : ''}`);
  toggle.type = 'button';
  toggle.dataset.threadToggle = '';
  toggle.dataset.threadKey = thread.key;
  toggle.setAttribute('aria-expanded', String(expanded));
  toggle.setAttribute('aria-controls', messagesId);

  const dot = node('span', `status-dot ${latest.status}`);
  dot.setAttribute('aria-hidden', 'true');
  const copy = node('span', 'email-copy');
  const subject = node('span', 'email-subject', thread.subject);
  subject.id = titleId;
  const sender = [latest.sender?.name, latest.sender?.address].filter(Boolean).join(' · ') || 'Unknown sender';
  const meta = node('span', 'email-meta', `${sender} · ${formatDate(latest.receivedAt)}`);
  const preview = node('span', 'email-preview', latest.preview || 'No preview available.');
  copy.append(subject, meta, preview, renderEmailTags(latest, thread.messages.length));
  toggle.append(dot, copy);
  if (!grouped) toggle.append(renderEmailPerson(latest));
  const chevron = node('span', 'thread-chevron');
  chevron.setAttribute('aria-hidden', 'true');
  chevron.append(svgIcon('#icon-chevron'));
  toggle.append(chevron);

  const messages = node('div', 'thread-messages');
  messages.id = messagesId;
  messages.dataset.threadKey = thread.key;
  messages.hidden = !expanded;
  messages.setAttribute('role', 'region');
  messages.setAttribute('aria-labelledby', titleId);
  const cached = conversationCache.entryFor(latest);
  if (cached) renderInlineConversation(messages, cached.value);
  else messages.append(...thread.messages.map(email => renderEmailRow(email, { grouped: true, threadChild: true })));
  wrapper.append(toggle, messages);
  return wrapper;
}

function assignedEmployeeGroups(threads) {
  const groups = new Map();
  for (const thread of threads) {
    const assignee = thread.latest.assignee ?? {
      id: 'unknown',
      name: 'Unknown employee',
      initials: '—',
      email: '',
      department: thread.latest.department || 'No department'
    };
    const key = String(assignee.id ?? assignee.email ?? assignee.name);
    if (!groups.has(key)) groups.set(key, { assignee, threads: [] });
    groups.get(key).threads.push(thread);
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
  const messageCount = group.threads.reduce((total, thread) => total + thread.messages.length, 0);
  const count = node('span', 'employee-group-count', `${countLabel(group.threads.length, 'thread')} · ${countLabel(messageCount, 'email')}`);
  count.id = countId;
  header.append(avatar, copy, count);

  const emailRows = node('div', 'employee-group-emails');
  emailRows.append(...group.threads.map(thread => renderEmailThread(thread, { grouped: true })));
  section.append(header, emailRows);
  return section;
}

function renderEmails() {
  const activeElement = elements.emailList.contains(document.activeElement) ? document.activeElement : null;
  const focusedEmailId = activeElement?.closest('[data-email-id]')?.dataset.emailId;
  const focusedConversationMessageId = activeElement
    ?.closest('[data-conversation-message-id]')?.dataset.conversationMessageId;
  const focusedThreadKey = activeElement?.closest('[data-thread-key]')?.dataset.threadKey;
  const focusedThreadToggle = Boolean(activeElement?.closest('[data-thread-toggle]'));
  const allThreads = buildEmailThreads();
  const availableThreadKeys = new Set(allThreads.map(thread => thread.key));
  for (const key of state.expandedThreadKeys) {
    if (!availableThreadKeys.has(key)) state.expandedThreadKeys.delete(key);
  }
  const threads = visibleThreads(allThreads);
  const messageCount = threads.reduce((total, thread) => total + thread.messages.length, 0);
  const groupedAssigned = state.view === 'assigned' && state.session.user.role === 'admin';
  const employeeGroups = groupedAssigned ? assignedEmployeeGroups(threads) : [];
  const labels = {
    inbox: ['Unassigned inbox', 'New email threads awaiting a rule'],
    assigned: [
      state.session.user.role === 'admin' ? 'Assigned by employee' : 'My work',
      state.session.user.role === 'admin'
        ? `${countLabel(employeeGroups.length, 'employee')} with open threads`
        : 'Open email threads ready for your review'
    ],
    completed: ['Completed work', 'Closed email thread history']
  };
  const [title, caption] = labels[state.view] ?? labels.assigned;
  setText(elements.queueTitle, title);
  const dateCaption = state.dateFilter ? ` · Contains email received ${selectedDateLabel(state.dateFilter, 'short')}` : '';
  setText(elements.queueCaption, `${caption}${dateCaption}`);
  setText(elements.emailCount, `${countLabel(threads.length, 'thread')} · ${countLabel(messageCount, 'email')}`);
  elements.emailList.classList.toggle('employee-group-list', groupedAssigned && threads.length > 0);
  const hasFilters = Boolean(state.query || state.dateFilter || state.department !== 'All');
  const emptyMessage = state.dateFilter
    ? `No threads contain email received on ${selectedDateLabel(state.dateFilter)} that match the current filters.`
    : hasFilters ? 'No email threads match your search and filters.' : 'This queue is clear.';
  elements.emailList.replaceChildren(...(threads.length
    ? groupedAssigned
      ? employeeGroups.map(renderEmployeeGroup)
      : threads.map(thread => renderEmailThread(thread))
    : [emptyState('Nothing here', emptyMessage)]));

  if (focusedEmailId || focusedThreadKey || focusedConversationMessageId) {
    window.requestAnimationFrame(() => {
      const threadControl = [...elements.emailList.querySelectorAll('[data-thread-toggle], .email-row[data-thread-key]')]
        .find(control => control.dataset.threadKey === focusedThreadKey);
      const emailControl = [...elements.emailList.querySelectorAll('[data-email-id]')]
        .find(row => row.dataset.emailId === focusedEmailId);
      const visibleEmailControl = emailControl?.getClientRects().length ? emailControl : null;
      const parentThreadControl = emailControl?.closest('.email-thread')?.querySelector('[data-thread-toggle]');
      const conversationControl = focusedConversationMessageId
        ? [...elements.emailList.querySelectorAll('[data-conversation-message-id]')]
          .find(item => item.dataset.conversationMessageId === focusedConversationMessageId)
          ?.querySelector('a, button')
        : null;
      const replacement = focusedThreadToggle
        ? threadControl
        : conversationControl || visibleEmailControl || parentThreadControl || threadControl;
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
  const unreadCount = state.session.unreadCount ?? 0;
  const notificationTotal = state.session.notificationTotal ?? notifications.length;
  const visibleSuffix = notificationTotal > notifications.length
    ? ` · showing latest ${notifications.length}`
    : '';
  setText(elements.notificationsCaption, `${unreadCount} unread${visibleSuffix}`);
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
    lastError: integration.lastError || '',
    capabilities: {
      read: Boolean(integration.capabilities?.read),
      send: Boolean(integration.capabilities?.send)
    },
    authorizationAvailable: Boolean(integration.authorizationAvailable),
    disconnectAvailable: Boolean(integration.disconnectAvailable)
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

  const account = connection.accountEmail || (connection.configured
    ? `No ${name} account connected.`
    : `${name} OAuth is not configured on this server.`);
  const accountElement = node('p', 'integration-account', account);
  accountElement.id = `integration-${provider}-account`;
  copy.append(accountElement);

  const capabilityList = node('div', 'integration-capabilities');
  const readCapability = node(
    'span',
    `integration-capability ${connection.capabilities.read ? 'granted' : 'missing'}`,
    connection.capabilities.read ? 'Read connected' : 'Read access required'
  );
  const sendCapability = node(
    'span',
    `integration-capability ${connection.capabilities.send ? 'granted' : 'missing'}`,
    connection.capabilities.send ? 'Send connected' : 'Send consent required'
  );
  capabilityList.append(readCapability, sendCapability);
  copy.append(capabilityList);

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
  if (connection.authorizationAvailable) {
    if (connection.configured) {
      const reconnecting = connection.connected || connection.accountEmail || connection.lastError;
      const authorize = node('a', 'button', reconnecting ? `Reconnect ${name}` : `Connect ${name}`);
      authorize.href = `/api/integrations/${provider}/authorize`;
      authorize.dataset.integrationAction = 'authorize';
      authorize.setAttribute('aria-label', `${reconnecting ? 'Reconnect' : 'Connect'} ${name} account`);
      actions.append(authorize);
    } else {
      const unavailable = node('button', 'button', `Connect ${name}`);
      unavailable.type = 'button';
      unavailable.disabled = true;
      unavailable.setAttribute('aria-describedby', accountElement.id);
      actions.append(unavailable);
    }

    if (connection.connected && connection.disconnectAvailable) {
      const disconnect = node('button', 'button integration-disconnect', 'Disconnect');
      disconnect.type = 'button';
      disconnect.dataset.integrationAction = 'disconnect';
      disconnect.setAttribute('aria-label', `Disconnect ${name} account ${connection.accountEmail}`.trim());
      actions.append(disconnect);
    }
  } else {
    actions.append(node('span', 'integration-managed', connection.connected ? 'Server managed' : 'Server setup'));
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
      integration.lastError || '',
      Boolean(integration.capabilities?.read),
      Boolean(integration.capabilities?.send),
      Boolean(integration.authorizationAvailable),
      Boolean(integration.disconnectAvailable)
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

function membershipStatusLabel(status) {
  return {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected'
  }[status] || 'Pending';
}

function renderMembershipRequest(request) {
  const item = node('article', 'membership-request');
  item.dataset.membershipRequestId = String(request.id);
  const provider = mailboxProviderName(request.mailboxProvider) || 'Email';
  const status = ['pending', 'approved', 'rejected'].includes(request.status) ? request.status : 'pending';
  const identity = node('div', 'membership-request-identity');
  const avatar = node('span', 'avatar', String(request.email || '?').charAt(0).toLocaleUpperCase());
  avatar.setAttribute('aria-hidden', 'true');
  const copy = node('span', 'membership-request-copy');
  copy.append(
    node('strong', '', request.name || request.email || 'Membership request'),
    node('small', '', request.name ? request.email : `${provider} mailbox`)
  );
  identity.append(avatar, copy);

  const meta = node('div', 'membership-request-meta');
  const statusPill = node('span', `membership-status ${status}`, membershipStatusLabel(status));
  const requested = node('small', '', request.createdAt ? `Requested ${formatDate(request.createdAt)}` : `${provider} request`);
  meta.append(statusPill, requested);

  const actions = node('div', 'membership-request-actions');
  if (status === 'pending') {
    const reject = node('button', 'small-button membership-reject', 'Reject');
    reject.type = 'button';
    reject.dataset.membershipAction = 'reject';
    const approve = node('button', 'small-button membership-approve', 'Approve');
    approve.type = 'button';
    approve.dataset.membershipAction = 'approve';
    actions.append(reject, approve);
  } else if (status === 'approved' && !state.membershipInviteLinks.has(Number(request.id))) {
    const replaceInvite = node('button', 'small-button', 'Create new invite');
    replaceInvite.type = 'button';
    replaceInvite.dataset.membershipAction = 'replace-invite';
    actions.append(replaceInvite);
  }

  const inviteLink = state.membershipInviteLinks.get(Number(request.id));
  if (inviteLink) {
    const share = node('div', 'membership-invite-share');
    const label = node('span', '', 'One-time invite link');
    const input = node('input', 'membership-invite-input');
    input.type = 'text';
    input.readOnly = true;
    input.value = inviteLink;
    input.setAttribute('aria-label', `Invite link for ${request.email}`);
    const copyButton = node('button', 'small-button', 'Copy link');
    copyButton.type = 'button';
    copyButton.dataset.membershipAction = 'copy';
    share.append(label, input, copyButton);
    item.append(identity, meta, actions, share);
  } else {
    item.append(identity, meta, actions);
  }
  return item;
}

function renderMembershipRequests() {
  if (state.membershipRequestsLoading) {
    elements.membershipRequestList.replaceChildren(node('div', 'membership-loading', 'Loading requests…'));
    return;
  }
  if (state.membershipRequestsError) {
    const failure = node('div', 'membership-load-error');
    failure.append(
      node('p', '', state.membershipRequestsError),
      (() => {
        const retry = node('button', 'small-button', 'Retry');
        retry.type = 'button';
        retry.dataset.membershipAction = 'retry';
        return retry;
      })()
    );
    elements.membershipRequestList.replaceChildren(failure);
    return;
  }
  elements.membershipRequestList.replaceChildren(...(state.membershipRequests.length
    ? state.membershipRequests.map(renderMembershipRequest)
    : [emptyState('No pending requests', 'New requests to join this organization will appear here.')]
  ));
}

function renderOrganizationProfile() {
  const organization = state.session?.organization;
  if (!organization) return;
  setText(elements.organizationProfileName, organization.name || 'Organization');
  setText(elements.organizationProfileDomain, organization.domain || 'Unverified domain');
  elements.organizationHandle.value = organization.handle || '';
  elements.organizationJoinCode.value = organization.joinCode || '';
  const hasLogo = Boolean(organization.logoUrl);
  elements.organizationProfile.classList.toggle('no-logo', !hasLogo);
  elements.organizationProfileLogo.hidden = !hasLogo;
  if (hasLogo && elements.organizationProfileLogo.src !== new URL(organization.logoUrl, location.origin).href) {
    elements.organizationProfileLogo.src = organization.logoUrl;
    elements.organizationProfileLogo.alt = `${organization.name || 'Organization'} logo`;
  }
}

async function loadMembershipRequests({ force = false } = {}) {
  if (state.session?.user.role !== 'admin' || state.membershipRequestsLoading) return;
  if (state.membershipRequestsLoaded && !force) {
    renderMembershipRequests();
    return;
  }
  state.membershipRequestsLoading = true;
  state.membershipRequestsError = '';
  renderMembershipRequests();
  try {
    const payload = await api('/api/membership-requests');
    state.membershipRequests = Array.isArray(payload.requests) ? payload.requests : [];
    state.membershipRequestsLoaded = true;
  } catch (error) {
    if (!state.session) return;
    state.membershipRequestsError = `Membership requests could not be loaded: ${error.message}`;
  } finally {
    state.membershipRequestsLoading = false;
    renderMembershipRequests();
  }
}

function renderSettings() {
  if (state.session.user.role !== 'admin') return;
  renderOrganizationProfile();
  renderIntegrations();
  if (state.view === 'settings') {
    if (!state.membershipRequestsLoaded && !state.membershipRequestsLoading) {
      loadMembershipRequests().catch(() => {});
    } else {
      renderMembershipRequests();
    }
  }
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
  const syncError = connectedIntegrationErrors.length
    ? connectedIntegrationErrors.map(integration => integration.lastError).join(' ')
    : staleSourceSummary ? null : sync?.lastError;
  const connectedSyncAt = connectedIntegrations
    .map(integration => integration.lastSuccessAt)
    .filter(Boolean)
    .sort((left, right) => new Date(right) - new Date(left))[0] ?? null;
  const lastSyncAt = state.session.mode === 'demo' ? sync?.lastSuccessAt : connectedSyncAt;
  const conversationConflicts = Array.isArray(state.session.conversationConflicts)
    ? state.session.conversationConflicts
    : [];
  const conversationConflictTotal = Math.max(
    Number(state.session.conversationConflictTotal) || 0,
    conversationConflicts.length
  );
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
  const notices = [];
  if (syncError) {
    notices.push(syncError.startsWith('Sync needs attention:')
      ? syncError
      : `Sync needs attention: ${syncError}`);
  }
  if (conversationConflictTotal > 0) {
    const first = conversationConflicts[0];
    const firstDetail = first
      ? ` ${first.subject || 'A conversation'}: ${first.message}`
      : '';
    const remaining = conversationConflictTotal > 1
      ? ` ${countLabel(conversationConflictTotal - 1, 'additional conversation')} also needs review.`
      : '';
    notices.push(`${countLabel(conversationConflictTotal, 'conversation')} ${conversationConflictTotal === 1 ? 'needs' : 'need'} grouping review.${firstDetail}${remaining}`);
  }
  elements.statusBanner.hidden = notices.length === 0;
  setText(elements.statusBanner, notices.join(' '));
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
  elements.syncButton.hidden = !isAdmin
    || (state.session.mode !== 'demo' && mailboxSummary().connectedCount === 0);
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
  renderPanels();
  renderEmails();
  if (isAdmin) {
    renderRules();
    renderActivity();
    renderSettings();
  }
  if (!elements.notificationsPanel.hidden) renderNotifications();
}

function handleIntegrationReturn() {
  if (state.integrationReturnHandled || state.session?.user.role !== 'admin') return;
  const url = new URL(window.location.href);
  const result = url.searchParams.get('integration');
  const match = /^(gmail|outlook)-(connected|error)$/u.exec(result ?? '');
  if (!match) return;

  state.integrationReturnHandled = true;
  url.searchParams.delete('integration');
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  state.view = 'settings';
  normalizeView();
  render();

  const provider = match[1];
  const name = providerLabel(provider);
  const isError = match[2] === 'error';
  setIntegrationFeedback(
    isError
      ? `${name} authorization could not be completed. Try again.`
      : `${name} connected to this workspace.`,
    isError
  );
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    elements.integrationsTitle.focus({ preventScroll: true });
  });
}

async function handleConversationLink() {
  if (state.conversationReturnHandled || !state.session) return;
  const url = new URL(window.location.href);
  const publicId = url.searchParams.get('conversation');
  if (!publicId) return;
  state.conversationReturnHandled = true;
  url.searchParams.delete('conversation');
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  try {
    const result = await api(`/api/conversations/${encodeURIComponent(publicId)}`);
    const email = (state.session.emails ?? []).find(item => item.id === Number(result.emailId));
    if (!email) throw new Error('This conversation is no longer available.');
    state.view = email.status === 'unassigned' ? 'inbox' : email.status;
    normalizeView();
    render();
    openEmail(email.id, elements.pageTitle);
  } catch (error) {
    showToast(error.message, true);
  }
}

function selectView(view) {
  if (view === 'settings' && state.view !== 'settings') {
    state.membershipRequestsLoaded = false;
    state.membershipRequestsError = '';
  }
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

function renderEmailDelivery(email) {
  const delivery = email.delivery;
  const formerExternalized = state.session?.user.role === 'admin'
    ? (email.deliveryHistory ?? []).filter(item => !item.currentRecipient && item.externalized)
    : [];
  elements.emailDeliveryCard.hidden = !delivery && formerExternalized.length === 0;
  elements.emailDeliveryCard.className = 'delivery-card';
  elements.emailDeliveryRetry.hidden = true;
  elements.emailDeliveryRetry.removeAttribute('data-delivery-id');
  elements.emailDeliveryHistory.hidden = formerExternalized.length === 0;
  elements.emailDeliveryHistoryList.replaceChildren(...formerExternalized.map(item => {
    const recipient = item.recipient?.name || item.recipient?.email || 'A former assignee';
    const timing = item.acceptedAt ? ` on ${formatDate(item.acceptedAt)}` : '';
    const entry = node('li', 'delivery-history-item');
    entry.append(
      node('strong', '', recipient),
      node('span', '', ` received or may have received an assignment email${timing}.`),
    );
    return entry;
  }));
  if (!delivery) {
    elements.emailDeliveryCard.classList.add('unknown');
    setText(elements.emailDeliveryTitle, 'Assignment email history');
    setText(elements.emailDeliveryCopy, 'No current-recipient delivery is recorded for this conversation.');
    return;
  }
  elements.emailDeliveryCard.classList.add(delivery.status);
  const labels = {
    blocked: 'Delivery needs setup',
    pending: 'Assignment email queued',
    leased: 'Sending assignment email',
    accepted: 'Assignment email accepted',
    failed: 'Assignment email failed',
    unknown: 'Delivery outcome unknown',
    cancelled: 'Previous delivery cancelled'
  };
  const blockCopy = {
    mailbox_connection_unavailable: 'Connect the organization mailbox before LexFlow can email this assignment.',
    native_source_unavailable: 'This imported email has no provider conversation identity, so LexFlow kept the assignment without forwarding it.',
    send_permission_required: 'Reconnect the organization mailbox and approve send access. The assignment remains visible in LexFlow.',
    mailbox_connection_changed: 'The mailbox connection changed before this assignment email was sent.',
    stale_connection_generation: 'The mailbox was reconnected before this assignment email was sent.'
  };
  const copies = {
    pending: 'LexFlow will send one lightweight conversation digest without delaying the assignment.',
    leased: 'LexFlow is handing the digest to the connected mailbox provider.',
    accepted: `The mailbox provider accepted this assignment email${delivery.acceptedAt ? ` on ${formatDate(delivery.acceptedAt)}` : ''}.`,
    failed: delivery.error || 'The provider did not accept this assignment email. The LexFlow assignment is unchanged.',
    unknown: 'The provider may have accepted this email, but LexFlow did not receive a definitive response. Retrying can create a duplicate.',
    cancelled: 'This older recipient delivery was cancelled after the conversation was reassigned.',
    blocked: blockCopy[delivery.blockReason] || 'This assignment is visible in LexFlow, but its email digest cannot be sent yet.'
  };
  setText(elements.emailDeliveryTitle, labels[delivery.status] || 'Assignment email');
  setText(elements.emailDeliveryCopy, copies[delivery.status] || 'Delivery status is available to the workspace administrator.');
  const canRetry = state.session?.user.role === 'admin' && delivery.status === 'unknown';
  elements.emailDeliveryRetry.hidden = !canRetry;
  if (canRetry) elements.emailDeliveryRetry.dataset.deliveryId = String(delivery.id);
}

function openEmail(emailId, opener = document.activeElement) {
  const email = (state.session.emails ?? []).find(item => item.id === Number(emailId));
  if (!email) return;
  state.emailDialogOpener = opener instanceof HTMLElement ? opener : null;
  state.selectedEmailId = email.id;
  state.selectedConversationKey = emailThreadKey(email);
  setText(elements.emailDialogTitle, email.subject, '(No subject)');
  setText(elements.emailDialogStatus, email.status === 'completed' ? 'Completed email' : email.status === 'unassigned' ? 'Unassigned email' : 'Assigned email');
  const sender = [email.sender?.name, email.sender?.address].filter(Boolean).join(' · ');
  setText(elements.emailDetailSender, sender, 'Unknown sender');
  setText(elements.emailDetailReceived, formatDate(email.receivedAt));
  setText(elements.emailDetailAssignee, email.assignee?.name, 'Unassigned');
  setText(elements.emailDetailDepartment, email.department, 'Not assigned');
  setText(elements.emailDetailPreview, email.preview, 'No preview available.');
  renderEmailDelivery(email);

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
    const reassigning = (state.session.emails ?? []).some(item => (
      emailThreadKey(item) === emailThreadKey(email) && item.status === 'assigned'
    ));
    setText(elements.emailAssignmentLabel, reassigning ? 'Reassign conversation to' : 'Assign conversation to');
    setButtonLabel(elements.assignButton, reassigning ? 'Reassign conversation' : 'Assign conversation');
    elements.assignButton.disabled = options.length === 0;
    if (!options.length) {
      setText(elements.assignmentError, 'Add a team member before assigning email.');
      elements.assignmentError.hidden = false;
    }
  } else {
    elements.emailAssigneeSelect.replaceChildren();
  }

  const sourceUrl = email.webUrl || email.outlookUrl;
  const deliveredSearchUrl = state.session.user.role === 'member' ? email.delivery?.searchUrl : null;
  const webUrl = safeWebUrl(sourceUrl || deliveredSearchUrl);
  const sourceName = sourceUrl
    ? providerLabel(emailProvider(email))
    : providerLabel(state.session.user.mailboxProvider);
  const openLabel = sourceUrl ? `Open in ${sourceName}` : `Find assignment in ${sourceName}`;
  elements.outlookLink.hidden = !webUrl;
  setText(elements.outlookLink, openLabel);
  elements.outlookLink.setAttribute('aria-label', `${openLabel}: ${email.subject || 'No subject'}`);
  if (webUrl) elements.outlookLink.href = webUrl;
  else elements.outlookLink.removeAttribute('href');
  elements.emailDialog.showModal();
  const cached = conversationCache.entryFor(email);
  if (cached) renderDrawerConversation(cached.value);
  else ensureConversation(email, { drawer: true });
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

elements.registerOpen.addEventListener('click', openRegistration);

elements.registerBackLogin.addEventListener('click', () => {
  clearInviteQuery();
  resetRegistration();
  showLogin();
});

elements.registerRole.addEventListener('click', event => {
  const button = event.target.closest('[data-register-role]');
  if (!button) return;
  setRegistrationRole(button.dataset.registerRole);
});

elements.registerEntryForm.addEventListener('input', updateRegistrationProvider);
elements.registerEntryForm.addEventListener('change', updateRegistrationProvider);

elements.registerEntryForm.addEventListener('submit', event => {
  event.preventDefault();
  resetFormFeedback(elements.registerEntryForm, elements.registerEntryError);
  updateRegistrationProvider();
  if (!elements.registerEntryForm.reportValidity()) return;
  try {
    const email = normalizeRegistrationEmail(elements.registerEntryForm.elements.namedItem('email').value);
    const provider = automaticMailboxProvider(email)
      || elements.registerEntryForm.elements.namedItem('mailboxProvider').value;
    if (!['gmail', 'outlook'].includes(provider)) {
      throw formError('Choose the mailbox provider for this address.', {
        mailboxProvider: 'Choose Gmail or Outlook.'
      });
    }
    registrationState.email = email;
    registrationState.mailboxProvider = provider;
    if (registrationState.role === 'admin') {
      showRegistrationStep('organization');
    } else {
      populateJoinIdentity();
      showRegistrationStep('join');
    }
  } catch (error) {
    showFormError(elements.registerEntryForm, elements.registerEntryError, error);
  }
});

elements.organizationForm.elements.namedItem('organizationLogo').addEventListener('change', async event => {
  resetFormFeedback(elements.organizationForm, elements.organizationError);
  registrationState.logoDataUrl = null;
  elements.organizationLogoPreview.hidden = true;
  elements.organizationLogoFrame.classList.remove('has-image');
  if (!event.target.files[0]) return;
  try {
    registrationState.logoDataUrl = await readBoundedDataUrl(event.target.files[0], 2 * 1024 * 1024);
    elements.organizationLogoPreview.src = registrationState.logoDataUrl;
    elements.organizationLogoPreview.alt = 'Selected organization logo';
    elements.organizationLogoPreview.hidden = false;
    elements.organizationLogoFrame.classList.add('has-image');
  } catch (error) {
    showFormError(elements.organizationForm, elements.organizationError, error);
    event.target.value = '';
  }
});

elements.organizationForm.addEventListener('submit', async event => {
  event.preventDefault();
  resetFormFeedback(elements.organizationForm, elements.organizationError);
  if (!elements.organizationForm.reportValidity()) return;
  const submit = elements.organizationForm.querySelector('[type="submit"]');
  setButtonBusy(submit, true, 'Checking logo…');
  try {
    registrationState.logoDataUrl = registrationState.logoDataUrl
      || await readBoundedDataUrl(
        elements.organizationForm.elements.namedItem('organizationLogo').files[0],
        2 * 1024 * 1024
      );
    populateAdminAccount();
    showRegistrationStep('account');
  } catch (error) {
    showFormError(elements.organizationForm, elements.organizationError, error);
  } finally {
    setButtonBusy(submit, false, 'Checking logo…');
  }
});

document.querySelectorAll('[data-registration-back]').forEach(button => {
  button.addEventListener('click', () => showRegistrationStep(button.dataset.registrationBack));
});

elements.adminRegistrationForm.addEventListener('submit', async event => {
  event.preventDefault();
  resetFormFeedback(elements.adminRegistrationForm, elements.adminRegistrationError);
  if (!elements.adminRegistrationForm.reportValidity()) return;
  const submit = elements.adminRegistrationForm.querySelector('[type="submit"]');
  setButtonBusy(submit, true, 'Creating workspace…');
  try {
    await api('/api/registrations/admin', {
      method: 'POST',
      body: {
        organizationName: elements.organizationForm.elements.namedItem('organizationName').value.trim(),
        organizationDomain: elements.organizationForm.elements.namedItem('organizationDomain').value.trim(),
        logoDataUrl: registrationState.logoDataUrl,
        name: elements.adminRegistrationForm.elements.namedItem('name').value.trim(),
        email: registrationState.email,
        mailboxProvider: registrationState.mailboxProvider,
        password: elements.adminRegistrationForm.elements.namedItem('password').value
      }
    });
    await refresh({ quiet: true });
    showToast('Your organization workspace is ready.');
  } catch (error) {
    showFormError(elements.adminRegistrationForm, elements.adminRegistrationError, error);
  } finally {
    setButtonBusy(submit, false, 'Creating workspace…');
  }
});

elements.joinRequestForm.elements.namedItem('organizationKey').addEventListener('input', () => {
  registrationState.selectedOrganization = null;
  registrationState.selectedOrganizationKey = '';
  elements.organizationMatch.hidden = true;
  elements.joinRequestSubmit.disabled = true;
});

elements.organizationLookupButton.addEventListener('click', async () => {
  resetFormFeedback(elements.joinRequestForm, elements.joinRequestError);
  const keyControl = elements.joinRequestForm.elements.namedItem('organizationKey');
  const key = keyControl.value.trim();
  if (!key) {
    showFormError(elements.joinRequestForm, elements.joinRequestError, formError(
      'Enter an organization handle or join code.',
      { organizationKey: 'Enter the handle or join code shared by your administrator.' }
    ));
    return;
  }
  setButtonBusy(elements.organizationLookupButton, true, 'Finding…');
  try {
    const payload = await api(`/api/organizations/lookup?key=${encodeURIComponent(key)}`);
    registrationState.selectedOrganizationKey = key;
    showOrganizationMatch(payload.organization);
  } catch (error) {
    registrationState.selectedOrganization = null;
    registrationState.selectedOrganizationKey = '';
    elements.organizationMatch.hidden = true;
    elements.joinRequestSubmit.disabled = true;
    showFormError(elements.joinRequestForm, elements.joinRequestError, error);
  } finally {
    setButtonBusy(elements.organizationLookupButton, false, 'Finding…');
  }
});

elements.joinRequestForm.addEventListener('submit', async event => {
  event.preventDefault();
  resetFormFeedback(elements.joinRequestForm, elements.joinRequestError);
  if (!elements.joinRequestForm.reportValidity()) return;
  if (!registrationState.selectedOrganization || !registrationState.selectedOrganizationKey) {
    showFormError(elements.joinRequestForm, elements.joinRequestError, formError(
      'Find and confirm the organization before requesting access.',
      { organizationKey: 'Find this organization first.' }
    ));
    return;
  }
  const submit = elements.joinRequestSubmit;
  setButtonBusy(submit, true, 'Sending request…');
  try {
    await api('/api/join-requests', {
      method: 'POST',
      body: {
        organizationKey: registrationState.selectedOrganizationKey,
        email: registrationState.email,
        mailboxProvider: registrationState.mailboxProvider
      }
    });
    setText(
      elements.joinConfirmationCopy,
      `${registrationState.selectedOrganization.name} will review the request for ${registrationState.email}. Return using the one-time invite after approval.`
    );
    showRegistrationStep('confirmation');
  } catch (error) {
    showFormError(elements.joinRequestForm, elements.joinRequestError, error);
  } finally {
    setButtonBusy(submit, false, 'Sending request…');
  }
});

document.querySelectorAll('[data-registration-home]').forEach(button => {
  button.addEventListener('click', () => {
    resetRegistration();
    showLogin();
  });
});

document.querySelectorAll('[data-password-toggle]').forEach(control => {
  control.addEventListener('change', () => {
    const form = document.getElementById(control.dataset.passwordToggle);
    const password = form?.elements.namedItem('password');
    if (password) password.type = control.checked ? 'text' : 'password';
  });
});

elements.inviteForm.addEventListener('submit', async event => {
  event.preventDefault();
  resetFormFeedback(elements.inviteForm, elements.inviteError);
  if (!elements.inviteForm.reportValidity() || !registrationState.inviteToken) return;
  const submit = elements.inviteForm.querySelector('[type="submit"]');
  setButtonBusy(submit, true, 'Finishing registration…');
  try {
    await api(`/api/registration-invites/${encodeURIComponent(registrationState.inviteToken)}/complete`, {
      method: 'POST',
      body: {
        name: elements.inviteForm.elements.namedItem('name').value.trim(),
        password: elements.inviteForm.elements.namedItem('password').value
      }
    });
    clearInviteQuery();
    await refresh({ quiet: true });
    showToast('Registration complete. Welcome to LexFlow.');
  } catch (error) {
    showFormError(elements.inviteForm, elements.inviteError, error);
  } finally {
    setButtonBusy(submit, false, 'Finishing registration…');
  }
});

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
    state.selectedConversationKey = null;
    state.emailDialogOpener = null;
    state.settingsDirty = false;
    state.lastUnreadCount = null;
    conversationCache.clear();
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
  const retry = event.target.closest('[data-conversation-retry-email-id]');
  if (retry) {
    const email = (state.session?.emails ?? []).find(item => item.id === Number(retry.dataset.conversationRetryEmailId));
    ensureConversation(email, { force: true });
    return;
  }
  const toggle = event.target.closest('[data-thread-toggle]');
  if (toggle) {
    const expanded = toggle.getAttribute('aria-expanded') !== 'true';
    const threadKey = toggle.dataset.threadKey;
    const messages = document.getElementById(toggle.getAttribute('aria-controls'));
    if (expanded) state.expandedThreadKeys.add(threadKey);
    else state.expandedThreadKeys.delete(threadKey);
    toggle.setAttribute('aria-expanded', String(expanded));
    if (messages) messages.hidden = !expanded;
    if (expanded) {
      const thread = buildEmailThreads().find(item => item.key === threadKey);
      ensureConversation(thread?.latest);
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
  state.selectedEmailId = null;
  state.selectedConversationKey = null;
  state.emailDialogOpener = null;
  if (state.session && !elements.appView.hidden && (!opener || !opener.isConnected)) {
    elements.pageTitle.focus({ preventScroll: true });
  }
});

elements.conversationRetry.addEventListener('click', () => {
  const email = (state.session?.emails ?? []).find(item => item.id === state.selectedEmailId);
  ensureConversation(email, { force: true, drawer: true });
});

elements.emailDeliveryRetry.addEventListener('click', event => {
  if (state.session?.user.role !== 'admin') return;
  const deliveryId = Number(event.currentTarget.dataset.deliveryId);
  if (!Number.isSafeInteger(deliveryId) || deliveryId < 1) return;
  state.retryDeliveryId = deliveryId;
  state.deliveryRetryOpener = event.currentTarget;
  elements.deliveryRetryError.hidden = true;
  setText(elements.deliveryRetryError, '');
  elements.deliveryRetryDialog.showModal();
  elements.deliveryRetryConfirm.focus();
});

elements.deliveryRetryConfirm.addEventListener('click', async () => {
  const deliveryId = state.retryDeliveryId;
  if (!deliveryId) return;
  elements.deliveryRetryError.hidden = true;
  setButtonBusy(elements.deliveryRetryConfirm, true, 'Retrying…');
  try {
    await mutate(`/api/deliveries/${deliveryId}/retry`, 'POST', {
      duplicateRiskConfirmed: true
    });
    elements.deliveryRetryDialog.close();
    const email = (state.session?.emails ?? []).find(item => item.id === state.selectedEmailId);
    if (email) renderEmailDelivery(email);
    showToast('Assignment email queued for a confirmed retry.');
  } catch (error) {
    setText(elements.deliveryRetryError, error.message);
    elements.deliveryRetryError.hidden = false;
    elements.deliveryRetryError.tabIndex = -1;
    elements.deliveryRetryError.focus();
  } finally {
    setButtonBusy(elements.deliveryRetryConfirm, false, 'Retrying…');
  }
});

elements.deliveryRetryDialog.addEventListener('close', () => {
  const opener = state.deliveryRetryOpener;
  state.retryDeliveryId = null;
  state.deliveryRetryOpener = null;
  if (opener?.isConnected) opener.focus({ preventScroll: true });
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
  const provider = action.closest('[data-provider]')?.dataset.provider;
  if (!['gmail', 'outlook'].includes(provider)) return;
  const name = providerLabel(provider);
  if (!window.confirm(`Disconnect ${name} from this workspace? New ${name} messages will stop syncing.`)) return;

  setButtonBusy(action, true, 'Disconnecting…');
  setIntegrationFeedback('');
  try {
    await mutate(`/api/integrations/${provider}`, 'DELETE');
    setIntegrationFeedback(`${name} disconnected from this workspace.`);
    window.requestAnimationFrame(() => {
      elements.integrationList
        .querySelector(`[data-provider="${provider}"] [data-integration-action="authorize"]`)
        ?.focus();
    });
  } catch (error) {
    if (!state.session) return;
    setIntegrationFeedback(`${name} could not be disconnected: ${error.message}`, true);
    action.focus();
  } finally {
    if (action.isConnected) setButtonBusy(action, false, 'Disconnecting…');
  }
});

elements.membershipRequestList.addEventListener('click', async event => {
  const action = event.target.closest('[data-membership-action]');
  if (!action || state.session?.user.role !== 'admin') return;

  if (action.dataset.membershipAction === 'retry') {
    state.membershipRequestsLoaded = false;
    await loadMembershipRequests({ force: true });
    return;
  }

  const item = action.closest('[data-membership-request-id]');
  const requestId = Number(item?.dataset.membershipRequestId);
  if (!Number.isInteger(requestId)) return;

  if (action.dataset.membershipAction === 'copy') {
    const link = state.membershipInviteLinks.get(requestId);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      showToast('One-time invite link copied.');
    } catch {
      const input = item.querySelector('.membership-invite-input');
      input?.select();
      showToast('Copy the selected invite link.', true);
    }
    return;
  }

  if (action.dataset.membershipAction === 'replace-invite') {
    const request = state.membershipRequests.find(candidate => Number(candidate.id) === requestId);
    if (!window.confirm(`Create a new invite for ${request?.email || 'this user'}? The previous link will stop working.`)) return;
    setButtonBusy(action, true, 'Creating…');
    setText(elements.membershipRequestFeedback, '');
    elements.membershipRequestFeedback.classList.remove('error');
    try {
      const payload = await api(`/api/membership-requests/${requestId}/replace-invite`, { method: 'POST' });
      const index = state.membershipRequests.findIndex(candidate => Number(candidate.id) === requestId);
      if (index >= 0) state.membershipRequests.splice(index, 1, payload.request);
      state.membershipInviteLinks.set(requestId, payload.inviteLink);
      setText(elements.membershipRequestFeedback, 'New one-time invite created. The previous link no longer works.');
      renderMembershipRequests();
    } catch (error) {
      if (!state.session) return;
      setText(elements.membershipRequestFeedback, error.message);
      elements.membershipRequestFeedback.classList.add('error');
      elements.membershipRequestFeedback.setAttribute('role', 'alert');
      action.focus();
    } finally {
      if (action.isConnected) setButtonBusy(action, false, 'Creating…');
    }
    return;
  }

  const decision = action.dataset.membershipAction;
  if (!['approve', 'reject'].includes(decision)) return;
  const request = state.membershipRequests.find(candidate => Number(candidate.id) === requestId);
  if (decision === 'reject' && !window.confirm(`Reject the request from ${request?.email || 'this user'}?`)) return;

  const buttons = [...item.querySelectorAll('[data-membership-action]')];
  buttons.forEach(button => { button.disabled = true; });
  setButtonBusy(action, true, decision === 'approve' ? 'Approving…' : 'Rejecting…');
  setText(elements.membershipRequestFeedback, '');
  elements.membershipRequestFeedback.classList.remove('error');
  try {
    const payload = await api(`/api/membership-requests/${requestId}/${decision}`, { method: 'POST' });
    const updated = payload.request;
    const index = state.membershipRequests.findIndex(candidate => Number(candidate.id) === requestId);
    if (index >= 0) state.membershipRequests.splice(index, 1, updated);
    else state.membershipRequests.unshift(updated);
    if (decision === 'approve' && payload.inviteLink) {
      state.membershipInviteLinks.set(requestId, payload.inviteLink);
      setText(elements.membershipRequestFeedback, 'Approved. Copy the one-time invite link and share it securely.');
    } else {
      setText(elements.membershipRequestFeedback, decision === 'approve'
        ? 'Membership request approved.'
        : 'Membership request rejected.');
    }
    renderMembershipRequests();
  } catch (error) {
    if (!state.session) return;
    setText(elements.membershipRequestFeedback, error.message);
    elements.membershipRequestFeedback.classList.add('error');
    elements.membershipRequestFeedback.setAttribute('role', 'alert');
    buttons.forEach(button => { button.disabled = false; });
    action.focus();
  } finally {
    if (action.isConnected) setButtonBusy(action, false, decision === 'approve' ? 'Approving…' : 'Rejecting…');
  }
});

elements.organizationProfile.addEventListener('click', async event => {
  const action = event.target.closest('[data-organization-copy]');
  if (!action) return;
  const key = action.dataset.organizationCopy;
  const organization = state.session?.organization;
  const value = key === 'handle' ? organization?.handle : organization?.joinCode;
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    setText(elements.organizationCopyFeedback, key === 'handle'
      ? 'Organization handle copied.'
      : 'Join code copied.');
  } catch {
    const input = key === 'handle' ? elements.organizationHandle : elements.organizationJoinCode;
    input.select();
    setText(elements.organizationCopyFeedback, 'Copy the selected value.');
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
  const wasAssigned = (state.session.emails ?? []).some(item => (
    emailThreadKey(item) === emailThreadKey(email) && item.status === 'assigned'
  ));
  setButtonBusy(elements.assignButton, true, wasAssigned ? 'Reassigning…' : 'Assigning…');
  try {
    const result = await mutate(`/api/emails/${email.id}/assign`, 'POST', { assigneeId });
    elements.emailDialog.close();
    state.selectedEmailId = null;
    elements.pageTitle.focus({ preventScroll: true });
    showToast(result.changed
      ? `${wasAssigned ? 'Reassigned' : 'Assigned'} the conversation to ${selectedMember?.name || 'the selected team member'}.`
      : `The conversation is already assigned to ${selectedMember?.name || 'the selected team member'}.`);
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
    showToast('Conversation marked complete.');
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

const initialInviteToken = new URL(window.location.href).searchParams.get('invite');
refresh({ quiet: true }).catch(error => {
  if (state.session) {
    showToast(error.message, true);
  } else if (initialInviteToken) {
    inspectRegistrationInvite(initialInviteToken);
  }
});
