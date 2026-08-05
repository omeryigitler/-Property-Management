import React from 'react';
import { BarChart3, BedDouble, Building2, CalendarRange, CircleDollarSign, Layers3, ReceiptText, TrendingUp, Trophy, WalletCards } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCents } from '../../utils/currency';
import { CustomSelect } from '../common/CustomSelect';
import { ChannelMixPanel } from './reports/ChannelMixPanel';
import { PlatformMonthlyChart } from './reports/PlatformMonthlyChart';
import { PlatformPerformancePanel } from './reports/PlatformPerformancePanel';
import { MonthlyPropertyPerformancePanel } from './reports/MonthlyPropertyPerformancePanel';
import { PropertyPerformancePanel } from './reports/PropertyPerformancePanel';
import { PropertyPlatformPanel } from './reports/PropertyPlatformPanel';
import { ExpenseBreakdownPanel, ReservationDetailsPanel } from './reports/ReservationExpenseReports';
import { compactCurrency, comparisonNote, MetricCard, Panel, tooltipStyle } from './reports/reportUi';
import { useReportsDashboardData } from './reports/useReportsDashboardData';

export function ReportsDashboard() {
  const data = useReportsDashboardData();
  const topProperty = data.propertyRanking[0] ?? null;
  return (
    <div className="h-full min-h-0 overflow-y-auto pb-4 no-scrollbar">
      <div className="space-y-4">
        <section className="rounded-2xl border border-[#e7e1dd] bg-white p-4 shadow-[0_10px_28px_rgba(52,42,37,0.06)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3"><div className="rounded-xl border border-[#ffc9c5] bg-[#fff0ef] p-2.5 text-[#c73e44]"><BarChart3 className="h-5 w-5" /></div><div><h2 className="text-lg font-extrabold tracking-[-0.025em] text-[#24201f]">Reports & Analytics</h2><p className="mt-0.5 text-[11px] font-semibold text-[#756e69]">{data.periodLabel}</p></div></div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid grid-cols-2 rounded-xl border border-[#ddd6d2] bg-[#f7f4f2] p-1">
                <button type="button" onClick={() => data.setPeriod('monthly')} className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${data.period === 'monthly' ? 'bg-[#ff5a5f] text-white shadow-sm' : 'text-[#5f5955] hover:bg-white'}`}><CalendarRange className="h-3.5 w-3.5" /> Monthly</button>
                <button type="button" onClick={() => data.setPeriod('yearly')} className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${data.period === 'yearly' ? 'bg-[#ff5a5f] text-white shadow-sm' : 'text-[#5f5955] hover:bg-white'}`}><Layers3 className="h-3.5 w-3.5" /> Yearly</button>
              </div>
              <div data-report-filter="property"><CustomSelect value={data.propertyId} onChange={(value: string | number) => data.setPropertyId(value as string | 'all')} options={data.propertyOptions} className="w-full sm:w-56" /></div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard label={data.period === 'yearly' ? 'Net Profit' : 'Net Balance'} value={formatCents(data.summary.netBalanceCents)} note={data.yearComparison ? comparisonNote(data.yearComparison.current.netBalanceCents, data.yearComparison.previous.netBalanceCents, data.selectedYear - 1) : 'Total income minus expenses'} icon={<WalletCards className="h-4 w-4" />} tone={data.summary.netBalanceCents >= 0 ? { surface: '#eef8f3', border: '#b8dfcf', accent: '#1f7a58' } : { surface: '#fff1f0', border: '#f0c2bf', accent: '#b13a40' }} />
          <MetricCard label="Booking Income" value={formatCents(data.summary.bookingIncomeCents)} note={data.yearComparison ? comparisonNote(data.yearComparison.current.bookingIncomeCents, data.yearComparison.previous.bookingIncomeCents, data.selectedYear - 1) : `${data.summary.bookingCount} confirmed bookings`} icon={<TrendingUp className="h-4 w-4" />} tone={{ surface: '#fff1f0', border: '#ffc8c4', accent: '#c73e44' }} />
          {data.period === 'yearly' ? <MetricCard label="Best Month" value={data.highlights.bestMonth?.label ?? '—'} note={data.highlights.bestMonth ? `${formatCents(data.highlights.bestMonth.netBalanceCents)} net profit` : 'No yearly data'} icon={<Trophy className="h-4 w-4" />} tone={{ surface: '#fff8ea', border: '#ead6a8', accent: '#8a5c10' }} /> : <MetricCard label="ADR" value={formatCents(data.summary.adrCents)} note={`RevPAR: ${formatCents(data.summary.revParCents)}`} icon={<Building2 className="h-4 w-4" />} tone={{ surface: '#fff8ea', border: '#ead6a8', accent: '#8a5c10' }} />}
          <MetricCard label="Occupancy" value={`${data.summary.occupancyRatePct.toFixed(1)}%`} note={data.yearComparison ? `${data.selectedYear - 1}: ${data.yearComparison.previous.occupancyRatePct.toFixed(1)}% · ${data.yearComparison.occupancyDeltaPoints > 0 ? '+' : ''}${data.yearComparison.occupancyDeltaPoints.toFixed(1)} pts` : `${data.summary.occupiedNights} / ${data.summary.availableNights} nights`} icon={<BedDouble className="h-4 w-4" />} tone={{ surface: '#f4eef9', border: '#d8c4e8', accent: '#6a4b8d' }} />
          <MetricCard label="Expenses" value={formatCents(data.summary.totalExpensesCents)} note="Rent and operating costs" icon={<ReceiptText className="h-4 w-4" />} tone={{ surface: '#fff4f3', border: '#efc7c4', accent: '#a9363c' }} />
          <MetricCard label="Extra Income" value={formatCents(data.summary.extraIncomeCents)} note={data.period === 'yearly' && topProperty ? `Top property: ${topProperty.propertyName}` : 'Additional income'} icon={<CircleDollarSign className="h-4 w-4" />} tone={{ surface: '#f7f6f4', border: '#ddd8d4', accent: '#4e4946' }} />
        </div>
        <p className="px-1 text-[10px] font-medium text-[#8a827d]">Occupancy assumes each selected property was available throughout the selected period.</p>

        <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
          <Panel title={data.period === 'yearly' ? 'Year-over-Year Net Profit' : 'Financial Performance'} subtitle={data.period === 'yearly' ? `${data.selectedYear} compared with the same period in ${data.selectedYear - 1}` : 'Booking income, extra income, expenses and net balance by property'}>
            <div className="h-[360px] w-full"><ResponsiveContainer width="100%" height="100%">{data.period === 'yearly' ? (
              <BarChart data={data.yearOverYearSeries}><CartesianGrid stroke="#ece7e3" vertical={false} /><XAxis dataKey="label" tick={{ fill: '#625b57', fontSize: 10, fontWeight: 600 }} /><YAxis tickFormatter={compactCurrency} tick={{ fill: '#756e69', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={62} /><Tooltip formatter={(value: number) => formatCents(value)} contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11, color: '#5f5955' }} /><Bar dataKey="previousNetCents" name={`${data.selectedYear - 1} Net Profit`} fill="#c9c3bf" radius={[4, 4, 0, 0]} /><Bar dataKey="currentNetCents" name={`${data.selectedYear} Net Profit`} fill="#ff5a5f" radius={[4, 4, 0, 0]} /></BarChart>
            ) : (
              <ComposedChart data={data.propertyFinancialSeries}><CartesianGrid stroke="#ece7e3" vertical={false} /><XAxis dataKey="label" tick={{ fill: '#625b57', fontSize: 10, fontWeight: 600 }} /><YAxis tickFormatter={compactCurrency} tick={{ fill: '#756e69', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={62} /><Tooltip formatter={(value: number) => formatCents(value)} contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11, color: '#5f5955' }} /><Bar dataKey="bookingIncomeCents" name="Booking Income" fill="#ff7a7f" radius={[4, 4, 0, 0]} /><Bar dataKey="extraIncomeCents" name="Extra Income" fill="#49a77f" radius={[4, 4, 0, 0]} /><Bar dataKey="expensesDisplayCents" name="Expenses" fill="#d86166" radius={[0, 0, 4, 4]} /><Line type="monotone" dataKey="netBalanceCents" name="Net Balance" stroke="#2f2b29" strokeWidth={2.5} dot={{ r: 3, fill: '#2f2b29' }} /></ComposedChart>
            )}</ResponsiveContainer></div>
          </Panel>
          <ChannelMixPanel channelSeries={data.channelSeries} platform={data.platform} setPlatform={data.setPlatform} />
        </div>

        {data.period === 'yearly' && data.propertyId === 'all' && <PropertyPerformancePanel rows={data.propertyRanking} />}
        {data.period === 'yearly' && data.propertyId !== 'all' && <MonthlyPropertyPerformancePanel rows={data.propertyMonthlyPerformance} highlights={data.highlights} />}
        <PlatformPerformancePanel rows={data.channelSeries} platform={data.platform} setPlatform={data.setPlatform} />
        {data.period === 'yearly' && <PlatformMonthlyChart platform={data.platform} selectedYear={data.selectedYear} allPlatformRows={data.channelMonthlySeries} selectedPlatformRows={data.selectedChannelComparison} />}
        {data.period === 'yearly' && data.propertyId === 'all' && <PropertyPlatformPanel rows={data.propertyChannelMatrix} />}
        <ReservationDetailsPanel platform={data.platform} rows={data.bookingDetails} openBooking={data.openBooking} />
        <ExpenseBreakdownPanel rows={data.expenseSeries} />
      </div>
    </div>
  );
}
