import test from 'node:test';
import assert from 'node:assert/strict';
import { Booking } from '../src/types';
import { getCellBookingState } from '../src/utils/bookingCalculations';
import { resolvePropertyActiveState } from '../src/store/usePropertyStore';

const booking: Booking = {
  id: 'month-end-booking',
  propertyId: '1-the-olive',
  guestName: 'Month End Guest',
  channel: 'direct',
  checkInDate: '2026-08-29',
  checkOutDate: '2026-08-31',
  nightlyRateCents: 12_000,
  status: 'confirmed',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

test('month-end checkout remains visible as a checkout boundary, not an occupied night', () => {
  const finalNight = getCellBookingState(
    booking.propertyId,
    '2026-08-30',
    [booking]
  );
  const checkout = getCellBookingState(
    booking.propertyId,
    '2026-08-31',
    [booking]
  );

  assert.equal(finalNight.isOccupied, true);
  assert.equal(finalNight.isCheckOut, false);
  assert.equal(checkout.booking?.id, booking.id);
  assert.equal(checkout.isOccupied, false);
  assert.equal(checkout.isCheckOut, true);
});

test('a property can be disabled when another active property exists', () => {
  assert.equal(resolvePropertyActiveState(false, true), false);
});

test('the final active property stays active', () => {
  assert.equal(resolvePropertyActiveState(false, false), true);
});
