import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHANNEL_CONFIG } from '../../../config/locations';
import {
  BookingReportDetail,
  ExpenseSeriesPoint,
  ReportChannel,
} from '../../../services/reportingService';
import { formatCents } from '../../../utils/currency';
import {
  compactCurrency,
  Panel,
  shortDate,
  tooltipStyle,
} from './reportUi';

export function ReservationDetailsPanel({
  platform,
  rows,
  openBooking,
}: {
  platform: ReportChannel;
  rows: BookingReportDetail[];
  openBooking: (bookingId: string) => void;
}) {
  const label =
    platform === 'all' ? 'All Platforms' : CHANNEL_CONFIG[platform].name;

  return (
    <Panel
      title={`${label} Reservations`}
      subtitle="Amounts and nights are allocated to the selected reporting period; dates show the full stay."
    >
      {rows.length ? (
        <>
          <div className="hidden max-h-[430px] overflow-auto md:block">
            <div className="min-w-[860px]">
              <div className="sticky top-0 grid grid-cols-[1.2fr_1.2fr_0.9fr_1.4fr_0.6fr_0.9fr] gap-3 border-b border-[#eee8e5] bg-[#fffaf9] px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-[#817873]">
                <span>Guest</span>
                <span>Property</span>
                <span>Platform</span>
                <span>Full Stay</span>
                <span>Period Nights</span>
                <span>Period Amount</span>
              </div>
              {rows.map((item) => (
                <button
                  type="button"
                  key={item.bookingId}
                  onClick={() => openBooking(item.bookingId)}
                  className="grid w-full grid-cols-[1.2fr_1.2fr_0.9fr_1.4fr_0.6fr_0.9fr] items-center gap-3 border-b border-[#f0ebe8] px-3 py-3 text-left text-xs transition-colors last:border-b-0 hover:bg-[#fffaf9]"
                >
                  <strong className="truncate">{item.guestName}</strong>
                  <span className="truncate">{item.propertyName}</span>
                  <span>{CHANNEL_CONFIG[item.channel].name}</span>
                  <span>
                    {shortDate(item.checkInDate)} – {shortDate(item.checkOutDate)}
                  </span>
                  <span>{item.nights}</span>
                  <strong className="font-mono">
                    {formatCents(item.amountCents)}
                  </strong>
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[520px] space-y-2 overflow-y-auto md:hidden">
            {rows.map((item) => (
              <button
                type="button"
                key={item.bookingId}
                onClick={() => openBooking(item.bookingId)}
                className="w-full rounded-xl border border-[#e8e1dd] p-3 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block truncate">{item.guestName}</strong>
                    <span className="mt-0.5 block truncate text-[10px] text-[#817975]">
                      {item.propertyName} · {CHANNEL_CONFIG[item.channel].name}
                    </span>
                  </div>
                  <span className="text-right">
                    <small className="block text-[9px] font-bold uppercase text-[#8a827d]">
                      Period Amount
                    </small>
                    <strong className="font-mono text-sm">
                      {formatCents(item.amountCents)}
                    </strong>
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-[#756e69]">
                  Full stay: {shortDate(item.checkInDate)} –{' '}
                  {shortDate(item.checkOutDate)} · {item.nights} period nights
                </p>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="py-10 text-center text-sm font-medium text-[#817975]">
          No confirmed reservations for this platform and period.
        </div>
      )}
    </Panel>
  );
}

export function ExpenseBreakdownPanel({
  rows,
}: {
  rows: ExpenseSeriesPoint[];
}) {
  return (
    <Panel
      title="Expense Breakdown"
      subtitle="Operating costs by category; expenses are not attributed to booking platforms"
    >
      {rows.length ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical">
              <CartesianGrid stroke="#ece7e3" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={compactCurrency}
                tick={{ fill: '#756e69', fontSize: 10, fontWeight: 600 }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={120}
                tick={{ fill: '#514b48', fontSize: 10, fontWeight: 650 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number) => formatCents(value)}
                contentStyle={tooltipStyle}
              />
              <Bar
                dataKey="amountCents"
                fill="#d86166"
                radius={[0, 5, 5, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="py-12 text-center text-sm font-medium text-[#817975]">
          No expenses for this selection.
        </div>
      )}
    </Panel>
  );
}
