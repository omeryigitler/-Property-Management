import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart3, Minus, Scale } from 'lucide-react';
import { ALL_PROPERTIES } from '../../config/locations';
import { useDashboardStore } from '../../store/useDashboardStore';
import { PropertyFinancials } from '../../types';
import { calculateAggregatedFinancials, calculatePropertyFinancials } from '../../utils/financeCalculations';
import { formatCents } from '../../utils/currency';

function getProfitCents(financials: PropertyFinancials): number {
  if (financials.netBalanceCents !== null) return financials.netBalanceCents;
  return financials.netBookingIncomeCents + financials.extraIncomeCents - financials.totalExpensesCents;
}

function hasPeriodData(
  propertyId: string,
  year: number,
  month: number,
  bookings: ReturnType<typeof useDashboardStore.getState>['bookings'],
  expenses: ReturnType<typeof useDashboardStore.getState>['expenses'],
  extraIncomes: ReturnType<typeof useDashboardStore.getState>['extraIncomes']
): boolean {
  const monthText = String(month).padStart(2, '0');
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const start = `${year}-${monthText}-01`;
  const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  return (
    bookings.some(
      (booking) =>
        booking.propertyId === propertyId &&
        booking.status !== 'cancelled' &&
        booking.checkInDate < end &&
        booking.checkOutDate > start
    ) ||
    expenses.some(
      (expense) => expense.propertyId === propertyId && expense.year === year && expense.month === month
    ) ||
    extraIncomes.some(
      (income) => income.propertyId === propertyId && income.year === year && income.month === month
    )
  );
}

interface ProfitCellProps {
  title: string;
  currentCents: number;
  previousCents: number;
  showComparison: boolean;
  hasPreviousData: boolean;
  total?: boolean;
}

function ProfitCell({
  title,
  currentCents,
  previousCents,
  showComparison,
  hasPreviousData,
  total = false,
}: ProfitCellProps) {
  const isProfit = currentCents > 0;
  const isLoss = currentCents < 0;
  const difference = currentCents - previousCents;
  const differencePct = previousCents === 0 ? null : (difference / Math.abs(previousCents)) * 100;

  const statusClass = isProfit
    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/70'
    : isLoss
    ? 'bg-rose-950/80 text-rose-300 border-rose-700/70'
    : 'bg-slate-800 text-slate-300 border-slate-700';

  const valueClass = isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-300';
  const StatusIcon = isProfit ? ArrowUpRight : isLoss ? ArrowDownRight : Minus;

  return (
    <div
      className={`${total ? 'dashboard-total-column bg-yellow-950/65 border-yellow-800/80' : 'dashboard-property-column bg-slate-950/60 border-slate-800'} ledger-report-row border-r border-b p-2 flex flex-col justify-center overflow-hidden`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className={`truncate text-[9px] font-black uppercase tracking-wider ${total ? 'text-yellow-200' : 'text-slate-500'}`}>
          {title}
        </span>
        <span className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${statusClass}`}>
          <StatusIcon className="h-2.5 w-2.5" />
          {isProfit ? 'Profitable' : isLoss ? 'Loss' : 'Break-even'}
        </span>
      </div>

      <span className={`mt-1 font-mono text-sm font-black ${valueClass}`}>{formatCents(currentCents)}</span>

      {showComparison && (
        <div className="mt-1 border-t border-slate-800/80 pt-1 text-[9px] font-semibold">
          {hasPreviousData ? (
            <div className="flex items-center justify-between gap-1">
              <span className="text-slate-500">{previousCents === 0 ? 'Previous year' : formatCents(previousCents)}</span>
              <span className={difference >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {difference >= 0 ? '+' : ''}{formatCents(difference)}
                {differencePct !== null ? ` (${differencePct >= 0 ? '+' : ''}${differencePct.toFixed(1)}%)` : ''}
              </span>
            </div>
          ) : (
            <span className="text-slate-600">No previous-year data</span>
          )}
        </div>
      )}
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
  const taxConfig = useDashboardStore((state) => state.taxConfiguration);

  const currentFinancials = ALL_PROPERTIES.map((property) =>
    calculatePropertyFinancials(
      property.id,
      selectedYear,
      selectedMonth,
      bookings,
      expenses,
      extraIncomes,
      taxConfig
    )
  );

  const previousFinancials = ALL_PROPERTIES.map((property) =>
    calculatePropertyFinancials(
      property.id,
      selectedYear - 1,
      selectedMonth,
      bookings,
      expenses,
      extraIncomes,
      taxConfig
    )
  );

  const currentAggregate = calculateAggregatedFinancials(
    selectedYear,
    selectedMonth,
    bookings,
    expenses,
    extraIncomes,
    taxConfig
  );
  const previousAggregate = calculateAggregatedFinancials(
    selectedYear - 1,
    selectedMonth,
    bookings,
    expenses,
    extraIncomes,
    taxConfig
  );

  const currentAggregateProfit =
    currentAggregate.combinedNetBalanceCents ??
    currentAggregate.combinedNetBookingIncomeCents +
      currentAggregate.combinedExtraIncomeCents -
      currentAggregate.combinedExpenseCents;
  const previousAggregateProfit =
    previousAggregate.combinedNetBalanceCents ??
    previousAggregate.combinedNetBookingIncomeCents +
      previousAggregate.combinedExtraIncomeCents -
      previousAggregate.combinedExpenseCents;

  const hasAnyPreviousData = ALL_PROPERTIES.some((property) =>
    hasPeriodData(property.id, selectedYear - 1, selectedMonth, bookings, expenses, extraIncomes)
  );

  return (
    <section className="w-max min-w-full border-t-2 border-cyan-700/70 bg-slate-950 select-none">
      <div className="sticky left-0 z-20 flex min-h-11 w-screen items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-cyan-400" />
          <div>
            <h2 className="font-display text-xs font-black uppercase tracking-widest text-cyan-300">REPORTS · PROFITABILITY</h2>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              Uses net balance when tax is configured; otherwise uses the pre-tax operating result
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setComparePreviousYear((enabled) => !enabled)}
          aria-pressed={comparePreviousYear}
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
            comparePreviousYear
              ? 'border-cyan-600 bg-cyan-950/80 text-cyan-300'
              : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale className="h-3.5 w-3.5" />
          Compare Previous Year
        </button>
      </div>

      <div className="flex w-max min-w-full">
        <div className="dashboard-day-column ledger-report-row sticky left-0 z-10 flex flex-col justify-center border-r border-b border-slate-800 bg-slate-900 p-2">
          <span className="font-display text-[10px] font-black uppercase tracking-wider text-cyan-300">PROPERTY STATUS</span>
          <span className="mt-1 text-[9px] font-semibold text-slate-500">{selectedMonth}/{selectedYear}</span>
        </div>

        {ALL_PROPERTIES.map((property, index) => (
          <ProfitCell
            key={property.id}
            title={property.name}
            currentCents={getProfitCents(currentFinancials[index])}
            previousCents={getProfitCents(previousFinancials[index])}
            showComparison={comparePreviousYear}
            hasPreviousData={hasPeriodData(
              property.id,
              selectedYear - 1,
              selectedMonth,
              bookings,
              expenses,
              extraIncomes
            )}
          />
        ))}

        <ProfitCell
          title="PORTFOLIO TOTAL"
          currentCents={currentAggregateProfit}
          previousCents={previousAggregateProfit}
          showComparison={comparePreviousYear}
          hasPreviousData={hasAnyPreviousData}
          total
        />
      </div>
    </section>
  );
}
