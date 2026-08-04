import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart3, Minus, Scale } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { getActiveProperties, usePropertyStore } from '../../store/usePropertyStore';
import { calculatePropertyFinancials } from '../../utils/financeCalculations';
import { calculatePortfolioFinancials } from '../../services/portfolioFinancialService';
import { formatCents } from '../../utils/currency';

interface ProfitCellProps {
  key?: React.Key;
  title: string;
  current: number;
  previous: number;
  compare: boolean;
  total?: boolean;
}

function ProfitCell({ title, current, previous, compare, total = false }: ProfitCellProps) {
  const difference = current - previous;
  const Icon = current > 0 ? ArrowUpRight : current < 0 ? ArrowDownRight : Minus;
  return (
    <div className={`${total ? 'dashboard-total-column border-yellow-800/80 bg-yellow-950/65' : 'dashboard-property-column border-slate-800 bg-slate-950/60'} ledger-report-row flex flex-col justify-center border-r border-b p-2`}>
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-[9px] font-black uppercase tracking-wider text-slate-500">{title}</span>
        <span className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${current > 0 ? 'border-emerald-700 bg-emerald-950 text-emerald-300' : current < 0 ? 'border-rose-700 bg-rose-950 text-rose-300' : 'border-slate-700 bg-slate-800 text-slate-300'}`}>
          <Icon className="h-2.5 w-2.5" />{current > 0 ? 'Profit' : current < 0 ? 'Loss' : 'Even'}
        </span>
      </div>
      <span className={`mt-1 font-mono text-sm font-black ${current >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCents(current)}</span>
      {compare && <span className={`mt-1 text-[9px] font-bold ${difference >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{difference >= 0 ? '+' : ''}{formatCents(difference)} vs previous year</span>}
    </div>
  );
}

export function ProfitabilityReport() {
  const [comparePreviousYear, setComparePreviousYear] = useState(false);
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const bookings = useDashboardStore((state) => state.bookings);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);
  const activeProperties = getActiveProperties(usePropertyStore((state) => state.properties));
  const propertyIds = activeProperties.map((property) => property.id);

  const current = activeProperties.map((property) =>
    calculatePropertyFinancials(property.id, selectedYear, selectedMonth, bookings, expenses, extraIncomes)
  );
  const previous = activeProperties.map((property) =>
    calculatePropertyFinancials(property.id, selectedYear - 1, selectedMonth, bookings, expenses, extraIncomes)
  );
  const currentTotal = calculatePortfolioFinancials(propertyIds, selectedYear, selectedMonth, bookings, expenses, extraIncomes);
  const previousTotal = calculatePortfolioFinancials(propertyIds, selectedYear - 1, selectedMonth, bookings, expenses, extraIncomes);

  return (
    <section className="w-max min-w-full border-t-2 border-cyan-700/70 bg-slate-950 select-none">
      <div className="sticky left-0 z-20 flex min-h-11 w-screen items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2">
        <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-cyan-400" /><h2 className="font-display text-xs font-black uppercase tracking-widest text-cyan-300">Profitability</h2></div>
        <button type="button" onClick={() => setComparePreviousYear((value) => !value)} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase ${comparePreviousYear ? 'border-cyan-600 bg-cyan-950 text-cyan-300' : 'border-slate-700 text-slate-400'}`}>
          <Scale className="h-3.5 w-3.5" /> Compare Previous Year
        </button>
      </div>
      <div className="flex w-max min-w-full">
        <div className="dashboard-day-column ledger-report-row sticky left-0 z-10 flex flex-col justify-center border-r border-b border-slate-800 bg-slate-900 p-2">
          <span className="font-display text-[10px] font-black uppercase text-cyan-300">Property Status</span>
          <span className="mt-1 text-[9px] text-slate-500">{selectedMonth}/{selectedYear}</span>
        </div>
        {activeProperties.map((property, index) => (
          <ProfitCell key={property.id} title={property.name} current={current[index].netBalanceCents} previous={previous[index].netBalanceCents} compare={comparePreviousYear} />
        ))}
        <ProfitCell title="Portfolio Total" current={currentTotal.combinedNetBalanceCents} previous={previousTotal.combinedNetBalanceCents} compare={comparePreviousYear} total />
      </div>
    </section>
  );
}
