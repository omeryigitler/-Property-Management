import React from 'react';
import {
  BarChart3,
  Building2,
  CalendarDays,
  Plus,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { MONTH_NAMES } from '../../utils/dateUtilities';
import { isTaxConfigured } from '../../utils/taxCalculations';
import { MonthYearNavigator } from './MonthYearNavigator';

export function DashboardHeader() {
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const mainViewMode = useDashboardStore((state) => state.mainViewMode);
  const setMainViewMode = useDashboardStore((state) => state.setMainViewMode);
  const taxConfiguration = useDashboardStore((state) => state.taxConfiguration);
  const openModal = useDashboardStore((state) => state.openModal);

  const taxIsConfigured = isTaxConfigured(taxConfiguration);
  const isReportsView = mainViewMode === 'analytics';

  return (
    <header className="w-full bg-slate-950 border-b border-slate-800 p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
              {isReportsView ? 'Portfolio Reports & Analytics' : 'High-Density Calendar & Financial Ledger'} •{' '}
              <span className="text-slate-200">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
          <div className="grid grid-cols-2 rounded-lg border border-slate-700/80 bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setMainViewMode('calendar')}
              className={`flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                !isReportsView
                  ? 'bg-[#ff3e00] text-white shadow-md shadow-[#ff3e00]/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
              title="Calendar & Financial Ledger"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => setMainViewMode('analytics')}
              className={`flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                isReportsView
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
              title="Reports & Analytics"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reports</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openModal('booking_add')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ff3e00] hover:bg-[#e03700] text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#ff3e00]/20 hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Booking</span>
          </button>

          <button
            type="button"
            onClick={() => openModal('settings')}
            className={`relative flex items-center justify-center rounded-lg border p-2 transition-colors ${
              taxIsConfigured
                ? 'border-slate-700/80 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                : 'border-amber-700/80 bg-amber-950 text-amber-300 hover:bg-amber-900'
            }`}
            title="Settings & Management"
          >
            <Settings className="w-4 h-4" />
            {!taxIsConfigured && (
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-slate-950">
                <ShieldAlert className="h-2.5 w-2.5" />
              </span>
            )}
          </button>
        </div>
      </div>

      <MonthYearNavigator />
    </header>
  );
}
