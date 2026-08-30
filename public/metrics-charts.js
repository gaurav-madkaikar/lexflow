import { formatMetricValue } from './metrics-model.js';

const PALETTE = ['#c94b31', '#2f5d7c', '#8a5700', '#23744a', '#6f5a8a', '#4e6862'];
const POINT_STYLES = ['circle', 'rect', 'triangle', 'rectRot', 'star', 'crossRot'];

function text(node, value = '') {
  node.textContent = String(value ?? '');
}

function labelFromKey(key) {
  return String(key)
    .replace(/([a-z])([A-Z])/gu, '$1 $2')
    .replace(/^./u, character => character.toUpperCase());
}

function cellValue(key, value) {
  if (value === null || value === undefined) return 'Not available';
  if (/rate|percentage/iu.test(key)) return formatMetricValue(value, 'percentage');
  if (/duration|resolution|handling|freshness|sla/iu.test(key) && typeof value === 'number') {
    return formatMetricValue(value, 'duration');
  }
  if (typeof value === 'number') return formatMetricValue(value);
  if (/At$/u.test(key) && !Number.isNaN(Date.parse(value))) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }
  return String(value).replaceAll('_', ' ');
}

function renderTable(container, rows = []) {
  container.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'metrics-table-empty';
    empty.textContent = 'No exact values are available for this period.';
    container.append(empty);
    return;
  }
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const table = document.createElement('table');
  const caption = document.createElement('caption');
  caption.className = 'visually-hidden';
  caption.textContent = 'Exact values represented by this chart';
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const column of columns) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = labelFromKey(column);
    headRow.append(cell);
  }
  head.append(headRow);
  const body = document.createElement('tbody');
  for (const row of rows) {
    const tableRow = document.createElement('tr');
    for (const column of columns) {
      const cell = document.createElement('td');
      cell.textContent = cellValue(column, row[column]);
      tableRow.append(cell);
    }
    body.append(tableRow);
  }
  table.append(caption, head, body);
  container.append(table);
}

function chartType(plot) {
  if (plot.kind === 'doughnut') return 'doughnut';
  if (plot.kind === 'line') return 'line';
  return 'bar';
}

function chartDatasets(plot) {
  return (plot.series ?? []).map((series, index) => {
    const color = PALETTE[index % PALETTE.length];
    const line = plot.kind === 'line';
    return {
      label: series.label,
      data: series.data,
      _format: series.format ?? 'number',
      backgroundColor: plot.kind === 'doughnut' ? PALETTE.slice(0, series.data.length) : line ? `${color}1f` : color,
      borderColor: plot.kind === 'doughnut' ? '#ffffff' : color,
      borderWidth: plot.kind === 'doughnut' ? 3 : line ? 2.5 : 1,
      borderDash: line && index % 2 ? [7, 5] : [],
      pointStyle: POINT_STYLES[index % POINT_STYLES.length],
      pointRadius: line ? 3.5 : 0,
      pointHoverRadius: line ? 6 : 0,
      tension: line ? 0.28 : 0,
      fill: false,
      borderRadius: line || plot.kind === 'doughnut' ? 0 : 7,
      borderSkipped: false,
    };
  });
}

function chartOptions(plot, onSelect) {
  const stacked = plot.kind === 'stackedBar';
  const horizontal = plot.kind === 'horizontalBar';
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    animation: reducedMotion ? false : { duration: 260 },
    interaction: { mode: 'nearest', intersect: true },
    onClick(event, elements) {
      const selected = elements?.[0];
      if (selected && onSelect) onSelect({ plot, index: selected.index, datasetIndex: selected.datasetIndex });
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label(context) {
            const format = context.dataset._format ?? 'number';
            const raw = plot.kind === 'doughnut' ? context.raw : context.parsed[horizontal ? 'x' : 'y'];
            return `${context.dataset.label}: ${formatMetricValue(raw, format)}`;
          },
        },
      },
    },
    scales: plot.kind === 'doughnut' ? undefined : {
      x: {
        stacked,
        beginAtZero: horizontal,
        grid: { display: horizontal, color: '#ecece8' },
        border: { display: false },
        ticks: { color: '#65655f', maxRotation: 0, autoSkip: true, maxTicksLimit: horizontal ? 6 : 8 },
      },
      y: {
        stacked,
        beginAtZero: !horizontal,
        grid: { display: !horizontal, color: '#ecece8' },
        border: { display: false },
        ticks: { color: '#65655f', precision: 0 },
      },
    },
    cutout: plot.kind === 'doughnut' ? '67%' : undefined,
  };
}

function renderLegend(container, chart) {
  container.replaceChildren();
  chart.data.datasets.forEach((dataset, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'metrics-legend-button';
    button.setAttribute('aria-pressed', 'true');
    const swatch = document.createElement('span');
    swatch.className = `metrics-legend-swatch style-${index % 4}`;
    swatch.style.setProperty('--legend-color', Array.isArray(dataset.backgroundColor)
      ? dataset.backgroundColor[index % dataset.backgroundColor.length]
      : dataset.borderColor);
    swatch.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = dataset.label;
    button.append(swatch, label);
    button.addEventListener('click', () => {
      const visible = chart.isDatasetVisible(index);
      chart.setDatasetVisibility(index, !visible);
      button.setAttribute('aria-pressed', String(!visible));
      button.classList.toggle('is-muted', visible);
      chart.update();
    });
    container.append(button);
  });
}

export function createMetricsCharts({ root, onSelect } = {}) {
  const instances = new Map();

  function destroy(index) {
    instances.get(index)?.destroy();
    instances.delete(index);
  }

  function renderSlot(plot, index) {
    const suffix = index + 1;
    const card = root.querySelector(`#metrics-chart-card-${suffix}`);
    destroy(index);
    if (!plot) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    text(root.querySelector(`#metrics-chart-title-${suffix}`), plot.title);
    text(root.querySelector(`#metrics-chart-summary-${suffix}`), plot.summary);
    renderTable(root.querySelector(`#metrics-data-table-${suffix}`), plot.table);
    const legend = root.querySelector(`#metrics-chart-legend-${suffix}`);
    const canvasWrap = card.querySelector('.metrics-canvas-wrap');
    const empty = card.querySelector('.metrics-chart-empty');
    const disclosure = card.querySelector('.metrics-data-disclosure');
    const hasData = plot.hasData !== false;
    empty.hidden = hasData;
    canvasWrap.hidden = !hasData;
    legend.hidden = !hasData;
    disclosure.hidden = !(plot.table?.length);
    if (!hasData) {
      legend.replaceChildren();
      return;
    }
    const canvas = root.querySelector(`#metrics-chart-${suffix}`);
    const ChartConstructor = window.Chart;
    if (typeof ChartConstructor !== 'function') {
      canvasWrap.hidden = true;
      legend.hidden = true;
      legend.replaceChildren();
      return;
    }
    canvasWrap.hidden = false;
    legend.hidden = false;
    const chart = new ChartConstructor(canvas, {
      type: chartType(plot),
      data: { labels: plot.labels ?? [], datasets: chartDatasets(plot) },
      options: chartOptions(plot, onSelect),
    });
    instances.set(index, chart);
    renderLegend(legend, chart);
  }

  return {
    render(plots = []) {
      root.querySelector('#metrics-chart-grid')?.classList.toggle('single-chart', plots.filter(Boolean).length < 2);
      renderSlot(plots[0], 0);
      renderSlot(plots[1], 1);
    },
    resize() {
      for (const chart of instances.values()) chart.resize();
    },
    destroy() {
      destroy(0);
      destroy(1);
    },
  };
}
