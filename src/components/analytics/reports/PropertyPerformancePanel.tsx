import React from 'react';
import { CHANNEL_CONFIG } from '../../../config/locations';
import { formatCents } from '../../../utils/currency';
import { AnnualPropertyRow, ChangeValue, Panel } from './reportUi';

export function PropertyPerformancePanel({
  rows,
}: {
  rows: AnnualPropertyRow[];
}) {
  const top = rows[0] ?? null;
  return (
    <Panel title="Property Performance" subtitle="Annual properties ranked by net profit">
      {top && (
        <div className="mb-3 flex flex-col gap-2 rounded-xl border border-[#b8dfcf] bg-[#eef8f3] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#39745e]">Top Performing Property</p>
            <p className="mt-1 text-sm font-extrabold text-[#203f34]">{top.propertyName}</p>
          </div>
          <strong className="font-mono text-lg text-[#1f7a58]">{formatCents(top.netBalanceCents)}</strong>
        </div>
      )}

      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[1040px]">
          <div className="grid grid-cols-[1.4fr_1.2fr_repeat(2,0.9fr)_0.8fr_0.8fr_1fr] gap-3 border-b border-[#eee8e5] bg-[#fffaf9] px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-[#817873]">
            <span>Property</span><span>Total Income</span><span>Expenses</span><span>Net Profit</span><span>Vs Previous</span><span>Best Month</span><span>Top Platform</span>
          </div>
          {rows.map((item) => (
            <div key={item.propertyId} className="grid grid-cols-[1.4fr_1.2fr_repeat(2,0.9fr)_0.8fr_0.8fr_1fr] items-center gap-3 border-b border-[#f0ebe8] px-3 py-3 text-xs last:border-b-0">
              <div className="min-w-0">
                <strong className="block truncate text-[#292422]">{item.propertyName}</strong>
                {!item.active && <span className="text-[10px] font-semibold text-[#9a918c]">Inactive</span>}
              </div>
              <span className="font-mono font-bold text-[#3c3734]">
                {formatCents(item.totalIncomeCents)}
                <small className="mt-0.5 block font-sans text-[9px] font-medium text-[#8a827d]">Booking {formatCents(item.bookingIncomeCents)} · Extra {formatCents(item.extraIncomeCents)}</small>
              </span>
              <span className="font-mono text-[#a13b40]">{formatCents(item.totalExpensesCents)}</span>
              <span className={`font-mono font-extrabold ${item.netBalanceCents >= 0 ? 'text-[#1f7a58]' : 'text-[#b13a40]'}`}>{formatCents(item.netBalanceCents)}</span>
              <ChangeValue value={item.netChangePct} />
              <span>{item.bestMonth?.label ?? '—'}</span>
              <span>{item.topChannel ? `${CHANNEL_CONFIG[item.topChannel].name} · ${item.topChannelSharePct.toFixed(1)}%` : '—'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {rows.map((item) => (
          <article key={item.propertyId} className="rounded-xl border border-[#e8e1dd] bg-[#fffdfc] p-3">
            <div className="flex items-start justify-between gap-3">
              <div><strong className="text-sm text-[#292422]">{item.propertyName}</strong>{!item.active && <span className="ml-2 text-[10px] text-[#9a918c]">Inactive</span>}</div>
              <strong className={`font-mono text-sm ${item.netBalanceCents >= 0 ? 'text-[#1f7a58]' : 'text-[#b13a40]'}`}>{formatCents(item.netBalanceCents)}</strong>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <span>Total income</span><strong className="text-right">{formatCents(item.totalIncomeCents)}</strong>
              <span>Booking / Extra</span><span className="text-right">{formatCents(item.bookingIncomeCents)} / {formatCents(item.extraIncomeCents)}</span>
              <span>Expenses</span><strong className="text-right text-[#a13b40]">{formatCents(item.totalExpensesCents)}</strong>
              <span>Previous year</span><span className="text-right"><ChangeValue value={item.netChangePct} /></span>
              <span>Best month</span><strong className="text-right">{item.bestMonth?.label ?? '—'}</strong>
              <span>Occupancy</span><strong className="text-right">{item.occupancyRatePct.toFixed(1)}%</strong>
              <span>Top platform</span><strong className="text-right">{item.topChannel ? CHANNEL_CONFIG[item.topChannel].name : '—'}</strong>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}
