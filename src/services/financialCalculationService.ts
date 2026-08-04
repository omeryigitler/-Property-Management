import { addDays } from 'date-fns';
import {
  AggregatedFinancials,
  Booking,
  Channel,
  CommissionBasis,
  CommissionMode,
  Expense,
  ExtraIncome,
  PropertyFinancials,
  TaxConfiguration,
  TaxTreatment,
} from '../types';
import { ALL_PROPERTIES } from '../config/locations';
import {
  calculateNights,
  parseDateString,
  toDateString,
} from '../utils/dateUtilities';
import {
  calculatePropertyTaxes,
  isTaxConfigured,
} from '../utils/taxCalculations';

export const DEFAULT_CHANNEL_COMMISSIONS: Record<
  Channel,
  { percentage: number; mode: CommissionMode }
> = {
  airbnb: { percentage: 15, mode: 'percentage' },
  booking_com: { percentage: 15, mode: 'percentage' },
  direct: { percentage: 0, mode: 'none' },
  vrbo: { percentage: 10, mode: 'percentage' },
};

export interface BookingRevenueBreakdown {
  grossAccommodationRevenueCents: number;
  grossBookingRevenueCents: number;
  otaCommissionCents: number;
  netBookingRevenueCents: number;
}

function nonNegativeInteger(value: number | null | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value ?? 0));
}

function clampPercentage(value: number | null | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value ?? 0));
}

function distributeEvenly(totalCents: number, count: number): number[] {
  if (count <= 0) return [];
  const total = nonNegativeInteger(totalCents);
  const base = Math.floor(total / count);
  const remainder = total % count;

  return Array.from({ length: count }, (_, index) =>
    base + (index < remainder ? 1 : 0)
  );
}

function distributeProportionally(
  totalCents: number,
  weights: number[]
): number[] {
  if (weights.length === 0) return [];

  const total = nonNegativeInteger(totalCents);
  const normalizedWeights = weights.map(nonNegativeInteger);
  const weightTotal = normalizedWeights.reduce((sum, value) => sum + value, 0);

  if (weightTotal <= 0) {
    return distributeEvenly(total, weights.length);
  }

  const result = normalizedWeights.map((weight) =>
    Math.floor((total * weight) / weightTotal)
  );
  let remainder = total - result.reduce((sum, value) => sum + value, 0);

  const order = normalizedWeights
    .map((weight, index) => ({ weight, index }))
    .filter(({ weight }) => weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);

  let cursor = 0;
  while (remainder > 0 && order.length > 0) {
    result[order[cursor % order.length].index] += 1;
    remainder -= 1;
    cursor += 1;
  }

  return result;
}

function getCommissionBasisCents(
  accommodationRevenueCents: number,
  bookingRevenueCents: number,
  commissionBasis: CommissionBasis
): number {
  return commissionBasis === 'accommodation_plus_fees' ||
    commissionBasis === 'gross_after_discounts'
    ? bookingRevenueCents
    : accommodationRevenueCents;
}

function getAccommodationBeforeDiscountCents(
  booking: Booking,
  nightsCount: number
): number {
  if (booking.accommodationTotalCents != null) {
    return nonNegativeInteger(booking.accommodationTotalCents);
  }
  return nonNegativeInteger(booking.nightlyRateCents) * nightsCount;
}

/**
 * Single source of truth for total booking revenue and OTA commission.
 * Exact accommodation totals take precedence when the total-price input was used.
 */
export function calculateBookingRevenueAndCommission(
  booking: Booking,
  commissionBasis: CommissionBasis = 'accommodation_only'
): BookingRevenueBreakdown {
  if (
    !booking.checkInDate ||
    !booking.checkOutDate ||
    booking.status === 'cancelled'
  ) {
    return {
      grossAccommodationRevenueCents: 0,
      grossBookingRevenueCents: 0,
      otaCommissionCents: 0,
      netBookingRevenueCents: 0,
    };
  }

  const nightsCount = calculateNights(
    booking.checkInDate,
    booking.checkOutDate
  );
  if (nightsCount <= 0) {
    return {
      grossAccommodationRevenueCents: 0,
      grossBookingRevenueCents: 0,
      otaCommissionCents: 0,
      netBookingRevenueCents: 0,
    };
  }

  const accommodationBeforeDiscountCents =
    getAccommodationBeforeDiscountCents(booking, nightsCount);
  const discountCents = Math.min(
    accommodationBeforeDiscountCents,
    nonNegativeInteger(booking.discountCents)
  );
  const cleaningFeeCents = nonNegativeInteger(booking.cleaningFeeCents);
  const grossAccommodationRevenueCents =
    accommodationBeforeDiscountCents - discountCents;
  const grossBookingRevenueCents =
    grossAccommodationRevenueCents + cleaningFeeCents;

  let otaCommissionCents = 0;
  const commissionMode = booking.commissionMode ?? 'none';

  if (commissionMode === 'percentage') {
    const basisCents = getCommissionBasisCents(
      grossAccommodationRevenueCents,
      grossBookingRevenueCents,
      commissionBasis
    );
    otaCommissionCents = Math.round(
      basisCents * (clampPercentage(booking.commissionPercentage) / 100)
    );
  } else if (commissionMode === 'fixed') {
    otaCommissionCents = nonNegativeInteger(
      booking.commissionFixedAmountCents
    );
  }

  return {
    grossAccommodationRevenueCents,
    grossBookingRevenueCents,
    otaCommissionCents,
    netBookingRevenueCents:
      grossBookingRevenueCents - otaCommissionCents,
  };
}

export interface MonthlyAllocatedNight {
  dateStr: string;
  year: number;
  month: number;
  nightIndex: number;
  totalNights: number;
  grossNightRevenueCents: number;
  otaCommissionCents: number;
  netNightRevenueCents: number;
}

/**
 * Allocates every booking amount to occupied nights once. Cleaning is assigned
 * to the check-in night, accommodation/discount is distributed without losing
 * cents, and commission follows the configured basis and allocation rule.
 */
export function getBookingMonthlyAllocatedNights(
  booking: Booking,
  taxConfig?: TaxConfiguration
): MonthlyAllocatedNight[] {
  if (
    !booking.checkInDate ||
    !booking.checkOutDate ||
    booking.status === 'cancelled'
  ) {
    return [];
  }

  const totalNights = calculateNights(
    booking.checkInDate,
    booking.checkOutDate
  );
  if (totalNights <= 0) return [];

  const commissionBasis =
    taxConfig?.commissionBasis === 'manual'
      ? 'accommodation_only'
      : taxConfig?.commissionBasis || 'accommodation_only';
  const fixedRule =
    taxConfig?.fixedCommissionAllocationRule || 'check_in_date';
  const totalBreakdown = calculateBookingRevenueAndCommission(
    booking,
    commissionBasis
  );

  const accommodationBeforeDiscountCents =
    getAccommodationBeforeDiscountCents(booking, totalNights);
  const discountCents = Math.min(
    accommodationBeforeDiscountCents,
    nonNegativeInteger(booking.discountCents)
  );
  const netAccommodationTotalCents =
    accommodationBeforeDiscountCents - discountCents;
  const accommodationByNight = distributeEvenly(
    netAccommodationTotalCents,
    totalNights
  );
  const cleaningFeeCents = nonNegativeInteger(booking.cleaningFeeCents);
  const grossByNight = accommodationByNight.map(
    (accommodationRevenue, index) =>
      accommodationRevenue + (index === 0 ? cleaningFeeCents : 0)
  );

  let commissionByNight = Array.from(
    { length: totalNights },
    () => 0
  );

  if (booking.commissionMode === 'percentage') {
    const basisByNight =
      commissionBasis === 'accommodation_plus_fees' ||
      commissionBasis === 'gross_after_discounts'
        ? grossByNight
        : accommodationByNight;
    commissionByNight = distributeProportionally(
      totalBreakdown.otaCommissionCents,
      basisByNight
    );
  } else if (booking.commissionMode === 'fixed') {
    if (fixedRule === 'proportional_nights') {
      commissionByNight = distributeEvenly(
        totalBreakdown.otaCommissionCents,
        totalNights
      );
    } else if (fixedRule === 'payout_date') {
      commissionByNight[totalNights - 1] =
        totalBreakdown.otaCommissionCents;
    } else {
      commissionByNight[0] = totalBreakdown.otaCommissionCents;
    }
  }

  const result: MonthlyAllocatedNight[] = [];
  let currentDate = parseDateString(booking.checkInDate);

  for (let index = 0; index < totalNights; index += 1) {
    const grossNightRevenueCents = grossByNight[index];
    const otaCommissionCents = commissionByNight[index];

    result.push({
      dateStr: toDateString(currentDate),
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      nightIndex: index + 1,
      totalNights,
      grossNightRevenueCents,
      otaCommissionCents,
      netNightRevenueCents:
        grossNightRevenueCents - otaCommissionCents,
    });

    currentDate = addDays(currentDate, 1);
  }

  return result;
}

/**
 * Calculates property monthly financials with strict separation of OTA commission.
 */
export function calculatePropertyFinancials(
  propertyId: string,
  year: number,
  month: number,
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  taxConfig: TaxConfiguration
): PropertyFinancials {
  const propertyBookings = bookings.filter(
    (booking) =>
      booking.propertyId === propertyId &&
      booking.status !== 'cancelled'
  );

  let grossBookingIncomeCents = 0;
  let otaCommissionCents = 0;
  let occupiedNightsCount = 0;
  let bookingCount = 0;
  let totalGuestNightsCount = 0;

  for (const booking of propertyBookings) {
    const monthNights = getBookingMonthlyAllocatedNights(
      booking,
      taxConfig
    ).filter((night) => night.year === year && night.month === month);

    if (monthNights.length === 0) continue;

    bookingCount += 1;
    occupiedNightsCount += monthNights.length;
    totalGuestNightsCount +=
      monthNights.length *
      (nonNegativeInteger(booking.adults) +
        nonNegativeInteger(booking.children));

    for (const night of monthNights) {
      grossBookingIncomeCents += night.grossNightRevenueCents;
      otaCommissionCents += night.otaCommissionCents;
    }
  }

  const netBookingIncomeCents =
    grossBookingIncomeCents - otaCommissionCents;
  const propertyExtraIncomes = extraIncomes.filter(
    (income) =>
      income.propertyId === propertyId &&
      income.year === year &&
      income.month === month
  );
  const extraIncomeCents = propertyExtraIncomes.reduce(
    (sum, income) => sum + nonNegativeInteger(income.amountCents),
    0
  );

  const extraIncomeByTreatment: Record<TaxTreatment, number> = {
    accommodation_vat: 0,
    standard_vat: 0,
    vat_exempt: 0,
  };

  for (const income of propertyExtraIncomes) {
    extraIncomeByTreatment[income.taxTreatment] +=
      nonNegativeInteger(income.amountCents);
  }

  const propertyExpenses = expenses.filter(
    (expense) =>
      expense.propertyId === propertyId &&
      expense.year === year &&
      expense.month === month
  );
  const totalExpensesCents = propertyExpenses.reduce(
    (sum, expense) => sum + nonNegativeInteger(expense.amountCents),
    0
  );
  const deductibleExpensesCents = propertyExpenses
    .filter((expense) => expense.isDeductible)
    .reduce(
      (sum, expense) => sum + nonNegativeInteger(expense.amountCents),
      0
    );

  if (!isTaxConfigured(taxConfig)) {
    return {
      propertyId,
      grossBookingIncomeCents,
      otaCommissionCents,
      netBookingIncomeCents,
      extraIncomeCents,
      totalExpensesCents,
      accommodationVatCents: null,
      standardVatCents: null,
      ecoContributionCents: null,
      incomeTaxCents: null,
      calculatedTaxesCents: null,
      netBalanceCents: null,
      isTaxConfigured: false,
    };
  }

  const vatBookingBaseCents =
    taxConfig.vatBasis === 'net_after_commission'
      ? netBookingIncomeCents
      : grossBookingIncomeCents;
  const taxResults = calculatePropertyTaxes({
    bookingIncomeCents: vatBookingBaseCents,
    grossBookingIncomeCents,
    netBookingIncomeCents,
    extraIncomeCents,
    extraIncomeByTreatment,
    totalExpensesCents,
    deductibleExpensesCents,
    occupiedNightsCount,
    bookingCount,
    totalGuestNightsCount,
    config: taxConfig,
  });

  return {
    propertyId,
    grossBookingIncomeCents,
    otaCommissionCents,
    netBookingIncomeCents,
    extraIncomeCents,
    totalExpensesCents,
    accommodationVatCents: taxResults.accommodationVatCents,
    standardVatCents: taxResults.standardVatCents,
    ecoContributionCents: taxResults.ecoContributionCents,
    incomeTaxCents: taxResults.incomeTaxCents,
    calculatedTaxesCents: taxResults.calculatedTaxesCents,
    netBalanceCents: taxResults.netBalanceCents,
    isTaxConfigured: true,
  };
}

/**
 * Aggregates financials across the active property catalog.
 */
export function calculateAggregatedFinancials(
  year: number,
  month: number,
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  taxConfig: TaxConfiguration
): AggregatedFinancials {
  const propertyFinancials = ALL_PROPERTIES.map((property) =>
    calculatePropertyFinancials(
      property.id,
      year,
      month,
      bookings,
      expenses,
      extraIncomes,
      taxConfig
    )
  );
  const configured = isTaxConfigured(taxConfig);
  const result: AggregatedFinancials = {
    combinedGrossBookingIncomeCents: 0,
    combinedOtaCommissionCents: 0,
    combinedNetBookingIncomeCents: 0,
    combinedExtraIncomeCents: 0,
    combinedExpenseCents: 0,
    combinedAccommodationVatCents: configured ? 0 : null,
    combinedStandardVatCents: configured ? 0 : null,
    combinedEcoContributionCents: configured ? 0 : null,
    combinedIncomeTaxCents: configured ? 0 : null,
    combinedCalculatedTaxesCents: configured ? 0 : null,
    combinedNetBalanceCents: configured ? 0 : null,
    isTaxConfigured: configured,
  };

  for (const financials of propertyFinancials) {
    result.combinedGrossBookingIncomeCents +=
      financials.grossBookingIncomeCents;
    result.combinedOtaCommissionCents +=
      financials.otaCommissionCents;
    result.combinedNetBookingIncomeCents +=
      financials.netBookingIncomeCents;
    result.combinedExtraIncomeCents += financials.extraIncomeCents;
    result.combinedExpenseCents += financials.totalExpensesCents;

    if (!configured) continue;

    result.combinedAccommodationVatCents =
      (result.combinedAccommodationVatCents ?? 0) +
      (financials.accommodationVatCents ?? 0);
    result.combinedStandardVatCents =
      (result.combinedStandardVatCents ?? 0) +
      (financials.standardVatCents ?? 0);
    result.combinedEcoContributionCents =
      (result.combinedEcoContributionCents ?? 0) +
      (financials.ecoContributionCents ?? 0);
    result.combinedIncomeTaxCents =
      (result.combinedIncomeTaxCents ?? 0) +
      (financials.incomeTaxCents ?? 0);
    result.combinedCalculatedTaxesCents =
      (result.combinedCalculatedTaxesCents ?? 0) +
      (financials.calculatedTaxesCents ?? 0);
    result.combinedNetBalanceCents =
      (result.combinedNetBalanceCents ?? 0) +
      (financials.netBalanceCents ?? 0);
  }

  return result;
}
