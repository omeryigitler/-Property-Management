import { addDays } from 'date-fns';
import {
  AggregatedFinancials,
  Booking,
  Expense,
  ExtraIncome,
  PropertyFinancials,
} from '../types';
import { ALL_PROPERTIES } from '../config/locations';
import {
  calculateNights,
  parseDateString,
  toDateString,
} from '../utils/dateUtilities';

function nonNegativeInteger(value: number | null | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value ?? 0));
}

export function calculateBookingRevenue(booking: Booking): number {
  if (booking.status === 'cancelled') return 0;
  const nights = calculateNights(booking.checkInDate, booking.checkOutDate);
  if (nights <= 0) return 0;
  return booking.totalAmountCents == null
    ? nights * nonNegativeInteger(booking.nightlyRateCents)
    : nonNegativeInteger(booking.totalAmountCents);
}

export interface MonthlyAllocatedNight {
  dateStr: string;
  year: number;
  month: number;
  nightIndex: number;
  totalNights: number;
  revenueCents: number;
}

export function getBookingMonthlyAllocatedNights(
  booking: Booking
): MonthlyAllocatedNight[] {
  if (booking.status === 'cancelled') return [];
  const totalNights = calculateNights(booking.checkInDate, booking.checkOutDate);
  if (totalNights <= 0) return [];

  const exactTotalCents =
    booking.totalAmountCents == null
      ? null
      : nonNegativeInteger(booking.totalAmountCents);
  const baseRevenueCents =
    exactTotalCents == null
      ? nonNegativeInteger(booking.nightlyRateCents)
      : Math.floor(exactTotalCents / totalNights);
  const remainderCents =
    exactTotalCents == null
      ? 0
      : exactTotalCents - baseRevenueCents * totalNights;

  const result: MonthlyAllocatedNight[] = [];
  let currentDate = parseDateString(booking.checkInDate);

  for (let index = 0; index < totalNights; index += 1) {
    result.push({
      dateStr: toDateString(currentDate),
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      nightIndex: index + 1,
      totalNights,
      revenueCents: baseRevenueCents + (index < remainderCents ? 1 : 0),
    });
    currentDate = addDays(currentDate, 1);
  }

  return result;
}

export function calculatePropertyFinancials(
  propertyId: string,
  year: number,
  month: number,
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[]
): PropertyFinancials {
  const bookingIncomeCents = bookings
    .filter(
      (booking) =>
        booking.propertyId === propertyId && booking.status !== 'cancelled'
    )
    .flatMap(getBookingMonthlyAllocatedNights)
    .filter((night) => night.year === year && night.month === month)
    .reduce((sum, night) => sum + night.revenueCents, 0);

  const extraIncomeCents = extraIncomes
    .filter(
      (income) =>
        income.propertyId === propertyId &&
        income.year === year &&
        income.month === month
    )
    .reduce((sum, income) => sum + nonNegativeInteger(income.amountCents), 0);

  const totalExpensesCents = expenses
    .filter(
      (expense) =>
        expense.propertyId === propertyId &&
        expense.year === year &&
        expense.month === month
    )
    .reduce((sum, expense) => sum + nonNegativeInteger(expense.amountCents), 0);

  return {
    propertyId,
    bookingIncomeCents,
    extraIncomeCents,
    totalExpensesCents,
    netBalanceCents:
      bookingIncomeCents + extraIncomeCents - totalExpensesCents,
  };
}

export function calculateAggregatedFinancials(
  year: number,
  month: number,
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[]
): AggregatedFinancials {
  const result: AggregatedFinancials = {
    combinedBookingIncomeCents: 0,
    combinedExtraIncomeCents: 0,
    combinedExpenseCents: 0,
    combinedNetBalanceCents: 0,
  };

  for (const property of ALL_PROPERTIES) {
    const financials = calculatePropertyFinancials(
      property.id,
      year,
      month,
      bookings,
      expenses,
      extraIncomes
    );
    result.combinedBookingIncomeCents += financials.bookingIncomeCents;
    result.combinedExtraIncomeCents += financials.extraIncomeCents;
    result.combinedExpenseCents += financials.totalExpensesCents;
    result.combinedNetBalanceCents += financials.netBalanceCents;
  }

  return result;
}
