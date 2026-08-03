import React, { useState } from 'react';
import { Plus, Info, Lock } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { ALL_PROPERTIES } from '../../config/locations';
import { calculatePropertyFinancials } from '../../utils/financeCalculations';
import { formatCents, eurosToCents } from '../../utils/currency';
import { MobileBottomSheet } from '../common/MobileBottomSheet';
import { FinanceLineItem } from './FinanceLineItem';

export function PropertyFinanceMobileSheet() {
  const activeModal = useDashboardStore((s) => s.activeModal);
  const modalParams = useDashboardStore((s) => s.modalParams);
  const closeModal = useDashboardStore((s) => s.closeModal);

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

  const [newExpLabel, setNewExpLabel] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [showAddExp, setShowAddExp] = useState(false);

  const [newExtLabel, setNewExtLabel] = useState('');
  const [newExtAmount, setNewExtAmount] = useState('');
  const [showAddExt, setShowAddExt] = useState(false);

  const isOpen = activeModal === 'mobile_property_finance';
  const propertyId = modalParams.propertyId;
  const property = ALL_PROPERTIES.find((p) => p.id === propertyId);

  if (!isOpen || !property) return null;

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
    <MobileBottomSheet isOpen={isOpen} onClose={closeModal} title={`${property.name} Financial Ledger`}>
      <div className="space-y-4">
        {/* Monthly Booking Income */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-300">Net Booking Revenue</span>
            <span className="text-sm font-extrabold text-emerald-400 font-mono">
              {formatCents(fin.netBookingIncomeCents)}
            </span>
          </div>
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
            <span>Gross Total: {formatCents(fin.grossBookingIncomeCents)}</span>
            <span className="text-amber-400">OTA Comm: -{formatCents(fin.otaCommissionCents)}</span>
          </div>
        </div>

        {/* Extra Income Section */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Extra Income</span>
            <span className="text-xs font-mono text-emerald-300">{formatCents(fin.extraIncomeCents)}</span>
          </div>

          <div className="space-y-1">
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
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 space-y-2 text-xs">
              <input
                type="text"
                placeholder="e.g. Late Checkout"
                value={newExtLabel}
                onChange={(e) => setNewExtLabel(e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Amount €"
                value={newExtAmount}
                onChange={(e) => setNewExtAmount(e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddExt(false)}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveExtraIncome}
                  className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-xs"
                >
                  Save Income
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddExt(true)}
              className="w-full py-2 rounded-lg border border-dashed border-slate-700 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1 hover:bg-slate-900 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Extra Income</span>
            </button>
          )}
        </div>

        {/* Expenses Section */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Total Expenses</span>
            <span className="text-xs font-mono text-rose-300">{formatCents(fin.totalExpensesCents)}</span>
          </div>

          <div className="space-y-1">
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
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 space-y-2 text-xs">
              <input
                type="text"
                placeholder="Expense label..."
                value={newExpLabel}
                onChange={(e) => setNewExpLabel(e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Amount €"
                value={newExpAmount}
                onChange={(e) => setNewExpAmount(e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddExp(false)}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveExpense}
                  className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold text-xs"
                >
                  Save Expense
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddExp(true)}
              className="w-full py-2 rounded-lg border border-dashed border-slate-700 text-rose-400 text-xs font-bold flex items-center justify-center gap-1 hover:bg-slate-900 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Expense</span>
            </button>
          )}
        </div>

        {/* Calculated Taxes & Net Balance */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-semibold">Calculated Taxes:</span>
            {fin.isTaxConfigured ? (
              <span className="font-mono text-amber-300 font-bold">{formatCents(fin.calculatedTaxesCents)}</span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1 text-[11px] font-semibold">
                <Lock className="w-3 h-3" /> Configuration Required
              </span>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-800 font-bold text-sm">
            <span className="text-slate-100">Net Balance:</span>
            {fin.isTaxConfigured ? (
              <span className="font-mono text-cyan-300 font-extrabold">{formatCents(fin.netBalanceCents)}</span>
            ) : (
              <span className="text-amber-400 text-xs font-bold uppercase tracking-wide">
                Configuration Required
              </span>
            )}
          </div>

          {fin.isTaxConfigured && (
            <button
              type="button"
              onClick={() => {
                openModal('calc_details', { propertyId });
              }}
              className="w-full mt-2 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 font-semibold text-xs flex items-center justify-center gap-1 border border-slate-800"
            >
              <Info className="w-3.5 h-3.5" />
              <span>View Full Tax Breakdown</span>
            </button>
          )}
        </div>
      </div>
    </MobileBottomSheet>
  );
}
