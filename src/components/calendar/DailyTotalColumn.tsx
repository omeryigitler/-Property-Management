import React from 'react';
import { formatCents } from '../../utils/currency';

interface DailyTotalColumnProps {
  dailyTotalCents: number;
  isHoveredRow: boolean;
}

export function DailyTotalColumn({
  dailyTotalCents,
  isHoveredRow,
}: DailyTotalColumnProps) {
  const bgClass =
    dailyTotalCents > 0
      ? 'bg-[#fff8e7] text-[#674c0c] border-[#e8d59d]'
      : 'bg-[#fcfbfa] text-[#746d69] border-[#ece6e2]';
  const hoverHighlight = isHoveredRow
    ? 'bg-[#fff2cf] text-[#5e4509]'
    : '';

  return (
    <div
      className={`flex h-9 w-[120px] min-w-[110px] items-center justify-end border-r border-b px-2.5 text-xs font-bold tabular-nums transition-colors sm:h-10 ${bgClass} ${hoverHighlight}`}
    >
      <span>{formatCents(dailyTotalCents)}</span>
    </div>
  );
}
