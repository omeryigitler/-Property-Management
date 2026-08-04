import React from 'react';
import { ArrowRight, Info, Lock, Pencil } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { calculatePropertyFinancials } from '../../utils/financeCalculations';
import { formatCents } from '../../utils/currency';
import { isRentExpense, sumExpenses } from '../../utils/expenseUtilities';

interface PropertyFinanceColumnProps {
  propertyId: string;
}

interface ReadOnlyLineProps {
  label: string;
  amountCents: number;
  tone: 'income' | 'expense';
}

function ReadOnlyLine({ label, amountCents, tone }: ReadOnlyLineProps) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 py-0.5 text-[10px]">
      <span className="min-w-0 truncate font-semibold text-slate-300" title={label}>
        {label}
      </span>
      <span
        className={`flex-shrink-0 font-mono font-black ${
          tone === 'income' ? 'text-emerald-300' : 'text-rose-300'
        }`}
      >
        {tone === 'income' ? '+' : '-'}{formatCents(amountCents)}
      </span>
    </div>
  );
}

export function PropertyFinanceColumn({ propertyId }: PropertyFinanceColumnProps) {
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const taxConfig = useDashboardStore((state) => state.taxConfiguration);
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
    extraIncomes,
    taxConfig
  );

  const periodExpenses = expenses.filter(
    (expense) =>
      expense.propertyId === propertyId &&
      expense.year === selectedYear &&
      expense.month === selectedMonth
  );
  const rentExpenses = periodExpenses.filter(isRentExpense);
  const otherExpenses = periodExpenses.filter((expense) => !isRentExpense(expense));
  const rentTotalCents = sumExpenses(rentExpenses);
  const otherExpensesTotalCents = sumExpenses(otherExpenses);

  const propertyExtraIncomes = extraIncomes.filter(
    (income) =>
      income.propertyId === propertyId &&
      income.year === selectedYear &&
      income.month === selectedMonth
  );

  const openFinanceSettings = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    openModal('settings', { section: 'finance', propertyId });
  };

  const visibleIncomes = propertyExtraIncomes.slice(0, 4);
  const visibleExpenses = otherExpenses.slice(0, 5);

  return (
    <div className="dashboard-property-column flex flex-col border-r border-slate-800 bg-slate-900/40 text-xs">
      <div className="ledger-booking-row flex flex-col justify-center overflow-hidden border-b border-slate-800 bg-slate-900/90 p-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">NET BOOKING</span>
          <span className="font-mono text-[10px] text-amber-400">-{formatCents(financials.otaCommissionCents)}</span>
        </div>
        <span className="font-mono text-sm font-extrabold text-emerald-400">
          {formatCents(financials.netBookingIncomeCents)}
        </span>
        <span className="font-mono text-[9px] text-slate-500">
          Gross: {formatCents(financials.grossBookingIncomeCents)}
        </span>
      </div>

      <div className="ledger-rent-row flex flex-col justify-center overflow-hidden border-b border-slate-800/80 bg-slate-950/55 px-2 py-1.5">
        <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-violet-300">
          <span>RENT</span>
          <span className="font-mono">-{formatCents(rentTotalCents)}</span>
        </div>
        <span className="mt-0.5 truncate text-[9px] font-semibold text-slate-500">
          Managed in Monthly Finance
        </span>
      </div>

      <div className="ledger-extra-row overflow-hidden border-b border-slate-800/80 bg-slate-950/40 p-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
          <span>EXTRA INCOME</span>
          <span className="font-mono text-emerald-300">+{formatCents(financials.extraIncomeCents)}</span>
        </div>

        <div className="mt-1 space-y-0.5">
          {visibleIncomes.length > 0 ? (
            visibleIncomes.map((income) => (
              <ReadOnlyLine
                key={income.id}
                label={income.label}
                amountCents={income.amountCents}
                tone="income"
              />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-slate-800 px-2 py-2 text-center text-[9px] font-semibold text-slate-600">
              No additional income
            </div>
          )}
          {propertyExtraIncomes.length > visibleIncomes.length && (
            <div className="text-right text-[9px] font-bold text-slate-500">
              +{propertyExtraIncomes.length - visibleIncomes.length} more
            </div>
          )}
        </div>
      </div>

      <div className="ledger-expenses-row flex flex-col overflow-hidden border-b border-slate-800/80 bg-slate-950/40 p-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-rose-400">
          <span>OTHER EXPENSES</span>
          <span className="font-mono text-rose-300">-{formatCents(otherExpensesTotalCents)}</span>
        </div>

        <div className="mt-1 min-h-0 flex-1 space-y-0.5 overflow-hidden">
          {visibleExpenses.length > 0 ? (
            visibleExpenses.map((expense) => (
              <ReadOnlyLine
                key={expense.id}
                label={expense.label}
                amountCents={expense.amountCents}
                tone="expense"
              />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-slate-800 px-2 py-2 text-center text-[9px] font-semibold text-slate-600">
              No other expenses
            </div>
          )}
          {otherExpenses.length > visibleExpenses.length && (
            <div className="text-right text-[9px] font-bold text-slate-500">
              +{otherExpenses.length - visibleExpenses.length} more
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={openFinanceSettings}
          className="mt-1.5 flex h-7 w-full flex-shrink-0 items-center justify-center gap-1.5 rounded-md border border-cyan-800/80 bg-cyan-950/30 px-2 text-[9px] font-black uppercase tracking-wider text-cyan-300 transition-colors hover:border-cyan-600 hover:bg-cyan-950/70"
          title="Open Monthly Finance settings"
        >
          <Pencil className="h-3 w-3" />
          Edit Monthly Finance
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="ledger-total-row flex flex-col justify-center overflow-hidden border-b border-slate-800 bg-slate-900/90 p-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL EXPENSES</span>
        <span className="font-mono font-bold text-rose-400">{formatCents(financials.totalExpensesCents)}</span>
      </div>

      <div className="ledger-tax-row flex flex-col justify-center overflow-hidden border-b border-slate-800 bg-slate-900/90 p-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">CALCULATED TAXES</span>
          {financials.isTaxConfigured && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openModal('calc_details', { propertyId });
              }}
              className="text-slate-400 hover:text-cyan-400"
              title="View Breakdown"
            >
              <Info className="h-3 w-3" />
            </button>
          )}
        </div>
        {financials.isTaxConfigured ? (
          <span className="font-mono font-bold text-amber-300">{formatCents(financials.calculatedTaxesCents)}</span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400/90">
            <Lock className="h-3 w-3" /> Configuration Required
          </span>
        )}
      </div>

      <div className="ledger-balance-row flex flex-col justify-center overflow-hidden border-b border-slate-800 bg-slate-950 p-2.5">
        <span className="font-display text-[10px] font-black uppercase tracking-widest text-slate-200">NET BALANCE</span>
        {financials.isTaxConfigured ? (
          <span
            className={`font-mono text-sm font-black ${
              (financials.netBalanceCents ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCents(financials.netBalanceCents)}
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-tight text-amber-400">
            Configuration Required
          </span>
        )}
      </div>
    </div>
  );
}
