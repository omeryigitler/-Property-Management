import { CHANNEL_CONFIG } from '../config/locations';
import { Booking, Channel, PropertyConfig } from '../types';
import {
  buildChannelFinancialSeries,
  ChannelSeriesPoint,
  ReportFilter,
} from './reportingService';

const CHANNELS = Object.keys(CHANNEL_CONFIG) as Channel[];

function percentageChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export function buildCompleteChannelFinancialSeries(
  bookings: Booking[],
  filter: ReportFilter,
  properties: PropertyConfig[]
): ChannelSeriesPoint[] {
  const currentRows = buildChannelFinancialSeries(bookings, filter, properties);
  const previousRows = buildChannelFinancialSeries(
    bookings,
    { ...filter, year: filter.year - 1 },
    properties
  );

  const currentByChannel = new Map(
    currentRows.map((row) => [row.channel, row] as const)
  );
  const previousByChannel = new Map(
    previousRows.map((row) => [row.channel, row] as const)
  );

  const rows = CHANNELS.map((channel) => {
    const current = currentByChannel.get(channel);
    const previousIncomeCents =
      current?.previousBookingIncomeCents ??
      previousByChannel.get(channel)?.bookingIncomeCents ??
      0;

    if (current) {
      return {
        ...current,
        previousBookingIncomeCents: previousIncomeCents,
        incomeChangePct: percentageChange(
          current.bookingIncomeCents,
          previousIncomeCents
        ),
      };
    }

    return {
      channel,
      label: CHANNEL_CONFIG[channel].name,
      bookingIncomeCents: 0,
      bookingCount: 0,
      occupiedNights: 0,
      averageBookingCents: 0,
      averageStayNights: 0,
      incomeSharePct: 0,
      previousBookingIncomeCents: previousIncomeCents,
      incomeChangePct: percentageChange(0, previousIncomeCents),
      provisionalIncomeCents: 0,
    } satisfies ChannelSeriesPoint;
  }).filter(
    (row) =>
      row.bookingIncomeCents !== 0 ||
      row.bookingCount !== 0 ||
      row.provisionalIncomeCents !== 0 ||
      row.previousBookingIncomeCents !== 0
  );

  const totalIncomeCents = rows.reduce(
    (sum, row) => sum + row.bookingIncomeCents,
    0
  );

  return rows
    .map((row) => ({
      ...row,
      incomeSharePct:
        totalIncomeCents > 0
          ? Math.round((row.bookingIncomeCents / totalIncomeCents) * 1000) / 10
          : 0,
    }))
    .sort(
      (a, b) =>
        b.bookingIncomeCents - a.bookingIncomeCents ||
        b.previousBookingIncomeCents - a.previousBookingIncomeCents
    );
}
