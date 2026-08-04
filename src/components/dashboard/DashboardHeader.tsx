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
    <header className="flex w-full flex-col gap-3 border-b border-slate-800 bg-slate-950 p-3 shadow-xl sm:gap-4 sm:p-5">
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#ff3e00]/40 bg-[#ff3e00]/10 text-[#ff3e00] shadow-inner sm:h-auto sm:w-auto sm:p-2.5">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className="truncate font-display text-lg font-black uppercase tracking-tighter text-slate-100 sm:text-2xl">
                Short-Let<span className="text-[#ff3e00]">.</span>HQ
              </h1>
              <span className="hidden rounded-full border border-[#ff3e00]/30 bg-[#ff3e00]/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#ff3e00] sm:inline-block">
                Malta Portfolio
              </span>
            </div>
            <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:text-[11px] sm:text-slate-400">
              {isReportsView ? 'Portfolio Reports' : 'Calendar & Financial Ledger'} •{' '}
              <span className="text-slate-300">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</span>
            </p>
          </div>
        </div>

        <div className="grid w-full grid-cols-[1fr_auto] items-center gap-2 md:flex md:w-auto md:flex-wrap md:justify-end">
          <div className="grid grid-cols-2 rounded-lg border border-slate-700/80 bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setMainViewMode('calendar')}
              className={`flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[9px] font-black uppercase tracking-wider transition-colors sm:text-[10px] ${
                !isReportsView
                  ? 'bg-[#ff3e00] text-white shadow-md shadow-[#ff3e00]/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
              title="Calendar & Financial Ledger"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => setMainViewMode('analytics')}
              className={`flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[9px] font-black uppercase tracking-wider transition-colors sm:text-[10px] ${
                isReportsView
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
              title="Reports & Analytics"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Reports</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openModal('booking_add')}
            className="hidden h-9 items-center gap-1.5 rounded-lg bg-[#ff3e00] px-4 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-[#ff3e00]/20 transition-all hover:bg-[#e03700] hover:scale-[1.02] active:scale-95 sm:flex"
          >
            <Plus className="h-4 w-4" />
            <span>New Booking</span>
          </button>

          <button
            type="button"
            onClick={() => openModal('settings')}
            className={`relative flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
              taxIsConfigured
                ? 'border-slate-700/80 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                : 'border-amber-700/80 bg-amber-950 text-amber-300 hover:bg-amber-900'
            }`}
            title="Settings & Management"
          >
            <Settings className="h-4 w-4" />
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
