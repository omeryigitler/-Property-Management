import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, BedDouble, Building2, CalendarRange, Layers3, ReceiptText, TrendingUp, WalletCards } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
  return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 }).format((cents || 0) / 100);
}

function MetricCard({ label, value, note, icon, tone }: { label: string; value: string; note: string; icon: React.ReactNode; tone: string }) {
  return (
    <div className={`min-w-0 rounded-2xl border p-3.5 shadow-lg ${tone}`}>
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className="mt-1 truncate font-mono text-lg font-black text-slate-50">{value}</p></div><div className="rounded-lg border border-current/20 bg-slate-950/60 p-2">{icon}</div></div>
      <p className="mt-2 truncate text-[10px] text-slate-500">{note}</p>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-xl"><div className="mb-4 border-b border-slate-800 pb-3"><h3 className="text-sm font-display font-black uppercase tracking-wide">{title}</h3><p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p></div>{children}</section>;
}

export function ReportsDashboard() {
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const bookings = useDashboardStore((state) => state.bookings);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);
  const activeProperties = getActiveProperties(usePropertyStore((state) => state.properties));
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [propertyId, setPropertyId] = useState<string | 'all'>(() => {
    const requested = typeof window === 'undefined' ? null : sessionStorage.getItem(REPORT_PROPERTY_SESSION_KEY);
    if (typeof window !== 'undefined') sessionStorage.removeItem(REPORT_PROPERTY_SESSION_KEY);
    return requested && activeProperties.some((property) => property.id === requested) ? requested : 'all';
  });

  useEffect(() => {
    if (propertyId !== 'all' && !activeProperties.some((property) => property.id === propertyId)) setPropertyId('all');
  }, [activeProperties, propertyId]);

  const filter: ReportFilter = { period, year: selectedYear, month: selectedMonth, propertyId };
  const summary = useMemo(() => calculateReportSummary(bookings, expenses, extraIncomes, filter), [bookings, expenses, extraIncomes, period, selectedYear, selectedMonth, propertyId]);
  const financialSeries = useMemo(() => {
    const items = period === 'yearly'
      ? buildMonthlyFinancialSeries(bookings, expenses, extraIncomes, selectedYear, propertyId)
      : buildPropertyFinancialSeries(bookings, expenses, extraIncomes, filter);
    return items.map((item) => ({ ...item, expensesDisplayCents: -item.totalExpensesCents }));
  }, [bookings, expenses, extraIncomes, period, selectedYear, selectedMonth, propertyId]);
  const channelSeries = useMemo(() => buildChannelFinancialSeries(bookings, filter), [bookings, period, selectedYear, selectedMonth, propertyId]);
  const expenseSeries = useMemo(() => buildExpenseSeries(expenses, filter), [expenses, period, selectedYear, selectedMonth, propertyId]);
  const propertyOptions = [{ value: 'all', label: 'All Properties' }, ...activeProperties.map((property) => ({ value: property.id, label: property.name }))];
  const periodLabel = period === 'yearly' ? `${selectedYear} full year` : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  return (
    <div className="h-full min-h-0 overflow-y-auto pb-4 no-scrollbar">
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 shadow-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3"><div className="rounded-xl border border-cyan-800 bg-cyan-950/40 p-2.5 text-cyan-300"><BarChart3 className="h-5 w-5" /></div><div><h2 className="font-display text-lg font-black uppercase">Reports & Analytics</h2><p className="text-[11px] font-bold uppercase text-slate-500">{periodLabel}</p></div></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="grid grid-cols-2 rounded-xl border border-slate-800 bg-slate-900 p-1"><button type="button" onClick={() => setPeriod('monthly')} className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black uppercase ${period === 'monthly' ? 'bg-[#ff3e00] text-white' : 'text-slate-400'}`}><CalendarRange className="h-3.5 w-3.5" /> Monthly</button><button type="button" onClick={() => setPeriod('yearly')} className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black uppercase ${period === 'yearly' ? 'bg-[#ff3e00] text-white' : 'text-slate-400'}`}><Layers3 className="h-3.5 w-3.5" /> Yearly</button></div>
              <CustomSelect value={propertyId} onChange={(value) => setPropertyId(value as string | 'all')} options={propertyOptions} className="w-full sm:w-56" />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Net Balance" value={formatCents(summary.netBalanceCents)} note="Income minus expenses" icon={<WalletCards className="h-4 w-4" />} tone={summary.netBalanceCents >= 0 ? 'border-emerald-900 bg-emerald-950/20 text-emerald-300' : 'border-rose-900 bg-rose-950/20 text-rose-300'} />
          <MetricCard label="Booking Income" value={formatCents(summary.bookingIncomeCents)} note={`${summary.bookingCount} bookings`} icon={<TrendingUp className="h-4 w-4" />} tone="border-cyan-900 bg-cyan-950/20 text-cyan-300" />
          <MetricCard label="Occupancy" value={`${summary.occupancyRatePct.toFixed(1)}%`} note={`${summary.occupiedNights} / ${summary.availableNights} nights`} icon={<BedDouble className="h-4 w-4" />} tone="border-violet-900 bg-violet-950/20 text-violet-300" />
          <MetricCard label="ADR" value={formatCents(summary.adrCents)} note={`RevPAR: ${formatCents(summary.revParCents)}`} icon={<Building2 className="h-4 w-4" />} tone="border-amber-900 bg-amber-950/20 text-amber-300" />
          <MetricCard label="Expenses" value={formatCents(summary.totalExpensesCents)} note="All operating costs" icon={<ReceiptText className="h-4 w-4" />} tone="border-rose-900 bg-rose-950/20 text-rose-300" />
          <MetricCard label="Extra Income" value={formatCents(summary.extraIncomeCents)} note="Additional monthly income" icon={<CalendarRange className="h-4 w-4" />} tone="border-slate-800 bg-slate-950 text-slate-300" />
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <Panel title="Financial Performance" subtitle="Booking income, extra income, expenses and net balance">
            <div className="h-[360px] w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={financialSeries}><CartesianGrid stroke="#1e293b" vertical={false} /><XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} /><YAxis tickFormatter={compactCurrency} tick={{ fill: '#64748b', fontSize: 10 }} width={62} /><Tooltip formatter={(value: number) => formatCents(value)} contentStyle={{ background: '#020617', border: '1px solid #334155', borderRadius: 12 }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="bookingIncomeCents" name="Booking Income" fill="#06b6d4" /><Bar dataKey="extraIncomeCents" name="Extra Income" fill="#10b981" /><Bar dataKey="expensesDisplayCents" name="Expenses" fill="#f43f5e" /><Line type="monotone" dataKey="netBalanceCents" name="Net Balance" stroke="#f8fafc" strokeWidth={2.5} /></ComposedChart></ResponsiveContainer></div>
          </Panel>
          <Panel title="Booking Channel Mix" subtitle="Reservation income by channel">
            <div className="h-[360px] w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={channelSeries} dataKey="bookingIncomeCents" nameKey="label" innerRadius="52%" outerRadius="78%" paddingAngle={3}>{channelSeries.map((item) => <Cell key={item.channel} fill={CHANNEL_CONFIG[item.channel].hex} />)}</Pie><Tooltip formatter={(value: number) => formatCents(value)} contentStyle={{ background: '#020617', border: '1px solid #334155', borderRadius: 12 }} /></PieChart></ResponsiveContainer></div>
          </Panel>
        </div>

        <Panel title="Expense Breakdown" subtitle="Operating costs by category">
          {expenseSeries.length ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={expenseSeries} layout="vertical"><CartesianGrid stroke="#1e293b" horizontal={false} /><XAxis type="number" tickFormatter={compactCurrency} /><YAxis type="category" dataKey="label" width={120} tick={{ fill: '#94a3b8', fontSize: 10 }} /><Tooltip formatter={(value: number) => formatCents(value)} /><Bar dataKey="amountCents" fill="#f43f5e" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div> : <div className="py-12 text-center text-xs text-slate-600">No expenses for this selection.</div>}
        </Panel>
      </div>
    </div>
  );
}
