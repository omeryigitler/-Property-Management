import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BedDouble,
  Building2,
  CalendarRange,
  Layers3,
  ReceiptText,
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
  ReportFilter,
  ReportPeriod,
} from '../../services/reportingService';

const REPORT_PROPERTY_SESSION_KEY = 'shortlet-report-property-id';

function compactCurrency(cents: number): string {
  return new Intl.NumberFormat('en-MT', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format((cents || 0) / 100);
}

interface MetricTone {
  surface: string;
  border: string;
  accent: string;
}

function MetricCard({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  tone: MetricTone;
}) {
  return (
    <article
      className="min-w-0 rounded-2xl border p-4 shadow-[0_8px_24px_rgba(52,42,37,0.07)]"
      style={{ backgroundColor: tone.surface, borderColor: tone.border }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#625b57]">
            {label}
          </p>
          <p className="mt-1 break-words text-xl font-extrabold tabular-nums tracking-[-0.02em] text-[#211e1d]">
            {value}
          </p>
        </div>
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border bg-white shadow-sm"
          style={{ borderColor: tone.border, color: tone.accent }}
        >
          {icon}
        </div>
      </div>
      <p className="mt-2 text-[11px] font-medium leading-4 text-[#756e69]">{note}</p>
    </article>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-[#e7e1dd] bg-white p-4 shadow-[0_10px_28px_rgba(52,42,37,0.06)]">
      <div className="mb-4 border-b border-[#eee8e5] pb-3">
        <h3 className="text-sm font-extrabold tracking-[-0.01em] text-[#262220]">{title}</h3>
        <p className="mt-1 text-[11px] font-medium text-[#756e69]">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid #ded7d3',
  borderRadius: 12,
  boxShadow: '0 10px 28px rgba(52, 42, 37, 0.12)',
  color: '#272321',
};

export function ReportsDashboard() {
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const bookings = useDashboardStore((state) => state.bookings);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);
  const activeProperties = getActiveProperties(
    usePropertyStore((state) => state.properties)
  );
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [propertyId, setPropertyId] = useState<string | 'all'>(() => {
    const requested =
      typeof window === 'undefined'
        ? null
        : sessionStorage.getItem(REPORT_PROPERTY_SESSION_KEY);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(REPORT_PROPERTY_SESSION_KEY);
    }
    return requested && activeProperties.some((property) => property.id === requested)
      ? requested
      : 'all';
  });

  useEffect(() => {
    if (
      propertyId !== 'all' &&
      !activeProperties.some((property) => property.id === propertyId)
    ) {
      setPropertyId('all');
    }
  }, [activeProperties, propertyId]);

  const filter: ReportFilter = {
    period,
    year: selectedYear,
    month: selectedMonth,
    propertyId,
  };
  const summary = useMemo(
    () => calculateReportSummary(bookings, expenses, extraIncomes, filter),
    [
      bookings,
      expenses,
      extraIncomes,
      period,
      selectedYear,
      selectedMonth,
      propertyId,
    ]
  );
  const financialSeries = useMemo(() => {
    const items =
      period === 'yearly'
        ? buildMonthlyFinancialSeries(
            bookings,
            expenses,
            extraIncomes,
            selectedYear,
            propertyId
          )
        : buildPropertyFinancialSeries(bookings, expenses, extraIncomes, filter);
    return items.map((item) => ({
      ...item,
      expensesDisplayCents: -item.totalExpensesCents,
    }));
  }, [
    bookings,
    expenses,
    extraIncomes,
    period,
    selectedYear,
    selectedMonth,
    propertyId,
  ]);
  const channelSeries = useMemo(
    () => buildChannelFinancialSeries(bookings, filter),
    [bookings, period, selectedYear, selectedMonth, propertyId]
  );
  const expenseSeries = useMemo(
    () => buildExpenseSeries(expenses, filter),
    [expenses, period, selectedYear, selectedMonth, propertyId]
  );
  const propertyOptions = [
    { value: 'all', label: 'All Properties' },
    ...activeProperties.map((property) => ({
      value: property.id,
      label: property.name,
    })),
  ];
  const periodLabel =
    period === 'yearly'
      ? `${selectedYear} full year`
      : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  return (
    <div className="h-full min-h-0 overflow-y-auto pb-4 no-scrollbar">
      <div className="space-y-4">
        <section className="rounded-2xl border border-[#e7e1dd] bg-white p-4 shadow-[0_10px_28px_rgba(52,42,37,0.06)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-[#ffc9c5] bg-[#fff0ef] p-2.5 text-[#c73e44]">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold tracking-[-0.025em] text-[#24201f]">
                  Reports & Analytics
                </h2>
                <p className="mt-0.5 text-[11px] font-semibold text-[#756e69]">
                  {periodLabel}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="grid grid-cols-2 rounded-xl border border-[#ddd6d2] bg-[#f7f4f2] p-1">
                <button
                  type="button"
                  onClick={() => setPeriod('monthly')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                    period === 'monthly'
                      ? 'bg-[#ff5a5f] text-white shadow-sm'
                      : 'text-[#5f5955] hover:bg-white'
                  }`}
                >
                  <CalendarRange className="h-3.5 w-3.5" /> Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod('yearly')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                    period === 'yearly'
                      ? 'bg-[#ff5a5f] text-white shadow-sm'
                      : 'text-[#5f5955] hover:bg-white'
                  }`}
                >
                  <Layers3 className="h-3.5 w-3.5" /> Yearly
                </button>
              </div>
              <CustomSelect
                value={propertyId}
                onChange={(value) => setPropertyId(value as string | 'all')}
                options={propertyOptions}
                className="w-full sm:w-56"
              />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            label="Net Balance"
            value={formatCents(summary.netBalanceCents)}
            note="Income minus expenses"
            icon={<WalletCards className="h-4 w-4" />}
            tone={
              summary.netBalanceCents >= 0
                ? { surface: '#eef8f3', border: '#b8dfcf', accent: '#1f7a58' }
                : { surface: '#fff1f0', border: '#f0c2bf', accent: '#b13a40' }
            }
          />
          <MetricCard
            label="Booking Income"
            value={formatCents(summary.bookingIncomeCents)}
            note={`${summary.bookingCount} bookings`}
            icon={<TrendingUp className="h-4 w-4" />}
            tone={{ surface: '#fff1f0', border: '#ffc8c4', accent: '#c73e44' }}
          />
          <MetricCard
            label="Occupancy"
            value={`${summary.occupancyRatePct.toFixed(1)}%`}
            note={`${summary.occupiedNights} / ${summary.availableNights} nights`}
            icon={<BedDouble className="h-4 w-4" />}
            tone={{ surface: '#f4eef9', border: '#d8c4e8', accent: '#6a4b8d' }}
          />
          <MetricCard
            label="ADR"
            value={formatCents(summary.adrCents)}
            note={`RevPAR: ${formatCents(summary.revParCents)}`}
            icon={<Building2 className="h-4 w-4" />}
            tone={{ surface: '#fff8ea', border: '#ead6a8', accent: '#8a5c10' }}
          />
          <MetricCard
            label="Expenses"
            value={formatCents(summary.totalExpensesCents)}
            note="All operating costs"
            icon={<ReceiptText className="h-4 w-4" />}
            tone={{ surface: '#fff4f3', border: '#efc7c4', accent: '#a9363c' }}
          />
          <MetricCard
            label="Extra Income"
            value={formatCents(summary.extraIncomeCents)}
            note="Additional monthly income"
            icon={<CalendarRange className="h-4 w-4" />}
            tone={{ surface: '#f7f6f4', border: '#ddd8d4', accent: '#4e4946' }}
          />
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <Panel
            title="Financial Performance"
            subtitle="Booking income, extra income, expenses and net balance"
          >
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={financialSeries}>
                  <CartesianGrid stroke="#ece7e3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#625b57', fontSize: 10, fontWeight: 600 }}
                    axisLine={{ stroke: '#dcd5d1' }}
                    tickLine={{ stroke: '#dcd5d1' }}
                  />
                  <YAxis
                    tickFormatter={compactCurrency}
                    tick={{ fill: '#756e69', fontSize: 10, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={62}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCents(value)}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: '#272321', fontWeight: 700 }}
                    itemStyle={{ color: '#4e4946' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#5f5955' }} />
                  <Bar
                    dataKey="bookingIncomeCents"
                    name="Booking Income"
                    fill="#ff7a7f"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="extraIncomeCents"
                    name="Extra Income"
                    fill="#49a77f"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expensesDisplayCents"
                    name="Expenses"
                    fill="#d86166"
                    radius={[0, 0, 4, 4]}
                  />
                  <Line
                    type="monotone"
                    dataKey="netBalanceCents"
                    name="Net Balance"
                    stroke="#2f2b29"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#2f2b29' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="Booking Channel Mix" subtitle="Reservation income by channel">
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelSeries}
                    dataKey="bookingIncomeCents"
                    nameKey="label"
                    innerRadius="52%"
                    outerRadius="78%"
                    paddingAngle={3}
                  >
                    {channelSeries.map((item) => (
                      <Cell key={item.channel} fill={CHANNEL_CONFIG[item.channel].hex} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCents(value)}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: '#272321', fontWeight: 700 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <Panel title="Expense Breakdown" subtitle="Operating costs by category">
          {expenseSeries.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseSeries} layout="vertical">
                  <CartesianGrid stroke="#ece7e3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={compactCurrency}
                    tick={{ fill: '#756e69', fontSize: 10, fontWeight: 600 }}
                    axisLine={{ stroke: '#dcd5d1' }}
                    tickLine={{ stroke: '#dcd5d1' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={120}
                    tick={{ fill: '#514b48', fontSize: 10, fontWeight: 650 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCents(value)}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="amountCents" fill="#d86166" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-12 text-center text-sm font-medium text-[#817975]">
              No expenses for this selection.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
