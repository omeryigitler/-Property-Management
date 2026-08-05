import React from 'react';

interface DayColumnProps {
  dayNumber: number;
  dateStr: string;
  weekday: string;
  isWeekend: boolean;
  isToday: boolean;
  isHoveredRow: boolean;
}

export function DayColumn({
  dayNumber,
  weekday,
  isWeekend,
  isToday,
  isHoveredRow,
}: DayColumnProps) {
  const bgClass = isToday
    ? 'bg-[#fff0ef] text-[#a93439] border-[#ffc7c4]'
    : isWeekend
      ? 'bg-[#faf7f4] text-[#715b45] border-[#e9e1dc]'
      : 'bg-white text-[#48423f] border-[#ece6e2]';
  const hoverHighlight = isHoveredRow
    ? 'bg-[#fff6f4] text-[#a93439]'
    : '';

  return (
    <div
      className={`sticky left-0 z-20 flex h-9 w-20 min-w-[80px] items-center justify-between border-r border-b px-2.5 text-xs transition-colors select-none sm:h-10 sm:w-24 sm:min-w-[96px] ${bgClass} ${hoverHighlight}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-extrabold tabular-nums">
          {dayNumber.toString().padStart(2, '0')}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.04em]">
          {weekday}
        </span>
      </div>

      {isToday && (
        <span
          className="h-2 w-2 flex-shrink-0 rounded-full bg-[#ff5a5f]"
          title="Today"
        />
      )}
    </div>
  );
}
