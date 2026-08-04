import React from 'react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { getActiveProperties, usePropertyStore } from '../../store/usePropertyStore';
import { calculatePortfolioFinancials } from '../../services/portfolioFinancialService';
import { formatCents } from '../../utils/currency';
import { isRentExpense, sumExpenses } from '../../utils/expenseUtilities';
import { PropertyFinanceColumn } from './PropertyFinanceColumn';
import { ProfitabilityReport } from './ProfitabilityReport';

export function FinancialGrid() {
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const bookings = useDashboardStore((state) => state.bookings);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);
  const activeProperties = getActiveProperties(usePropertyStore((state) => state.properties));
  const activeIds = new Set(activeProperties.map((property) => property.id));

  const aggregate = calculatePortfolioFinancials(
    activeProperties.map((property) => property.id),
    selectedYear,
    selectedMonth,
    bookings,
    expenses,
    extraIncomes
  );
  const currentExpenses = expenses.filter(
    (expense) =>
      expense.year === selectedYear && expense.month === selectedMonth && activeIds.has(expense.propertyId)
  );
  const rent = sumExpenses(currentExpenses.filter(isRentExpense));
  const other = aggregate.combinedExpenseCents - rent;

  return (
    <div className="mt-2 w-max min-w-full border-t-2 border-[#ff3e00] bg-slate-950 select-none">
      <div className="sticky left-0 z-30 flex min-h-10 w-screen items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2 text-xs font-black text-[#ff3e00]">
        <span className="font-display text-sm uppercase tracking-widest">Monthly Financial Ledger</span>
      </div>
      <div className="flex w-max min-w-full items-stretch">
        <div className="dashboard-day-column sticky left-0 z-20 flex flex-col border-r border-slate-800 bg-slate-900 text-[10px] font-black uppercase tracking-wider text-slate-400">
          <div className="ledger-booking-row flex items-center border-b border-slate-800 p-2">Booking Income</div>
          <div className="ledger-rent-row flex items-center border-b border-slate-800 p-2 text-violet-300">Rent</div>
          <div className="ledger-extra-row flex items-center border-b border-slate-800 p-2 text-emerald-400">Extra Income</div>
          <div className="ledger-expenses-row flex items-center border-b border-slate-800 p-2 text-rose-400">Other Expenses</div>
          <div className="ledger-total-row flex items-center border-b border-slate-800 p-2">Total Expenses</div>
          <div className="ledger-balance-row flex items-center border-b border-slate-800 p-2.5 text-slate-100">Net Balance</div>
        </div>
        {activeProperties.map((property) => (
          <PropertyFinanceColumn key={property.id} propertyId={property.id} />
        ))}
        <div className="dashboard-total-column flex flex-col border-r border-yellow-800/80 bg-yellow-950/60 font-mono text-xs">
          <div className="ledger-booking-row flex flex-col justify-center border-b border-yellow-800/80 p-2 font-black text-emerald-300"><span className="font-sans text-[9px] uppercase text-yellow-200/80">Total Booking</span>{formatCents(aggregate.combinedBookingIncomeCents)}</div>
          <div className="ledger-rent-row flex flex-col justify-center border-b border-yellow-800/80 p-2 font-black text-violet-300">-{formatCents(rent)}</div>
          <div className="ledger-extra-row flex flex-col justify-center border-b border-yellow-800/80 p-2 font-black text-emerald-400">+{formatCents(aggregate.combinedExtraIncomeCents)}</div>
          <div className="ledger-expenses-row flex flex-col justify-center border-b border-yellow-800/80 p-2 font-black text-rose-300">-{formatCents(other)}</div>
          <div className="ledger-total-row flex flex-col justify-center border-b border-yellow-800/80 p-2 font-black text-rose-300">-{formatCents(aggregate.combinedExpenseCents)}</div>
          <div className={`ledger-balance-row flex flex-col justify-center border-b border-yellow-800/80 p-2.5 text-sm font-black ${aggregate.combinedNetBalanceCents >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCents(aggregate.combinedNetBalanceCents)}</div>
        </div>
      </div>
      <ProfitabilityReport />
    </div>
  );
}
