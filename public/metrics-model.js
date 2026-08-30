const PRESETS = new Set(['this-week', '30-days', '6-months', 'custom']);

export function metricsEndpointForRole(role) {
  return {
    platform_admin: '/api/metrics/platform',
    org_admin: '/api/metrics/organization',
    dep_admin: '/api/metrics/department',
    member: '/api/metrics/me',
  }[role] ?? null;
}

function dateValue(value) {
  return /^\d{4}-\d{2}-\d{2}$/u.test(value ?? '') ? value : '';
}

function identifier(value) {
  return ['unassigned', 'organization-wide'].includes(value) || /^\d+$/u.test(value ?? '') ? value : '';
}

export function metricsStateFromSearch(search = '') {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  const requestedPreset = params.get('metricsPreset') ?? '30-days';
  const performanceView = params.get('metricsView') === 'rules' ? 'rules' : 'employees';
  return {
    preset: PRESETS.has(requestedPreset) ? requestedPreset : '30-days',
    from: dateValue(params.get('metricsFrom')),
    to: dateValue(params.get('metricsTo')),
    departmentId: identifier(params.get('departmentId')),
    employeeId: /^\d+$/u.test(params.get('employeeId') ?? '') ? params.get('employeeId') : '',
    performanceView,
  };
}

export function metricsQueryString(state, timezone = '') {
  const params = new URLSearchParams({ preset: state.preset });
  if (state.preset === 'custom') {
    if (dateValue(state.from)) params.set('from', state.from);
    if (dateValue(state.to)) params.set('to', state.to);
  }
  if (identifier(state.departmentId)) params.set('departmentId', state.departmentId);
  if (/^\d+$/u.test(state.employeeId ?? '')) params.set('employeeId', state.employeeId);
  if (timezone) params.set('timezone', timezone);
  return params.toString();
}

export function formatMetricValue(value, format = 'number') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Not available';
  if (format === 'percentage') {
    return new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 0 }).format(Number(value));
  }
  if (format === 'duration') {
    const totalMinutes = Math.round(Number(value) / 60_000);
    const days = Math.floor(totalMinutes / 1_440);
    const hours = Math.floor((totalMinutes % 1_440) / 60);
    const minutes = totalMinutes % 60;
    return [days ? `${days}d` : '', hours ? `${hours}h` : '', minutes || (!days && !hours) ? `${minutes}m` : '']
      .filter(Boolean).join(' ');
  }
  return new Intl.NumberFormat().format(Number(value));
}

export function visibleMetricPlots(payload, performanceView = 'employees') {
  const plots = payload?.plots ?? [];
  const fixed = plots.filter(plot => plot.plotGroup !== 'performance');
  const performance = plots.find(plot => plot.plotGroup === 'performance' && plot.id === performanceView)
    ?? plots.find(plot => plot.plotGroup === 'performance');
  return [...fixed, ...(performance ? [performance] : [])].slice(0, 2);
}

export function metricsUrlParameters(state) {
  const params = new URLSearchParams();
  params.set('view', 'metrics');
  params.set('metricsPreset', state.preset);
  if (state.preset === 'custom') {
    if (dateValue(state.from)) params.set('metricsFrom', state.from);
    if (dateValue(state.to)) params.set('metricsTo', state.to);
  }
  if (identifier(state.departmentId)) params.set('departmentId', state.departmentId);
  if (/^\d+$/u.test(state.employeeId ?? '')) params.set('employeeId', state.employeeId);
  if (state.performanceView === 'rules') params.set('metricsView', 'rules');
  return params;
}
