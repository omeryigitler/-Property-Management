import {
  Booking,
  Expense,
  ExtraIncome,
  TaxConfiguration,
  PropertyFinancials,
  AggregatedFinancials,
  Channel,
  CommissionMode,
  CommissionBasis,
  TaxTreatment,
} from '../types';
import { ALL_PROPERTIES } from '../config/locations';
import { calculateNights, parseDateString, toDateString } from '../utils/dateUtilities';
import { addDays } from 'date-fns';
import { isTaxConfigured, calculatePropertyTaxes } from '../utils/taxCalculations';

export const DEFAULT_CHANNEL_COMMISSIONS: Record<Channel, { percentage: number; mode: CommissionMode }> = {
  airbnb: { percentage: 15.0, mode: 'percentage' },
  booking_com: { percentage: 15.0, mode: 'percentage' },
  direct: { percentage: 0.0, mode: 'none' },
  vrbo: { percentage: 10.0, mode: 'percentage' },
};

export interface BookingRevenueBreakdown {
  grossAccommodationRevenueCents: number;
  grossBookingRevenueCents: number;
  otaCommissionCents: number;
  netBookingRevenueCents: number;
}

/**
 * Single source of truth for calculating booking revenue and commission.
 */
export function calculateBookingRevenueAndCommission(
  booking: Booking,
  commissionBasis: CommissionBasis = 'accommodation_only'
): BookingRevenueBreakdown {
  if (!booking.checkInDate || !booking.checkOutDate || booking.status === 'cancelled') {
    return {
      grossAccommodationRevenueCents: 0,
      grossBookingRevenueCents: 0,
      otaCommissionCents: 0,
      netBookingRevenueCents: 0,
    };
  }

  const nightsCount = calculateNights(booking.checkInDate, booking.checkOutDate);
  const grossAccommodationRevenueCents = Math.max(
    0,
    nightsCount * booking.nightlyRateCents - (booking.discountCents || 0)
  );

  const grossBookingRevenueCents =
    grossAccommodationRevenueCents + (booking.cleaningFeeCents || 0);

  let otaCommissionCents = 0;

  if (booking.commissionMode === 'percentage') {
    let basisCents = grossAccommodationRevenueCents;
    if (
      commissionBasis === 'accommodation_plus_fees' ||
      commissionBasis === 'gross_after_discounts'
    ) {
      basisCents = grossBookingRevenueCents;
    }

    const rate = (booking.commissionPercentage || 0) / 100;
    otaCommissionCents = Math.round(basisCents * rate);
  } else if (booking.commissionMode === 'fixed') {
    otaCommissionCents = booking.commissionFixedAmountCents || 0;
  }

  const netBookingRevenueCents = grossBookingRevenueCents - otaCommissionCents;

  return {
    grossAccommodationRevenueCents,
    grossBookingRevenueCents,
    otaCommissionCents,
    netBookingRevenueCents,
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
 * Breakdown of a booking's occupied nights and proportional financial allocation across months.
 */
export function getBookingMonthlyAllocatedNights(
  booking: Booking,
  taxConfig?: TaxConfiguration
): MonthlyAllocatedNight[] {
  if (!booking.checkInDate || !booking.checkOutDate || booking.status === 'cancelled') {
    return [];
  }

  const totalNights = calculateNights(booking.checkInDate, booking.checkOutDate);
  if (totalNights <= 0) return [];

  const commissionBasis = taxConfig?.commissionBasis || 'accommodation_only';
  const fixedRule = taxConfig?.fixedCommissionAllocationRule || 'check_in_date';
  const fullBreakdown = calculateBookingRevenueAndCommission(booking, commissionBasis);

  const perNightGross = Math.floor(fullBreakdown.grossBookingRevenueCents / totalNights);
  const grossRemainder = fullBreakdown.grossBookingRevenueCents % totalNights;
  const perNightCommission = Math.floor(fullBreakdown.otaCommissionCents / totalNights);
  const commissionRemainder = fullBreakdown.otaCommissionCents % totalNights;

  const result: MonthlyAllocatedNight[] = [];
  let currentDate = parseDateString(booking.checkInDate);

  for (let index = 0; index < totalNights; index += 1) {
    const dateStr = toDateString(currentDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const nightGross = perNightGross + (index === 0 ? grossRemainder : 0);
    let nightCommission = 0;

    if (booking.commissionMode === 'percentage') {
      nightCommission = perNightCommission + (index === 0 ? commissionRemainder : 0);
    } else if (booking.commissionMode === 'fixed') {
      if (fixedRule === 'proportional_nights') {
        nightCommission = perNightCommission + (index === 0 ? commissionRemainder : 0);
      } else if (fixedRule === 'check_in_date') {
        nightCommission = index === 0 ? fullBreakdown.otaCommissionCents : 0;
      } else if (fixedRule === 'payout_date') {
        nightCommission = index === totalNights - 1 ? fullBreakdown.otaCommissionCents : 0;
      }
    }

    result.push({
      dateStr,
      year,
      month,
      nightIndex: index + 1,
      totalNights,
      grossNightRevenueCents: nightGross,
      otaCommissionCents: nightCommission,
      netNightRevenueCents: nightGross - nightCommission,
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
    (booking) => booking.propertyId === propertyId && booking.status !== 'cancelled'
  );

  let grossBookingIncomeCents = 0;
  let otaCommissionCents = 0;
  let occupiedNightsCount = 0;
  let bookingCount = 0;
  let totalGuestNightsCount = 0;

  for (const booking of propertyBookings) {
    const monthNights = getBookingMonthlyAllocatedNights(booking, taxConfig).filter(
      (night) => night.year === year && night.month === month
    );

    if (monthNights.length === 0) continue;

    bookingCount += 1;
    occupiedNightsCount += monthNights.length;
    totalGuestNightsCount +=
      monthNights.length * ((booking.adults || 1) + (booking.children || 0));

    for (const night of monthNights) {
      grossBookingIncomeCents += night.grossNightRevenueCents;
      otaCommissionCents += night.otaCommissionCents;
    }
  }

  const netBookingIncomeCents = grossBookingIncomeCents - otaCommissionCents;
  const propertyExtraIncomes = extraIncomes.filter(
    (income) =>
      income.propertyId === propertyId && income.year === year && income.month === month
  );
  const extraIncomeCents = propertyExtraIncomes.reduce(
    (sum, income) => sum + income.amountCents,
    0
  );

  const extraIncomeByTreatment: Record<TaxTreatment, number> = {
    accommodation_vat: 0,
    standard_vat: 0,
    vat_exempt: 0,
  };

  for (const income of propertyExtraIncomes) {
    extraIncomeByTreatment[income.taxTreatment] =
      (extraIncomeByTreatment[income.taxTreatment] || 0) + income.amountCents;
  }

  const propertyExpenses = expenses.filter(
    (expense) =>
      expense.propertyId === propertyId && expense.year === year && expense.month === month
  );
  const totalExpensesCents = propertyExpenses.reduce(
    (sum, expense) => sum + expense.amountCents,
    0
  );
  const deductibleExpensesCents = propertyExpenses
    .filter((expense) => expense.isDeductible)
    .reduce((sum, expense) => sum + expense.amountCents, 0);

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
    result.combinedGrossBookingIncomeCents += financials.grossBookingIncomeCents;
    result.combinedOtaCommissionCents += financials.otaCommissionCents;
    result.combinedNetBookingIncomeCents += financials.netBookingIncomeCents;
    result.combinedExtraIncomeCents += financials.extraIncomeCents;
    result.combinedExpenseCents += financials.totalExpensesCents;

    if (!configured) continue;

    result.combinedAccommodationVatCents =
      (result.combinedAccommodationVatCents ?? 0) +
      (financials.accommodationVatCents ?? 0);
    result.combinedStandardVatCents =
      (result.combinedStandardVatCents ?? 0) + (financials.standardVatCents ?? 0);
    result.combinedEcoContributionCents =
      (result.combinedEcoContributionCents ?? 0) +
      (financials.ecoContributionCents ?? 0);
    result.combinedIncomeTaxCents =
      (result.combinedIncomeTaxCents ?? 0) + (financials.incomeTaxCents ?? 0);
    result.combinedCalculatedTaxesCents =
      (result.combinedCalculatedTaxesCents ?? 0) +
      (financials.calculatedTaxesCents ?? 0);
    result.combinedNetBalanceCents =
      (result.combinedNetBalanceCents ?? 0) + (financials.netBalanceCents ?? 0);
  }

  return result;
}
