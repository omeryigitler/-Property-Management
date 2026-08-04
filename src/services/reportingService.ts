import {
  Booking,
  Channel,
  Expense,
  ExtraIncome,
  TaxConfiguration,
} from '../types';
import { ALL_PROPERTIES, CHANNEL_CONFIG } from '../config/locations';
import { MONTH_SHORT_NAMES } from '../utils/dateUtilities';
import {
  calculatePropertyFinancials,
  getBookingMonthlyAllocatedNights,
} from './financialCalculationService';

export type ReportPeriod = 'monthly' | 'yearly';

export interface ReportFilter {
  period: ReportPeriod;
  year: number;
  month: number;
  propertyId: string | 'all';
}

export interface ReportSummary {
  grossBookingIncomeCents: number;
  otaCommissionCents: number;
  netBookingIncomeCents: number;
  extraIncomeCents: number;
  totalExpensesCents: number;
  calculatedTaxesCents: number | null;
  netBalanceCents: number | null;
  preTaxBalanceCents: number;
  occupiedNights: number;
  availableNights: number;
  occupancyRatePct: number;
  adrCents: number;
  revParCents: number;
  bookingCount: number;
  isTaxConfigured: boolean;
}

export interface FinancialSeriesPoint extends ReportSummary {
  key: string;
  label: string;
  propertyId?: string;
  month?: number;
}

export interface ChannelSeriesPoint {
  channel: Channel;
  label: string;
  grossBookingIncomeCents: number;
  otaCommissionCents: number;
  netBookingIncomeCents: number;
  bookingCount: number;
}

export interface ExpenseSeriesPoint {
  key: string;
  label: string;
  amountCents: number;
}

const CHANNELS = Object.keys(CHANNEL_CONFIG) as Channel[];

function getMonths(filter: ReportFilter): number[] {
  return filter.period === 'yearly'
    ? Array.from({ length: 12 }, (_, index) => index + 1)
    : [filter.month];
}

function getPropertyIds(propertyId: string | 'all'): string[] {
  return propertyId === 'all'
    ? ALL_PROPERTIES.map((property) => property.id)
    : [propertyId];
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function bookingMatchesScope(
  booking: Booking,
  propertyIds: Set<string>
): boolean {
  return propertyIds.has(booking.propertyId);
}

function getMatchedBookingNights(
  booking: Booking,
  taxConfig: TaxConfiguration,
  year: number,
  months: Set<number>
) {
  return getBookingMonthlyAllocatedNights(booking, taxConfig).filter(
    (night) => night.year === year && months.has(night.month)
  );
}

export function calculateReportSummary(
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  taxConfig: TaxConfiguration,
  filter: ReportFilter
): ReportSummary {
  const months = getMonths(filter);
  const monthSet = new Set(months);
  const propertyIds = getPropertyIds(filter.propertyId);
  const propertyIdSet = new Set(propertyIds);

  let grossBookingIncomeCents = 0;
  let otaCommissionCents = 0;
  let netBookingIncomeCents = 0;
  let extraIncomeCents = 0;
  let totalExpensesCents = 0;
  let calculatedTaxesCents: number | null = 0;
  let netBalanceCents: number | null = 0;
  let isTaxConfigured = true;

  for (const month of months) {
    for (const propertyId of propertyIds) {
      const financials = calculatePropertyFinancials(
        propertyId,
        filter.year,
        month,
        bookings,
        expenses,
        extraIncomes,
        taxConfig
      );

      grossBookingIncomeCents += financials.grossBookingIncomeCents;
      otaCommissionCents += financials.otaCommissionCents;
      netBookingIncomeCents += financials.netBookingIncomeCents;
      extraIncomeCents += financials.extraIncomeCents;
      totalExpensesCents += financials.totalExpensesCents;

      if (!financials.isTaxConfigured) {
        isTaxConfigured = false;
        calculatedTaxesCents = null;
        netBalanceCents = null;
      } else if (isTaxConfigured) {
        calculatedTaxesCents =
          (calculatedTaxesCents ?? 0) + (financials.calculatedTaxesCents ?? 0);
        netBalanceCents =
          (netBalanceCents ?? 0) + (financials.netBalanceCents ?? 0);
      }
    }
  }

  let occupiedNights = 0;
  const bookingIds = new Set<string>();

  for (const booking of bookings) {
    if (booking.status === 'cancelled' || !bookingMatchesScope(booking, propertyIdSet)) {
      continue;
    }

    const matchedNights = getMatchedBookingNights(
      booking,
      taxConfig,
      filter.year,
      monthSet
    );

    if (matchedNights.length > 0) {
      occupiedNights += matchedNights.length;
      bookingIds.add(booking.id);
    }
  }

  const availableNights =
    propertyIds.length * months.reduce((sum, month) => sum + daysInMonth(filter.year, month), 0);
  const occupancyRatePct =
    availableNights > 0 ? Math.round((occupiedNights / availableNights) * 1000) / 10 : 0;
  const adrCents =
    occupiedNights > 0 ? Math.round(grossBookingIncomeCents / occupiedNights) : 0;
  const revParCents =
    availableNights > 0 ? Math.round(grossBookingIncomeCents / availableNights) : 0;
  const preTaxBalanceCents =
    netBookingIncomeCents + extraIncomeCents - totalExpensesCents;

  return {
    grossBookingIncomeCents,
    otaCommissionCents,
    netBookingIncomeCents,
    extraIncomeCents,
    totalExpensesCents,
    calculatedTaxesCents,
    netBalanceCents,
    preTaxBalanceCents,
    occupiedNights,
    availableNights,
    occupancyRatePct,
    adrCents,
    revParCents,
    bookingCount: bookingIds.size,
    isTaxConfigured,
  };
}

export function buildMonthlyFinancialSeries(
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  taxConfig: TaxConfiguration,
  year: number,
  propertyId: string | 'all'
): FinancialSeriesPoint[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const summary = calculateReportSummary(
      bookings,
      expenses,
      extraIncomes,
      taxConfig,
      {
        period: 'monthly',
        year,
        month,
        propertyId,
      }
    );

    return {
      ...summary,
      key: `${year}-${String(month).padStart(2, '0')}`,
      label: MONTH_SHORT_NAMES[index],
      month,
    };
  });
}

export function buildPropertyFinancialSeries(
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  taxConfig: TaxConfiguration,
  filter: ReportFilter
): FinancialSeriesPoint[] {
  const properties =
    filter.propertyId === 'all'
      ? ALL_PROPERTIES
      : ALL_PROPERTIES.filter((property) => property.id === filter.propertyId);

  return properties.map((property) => {
    const summary = calculateReportSummary(
      bookings,
      expenses,
      extraIncomes,
      taxConfig,
      {
        ...filter,
        propertyId: property.id,
      }
    );

    return {
      ...summary,
      key: property.id,
      label: property.name,
      propertyId: property.id,
    };
  });
}

export function buildChannelFinancialSeries(
  bookings: Booking[],
  taxConfig: TaxConfiguration,
  filter: ReportFilter
): ChannelSeriesPoint[] {
  const months = new Set(getMonths(filter));
  const propertyIds = new Set(getPropertyIds(filter.propertyId));

  return CHANNELS.map((channel) => {
    let grossBookingIncomeCents = 0;
    let otaCommissionCents = 0;
    let netBookingIncomeCents = 0;
    const bookingIds = new Set<string>();

    for (const booking of bookings) {
      if (
        booking.status === 'cancelled' ||
        booking.channel !== channel ||
        !bookingMatchesScope(booking, propertyIds)
      ) {
        continue;
      }

      const nights = getMatchedBookingNights(
        booking,
        taxConfig,
        filter.year,
        months
      );

      if (nights.length === 0) continue;

      bookingIds.add(booking.id);
      for (const night of nights) {
        grossBookingIncomeCents += night.grossNightRevenueCents;
        otaCommissionCents += night.otaCommissionCents;
        netBookingIncomeCents += night.netNightRevenueCents;
      }
    }

    return {
      channel,
      label: CHANNEL_CONFIG[channel].name,
      grossBookingIncomeCents,
      otaCommissionCents,
      netBookingIncomeCents,
      bookingCount: bookingIds.size,
    };
  }).filter(
    (item) =>
      item.grossBookingIncomeCents !== 0 ||
      item.otaCommissionCents !== 0 ||
      item.bookingCount !== 0
  );
}

export function buildExpenseSeries(
  expenses: Expense[],
  summary: ReportSummary,
  filter: ReportFilter
): ExpenseSeriesPoint[] {
  const months = new Set(getMonths(filter));
  const propertyIds = new Set(getPropertyIds(filter.propertyId));
  const categoryTotals = new Map<string, number>();

  for (const expense of expenses) {
    if (
      expense.year !== filter.year ||
      !months.has(expense.month) ||
      !propertyIds.has(expense.propertyId)
    ) {
      continue;
    }

    const label = expense.category?.trim() || expense.label?.trim() || 'Other';
    categoryTotals.set(label, (categoryTotals.get(label) ?? 0) + expense.amountCents);
  }

  if (summary.otaCommissionCents > 0) {
    categoryTotals.set('OTA Commission', summary.otaCommissionCents);
  }

  if ((summary.calculatedTaxesCents ?? 0) > 0) {
    categoryTotals.set('Taxes', summary.calculatedTaxesCents ?? 0);
  }

  return Array.from(categoryTotals.entries())
    .map(([label, amountCents]) => ({
      key: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      label,
      amountCents,
    }))
    .sort((a, b) => b.amountCents - a.amountCents);
}
