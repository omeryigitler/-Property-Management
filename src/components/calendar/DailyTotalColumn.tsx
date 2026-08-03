import React from 'react';
import { formatCents } from '../../utils/currency';

interface DailyTotalColumnProps {
  dailyTotalCents: number;
  isHoveredRow: boolean;
}

export function DailyTotalColumn({ dailyTotalCents, isHoveredRow }: DailyTotalColumnProps) {
  const bgClass =
    dailyTotalCents > 0
      ? 'bg-yellow-950/40 text-yellow-200 border-yellow-800/60 font-semibold'
      : 'bg-slate-950/60 text-slate-500 border-slate-800/80';

  const hoverHighlight = isHoveredRow ? 'bg-yellow-900/60 text-yellow-100' : '';

  return (
    <div
      className={`w-[120px] min-w-[110px] h-9 sm:h-10 border-r border-b px-2.5 flex items-center justify-end text-xs font-mono transition-colors ${bgClass} ${hoverHighlight}`}
    >
      <span>{formatCents(dailyTotalCents)}</span>
    </div>
  );
}
