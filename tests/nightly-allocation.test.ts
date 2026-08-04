import test from 'node:test';
import assert from 'node:assert/strict';
import { Booking } from '../src/types';
import { calculateBookingRevenue, getBookingMonthlyAllocatedNights } from '../src/services/financialCalculationService';
import { getBookingOccupiedNights } from '../src/utils/bookingCalculations';

function booking(updates: Partial<Booking> = {}): Booking {
  return {
    id: 'nightly-allocation',
    propertyId: '1-the-olive',
    guestName: 'Allocation Guest',
    channel: 'direct',
    checkInDate: '2026-01-30',
    checkOutDate: '2026-02-02',
    nightlyRateCents: 10_000,
    status: 'confirmed',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...updates,
  };
}

test('cross-month bookings allocate only the nightly rate to each occupied night', () => {
  const allocated = getBookingMonthlyAllocatedNights(booking());
  assert.deepEqual(allocated.map((night) => [night.dateStr, night.revenueCents]), [
    ['2026-01-30', 10_000],
    ['2026-01-31', 10_000],
    ['2026-02-01', 10_000],
  ]);
  assert.equal(allocated.filter((night) => night.month === 1).reduce((sum, night) => sum + night.revenueCents, 0), 20_000);
  assert.equal(allocated.filter((night) => night.month === 2).reduce((sum, night) => sum + night.revenueCents, 0), 10_000);
});

test('calendar and finance use the exact same nightly allocation', () => {
  const financeNights = getBookingMonthlyAllocatedNights(booking());
  const calendarNights = getBookingOccupiedNights(booking());
  assert.deepEqual(calendarNights.map((night) => [night.dateStr, night.allocatedRevenueCents]), financeNights.map((night) => [night.dateStr, night.revenueCents]));
});

test('booking total is always nights multiplied by nightly rate', () => {
  assert.equal(calculateBookingRevenue(booking()), 30_000);
  assert.equal(calculateBookingRevenue(booking({ status: 'cancelled' })), 0);
});
