import test from 'node:test';
import assert from 'node:assert/strict';
import { Booking, Expense, ExtraIncome, TaxConfiguration } from '../src/types';
import {
  getBookingMonthlyAllocatedNights,
} from '../src/services/financialCalculationService';
import { calculateReportSummary } from '../src/services/reportingService';
import { validateBackupJson } from '../src/services/exportImportService';
import { DEFAULT_TAX_CONFIG } from '../src/services/persistenceRepository';

function booking(
  id: string,
  propertyId: string,
  checkInDate: string,
  checkOutDate: string,
  nightlyRateCents: number
): Booking {
  const now = '2026-08-01T00:00:00.000Z';
  return {
    id,
    propertyId,
    guestName: `Guest ${id}`,
    channel: 'direct',
    checkInDate,
    checkOutDate,
    nightlyRateCents,
    adults: 2,
    children: 0,
    status: 'confirmed',
    discountCents: 0,
    cleaningFeeCents: 0,
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
    createdAt: now,
    updatedAt: now,
  };
}

const configuredTax: TaxConfiguration = {
  ...DEFAULT_TAX_CONFIG,
  accommodationVatRate: 0,
  standardVatRate: 0,
  incomeTaxRate: 0,
  ecoContributionCents: 0,
};

test('cross-month bookings allocate only occupied nights to each month', () => {
  const nights = getBookingMonthlyAllocatedNights(
    booking('cross-month', '1-the-olive', '2026-01-30', '2026-02-02', 10_000),
    configuredTax
  );

  assert.equal(nights.length, 3);
  assert.equal(nights.filter((night) => night.month === 1).length, 2);
  assert.equal(nights.filter((night) => night.month === 2).length, 1);
  assert.equal(
    nights.reduce((sum, night) => sum + night.grossNightRevenueCents, 0),
    30_000
  );
});

test('reports keep selected-property and all-property scopes separate', () => {
  const bookings = [
    booking('olive', '1-the-olive', '2026-08-01', '2026-08-03', 10_000),
    booking('olive-8', '8-the-olive', '2026-08-01', '2026-08-03', 15_000),
  ];
  const expenses: Expense[] = [
    {
      id: 'rent-olive',
      propertyId: '1-the-olive',
      month: 8,
      year: 2026,
      label: 'Rent',
      amountCents: 5_000,
      category: 'Rent',
      isDeductible: true,
      isRecurring: true,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
  ];
  const extraIncomes: ExtraIncome[] = [
    {
      id: 'late-checkout',
      propertyId: '1-the-olive',
      month: 8,
      year: 2026,
      label: 'Late checkout',
      amountCents: 1_000,
      taxTreatment: 'vat_exempt',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
  ];

  const selected = calculateReportSummary(
    bookings,
    expenses,
    extraIncomes,
    configuredTax,
    {
      period: 'monthly',
      year: 2026,
      month: 8,
      propertyId: '1-the-olive',
    }
  );

  const portfolio = calculateReportSummary(
    bookings,
    expenses,
    extraIncomes,
    configuredTax,
    {
      period: 'monthly',
      year: 2026,
      month: 8,
      propertyId: 'all',
    }
  );

  assert.equal(selected.grossBookingIncomeCents, 20_000);
  assert.equal(selected.netBookingIncomeCents, 20_000);
  assert.equal(selected.extraIncomeCents, 1_000);
  assert.equal(selected.totalExpensesCents, 5_000);
  assert.equal(selected.occupiedNights, 2);
  assert.equal(selected.availableNights, 31);

  assert.equal(portfolio.grossBookingIncomeCents, 50_000);
  assert.equal(portfolio.occupiedNights, 4);
  assert.ok(portfolio.availableNights > selected.availableNights);
});

test('backup validation rejects incomplete arrays instead of crashing import UI', () => {
  const invalid = validateBackupJson({
    taxConfiguration: configuredTax,
    bookings: [],
  });

  assert.equal(invalid.isValid, false);
  assert.match(invalid.error ?? '', /expenses array/i);
});

test('legacy backup is normalized with safe optional defaults', () => {
  const valid = validateBackupJson({
    version: 1,
    taxConfiguration: configuredTax,
    bookings: [],
    expenses: [],
    extraIncomes: [],
  });

  assert.equal(valid.isValid, true);
  assert.deepEqual(valid.data?.activityHistory, []);
  assert.equal(valid.data?.userPreferences.currencySymbol, '€');
});
