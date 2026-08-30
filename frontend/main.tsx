import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { Area, AreaChart } from '@/components/charts/area-chart';
import { Grid } from '@/components/charts/grid';
import { ChartTooltip } from '@/components/charts/tooltip';
import { XAxis } from '@/components/charts/x-axis';
import { CfoDashboard } from '@/finance/cfo-dashboard';
import type { CfoUser } from '@/finance/types';

import './styles.css';

type EmailItem = {
  id: number;
  receivedAt: string;
  status: 'unassigned' | 'assigned' | 'completed';
};

type ChartPoint = {
  date: Date;
  received: number;
  completed: number;
};

function dayKey(date: Date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');
}

function chartPoints(emails: EmailItem[]): ChartPoint[] {
  const validDates = emails
    .map(email => new Date(email.receivedAt))
    .filter(date => !Number.isNaN(date.getTime()));
  const anchor = validDates.length
    ? new Date(Math.max(...validDates.map(date => date.getTime())))
    : new Date();
  anchor.setHours(0, 0, 0, 0);

  const points = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(anchor);
    date.setDate(anchor.getDate() - (6 - index));
    return { date, received: 0, completed: 0 };
  });
  const byDay = new Map(points.map(point => [dayKey(point.date), point]));

  for (const email of emails) {
    const date = new Date(email.receivedAt);
    if (Number.isNaN(date.getTime())) continue;
    const point = byDay.get(dayKey(date));
    if (!point) continue;
    point.received += 1;
    if (email.status === 'completed') point.completed += 1;
  }
  return points;
}

function WorkflowChart() {
  const sharedWindow = window as Window & { __lexflowEmails?: EmailItem[] };
  const [emails, setEmails] = useState<EmailItem[]>(() => sharedWindow.__lexflowEmails ?? []);

  useEffect(() => {
    const handleEmails = (event: Event) => {
      const detail = (event as CustomEvent<EmailItem[]>).detail;
      setEmails(Array.isArray(detail) ? detail : []);
    };
    window.addEventListener('lexflow:emails', handleEmails);
    setEmails(sharedWindow.__lexflowEmails ?? []);
    return () => window.removeEventListener('lexflow:emails', handleEmails);
  }, []);

  const data = useMemo(() => chartPoints(emails), [emails]);
  const totals = useMemo(() => ({
    received: data.reduce((sum, point) => sum + point.received, 0),
    completed: data.reduce((sum, point) => sum + point.completed, 0)
  }), [data]);
  const completionRate = totals.received ? Math.round(totals.completed / totals.received * 100) : 0;

  return (
    <section className="overflow-hidden rounded-[22px] border border-black/8 bg-white shadow-[0_1px_2px_rgba(29,29,31,0.03)] dark:border-white/10 dark:bg-[#111720] dark:shadow-[0_1px_0_rgba(255,255,255,0.03)]">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-black/8 px-5 py-4 dark:border-white/10">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500 dark:text-slate-400">Seven-day movement</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.035em] text-neutral-950 dark:text-slate-100">Email flow trend</h2>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-neutral-600 dark:text-slate-400" aria-label="Chart legend">
          <span className="rounded-full bg-[#f5f5f7] px-3 py-1.5 text-neutral-800 dark:bg-[#202a38] dark:text-slate-200">{completionRate}% completion</span>
          <span className="flex items-center gap-2"><i className="size-2 rounded-full bg-[#0071e3]" />Received {totals.received}</span>
          <span className="flex items-center gap-2"><i className="size-2 rounded-full bg-[#5856d6]" />Completed {totals.completed}</span>
        </div>
      </header>
      <div className="min-h-[205px] px-3 py-3 sm:px-5">
        <AreaChart
          animationDuration={900}
          aspectRatio="4 / 1"
          data={data}
          margin={{ top: 20, right: 24, bottom: 42, left: 24 }}
          revealSignature={`${totals.received}:${totals.completed}`}
        >
          <Grid fadeHorizontal hideHorizontalEdgeLines stroke="var(--chart-grid)" />
          <Area dataKey="received" fadeEdges fill="#0071e3" fillOpacity={0.18} stroke="#0071e3" strokeWidth={2.25} />
          <Area dataKey="completed" fadeEdges fill="#5856d6" fillOpacity={0.12} stroke="#5856d6" strokeWidth={2} />
          <XAxis numTicks={7} />
          <ChartTooltip
            rows={point => [
              { color: '#0071e3', label: 'Received', value: String(point.received ?? 0) },
              { color: '#5856d6', label: 'Completed', value: String(point.completed ?? 0) }
            ]}
          />
        </AreaChart>
      </div>
    </section>
  );
}

const rootElement = document.querySelector('#workflow-chart-root');
if (rootElement) createRoot(rootElement).render(<WorkflowChart />);

function CfoRoot() {
  const sharedWindow = window as Window & { __lexflowCfoUser?: CfoUser | null };
  const [user, setUser] = useState<CfoUser | null>(() => sharedWindow.__lexflowCfoUser ?? null);

  useEffect(() => {
    const handleSession = (event: Event) => {
      setUser((event as CustomEvent<{ user: CfoUser }>).detail.user);
    };
    const handleLogout = () => setUser(null);
    window.addEventListener('lexflow:cfo-session', handleSession);
    window.addEventListener('lexflow:cfo-logout', handleLogout);
    setUser(sharedWindow.__lexflowCfoUser ?? null);
    return () => {
      window.removeEventListener('lexflow:cfo-session', handleSession);
      window.removeEventListener('lexflow:cfo-logout', handleLogout);
    };
  }, []);

  return user ? <CfoDashboard user={user} /> : null;
}

const cfoRootElement = document.querySelector('#cfo-dashboard-root');
if (cfoRootElement) createRoot(cfoRootElement).render(<CfoRoot />);
