import React from 'react';
import { PropertyMonthlyPerformance, YearHighlights } from '../../../services/reportingService';
import { formatCents } from '../../../utils/currency';
import { ChangeValue, Panel } from './reportUi';

export function MonthlyPropertyPerformancePanel({ rows, highlights }: { rows: PropertyMonthlyPerformance[]; highlights: YearHighlights }) {
  return (
    <Panel title="Monthly Property Performance" subtitle="Total income, expenses and net profit for the selected property">
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-[#b8dfcf] bg-[#eef8f3] p-3 text-xs"><span className="block text-[#56776b]">Best month</span><strong className="mt-1 block text-[#1f6b4e]">{highlights.bestMonth ? `${highlights.bestMonth.label} · ${formatCents(highlights.bestMonth.netBalanceCents)}` : 'No data'}</strong></div>
        <div className="rounded-xl border border-[#efc7c4] bg-[#fff4f3] p-3 text-xs"><span className="block text-[#8c6663]">Lowest month</span><strong className="mt-1 block text-[#a9363c]">{highlights.worstMonth ? `${highlights.worstMonth.label} · ${formatCents(highlights.worstMonth.netBalanceCents)}` : 'No data'}</strong></div>
        <div className="rounded-xl border border-[#ddd8d4] bg-[#f7f6f4] p-3 text-xs"><span className="block text-[#756e69]">Negative months</span><strong className="mt-1 block text-[#332e2b]">{highlights.negativeMonthCount}</strong></div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[1fr_repeat(4,1fr)] gap-3 border-b border-[#eee8e5] bg-[#fffaf9] px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-[#817873]"><span>Month</span><span>Total Income</span><span>Expenses</span><span>Net Profit</span><span>Vs Previous</span></div>
          {rows.map((item) => {
            const totalIncomeCents = item.bookingIncomeCents + item.extraIncomeCents;
            return (
              <div key={item.key} className="grid grid-cols-[1fr_repeat(4,1fr)] items-center gap-3 border-b border-[#f0ebe8] px-3 py-3 text-xs last:border-b-0">
                <strong>{item.label}</strong>
                <span className="font-mono">{formatCents(totalIncomeCents)}<small className="mt-0.5 block font-sans text-[9px] text-[#8a827d]">Booking {formatCents(item.bookingIncomeCents)} · Extra {formatCents(item.extraIncomeCents)}</small></span>
                <span className="font-mono text-[#a13b40]">{formatCents(item.totalExpensesCents)}</span>
                <span className={`font-mono font-extrabold ${item.netBalanceCents >= 0 ? 'text-[#1f7a58]' : 'text-[#b13a40]'}`}>{formatCents(item.netBalanceCents)}</span>
                <ChangeValue value={item.netChangePct} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {rows.map((item) => {
          const totalIncomeCents = item.bookingIncomeCents + item.extraIncomeCents;
          return (
            <article key={item.key} className="rounded-xl border border-[#e8e1dd] p-3 text-xs">
              <div className="flex justify-between"><strong>{item.label}</strong><strong className={item.netBalanceCents >= 0 ? 'text-[#1f7a58]' : 'text-[#b13a40]'}>{formatCents(item.netBalanceCents)}</strong></div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-[#756e69]">
                <span>Total income</span><span className="text-right">{formatCents(totalIncomeCents)}</span>
                <span>Booking / Extra</span><span className="text-right">{formatCents(item.bookingIncomeCents)} / {formatCents(item.extraIncomeCents)}</span>
                <span>Expenses</span><span className="text-right">{formatCents(item.totalExpensesCents)}</span>
                <span>Previous year</span><span className="text-right"><ChangeValue value={item.netChangePct} /></span>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}
