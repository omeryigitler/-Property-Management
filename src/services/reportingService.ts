import { Booking, Channel, Expense, ExtraIncome } from '../types';
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
  bookingIncomeCents: number;
  extraIncomeCents: number;
  totalExpensesCents: number;
  netBalanceCents: number;
  occupiedNights: number;
  availableNights: number;
  occupancyRatePct: number;
  adrCents: number;
  revParCents: number;
  bookingCount: number;
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
  bookingIncomeCents: number;
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

function matchedNights(
  booking: Booking,
  year: number,
  months: Set<number>
) {
  return getBookingMonthlyAllocatedNights(booking).filter(
    (night) => night.year === year && months.has(night.month)
  );
}

export function calculateReportSummary(
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  filter: ReportFilter
): ReportSummary {
  const months = getMonths(filter);
  const monthSet = new Set(months);
  const propertyIds = getPropertyIds(filter.propertyId);
  const propertyIdSet = new Set(propertyIds);

  let bookingIncomeCents = 0;
  let extraIncomeCents = 0;
  let totalExpensesCents = 0;

  for (const month of months) {
    for (const propertyId of propertyIds) {
      const item = calculatePropertyFinancials(
        propertyId,
        filter.year,
        month,
        bookings,
        expenses,
        extraIncomes
      );
      bookingIncomeCents += item.bookingIncomeCents;
      extraIncomeCents += item.extraIncomeCents;
      totalExpensesCents += item.totalExpensesCents;
    }
  }

  let occupiedNights = 0;
  const bookingIds = new Set<string>();
  for (const booking of bookings) {
    if (booking.status === 'cancelled' || !propertyIdSet.has(booking.propertyId)) continue;
    const nights = matchedNights(booking, filter.year, monthSet);
    if (nights.length === 0) continue;
    occupiedNights += nights.length;
    bookingIds.add(booking.id);
  }

  const availableNights =
    propertyIds.length * months.reduce((sum, month) => sum + daysInMonth(filter.year, month), 0);
  const occupancyRatePct =
    availableNights > 0 ? Math.round((occupiedNights / availableNights) * 1000) / 10 : 0;

  return {
    bookingIncomeCents,
    extraIncomeCents,
    totalExpensesCents,
    netBalanceCents: bookingIncomeCents + extraIncomeCents - totalExpensesCents,
    occupiedNights,
    availableNights,
    occupancyRatePct,
    adrCents: occupiedNights > 0 ? Math.round(bookingIncomeCents / occupiedNights) : 0,
    revParCents: availableNights > 0 ? Math.round(bookingIncomeCents / availableNights) : 0,
    bookingCount: bookingIds.size,
  };
}

export function buildMonthlyFinancialSeries(
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  year: number,
  propertyId: string | 'all'
): FinancialSeriesPoint[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return {
      ...calculateReportSummary(bookings, expenses, extraIncomes, {
        period: 'monthly',
        year,
        month,
        propertyId,
      }),
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
  filter: ReportFilter
): FinancialSeriesPoint[] {
  const properties =
    filter.propertyId === 'all'
      ? ALL_PROPERTIES
      : ALL_PROPERTIES.filter((property) => property.id === filter.propertyId);

  return properties.map((property) => ({
    ...calculateReportSummary(bookings, expenses, extraIncomes, {
      ...filter,
      propertyId: property.id,
    }),
    key: property.id,
    label: property.name,
    propertyId: property.id,
  }));
}

export function buildChannelFinancialSeries(
  bookings: Booking[],
  filter: ReportFilter
): ChannelSeriesPoint[] {
  const months = new Set(getMonths(filter));
  const propertyIds = new Set(getPropertyIds(filter.propertyId));

  return CHANNELS.map((channel) => {
    let bookingIncomeCents = 0;
    const bookingIds = new Set<string>();

    for (const booking of bookings) {
      if (
        booking.status === 'cancelled' ||
        booking.channel !== channel ||
        !propertyIds.has(booking.propertyId)
      ) {
        continue;
      }
      const nights = matchedNights(booking, filter.year, months);
      if (nights.length === 0) continue;
      bookingIds.add(booking.id);
      bookingIncomeCents += nights.reduce((sum, night) => sum + night.revenueCents, 0);
    }

    return {
      channel,
      label: CHANNEL_CONFIG[channel].name,
      bookingIncomeCents,
      bookingCount: bookingIds.size,
    };
  }).filter((item) => item.bookingIncomeCents !== 0 || item.bookingCount !== 0);
}

export function buildExpenseSeries(
  expenses: Expense[],
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

  return Array.from(categoryTotals.entries())
    .map(([label, amountCents]) => ({
      key: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      label,
      amountCents,
    }))
    .sort((a, b) => b.amountCents - a.amountCents);
}
