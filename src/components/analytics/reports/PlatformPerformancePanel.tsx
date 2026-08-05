import React from 'react';
import { ChevronRight } from 'lucide-react';
import { CHANNEL_CONFIG } from '../../../config/locations';
import { ChannelSeriesPoint, ReportChannel } from '../../../services/reportingService';
import { Channel } from '../../../types';
import { formatCents } from '../../../utils/currency';
import { CustomSelect } from '../../common/CustomSelect';
import { ChangeValue, Panel } from './reportUi';

const CHANNELS = Object.keys(CHANNEL_CONFIG) as Channel[];

export function PlatformPerformancePanel({ rows, platform, setPlatform }: { rows: ChannelSeriesPoint[]; platform: ReportChannel; setPlatform: (platform: ReportChannel) => void }) {
  const options = [{ value: 'all', label: 'All Platforms' }, ...CHANNELS.map((channel) => ({ value: channel, label: CHANNEL_CONFIG[channel].name }))];
  return (
    <Panel title="Platform Performance" subtitle="Confirmed reservations, nights and income by booking platform" action={<div data-platform-filter="section" className="w-full sm:w-48"><CustomSelect value={platform} onChange={(value: string | number) => setPlatform(value as ReportChannel)} options={options} className="w-full" /></div>}>
      {rows.length ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <div className="min-w-[960px]">
              <div className="grid grid-cols-[1.1fr_repeat(7,0.9fr)] gap-3 border-b border-[#eee8e5] bg-[#fffaf9] px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-[#817873]"><span>Platform</span><span>Reservations</span><span>Nights</span><span>Income</span><span>Avg Booking</span><span>Avg Stay</span><span>Share</span><span>Vs Previous</span></div>
              {rows.map((item) => (
                <button type="button" key={item.channel} onClick={() => setPlatform(platform === item.channel ? 'all' : item.channel)} className={`grid w-full grid-cols-[1.1fr_repeat(7,0.9fr)] items-center gap-3 border-b border-[#f0ebe8] px-3 py-3 text-left text-xs transition-colors last:border-b-0 ${platform === item.channel ? 'bg-[#fff0ef]' : 'hover:bg-[#fffaf9]'}`}>
                  <span className="flex items-center gap-2 font-extrabold"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHANNEL_CONFIG[item.channel].hex }} />{item.label}</span>
                  <span>{item.bookingCount}</span><span>{item.occupiedNights}</span>
                  <span className="font-mono font-extrabold">{formatCents(item.bookingIncomeCents)}{item.provisionalIncomeCents > 0 && <small className="mt-0.5 block text-[9px] font-semibold text-[#8a827d]">Pending {formatCents(item.provisionalIncomeCents)}</small>}</span>
                  <span className="font-mono">{formatCents(item.averageBookingCents)}</span><span>{item.averageStayNights.toFixed(1)} nights</span><span>{item.incomeSharePct.toFixed(1)}%</span>
                  <span className="flex items-center justify-between gap-2"><ChangeValue value={item.incomeChangePct} /><ChevronRight className="h-3.5 w-3.5 text-[#aaa19c]" /></span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2 md:hidden">
            {rows.map((item) => (
              <button type="button" key={item.channel} onClick={() => setPlatform(platform === item.channel ? 'all' : item.channel)} className={`w-full rounded-xl border p-3 text-left ${platform === item.channel ? 'border-[#ffb9b5] bg-[#fff0ef]' : 'border-[#e8e1dd] bg-[#fffdfc]'}`}>
                <div className="flex items-start justify-between gap-3"><span className="flex items-center gap-2 font-extrabold"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHANNEL_CONFIG[item.channel].hex }} />{item.label}</span><strong className="font-mono">{formatCents(item.bookingIncomeCents)}</strong></div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#6f6763]"><span>{item.bookingCount} reservations</span><span className="text-right">{item.occupiedNights} nights</span><span>Average {formatCents(item.averageBookingCents)}</span><span className="text-right">{item.incomeSharePct.toFixed(1)}% share</span><span>Previous year</span><span className="text-right"><ChangeValue value={item.incomeChangePct} /></span></div>
                {item.provisionalIncomeCents > 0 && <p className="mt-2 text-[10px] font-semibold text-[#8a827d]">Pending requests: {formatCents(item.provisionalIncomeCents)}</p>}
              </button>
            ))}
          </div>
        </>
      ) : <div className="py-10 text-center text-sm font-medium text-[#817975]">No platform reservations for this selection or the previous year.</div>}
    </Panel>
  );
}
