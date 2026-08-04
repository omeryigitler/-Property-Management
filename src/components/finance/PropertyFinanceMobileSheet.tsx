import React from 'react';
import { ArrowRight, Pencil } from 'lucide-react';
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
  const bookings = useDashboardStore((state) => state.bookings);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);

  const propertyId = modalParams.propertyId as string | undefined;
  const property = ALL_PROPERTIES.find((item) => item.id === propertyId);
  if (activeModal !== 'mobile_property_finance' || !property || !propertyId) return null;

  const financials = calculatePropertyFinancials(propertyId, selectedYear, selectedMonth, bookings, expenses, extraIncomes);
  const propertyExpenses = expenses.filter((expense) => expense.propertyId === propertyId && expense.year === selectedYear && expense.month === selectedMonth);
  const rent = sumExpenses(propertyExpenses.filter(isRentExpense));
  const otherExpenses = propertyExpenses.filter((expense) => !isRentExpense(expense));
  const incomes = extraIncomes.filter((income) => income.propertyId === propertyId && income.year === selectedYear && income.month === selectedMonth);

  return (
    <MobileBottomSheet isOpen onClose={closeModal} title={`${property.name} Financial Ledger`}>
      <div className="space-y-3 pb-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-emerald-900 bg-emerald-950/20 p-3"><span className="text-[9px] font-black uppercase text-emerald-300">Booking Income</span><span className="mt-1 block font-mono text-sm font-black text-emerald-300">{formatCents(financials.bookingIncomeCents)}</span></div>
          <div className="rounded-xl border border-violet-900 bg-violet-950/20 p-3"><span className="text-[9px] font-black uppercase text-violet-300">Rent</span><span className="mt-1 block font-mono text-sm font-black text-violet-200">-{formatCents(rent)}</span></div>
        </div>
        <section className="rounded-xl border border-emerald-900/60 bg-slate-950 p-3.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2"><span className="text-xs font-black uppercase text-emerald-400">Extra Income</span><span className="font-mono text-xs font-black text-emerald-300">+{formatCents(financials.extraIncomeCents)}</span></div>
          <div className="mt-2 space-y-1.5">{incomes.map((income) => <div key={income.id} className="flex justify-between rounded-lg bg-slate-900 px-3 py-2 text-xs"><span>{income.label}</span><strong className="font-mono text-emerald-300">+{formatCents(income.amountCents)}</strong></div>)}{incomes.length === 0 && <div className="py-3 text-center text-[10px] text-slate-600">No additional income</div>}</div>
        </section>
        <section className="rounded-xl border border-rose-900/60 bg-slate-950 p-3.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2"><span className="text-xs font-black uppercase text-rose-400">Other Expenses</span><span className="font-mono text-xs font-black text-rose-300">-{formatCents(sumExpenses(otherExpenses))}</span></div>
          <div className="mt-2 space-y-1.5">{otherExpenses.map((expense) => <div key={expense.id} className="flex justify-between rounded-lg bg-slate-900 px-3 py-2 text-xs"><span>{expense.label}</span><strong className="font-mono text-rose-300">-{formatCents(expense.amountCents)}</strong></div>)}{otherExpenses.length === 0 && <div className="py-3 text-center text-[10px] text-slate-600">No other expenses</div>}</div>
        </section>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs">
          <div className="flex justify-between"><span>Total Expenses</span><strong className="font-mono text-rose-300">-{formatCents(financials.totalExpensesCents)}</strong></div>
          <div className="mt-2 flex justify-between border-t border-slate-800 pt-2 text-sm font-bold"><span>Net Balance</span><strong className={`font-mono ${financials.netBalanceCents >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{formatCents(financials.netBalanceCents)}</strong></div>
        </div>
        <button type="button" onClick={() => openModal('settings', { section: 'finance', propertyId })} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 text-xs font-black uppercase text-white"><Pencil className="h-4 w-4" /> Edit Monthly Finance <ArrowRight className="h-4 w-4" /></button>
      </div>
    </MobileBottomSheet>
  );
}
