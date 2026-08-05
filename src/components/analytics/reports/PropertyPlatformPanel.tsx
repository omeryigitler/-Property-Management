import React from 'react';
import { CHANNEL_CONFIG } from '../../../config/locations';
import { PropertyChannelMatrixRow } from '../../../services/reportingService';
import { formatCents } from '../../../utils/currency';
import { Panel } from './reportUi';

export function PropertyPlatformPanel({ rows }: { rows: PropertyChannelMatrixRow[] }) {
  return (
    <Panel title="Property × Platform" subtitle="Which platform brings confirmed income to each property">
      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[1.3fr_repeat(5,1fr)] gap-3 border-b border-[#eee8e5] bg-[#fffaf9] px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-[#817873]"><span>Property</span><span>Airbnb</span><span>Booking.com</span><span>Direct</span><span>VRBO</span><span>Total</span></div>
          {rows.map((item) => (
            <div key={item.propertyId} className="grid grid-cols-[1.3fr_repeat(5,1fr)] items-center gap-3 border-b border-[#f0ebe8] px-3 py-3 text-xs last:border-b-0">
              <div><strong>{item.propertyName}</strong><small className="mt-0.5 block text-[9px] text-[#8a827d]">{item.topChannel ? `Top: ${CHANNEL_CONFIG[item.topChannel].name} · ${item.topChannelSharePct.toFixed(1)}%` : 'No platform income'}</small></div>
              <span className="font-mono">{formatCents(item.airbnbCents)}</span><span className="font-mono">{formatCents(item.bookingComCents)}</span><span className="font-mono">{formatCents(item.directCents)}</span><span className="font-mono">{formatCents(item.vrboCents)}</span><strong className="font-mono">{formatCents(item.totalCents)}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2 md:hidden">
        {rows.map((item) => (
          <article key={item.propertyId} className="rounded-xl border border-[#e8e1dd] p-3">
            <div className="flex justify-between gap-3"><strong>{item.propertyName}</strong><strong className="font-mono">{formatCents(item.totalCents)}</strong></div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-[#756e69]"><span>Airbnb</span><span className="text-right">{formatCents(item.airbnbCents)}</span><span>Booking.com</span><span className="text-right">{formatCents(item.bookingComCents)}</span><span>Direct</span><span className="text-right">{formatCents(item.directCents)}</span><span>VRBO</span><span className="text-right">{formatCents(item.vrboCents)}</span></div>
          </article>
        ))}
      </div>
    </Panel>
  );
}
