const PERIODS = {
  mtd: { label: 'Month to date', startDate: '2026-08-01', endDate: '2026-08-28', factor: 1 },
  qtd: { label: 'Quarter to date', startDate: '2026-07-01', endDate: '2026-08-28', factor: 2.08 },
  ytd: { label: 'Year to date', startDate: '2026-01-01', endDate: '2026-08-28', factor: 8.12 },
  '12m': { label: 'Trailing 12 months', startDate: '2025-08-29', endDate: '2026-08-28', factor: 12.34 },
};

const AS_OF = '2026-08-28T10:30:00.000Z';

function rounded(value, digits = 0) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function scaled(value, factor) {
  return rounded(value * factor);
}

function value(kind, amount, currency = null) {
  return { kind, amount: rounded(amount, kind === 'percent' ? 1 : 0), ...(currency ? { currency } : {}) };
}

function kpi({ id, label, kind, amount, trend, definition, sources, detailKey, currency }) {
  return {
    id,
    label,
    value: value(kind, amount, currency),
    trend,
    definition,
    sources,
    detailKey,
  };
}

function revenueTrend(factor, period) {
  const labels = period === 'mtd'
    ? ['Week 1', 'Week 2', 'Week 3', 'Week 4']
    : period === 'qtd'
      ? ['July', 'August']
      : period === 'ytd'
        ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']
        : ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  const weights = labels.map((_, index) => 0.82 + ((index * 7) % 5) * 0.07);
  const weightTotal = weights.reduce((sum, item) => sum + item, 0);
  const billedTotal = scaled(1_284_000, factor);
  return labels.map((label, index) => {
    const billed = rounded(billedTotal * weights[index] / weightTotal);
    const collectionRate = 0.87 + (index % 3) * 0.018;
    return { label, billed, collected: rounded(billed * collectionRate) };
  });
}

export function financeDashboard({ period = 'mtd', reportingCurrency = 'USD' } = {}) {
  const periodConfig = PERIODS[period];
  if (!periodConfig) {
    const error = new Error('Choose MTD, QTD, YTD, or 12M.');
    error.status = 400;
    error.code = 'INVALID_FINANCE_PERIOD';
    error.field = 'period';
    error.expose = true;
    throw error;
  }
  if (reportingCurrency !== 'USD') {
    const error = new Error('The prototype reporting currency is USD.');
    error.status = 400;
    error.code = 'INVALID_REPORTING_CURRENCY';
    error.field = 'reportingCurrency';
    error.expose = true;
    throw error;
  }

  const factor = periodConfig.factor;
  const trend = revenueTrend(factor, period);
  const billedRevenue = trend.reduce((sum, point) => sum + point.billed, 0);
  const collectedRevenue = trend.reduce((sum, point) => sum + point.collected, 0);
  const collectionRate = rounded(collectedRevenue / billedRevenue * 100, 1);
  const outstandingAr = scaled(864_000, Math.max(1, Math.sqrt(factor)));
  const overdueAr = rounded(outstandingAr * 0.31);
  const outstandingAp = scaled(612_000, Math.max(1, Math.sqrt(factor)));
  const overdueAp = rounded(outstandingAp * 0.14);
  const dueThirtyDays = rounded(outstandingAp * 0.57);
  const taxLiability = scaled(184_000, Math.max(1, Math.sqrt(factor)));
  const billingBacklog = scaled(238_000, Math.max(1, Math.sqrt(factor)));
  const disputes = scaled(74_000, Math.max(1, Math.sqrt(factor)));
  const fxImpact = scaled(-18_400, Math.max(1, Math.sqrt(factor)));
  const forecastNetCash = scaled(426_000, Math.max(1, Math.sqrt(factor)));
  const netWorkingCapital = outstandingAr - outstandingAp - taxLiability;

  const sources = [
    { id: 'ar', name: 'AR Revenue', lastUpdatedAt: '2026-08-28T10:18:00.000Z', status: 'current', records: 486 },
    { id: 'ap', name: 'AP', lastUpdatedAt: '2026-08-28T09:52:00.000Z', status: 'current', records: 219 },
    { id: 'tax', name: 'Tax', lastUpdatedAt: '2026-08-27T16:40:00.000Z', status: 'current', records: 42 },
    { id: 'invoicing', name: 'Invoicing', lastUpdatedAt: '2026-08-28T10:05:00.000Z', status: 'current', records: 378 },
  ];

  const kpis = [
    kpi({ id: 'billed-revenue', label: 'Billed revenue', kind: 'currency', amount: billedRevenue, currency: 'USD', trend: { value: 8.4, direction: 'up', label: 'vs prior period' }, definition: 'Invoices issued in the selected reporting period.', sources: ['invoicing'], detailKey: 'revenue' }),
    kpi({ id: 'collected-revenue', label: 'Collected revenue', kind: 'currency', amount: collectedRevenue, currency: 'USD', trend: { value: 6.8, direction: 'up', label: 'vs prior period' }, definition: 'Customer cash receipts applied during the selected period.', sources: ['ar'], detailKey: 'revenue' }),
    kpi({ id: 'collection-rate', label: 'Collection rate', kind: 'percent', amount: collectionRate, trend: { value: 1.9, direction: 'up', label: 'points improvement' }, definition: 'Collected revenue divided by billed revenue.', sources: ['ar', 'invoicing'], detailKey: 'revenue' }),
    kpi({ id: 'outstanding-ar', label: 'Outstanding AR', kind: 'currency', amount: outstandingAr, currency: 'USD', trend: { value: 3.2, direction: 'down', label: 'vs prior period' }, definition: 'Open customer receivables as of the reporting date.', sources: ['ar'], detailKey: 'ar' }),
    kpi({ id: 'overdue-ar', label: 'Overdue AR', kind: 'currency', amount: overdueAr, currency: 'USD', trend: { value: 4.6, direction: 'down', label: 'vs prior period' }, definition: 'Open receivables beyond their contractual due dates.', sources: ['ar'], detailKey: 'ar' }),
    kpi({ id: 'dso', label: 'DSO', kind: 'days', amount: 38, trend: { value: 3, direction: 'down', label: 'days improvement' }, definition: 'Average number of days required to collect billed revenue.', sources: ['ar', 'invoicing'], detailKey: 'ar' }),
    kpi({ id: 'outstanding-ap', label: 'Outstanding AP', kind: 'currency', amount: outstandingAp, currency: 'USD', trend: { value: 2.1, direction: 'up', label: 'vs prior period' }, definition: 'Approved vendor obligations not yet paid.', sources: ['ap'], detailKey: 'ap' }),
    kpi({ id: 'overdue-ap', label: 'Overdue AP', kind: 'currency', amount: overdueAp, currency: 'USD', trend: { value: 1.2, direction: 'down', label: 'vs prior period' }, definition: 'Vendor obligations beyond their payment dates.', sources: ['ap'], detailKey: 'ap' }),
    kpi({ id: 'due-30-days', label: 'Due within 30 days', kind: 'currency', amount: dueThirtyDays, currency: 'USD', trend: { value: 5.8, direction: 'up', label: 'cash requirement' }, definition: 'Approved payables falling due during the next 30 days.', sources: ['ap'], detailKey: 'ap' }),
    kpi({ id: 'dpo', label: 'DPO', kind: 'days', amount: 31, trend: { value: 2, direction: 'up', label: 'days vs prior period' }, definition: 'Average number of days taken to settle supplier obligations.', sources: ['ap'], detailKey: 'ap' }),
    kpi({ id: 'working-capital', label: 'Net working capital', kind: 'currency', amount: netWorkingCapital, currency: 'USD', trend: { value: 7.4, direction: netWorkingCapital >= 0 ? 'up' : 'down', label: 'vs prior period' }, definition: 'Outstanding receivables less payables and current tax obligations.', sources: ['ar', 'ap', 'tax'], detailKey: 'cash' }),
    kpi({ id: 'net-cash', label: 'Forecast net cash', kind: 'currency', amount: forecastNetCash, currency: 'USD', trend: { value: 9.1, direction: 'up', label: '13-week outlook' }, definition: 'Expected customer inflows less scheduled vendor and tax outflows.', sources: ['ar', 'ap', 'tax'], detailKey: 'cash' }),
    kpi({ id: 'tax-liability', label: 'Tax liability', kind: 'currency', amount: taxLiability, currency: 'USD', trend: { value: 2.6, direction: 'up', label: 'vs prior period' }, definition: 'Estimated indirect and corporate tax currently payable.', sources: ['tax'], detailKey: 'tax' }),
    kpi({ id: 'billing-backlog', label: 'Billing backlog', kind: 'currency', amount: billingBacklog, currency: 'USD', trend: { value: 12.5, direction: 'down', label: 'vs prior period' }, definition: 'Approved service value not yet converted into invoices.', sources: ['invoicing'], detailKey: 'invoicing' }),
    kpi({ id: 'invoice-accuracy', label: 'Invoice accuracy', kind: 'percent', amount: 98.6, trend: { value: 0.8, direction: 'up', label: 'points improvement' }, definition: 'Invoices issued without correction, rejection, or credit note.', sources: ['invoicing'], detailKey: 'invoicing' }),
    kpi({ id: 'disputes', label: 'Disputes & credit notes', kind: 'currency', amount: disputes, currency: 'USD', trend: { value: 6.7, direction: 'down', label: 'vs prior period' }, definition: 'Open commercial disputes and issued credit-note exposure.', sources: ['ar', 'invoicing'], detailKey: 'invoicing' }),
    kpi({ id: 'fx-impact', label: 'FX impact', kind: 'currency', amount: fxImpact, currency: 'USD', trend: { value: 1.5, direction: 'down', label: 'unfavourable variance' }, definition: 'Estimated translation variance on open foreign-currency exposure.', sources: ['ar', 'ap'], detailKey: 'fx' }),
  ];

  return {
    demo: true,
    asOf: AS_OF,
    reportingCurrency,
    period: { key: period, ...periodConfig },
    sources,
    kpis,
    revenueTrend: trend,
    arAging: [
      { bucket: 'Current', amount: rounded(outstandingAr * 0.46), share: 46 },
      { bucket: '1–30 days', amount: rounded(outstandingAr * 0.23), share: 23 },
      { bucket: '31–60 days', amount: rounded(outstandingAr * 0.15), share: 15 },
      { bucket: '61–90 days', amount: rounded(outstandingAr * 0.09), share: 9 },
      { bucket: '90+ days', amount: rounded(outstandingAr * 0.07), share: 7 },
    ],
    topCustomers: [
      { name: 'Northstar Retail', amount: rounded(overdueAr * 0.31), daysOverdue: 47, currency: 'USD' },
      { name: 'Helio Mobility', amount: rounded(overdueAr * 0.24), daysOverdue: 34, currency: 'EUR' },
      { name: 'Aster Labs', amount: rounded(overdueAr * 0.18), daysOverdue: 22, currency: 'INR' },
      { name: 'Nexa Foods', amount: rounded(overdueAr * 0.12), daysOverdue: 18, currency: 'GBP' },
    ],
    apSchedule: [
      { window: '0–7 days', amount: rounded(dueThirtyDays * 0.22) },
      { window: '8–14 days', amount: rounded(dueThirtyDays * 0.28) },
      { window: '15–30 days', amount: rounded(dueThirtyDays * 0.5) },
      { window: '31–60 days', amount: rounded(outstandingAp * 0.25) },
    ],
    topVendors: [
      { name: 'Cloudline Systems', amount: rounded(dueThirtyDays * 0.27), dueDate: '2026-09-04', currency: 'USD' },
      { name: 'Orbital Media', amount: rounded(dueThirtyDays * 0.21), dueDate: '2026-09-08', currency: 'GBP' },
      { name: 'Kite Consulting', amount: rounded(dueThirtyDays * 0.18), dueDate: '2026-09-12', currency: 'INR' },
      { name: 'Datacore Europe', amount: rounded(dueThirtyDays * 0.14), dueDate: '2026-09-18', currency: 'EUR' },
    ],
    cashForecast: Array.from({ length: 13 }, (_, index) => {
      const inflow = rounded((196_000 + index * 7_400 + (index % 3) * 28_000) * Math.max(1, Math.sqrt(factor)));
      const outflow = rounded((151_000 + index * 4_800 + ((index + 1) % 4) * 19_000) * Math.max(1, Math.sqrt(factor)));
      return { week: `W${index + 1}`, inflow, outflow, net: inflow - outflow };
    }),
    taxCompliance: [
      { obligation: 'GST return', jurisdiction: 'India', dueDate: '2026-09-20', amount: rounded(taxLiability * 0.36), status: 'ready' },
      { obligation: 'VAT return', jurisdiction: 'United Kingdom', dueDate: '2026-09-07', amount: rounded(taxLiability * 0.18), status: 'attention' },
      { obligation: 'Sales tax', jurisdiction: 'United States', dueDate: '2026-09-16', amount: rounded(taxLiability * 0.29), status: 'ready' },
      { obligation: 'VAT return', jurisdiction: 'European Union', dueDate: '2026-09-25', amount: rounded(taxLiability * 0.17), status: 'review' },
    ],
    invoiceStatus: [
      { status: 'Issued', count: scaled(284, factor), amount: billedRevenue },
      { status: 'Pending approval', count: scaled(21, Math.max(1, Math.sqrt(factor))), amount: billingBacklog },
      { status: 'Disputed', count: scaled(8, Math.max(1, Math.sqrt(factor))), amount: disputes },
      { status: 'Credit note', count: scaled(5, Math.max(1, Math.sqrt(factor))), amount: rounded(disputes * 0.36) },
    ],
    fxExposure: [
      { currency: 'USD', receivable: rounded(outstandingAr * 0.44), payable: rounded(outstandingAp * 0.48), impact: 0 },
      { currency: 'INR', receivable: rounded(outstandingAr * 0.27), payable: rounded(outstandingAp * 0.21), impact: -5_100 },
      { currency: 'EUR', receivable: rounded(outstandingAr * 0.18), payable: rounded(outstandingAp * 0.19), impact: -8_600 },
      { currency: 'GBP', receivable: rounded(outstandingAr * 0.11), payable: rounded(outstandingAp * 0.12), impact: -4_700 },
    ],
    exceptions: [
      { severity: 'high', title: 'Two customer balances exceed 45 days', owner: 'AR Revenue', amount: rounded(overdueAr * 0.38) },
      { severity: 'high', title: 'UK VAT package needs supporting evidence', owner: 'Tax', amount: rounded(taxLiability * 0.18) },
      { severity: 'medium', title: 'Cloud hosting renewal due next week', owner: 'AP', amount: rounded(dueThirtyDays * 0.27) },
      { severity: 'medium', title: 'Seven invoices are blocked for approval', owner: 'Invoicing', amount: rounded(billingBacklog * 0.32) },
    ],
  };
}

export const financePeriods = Object.keys(PERIODS);
