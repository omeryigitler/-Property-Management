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
    <header className="flex w-full flex-col gap-3 border-b border-[#e7e2df] bg-white p-3 shadow-[0_10px_35px_rgba(60,45,40,0.06)] sm:gap-4 sm:p-5">
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#ffd1ce] bg-[#fff0ef] text-[#e5484d]">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-extrabold tracking-[-0.035em] text-[#222222] sm:text-2xl">
              Short-Let<span className="text-[#ff5a5f]">.</span>HQ
            </h1>
            <p className="truncate text-[10px] font-semibold tracking-[0.02em] text-[#717171] sm:text-xs">
              {isReportsView ? 'Portfolio reports' : 'Calendar and financial overview'} ·{' '}
              <span className="text-[#3d3d3d]">
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </span>
            </p>
          </div>
        </div>

        <div className="grid w-full grid-cols-[1fr_auto] items-center gap-2 md:flex md:w-auto">
          <div className="grid grid-cols-2 rounded-xl border border-[#e7e2df] bg-[#f7f7f5] p-1">
            <button
              type="button"
              onClick={() => setMainViewMode('calendar')}
              className={`flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-[10px] font-bold transition-all ${
                !isReportsView
                  ? 'bg-white text-[#222222] shadow-[0_3px_12px_rgba(40,30,25,0.10)]'
                  : 'text-[#717171] hover:text-[#222222]'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </button>
            <button
              type="button"
              onClick={() => setMainViewMode('analytics')}
              className={`flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-[10px] font-bold transition-all ${
                isReportsView
                  ? 'bg-white text-[#222222] shadow-[0_3px_12px_rgba(40,30,25,0.10)]'
                  : 'text-[#717171] hover:text-[#222222]'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" /> Reports
            </button>
          </div>
          <button
            type="button"
            onClick={() => openModal('booking_add')}
            className="hidden h-10 items-center gap-1.5 rounded-xl bg-[#ff5a5f] px-4 text-xs font-bold text-white shadow-[0_8px_20px_rgba(255,90,95,0.24)] transition-colors hover:bg-[#e94f54] sm:flex"
          >
            <Plus className="h-4 w-4" /> New Booking
          </button>
          <button
            type="button"
            onClick={() => openModal('settings')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e7e2df] bg-white text-[#5f5f5f] shadow-sm transition-colors hover:border-[#d7cfcb] hover:bg-[#fff8f7] hover:text-[#222222]"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
      <MonthYearNavigator />
    </header>
  );
}
