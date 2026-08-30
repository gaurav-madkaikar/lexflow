export type FinancePeriodKey = 'mtd' | 'qtd' | 'ytd' | '12m';
export type FinanceValueKind = 'currency' | 'percent' | 'days' | 'number';

export type FinanceValue = {
  kind: FinanceValueKind;
  amount: number;
  currency?: string;
};

export type FinanceTrend = {
  value: number;
  direction: 'up' | 'down' | 'flat';
  label: string;
};

export type FinanceKpi = {
  id: string;
  label: string;
  value: FinanceValue;
  trend: FinanceTrend;
  definition: string;
  sources: string[];
  detailKey: 'revenue' | 'ar' | 'ap' | 'cash' | 'tax' | 'invoicing' | 'fx';
};

export type FinanceSource = {
  id: string;
  name: string;
  lastUpdatedAt: string;
  status: 'current' | 'stale';
  records: number;
};

export type FinanceDashboardData = {
  demo: boolean;
  asOf: string;
  reportingCurrency: 'USD';
  period: {
    key: FinancePeriodKey;
    label: string;
    startDate: string;
    endDate: string;
    factor: number;
  };
  sources: FinanceSource[];
  kpis: FinanceKpi[];
  revenueTrend: Array<{ label: string; billed: number; collected: number }>;
  arAging: Array<{ bucket: string; amount: number; share: number }>;
  topCustomers: Array<{ name: string; amount: number; daysOverdue: number; currency: string }>;
  apSchedule: Array<{ window: string; amount: number }>;
  topVendors: Array<{ name: string; amount: number; dueDate: string; currency: string }>;
  cashForecast: Array<{ week: string; inflow: number; outflow: number; net: number }>;
  taxCompliance: Array<{ obligation: string; jurisdiction: string; dueDate: string; amount: number; status: string }>;
  invoiceStatus: Array<{ status: string; count: number; amount: number }>;
  fxExposure: Array<{ currency: string; receivable: number; payable: number; impact: number }>;
  exceptions: Array<{ severity: 'high' | 'medium'; title: string; owner: string; amount: number }>;
};

export type CfoUser = {
  id: number;
  email: string;
  name: string;
  initials: string;
  department: string;
  role: 'cfo';
};
