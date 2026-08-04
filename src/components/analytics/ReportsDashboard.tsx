import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BedDouble,
  Building2,
  CalendarRange,
  Layers3,
  ReceiptText,
  Scale,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDashboardStore } from '../../store/useDashboardStore';
import { getActiveProperties, usePropertyStore } from '../../store/usePropertyStore';
import { CHANNEL_CONFIG } from '../../config/locations';
import { MONTH_NAMES } from '../../utils/dateUtilities';
import { formatCents } from '../../utils/currency';
import { CustomSelect } from '../common/CustomSelect';
import {
  buildChannelFinancialSeries,
  buildExpenseSeries,
  buildMonthlyFinancialSeries,
  buildPropertyFinancialSeries,
  calculateReportSummary,
  FinancialSeriesPoint,
  ReportFilter,
  ReportPeriod,
} from '../../services/reportingService';

const REPORT_PROPERTY_SESSION_KEY = 'shortlet-report-property-id';

interface TooltipEntry {
  color?: string;
  dataKey?: string;
  name?: string;
  value?: number | null;
}

const FINANCIAL_COLORS = {
  netBooking: '#06b6d4',
  extraIncome: '#10b981',
  expenses: '#f43f5e',
  taxes: '#f59e0b',
  netBalance: '#f8fafc',
  previousYear: '#8b5cf6',
  occupancy: '#22d3ee',
  adr: '#a78bfa',
  revPar: '#fb7185',
};

function compactCurrency(cents: number): string {
  return new Intl.NumberFormat('en-MT', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format((cents || 0) / 100);
}

function percentageChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function FinancialTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const visibleEntries = (payload as TooltipEntry[]).filter(
    (entry) => entry.value != null && entry.dataKey !== 'occupancyRatePct'
  );

  return (
    <div className="min-w-52 rounded-xl border border-slate-700 bg-slate-950/95 p-3 text-xs text-slate-200 shadow-2xl backdrop-blur">
      <div className="mb-2 font-black uppercase tracking-wider text-slate-100">{label}</div>
      <div className="space-y-1.5">
        {visibleEntries.map((entry) => (
          <div key={`${entry.dataKey}-${entry.name}`} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-2 text-slate-400">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-mono font-bold text-slate-100">
              {formatCents(entry.value ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RateTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const record = payload[0]?.payload as FinancialSeriesPoint | undefined;
  if (!record) return null;

  return (
    <div className="min-w-48 rounded-xl border border-slate-700 bg-slate-950/95 p-3 text-xs shadow-2xl backdrop-blur">
      <div className="mb-2 font-black uppercase tracking-wider text-slate-100">{label}</div>
      <div className="space-y-1.5 text-slate-300">
        <div className="flex justify-between gap-4">
          <span>Occupancy</span>
          <span className="font-mono font-bold text-cyan-300">{record.occupancyRatePct.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>ADR</span>
          <span className="font-mono font-bold text-violet-300">{formatCents(record.adrCents)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>RevPAR</span>
          <span className="font-mono font-bold text-rose-300">{formatCents(record.revParCents)}</span>
        </div>
        <div className="flex justify-between gap-4 border-t border-slate-800 pt-1.5">
          <span>Occupied nights</span>
          <span className="font-mono font-bold text-slate-100">{record.occupiedNights}</span>
        </div>
      </div>
    </div>
  );
}

function ChartPanel({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-xl ${className}`}>
      <div className="mb-4 border-b border-slate-800 pb-3">
        <h3 className="text-sm font-display font-black uppercase tracking-wide text-slate-100">{title}</h3>
        <p className="mt-0.5 text-[11px] font-medium text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  note,
  icon,
  tone,
  comparison,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  tone: 'cyan' | 'emerald' | 'rose' | 'amber' | 'violet' | 'slate';
  comparison?: number | null;
}) {
  const toneClasses = {
    cyan: 'border-cyan-900/80 bg-cyan-950/20 text-cyan-300',
    emerald: 'border-emerald-900/80 bg-emerald-950/20 text-emerald-300',
    rose: 'border-rose-900/80 bg-rose-950/20 text-rose-300',
    amber: 'border-amber-900/80 bg-amber-950/20 text-amber-300',
    violet: 'border-violet-900/80 bg-violet-950/20 text-violet-300',
    slate: 'border-slate-800 bg-slate-950/80 text-slate-300',
  }[tone];

  return (
    <div className={`min-w-0 rounded-2xl border p-3.5 shadow-lg ${toneClasses}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-1 truncate font-mono text-lg font-black text-slate-50">{value}</p>
        </div>
        <div className="rounded-lg border border-current/20 bg-slate-950/60 p-2">{icon}</div>
      </div>
      <div className="mt-2 flex min-h-4 items-center justify-between gap-2 text-[10px]">
        <span className="truncate text-slate-500">{note}</span>
        {comparison != null && (
          <span className={`flex flex-shrink-0 items-center gap-0.5 font-bold ${comparison >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {comparison >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {comparison > 0 ? '+' : ''}{comparison.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

export function ReportsDashboard() {
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const bookings = useDashboardStore((state) => state.bookings);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);
  const taxConfiguration = useDashboardStore((state) => state.taxConfiguration);
  const properties = usePropertyStore((state) => state.properties);
  const activeProperties = getActiveProperties(properties);

  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [propertyId, setPropertyId] = useState<string | 'all'>(() => {
    if (typeof window === 'undefined') return 'all';

    const requestedPropertyId = window.sessionStorage.getItem(REPORT_PROPERTY_SESSION_KEY);
    window.sessionStorage.removeItem(REPORT_PROPERTY_SESSION_KEY);

    return requestedPropertyId && activeProperties.some((property) => property.id === requestedPropertyId)
      ? requestedPropertyId
      : 'all';
  });
  const [comparePreviousYear, setComparePreviousYear] = useState(false);

  useEffect(() => {
    if (propertyId === 'all') return;
    if (activeProperties.some((property) => property.id === propertyId)) return;
    setPropertyId('all');
  }, [activeProperties, propertyId]);

  const propertyOptions = useMemo(
    () => [
      { value: 'all', label: 'All Properties' },
      ...activeProperties.map((property) => ({
        value: property.id,
        label: property.name,
      })),
    ],
    [activeProperties]
  );

  const filter: ReportFilter = {
    period,
    year: selectedYear,
    month: selectedMonth,
    propertyId,
  };

  const previousFilter: ReportFilter = {
    ...filter,
    year: selectedYear - 1,
  };

  const summary = useMemo(
    () => calculateReportSummary(bookings, expenses, extraIncomes, taxConfiguration, filter),
    [bookings, expenses, extraIncomes, taxConfiguration, period, selectedYear, selectedMonth, propertyId]
  );

  const previousSummary = useMemo(
    () =>
      comparePreviousYear
        ? calculateReportSummary(bookings, expenses, extraIncomes, taxConfiguration, previousFilter)
        : null,
    [
      bookings,
      expenses,
      extraIncomes,
      taxConfiguration,
      comparePreviousYear,
      period,
      selectedYear,
      selectedMonth,
      propertyId,
    ]
  );

  const currentSeries = useMemo(
    () =>
      period === 'yearly'
        ? buildMonthlyFinancialSeries(
            bookings,
            expenses,
            extraIncomes,
            taxConfiguration,
            selectedYear,
            propertyId
          )
        : buildPropertyFinancialSeries(
            bookings,
            expenses,
            extraIncomes,
            taxConfiguration,
            filter
          ),
    [bookings, expenses, extraIncomes, taxConfiguration, period, selectedYear, selectedMonth, propertyId]
  );

  const previousSeries = useMemo(
    () => {
      if (!comparePreviousYear) return [];
      return period === 'yearly'
        ? buildMonthlyFinancialSeries(
            bookings,
            expenses,
            extraIncomes,
            taxConfiguration,
            selectedYear - 1,
            propertyId
          )
        : buildPropertyFinancialSeries(
            bookings,
            expenses,
            extraIncomes,
            taxConfiguration,
            previousFilter
          );
    }, [
      bookings,
      expenses,
      extraIncomes,
      taxConfiguration,
      comparePreviousYear,
      period,
      selectedYear,
      selectedMonth,
      propertyId,
    ]
  );

  const financialSeries = useMemo(
    () =>
      currentSeries.map((point, index) => ({
        ...point,
        expensesDisplayCents: -point.totalExpensesCents,
        taxDisplayCents: -(point.calculatedTaxesCents ?? 0),
        previousNetBalanceCents: previousSeries[index]?.netBalanceCents ?? null,
      })),
    [currentSeries, previousSeries]
  );

  const channelSeries = useMemo(
    () => buildChannelFinancialSeries(bookings, taxConfiguration, filter),
    [bookings, taxConfiguration, period, selectedYear, selectedMonth, propertyId]
  );

  const expenseSeries = useMemo(
    () => buildExpenseSeries(expenses, summary, filter),
    [expenses, summary, period, selectedYear, selectedMonth, propertyId]
  );

  const propertyPerformance = useMemo(
    () =>
      buildPropertyFinancialSeries(bookings, expenses, extraIncomes, taxConfiguration, filter).sort(
        (a, b) =>
          (b.netBalanceCents ?? b.preTaxBalanceCents) -
          (a.netBalanceCents ?? a.preTaxBalanceCents)
      ),
    [bookings, expenses, extraIncomes, taxConfiguration, period, selectedYear, selectedMonth, propertyId]
  );

  const displayBalance = summary.netBalanceCents ?? summary.preTaxBalanceCents;
  const previousBalance = previousSummary
    ? previousSummary.netBalanceCents ?? previousSummary.preTaxBalanceCents
    : null;
  const periodLabel =
    period === 'yearly'
      ? `${selectedYear} full year`
      : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
  const scopeLabel =
    propertyId === 'all'
      ? 'All properties'
      : activeProperties.find((property) => property.id === propertyId)?.name ?? 'Selected property';

  const hasFinancialData = financialSeries.some(
    (point) =>
      point.grossBookingIncomeCents !== 0 ||
      point.totalExpensesCents !== 0 ||
      point.extraIncomeCents !== 0
  );

  return (
    <div className="h-full min-h-0 overflow-y-auto pb-4 no-scrollbar">
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 shadow-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-cyan-800/70 bg-cyan-950/40 p-2.5 text-cyan-300">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-black uppercase tracking-tight text-slate-100">
                  Reports & Analytics
                </h2>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {periodLabel} • {scopeLabel}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="grid grid-cols-2 rounded-xl border border-slate-800 bg-slate-900 p-1">
                <button
                  type="button"
                  onClick={() => setPeriod('monthly')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition-colors ${
                    period === 'monthly'
                      ? 'bg-[#ff3e00] text-white shadow-lg shadow-[#ff3e00]/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <CalendarRange className="h-3.5 w-3.5" />
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod('yearly')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition-colors ${
                    period === 'yearly'
                      ? 'bg-[#ff3e00] text-white shadow-lg shadow-[#ff3e00]/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <Layers3 className="h-3.5 w-3.5" />
                  Yearly
                </button>
              </div>

              <CustomSelect
                value={propertyId}
                onChange={(value) => setPropertyId(value as string | 'all')}
                options={propertyOptions}
                className="w-full sm:w-56"
              />

              <button
                type="button"
                onClick={() => setComparePreviousYear((current) => !current)}
                className={`flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-black uppercase tracking-wider transition-colors ${
                  comparePreviousYear
                    ? 'border-violet-700 bg-violet-950/70 text-violet-200'
                    : 'border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <Scale className="h-3.5 w-3.5" />
                Compare {selectedYear - 1}
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            label={summary.isTaxConfigured ? 'Net Balance' : 'Pre-Tax Balance'}
            value={formatCents(displayBalance)}
            note={summary.isTaxConfigured ? 'After expenses and taxes' : 'Tax configuration required'}
            icon={<WalletCards className="h-4 w-4" />}
            tone={displayBalance >= 0 ? 'emerald' : 'rose'}
            comparison={percentageChange(displayBalance, previousBalance)}
          />
          <MetricCard
            label="Net Booking Revenue"
            value={formatCents(summary.netBookingIncomeCents)}
            note={`Commission: ${formatCents(summary.otaCommissionCents)}`}
            icon={<TrendingUp className="h-4 w-4" />}
            tone="cyan"
            comparison={percentageChange(
              summary.netBookingIncomeCents,
              previousSummary?.netBookingIncomeCents ?? null
            )}
          />
          <MetricCard
            label="Occupancy"
            value={`${summary.occupancyRatePct.toFixed(1)}%`}
            note={`${summary.occupiedNights} / ${summary.availableNights} nights`}
            icon={<BedDouble className="h-4 w-4" />}
            tone="violet"
            comparison={
              previousSummary
                ? Math.round((summary.occupancyRatePct - previousSummary.occupancyRatePct) * 10) / 10
                : null
            }
          />
          <MetricCard
            label="ADR"
            value={formatCents(summary.adrCents)}
            note={`RevPAR: ${formatCents(summary.revParCents)}`}
            icon={<Building2 className="h-4 w-4" />}
            tone="amber"
            comparison={percentageChange(summary.adrCents, previousSummary?.adrCents ?? null)}
          />
          <MetricCard
            label="Operating Expenses"
            value={formatCents(summary.totalExpensesCents)}
            note={`Taxes: ${formatCents(summary.calculatedTaxesCents)}`}
            icon={<ReceiptText className="h-4 w-4" />}
            tone="rose"
            comparison={percentageChange(
              summary.totalExpensesCents,
              previousSummary?.totalExpensesCents ?? null
            )}
          />
          <MetricCard
            label="Bookings"
            value={summary.bookingCount.toString()}
            note={`Extra income: ${formatCents(summary.extraIncomeCents)}`}
            icon={<CalendarRange className="h-4 w-4" />}
            tone="slate"
            comparison={percentageChange(
              summary.bookingCount,
              previousSummary?.bookingCount ?? null
            )}
          />
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <ChartPanel
            title={period === 'yearly' ? 'Monthly Financial Performance' : 'Property Financial Performance'}
            subtitle={
              period === 'yearly'
                ? `Revenue, costs and balance across ${selectedYear}`
                : `Property-level results for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
            }
          >
            {!hasFinancialData ? (
              <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-800 text-xs font-semibold text-slate-600">
                No financial data for this selection.
              </div>
            ) : period === 'yearly' ? (
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={financialSeries} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#334155' }} />
                    <YAxis tickFormatter={compactCurrency} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={62} />
                    <Tooltip content={<FinancialTooltip />} cursor={{ fill: 'rgba(30,41,59,0.35)' }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 12 }} />
                    <Bar dataKey="netBookingIncomeCents" name="Net Booking" fill={FINANCIAL_COLORS.netBooking} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="extraIncomeCents" name="Extra Income" fill={FINANCIAL_COLORS.extraIncome} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expensesDisplayCents" name="Expenses" fill={FINANCIAL_COLORS.expenses} radius={[0, 0, 4, 4]} />
                    <Bar dataKey="taxDisplayCents" name="Taxes" fill={FINANCIAL_COLORS.taxes} radius={[0, 0, 4, 4]} />
                    <Line type="monotone" dataKey="netBalanceCents" name="Net Balance" stroke={FINANCIAL_COLORS.netBalance} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                    {comparePreviousYear && (
                      <Line
                        type="monotone"
                        dataKey="previousNetBalanceCents"
                        name={`${selectedYear - 1} Net Balance`}
                        stroke={FINANCIAL_COLORS.previousYear}
                        strokeWidth={2}
                        strokeDasharray="6 5"
                        dot={false}
                        connectNulls
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: Math.max(300, financialSeries.length * 48) }} className="w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialSeries} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                    <CartesianGrid stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" tickFormatter={compactCurrency} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#334155' }} />
                    <YAxis type="category" dataKey="label" width={112} tick={{ fill: '#94a3b8', fontSize: 9 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<FinancialTooltip />} cursor={{ fill: 'rgba(30,41,59,0.35)' }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 12 }} />
                    <Bar dataKey="netBookingIncomeCents" name="Net Booking" fill={FINANCIAL_COLORS.netBooking} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="extraIncomeCents" name="Extra Income" fill={FINANCIAL_COLORS.extraIncome} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="expensesDisplayCents" name="Expenses" fill={FINANCIAL_COLORS.expenses} radius={[4, 0, 0, 4]} />
                    <Bar dataKey="taxDisplayCents" name="Taxes" fill={FINANCIAL_COLORS.taxes} radius={[4, 0, 0, 4]} />
                    <Bar dataKey="netBalanceCents" name="Net Balance" fill={FINANCIAL_COLORS.netBalance} radius={[0, 4, 4, 0]} />
                    {comparePreviousYear && (
                      <Bar dataKey="previousNetBalanceCents" name={`${selectedYear - 1} Balance`} fill={FINANCIAL_COLORS.previousYear} radius={[0, 4, 4, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartPanel>

          <ChartPanel
            title="Booking Channel Mix"
            subtitle={`Net booking revenue by source • ${periodLabel}`}
          >
            {channelSeries.length === 0 ? (
              <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-800 text-xs font-semibold text-slate-600">
                No booking channel data.
              </div>
            ) : (
              <div className="grid min-h-[360px] grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_160px] 2xl:grid-cols-1">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={channelSeries}
                        dataKey="netBookingIncomeCents"
                        nameKey="label"
                        innerRadius="54%"
                        outerRadius="82%"
                        paddingAngle={3}
                        stroke="#020617"
                        strokeWidth={3}
                      >
                        {channelSeries.map((item) => (
                          <Cell key={item.channel} fill={CHANNEL_CONFIG[item.channel].hex} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCents(value)}
                        contentStyle={{
                          background: '#020617',
                          border: '1px solid #334155',
                          borderRadius: 12,
                          color: '#e2e8f0',
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {channelSeries.map((item) => (
                    <div key={item.channel} className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-200">
                          <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: CHANNEL_CONFIG[item.channel].hex }} />
                          <span className="truncate">{item.label}</span>
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-100">{formatCents(item.netBookingIncomeCents)}</span>
                      </div>
                      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                        <span>{item.bookingCount} bookings</span>
                        <span>Comm. {formatCents(item.otaCommissionCents)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartPanel>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartPanel
            title="Occupancy & Rate Performance"
            subtitle={period === 'yearly' ? 'Monthly occupancy, ADR and RevPAR' : 'Property occupancy, ADR and RevPAR'}
          >
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={financialSeries} margin={{ top: 10, right: 12, bottom: period === 'monthly' ? 44 : 0, left: 0 }}>
                  <CartesianGrid stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="label"
                    interval={0}
                    angle={period === 'monthly' ? -28 : 0}
                    textAnchor={period === 'monthly' ? 'end' : 'middle'}
                    tick={{ fill: '#94a3b8', fontSize: 9 }}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis yAxisId="occupancy" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={44} />
                  <YAxis yAxisId="rate" orientation="right" tickFormatter={compactCurrency} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={62} />
                  <Tooltip content={<RateTooltip />} cursor={{ fill: 'rgba(30,41,59,0.35)' }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 12 }} />
                  <Bar yAxisId="occupancy" dataKey="occupancyRatePct" name="Occupancy" fill={FINANCIAL_COLORS.occupancy} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="rate" type="monotone" dataKey="adrCents" name="ADR" stroke={FINANCIAL_COLORS.adr} strokeWidth={2.2} dot={{ r: 2.5 }} />
                  <Line yAxisId="rate" type="monotone" dataKey="revParCents" name="RevPAR" stroke={FINANCIAL_COLORS.revPar} strokeWidth={2.2} dot={{ r: 2.5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartPanel>

          <ChartPanel
            title="Cost Breakdown"
            subtitle="Operating expenses, OTA commissions and calculated taxes"
          >
            {expenseSeries.length === 0 ? (
              <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-800 text-xs font-semibold text-slate-600">
                No expense data for this selection.
              </div>
            ) : (
              <div style={{ height: Math.max(320, expenseSeries.length * 44) }} className="w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseSeries} layout="vertical" margin={{ top: 4, right: 18, bottom: 0, left: 12 }}>
                    <CartesianGrid stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" tickFormatter={compactCurrency} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#334155' }} />
                    <YAxis type="category" dataKey="label" width={118} tick={{ fill: '#94a3b8', fontSize: 9 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value: number) => formatCents(value)}
                      cursor={{ fill: 'rgba(30,41,59,0.35)' }}
                      contentStyle={{
                        background: '#020617',
                        border: '1px solid #334155',
                        borderRadius: 12,
                        color: '#e2e8f0',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="amountCents" name="Cost" fill="#f43f5e" radius={[0, 5, 5, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartPanel>
        </div>

        <ChartPanel
          title={propertyId === 'all' ? 'Property Profitability' : 'Property Performance'}
          subtitle={
            propertyId === 'all'
              ? `${periodLabel} • all properties ranked by ${summary.isTaxConfigured ? 'net balance' : 'pre-tax balance'}`
              : `${periodLabel} • ${scopeLabel}`
          }
        >
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {propertyPerformance.map((property) => {
              const balance = property.netBalanceCents ?? property.preTaxBalanceCents;
              const isProfit = balance > 0;
              const isLoss = balance < 0;

              return (
                <div key={property.key} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-black uppercase tracking-wider text-slate-300">{property.label}</p>
                      <p className={`mt-1 truncate font-mono text-sm font-black ${isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-300'}`}>
                        {formatCents(balance)}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                      isProfit
                        ? 'border-emerald-800 bg-emerald-950/70 text-emerald-300'
                        : isLoss
                          ? 'border-rose-800 bg-rose-950/70 text-rose-300'
                          : 'border-slate-700 bg-slate-950 text-slate-400'
                    }`}>
                      {isProfit ? 'Profit' : isLoss ? 'Loss' : 'Break-even'}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-800 pt-2 text-[10px] text-slate-500">
                    <span>Occupancy <strong className="text-slate-300">{property.occupancyRatePct.toFixed(1)}%</strong></span>
                    <span>ADR <strong className="text-slate-300">{formatCents(property.adrCents)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartPanel>
      </div>
    </div>
  );
}
