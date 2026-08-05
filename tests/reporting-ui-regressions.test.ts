import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Booking, PropertyConfig } from '../src/types';
import { buildCompleteChannelFinancialSeries } from '../src/services/reportingPresentationService';

const properties: PropertyConfig[] = [
  { id: 'p1', name: 'PROPERTY ONE', locationId: 'loc', active: true },
];

function booking(
  id: string,
  channel: Booking['channel'],
  checkInDate: string,
  checkOutDate: string,
  nightlyRateCents: number
): Booking {
  return {
    id,
    propertyId: 'p1',
    guestName: `Guest ${id}`,
    channel,
    status: 'confirmed',
    checkInDate,
    checkOutDate,
    nightlyRateCents,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };
}

test('platform rows retain a previous-year-only platform as a minus one hundred percent change', () => {
  const rows = buildCompleteChannelFinancialSeries(
    [booking('old-airbnb', 'airbnb', '2025-01-01', '2025-01-03', 10_000)],
    {
      period: 'yearly',
      year: 2026,
      month: 1,
      throughMonth: 1,
      propertyId: 'all',
    },
    properties
  );

  const airbnb = rows.find((row) => row.channel === 'airbnb');
  assert.ok(airbnb);
  assert.equal(airbnb.bookingIncomeCents, 0);
  assert.equal(airbnb.previousBookingIncomeCents, 20_000);
  assert.equal(airbnb.incomeChangePct, -100);
});

test('reports UI keeps platform filtering inside platform analysis and labels allocated values', () => {
  const dashboardSource = readFileSync(
    new URL('../src/components/analytics/ReportsDashboardV2.tsx', import.meta.url),
    'utf8'
  );
  const platformSource = readFileSync(
    new URL('../src/components/analytics/reports/PlatformPerformancePanel.tsx', import.meta.url),
    'utf8'
  );
  const channelSource = readFileSync(
    new URL('../src/components/analytics/reports/ChannelMixPanel.tsx', import.meta.url),
    'utf8'
  );
  const reservationSource = readFileSync(
    new URL('../src/components/analytics/reports/ReservationExpenseReports.tsx', import.meta.url),
    'utf8'
  );

  assert.equal(dashboardSource.includes('data-report-filter="platform"'), false);
  assert.equal(platformSource.includes('data-platform-filter="section"'), true);
  assert.equal(reservationSource.includes('Period Amount'), true);
  assert.equal(reservationSource.includes('selected reporting period'), true);
  assert.equal(dashboardSource.includes('available throughout the selected period'), true);
  assert.equal(channelSource.includes("toFixed(1)}%"), true);
});
