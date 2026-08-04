import React from 'react';
import { Calculator, Info, X } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { ALL_PROPERTIES } from '../../config/locations';
import { calculatePropertyFinancials } from '../../utils/financeCalculations';
import { formatCents } from '../../utils/currency';

export function CalculationDetailsModal() {
  const activeModal = useDashboardStore((state) => state.activeModal);
  const modalParams = useDashboardStore((state) => state.modalParams);
  const closeModal = useDashboardStore((state) => state.closeModal);
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const taxConfig = useDashboardStore((state) => state.taxConfiguration);
  const bookings = useDashboardStore((state) => state.bookings);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);

  if (activeModal !== 'calc_details') return null;

  const propertyId = modalParams.propertyId;
  const property = ALL_PROPERTIES.find((item) => item.id === propertyId);
  if (!property) return null;

  const financials = calculatePropertyFinancials(
    propertyId,
    selectedYear,
    selectedMonth,
    bookings,
    expenses,
    extraIncomes,
    taxConfig
  );
  const vatLiabilityCents =
    (financials.accommodationVatCents ?? 0) +
    (financials.standardVatCents ?? 0);
  const vatCashImpactCents =
    taxConfig.vatInclusivity === 'inclusive' ? vatLiabilityCents : 0;
  const taxCashImpactCents =
    vatCashImpactCents +
    (financials.ecoContributionCents ?? 0) +
    (financials.incomeTaxCents ?? 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-0 backdrop-blur-md sm:p-4">
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-900 text-slate-100 shadow-2xl sm:h-auto sm:max-h-[90dvh] sm:max-w-xl sm:rounded-2xl sm:border sm:border-slate-700/90">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5">
            <Calculator className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-slate-100 sm:text-lg">
                Tax & Calculation Breakdown
              </h3>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                {property.name} · {selectedMonth}/{selectedYear}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            aria-label="Close calculation breakdown"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs no-scrollbar sm:p-6">
          <section className="space-y-2 border-b border-slate-800 pb-4">
            <div className="flex justify-between gap-4 font-semibold">
              <span>Gross Booking Revenue</span>
              <span className="font-mono text-slate-200">
                {formatCents(financials.grossBookingIncomeCents)}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-slate-400">
              <span>OTA Channel Commissions</span>
              <span className="font-mono text-amber-400">
                -{formatCents(financials.otaCommissionCents)}
              </span>
            </div>
            <div className="flex justify-between gap-4 font-semibold">
              <span>Net Booking Income</span>
              <span className="font-mono text-emerald-400">
                {formatCents(financials.netBookingIncomeCents)}
              </span>
            </div>
            <div className="flex justify-between gap-4 font-semibold">
              <span>Extra Income</span>
              <span className="font-mono text-emerald-400">
                +{formatCents(financials.extraIncomeCents)}
              </span>
            </div>
            <div className="flex justify-between gap-4 font-semibold">
              <span>Operating Expenses</span>
              <span className="font-mono text-rose-400">
                -{formatCents(financials.totalExpensesCents)}
              </span>
            </div>
          </section>

          <section className="space-y-2 border-b border-slate-800 pb-4">
            <div className="font-bold text-slate-200">
              Tax Liabilities ({taxConfig.vatInclusivity === 'inclusive' ? 'VAT included in entered prices' : 'VAT collected on top'})
            </div>
            <div className="flex justify-between gap-4 text-slate-300">
              <span>Accommodation VAT</span>
              <span className="font-mono text-amber-300">
                {formatCents(financials.accommodationVatCents)}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-slate-300">
              <span>Standard VAT</span>
              <span className="font-mono text-amber-300">
                {formatCents(financials.standardVatCents)}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-slate-300">
              <span>Eco Contribution / City Tax</span>
              <span className="font-mono text-amber-300">
                {formatCents(financials.ecoContributionCents)}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-slate-300">
              <span>Income Tax</span>
              <span className="font-mono text-amber-300">
                {formatCents(financials.incomeTaxCents)}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-t border-slate-800/80 pt-2 font-bold text-amber-400">
              <span>Total Tax Liabilities</span>
              <span className="font-mono">
                {formatCents(financials.calculatedTaxesCents)}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-cyan-300">
              <span>Tax Cash Impact in Net Balance</span>
              <span className="font-mono font-bold">
                -{formatCents(taxCashImpactCents)}
              </span>
            </div>
          </section>

          {taxConfig.vatInclusivity === 'exclusive' && (
            <div className="flex gap-2 rounded-xl border border-cyan-900/70 bg-cyan-950/20 p-3 text-[11px] leading-relaxed text-cyan-200/80">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-400" />
              <p>
                Exclusive VAT is charged to the guest on top of the entered booking price. It remains a reported liability but is not deducted a second time from the entered owner revenue.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl border border-cyan-800/80 bg-cyan-950/60 p-4 text-sm font-black text-cyan-300">
            <span>Net Balance</span>
            <span className="font-mono">
              {formatCents(financials.netBalanceCents)}
            </span>
          </div>
        </div>

        <footer className="flex flex-shrink-0 justify-end border-t border-slate-800 bg-slate-900/95 p-3 sm:p-4">
          <button
            type="button"
            onClick={closeModal}
            className="h-10 w-full rounded-lg bg-slate-800 px-4 text-xs font-semibold text-slate-200 hover:bg-slate-700 sm:w-auto"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
