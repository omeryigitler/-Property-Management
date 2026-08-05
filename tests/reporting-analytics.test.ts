import test from 'node:test';
import assert from 'node:assert/strict';
import { Booking, Expense, ExtraIncome, PropertyConfig } from '../src/types';
import {
  buildBookingReportDetails,
  buildChannelFinancialSeries,
  buildPropertyAnnualRanking,
  buildPropertyChannelMatrix,
  buildMonthlyFinancialSeries,
  calculateReportSummary,
  calculateYearComparison,
  getYearHighlights,
} from '../src/services/reportingService';

const properties: PropertyConfig[] = [
  { id: 'p1', name: 'PROPERTY ONE', locationId: 'loc', active: true },
  { id: 'p2', name: 'PROPERTY TWO', locationId: 'loc', active: true },
];

function booking(
  id: string,
  propertyId: string,
  channel: Booking['channel'],
  status: Booking['status'],
  checkInDate: string,
  checkOutDate: string,
  nightlyRateCents: number
): Booking {
  return {
    id,
    propertyId,
    guestName: `Guest ${id}`,
    channel,
    status,
    checkInDate,
    checkOutDate,
    nightlyRateCents,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const bookings: Booking[] = [
  booking('airbnb-current', 'p1', 'airbnb', 'confirmed', '2026-01-01', '2026-01-03', 10_000),
  booking('booking-pending', 'p1', 'booking_com', 'provisional', '2026-01-03', '2026-01-05', 15_000),
  booking('booking-current', 'p1', 'booking_com', 'confirmed', '2026-02-01', '2026-02-04', 10_000),
  booking('direct-current', 'p2', 'direct', 'confirmed', '2026-01-01', '2026-01-02', 20_000),
  booking('airbnb-previous', 'p1', 'airbnb', 'confirmed', '2025-01-01', '2025-01-03', 5_000),
];

const expenses: Expense[] = [
  {
    id: 'expense-p1-jan',
    propertyId: 'p1',
    year: 2026,
    month: 1,
    label: 'Rent',
    category: 'Rent',
    amountCents: 5_000,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'expense-p1-feb',
    propertyId: 'p1',
    year: 2026,
    month: 2,
    label: 'Rent',
    category: 'Rent',
    amountCents: 10_000,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'expense-p2-jan',
    propertyId: 'p2',
    year: 2026,
    month: 1,
    label: 'Rent',
    category: 'Rent',
    amountCents: 5_000,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const extraIncomes: ExtraIncome[] = [
  {
    id: 'income-p1-jan',
    propertyId: 'p1',
    year: 2026,
    month: 1,
    label: 'Service',
    amountCents: 1_000,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const yearlyFilter = {
  period: 'yearly' as const,
  year: 2026,
  month: 2,
  throughMonth: 2,
  propertyId: 'all' as const,
};

test('yearly reports use confirmed bookings and preserve the same-period comparison', () => {
  const summary = calculateReportSummary(
    bookings,
    expenses,
    extraIncomes,
    yearlyFilter,
    properties
  );
  assert.equal(summary.bookingIncomeCents, 70_000);
  assert.equal(summary.bookingCount, 3);
  assert.equal(summary.occupiedNights, 6);
  assert.equal(summary.totalExpensesCents, 20_000);
  assert.equal(summary.extraIncomeCents, 1_000);
  assert.equal(summary.netBalanceCents, 51_000);

  const comparison = calculateYearComparison(
    bookings,
    expenses,
    extraIncomes,
    2026,
    2,
    'all',
    properties
  );
  assert.equal(comparison.previous.bookingIncomeCents, 10_000);
  assert.equal(comparison.bookingIncomeChangePct, 600);
});

test('best month is selected by net profit rather than gross income', () => {
  const monthly = buildMonthlyFinancialSeries(
    bookings,
    expenses,
    extraIncomes,
    2026,
    'all',
    properties,
    2
  );
  const highlights = getYearHighlights(monthly);
  assert.equal(highlights.bestMonth?.month, 1);
  assert.equal(highlights.bestMonth?.netBalanceCents, 31_000);
  assert.equal(highlights.worstMonth?.month, 2);
});

test('platform analysis reports income, share, pending requests and previous year change', () => {
  const channels = buildChannelFinancialSeries(bookings, yearlyFilter, properties);
  const airbnb = channels.find((item) => item.channel === 'airbnb');
  const bookingCom = channels.find((item) => item.channel === 'booking_com');
  if (!airbnb || !bookingCom) throw new Error('Expected platform rows');
  assert.equal(airbnb.bookingIncomeCents, 20_000);
  assert.equal(airbnb.previousBookingIncomeCents, 10_000);
  assert.equal(airbnb.incomeChangePct, 100);
  assert.equal(bookingCom.bookingIncomeCents, 30_000);
  assert.equal(bookingCom.provisionalIncomeCents, 30_000);
  assert.equal(bookingCom.bookingCount, 1);
  assert.equal(bookingCom.occupiedNights, 3);
  assert.equal(bookingCom.incomeSharePct, 42.9);
});

test('property ranking and property-platform matrix agree with annual totals', () => {
  const ranking = buildPropertyAnnualRanking(
    bookings,
    expenses,
    extraIncomes,
    2026,
    2,
    properties
  );
  assert.equal(ranking[0].propertyId, 'p1');
  assert.equal(ranking[0].netBalanceCents, 36_000);
  assert.equal(ranking[1].netBalanceCents, 15_000);

  const matrix = buildPropertyChannelMatrix(bookings, 2026, 2, properties);
  const p1 = matrix.find((item) => item.propertyId === 'p1');
  const p2 = matrix.find((item) => item.propertyId === 'p2');
  assert.equal(p1?.airbnbCents, 20_000);
  assert.equal(p1?.bookingComCents, 30_000);
  assert.equal(p1?.totalCents, 50_000);
  assert.equal(p2?.directCents, 20_000);
});

test('platform reservation details open only confirmed bookings in the selected period', () => {
  const details = buildBookingReportDetails(
    bookings,
    yearlyFilter,
    'airbnb',
    properties
  );
  assert.equal(details.length, 1);
  assert.equal(details[0].bookingId, 'airbnb-current');
  assert.equal(details[0].amountCents, 20_000);
  assert.equal(details[0].nights, 2);
});
