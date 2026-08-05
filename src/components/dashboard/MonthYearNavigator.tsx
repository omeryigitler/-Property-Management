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
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e7e2df] bg-white text-[#4f4f4f] shadow-sm transition-colors hover:bg-[#fff8f7]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={goToToday}
            className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[10px] font-bold transition-colors sm:px-3.5 sm:text-xs ${
              isCurrentMonthSelected
                ? 'border-[#ffc7c4] bg-[#fff0ef] text-[#c93f45]'
                : 'border-[#e7e2df] bg-white text-[#4f4f4f] hover:bg-[#fff8f7]'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Today</span>
          </button>

          <button
            type="button"
            onClick={nextMonth}
            aria-label="Next Month"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e7e2df] bg-white text-[#4f4f4f] shadow-sm transition-colors hover:bg-[#fff8f7]"
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

      <div className="flex snap-x snap-mandatory items-center gap-1 overflow-x-auto border-b border-[#e7e2df] pb-1 pt-1 no-scrollbar">
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
              className={`snap-start whitespace-nowrap rounded-t-xl border-x border-t px-3 py-1.5 text-[10px] font-bold transition-all sm:px-3.5 sm:text-xs ${
                isSelected
                  ? 'border-[#e7e2df] border-b-2 border-b-[#ff5a5f] bg-white text-[#c93f45] shadow-sm'
                  : 'border-transparent bg-transparent text-[#8a8a8a] hover:bg-white hover:text-[#3d3d3d]'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {shortName}
                {isTodayMonth && (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ff5a5f]" title="Current Month" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
