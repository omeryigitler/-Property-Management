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
  dateStr,
  weekday,
  isWeekend,
  isToday,
  isHoveredRow,
}: DayColumnProps) {
  const bgClass = isToday
    ? 'bg-[#ff3e00]/20 text-[#ff3e00] border-[#ff3e00]/60 font-black'
    : isWeekend
    ? 'bg-slate-900/90 text-amber-200/90 border-slate-800 font-bold'
    : 'bg-slate-900/95 text-slate-300 border-slate-800 font-semibold';

  const hoverHighlight = isHoveredRow ? 'bg-[#ff3e00]/15 text-[#ff3e00]' : '';

  return (
    <div
      className={`sticky left-0 z-20 w-20 sm:w-24 min-w-[80px] sm:min-w-[96px] h-9 sm:h-10 border-r border-b px-2.5 flex items-center justify-between text-xs transition-colors select-none ${bgClass} ${hoverHighlight}`}
    >
      <div className="flex items-center gap-1.5 font-mono">
        <span className="font-black text-sm">{dayNumber.toString().padStart(2, '0')}</span>
        <span className="text-[10px] uppercase tracking-widest font-extrabold">{weekday}</span>
      </div>

      {isToday && (
        <span className="w-2 h-2 rounded-full bg-[#ff3e00] animate-ping flex-shrink-0" title="Today" />
      )}
    </div>
  );
}
