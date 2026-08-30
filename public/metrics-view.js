import { createMetricsCharts } from './metrics-charts.js';
import { DEFAULT_TIMEZONE, formatZonedDate, localDateKey } from './date-time.js';
import {
  formatMetricValue,
  metricsEndpointForRole,
  metricsQueryString,
  metricsStateFromSearch,
  metricsUrlParameters,
  visibleMetricPlots,
} from './metrics-model.js';

function element(tag, className = '', value = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== '') node.textContent = String(value);
  return node;
}

function setText(node, value = '') {
  node.textContent = String(value ?? '');
}

function roleCopy(role, departmentName = '') {
  return {
    platform_admin: {
      kicker: 'Platform reporting',
      title: 'Tenant metrics',
      summary: 'Current tenant status and lifecycle changes across LexFlow.',
    },
    org_admin: {
      kicker: 'Organization reporting',
      title: 'People and Graph health',
      summary: 'Workforce lifecycle and Microsoft Graph operational health without confidential email data.',
    },
    dep_admin: {
      kicker: departmentName ? `${departmentName} reporting` : 'Department reporting',
      title: 'Workflow performance',
      summary: 'Assignment outcomes, employee workload, and automation-rule effectiveness for your department.',
    },
    member: {
      kicker: 'Personal reporting',
      title: 'My metrics',
      summary: 'Your assignments, completions, and handling-time trend.',
    },
  }[role] ?? { kicker: 'Reporting', title: 'Metrics', summary: 'Operational reporting.' };
}

function secondaryText(secondary, timezone) {
  if (!secondary) return '';
  if (secondary.label) return `${secondary.label}: ${formatMetricValue(secondary.value, secondary.format)}`;
  if (Number.isFinite(secondary.open) || Number.isFinite(secondary.overdue)) {
    return `${secondary.open ?? 0} within SLA · ${secondary.overdue ?? 0} overdue`;
  }
  if (secondary.lastSuccessAt) {
    return `Last success ${formatZonedDate(secondary.lastSuccessAt, { timezone })}`;
  }
  return '';
}

function renderCards(container, cards = [], timezone = DEFAULT_TIMEZONE) {
  container.style.setProperty('--metrics-kpi-count', String(Math.min(Math.max(cards.length, 1), 6)));
  container.replaceChildren(...cards.map((item, index) => {
    const card = element('article', `metrics-kpi tone-${index % 4}`);
    const label = element('p', 'metrics-kpi-label', item.label);
    const value = element('strong', 'metrics-kpi-value', formatMetricValue(item.value, item.format));
    const note = element('p', 'metrics-kpi-note', secondaryText(item.secondary, timezone) || 'Selected period');
    card.append(label, value, note);
    return card;
  }));
}

function readableHeading(key) {
  return String(key).replace(/([a-z])([A-Z])/gu, '$1 $2').replace(/^./u, letter => letter.toUpperCase());
}

function detailValue(key, value, timezone) {
  if (value === null || value === undefined || value === '') return 'Not available';
  if (/duration|freshness/iu.test(key) && typeof value === 'number') return formatMetricValue(value, 'duration');
  if (/At$|created/iu.test(key) && !Number.isNaN(Date.parse(value))) {
    return formatZonedDate(value, { timezone });
  }
  if (typeof value === 'number') return formatMetricValue(value);
  return String(value).replaceAll('_', ' ');
}

function detailTable(title, rows, timezone) {
  const section = element('section', 'metrics-detail-section');
  section.append(element('h4', '', title));
  if (!rows.length) {
    section.append(element('p', 'metrics-detail-empty', 'No details are available for this period.'));
    return section;
  }
  const wrapper = element('div', 'metrics-table-scroll');
  const table = element('table');
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const thead = element('thead');
  const header = element('tr');
  for (const column of columns) {
    const cell = element('th', '', readableHeading(column));
    cell.scope = 'col';
    header.append(cell);
  }
  thead.append(header);
  const tbody = element('tbody');
  for (const row of rows) {
    const tableRow = element('tr');
    for (const column of columns) tableRow.append(element('td', '', detailValue(column, row[column], timezone)));
    tbody.append(tableRow);
  }
  table.append(thead, tbody);
  wrapper.append(table);
  section.append(wrapper);
  return section;
}

function renderDetails(panel, content, title, payload, timezone) {
  const sections = [];
  if (payload.scope === 'platform') {
    sections.push(detailTable('Tenant directory', payload.details?.tenants ?? [], timezone));
    if (payload.details?.lifecycle?.length) sections.push(detailTable('Lifecycle changes', payload.details.lifecycle, timezone));
  } else if (payload.scope === 'organization') {
    sections.push(detailTable('Department mailbox health', payload.details?.graphMailboxes ?? [], timezone));
    if (payload.details?.lifecycle?.length) sections.push(detailTable('People lifecycle details', payload.details.lifecycle, timezone));
  }
  panel.hidden = sections.length === 0;
  if (!sections.length) {
    content.replaceChildren();
    return;
  }
  setText(title, payload.scope === 'platform' ? 'Tenant details' : 'Operational details');
  content.replaceChildren(...sections);
}

function timezoneFor(context) {
  if (context?.user?.role === 'platform_admin') return DEFAULT_TIMEZONE;
  return context?.organization?.timezone || DEFAULT_TIMEZONE;
}

function currentRangeIncludesToday(state, timezone) {
  if (state.preset !== 'custom') return true;
  return !state.to || state.to >= localDateKey(new Date(), timezone);
}

export function createMetricsView({ root, request, notify = () => {}, isActive = () => false } = {}) {
  const controls = root.querySelector('#metrics-filter-form');
  const stateRegion = root.querySelector('#metrics-state');
  const completeness = root.querySelector('#metrics-completeness');
  const kpis = root.querySelector('#metrics-kpis');
  const departmentField = root.querySelector('#metrics-department-field');
  const departmentSelect = root.querySelector('#metrics-department');
  const employeeField = root.querySelector('#metrics-employee-field');
  const employeeSelect = root.querySelector('#metrics-employee');
  const customRange = root.querySelector('#metrics-custom-range');
  const fromInput = root.querySelector('#metrics-from');
  const toInput = root.querySelector('#metrics-to');
  const refreshButton = root.querySelector('#metrics-refresh');
  const detailPanel = root.querySelector('#metrics-detail-panel');
  const detailTitle = root.querySelector('#metrics-detail-title');
  const detailContent = root.querySelector('#metrics-detail-content');
  let state = metricsStateFromSearch(window.location.search);
  let context = null;
  let payload = null;
  let requestSequence = 0;
  let requestController = null;
  let lastLoadedAt = 0;
  let loading = false;

  const charts = createMetricsCharts({
    root,
    onSelect({ plot, index, datasetIndex }) {
      const label = plot.labels?.[index] ?? 'Selected value';
      const series = plot.series?.[datasetIndex];
      const value = series?.data?.[index];
      setText(stateRegion, `${series?.label ?? plot.title}, ${label}: ${formatMetricValue(value, series?.format)}.`);
    },
  });

  function setUrl() {
    const url = new URL(window.location.href);
    for (const key of ['view', 'metricsPreset', 'metricsFrom', 'metricsTo', 'departmentId', 'employeeId', 'metricsView']) {
      url.searchParams.delete(key);
    }
    for (const [key, value] of metricsUrlParameters(state)) url.searchParams.set(key, value);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function sanitizeState() {
    const role = context?.user?.role;
    if (role !== 'org_admin') state.departmentId = '';
    if (role === 'org_admin' && state.departmentId
      && !['unassigned', 'organization-wide'].includes(state.departmentId)) {
      const valid = (context.departments ?? []).some(item => String(item.id) === state.departmentId);
      if (!valid) state.departmentId = '';
    }
    if (role !== 'dep_admin') state.employeeId = '';
    if (role === 'dep_admin' && state.employeeId) {
      const valid = (context.team ?? []).some(item => String(item.id) === state.employeeId);
      if (!valid) state.employeeId = '';
    }
  }

  function syncControls() {
    root.querySelectorAll('[data-metrics-preset]').forEach(button => {
      const active = button.dataset.metricsPreset === state.preset;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    customRange.hidden = state.preset !== 'custom';
    fromInput.required = state.preset === 'custom';
    toInput.required = state.preset === 'custom';
    fromInput.value = state.from;
    toInput.value = state.to;
    departmentField.hidden = context?.user?.role !== 'org_admin';
    employeeField.hidden = context?.user?.role !== 'dep_admin';
    root.querySelectorAll('[data-metrics-view]').forEach(button => {
      const active = button.dataset.metricsView === state.performanceView;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function renderFilterOptions() {
    const departments = payload?.filters?.departments ?? [];
    departmentSelect.replaceChildren(...departments.map(item => {
      const option = element('option', '', item.label);
      option.value = item.id == null ? '' : String(item.id);
      option.selected = option.value === state.departmentId;
      return option;
    }));
    const employees = payload?.filters?.employees ?? [];
    employeeSelect.replaceChildren(...employees.map(item => {
      const option = element('option', '', item.label);
      option.value = item.id == null ? '' : String(item.id);
      option.selected = option.value === state.employeeId;
      return option;
    }));
  }

  function renderCompleteness() {
    const entries = Object.entries(payload?.completeness ?? {});
    const incomplete = entries.filter(([, item]) => item.status !== 'complete');
    completeness.hidden = incomplete.length === 0;
    if (incomplete.length) {
      const unavailable = incomplete.some(([, item]) => item.status === 'unavailable');
      const exactBoundaries = incomplete
        .map(([, item]) => item.exactFrom)
        .filter(value => value && !Number.isNaN(Date.parse(value)))
        .sort();
      const completeFrom = exactBoundaries.at(-1);
      const boundaryLabel = completeFrom
        ? new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeZone: payload.period.timezone,
        }).format(new Date(completeFrom))
        : '';
      completeness.className = `metrics-completeness ${unavailable ? 'unavailable' : 'partial'}`;
      completeness.textContent = unavailable
        ? 'Some historical metrics are unavailable. Values are shown only where LexFlow has reliable evidence.'
        : `Partial history: gaps without reliable evidence are unavailable.${boundaryLabel ? ` Exact coverage begins ${boundaryLabel}.` : ''}`;
    }
  }

  function updatePerformanceTabs(plots) {
    for (let index = 0; index < 2; index += 1) {
      const tabs = root.querySelector(index === 0 ? '#metrics-performance-tabs' : '#metrics-performance-tabs-2');
      tabs.hidden = plots[index]?.plotGroup !== 'performance';
    }
  }

  function renderPayload() {
    if (!payload) return;
    renderCards(kpis, payload.cards, payload.period.timezone);
    renderFilterOptions();
    renderCompleteness();
    const plots = visibleMetricPlots(payload, state.performanceView);
    charts.render(plots, payload.period.timezone);
    updatePerformanceTabs(plots);
    renderDetails(detailPanel, detailContent, detailTitle, payload, payload.period.timezone);
    const period = payload.period;
    setText(stateRegion, `Updated now · grouped by ${period.bucket} · ${period.timezone}.`);
    root.classList.remove('is-loading', 'is-stale');
  }

  function renderFailure(error) {
    root.classList.remove('is-loading');
    if (payload) {
      root.classList.add('is-stale');
      setText(stateRegion, 'Showing the previous result because the latest refresh failed.');
      return;
    }
    kpis.replaceChildren();
    charts.render([]);
    detailPanel.hidden = true;
    const message = element('div', 'metrics-error-state');
    message.append(element('strong', '', 'Metrics could not be loaded'), element('p', '', error?.message || 'Try again in a moment.'));
    const retry = element('button', 'button', 'Retry');
    retry.type = 'button';
    retry.addEventListener('click', () => load({ force: true }));
    message.append(retry);
    stateRegion.replaceChildren(message);
  }

  async function load({ force = false } = {}) {
    if (!context || loading && !force) return;
    const endpoint = metricsEndpointForRole(context.user.role);
    if (!endpoint) return;
    requestController?.abort();
    const controller = new AbortController();
    requestController = controller;
    sanitizeState();
    syncControls();
    setUrl();
    const sequence = ++requestSequence;
    loading = true;
    root.classList.add('is-loading');
    refreshButton.disabled = true;
    setText(stateRegion, payload ? 'Refreshing metrics…' : 'Loading metrics…');
    try {
      const query = metricsQueryString(state, timezoneFor(context));
      const next = await request(`${endpoint}?${query}`, { signal: controller.signal });
      if (sequence !== requestSequence) return;
      payload = next;
      lastLoadedAt = Date.now();
      renderPayload();
    } catch (error) {
      if (sequence !== requestSequence) return;
      if (error?.name === 'AbortError') return;
      renderFailure(error);
      notify(error, 'Metrics could not be loaded. Please try again.');
    } finally {
      if (sequence === requestSequence) {
        if (requestController === controller) requestController = null;
        loading = false;
        refreshButton.disabled = false;
      }
    }
  }

  function setCustomDefaults() {
    if (state.from && state.to) return;
    state.to = localDateKey(new Date(), timezoneFor(context));
    const start = new Date(`${state.to}T12:00:00.000Z`);
    start.setUTCDate(start.getUTCDate() - 29);
    state.from = start.toISOString().slice(0, 10);
  }

  root.querySelectorAll('[data-metrics-preset]').forEach(button => {
    button.addEventListener('click', () => {
      state.preset = button.dataset.metricsPreset;
      if (state.preset === 'custom') setCustomDefaults();
      syncControls();
      void load({ force: true });
    });
  });
  root.querySelectorAll('[data-metrics-view]').forEach(button => {
    button.addEventListener('click', () => {
      state.performanceView = button.dataset.metricsView;
      syncControls();
      setUrl();
      if (payload) renderPayload();
    });
  });
  controls.addEventListener('submit', event => {
    event.preventDefault();
    if (!controls.reportValidity()) return;
    state.from = fromInput.value;
    state.to = toInput.value;
    void load({ force: true });
  });
  departmentSelect.addEventListener('change', () => {
    state.departmentId = departmentSelect.value;
    void load({ force: true });
  });
  employeeSelect.addEventListener('change', () => {
    state.employeeId = employeeSelect.value;
    void load({ force: true });
  });
  refreshButton.addEventListener('click', () => load({ force: true }));

  return {
    activate(nextContext, { poll = false } = {}) {
      const contextChanged = context?.user?.id !== nextContext?.user?.id
        || context?.user?.role !== nextContext?.user?.role
        || context?.organization?.id !== nextContext?.organization?.id;
      context = nextContext;
      sanitizeState();
      const copy = roleCopy(context.user.role, context.department?.name);
      setText(root.querySelector('#metrics-page-kicker'), copy.kicker);
      setText(root.querySelector('#metrics-page-title'), copy.title);
      setText(root.querySelector('#metrics-page-summary'), copy.summary);
      setText(root.querySelector('#metrics-timezone'), `${timezoneFor(context)} timezone`);
      syncControls();
      if (contextChanged) {
        payload = null;
        charts.render([]);
      }
      const dueForPoll = Boolean(payload) && poll
        && currentRangeIncludesToday(state, timezoneFor(context))
        && Date.now() - lastLoadedAt >= 19_000;
      if (!payload || contextChanged || dueForPoll) void load({ force: dueForPoll });
      else renderPayload();
    },
    deactivate() {
      requestSequence += 1;
      requestController?.abort();
      requestController = null;
      loading = false;
      root.classList.remove('is-loading');
    },
    restoreFromUrl() {
      state = metricsStateFromSearch(window.location.search);
      sanitizeState();
      syncControls();
      if (isActive()) void load({ force: true });
    },
    destroy() {
      requestSequence += 1;
      requestController?.abort();
      requestController = null;
      charts.destroy();
    },
  };
}
