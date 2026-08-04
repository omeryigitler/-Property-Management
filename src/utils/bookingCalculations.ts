import { Booking } from '../types';
import { getBookingMonthlyAllocatedNights } from '../services/financialCalculationService';
import { calculateNights } from './dateUtilities';

export interface OccupiedNightInfo {
  dateStr: string;
  year: number;
  month: number;
  nightIndex: number;
  totalNights: number;
  allocatedRevenueCents: number;
}

/**
 * Calendar, mobile view and finance reports all read the same occupied-night
 * allocation so cross-month bookings cannot produce different totals.
 */
export function getBookingOccupiedNights(
  booking: Booking
): OccupiedNightInfo[] {
  return getBookingMonthlyAllocatedNights(booking).map((night) => ({
    dateStr: night.dateStr,
    year: night.year,
    month: night.month,
    nightIndex: night.nightIndex,
    totalNights: night.totalNights,
    allocatedRevenueCents: night.grossNightRevenueCents,
  }));
}

export function calculateMonthlyPropertyBookingRevenue(
  propertyId: string,
  year: number,
  month: number,
  allBookings: Booking[]
): number {
  return allBookings
    .filter(
      (booking) =>
        booking.propertyId === propertyId &&
        booking.status !== 'cancelled'
    )
    .flatMap(getBookingOccupiedNights)
    .filter((night) => night.year === year && night.month === month)
    .reduce(
      (sum, night) => sum + night.allocatedRevenueCents,
      0
    );
}

export function calculateDailyTotalRevenue(
  dateStr: string,
  allBookings: Booking[]
): number {
  return allBookings
    .filter((booking) => booking.status !== 'cancelled')
    .flatMap(getBookingOccupiedNights)
    .filter((night) => night.dateStr === dateStr)
    .reduce(
      (sum, night) => sum + night.allocatedRevenueCents,
      0
    );
}

export interface CellBookingState {
  booking: Booking | null;
  isOccupied: boolean;
  isCheckIn: boolean;
  isCheckOut: boolean;
  nightIndex: number;
  totalNights: number;
}

export function getCellBookingState(
  propertyId: string,
  dateStr: string,
  allBookings: Booking[]
): CellBookingState {
  const activeBookings = allBookings.filter(
    (booking) =>
      booking.propertyId === propertyId &&
      booking.status !== 'cancelled'
  );

  // Occupied nights and same-day arrivals take precedence over a departing booking.
  for (const booking of activeBookings) {
    const nightMatch = getBookingOccupiedNights(booking).find(
      (night) => night.dateStr === dateStr
    );

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
  }

  for (const booking of activeBookings) {
    if (booking.checkOutDate !== dateStr) continue;
    const totalNights = calculateNights(
      booking.checkInDate,
      booking.checkOutDate
    );

    return {
      booking,
      isOccupied: false,
      isCheckIn: false,
      isCheckOut: true,
      nightIndex: totalNights,
      totalNights,
    };
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
