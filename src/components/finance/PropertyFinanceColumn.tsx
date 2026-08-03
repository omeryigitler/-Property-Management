import React, { useState } from 'react';
import { Plus, Info, Lock } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { calculatePropertyFinancials } from '../../utils/financeCalculations';
import { formatCents, eurosToCents } from '../../utils/currency';
import { FinanceLineItem } from './FinanceLineItem';

interface PropertyFinanceColumnProps {
  propertyId: string;
}

export function PropertyFinanceColumn({ propertyId }: PropertyFinanceColumnProps) {
  const selectedMonth = useDashboardStore((s) => s.selectedMonth);
  const selectedYear = useDashboardStore((s) => s.selectedYear);
  const taxConfig = useDashboardStore((s) => s.taxConfiguration);
  const bookings = useDashboardStore((s) => s.bookings);
  const expenses = useDashboardStore((s) => s.expenses);
  const extraIncomes = useDashboardStore((s) => s.extraIncomes);

  const addExpense = useDashboardStore((s) => s.addExpense);
  const updateExpense = useDashboardStore((s) => s.updateExpense);
  const deleteExpense = useDashboardStore((s) => s.deleteExpense);

  const addExtraIncome = useDashboardStore((s) => s.addExtraIncome);
  const updateExtraIncome = useDashboardStore((s) => s.updateExtraIncome);
  const deleteExtraIncome = useDashboardStore((s) => s.deleteExtraIncome);

  const openModal = useDashboardStore((s) => s.openModal);

  const [showAddExp, setShowAddExp] = useState(false);
  const [newExpLabel, setNewExpLabel] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');

  const [showAddExt, setShowAddExt] = useState(false);
  const [newExtLabel, setNewExtLabel] = useState('');
  const [newExtAmount, setNewExtAmount] = useState('');

  const fin = calculatePropertyFinancials(
    propertyId,
    selectedYear,
    selectedMonth,
    bookings,
    expenses,
    extraIncomes,
    taxConfig
  );

  const propertyExpenses = expenses.filter(
    (e) => e.propertyId === propertyId && e.year === selectedYear && e.month === selectedMonth
  );

  const propertyExtraIncomes = extraIncomes.filter(
    (e) => e.propertyId === propertyId && e.year === selectedYear && e.month === selectedMonth
  );

  const handleSaveExpense = () => {
    if (!newExpLabel.trim()) return;
    addExpense({
      propertyId,
      year: selectedYear,
      month: selectedMonth,
      label: newExpLabel.trim(),
      amountCents: eurosToCents(newExpAmount),
      category: 'General',
      isDeductible: true,
    });
    setNewExpLabel('');
    setNewExpAmount('');
    setShowAddExp(false);
  };

  const handleSaveExtraIncome = () => {
    if (!newExtLabel.trim()) return;
    addExtraIncome({
      propertyId,
      year: selectedYear,
      month: selectedMonth,
      label: newExtLabel.trim(),
      amountCents: eurosToCents(newExtAmount),
      taxTreatment: taxConfig.defaultExtraIncomeTaxTreatment || 'standard_vat',
    });
    setNewExtLabel('');
    setNewExtAmount('');
    setShowAddExt(false);
  };

  return (
    <div className="w-[190px] min-w-[160px] border-r border-slate-800 flex flex-col bg-slate-900/40 text-xs">
      {/* 1. AYLIK TOPLAM (Monthly Booking Income) Row */}
      <div className="p-2 bg-slate-900/90 border-b border-slate-800 flex flex-col justify-center min-h-[44px]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NET BOOKING</span>
          <span className="text-[10px] text-amber-400 font-mono">-{formatCents(fin.otaCommissionCents)}</span>
        </div>
        <span className="font-mono font-extrabold text-emerald-400 text-sm">
          {formatCents(fin.netBookingIncomeCents)}
        </span>
        <span className="text-[9px] text-slate-500 font-mono">Gross: {formatCents(fin.grossBookingIncomeCents)}</span>
      </div>

      {/* 2. Extra Incomes Section */}
      <div className="p-2 border-b border-slate-800/80 space-y-1 bg-slate-950/40">
        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
          <span>EXTRA INCOME</span>
          <span className="font-mono text-emerald-300">+{formatCents(fin.extraIncomeCents)}</span>
        </div>

        <div className="space-y-0.5">
          {propertyExtraIncomes.map((item) => (
            <FinanceLineItem
              key={item.id}
              id={item.id}
              label={item.label}
              amountCents={item.amountCents}
              onUpdate={(id, lbl, cents) => updateExtraIncome(id, { label: lbl, amountCents: cents })}
              onDelete={(id) => deleteExtraIncome(id)}
              type="extra_income"
            />
          ))}
        </div>

        {showAddExt ? (
          <div className="p-1.5 rounded bg-slate-900 border border-slate-700 space-y-1 mt-1">
            <input
              type="text"
              placeholder="e.g. Late Checkout"
              value={newExtLabel}
              onChange={(e) => setNewExtLabel(e.target.value)}
              className="w-full px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-[11px] text-slate-100"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Amount €"
              value={newExtAmount}
              onChange={(e) => setNewExtAmount(e.target.value)}
              className="w-full px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-[11px] text-slate-100"
            />
            <div className="flex justify-end gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => setShowAddExt(false)}
                className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveExtraIncome}
                className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddExt(true)}
            className="w-full mt-1 py-1 rounded border border-dashed border-slate-700 text-[10px] text-emerald-400 font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-0.5"
          >
            <Plus className="w-3 h-3" />
            <span>+ Add Extra Income</span>
          </button>
        )}
      </div>

      {/* 3. Expenses Section (Default Rent & Cleaning + Custom) */}
      <div className="p-2 border-b border-slate-800/80 space-y-1 bg-slate-950/40">
        <div className="flex items-center justify-between text-[11px] font-bold text-rose-400">
          <span>EXPENSES</span>
          <span className="font-mono text-rose-300">-{formatCents(fin.totalExpensesCents)}</span>
        </div>

        <div className="space-y-0.5">
          {propertyExpenses.map((item) => (
            <FinanceLineItem
              key={item.id}
              id={item.id}
              label={item.label}
              amountCents={item.amountCents}
              isDeductible={item.isDeductible}
              onUpdate={(id, lbl, cents, ded) =>
                updateExpense(id, { label: lbl, amountCents: cents, isDeductible: ded })
              }
              onDelete={(id) => deleteExpense(id)}
              type="expense"
            />
          ))}
        </div>

        {showAddExp ? (
          <div className="p-1.5 rounded bg-slate-900 border border-slate-700 space-y-1 mt-1">
            <input
              type="text"
              placeholder="Expense label..."
              value={newExpLabel}
              onChange={(e) => setNewExpLabel(e.target.value)}
              className="w-full px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-[11px] text-slate-100"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Amount €"
              value={newExpAmount}
              onChange={(e) => setNewExpAmount(e.target.value)}
              className="w-full px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-[11px] text-slate-100"
            />
            <div className="flex justify-end gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => setShowAddExp(false)}
                className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveExpense}
                className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px]"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddExp(true)}
            className="w-full mt-1 py-1 rounded border border-dashed border-slate-700 text-[10px] text-rose-400 font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-0.5"
          >
            <Plus className="w-3 h-3" />
            <span>+ Add Expense</span>
          </button>
        )}
      </div>

      {/* 4. TOPLAM GİDER Summary Row */}
      <div className="p-2 bg-slate-900/90 border-b border-slate-800 flex flex-col justify-center min-h-[40px]">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOPLAM GİDER</span>
        <span className="font-mono font-bold text-rose-400">{formatCents(fin.totalExpensesCents)}</span>
      </div>

      {/* 5. HESAPLANAN VERGİLER Summary Row */}
      <div className="p-2 bg-slate-900/90 border-b border-slate-800 flex flex-col justify-center min-h-[42px]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">HESAPLANAN VERGİLER</span>
          {fin.isTaxConfigured && (
            <button
              type="button"
              onClick={() => openModal('calc_details', { propertyId })}
              className="text-slate-400 hover:text-cyan-400"
              title="View Breakdown"
            >
              <Info className="w-3 h-3" />
            </button>
          )}
        </div>
        {fin.isTaxConfigured ? (
          <span className="font-mono font-bold text-amber-300">{formatCents(fin.calculatedTaxesCents)}</span>
        ) : (
          <span className="text-[10px] font-semibold text-amber-400/90 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Configuration Required
          </span>
        )}
      </div>

      {/* 6. NET BAKİYE Summary Row */}
      <div className="p-2.5 bg-slate-950 border-b border-slate-800 flex flex-col justify-center min-h-[48px]">
        <span className="text-[10px] font-display font-black text-slate-200 uppercase tracking-widest">NET BAKİYE</span>
        {fin.isTaxConfigured ? (
          <span className="font-mono font-black text-[#ff3e00] text-sm">{formatCents(fin.netBalanceCents)}</span>
        ) : (
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-tight">
            Configuration Required
          </span>
        )}
      </div>
    </div>
  );
}
