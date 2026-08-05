import React from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { CHANNEL_CONFIG } from '../../../config/locations';
import {
  ChannelSeriesPoint,
  ReportChannel,
} from '../../../services/reportingService';
import { formatCents } from '../../../utils/currency';
import { Panel, tooltipStyle } from './reportUi';

export function ChannelMixPanel({
  channelSeries,
  platform,
  setPlatform,
}: {
  channelSeries: ChannelSeriesPoint[];
  platform: ReportChannel;
  setPlatform: (platform: ReportChannel) => void;
}) {
  const pieSeries = channelSeries.filter((item) => item.bookingIncomeCents > 0);
  const totalIncomeCents = pieSeries.reduce(
    (sum, item) => sum + item.bookingIncomeCents,
    0
  );
  const selected =
    platform === 'all'
      ? null
      : channelSeries.find((item) => item.channel === platform) ?? null;
  const centerLabel =
    platform === 'all' ? 'Total' : CHANNEL_CONFIG[platform].name;
  const centerValue =
    platform === 'all' ? totalIncomeCents : selected?.bookingIncomeCents ?? 0;

  return (
    <Panel
      title="Booking Channel Mix"
      subtitle="Confirmed reservation income by platform"
    >
      {pieSeries.length ? (
        <>
          <div className="relative h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieSeries}
                  dataKey="bookingIncomeCents"
                  nameKey="label"
                  innerRadius="50%"
                  outerRadius="75%"
                  paddingAngle={3}
                  labelLine={false}
                  label={(props: any) =>
                    `${((props.percent ?? 0) * 100).toFixed(1)}%`
                  }
                >
                  {pieSeries.map((item) => {
                    const isVisible =
                      platform === 'all' || platform === item.channel;
                    return (
                      <Cell
                        key={item.channel}
                        fill={CHANNEL_CONFIG[item.channel].hex}
                        opacity={isVisible ? 1 : 0.28}
                        stroke={
                          platform === item.channel
                            ? CHANNEL_CONFIG[item.channel].hex
                            : '#ffffff'
                        }
                        strokeWidth={platform === item.channel ? 5 : 2}
                      />
                    );
                  })}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCents(value)}
                  contentStyle={tooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="max-w-[140px] text-center">
                <span className="block truncate text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#817873]">
                  {centerLabel}
                </span>
                <strong className="mt-1 block font-mono text-lg text-[#292422]">
                  {formatCents(centerValue)}
                </strong>
              </div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {pieSeries.map((item) => (
              <button
                type="button"
                key={item.channel}
                onClick={() =>
                  setPlatform(platform === item.channel ? 'all' : item.channel)
                }
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                  platform === item.channel
                    ? 'border-[#ffb9b5] bg-[#fff0ef]'
                    : 'border-[#ece6e2] bg-[#fffdfc] hover:bg-[#fffaf9]'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{
                      backgroundColor: CHANNEL_CONFIG[item.channel].hex,
                    }}
                  />
                  <span className="truncate text-[11px] font-bold text-[#3b3532]">
                    {item.label}
                  </span>
                </span>
                <span className="text-right">
                  <strong className="block font-mono text-[11px] text-[#292422]">
                    {formatCents(item.bookingIncomeCents)}
                  </strong>
                  <small className="text-[9px] font-semibold text-[#817873]">
                    {item.incomeSharePct.toFixed(1)}%
                  </small>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex h-[360px] items-center justify-center text-sm font-medium text-[#817975]">
          No confirmed platform income for this selection.
        </div>
      )}
    </Panel>
  );
}
