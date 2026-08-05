import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BedDouble,
  Building2,
  CalendarRange,
  ChevronRight,
  CircleDollarSign,
  Layers3,
  ReceiptText,
  TrendingUp,
  Trophy,
  WalletCards,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
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
import { usePropertyStore } from '../../store/usePropertyStore';
import { CHANNEL_CONFIG } from '../../config/locations';
import { Channel } from '../../types';
import { MONTH_NAMES } from '../../utils/dateUtilities';
import { formatCents } from '../../utils/currency';
import { CustomSelect } from '../common/CustomSelect';
import {
  buildBookingReportDetails,
  buildChannelFinancialSeries,
  buildChannelMonthlySeries,
  buildChannelYearComparisonSeries,
  buildExpenseSeries,
  buildMonthlyFinancialSeries,
  buildPropertyAnnualRanking,
  buildPropertyChannelMatrix,
  buildPropertyFinancialSeries,
  buildPropertyMonthlyPerformance,
  buildYearOverYearMonthlySeries,
  calculateReportSummary,
  calculateYearComparison,
  getYearHighlights,
  ReportChannel,
  ReportFilter,
  ReportPeriod,
} from '../../services/reportingService';

const REPORT_PROPERTY_SESSION_KEY = 'shortlet-report-property-id';
const CHANNELS = Object.keys(CHANNEL_CONFIG) as Channel[];

function compactCurrency(cents: number): string {
  return new Intl.NumberFormat('en-MT', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format((cents || 0) / 100);
}

function shortDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('en-MT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function signedPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function comparisonNote(
  current: number,
  previous: number,
  previousYear: number
): string {
  if (previous === 0) return `No ${previousYear} data`;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return `${previousYear}: ${formatCents(previous)} · ${signedPercent(pct)}`;
}

function ChangeValue({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-[#8a827d]">No previous data</span>;
  }
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold ${
        positive ? 'text-[#1f7a58]' : 'text-[#b13a40]'
      }`}
    >
      {positive ? (
        <ArrowUpRight className="h-3.5 w-3.5" />
      ) : (
        <ArrowDownRight className="h-3.5 w-3.5" />
      )}
      {signedPercent(value)}
    </span>
  );
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
      <p className="mt-2 text-[11px] font-medium leading-4 text-[#756e69]">
        {note}
      </p>
    </article>
  );
}

function Panel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-[#e7e1dd] bg-white p-4 shadow-[0_10px_28px_rgba(52,42,37,0.06)]">
      <div className="mb-4 flex flex-col gap-3 border-b border-[#eee8e5] pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-extrabold tracking-[-0.01em] text-[#262220]">
            {title}
          </h3>
          <p className="mt-1 text-[11px] font-medium text-[#756e69]">
            {subtitle}
          </p>
        </div>
        {action}
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
  const openModal = useDashboardStore((state) => state.openModal);
  const properties = usePropertyStore((state) => state.properties);

  const reportProperties = useMemo(() => {
    const usedIds = new Set([
      ...bookings.map((booking) => booking.propertyId),
      ...expenses.map((expense) => expense.propertyId),
      ...extraIncomes.map((income) => income.propertyId),
    ]);
    const relevant = properties.filter(
      (property) => property.active || usedIds.has(property.id)
    );
    return relevant.length > 0 ? relevant : properties;
  }, [bookings, expenses, extraIncomes, properties]);

  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [platform, setPlatform] = useState<ReportChannel>('all');
  const [propertyId, setPropertyId] = useState<string | 'all'>(() => {
    const requested =
      typeof window === 'undefined'
        ? null
        : sessionStorage.getItem(REPORT_PROPERTY_SESSION_KEY);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(REPORT_PROPERTY_SESSION_KEY);
    }
    return requested && reportProperties.some((property) => property.id === requested)
      ? requested
      : 'all';
  });

  useEffect(() => {
    if (
      propertyId !== 'all' &&
      !reportProperties.some((property) => property.id === propertyId)
    ) {
      setPropertyId('all');
    }
  }, [propertyId, reportProperties]);

  const currentCalendarYear = new Date().getFullYear();
  const throughMonth =
    period === 'yearly' && selectedYear === currentCalendarYear
      ? selectedMonth
      : 12;
  const filter: ReportFilter = {
    period,
    year: selectedYear,
    month: selectedMonth,
    throughMonth,
    propertyId,
  };

  const summary = useMemo(
    () =>
      calculateReportSummary(
        bookings,
        expenses,
        extraIncomes,
        filter,
        reportProperties
      ),
    [
      bookings,
      expenses,
      extraIncomes,
      period,
      selectedYear,
      selectedMonth,
      throughMonth,
      propertyId,
      reportProperties,
    ]
  );

  const yearComparison = useMemo(
    () =>
      period === 'yearly'
        ? calculateYearComparison(
            bookings,
            expenses,
            extraIncomes,
            selectedYear,
            throughMonth,
            propertyId,
            reportProperties
          )
        : null,
    [
      bookings,
      expenses,
      extraIncomes,
      period,
      selectedYear,
      throughMonth,
      propertyId,
      reportProperties,
    ]
  );

  const monthlySeries = useMemo(
    () =>
      buildMonthlyFinancialSeries(
        bookings,
        expenses,
        extraIncomes,
        selectedYear,
        propertyId,
        reportProperties,
        throughMonth
      ),
    [
      bookings,
      expenses,
      extraIncomes,
      selectedYear,
      throughMonth,
      propertyId,
      reportProperties,
    ]
  );
  const highlights = useMemo(
    () => getYearHighlights(monthlySeries),
    [monthlySeries]
  );

  const propertyFinancialSeries = useMemo(
    () =>
      buildPropertyFinancialSeries(
        bookings,
        expenses,
        extraIncomes,
        filter,
        reportProperties
      ).map((item) => ({
        ...item,
        expensesDisplayCents: -item.totalExpensesCents,
      })),
    [
      bookings,
      expenses,
      extraIncomes,
      period,
      selectedYear,
      selectedMonth,
      propertyId,
      reportProperties,
    ]
  );

  const yearOverYearSeries = useMemo(
    () =>
      buildYearOverYearMonthlySeries(
        bookings,
        expenses,
        extraIncomes,
        selectedYear,
        throughMonth,
        propertyId,
        reportProperties
      ),
    [
      bookings,
      expenses,
      extraIncomes,
      selectedYear,
      throughMonth,
      propertyId,
      reportProperties,
    ]
  );

  const channelSeries = useMemo(
    () => buildChannelFinancialSeries(bookings, filter, reportProperties),
    [
      bookings,
      period,
      selectedYear,
      selectedMonth,
      throughMonth,
      propertyId,
      reportProperties,
    ]
  );
  const expenseSeries = useMemo(
    () => buildExpenseSeries(expenses, filter, reportProperties),
    [
      expenses,
      period,
      selectedYear,
      selectedMonth,
      throughMonth,
      propertyId,
      reportProperties,
    ]
  );
  const propertyRanking = useMemo(
    () =>
      period === 'yearly'
        ? buildPropertyAnnualRanking(
            bookings,
            expenses,
            extraIncomes,
            selectedYear,
            throughMonth,
            reportProperties
          )
        : [],
    [
      bookings,
      expenses,
      extraIncomes,
      period,
      selectedYear,
      throughMonth,
      reportProperties,
    ]
  );
  const propertyMonthlyPerformance = useMemo(
    () =>
      period === 'yearly' && propertyId !== 'all'
        ? buildPropertyMonthlyPerformance(
            bookings,
            expenses,
            extraIncomes,
            selectedYear,
            throughMonth,
            propertyId,
            reportProperties
          )
        : [],
    [
      bookings,
      expenses,
      extraIncomes,
      period,
      selectedYear,
      throughMonth,
      propertyId,
      reportProperties,
    ]
  );
  const channelMonthlySeries = useMemo(
    () =>
      buildChannelMonthlySeries(
        bookings,
        selectedYear,
        throughMonth,
        propertyId,
        reportProperties
      ),
    [bookings, selectedYear, throughMonth, propertyId, reportProperties]
  );
  const selectedChannelComparison = useMemo(
    () =>
      platform === 'all'
        ? []
        : buildChannelYearComparisonSeries(
            bookings,
            selectedYear,
            throughMonth,
            propertyId,
            platform,
            reportProperties
          ),
    [
      bookings,
      selectedYear,
      throughMonth,
      propertyId,
      platform,
      reportProperties,
    ]
  );
  const propertyChannelMatrix = useMemo(
    () =>
      period === 'yearly' && propertyId === 'all'
        ? buildPropertyChannelMatrix(
            bookings,
            selectedYear,
            throughMonth,
            reportProperties
          )
        : [],
    [
      bookings,
      period,
      selectedYear,
      throughMonth,
      propertyId,
      reportProperties,
    ]
  );
  const bookingDetails = useMemo(
    () =>
      buildBookingReportDetails(
        bookings,
        filter,
        platform,
        reportProperties
      ),
    [
      bookings,
      period,
      selectedYear,
      selectedMonth,
      throughMonth,
      propertyId,
      platform,
      reportProperties,
    ]
  );

  const propertyOptions = [
    { value: 'all', label: 'All Properties' },
    ...reportProperties.map((property) => ({
      value: property.id,
      label: `${property.name}${property.active ? '' : ' · Inactive'}`,
    })),
  ];
  const platformOptions = [
    { value: 'all', label: 'All Platforms' },
    ...CHANNELS.map((channel) => ({
      value: channel,
      label: CHANNEL_CONFIG[channel].name,
    })),
  ];
  const selectedPlatformLabel =
    platform === 'all' ? 'All Platforms' : CHANNEL_CONFIG[platform].name;
  const periodLabel =
    period === 'yearly'
      ? throughMonth < 12
        ? `January–${MONTH_NAMES[throughMonth - 1]} ${selectedYear}`
        : `${selectedYear} full year`
      : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
  const topProperty = propertyRanking[0] ?? null;
  const channelTotalCents = channelSeries.reduce(
    (sum, item) => sum + item.bookingIncomeCents,
    0
  );

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
            <div className="grid gap-2 sm:grid-cols-3">
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
                onChange={(value: string | number) =>
                  setPropertyId(value as string | 'all')
                }
                options={propertyOptions}
                className="w-full sm:w-56"
              />
              <CustomSelect
                value={platform}
                onChange={(value: string | number) =>
                  setPlatform(value as ReportChannel)
                }
                options={platformOptions}
                className="w-full sm:w-48"
              />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            label={period === 'yearly' ? 'Net Profit' : 'Net Balance'}
            value={formatCents(summary.netBalanceCents)}
            note={
              yearComparison
                ? comparisonNote(
                    yearComparison.current.netBalanceCents,
                    yearComparison.previous.netBalanceCents,
                    selectedYear - 1
                  )
                : 'Income minus expenses'
            }
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
            note={
              yearComparison
                ? comparisonNote(
                    yearComparison.current.bookingIncomeCents,
                    yearComparison.previous.bookingIncomeCents,
                    selectedYear - 1
                  )
                : `${summary.bookingCount} confirmed bookings`
            }
            icon={<TrendingUp className="h-4 w-4" />}
            tone={{ surface: '#fff1f0', border: '#ffc8c4', accent: '#c73e44' }}
          />
          {period === 'yearly' ? (
            <MetricCard
              label="Best Month"
              value={highlights.bestMonth?.label ?? '—'}
              note={
                highlights.bestMonth
                  ? `${formatCents(highlights.bestMonth.netBalanceCents)} net profit`
                  : 'No yearly data'
              }
              icon={<Trophy className="h-4 w-4" />}
              tone={{ surface: '#fff8ea', border: '#ead6a8', accent: '#8a5c10' }}
            />
          ) : (
            <MetricCard
              label="ADR"
              value={formatCents(summary.adrCents)}
              note={`RevPAR: ${formatCents(summary.revParCents)}`}
              icon={<Building2 className="h-4 w-4" />}
              tone={{ surface: '#fff8ea', border: '#ead6a8', accent: '#8a5c10' }}
            />
          )}
          <MetricCard
            label="Occupancy"
            value={`${summary.occupancyRatePct.toFixed(1)}%`}
            note={
              yearComparison
                ? `${selectedYear - 1}: ${yearComparison.previous.occupancyRatePct.toFixed(
                    1
                  )}% · ${yearComparison.occupancyDeltaPoints > 0 ? '+' : ''}${yearComparison.occupancyDeltaPoints.toFixed(1)} pts`
                : `${summary.occupiedNights} / ${summary.availableNights} nights`
            }
            icon={<BedDouble className="h-4 w-4" />}
            tone={{ surface: '#f4eef9', border: '#d8c4e8', accent: '#6a4b8d' }}
          />
          <MetricCard
            label="Expenses"
            value={formatCents(summary.totalExpensesCents)}
            note="Rent and operating costs"
            icon={<ReceiptText className="h-4 w-4" />}
            tone={{ surface: '#fff4f3', border: '#efc7c4', accent: '#a9363c' }}
          />
          <MetricCard
            label="Extra Income"
            value={formatCents(summary.extraIncomeCents)}
            note={
              period === 'yearly' && topProperty
                ? `Top property: ${topProperty.propertyName}`
                : 'Additional income'
            }
            icon={<CircleDollarSign className="h-4 w-4" />}
            tone={{ surface: '#f7f6f4', border: '#ddd8d4', accent: '#4e4946' }}
          />
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <Panel
            title={
              period === 'yearly'
                ? 'Year-over-Year Net Profit'
                : 'Financial Performance'
            }
            subtitle={
              period === 'yearly'
                ? `${selectedYear} compared with the same period in ${selectedYear - 1}`
                : 'Booking income, extra income, expenses and net balance by property'
            }
          >
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {period === 'yearly' ? (
                  <BarChart data={yearOverYearSeries}>
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
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#5f5955' }} />
                    <Bar
                      dataKey="previousNetCents"
                      name={`${selectedYear - 1} Net Profit`}
                      fill="#c9c3bf"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="currentNetCents"
                      name={`${selectedYear} Net Profit`}
                      fill="#ff5a5f"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                ) : (
                  <ComposedChart data={propertyFinancialSeries}>
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
                )}
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel
            title="Booking Channel Mix"
            subtitle="Confirmed reservation income by platform"
          >
            {channelSeries.length ? (
              <div className="grid min-h-[360px] grid-rows-[250px_auto] gap-3">
                <div className="relative h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={channelSeries}
                        dataKey="bookingIncomeCents"
                        nameKey="label"
                        innerRadius="50%"
                        outerRadius="78%"
                        paddingAngle={3}
                      >
                        {channelSeries.map((item) => (
                          <Cell
                            key={item.channel}
                            fill={CHANNEL_CONFIG[item.channel].hex}
                          />
                        ))}
                        <LabelList
                          dataKey="incomeSharePct"
                          position="inside"
                          formatter={(value) => `${Number(value).toFixed(0)}%`}
                          fill="#ffffff"
                          fontSize={11}
                          fontWeight={800}
                        />
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCents(value)}
                        contentStyle={tooltipStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#817975]">
                        Total
                      </span>
                      <strong className="mt-1 block font-mono text-lg font-extrabold text-[#292422]">
                        {formatCents(channelTotalCents)}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-1">
                  {channelSeries.map((item) => (
                    <div
                      key={item.channel}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#eee8e5] bg-[#fffdfc] px-3 py-2"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-[#3c3734]">
                        <span
                          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                          style={{
                            backgroundColor: CHANNEL_CONFIG[item.channel].hex,
                          }}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <span className="text-right">
                        <strong className="block font-mono text-xs text-[#292422]">
                          {formatCents(item.bookingIncomeCents)}
                        </strong>
                        <small className="block text-[9px] font-bold text-[#817975]">
                          {item.incomeSharePct.toFixed(1)}%
                        </small>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-[360px] items-center justify-center text-sm font-medium text-[#817975]">
                No confirmed platform income for this selection.
              </div>
            )}
          </Panel>
        </div>

        {period === 'yearly' && propertyId === 'all' && (
          <Panel
            title="Property Performance"
            subtitle="Annual properties ranked by net profit"
          >
            {topProperty && (
              <div className="mb-3 flex flex-col gap-2 rounded-xl border border-[#b8dfcf] bg-[#eef8f3] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#39745e]">
                    Top Performing Property
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-[#203f34]">
                    {topProperty.propertyName}
                  </p>
                </div>
                <strong className="font-mono text-lg text-[#1f7a58]">
                  {formatCents(topProperty.netBalanceCents)}
                </strong>
              </div>
            )}

            <div className="hidden overflow-x-auto md:block">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[1.4fr_repeat(3,0.9fr)_0.8fr_0.8fr_1fr] gap-3 border-b border-[#eee8e5] bg-[#fffaf9] px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-[#817873]">
                  <span>Property</span>
                  <span>Booking Income</span>
                  <span>Expenses</span>
                  <span>Net Profit</span>
                  <span>Vs Previous</span>
                  <span>Best Month</span>
                  <span>Top Platform</span>
                </div>
                {propertyRanking.map((item) => (
                  <div
                    key={item.propertyId}
                    className="grid grid-cols-[1.4fr_repeat(3,0.9fr)_0.8fr_0.8fr_1fr] items-center gap-3 border-b border-[#f0ebe8] px-3 py-3 text-xs last:border-b-0"
                  >
                    <div className="min-w-0">
                      <strong className="block truncate text-[#292422]">
                        {item.propertyName}
                      </strong>
                      {!item.active && (
                        <span className="text-[10px] font-semibold text-[#9a918c]">
                          Inactive
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-[#3c3734]">
                      {formatCents(item.bookingIncomeCents)}
                    </span>
                    <span className="font-mono text-[#a13b40]">
                      {formatCents(item.totalExpensesCents)}
                    </span>
                    <span
                      className={`font-mono font-extrabold ${
                        item.netBalanceCents >= 0
                          ? 'text-[#1f7a58]'
                          : 'text-[#b13a40]'
                      }`}
                    >
                      {formatCents(item.netBalanceCents)}
                    </span>
                    <ChangeValue value={item.netChangePct} />
                    <span>{item.bestMonth?.label ?? '—'}</span>
                    <span>
                      {item.topChannel
                        ? `${CHANNEL_CONFIG[item.topChannel].name} · ${item.topChannelSharePct.toFixed(
                            1
                          )}%`
                        : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 md:hidden">
              {propertyRanking.map((item) => (
                <article
                  key={item.propertyId}
                  className="rounded-xl border border-[#e8e1dd] bg-[#fffdfc] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong className="text-sm text-[#292422]">
                        {item.propertyName}
                      </strong>
                      {!item.active && (
                        <span className="ml-2 text-[10px] text-[#9a918c]">
                          Inactive
                        </span>
                      )}
                    </div>
                    <strong
                      className={`font-mono text-sm ${
                        item.netBalanceCents >= 0
                          ? 'text-[#1f7a58]'
                          : 'text-[#b13a40]'
                      }`}
                    >
                      {formatCents(item.netBalanceCents)}
                    </strong>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <span>Previous year</span>
                    <span className="text-right">
                      <ChangeValue value={item.netChangePct} />
                    </span>
                    <span>Best month</span>
                    <strong className="text-right">{item.bestMonth?.label ?? '—'}</strong>
                    <span>Occupancy</span>
                    <strong className="text-right">
                      {item.occupancyRatePct.toFixed(1)}%
                    </strong>
                    <span>Top platform</span>
                    <strong className="text-right">
                      {item.topChannel
                        ? CHANNEL_CONFIG[item.topChannel].name
                        : '—'}
                    </strong>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        )}

        {period === 'yearly' && propertyId !== 'all' && (
          <Panel
            title="Monthly Property Performance"
            subtitle="Income, expenses and net profit for the selected property"
          >
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-[#b8dfcf] bg-[#eef8f3] p-3 text-xs">
                <span className="block text-[#56776b]">Best month</span>
                <strong className="mt-1 block text-[#1f6b4e]">
                  {highlights.bestMonth
                    ? `${highlights.bestMonth.label} · ${formatCents(
                        highlights.bestMonth.netBalanceCents
                      )}`
                    : 'No data'}
                </strong>
              </div>
              <div className="rounded-xl border border-[#efc7c4] bg-[#fff4f3] p-3 text-xs">
                <span className="block text-[#8c6663]">Lowest month</span>
                <strong className="mt-1 block text-[#a9363c]">
                  {highlights.worstMonth
                    ? `${highlights.worstMonth.label} · ${formatCents(
                        highlights.worstMonth.netBalanceCents
                      )}`
                    : 'No data'}
                </strong>
              </div>
              <div className="rounded-xl border border-[#ddd8d4] bg-[#f7f6f4] p-3 text-xs">
                <span className="block text-[#756e69]">Negative months</span>
                <strong className="mt-1 block text-[#332e2b]">
                  {highlights.negativeMonthCount}
                </strong>
              </div>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[1fr_repeat(4,1fr)] gap-3 border-b border-[#eee8e5] bg-[#fffaf9] px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-[#817873]">
                  <span>Month</span>
                  <span>Booking Income</span>
                  <span>Expenses</span>
                  <span>Net Profit</span>
                  <span>Vs Previous</span>
                </div>
                {propertyMonthlyPerformance.map((item) => (
                  <div
                    key={item.key}
                    className="grid grid-cols-[1fr_repeat(4,1fr)] items-center gap-3 border-b border-[#f0ebe8] px-3 py-3 text-xs last:border-b-0"
                  >
                    <strong>{item.label}</strong>
                    <span className="font-mono">
                      {formatCents(item.bookingIncomeCents)}
                    </span>
                    <span className="font-mono text-[#a13b40]">
                      {formatCents(item.totalExpensesCents)}
                    </span>
                    <span
                      className={`font-mono font-extrabold ${
                        item.netBalanceCents >= 0
                          ? 'text-[#1f7a58]'
                          : 'text-[#b13a40]'
                      }`}
                    >
                      {formatCents(item.netBalanceCents)}
                    </span>
                    <ChangeValue value={item.netChangePct} />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 md:hidden">
              {propertyMonthlyPerformance.map((item) => (
                <article
                  key={item.key}
                  className="rounded-xl border border-[#e8e1dd] p-3 text-xs"
                >
                  <div className="flex justify-between">
                    <strong>{item.label}</strong>
                    <strong
                      className={
                        item.netBalanceCents >= 0
                          ? 'text-[#1f7a58]'
                          : 'text-[#b13a40]'
                      }
                    >
                      {formatCents(item.netBalanceCents)}
                    </strong>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-[#756e69]">
                    <span>Income</span>
                    <span className="text-right">
                      {formatCents(item.bookingIncomeCents)}
                    </span>
                    <span>Expenses</span>
                    <span className="text-right">
                      {formatCents(item.totalExpensesCents)}
                    </span>
                    <span>Previous year</span>
                    <span className="text-right">
                      <ChangeValue value={item.netChangePct} />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        )}

        <Panel
          title="Platform Performance"
          subtitle="Confirmed reservations, nights and income by booking platform"
          action={
            platform !== 'all' ? (
              <button
                type="button"
                onClick={() => setPlatform('all')}
                className="text-xs font-bold text-[#c73e44]"
              >
                Show all platforms
              </button>
            ) : undefined
          }
        >
          {channelSeries.length ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[960px]">
                  <div className="grid grid-cols-[1.1fr_repeat(7,0.9fr)] gap-3 border-b border-[#eee8e5] bg-[#fffaf9] px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-[#817873]">
                    <span>Platform</span>
                    <span>Reservations</span>
                    <span>Nights</span>
                    <span>Income</span>
                    <span>Avg Booking</span>
                    <span>Avg Stay</span>
                    <span>Share</span>
                    <span>Vs Previous</span>
                  </div>
                  {channelSeries.map((item) => (
                    <button
                      type="button"
                      key={item.channel}
                      onClick={() => setPlatform(item.channel)}
                      className={`grid w-full grid-cols-[1.1fr_repeat(7,0.9fr)] items-center gap-3 border-b border-[#f0ebe8] px-3 py-3 text-left text-xs transition-colors last:border-b-0 ${
                        platform === item.channel
                          ? 'bg-[#fff0ef]'
                          : 'hover:bg-[#fffaf9]'
                      }`}
                    >
                      <span className="flex items-center gap-2 font-extrabold">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: CHANNEL_CONFIG[item.channel].hex,
                          }}
                        />
                        {item.label}
                      </span>
                      <span>{item.bookingCount}</span>
                      <span>{item.occupiedNights}</span>
                      <span className="font-mono font-extrabold">
                        {formatCents(item.bookingIncomeCents)}
                        {item.provisionalIncomeCents > 0 && (
                          <small className="mt-0.5 block text-[9px] font-semibold text-[#8a827d]">
                            Pending {formatCents(item.provisionalIncomeCents)}
                          </small>
                        )}
                      </span>
                      <span className="font-mono">
                        {formatCents(item.averageBookingCents)}
                      </span>
                      <span>{item.averageStayNights.toFixed(1)} nights</span>
                      <span>{item.incomeSharePct.toFixed(1)}%</span>
                      <span className="flex items-center justify-between gap-2">
                        <ChangeValue value={item.incomeChangePct} />
                        <ChevronRight className="h-3.5 w-3.5 text-[#aaa19c]" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 md:hidden">
                {channelSeries.map((item) => (
                  <button
                    type="button"
                    key={item.channel}
                    onClick={() => setPlatform(item.channel)}
                    className={`w-full rounded-xl border p-3 text-left ${
                      platform === item.channel
                        ? 'border-[#ffb9b5] bg-[#fff0ef]'
                        : 'border-[#e8e1dd] bg-[#fffdfc]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex items-center gap-2 font-extrabold">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: CHANNEL_CONFIG[item.channel].hex,
                          }}
                        />
                        {item.label}
                      </span>
                      <strong className="font-mono">
                        {formatCents(item.bookingIncomeCents)}
                      </strong>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#6f6763]">
                      <span>{item.bookingCount} reservations</span>
                      <span className="text-right">
                        {item.occupiedNights} nights
                      </span>
                      <span>Average {formatCents(item.averageBookingCents)}</span>
                      <span className="text-right">
                        {item.incomeSharePct.toFixed(1)}% share
                      </span>
                      <span>Previous year</span>
                      <span className="text-right">
                        <ChangeValue value={item.incomeChangePct} />
                      </span>
                    </div>
                    {item.provisionalIncomeCents > 0 && (
                      <p className="mt-2 text-[10px] font-semibold text-[#8a827d]">
                        Pending requests: {formatCents(item.provisionalIncomeCents)}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="py-10 text-center text-sm font-medium text-[#817975]">
              No confirmed platform reservations for this selection.
            </div>
          )}
        </Panel>

        {period === 'yearly' && (
          <Panel
            title="Platform Income by Month"
            subtitle={
              platform === 'all'
                ? 'Monthly confirmed income split by platform'
                : `${selectedPlatformLabel}: ${selectedYear} compared with ${selectedYear - 1}`
            }
          >
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {platform === 'all' ? (
                  <BarChart data={channelMonthlySeries}>
                    <CartesianGrid stroke="#ece7e3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#625b57', fontSize: 10, fontWeight: 600 }}
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
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="airbnbCents"
                      name="Airbnb"
                      stackId="platform"
                      fill={CHANNEL_CONFIG.airbnb.hex}
                    />
                    <Bar
                      dataKey="bookingComCents"
                      name="Booking.com"
                      stackId="platform"
                      fill={CHANNEL_CONFIG.booking_com.hex}
                    />
                    <Bar
                      dataKey="directCents"
                      name="Direct"
                      stackId="platform"
                      fill={CHANNEL_CONFIG.direct.hex}
                    />
                    <Bar
                      dataKey="vrboCents"
                      name="VRBO"
                      stackId="platform"
                      fill={CHANNEL_CONFIG.vrbo.hex}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                ) : (
                  <BarChart data={selectedChannelComparison}>
                    <CartesianGrid stroke="#ece7e3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#625b57', fontSize: 10, fontWeight: 600 }}
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
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="previousIncomeCents"
                      name={`${selectedYear - 1} Income`}
                      fill="#c9c3bf"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="currentIncomeCents"
                      name={`${selectedYear} Income`}
                      fill={CHANNEL_CONFIG[platform].hex}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </Panel>
        )}

        {period === 'yearly' && propertyId === 'all' && (
          <Panel
            title="Property × Platform"
            subtitle="Which platform brings income to each property"
          >
            <div className="hidden overflow-x-auto md:block">
              <div className="min-w-[820px]">
                <div className="grid grid-cols-[1.3fr_repeat(5,1fr)] gap-3 border-b border-[#eee8e5] bg-[#fffaf9] px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-[#817873]">
                  <span>Property</span>
                  <span>Airbnb</span>
                  <span>Booking.com</span>
                  <span>Direct</span>
                  <span>VRBO</span>
                  <span>Total</span>
                </div>
                {propertyChannelMatrix.map((item) => (
                  <div
                    key={item.propertyId}
                    className="grid grid-cols-[1.3fr_repeat(5,1fr)] items-center gap-3 border-b border-[#f0ebe8] px-3 py-3 text-xs last:border-b-0"
                  >
                    <div>
                      <strong>{item.propertyName}</strong>
                      <small className="mt-0.5 block text-[9px] text-[#8a827d]">
                        {item.topChannel
                          ? `Top: ${CHANNEL_CONFIG[item.topChannel].name} · ${item.topChannelSharePct.toFixed(
                              1
                            )}%`
                          : 'No platform income'}
                      </small>
                    </div>
                    <span className="font-mono">
                      {formatCents(item.airbnbCents)}
                    </span>
                    <span className="font-mono">
                      {formatCents(item.bookingComCents)}
                    </span>
                    <span className="font-mono">
                      {formatCents(item.directCents)}
                    </span>
                    <span className="font-mono">
                      {formatCents(item.vrboCents)}
                    </span>
                    <strong className="font-mono">
                      {formatCents(item.totalCents)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 md:hidden">
              {propertyChannelMatrix.map((item) => (
                <article
                  key={item.propertyId}
                  className="rounded-xl border border-[#e8e1dd] p-3"
                >
                  <div className="flex justify-between gap-3">
                    <strong>{item.propertyName}</strong>
                    <strong className="font-mono">
                      {formatCents(item.totalCents)}
                    </strong>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-[#756e69]">
                    <span>Airbnb</span>
                    <span className="text-right">
                      {formatCents(item.airbnbCents)}
                    </span>
                    <span>Booking.com</span>
                    <span className="text-right">
                      {formatCents(item.bookingComCents)}
                    </span>
                    <span>Direct</span>
                    <span className="text-right">
                      {formatCents(item.directCents)}
                    </span>
                    <span>VRBO</span>
                    <span className="text-right">
                      {formatCents(item.vrboCents)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        )}

        <Panel
          title={`${selectedPlatformLabel} Reservations`}
          subtitle="Click a reservation to open its existing booking record"
        >
          {bookingDetails.length ? (
            <>
              <div className="hidden max-h-[430px] overflow-auto md:block">
                <div className="min-w-[820px]">
                  <div className="sticky top-0 grid grid-cols-[1.2fr_1.2fr_0.9fr_1.4fr_0.6fr_0.9fr] gap-3 border-b border-[#eee8e5] bg-[#fffaf9] px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-[#817873]">
                    <span>Guest</span>
                    <span>Property</span>
                    <span>Platform</span>
                    <span>Stay</span>
                    <span>Nights</span>
                    <span>Amount</span>
                  </div>
                  {bookingDetails.map((item) => (
                    <button
                      type="button"
                      key={item.bookingId}
                      onClick={() =>
                        openModal('booking_edit', { bookingId: item.bookingId })
                      }
                      className="grid w-full grid-cols-[1.2fr_1.2fr_0.9fr_1.4fr_0.6fr_0.9fr] items-center gap-3 border-b border-[#f0ebe8] px-3 py-3 text-left text-xs transition-colors last:border-b-0 hover:bg-[#fffaf9]"
                    >
                      <strong className="truncate">{item.guestName}</strong>
                      <span className="truncate">{item.propertyName}</span>
                      <span>{CHANNEL_CONFIG[item.channel].name}</span>
                      <span>
                        {shortDate(item.checkInDate)} – {shortDate(item.checkOutDate)}
                      </span>
                      <span>{item.nights}</span>
                      <strong className="font-mono">
                        {formatCents(item.amountCents)}
                      </strong>
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-[520px] space-y-2 overflow-y-auto md:hidden">
                {bookingDetails.map((item) => (
                  <button
                    type="button"
                    key={item.bookingId}
                    onClick={() =>
                      openModal('booking_edit', { bookingId: item.bookingId })
                    }
                    className="w-full rounded-xl border border-[#e8e1dd] p-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block truncate">{item.guestName}</strong>
                        <span className="mt-0.5 block truncate text-[10px] text-[#817975]">
                          {item.propertyName} · {CHANNEL_CONFIG[item.channel].name}
                        </span>
                      </div>
                      <strong className="font-mono text-sm">
                        {formatCents(item.amountCents)}
                      </strong>
                    </div>
                    <p className="mt-2 text-[11px] text-[#756e69]">
                      {shortDate(item.checkInDate)} – {shortDate(item.checkOutDate)} ·{' '}
                      {item.nights} nights
                    </p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="py-10 text-center text-sm font-medium text-[#817975]">
              No confirmed reservations for this platform and period.
            </div>
          )}
        </Panel>

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
                  <Bar
                    dataKey="amountCents"
                    fill="#d86166"
                    radius={[0, 5, 5, 0]}
                  />
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
