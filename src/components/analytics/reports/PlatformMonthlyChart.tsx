import React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHANNEL_CONFIG } from '../../../config/locations';
import { ChannelMonthlyPoint, ChannelYearComparisonPoint, ReportChannel } from '../../../services/reportingService';
import { formatCents } from '../../../utils/currency';
import { compactCurrency, Panel, tooltipStyle } from './reportUi';

export function PlatformMonthlyChart({ platform, selectedYear, allPlatformRows, selectedPlatformRows }: { platform: ReportChannel; selectedYear: number; allPlatformRows: ChannelMonthlyPoint[]; selectedPlatformRows: ChannelYearComparisonPoint[] }) {
  const label = platform === 'all' ? 'All Platforms' : CHANNEL_CONFIG[platform].name;
  return (
    <Panel title="Platform Income by Month" subtitle={platform === 'all' ? 'Monthly confirmed income split by platform' : `${label}: ${selectedYear} compared with ${selectedYear - 1}`}>
      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {platform === 'all' ? (
            <BarChart data={allPlatformRows}>
              <CartesianGrid stroke="#ece7e3" vertical={false} /><XAxis dataKey="label" tick={{ fill: '#625b57', fontSize: 10, fontWeight: 600 }} /><YAxis tickFormatter={compactCurrency} tick={{ fill: '#756e69', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={62} /><Tooltip formatter={(value: number) => formatCents(value)} contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="airbnbCents" name="Airbnb" stackId="platform" fill={CHANNEL_CONFIG.airbnb.hex} /><Bar dataKey="bookingComCents" name="Booking.com" stackId="platform" fill={CHANNEL_CONFIG.booking_com.hex} /><Bar dataKey="directCents" name="Direct" stackId="platform" fill={CHANNEL_CONFIG.direct.hex} /><Bar dataKey="vrboCents" name="VRBO" stackId="platform" fill={CHANNEL_CONFIG.vrbo.hex} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <BarChart data={selectedPlatformRows}>
              <CartesianGrid stroke="#ece7e3" vertical={false} /><XAxis dataKey="label" tick={{ fill: '#625b57', fontSize: 10, fontWeight: 600 }} /><YAxis tickFormatter={compactCurrency} tick={{ fill: '#756e69', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={62} /><Tooltip formatter={(value: number) => formatCents(value)} contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="previousIncomeCents" name={`${selectedYear - 1} Income`} fill="#c9c3bf" radius={[4, 4, 0, 0]} /><Bar dataKey="currentIncomeCents" name={`${selectedYear} Income`} fill={CHANNEL_CONFIG[platform].hex} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
