import test from 'node:test';
import assert from 'node:assert/strict';
import { Booking } from '../src/types';
import {
  calculateBookingRevenueAndCommission,
  getBookingMonthlyAllocatedNights,
} from '../src/services/financialCalculationService';

function exactTotalBooking(): Booking {
  return {
    id: 'exact-total',
    propertyId: '1-the-olive',
    guestName: 'Exact Total Guest',
    channel: 'direct',
    checkInDate: '2026-08-01',
    checkOutDate: '2026-08-04',
    nightlyRateCents: 3_333,
    accommodationTotalCents: 10_001,
    adults: 2,
    children: 0,
    status: 'confirmed',
    discountCents: 1,
    cleaningFeeCents: 2_500,
    commissionMode: 'none',
    commissionPercentage: 0,
    commissionFixedAmountCents: 0,
    suggestedCommissionPercentage: 0,
    commissionOverrideEnabled: false,
    checkInTime: '15:00',
    checkOutTime: '10:00',
    timezone: 'Europe/Malta',
    earlyCheckIn: false,
    lateCheckOut: false,
    requiredTurnoverMinutes: 240,
    turnoverStatus: 'sufficient',
    source: 'manual',
    syncStatus: 'not_synced',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

test('exact accommodation total overrides rounded nightly multiplication', () => {
  const booking = exactTotalBooking();
  const totals = calculateBookingRevenueAndCommission(booking);

  assert.equal(totals.grossAccommodationRevenueCents, 10_000);
  assert.equal(totals.grossBookingRevenueCents, 12_500);
});

test('exact total is distributed across nights without losing cents', () => {
  const booking = exactTotalBooking();
  const nights = getBookingMonthlyAllocatedNights(booking);

  assert.equal(nights.length, 3);
  assert.equal(
    nights.reduce((sum, night) => sum + night.grossNightRevenueCents, 0),
    12_500
  );
  assert.deepEqual(
    nights.map((night) => night.grossNightRevenueCents),
    [5_834, 3_333, 3_333]
  );
});
