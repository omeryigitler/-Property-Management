import test from 'node:test';
import assert from 'node:assert/strict';
import { Booking } from '../src/types';
import {
  calculateBookingRevenue,
  getBookingMonthlyAllocatedNights,
} from '../src/services/financialCalculationService';
import { normalizeBookingRecord } from '../src/services/persistenceRepository';

function simpleBooking(): Booking {
  return {
    id: 'simple-total',
    propertyId: '1-the-olive',
    guestName: 'Simple Total Guest',
    channel: 'direct',
    checkInDate: '2026-08-01',
    checkOutDate: '2026-08-04',
    nightlyRateCents: 3_333,
    status: 'confirmed',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

test('total is derived from nightly rate without a separate total field', () => {
  const booking = simpleBooking();
  assert.equal(calculateBookingRevenue(booking), 9_999);
  assert.deepEqual(
    getBookingMonthlyAllocatedNights(booking).map(
      (night) => night.revenueCents
    ),
    [3_333, 3_333, 3_333]
  );
  assert.equal('accommodationTotalCents' in booking, false);
});

test('legacy exact totals are migrated into the nightly rate and discarded', () => {
  const migrated = normalizeBookingRecord({
    ...simpleBooking(),
    accommodationTotalCents: 10_001,
    legacyGuestCount: 2,
    legacyFeeCents: 4_000,
    legacyAdjustmentCents: 500,
    legacyPercentage: 15,
  });
  assert.ok(migrated);
  assert.equal(migrated.nightlyRateCents, 3_334);
  assert.equal('accommodationTotalCents' in migrated, false);
  assert.equal('legacyGuestCount' in migrated, false);
  assert.equal('legacyPercentage' in migrated, false);
});
