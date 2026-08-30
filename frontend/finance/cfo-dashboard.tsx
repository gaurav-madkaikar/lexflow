import { useEffect, useMemo, useRef, useState } from 'react';
import { animate, stagger } from 'animejs';
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  Globe2,
  Landmark,
  LayoutDashboard,
  LogOut,
  Moon,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';

import { Area, AreaChart } from '@/components/charts/area-chart';
import { Grid } from '@/components/charts/grid';
import { ChartTooltip } from '@/components/charts/tooltip';
import { XAxis } from '@/components/charts/x-axis';

import type {
  CfoUser,
  FinanceDashboardData,
  FinanceKpi,
  FinancePeriodKey,
} from './types';

type FinanceModule = 'overview' | 'ar' | 'ap' | 'tax' | 'invoicing' | 'fx';

const MODULES: Array<{ key: FinanceModule; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'ar', label: 'Accounts receivable', icon: Landmark },
  { key: 'ap', label: 'Accounts payable', icon: ReceiptText },
  { key: 'tax', label: 'Tax', icon: ShieldCheck },
  { key: 'invoicing', label: 'Invoicing', icon: FileText },
  { key: 'fx', label: 'FX exposure', icon: Globe2 },
];

const PERIODS: Array<{ key: FinancePeriodKey; label: string }> = [
  { key: 'mtd', label: 'MTD' },
  { key: 'qtd', label: 'QTD' },
  { key: 'ytd', label: 'YTD' },
  { key: '12m', label: '12M' },
];

const PRIORITY_KPI_IDS = ['net-cash', 'collection-rate', 'overdue-ar', 'due-30-days', 'tax-liability'];

const KPI_GROUPS: Array<{ label: string; description: string; ids: string[] }> = [
  {
    label: 'Revenue performance',
    description: 'Billing, cash conversion, and invoice quality',
    ids: ['billed-revenue', 'collected-revenue', 'collection-rate', 'billing-backlog', 'invoice-accuracy'],
  },
  {
    label: 'Working capital',
    description: 'Customer and supplier balances, timing, and pressure',
    ids: ['outstanding-ar', 'overdue-ar', 'dso', 'outstanding-ap', 'overdue-ap', 'due-30-days', 'dpo'],
  },
  {
    label: 'Outlook & risk',
    description: 'Liquidity, obligations, disputes, and currency impact',
    ids: ['working-capital', 'net-cash', 'tax-liability', 'disputes', 'fx-impact'],
  },
];

function money(amount: number, currency = 'USD', compact = true) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  }).format(amount);
}

function metricValue(kpi: FinanceKpi) {
  if (kpi.value.kind === 'currency') return money(kpi.value.amount, kpi.value.currency);
  if (kpi.value.kind === 'percent') return `${kpi.value.amount.toFixed(1)}%`;
  if (kpi.value.kind === 'days') return `${kpi.value.amount} days`;
  return new Intl.NumberFormat('en-US').format(kpi.value.amount);
}

function freshness(iso: string) {
  const minutes = Math.max(1, Math.round((new Date('2026-08-28T10:30:00.000Z').getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

function supportingRows(data: FinanceDashboardData, key: FinanceKpi['detailKey']) {
  switch (key) {
    case 'revenue':
      return {
        columns: ['Period', 'Billed', 'Collected'],
        rows: data.revenueTrend.map(row => [row.label, money(row.billed), money(row.collected)]),
      };
    case 'ar':
      return {
        columns: ['Customer', 'Exposure', 'Overdue'],
        rows: data.topCustomers.map(row => [row.name, money(row.amount), `${row.daysOverdue} days`]),
      };
    case 'ap':
      return {
        columns: ['Vendor', 'Obligation', 'Due'],
        rows: data.topVendors.map(row => [row.name, money(row.amount), new Date(row.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })]),
      };
    case 'cash':
      return {
        columns: ['Week', 'Inflow', 'Outflow'],
        rows: data.cashForecast.slice(0, 6).map(row => [row.week, money(row.inflow), money(row.outflow)]),
      };
    case 'tax':
      return {
        columns: ['Obligation', 'Jurisdiction', 'Amount'],
        rows: data.taxCompliance.map(row => [row.obligation, row.jurisdiction, money(row.amount)]),
      };
    case 'invoicing':
      return {
        columns: ['Status', 'Items', 'Amount'],
        rows: data.invoiceStatus.map(row => [row.status, String(row.count), money(row.amount)]),
      };
    case 'fx':
      return {
        columns: ['Currency', 'Receivable', 'Payable'],
        rows: data.fxExposure.map(row => [row.currency, money(row.receivable), money(row.payable)]),
      };
  }
}

function MiniTrend({ points, tone = 'light' }: { points: number[]; tone?: 'light' | 'dark' }) {
  const max = Math.max(...points, 1);
  const coordinates = points.map((point, index) => `${index * (100 / Math.max(points.length - 1, 1))},${38 - point / max * 32}`).join(' ');
  return (
    <svg viewBox="0 0 100 42" preserveAspectRatio="none" className="h-16 w-full" aria-hidden="true">
      <polyline points={coordinates} fill="none" stroke={tone === 'dark' ? 'rgba(255,255,255,.82)' : 'rgba(18,18,16,.72)'} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      {points.map((point, index) => (
        <circle key={index} cx={index * (100 / Math.max(points.length - 1, 1))} cy={38 - point / max * 32} r="1.1" fill={index === points.length - 1 ? '#64d2ff' : tone === 'dark' ? '#fff' : '#1d1d1f'} />
      ))}
    </svg>
  );
}

function DecisionAreaChart({
  data,
  primaryKey,
  primaryLabel,
  secondaryKey,
  secondaryLabel,
  signature,
}: {
  data: Array<Record<string, unknown>>;
  primaryKey: string;
  primaryLabel: string;
  secondaryKey?: string;
  secondaryLabel?: string;
  signature: string;
}) {
  return (
    <div className="cfo-decision-chart">
      <AreaChart
        animationDuration={760}
        aspectRatio="2.35 / 1"
        data={data}
        margin={{ top: 18, right: 18, bottom: 40, left: 18 }}
        revealSignature={signature}
      >
        <Grid fadeHorizontal hideHorizontalEdgeLines stroke="var(--chart-grid)" />
        <Area dataKey={primaryKey} fadeEdges fill="#0071e3" fillOpacity={0.18} stroke="#0071e3" strokeWidth={2.25} />
        {secondaryKey && <Area dataKey={secondaryKey} fadeEdges fill="#64d2ff" fillOpacity={0.1} stroke="#64d2ff" strokeWidth={2} />}
        <XAxis numTicks={Math.min(6, data.length)} />
        <ChartTooltip
          rows={point => [
            { color: '#0071e3', label: primaryLabel, value: money(Number(point[primaryKey] ?? 0)) },
            ...(secondaryKey && secondaryLabel
              ? [{ color: '#64d2ff', label: secondaryLabel, value: money(Number(point[secondaryKey] ?? 0)) }]
              : []),
          ]}
        />
      </AreaChart>
      <div className="cfo-module-legend">
        <span><i />{primaryLabel}</span>
        {secondaryKey && secondaryLabel && <span><i />{secondaryLabel}</span>}
      </div>
    </div>
  );
}

function KpiCard({ kpi, index, onOpen, compact = false }: { kpi: FinanceKpi; index: number; onOpen: () => void; compact?: boolean }) {
  const variants = ['coral', 'paper', 'soft', 'paper', 'ink'];
  const variant = variants[index % variants.length];
  const improving = kpi.trend.direction === (kpi.id.includes('overdue') || kpi.id === 'dso' || kpi.id === 'billing-backlog' || kpi.id === 'disputes' ? 'down' : 'up');
  return (
    <button className={`cfo-kpi cfo-kpi-${variant}${compact ? ' cfo-kpi-compact' : ''}`} type="button" onClick={onOpen} aria-label={`Open details for ${kpi.label}`}>
      <span className="cfo-kpi-label">{kpi.label}</span>
      <strong>{metricValue(kpi)}</strong>
      <span className={`cfo-kpi-trend ${improving ? 'is-positive' : ''}`}>
        {kpi.trend.direction === 'up' ? <ArrowUpRight /> : <ArrowDownRight />}
        {kpi.trend.value}% {kpi.trend.label}
      </span>
    </button>
  );
}

function DetailDrawer({ data, kpi, onClose }: { data: FinanceDashboardData; kpi: FinanceKpi; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const table = supportingRows(data, kpi.detailKey);
  const sourceNames = kpi.sources.map(sourceId => data.sources.find(source => source.id === sourceId)?.name).filter(Boolean);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="cfo-drawer-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <aside className="cfo-drawer" role="dialog" aria-modal="true" aria-labelledby="cfo-detail-title">
        <div className="cfo-drawer-head">
          <div>
            <p>Decision detail</p>
            <h2 id="cfo-detail-title">{kpi.label}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close metric details"><X /></button>
        </div>
        <div className="cfo-drawer-value">
          <strong>{metricValue(kpi)}</strong>
          <span>{kpi.trend.value}% {kpi.trend.label}</span>
        </div>
        <section>
          <h3>How this is calculated</h3>
          <p>{kpi.definition}</p>
        </section>
        <section>
          <h3>Contributing teams</h3>
          <div className="cfo-source-list">
            {sourceNames.map(name => <span key={name}>{name}</span>)}
          </div>
        </section>
        <section>
          <h3>Supporting detail</h3>
          <div className="cfo-table-wrap">
            <table>
              <thead><tr>{table.columns.map(column => <th key={column}>{column}</th>)}</tr></thead>
              <tbody>{table.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </section>
      </aside>
    </div>
  );
}

function ModuleTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="cfo-module-table-wrap">
      <table>
        <thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function ModuleKpis({ data, module, onOpen }: { data: FinanceDashboardData; module: FinanceModule; onOpen: (kpi: FinanceKpi) => void }) {
  const keys = module === 'ar' ? ['ar', 'revenue'] : [module];
  const items = data.kpis.filter(kpi => keys.includes(kpi.detailKey)).slice(0, 6);
  return <div className="cfo-module-kpis">{items.map((kpi, index) => <KpiCard key={kpi.id} kpi={kpi} index={index} onOpen={() => onOpen(kpi)} />)}</div>;
}

function DeepDiveModule({ module, data, onOpen }: { module: Exclude<FinanceModule, 'overview'>; data: FinanceDashboardData; onOpen: (kpi: FinanceKpi) => void }) {
  const copy = {
    ar: ['Accounts receivable', 'Collection health and customer risk', 'See aging concentration, collection momentum, and the balances most likely to affect cash.'],
    ap: ['Accounts payable', 'Supplier obligations and timing', 'Balance payment discipline with upcoming cash requirements and critical vendor exposure.'],
    tax: ['Tax', 'Compliance readiness by jurisdiction', 'Track liabilities, due dates, and the filing packages that need management attention.'],
    invoicing: ['Invoicing', 'Billing quality and release velocity', 'Monitor invoice accuracy, approval backlog, disputes, and value waiting to be billed.'],
    fx: ['FX exposure', 'Currency position in USD', 'Understand net receivable and payable exposure and its translation impact by currency.'],
  }[module];

  return (
    <div className={`cfo-deep-dive cfo-deep-dive-${module}`}>
      <header className="cfo-module-hero">
        <div><p>{copy[0]}</p><h2>{copy[1]}</h2><span>{copy[2]}</span></div>
        <div className="cfo-module-orbit" aria-hidden="true"><i /><i /><b /></div>
      </header>

      <ModuleKpis data={data} module={module} onOpen={onOpen} />

      {module === 'ar' && (
        <div className="cfo-module-grid">
          <section className="cfo-module-card cfo-module-card-accent">
            <div className="cfo-module-card-head"><div><p>Age profile</p><h3>Receivables aging</h3></div><span>{money(data.arAging.reduce((sum, row) => sum + row.amount, 0))}</span></div>
            <div className="cfo-aging-detail">{data.arAging.map(row => <div key={row.bucket}><span>{row.bucket}</span><i><b style={{ width: `${row.share}%` }} /></i><strong>{row.share}%</strong></div>)}</div>
          </section>
          <section className="cfo-module-card">
            <div className="cfo-module-card-head"><div><p>Collection movement</p><h3>Billed vs collected</h3></div></div>
            <DecisionAreaChart
              data={data.revenueTrend.map((row, index) => ({
                date: new Date(2026, index, 1),
                billed: row.billed,
                collected: row.collected,
              }))}
              primaryKey="billed"
              primaryLabel="Billed"
              secondaryKey="collected"
              secondaryLabel="Collected"
              signature={`ar-${data.period.key}`}
            />
          </section>
          <section className="cfo-module-card cfo-module-card-wide">
            <div className="cfo-module-card-head"><div><p>Customer risk</p><h3>Top overdue customers</h3></div><span>{data.topCustomers.length} priorities</span></div>
            <ModuleTable columns={['Customer', 'Exposure', 'Currency', 'Days overdue']} rows={data.topCustomers.map(row => [row.name, money(row.amount), row.currency, String(row.daysOverdue)])} />
          </section>
        </div>
      )}

      {module === 'ap' && (
        <div className="cfo-module-grid">
          <section className="cfo-module-card cfo-module-card-accent">
            <div className="cfo-module-card-head"><div><p>Payment horizon</p><h3>Obligation schedule</h3></div></div>
            <div className="cfo-schedule-detail">{data.apSchedule.map(row => <div key={row.window}><span>{row.window}</span><i style={{ height: `${Math.max(18, row.amount / Math.max(...data.apSchedule.map(item => item.amount)) * 100)}%` }} /><strong>{money(row.amount)}</strong></div>)}</div>
          </section>
          <section className="cfo-module-card">
            <div className="cfo-module-card-head"><div><p>Payment strategy</p><h3>Working-capital posture</h3></div></div>
            <div className="cfo-module-big-number">{metricValue(data.kpis.find(kpi => kpi.id === 'dpo')!)}<small>Days payable outstanding</small></div>
            <p className="cfo-module-note">Two additional days of payment leverage without increasing overdue supplier risk.</p>
          </section>
          <section className="cfo-module-card cfo-module-card-wide">
            <div className="cfo-module-card-head"><div><p>Vendor commitments</p><h3>Largest upcoming obligations</h3></div><span>Next 30 days</span></div>
            <ModuleTable columns={['Vendor', 'Amount', 'Currency', 'Due date']} rows={data.topVendors.map(row => [row.name, money(row.amount), row.currency, new Date(row.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })])} />
          </section>
        </div>
      )}

      {module === 'tax' && (
        <div className="cfo-module-grid">
          <section className="cfo-module-card cfo-module-card-accent">
            <div className="cfo-module-card-head"><div><p>Readiness</p><h3>Compliance position</h3></div><ShieldCheck /></div>
            <div className="cfo-readiness-ring"><strong>75%</strong><span>filings ready</span></div>
          </section>
          <section className="cfo-module-card">
            <div className="cfo-module-card-head"><div><p>Risk watch</p><h3>Open tax actions</h3></div></div>
            <div className="cfo-module-alerts">{data.exceptions.filter(item => item.owner === 'Tax').map(item => <div key={item.title}><i /><span>{item.title}</span><strong>{money(item.amount)}</strong></div>)}</div>
          </section>
          <section className="cfo-module-card cfo-module-card-wide">
            <div className="cfo-module-card-head"><div><p>Jurisdictions</p><h3>Upcoming obligations</h3></div><span>USD consolidated</span></div>
            <ModuleTable columns={['Obligation', 'Jurisdiction', 'Due date', 'Amount', 'Status']} rows={data.taxCompliance.map(row => [row.obligation, row.jurisdiction, new Date(row.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), money(row.amount), row.status])} />
          </section>
        </div>
      )}

      {module === 'invoicing' && (
        <div className="cfo-module-grid">
          <section className="cfo-module-card cfo-module-card-accent">
            <div className="cfo-module-card-head"><div><p>Quality signal</p><h3>First-time accuracy</h3></div></div>
            <div className="cfo-readiness-ring cfo-readiness-ring-dark"><strong>98.6%</strong><span>issued cleanly</span></div>
          </section>
          <section className="cfo-module-card">
            <div className="cfo-module-card-head"><div><p>Release pipeline</p><h3>Invoice status mix</h3></div></div>
            <div className="cfo-status-stack">{data.invoiceStatus.map(row => <div key={row.status}><span>{row.status}</span><i><b style={{ width: `${Math.max(8, row.count / Math.max(...data.invoiceStatus.map(item => item.count)) * 100)}%` }} /></i><strong>{row.count}</strong></div>)}</div>
          </section>
          <section className="cfo-module-card cfo-module-card-wide">
            <div className="cfo-module-card-head"><div><p>Billing operations</p><h3>Status and value</h3></div><span>{data.invoiceStatus.reduce((sum, row) => sum + row.count, 0)} items</span></div>
            <ModuleTable columns={['Status', 'Items', 'Value']} rows={data.invoiceStatus.map(row => [row.status, String(row.count), money(row.amount)])} />
          </section>
        </div>
      )}

      {module === 'fx' && (
        <div className="cfo-module-grid">
          <section className="cfo-module-card cfo-module-card-accent cfo-module-card-wide">
            <div className="cfo-module-card-head"><div><p>Net currency position</p><h3>Receivables less payables</h3></div><span>USD reporting base</span></div>
            <div className="cfo-fx-detail">{data.fxExposure.map(row => {
              const net = row.receivable - row.payable;
              return <div key={row.currency}><strong>{row.currency}</strong><i><b style={{ width: `${Math.min(100, Math.abs(net) / 120_000 * 100)}%` }} /></i><span>{money(net)}</span><small>{row.impact ? `${money(row.impact)} impact` : 'Base currency'}</small></div>;
            })}</div>
          </section>
          <section className="cfo-module-card cfo-module-card-wide">
            <div className="cfo-module-card-head"><div><p>Exposure ledger</p><h3>Currency detail</h3></div></div>
            <ModuleTable columns={['Currency', 'Receivable', 'Payable', 'Translation impact']} rows={data.fxExposure.map(row => [row.currency, money(row.receivable), money(row.payable), money(row.impact)])} />
          </section>
        </div>
      )}
    </div>
  );
}

export function CfoDashboard({ user }: { user: CfoUser }) {
  const [period, setPeriod] = useState<FinancePeriodKey>('mtd');
  const [data, setData] = useState<FinanceDashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [activeModule, setActiveModule] = useState<FinanceModule>('overview');
  const [selectedKpi, setSelectedKpi] = useState<FinanceKpi | null>(null);
  const [metricsExpanded, setMetricsExpanded] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [darkTheme, setDarkTheme] = useState(() => document.documentElement.dataset.theme === 'dark');

  useEffect(() => {
    const handleTheme = (event: Event) => {
      setDarkTheme((event as CustomEvent<{ theme: 'light' | 'dark' }>).detail.theme === 'dark');
    };
    window.addEventListener('lexflow:theme-change', handleTheme);
    setDarkTheme(document.documentElement.dataset.theme === 'dark');
    return () => window.removeEventListener('lexflow:theme-change', handleTheme);
  }, []);
  const modulePanelRef = useRef<HTMLDivElement>(null);
  const metricLibraryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setSelectedKpi(null);
    setLoading(true);
    setError('');
    fetch(`/api/finance/dashboard?period=${period}&reportingCurrency=USD`, { signal: controller.signal })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error?.message || 'Finance data could not be loaded.');
        return payload as FinanceDashboardData;
      })
      .then(setData)
      .catch(fetchError => {
        if (fetchError.name !== 'AbortError') setError(fetchError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [period, retryKey]);

  useEffect(() => {
    if (!modulePanelRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const targets = modulePanelRef.current.querySelectorAll([
      '.cfo-bento > *',
      '.cfo-kpi-section',
      '.cfo-exceptions',
      '.cfo-deep-dive > *'
    ].join(','));
    if (!targets.length) return;
    animate(targets, {
      opacity: { from: 0 },
      translateY: { from: 18 },
      scale: { from: 0.992 },
      delay: stagger(48),
      duration: 460,
      ease: 'out(3)'
    });
  }, [activeModule, data?.period.key]);

  useEffect(() => {
    if (!metricsExpanded || !metricLibraryRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const targets = metricLibraryRef.current.querySelectorAll('.cfo-kpi-library-group, .cfo-kpi');
    animate(targets, {
      opacity: { from: 0 },
      translateY: { from: 10 },
      delay: stagger(28),
      duration: 360,
      ease: 'out(3)'
    });
  }, [metricsExpanded]);

  const kpiById = useMemo(() => new Map(data?.kpis.map(kpi => [kpi.id, kpi]) ?? []), [data]);
  const billed = kpiById.get('billed-revenue');
  const collected = kpiById.get('collected-revenue');
  const workingCapital = kpiById.get('working-capital');
  const forecastCash = kpiById.get('net-cash');
  const ar = kpiById.get('outstanding-ar');
  const ap = kpiById.get('outstanding-ap');
  const tax = kpiById.get('tax-liability');
  const priorityKpis = PRIORITY_KPI_IDS.map(id => kpiById.get(id)).filter((kpi): kpi is FinanceKpi => Boolean(kpi));

  async function signOut() {
    setSigningOut(true);
    try {
      const response = await fetch('/api/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Sign out could not be completed.');
      window.dispatchEvent(new CustomEvent('lexflow:cfo-logout'));
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Sign out could not be completed.');
      setSigningOut(false);
    }
  }

  function toggleTheme() {
    window.dispatchEvent(new CustomEvent('lexflow:request-theme', {
      detail: { theme: darkTheme ? 'light' : 'dark' }
    }));
  }

  function handleModuleKeys(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = MODULES.findIndex(item => item.key === activeModule);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? MODULES.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + MODULES.length) % MODULES.length;
    const next = MODULES[nextIndex];
    setActiveModule(next.key);
    window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`#cfo-module-tab-${next.key}`)?.focus());
  }

  return (
    <div className="cfo-workspace">
      <header className="cfo-header">
        <div className="cfo-brand">
          <span aria-hidden="true">L</span>
          <div><strong>LexFlow</strong><small>Finance command</small></div>
        </div>
        <div className="cfo-header-center">
          <span className="cfo-demo-pill"><i /> Sample finance data</span>
          <div className="cfo-periods" aria-label="Reporting period">
            {PERIODS.map(item => <button key={item.key} type="button" className={period === item.key ? 'active' : ''} onClick={() => setPeriod(item.key)}>{item.label}</button>)}
          </div>
        </div>
        <div className="cfo-header-actions">
          <button type="button" className="cfo-round-action" aria-label="Finance notifications"><Bell /></button>
          <div className="cfo-account">
            <button type="button" className="cfo-avatar" aria-expanded={accountOpen} aria-haspopup="menu" onClick={() => setAccountOpen(open => !open)}>{user.initials}</button>
            {accountOpen && (
              <div className="cfo-account-menu" role="menu">
                <div><strong>{user.name}</strong><small>CFO · {user.department}</small></div>
                <button type="button" role="menuitem" aria-pressed={darkTheme} onClick={toggleTheme}>
                  {darkTheme ? <Sun /> : <Moon />}
                  <span>{darkTheme ? 'Light mode' : 'Dark mode'}</span>
                  <span className={`cfo-theme-switch${darkTheme ? ' is-on' : ''}`} aria-hidden="true"><i /></span>
                </button>
                <button type="button" role="menuitem" disabled={signingOut} onClick={signOut}><LogOut />{signingOut ? 'Signing out…' : 'Sign out'}</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="cfo-main">
        <section className="cfo-intro">
          <div className="cfo-asof">
            <CalendarDays />
            <span><small>Reporting window</small><strong>{data?.period.label ?? 'Loading…'}</strong></span>
          </div>
        </section>

        <div className="cfo-module-tabs" role="tablist" aria-label="Finance modules" onKeyDown={handleModuleKeys}>
          {MODULES.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                id={`cfo-module-tab-${item.key}`}
                type="button"
                role="tab"
                aria-selected={activeModule === item.key}
                aria-controls="cfo-module-panel"
                tabIndex={activeModule === item.key ? 0 : -1}
                className={activeModule === item.key ? 'active' : ''}
                onClick={() => setActiveModule(item.key)}
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {error && <div className="cfo-error" role="alert">{error}<button type="button" onClick={() => setRetryKey(key => key + 1)}>Try again</button></div>}
        {loading && !data && <div className="cfo-loading" role="status"><RefreshCw /> Loading the finance command center…</div>}

        {data && (
          <>
            <section className="cfo-sources" aria-label="Finance source freshness">
              {data.sources.map(source => (
                <div key={source.id}>
                  <span><i />{source.name}</span>
                  <small>{source.records} records · {freshness(source.lastUpdatedAt)}</small>
                </div>
              ))}
            </section>

            <div
              ref={modulePanelRef}
              id="cfo-module-panel"
              className="cfo-module-panel"
              role="tabpanel"
              aria-labelledby={`cfo-module-tab-${activeModule}`}
            >
              {activeModule === 'overview' ? (
                <>

            <section className="cfo-bento" aria-label="Executive financial overview">
              <article className="cfo-tile cfo-posture">
                <div className="cfo-tile-heading"><span>Financial posture</span><CircleDollarSign /></div>
                <div className="cfo-posture-copy">
                  <small>Forecast net cash</small>
                  <strong>{forecastCash ? metricValue(forecastCash) : '—'}</strong>
                  <p>Positive thirteen-week position with tax and supplier obligations included.</p>
                </div>
                <div className="cfo-orbit" aria-hidden="true"><i /><i /><i /><b /></div>
                <div className="cfo-posture-foot"><span>Working capital</span><strong>{workingCapital ? metricValue(workingCapital) : '—'}</strong></div>
              </article>

              <article className="cfo-tile cfo-revenue-tile">
                <div className="cfo-tile-heading"><span>Revenue & collections</span><ArrowUpRight /></div>
                <strong className="cfo-hero-value">{billed ? metricValue(billed) : '—'}</strong>
                <small>Billed · {collected ? `${metricValue(collected)} collected` : ''}</small>
                <MiniTrend points={data.revenueTrend.map(point => point.collected)} tone="dark" />
                <div className="cfo-tile-foot"><span>Collection velocity</span><strong>{kpiById.get('collection-rate') ? metricValue(kpiById.get('collection-rate')!) : '—'}</strong></div>
              </article>

              <article className="cfo-tile cfo-ar-tile">
                <div className="cfo-tile-heading"><span>Receivables health</span><ArrowUpRight /></div>
                <strong className="cfo-hero-value">{ar ? metricValue(ar) : '—'}</strong>
                <small>Outstanding AR</small>
                <div className="cfo-aging-bars">{data.arAging.map(row => <i key={row.bucket} style={{ height: `${Math.max(18, row.share * 1.8)}%` }} title={`${row.bucket}: ${row.share}%`} />)}</div>
                <div className="cfo-tile-foot"><span>90+ day exposure</span><strong>{data.arAging.at(-1)?.share}%</strong></div>
              </article>

              <article className="cfo-tile cfo-ap-tile">
                <div className="cfo-tile-heading"><span>Payables runway</span><Clock3 /></div>
                <strong className="cfo-hero-value">{ap ? metricValue(ap) : '—'}</strong>
                <small>Total supplier obligations</small>
                <MiniTrend points={data.apSchedule.map(point => point.amount)} />
                <div className="cfo-tile-foot"><span>Due in 30 days</span><strong>{kpiById.get('due-30-days') ? metricValue(kpiById.get('due-30-days')!) : '—'}</strong></div>
              </article>

              <article className="cfo-tile cfo-cash-tile">
                <div className="cfo-tile-heading"><span>13-week cash outlook</span><ArrowUpRight /></div>
                <DecisionAreaChart
                  data={data.cashForecast.map((row, index) => ({
                    date: new Date(2026, 7, 31 + index * 7),
                    inflow: row.inflow,
                    outflow: row.outflow,
                  }))}
                  primaryKey="inflow"
                  primaryLabel="Inflows"
                  secondaryKey="outflow"
                  secondaryLabel="Outflows"
                  signature={`cash-${data.period.key}`}
                />
              </article>

              <article className="cfo-tile cfo-tax-tile">
                <div className="cfo-tile-heading"><span>Tax & compliance</span><ShieldCheck /></div>
                <strong className="cfo-hero-value">{tax ? metricValue(tax) : '—'}</strong>
                <small>Current estimated liability</small>
                <div className="cfo-compliance-list">{data.taxCompliance.slice(0, 3).map(row => <div key={`${row.jurisdiction}-${row.obligation}`}><span><i className={row.status} />{row.jurisdiction}</span><strong>{money(row.amount)}</strong></div>)}</div>
              </article>

              <article className="cfo-tile cfo-invoice-tile">
                <div className="cfo-tile-heading"><span>Invoice control</span><ChevronRight /></div>
                <div className="cfo-ring" style={{ '--progress': '98.6%' } as React.CSSProperties}><strong>98.6%</strong><small>accuracy</small></div>
                <div className="cfo-invoice-stats">{data.invoiceStatus.slice(1).map(row => <div key={row.status}><span>{row.status}</span><strong>{row.count}</strong></div>)}</div>
              </article>

              <article className="cfo-tile cfo-fx-tile">
                <div className="cfo-tile-heading"><span>Currency exposure</span><span>USD base</span></div>
                <div className="cfo-fx-grid">{data.fxExposure.map(row => <div key={row.currency}><strong>{row.currency}</strong><span>{money(row.receivable - row.payable)}</span><small>{row.impact ? money(row.impact) : 'Base'}</small></div>)}</div>
              </article>
            </section>

            <section className="cfo-kpi-section" aria-labelledby="cfo-kpi-title">
              <div className="cfo-section-heading cfo-kpi-heading">
                <div><p>Executive signals</p><h2 id="cfo-kpi-title">Five numbers to run the day</h2><span>Cash, collections, obligations, and risk—everything else stays one click away.</span></div>
                <div className="cfo-kpi-heading-actions">
                  <small>{priorityKpis.length} priority · {data.kpis.length} total</small>
                  <button
                    type="button"
                    aria-expanded={metricsExpanded}
                    aria-controls="cfo-metric-library"
                    onClick={() => setMetricsExpanded(expanded => !expanded)}
                  >
                    {metricsExpanded ? 'Hide full library' : 'View all metrics'}
                    <ChevronDown aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="cfo-kpi-grid cfo-kpi-priority-grid">{priorityKpis.map((kpi, index) => <KpiCard key={kpi.id} kpi={kpi} index={index} onOpen={() => setSelectedKpi(kpi)} />)}</div>
              {metricsExpanded && (
                <div ref={metricLibraryRef} id="cfo-metric-library" className="cfo-kpi-library">
                  {KPI_GROUPS.map(group => {
                    const groupKpis = group.ids.map(id => kpiById.get(id)).filter((kpi): kpi is FinanceKpi => Boolean(kpi));
                    return (
                      <section key={group.label} className="cfo-kpi-library-group" aria-label={group.label}>
                        <header><div><h3>{group.label}</h3><p>{group.description}</p></div><span>{groupKpis.length}</span></header>
                        <div className="cfo-kpi-library-grid">{groupKpis.map((kpi, index) => <KpiCard key={kpi.id} kpi={kpi} index={index} compact onOpen={() => setSelectedKpi(kpi)} />)}</div>
                      </section>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="cfo-exceptions" aria-labelledby="cfo-exceptions-title">
              <div className="cfo-section-heading"><div><p>Decision queue</p><h2 id="cfo-exceptions-title">Items needing attention</h2></div><span>As of {new Date(data.asOf).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div>
              <div className="cfo-exception-list">{data.exceptions.map(item => <article key={item.title}><i className={item.severity} /><div><strong>{item.title}</strong><span>{item.owner}</span></div><b>{money(item.amount)}</b><ChevronRight /></article>)}</div>
            </section>
                </>
              ) : (
                <DeepDiveModule module={activeModule} data={data} onOpen={setSelectedKpi} />
              )}
            </div>
          </>
        )}
      </main>
      {data && selectedKpi && <DetailDrawer data={data} kpi={selectedKpi} onClose={() => setSelectedKpi(null)} />}
    </div>
  );
}
