import { addDays, parseISO, format } from 'date-fns';
import { Booking } from '../types';
import { calculateNights, toDateString, parseDateString } from './dateUtilities';

export interface OccupiedNightInfo {
  dateStr: string;
  year: number;
  month: number; // 1-12
  nightIndex: number; // 1-based index e.g. 1, 2, 3
  totalNights: number;
  allocatedRevenueCents: number; // Nightly rate - proportional discount + (cleaning fee if check-in)
}

/**
 * Breakdown of a booking's occupied nights and financial allocation per night.
 */
export function getBookingOccupiedNights(booking: Booking): OccupiedNightInfo[] {
  if (!booking.checkInDate || !booking.checkOutDate || booking.status === 'cancelled') {
    return [];
  }

  const totalNights = calculateNights(booking.checkInDate, booking.checkOutDate);
  if (totalNights <= 0) return [];

  const perNightDiscount = Math.floor((booking.discountCents || 0) / totalNights);
  const discountRemainder = (booking.discountCents || 0) % totalNights;

  const nights: OccupiedNightInfo[] = [];
  let currentDate = parseDateString(booking.checkInDate);

  for (let i = 0; i < totalNights; i++) {
    const dateStr = toDateString(currentDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    // Apply remainder discount to first night
    const discountForThisNight = perNightDiscount + (i === 0 ? discountRemainder : 0);
    let nightRevenue = booking.nightlyRateCents - discountForThisNight;
    if (nightRevenue < 0) nightRevenue = 0;

    // Cleaning fee allocated to check-in night
    if (i === 0) {
      nightRevenue += booking.cleaningFeeCents || 0;
    }

    nights.push({
      dateStr,
      year,
      month,
      nightIndex: i + 1,
      totalNights,
      allocatedRevenueCents: nightRevenue,
    });

    currentDate = addDays(currentDate, 1);
  }

  return nights;
}

/**
 * Calculates total revenue allocated to a specific property and month across all active bookings.
 */
export function calculateMonthlyPropertyBookingRevenue(
  propertyId: string,
  year: number,
  month: number,
  allBookings: Booking[]
): number {
  const propertyBookings = allBookings.filter(
    (b) => b.propertyId === propertyId && b.status !== 'cancelled'
  );

  let totalCents = 0;

  for (const booking of propertyBookings) {
    const nights = getBookingOccupiedNights(booking);
    for (const night of nights) {
      if (night.year === year && night.month === month) {
        totalCents += night.allocatedRevenueCents;
      }
    }
  }

  return totalCents;
}

/**
 * Calculates daily total revenue allocated across ALL properties for a single calendar date.
 */
export function calculateDailyTotalRevenue(
  dateStr: string,
  allBookings: Booking[]
): number {
  let dailyTotalCents = 0;

  const activeBookings = allBookings.filter((b) => b.status !== 'cancelled');

  for (const booking of activeBookings) {
    const nights = getBookingOccupiedNights(booking);
    const matchingNight = nights.find((n) => n.dateStr === dateStr);
    if (matchingNight) {
      dailyTotalCents += matchingNight.allocatedRevenueCents;
    }
  }

  return dailyTotalCents;
}

export interface CellBookingState {
  booking: Booking | null;
  isOccupied: boolean;
  isCheckIn: boolean;
  isCheckOut: boolean;
  nightIndex: number;
  totalNights: number;
}

/**
 * Gets cell booking state for a property on a specific date.
 */
export function getCellBookingState(
  propertyId: string,
  dateStr: string,
  allBookings: Booking[]
): CellBookingState {
  const activeBookings = allBookings.filter(
    (b) => b.propertyId === propertyId && b.status !== 'cancelled'
  );

  for (const booking of activeBookings) {
    const nights = getBookingOccupiedNights(booking);
    const nightMatch = nights.find((n) => n.dateStr === dateStr);

    if (nightMatch) {
      return {
        booking,
        isOccupied: true,
        isCheckIn: nightMatch.nightIndex === 1,
        isCheckOut: false,
        nightIndex: nightMatch.nightIndex,
        totalNights: nightMatch.totalNights,
      };
    }

    // Check if it's the check-out date (departure date)
    if (booking.checkOutDate === dateStr) {
      // If no other booking starts on this date, we note checkOut state
      return {
        booking,
        isOccupied: false,
        isCheckIn: false,
        isCheckOut: true,
        nightIndex: calculateNights(booking.checkInDate, booking.checkOutDate),
        totalNights: calculateNights(booking.checkInDate, booking.checkOutDate),
      };
    }
  }

  return {
    booking: null,
    isOccupied: false,
    isCheckIn: false,
    isCheckOut: false,
    nightIndex: 0,
    totalNights: 0,
  };
}
