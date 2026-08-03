import React from 'react';
import {
  Building2,
  Plus,
  Settings,
  Download,
  History,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { MONTH_NAMES } from '../../utils/dateUtilities';
import { isTaxConfigured } from '../../utils/taxCalculations';
import { MonthYearNavigator } from './MonthYearNavigator';

export function DashboardHeader() {
  const selectedMonth = useDashboardStore((s) => s.selectedMonth);
  const selectedYear = useDashboardStore((s) => s.selectedYear);
  const taxConfiguration = useDashboardStore((s) => s.taxConfiguration);
  const openModal = useDashboardStore((s) => s.openModal);

  const taxIsConfigured = isTaxConfigured(taxConfiguration);

  return (
    <header className="w-full bg-slate-950 border-b border-slate-800 p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Title & Brand */}
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-[#ff3e00]/10 text-[#ff3e00] border border-[#ff3e00]/40 shadow-inner">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-display font-black tracking-tighter uppercase text-slate-100">
                Short-Let<span className="text-[#ff3e00]">.</span>HQ
              </h1>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-[#ff3e00]/15 border border-[#ff3e00]/30 text-[10px] font-black text-[#ff3e00] uppercase tracking-widest">
                Malta Portfolio
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              High-Density Calendar & Financial Ledger • <span className="text-slate-200">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</span>
            </p>
          </div>
        </div>

        {/* Top Control Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
          {/* New Booking Button */}
          <button
            type="button"
            onClick={() => openModal('booking_add')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ff3e00] hover:bg-[#e03700] text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#ff3e00]/20 hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Booking</span>
          </button>

          {/* Tax Status Badge / Button */}
          <button
            type="button"
            onClick={() => openModal('tax_config')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all ${
              taxIsConfigured
                ? 'bg-slate-900 text-emerald-300 border-emerald-800/80 hover:bg-emerald-950/60'
                : 'bg-amber-950 text-amber-300 border-amber-700/80 hover:bg-amber-900 animate-pulse'
            }`}
            title="Configure Tax Parameters"
          >
            {taxIsConfigured ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            )}
            <span className="hidden sm:inline">
              {taxIsConfigured ? 'Taxes Configured' : 'Taxes Required'}
            </span>
          </button>

          {/* Export / Import */}
          <button
            type="button"
            onClick={() => openModal('export_import')}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition-colors"
            title="Import & Export Hub"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Activity Log */}
          <button
            type="button"
            onClick={() => openModal('history')}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition-colors"
            title="Audit Activity Log"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => openModal('settings')}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition-colors"
            title="Dashboard Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month & Year Navigator Bar */}
      <MonthYearNavigator />
    </header>
  );
}
