import React from 'react';
import { Lock } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { ALL_PROPERTIES } from '../../config/locations';
import { calculateAggregatedFinancials } from '../../utils/financeCalculations';
import { formatCents } from '../../utils/currency';
import { isRentExpense, sumExpenses } from '../../utils/expenseUtilities';
import { PropertyFinanceColumn } from './PropertyFinanceColumn';
import { ProfitabilityReport } from './ProfitabilityReport';

export function FinancialGrid() {
  const selectedMonth = useDashboardStore((s) => s.selectedMonth);
  const selectedYear = useDashboardStore((s) => s.selectedYear);
  const taxConfig = useDashboardStore((s) => s.taxConfiguration);
  const bookings = useDashboardStore((s) => s.bookings);
  const expenses = useDashboardStore((s) => s.expenses);
  const extraIncomes = useDashboardStore((s) => s.extraIncomes);
  const openModal = useDashboardStore((s) => s.openModal);

  const agg = calculateAggregatedFinancials(
    selectedYear,
    selectedMonth,
    bookings,
    expenses,
    extraIncomes,
    taxConfig
  );

  const currentExpenses = expenses.filter(
    (expense) => expense.year === selectedYear && expense.month === selectedMonth
  );
  const totalRentCents = sumExpenses(currentExpenses.filter(isRentExpense));
  const totalOtherExpensesCents = agg.combinedExpenseCents - totalRentCents;

  return (
    <div className="w-max min-w-full border-t-2 border-[#ff3e00] bg-slate-950 mt-2 select-none">
      <div className="sticky left-0 z-30 flex min-h-10 w-screen items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2 text-xs font-black text-[#ff3e00]">
        <span className="font-display text-sm uppercase tracking-widest">MONTHLY FINANCIAL LEDGER</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Calendar and financial columns use the same fixed dimensions
        </span>
      </div>

      <div className="flex w-max min-w-full items-stretch">
        <div className="dashboard-day-column sticky left-0 z-20 flex flex-col border-r border-slate-800 bg-slate-900 text-[10px] font-black uppercase tracking-wider text-slate-400">
          <div className="ledger-booking-row flex items-center border-b border-slate-800 p-2 font-display">MONTHLY TOTAL</div>
          <div className="ledger-rent-row flex items-center border-b border-slate-800 p-2 font-display text-violet-300">RENT</div>
          <div className="ledger-extra-row flex items-center border-b border-slate-800 p-2 font-display text-emerald-400">EXTRA INCOME</div>
          <div className="ledger-expenses-row flex items-center border-b border-slate-800 p-2 font-display text-rose-400">OTHER EXPENSES</div>
          <div className="ledger-total-row flex items-center border-b border-slate-800 p-2 font-display">TOTAL EXPENSES</div>
          <div className="ledger-tax-row flex items-center border-b border-slate-800 p-2 font-display text-amber-400">CALCULATED TAXES</div>
          <div className="ledger-balance-row flex items-center border-b border-slate-800 p-2.5 font-display font-black text-slate-100">NET BALANCE</div>
        </div>

        {ALL_PROPERTIES.map((prop) => (
          <div
            key={prop.id}
            className="dashboard-property-column"
            onClick={() => {
              if (window.innerWidth < 768) {
                openModal('mobile_property_finance', { propertyId: prop.id });
              }
            }}
          >
            <PropertyFinanceColumn propertyId={prop.id} />
          </div>
        ))}

        <div className="dashboard-total-column flex flex-col border-r border-slate-800 bg-yellow-950/60 font-mono text-xs">
          <div className="ledger-booking-row flex flex-col justify-center overflow-hidden border-b border-yellow-800/80 bg-yellow-950/90 p-2 font-black text-emerald-300">
            <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-yellow-200/80">NET BOOKING</span>
            <span>{formatCents(agg.combinedNetBookingIncomeCents)}</span>
            <span className="text-[9px] font-medium text-slate-400">Gross: {formatCents(agg.combinedGrossBookingIncomeCents)}</span>
          </div>

          <div className="ledger-rent-row flex flex-col justify-center overflow-hidden border-b border-yellow-800/80 p-2 font-black text-violet-300">
            <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-yellow-200/80">TOTAL RENT</span>
            <span>-{formatCents(totalRentCents)}</span>
          </div>

          <div className="ledger-extra-row flex flex-col justify-center overflow-hidden border-b border-yellow-800/80 p-2 font-black text-emerald-400">
            <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-yellow-200/80">TOTAL EXTRA</span>
            <span>+{formatCents(agg.combinedExtraIncomeCents)}</span>
          </div>

          <div className="ledger-expenses-row flex flex-col justify-center overflow-hidden border-b border-yellow-800/80 p-2 font-black text-rose-300">
            <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-yellow-200/80">OTHER EXPENSES</span>
            <span>-{formatCents(totalOtherExpensesCents)}</span>
          </div>

          <div className="ledger-total-row flex flex-col justify-center overflow-hidden border-b border-yellow-800/80 bg-yellow-950/90 p-2 font-black text-rose-300">
            <span>{formatCents(agg.combinedExpenseCents)}</span>
          </div>

          <div className="ledger-tax-row flex flex-col justify-center overflow-hidden border-b border-yellow-800/80 bg-yellow-950/90 p-2 font-black text-amber-300">
            {agg.isTaxConfigured ? (
              <span>{formatCents(agg.combinedCalculatedTaxesCents)}</span>
            ) : (
              <span className="flex items-center gap-1 font-sans text-[9px] font-bold text-amber-400">
                <Lock className="h-3 w-3" /> Locked
              </span>
            )}
          </div>

          <div className="ledger-balance-row flex flex-col justify-center overflow-hidden border-b border-yellow-800/80 bg-yellow-950/95 p-2.5 font-black text-sm">
            {agg.isTaxConfigured ? (
              <span className={(agg.combinedNetBalanceCents ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {formatCents(agg.combinedNetBalanceCents)}
              </span>
            ) : (
              <span className="font-sans text-[9px] font-bold uppercase text-amber-400">Configuration Required</span>
            )}
          </div>
        </div>
      </div>

      <ProfitabilityReport />
    </div>
  );
}
