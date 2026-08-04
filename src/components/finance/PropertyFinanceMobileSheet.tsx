import React from 'react';
import { ArrowRight, Info, Lock, Pencil } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { ALL_PROPERTIES } from '../../config/locations';
import { calculatePropertyFinancials } from '../../utils/financeCalculations';
import { formatCents } from '../../utils/currency';
import { isRentExpense, sumExpenses } from '../../utils/expenseUtilities';
import { MobileBottomSheet } from '../common/MobileBottomSheet';

export function PropertyFinanceMobileSheet() {
  const activeModal = useDashboardStore((state) => state.activeModal);
  const modalParams = useDashboardStore((state) => state.modalParams);
  const closeModal = useDashboardStore((state) => state.closeModal);
  const openModal = useDashboardStore((state) => state.openModal);

  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const taxConfig = useDashboardStore((state) => state.taxConfiguration);
  const bookings = useDashboardStore((state) => state.bookings);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);

  const isOpen = activeModal === 'mobile_property_finance';
  const propertyId = modalParams.propertyId as string | undefined;
  const property = ALL_PROPERTIES.find((item) => item.id === propertyId);

  if (!isOpen || !property || !propertyId) return null;

  const financials = calculatePropertyFinancials(
    propertyId,
    selectedYear,
    selectedMonth,
    bookings,
    expenses,
    extraIncomes,
    taxConfig
  );

  const propertyExpenses = expenses.filter(
    (expense) =>
      expense.propertyId === propertyId &&
      expense.year === selectedYear &&
      expense.month === selectedMonth
  );
  const rentExpenses = propertyExpenses.filter(isRentExpense);
  const otherExpenses = propertyExpenses.filter((expense) => !isRentExpense(expense));
  const rentTotalCents = sumExpenses(rentExpenses);
  const otherExpensesTotalCents = sumExpenses(otherExpenses);

  const propertyExtraIncomes = extraIncomes.filter(
    (income) =>
      income.propertyId === propertyId &&
      income.year === selectedYear &&
      income.month === selectedMonth
  );

  return (
    <MobileBottomSheet isOpen={isOpen} onClose={closeModal} title={`${property.name} Financial Ledger`}>
      <div className="space-y-3 pb-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-300">Net Booking Revenue</span>
            <span className="font-mono text-sm font-extrabold text-emerald-400">
              {formatCents(financials.netBookingIncomeCents)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3 font-mono text-[10px] text-slate-500">
            <span>Gross: {formatCents(financials.grossBookingIncomeCents)}</span>
            <span className="text-amber-400">OTA: -{formatCents(financials.otaCommissionCents)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-violet-900/70 bg-violet-950/20 p-3">
            <span className="text-[9px] font-black uppercase tracking-wider text-violet-300">Monthly Rent</span>
            <span className="mt-1 block font-mono text-sm font-black text-violet-200">
              -{formatCents(rentTotalCents)}
            </span>
          </div>
          <div className="rounded-xl border border-rose-900/70 bg-rose-950/20 p-3">
            <span className="text-[9px] font-black uppercase tracking-wider text-rose-300">Other Costs</span>
            <span className="mt-1 block font-mono text-sm font-black text-rose-300">
              -{formatCents(otherExpensesTotalCents)}
            </span>
          </div>
        </div>

        <section className="rounded-xl border border-emerald-900/60 bg-slate-950 p-3.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Additional Income</span>
            <span className="font-mono text-xs font-black text-emerald-300">
              +{formatCents(financials.extraIncomeCents)}
            </span>
          </div>
          <div className="mt-2 space-y-1.5">
            {propertyExtraIncomes.length > 0 ? (
              propertyExtraIncomes.map((income) => (
                <div key={income.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-900/70 px-3 py-2">
                  <span className="min-w-0 truncate text-xs font-semibold text-slate-300">{income.label}</span>
                  <span className="flex-shrink-0 font-mono text-xs font-black text-emerald-300">
                    +{formatCents(income.amountCents)}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-800 px-3 py-3 text-center text-[10px] font-semibold text-slate-600">
                No additional income for this month
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-rose-900/60 bg-slate-950 p-3.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-rose-400">Other Expenses</span>
            <span className="font-mono text-xs font-black text-rose-300">
              -{formatCents(otherExpensesTotalCents)}
            </span>
          </div>
          <div className="mt-2 space-y-1.5">
            {otherExpenses.length > 0 ? (
              otherExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-900/70 px-3 py-2">
                  <span className="min-w-0 truncate text-xs font-semibold text-slate-300">{expense.label}</span>
                  <span className="flex-shrink-0 font-mono text-xs font-black text-rose-300">
                    -{formatCents(expense.amountCents)}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-800 px-3 py-3 text-center text-[10px] font-semibold text-slate-600">
                No other expenses for this month
              </div>
            )}
          </div>
        </section>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs">
          <div className="flex items-center justify-between gap-3 text-slate-300">
            <span className="font-semibold">Total Expenses</span>
            <span className="font-mono font-bold text-rose-300">-{formatCents(financials.totalExpensesCents)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-800 pt-2 text-slate-300">
            <span className="font-semibold">Calculated Taxes</span>
            {financials.isTaxConfigured ? (
              <span className="font-mono font-bold text-amber-300">-{formatCents(financials.calculatedTaxesCents)}</span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                <Lock className="h-3 w-3" /> Required
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-800 pt-2 text-sm font-bold">
            <span className="text-slate-100">Net Balance</span>
            {financials.isTaxConfigured ? (
              <span
                className={`font-mono font-extrabold ${
                  (financials.netBalanceCents ?? 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {formatCents(financials.netBalanceCents)}
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase text-amber-400">Configuration Required</span>
            )}
          </div>

          {financials.isTaxConfigured && (
            <button
              type="button"
              onClick={() => openModal('calc_details', { propertyId })}
              className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-semibold text-cyan-400 hover:bg-slate-800"
            >
              <Info className="h-3.5 w-3.5" /> View Tax Breakdown
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => openModal('settings', { section: 'finance', propertyId })}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-cyan-950/40 hover:bg-cyan-500"
        >
          <Pencil className="h-4 w-4" /> Edit Monthly Finance
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </MobileBottomSheet>
  );
}
