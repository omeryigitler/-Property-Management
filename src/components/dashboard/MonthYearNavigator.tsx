import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { MONTH_NAMES, MONTH_SHORT_NAMES } from '../../utils/dateUtilities';
import { CustomSelect } from '../common/CustomSelect';

export function MonthYearNavigator() {
  const selectedMonth = useDashboardStore((s) => s.selectedMonth);
  const selectedYear = useDashboardStore((s) => s.selectedYear);
  const setSelectedMonth = useDashboardStore((s) => s.setSelectedMonth);
  const setSelectedYear = useDashboardStore((s) => s.setSelectedYear);
  const nextMonth = useDashboardStore((s) => s.nextMonth);
  const prevMonth = useDashboardStore((s) => s.prevMonth);
  const goToToday = useDashboardStore((s) => s.goToToday);

  const today = new Date();
  const isCurrentMonthSelected =
    selectedMonth === today.getMonth() + 1 && selectedYear === today.getFullYear();

  // Generate Year options from currentYear-3 to currentYear+5
  const currentYearNum = new Date().getFullYear();
  const yearOptions = Array.from({ length: 9 }, (_, i) => {
    const y = currentYearNum - 3 + i;
    return { value: y, label: y.toString() };
  });

  const monthOptions = MONTH_NAMES.map((name, idx) => ({
    value: idx + 1,
    label: name,
  }));

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Top row: Prev/Next, Today, Month & Year Selects */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Previous Month"
            className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={goToToday}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-black uppercase tracking-wider transition-colors ${
              isCurrentMonthSelected
                ? 'bg-[#ff3e00]/20 text-[#ff3e00] border-[#ff3e00]/60'
                : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Today</span>
          </button>

          <button
            type="button"
            onClick={nextMonth}
            aria-label="Next Month"
            className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-200 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Custom Selects for Month & Year */}
        <div className="flex items-center gap-2">
          <CustomSelect
            options={monthOptions}
            value={selectedMonth}
            onChange={(m) => setSelectedMonth(m)}
            className="w-38"
          />
          <CustomSelect
            options={yearOptions}
            value={selectedYear}
            onChange={(y) => setSelectedYear(y)}
            className="w-28"
          />
        </div>
      </div>

      {/* Spreadsheet Style Month Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-1 no-scrollbar border-b border-slate-800/80">
        {MONTH_SHORT_NAMES.map((shortName, idx) => {
          const monthNum = idx + 1;
          const isSelected = selectedMonth === monthNum;
          const isTodayMonth =
            today.getMonth() + 1 === monthNum && today.getFullYear() === selectedYear;

          return (
            <button
              key={shortName}
              type="button"
              onClick={() => setSelectedMonth(monthNum)}
              className={`px-3.5 py-1.5 rounded-t-lg text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border-t border-x ${
                isSelected
                  ? 'bg-slate-900 text-[#ff3e00] border-slate-700/80 shadow-md border-b-2 border-b-[#ff3e00]'
                  : 'bg-slate-950 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span>{shortName}</span>
                {isTodayMonth && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff3e00] inline-block" title="Current Month" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
