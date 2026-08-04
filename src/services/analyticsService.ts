import { Booking, Channel, Expense, ExtraIncome } from '../types';
import { ALL_PROPERTIES, LOCATIONS } from '../config/locations';
import { getBookingMonthlyAllocatedNights } from './financialCalculationService';

export interface AnalyticsFilter {
  year: number;
  month: number | 'all';
  propertyId: string | 'all';
  locationId: string | 'all';
  channel: Channel | 'all';
  statusFilter: 'all' | 'confirmed_only' | 'include_provisional';
  revenueView: 'gross' | 'net';
}

export interface KpiMetrics {
  bookingRevenueCents: number;
  totalExtraIncomeCents: number;
  totalOperatingExpensesCents: number;
  netBalanceCents: number;
  occupancyRatePct: number;
  adrCents: number;
  revParCents: number;
  averageLengthOfStayNights: number;
  totalBookingCount: number;
  cancellationCount: number;
}

export function calculateKpiMetrics(
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  filter: AnalyticsFilter
): KpiMetrics {
  let targetProperties = ALL_PROPERTIES;
  if (filter.propertyId !== 'all') {
    targetProperties = ALL_PROPERTIES.filter((property) => property.id === filter.propertyId);
  } else if (filter.locationId !== 'all') {
    targetProperties = ALL_PROPERTIES.filter((property) => property.locationId === filter.locationId);
  }
  const propertyIds = new Set(targetProperties.map((property) => property.id));

  let scopedBookings = bookings.filter((booking) => propertyIds.has(booking.propertyId));
  if (filter.channel !== 'all') {
    scopedBookings = scopedBookings.filter((booking) => booking.channel === filter.channel);
  }

  const cancellationCount = scopedBookings.filter((booking) => booking.status === 'cancelled').length;
  let activeBookings = scopedBookings.filter((booking) => booking.status !== 'cancelled');
  if (filter.statusFilter === 'confirmed_only') {
    activeBookings = activeBookings.filter((booking) => booking.status !== 'provisional');
  }

  let bookingRevenueCents = 0;
  let occupiedNights = 0;
  const matchedBookingIds = new Set<string>();
  for (const booking of activeBookings) {
    const nights = getBookingMonthlyAllocatedNights(booking).filter((night) => {
      if (night.year !== filter.year) return false;
      return filter.month === 'all' || night.month === filter.month;
    });
    if (nights.length === 0) continue;
    matchedBookingIds.add(booking.id);
    occupiedNights += nights.length;
    bookingRevenueCents += nights.reduce((sum, night) => sum + night.revenueCents, 0);
  }

  const matchesPeriod = (year: number, month: number) =>
    year === filter.year && (filter.month === 'all' || month === filter.month);
  const totalExtraIncomeCents = extraIncomes
    .filter(
      (income) => propertyIds.has(income.propertyId) && matchesPeriod(income.year, income.month)
    )
    .reduce((sum, income) => sum + income.amountCents, 0);
  const totalOperatingExpensesCents = expenses
    .filter(
      (expense) => propertyIds.has(expense.propertyId) && matchesPeriod(expense.year, expense.month)
    )
    .reduce((sum, expense) => sum + expense.amountCents, 0);

  const daysInPeriod =
    filter.month === 'all'
      ? new Date(filter.year, 1, 29).getMonth() === 1
        ? 366
        : 365
      : new Date(filter.year, filter.month, 0).getDate();
  const availableNights = targetProperties.length * daysInPeriod;
  const bookingCount = matchedBookingIds.size;

  return {
    bookingRevenueCents,
    totalExtraIncomeCents,
    totalOperatingExpensesCents,
    netBalanceCents:
      bookingRevenueCents + totalExtraIncomeCents - totalOperatingExpensesCents,
    occupancyRatePct:
      availableNights > 0 ? Math.round((occupiedNights / availableNights) * 1000) / 10 : 0,
    adrCents: occupiedNights > 0 ? Math.round(bookingRevenueCents / occupiedNights) : 0,
    revParCents: availableNights > 0 ? Math.round(bookingRevenueCents / availableNights) : 0,
    averageLengthOfStayNights:
      bookingCount > 0 ? Math.round((occupiedNights / bookingCount) * 10) / 10 : 0,
    totalBookingCount: bookingCount,
    cancellationCount,
  };
}

export { LOCATIONS };
