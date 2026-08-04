import test from 'node:test';
import assert from 'node:assert/strict';
import { Booking, Expense, ExtraIncome, TaxConfiguration } from '../src/types';
import {
  calculatePropertyFinancials,
  getBookingMonthlyAllocatedNights,
} from '../src/services/financialCalculationService';
import { calculateReportSummary } from '../src/services/reportingService';
import { validateBackupJson } from '../src/services/exportImportService';
import { DEFAULT_TAX_CONFIG } from '../src/services/persistenceRepository';
import { calculatePropertyTaxes } from '../src/utils/taxCalculations';

function booking(
  id: string,
  propertyId: string,
  checkInDate: string,
  checkOutDate: string,
  nightlyRateCents: number,
  updates: Partial<Booking> = {}
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
    ...updates,
  };
}

const zeroTaxConfig: TaxConfiguration = {
  ...DEFAULT_TAX_CONFIG,
  accommodationVatRate: 0,
  standardVatRate: 0,
  incomeTaxRate: 0,
  ecoContributionCents: 0,
};

test('cross-month bookings allocate only occupied nights to each month', () => {
  const nights = getBookingMonthlyAllocatedNights(
    booking('cross-month', '1-the-olive', '2026-01-30', '2026-02-02', 10_000),
    zeroTaxConfig
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
    zeroTaxConfig,
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
    zeroTaxConfig,
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

test('net-after-commission income tax uses net booking revenue independently of VAT basis', () => {
  const config: TaxConfiguration = {
    ...zeroTaxConfig,
    incomeTaxRate: 10,
    incomeTaxBasis: 'net_after_commission',
    vatBasis: 'gross',
  };

  const result = calculatePropertyTaxes({
    bookingIncomeCents: 10_000,
    grossBookingIncomeCents: 10_000,
    netBookingIncomeCents: 8_500,
    extraIncomeCents: 500,
    extraIncomeByTreatment: {
      accommodation_vat: 0,
      standard_vat: 0,
      vat_exempt: 500,
    },
    totalExpensesCents: 0,
    deductibleExpensesCents: 0,
    occupiedNightsCount: 1,
    bookingCount: 1,
    totalGuestNightsCount: 2,
    config,
  });

  assert.equal(result.incomeTaxCents, 900);
  assert.equal(result.netBalanceCents, 8_100);
});

test('property financials do not add OTA commission back into net balance', () => {
  const config: TaxConfiguration = {
    ...DEFAULT_TAX_CONFIG,
    accommodationVatRate: 1,
    standardVatRate: 1,
    incomeTaxRate: 10,
    ecoContributionCents: 1,
    incomeTaxBasis: 'net_after_commission',
    vatBasis: 'gross',
    vatInclusivity: 'exclusive',
  };
  const commissionedBooking = booking(
    'commissioned',
    '1-the-olive',
    '2026-08-01',
    '2026-08-02',
    10_000,
    {
      channel: 'airbnb',
      commissionMode: 'percentage',
      commissionPercentage: 15,
      suggestedCommissionPercentage: 15,
    }
  );

  const result = calculatePropertyFinancials(
    '1-the-olive',
    2026,
    8,
    [commissionedBooking],
    [],
    [],
    config
  );

  assert.equal(result.grossBookingIncomeCents, 10_000);
  assert.equal(result.otaCommissionCents, 1_500);
  assert.equal(result.netBookingIncomeCents, 8_500);
  assert.ok((result.netBalanceCents ?? 0) < result.netBookingIncomeCents);
});

test('backup validation rejects incomplete arrays instead of crashing import UI', () => {
  const invalid = validateBackupJson({
    taxConfiguration: zeroTaxConfig,
    bookings: [],
  });

  assert.equal(invalid.isValid, false);
  assert.match(invalid.error ?? '', /expenses array/i);
});

test('backup validation rejects a booking with an invalid date range', () => {
  const invalid = validateBackupJson({
    taxConfiguration: zeroTaxConfig,
    bookings: [
      booking('invalid-range', '1-the-olive', '2026-08-02', '2026-08-02', 10_000),
    ],
    expenses: [],
    extraIncomes: [],
  });

  assert.equal(invalid.isValid, false);
  assert.match(invalid.error ?? '', /invalid dates/i);
});

test('backup validation rejects duplicate booking identifiers', () => {
  const duplicate = booking(
    'duplicate-id',
    '1-the-olive',
    '2026-08-01',
    '2026-08-02',
    10_000
  );
  const invalid = validateBackupJson({
    taxConfiguration: zeroTaxConfig,
    bookings: [duplicate, { ...duplicate }],
    expenses: [],
    extraIncomes: [],
  });

  assert.equal(invalid.isValid, false);
  assert.match(invalid.error ?? '', /duplicate booking IDs/i);
});

test('legacy backup is normalized with safe optional defaults', () => {
  const valid = validateBackupJson({
    version: 1,
    taxConfiguration: zeroTaxConfig,
    bookings: [],
    expenses: [],
    extraIncomes: [],
  });

  assert.equal(valid.isValid, true);
  assert.deepEqual(valid.data?.activityHistory, []);
  assert.equal(valid.data?.userPreferences.currencySymbol, '€');
});
