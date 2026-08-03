import React from 'react';
import { X, Info, Calculator } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { ALL_PROPERTIES } from '../../config/locations';
import { calculatePropertyFinancials } from '../../utils/financeCalculations';
import { formatCents } from '../../utils/currency';

export function CalculationDetailsModal() {
  const activeModal = useDashboardStore((s) => s.activeModal);
  const modalParams = useDashboardStore((s) => s.modalParams);
  const closeModal = useDashboardStore((s) => s.closeModal);

  const selectedMonth = useDashboardStore((s) => s.selectedMonth);
  const selectedYear = useDashboardStore((s) => s.selectedYear);
  const taxConfig = useDashboardStore((s) => s.taxConfiguration);
  const bookings = useDashboardStore((s) => s.bookings);
  const expenses = useDashboardStore((s) => s.expenses);
  const extraIncomes = useDashboardStore((s) => s.extraIncomes);

  if (activeModal !== 'calc_details') return null;

  const propertyId = modalParams.propertyId;
  const property = ALL_PROPERTIES.find((p) => p.id === propertyId);

  if (!property) return null;

  const fin = calculatePropertyFinancials(propertyId, selectedYear, selectedMonth, bookings, expenses, extraIncomes, taxConfig);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl text-slate-100 flex flex-col max-h-[88dvh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <Calculator className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-slate-100">Tax & Calculation Breakdown</h3>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">{property.name}</span>
            <p className="text-[11px] text-slate-400">Ledger breakdown for {selectedMonth}/{selectedYear}</p>
          </div>

          <div className="space-y-2 border-b border-slate-800 pb-3">
            <div className="flex justify-between font-semibold">
              <span>Gross Booking Revenue:</span>
              <span className="text-slate-200 font-mono">{formatCents(fin.grossBookingIncomeCents)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>OTA Channel Commissions:</span>
              <span className="text-amber-400 font-mono">-{formatCents(fin.otaCommissionCents)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Net Booking Income:</span>
              <span className="text-emerald-400 font-mono">{formatCents(fin.netBookingIncomeCents)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Extra Incomes:</span>
              <span className="text-emerald-400 font-mono">+{formatCents(fin.extraIncomeCents)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total Expenses:</span>
              <span className="text-rose-400 font-mono">-{formatCents(fin.totalExpensesCents)}</span>
            </div>
          </div>

          <div className="space-y-2 border-b border-slate-800 pb-3">
            <span className="font-bold text-slate-200">Tax Breakdown ({taxConfig.accommodationVatRate}% Acc VAT, {taxConfig.incomeTaxRate}% Income Tax):</span>
            <div className="flex justify-between text-slate-300">
              <span>Accommodation VAT:</span>
              <span className="font-mono text-amber-300">{formatCents(fin.accommodationVatCents)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Standard VAT:</span>
              <span className="font-mono text-amber-300">{formatCents(fin.standardVatCents)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Eco Contribution / City Tax:</span>
              <span className="font-mono text-amber-300">{formatCents(fin.ecoContributionCents)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Income Tax:</span>
              <span className="font-mono text-amber-300">{formatCents(fin.incomeTaxCents)}</span>
            </div>
            <div className="flex justify-between font-bold text-amber-400 pt-1 border-t border-slate-800/80">
              <span>Calculated Taxes Total:</span>
              <span className="font-mono">{formatCents(fin.calculatedTaxesCents)}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-cyan-950/60 border border-cyan-800/80 flex items-center justify-between text-sm font-black text-cyan-300">
            <span>Net Balance:</span>
            <span className="font-mono">{formatCents(fin.netBalanceCents)}</span>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900/90">
          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
