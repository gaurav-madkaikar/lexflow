import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatMetricValue,
  metricsEndpointForRole,
  metricsQueryString,
  metricsStateFromSearch,
  visibleMetricPlots,
} from '../public/metrics-model.js';

test('metrics model maps every role to its narrow endpoint', () => {
  assert.equal(metricsEndpointForRole('platform_admin'), '/api/metrics/platform');
  assert.equal(metricsEndpointForRole('org_admin'), '/api/metrics/organization');
  assert.equal(metricsEndpointForRole('dep_admin'), '/api/metrics/department');
  assert.equal(metricsEndpointForRole('member'), '/api/metrics/me');
  assert.equal(metricsEndpointForRole('unknown'), null);
});

test('metrics URL state normalizes invalid values and serializes custom filters', () => {
  assert.deepEqual(metricsStateFromSearch('?metricsPreset=invalid&metricsView=invalid'), {
    preset: '30-days', from: '', to: '', departmentId: '', employeeId: '', performanceView: 'employees',
  });
  const state = metricsStateFromSearch(
    '?metricsPreset=custom&metricsFrom=2026-08-01&metricsTo=2026-08-30&departmentId=8&employeeId=4&metricsView=rules',
  );
  assert.equal(state.preset, 'custom');
  assert.equal(state.departmentId, '8');
  assert.equal(state.employeeId, '4');
  assert.equal(state.performanceView, 'rules');
  assert.match(metricsQueryString(state, 'Asia/Kolkata'), /preset=custom/);
  assert.match(metricsQueryString(state, 'Asia/Kolkata'), /timezone=Asia%2FKolkata/);
});

test('metric formatting and performance plot selection remain deterministic', () => {
  assert.equal(formatMetricValue(0.625, 'percentage'), '63%');
  assert.equal(formatMetricValue(90 * 60 * 1_000, 'duration'), '1h 30m');
  assert.equal(formatMetricValue(null, 'duration'), 'Not available');
  const payload = { plots: [
    { id: 'outcomes' }, { id: 'employees', plotGroup: 'performance' }, { id: 'rules', plotGroup: 'performance' },
  ] };
  assert.deepEqual(visibleMetricPlots(payload, 'employees').map(plot => plot.id), ['outcomes', 'employees']);
  assert.deepEqual(visibleMetricPlots(payload, 'rules').map(plot => plot.id), ['outcomes', 'rules']);
});
