import React from 'react';
import { BarChart3, Building2, CalendarDays, Plus, Settings } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { MONTH_NAMES } from '../../utils/dateUtilities';
import { MonthYearNavigator } from './MonthYearNavigator';

export function DashboardHeader() {
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const mainViewMode = useDashboardStore((state) => state.mainViewMode);
  const setMainViewMode = useDashboardStore((state) => state.setMainViewMode);
  const openModal = useDashboardStore((state) => state.openModal);
  const isReportsView = mainViewMode === 'analytics';

  return (
    <header className="flex w-full flex-col gap-3 border-b border-slate-800 bg-slate-950 p-3 shadow-xl sm:gap-4 sm:p-5">
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#ff3e00]/40 bg-[#ff3e00]/10 text-[#ff3e00]">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-black uppercase tracking-tighter sm:text-2xl">
              Short-Let<span className="text-[#ff3e00]">.</span>HQ
            </h1>
            <p className="truncate text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:text-[11px]">
              {isReportsView ? 'Portfolio Reports' : 'Calendar & Financial Ledger'} •{' '}
              <span className="text-slate-300">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</span>
            </p>
          </div>
        </div>

        <div className="grid w-full grid-cols-[1fr_auto] items-center gap-2 md:flex md:w-auto">
          <div className="grid grid-cols-2 rounded-lg border border-slate-700/80 bg-slate-900 p-1">
            <button type="button" onClick={() => setMainViewMode('calendar')} className={`flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[9px] font-black uppercase ${!isReportsView ? 'bg-[#ff3e00] text-white' : 'text-slate-400'}`}>
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </button>
            <button type="button" onClick={() => setMainViewMode('analytics')} className={`flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[9px] font-black uppercase ${isReportsView ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}>
              <BarChart3 className="h-3.5 w-3.5" /> Reports
            </button>
          </div>
          <button type="button" onClick={() => openModal('booking_add')} className="hidden h-9 items-center gap-1.5 rounded-lg bg-[#ff3e00] px-4 text-xs font-black uppercase text-white sm:flex">
            <Plus className="h-4 w-4" /> New Booking
          </button>
          <button type="button" onClick={() => openModal('settings')} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300" title="Settings">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
      <MonthYearNavigator />
    </header>
  );
}
