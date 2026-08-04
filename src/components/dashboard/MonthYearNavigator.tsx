import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { MONTH_NAMES, MONTH_SHORT_NAMES } from '../../utils/dateUtilities';
import { CustomSelect } from '../common/CustomSelect';

export function MonthYearNavigator() {
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const setSelectedMonth = useDashboardStore((state) => state.setSelectedMonth);
  const setSelectedYear = useDashboardStore((state) => state.setSelectedYear);
  const nextMonth = useDashboardStore((state) => state.nextMonth);
  const prevMonth = useDashboardStore((state) => state.prevMonth);
  const goToToday = useDashboardStore((state) => state.goToToday);

  const today = new Date();
  const isCurrentMonthSelected =
    selectedMonth === today.getMonth() + 1 && selectedYear === today.getFullYear();

  const currentYearNum = new Date().getFullYear();
  const yearOptions = Array.from({ length: 9 }, (_, index) => {
    const year = currentYearNum - 3 + index;
    return { value: year, label: year.toString() };
  });

  const monthOptions = MONTH_NAMES.map((name, index) => ({
    value: index + 1,
    label: name,
  }));

  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:flex-wrap sm:justify-between sm:gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Previous Month"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900 text-slate-200 transition-colors hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={goToToday}
            className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[9px] font-black uppercase tracking-wider transition-colors sm:px-3.5 sm:text-xs ${
              isCurrentMonthSelected
                ? 'border-[#ff3e00]/60 bg-[#ff3e00]/20 text-[#ff3e00]'
                : 'border-slate-700/80 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Today</span>
          </button>

          <button
            type="button"
            onClick={nextMonth}
            aria-label="Next Month"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900 text-slate-200 transition-colors hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_86px] items-center gap-2 sm:flex">
          <CustomSelect
            options={monthOptions}
            value={selectedMonth}
            onChange={(month) => setSelectedMonth(month)}
            className="min-w-0 sm:w-38"
          />
          <CustomSelect
            options={yearOptions}
            value={selectedYear}
            onChange={(year) => setSelectedYear(year)}
            className="min-w-0 sm:w-28"
          />
        </div>
      </div>

      <div className="flex snap-x snap-mandatory items-center gap-1 overflow-x-auto border-b border-slate-800/80 pb-1 pt-1 no-scrollbar">
        {MONTH_SHORT_NAMES.map((shortName, index) => {
          const monthNumber = index + 1;
          const isSelected = selectedMonth === monthNumber;
          const isTodayMonth =
            today.getMonth() + 1 === monthNumber && today.getFullYear() === selectedYear;

          return (
            <button
              key={shortName}
              type="button"
              onClick={() => setSelectedMonth(monthNumber)}
              className={`snap-start whitespace-nowrap rounded-t-lg border-x border-t px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all sm:px-3.5 sm:text-xs ${
                isSelected
                  ? 'border-slate-700/80 border-b-2 border-b-[#ff3e00] bg-slate-900 text-[#ff3e00] shadow-md'
                  : 'border-transparent bg-slate-950 text-slate-500 hover:bg-slate-900/40 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {shortName}
                {isTodayMonth && (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ff3e00]" title="Current Month" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
