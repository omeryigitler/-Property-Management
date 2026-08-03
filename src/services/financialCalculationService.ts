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
  FixedCommissionAllocationRule,
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
    if (commissionBasis === 'accommodation_plus_fees') {
      basisCents = grossBookingRevenueCents;
    } else if (commissionBasis === 'gross_after_discounts') {
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

  const commBasis = taxConfig?.commissionBasis || 'accommodation_only';
  const fixedRule = taxConfig?.fixedCommissionAllocationRule || 'check_in_date';

  const fullBreakdown = calculateBookingRevenueAndCommission(booking, commBasis);

  // Per-night gross revenue
  const perNightGross = Math.floor(fullBreakdown.grossBookingRevenueCents / totalNights);
  const grossRemainder = fullBreakdown.grossBookingRevenueCents % totalNights;

  // Percentage commission is allocated proportionally to nights
  const perNightComm = Math.floor(fullBreakdown.otaCommissionCents / totalNights);
  const commRemainder = fullBreakdown.otaCommissionCents % totalNights;

  const result: MonthlyAllocatedNight[] = [];
  let currentDate = parseDateString(booking.checkInDate);

  for (let i = 0; i < totalNights; i++) {
    const dateStr = toDateString(currentDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    let nightGross = perNightGross + (i === 0 ? grossRemainder : 0);
    let nightComm = 0;

    if (booking.commissionMode === 'percentage') {
      nightComm = perNightComm + (i === 0 ? commRemainder : 0);
    } else if (booking.commissionMode === 'fixed') {
      if (fixedRule === 'proportional_nights') {
        nightComm = perNightComm + (i === 0 ? commRemainder : 0);
      } else if (fixedRule === 'check_in_date') {
        nightComm = i === 0 ? fullBreakdown.otaCommissionCents : 0;
      } else if (fixedRule === 'payout_date') {
        // Default to checkout date night
        nightComm = i === totalNights - 1 ? fullBreakdown.otaCommissionCents : 0;
      }
    }

    result.push({
      dateStr,
      year,
      month,
      nightIndex: i + 1,
      totalNights,
      grossNightRevenueCents: nightGross,
      otaCommissionCents: nightComm,
      netNightRevenueCents: nightGross - nightComm,
    });

    currentDate = addDays(currentDate, 1);
  }

  return result;
}

/**
 * Calculates Property Monthly Financials with strict separation of OTA Commission.
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
    (b) => b.propertyId === propertyId && b.status !== 'cancelled'
  );

  let grossBookingIncomeCents = 0;
  let otaCommissionCents = 0;
  let occupiedNightsCount = 0;
  let bookingCount = 0;
  let totalGuestNightsCount = 0;

  for (const booking of propertyBookings) {
    const nights = getBookingMonthlyAllocatedNights(booking, taxConfig);
    const monthNights = nights.filter((n) => n.year === year && n.month === month);

    if (monthNights.length > 0) {
      bookingCount++;
      occupiedNightsCount += monthNights.length;
      totalGuestNightsCount += monthNights.length * ((booking.adults || 1) + (booking.children || 0));

      for (const n of monthNights) {
        grossBookingIncomeCents += n.grossNightRevenueCents;
        otaCommissionCents += n.otaCommissionCents;
      }
    }
  }

  const netBookingIncomeCents = grossBookingIncomeCents - otaCommissionCents;

  // Extra Incomes
  const propertyExtraIncomes = extraIncomes.filter(
    (e) => e.propertyId === propertyId && e.year === year && e.month === month
  );
  const extraIncomeCents = propertyExtraIncomes.reduce((sum, e) => sum + e.amountCents, 0);

  const extraIncomeByTreatment: Record<TaxTreatment, number> = {
    accommodation_vat: 0,
    standard_vat: 0,
    vat_exempt: 0,
  };
  for (const e of propertyExtraIncomes) {
    extraIncomeByTreatment[e.taxTreatment] = (extraIncomeByTreatment[e.taxTreatment] || 0) + e.amountCents;
  }

  // Operating Expenses (excluding OTA Commission to prevent double-deduction)
  const propertyExpenses = expenses.filter(
    (e) => e.propertyId === propertyId && e.year === year && e.month === month
  );
  const totalExpensesCents = propertyExpenses.reduce((sum, e) => sum + e.amountCents, 0);
  const deductibleExpensesCents = propertyExpenses
    .filter((e) => e.isDeductible)
    .reduce((sum, e) => sum + e.amountCents, 0);

  const configured = isTaxConfigured(taxConfig);

  if (!configured) {
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

  // Determine taxable base based on taxConfig rule
  let taxBookingBaseCents = grossBookingIncomeCents;
  if (taxConfig.vatBasis === 'net_after_commission') {
    taxBookingBaseCents = netBookingIncomeCents;
  }

  const taxResults = calculatePropertyTaxes({
    bookingIncomeCents: taxBookingBaseCents,
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
    netBalanceCents: netBookingIncomeCents + extraIncomeCents - totalExpensesCents - taxResults.calculatedTaxesCents,
    isTaxConfigured: true,
  };
}

/**
 * Aggregates financials across all properties.
 */
export function calculateAggregatedFinancials(
  year: number,
  month: number,
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  taxConfig: TaxConfiguration
): AggregatedFinancials {
  const propertyFinancials = ALL_PROPERTIES.map((p) =>
    calculatePropertyFinancials(p.id, year, month, bookings, expenses, extraIncomes, taxConfig)
  );

  const configured = isTaxConfigured(taxConfig);

  let combinedGrossBookingIncomeCents = 0;
  let combinedOtaCommissionCents = 0;
  let combinedNetBookingIncomeCents = 0;
  let combinedExtraIncomeCents = 0;
  let combinedExpenseCents = 0;

  let combinedAccommodationVatCents = configured ? 0 : null;
  let combinedStandardVatCents = configured ? 0 : null;
  let combinedEcoContributionCents = configured ? 0 : null;
  let combinedIncomeTaxCents = configured ? 0 : null;
  let combinedCalculatedTaxesCents = configured ? 0 : null;
  let combinedNetBalanceCents = configured ? 0 : null;

  for (const pFin of propertyFinancials) {
    combinedGrossBookingIncomeCents += pFin.grossBookingIncomeCents;
    combinedOtaCommissionCents += pFin.otaCommissionCents;
    combinedNetBookingIncomeCents += pFin.netBookingIncomeCents;
    combinedExtraIncomeCents += pFin.extraIncomeCents;
    combinedExpenseCents += pFin.totalExpensesCents;

    if (configured) {
      combinedAccommodationVatCents = (combinedAccommodationVatCents ?? 0) + (pFin.accommodationVatCents ?? 0);
      combinedStandardVatCents = (combinedStandardVatCents ?? 0) + (pFin.standardVatCents ?? 0);
      combinedEcoContributionCents = (combinedEcoContributionCents ?? 0) + (pFin.ecoContributionCents ?? 0);
      combinedIncomeTaxCents = (combinedIncomeTaxCents ?? 0) + (pFin.incomeTaxCents ?? 0);
      combinedCalculatedTaxesCents = (combinedCalculatedTaxesCents ?? 0) + (pFin.calculatedTaxesCents ?? 0);
      combinedNetBalanceCents = (combinedNetBalanceCents ?? 0) + (pFin.netBalanceCents ?? 0);
    }
  }

  return {
    combinedGrossBookingIncomeCents,
    combinedOtaCommissionCents,
    combinedNetBookingIncomeCents,
    combinedExtraIncomeCents,
    combinedExpenseCents,
    combinedAccommodationVatCents,
    combinedStandardVatCents,
    combinedEcoContributionCents,
    combinedIncomeTaxCents,
    combinedCalculatedTaxesCents,
    combinedNetBalanceCents,
    isTaxConfigured: configured,
  };
}
