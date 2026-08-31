import assert from 'node:assert/strict';
import test from 'node:test';

import { chartTheme } from '../public/metrics-charts.js';

test('chart presentation colors remain readable in light and dark themes', () => {
  assert.deepEqual(chartTheme('light'), {
    grid: '#ecece8', ticks: '#65655f', doughnutBorder: '#ffffff',
  });
  assert.deepEqual(chartTheme('dark'), {
    grid: '#29313c', ticks: '#b3bbc6', doughnutBorder: '#11161d',
  });
});
