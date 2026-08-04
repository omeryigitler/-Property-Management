import test from 'node:test';
import assert from 'node:assert/strict';
import { Booking, TaxConfiguration } from '../src/types';
import {
  calculateBookingRevenueAndCommission,
  getBookingMonthlyAllocatedNights,
} from '../src/services/financialCalculationService';
import { getBookingOccupiedNights } from '../src/utils/bookingCalculations';
import { DEFAULT_TAX_CONFIG } from '../src/services/persistenceRepository';

function booking(updates: Partial<Booking> = {}): Booking {
  return {
    id: 'nightly-allocation',
    propertyId: '1-the-olive',
    guestName: 'Allocation Guest',
    channel: 'direct',
    checkInDate: '2026-01-30',
    checkOutDate: '2026-02-02',
    nightlyRateCents: 10_000,
    adults: 2,
    children: 0,
    status: 'confirmed',
    discountCents: 0,
    cleaningFeeCents: 4_000,
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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...updates,
  };
}

const config: TaxConfiguration = {
  ...DEFAULT_TAX_CONFIG,
  accommodationVatRate: 0,
  standardVatRate: 0,
  incomeTaxRate: 0,
  ecoContributionCents: 0,
};

test('cleaning fee stays in the check-in month for cross-month bookings', () => {
  const allocated = getBookingMonthlyAllocatedNights(booking(), config);

  assert.deepEqual(
    allocated.map((night) => [night.dateStr, night.grossNightRevenueCents]),
    [
      ['2026-01-30', 14_000],
      ['2026-01-31', 10_000],
      ['2026-02-01', 10_000],
    ]
  );
  assert.equal(
    allocated
      .filter((night) => night.month === 1)
      .reduce((sum, night) => sum + night.grossNightRevenueCents, 0),
    24_000
  );
  assert.equal(
    allocated
      .filter((night) => night.month === 2)
      .reduce((sum, night) => sum + night.grossNightRevenueCents, 0),
    10_000
  );
});

test('calendar occupied nights use the exact same revenue allocation as finance', () => {
  const financeNights = getBookingMonthlyAllocatedNights(booking(), config);
  const calendarNights = getBookingOccupiedNights(booking());

  assert.deepEqual(
    calendarNights.map((night) => [night.dateStr, night.allocatedRevenueCents]),
    financeNights.map((night) => [night.dateStr, night.grossNightRevenueCents])
  );
});

test('percentage commission allocation preserves the exact booking total', () => {
  const commissioned = booking({
    channel: 'airbnb',
    commissionMode: 'percentage',
    commissionPercentage: 15,
    suggestedCommissionPercentage: 15,
  });
  const allocated = getBookingMonthlyAllocatedNights(commissioned, {
    ...config,
    commissionBasis: 'accommodation_plus_fees',
  });
  const total = calculateBookingRevenueAndCommission(
    commissioned,
    'accommodation_plus_fees'
  );

  assert.equal(
    allocated.reduce((sum, night) => sum + night.grossNightRevenueCents, 0),
    total.grossBookingRevenueCents
  );
  assert.equal(
    allocated.reduce((sum, night) => sum + night.otaCommissionCents, 0),
    total.otaCommissionCents
  );
  assert.equal(
    allocated.reduce((sum, night) => sum + night.netNightRevenueCents, 0),
    total.netBookingRevenueCents
  );
});

test('fixed commission follows check-in, proportional and payout allocation rules', () => {
  const fixed = booking({
    commissionMode: 'fixed',
    commissionFixedAmountCents: 3_000,
  });

  const checkIn = getBookingMonthlyAllocatedNights(fixed, {
    ...config,
    fixedCommissionAllocationRule: 'check_in_date',
  });
  const proportional = getBookingMonthlyAllocatedNights(fixed, {
    ...config,
    fixedCommissionAllocationRule: 'proportional_nights',
  });
  const payout = getBookingMonthlyAllocatedNights(fixed, {
    ...config,
    fixedCommissionAllocationRule: 'payout_date',
  });

  assert.deepEqual(checkIn.map((night) => night.otaCommissionCents), [3_000, 0, 0]);
  assert.deepEqual(proportional.map((night) => night.otaCommissionCents), [1_000, 1_000, 1_000]);
  assert.deepEqual(payout.map((night) => night.otaCommissionCents), [0, 0, 3_000]);
});
