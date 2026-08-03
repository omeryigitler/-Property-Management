import React from 'react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { ALL_PROPERTIES, DAILY_TOTAL_COLUMN_CONFIG } from '../../config/locations';
import { calculateAggregatedFinancials } from '../../utils/financeCalculations';
import { formatCents } from '../../utils/currency';
import { PropertyFinanceColumn } from './PropertyFinanceColumn';
import { Lock } from 'lucide-react';

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

  return (
    <div className="flex flex-col w-full border-t-2 border-[#ff3e00] bg-slate-950 mt-2 select-none">
      {/* Section Divider Header */}
      <div className="flex sticky left-0 z-30 bg-slate-900 border-b border-slate-800 px-4 py-2 items-center justify-between text-xs font-black text-[#ff3e00]">
        <span className="font-display uppercase tracking-widest text-sm">MONTHLY FINANCIAL LEDGER</span>
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          Aligned by property column • Click mobile cells to edit
        </span>
      </div>

      {/* Financial Columns Container */}
      <div className="flex">
        {/* Left Row Labels Header */}
        <div className="sticky left-0 z-20 w-20 sm:w-24 min-w-[80px] sm:min-w-[96px] bg-slate-900 border-r border-slate-800 flex flex-col text-[10px] font-black text-slate-400 uppercase tracking-wider">
          <div className="p-2 border-b border-slate-800 min-h-[44px] flex items-center font-display">AYLIK TOPLAM</div>
          <div className="p-2 border-b border-slate-800 min-h-[100px] flex items-center text-emerald-400 font-display">EXTRA INCOME</div>
          <div className="p-2 border-b border-slate-800 min-h-[140px] flex items-center text-rose-400 font-display">EXPENSES</div>
          <div className="p-2 border-b border-slate-800 min-h-[40px] flex items-center font-display">TOPLAM GİDER</div>
          <div className="p-2 border-b border-slate-800 min-h-[42px] flex items-center text-amber-400 font-display">HESAPLANAN VERGİLER</div>
          <div className="p-2.5 border-b border-slate-800 min-h-[48px] flex items-center text-slate-100 font-display font-black">NET BAKİYE</div>
        </div>

        {/* Per-Property Financial Columns */}
        {ALL_PROPERTIES.map((prop) => (
          <div
            key={prop.id}
            onClick={() => {
              if (window.innerWidth < 768) {
                openModal('mobile_property_finance', { propertyId: prop.id });
              }
            }}
          >
            <PropertyFinanceColumn propertyId={prop.id} />
          </div>
        ))}

        {/* Final Aggregated Column (GÜNLÜK TOPLAM) */}
        <div className="w-[120px] min-w-[110px] bg-yellow-950/60 border-r border-slate-800 flex flex-col font-mono text-xs">
          {/* 1. Monthly Booking Income */}
          <div className="p-2 border-b border-yellow-800/80 min-h-[44px] flex flex-col justify-center bg-yellow-950/90 font-black text-emerald-300">
            <span className="text-[9px] font-sans font-bold text-yellow-200/80 uppercase tracking-wider">NET BOOKING</span>
            <span>{formatCents(agg.combinedNetBookingIncomeCents)}</span>
            <span className="text-[9px] font-mono text-slate-400 font-medium">Gross: {formatCents(agg.combinedGrossBookingIncomeCents)}</span>
          </div>

          {/* 2. Extra Income */}
          <div className="p-2 border-b border-yellow-800/80 min-h-[100px] flex flex-col justify-center text-emerald-400 font-black">
            <span className="text-[9px] font-sans font-bold text-yellow-200/80 uppercase tracking-wider">TOTAL EXTRA</span>
            <span>+{formatCents(agg.combinedExtraIncomeCents)}</span>
          </div>

          {/* 3. Expenses List */}
          <div className="p-2 border-b border-yellow-800/80 min-h-[140px] flex flex-col justify-center text-rose-300 font-black">
            <span className="text-[9px] font-sans font-bold text-yellow-200/80 uppercase tracking-wider">TOTAL EXPENSES</span>
            <span>-{formatCents(agg.combinedExpenseCents)}</span>
          </div>

          {/* 4. Toplam Gider */}
          <div className="p-2 border-b border-yellow-800/80 min-h-[40px] flex flex-col justify-center bg-yellow-950/90 text-rose-300 font-black">
            <span>{formatCents(agg.combinedExpenseCents)}</span>
          </div>

          {/* 5. Hesaplanan Vergiler */}
          <div className="p-2 border-b border-yellow-800/80 min-h-[42px] flex flex-col justify-center bg-yellow-950/90 text-amber-300 font-black">
            {agg.isTaxConfigured ? (
              <span>{formatCents(agg.combinedCalculatedTaxesCents)}</span>
            ) : (
              <span className="text-[9px] text-amber-400 font-sans flex items-center gap-1 font-bold">
                <Lock className="w-3 h-3" /> Locked
              </span>
            )}
          </div>

          {/* 6. Net Bakiye */}
          <div className="p-2.5 border-b border-yellow-800/80 min-h-[48px] flex flex-col justify-center bg-yellow-950/95 text-[#ff3e00] font-black text-sm">
            {agg.isTaxConfigured ? (
              <span>{formatCents(agg.combinedNetBalanceCents)}</span>
            ) : (
              <span className="text-[9px] text-amber-400 font-sans uppercase font-bold">
                Configuration Required
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
