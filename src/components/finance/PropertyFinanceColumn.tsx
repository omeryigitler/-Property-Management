import React from 'react';
import { ArrowRight, Pencil } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { calculatePropertyFinancials } from '../../utils/financeCalculations';
import { formatCents } from '../../utils/currency';
import { isRentExpense, sumExpenses } from '../../utils/expenseUtilities';

interface PropertyFinanceColumnProps {
  propertyId: string;
}

function DetailLine({ label, amountCents, income = false }: { label: string; amountCents: number; income?: boolean }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 py-0.5 text-[10px]">
      <span className="truncate font-semibold text-slate-300">{label}</span>
      <span className={`font-mono font-black ${income ? 'text-emerald-300' : 'text-rose-300'}`}>
        {income ? '+' : '-'}{formatCents(amountCents)}
      </span>
    </div>
  );
}

export function PropertyFinanceColumn({ propertyId }: PropertyFinanceColumnProps) {
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const bookings = useDashboardStore((state) => state.bookings);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);
  const openModal = useDashboardStore((state) => state.openModal);

  const financials = calculatePropertyFinancials(
    propertyId,
    selectedYear,
    selectedMonth,
    bookings,
    expenses,
    extraIncomes
  );
  const periodExpenses = expenses.filter(
    (expense) =>
      expense.propertyId === propertyId &&
      expense.year === selectedYear &&
      expense.month === selectedMonth
  );
  const rentTotalCents = sumExpenses(periodExpenses.filter(isRentExpense));
  const otherExpenses = periodExpenses.filter((expense) => !isRentExpense(expense));
  const propertyIncomes = extraIncomes.filter(
    (income) =>
      income.propertyId === propertyId &&
      income.year === selectedYear &&
      income.month === selectedMonth
  );

  return (
    <div className="dashboard-property-column flex flex-col border-r border-slate-800 bg-slate-900/40 text-xs">
      <div className="ledger-booking-row flex flex-col justify-center border-b border-slate-800 bg-slate-900/90 p-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Booking Income</span>
        <span className="font-mono text-sm font-extrabold text-emerald-400">{formatCents(financials.bookingIncomeCents)}</span>
      </div>
      <div className="ledger-rent-row flex flex-col justify-center border-b border-slate-800 bg-slate-950/55 p-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Rent</span>
        <span className="font-mono font-bold text-violet-200">-{formatCents(rentTotalCents)}</span>
      </div>
      <div className="ledger-extra-row overflow-hidden border-b border-slate-800 bg-slate-950/40 p-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
          <span>Extra Income</span><span className="font-mono">+{formatCents(financials.extraIncomeCents)}</span>
        </div>
        <div className="mt-1 space-y-0.5">
          {propertyIncomes.slice(0, 4).map((income) => <DetailLine key={income.id} label={income.label} amountCents={income.amountCents} income />)}
          {propertyIncomes.length === 0 && <div className="py-2 text-center text-[9px] text-slate-600">No additional income</div>}
        </div>
      </div>
      <div className="ledger-expenses-row flex flex-col border-b border-slate-800 bg-slate-950/40 p-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-rose-400">
          <span>Other Expenses</span><span className="font-mono">-{formatCents(sumExpenses(otherExpenses))}</span>
        </div>
        <div className="mt-1 min-h-0 flex-1 space-y-0.5 overflow-hidden">
          {otherExpenses.slice(0, 5).map((expense) => <DetailLine key={expense.id} label={expense.label} amountCents={expense.amountCents} />)}
          {otherExpenses.length === 0 && <div className="py-2 text-center text-[9px] text-slate-600">No other expenses</div>}
        </div>
        <button type="button" onClick={(event) => { event.stopPropagation(); openModal('settings', { section: 'finance', propertyId }); }} className="mt-1.5 flex h-7 items-center justify-center gap-1 rounded-md border border-cyan-800 bg-cyan-950/30 text-[9px] font-black uppercase text-cyan-300">
          <Pencil className="h-3 w-3" /> Edit <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <div className="ledger-total-row flex flex-col justify-center border-b border-slate-800 bg-slate-900/90 p-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Expenses</span>
        <span className="font-mono font-bold text-rose-400">-{formatCents(financials.totalExpensesCents)}</span>
      </div>
      <div className="ledger-balance-row flex flex-col justify-center border-b border-slate-800 bg-slate-950 p-2.5">
        <span className="font-display text-[10px] font-black uppercase tracking-widest text-slate-200">Net Balance</span>
        <span className={`font-mono text-sm font-black ${financials.netBalanceCents >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {formatCents(financials.netBalanceCents)}
        </span>
      </div>
    </div>
  );
}
