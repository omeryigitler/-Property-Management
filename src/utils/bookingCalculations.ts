import { addDays } from 'date-fns';
import { Booking } from '../types';
import { calculateNights, toDateString, parseDateString } from './dateUtilities';

export interface OccupiedNightInfo {
  dateStr: string;
  year: number;
  month: number;
  nightIndex: number;
  totalNights: number;
  allocatedRevenueCents: number;
}

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

  for (let index = 0; index < totalNights; index += 1) {
    const dateStr = toDateString(currentDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const discountForThisNight = perNightDiscount + (index === 0 ? discountRemainder : 0);
    let nightRevenue = booking.nightlyRateCents - discountForThisNight;

    if (nightRevenue < 0) nightRevenue = 0;
    if (index === 0) nightRevenue += booking.cleaningFeeCents || 0;

    nights.push({
      dateStr,
      year,
      month,
      nightIndex: index + 1,
      totalNights,
      allocatedRevenueCents: nightRevenue,
    });

    currentDate = addDays(currentDate, 1);
  }

  return nights;
}

export function calculateMonthlyPropertyBookingRevenue(
  propertyId: string,
  year: number,
  month: number,
  allBookings: Booking[]
): number {
  const propertyBookings = allBookings.filter(
    (booking) => booking.propertyId === propertyId && booking.status !== 'cancelled'
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

export function calculateDailyTotalRevenue(dateStr: string, allBookings: Booking[]): number {
  let dailyTotalCents = 0;
  const activeBookings = allBookings.filter((booking) => booking.status !== 'cancelled');

  for (const booking of activeBookings) {
    const matchingNight = getBookingOccupiedNights(booking).find(
      (night) => night.dateStr === dateStr
    );
    if (matchingNight) dailyTotalCents += matchingNight.allocatedRevenueCents;
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

export function getCellBookingState(
  propertyId: string,
  dateStr: string,
  allBookings: Booking[]
): CellBookingState {
  const activeBookings = allBookings.filter(
    (booking) => booking.propertyId === propertyId && booking.status !== 'cancelled'
  );

  // Occupied nights and same-day arrivals take precedence over a departing booking.
  // This prevents a checkout from hiding a new check-in on turnover days.
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
    const totalNights = calculateNights(booking.checkInDate, booking.checkOutDate);

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
