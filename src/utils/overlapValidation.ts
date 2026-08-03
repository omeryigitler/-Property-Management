import { Booking } from '../types';

export interface OverlapResult {
  hasOverlap: boolean;
  conflictingBooking: Booking | null;
  errorMessage: string | null;
}

/**
 * Checks whether a proposed booking [checkIn, checkOut) overlaps with any active booking in the same property.
 * Overlap formula: newCheckIn < existingCheckOut AND newCheckOut > existingCheckIn
 * Boundaries (e.g. existing 10-12, new 12-14) do NOT overlap because '2026-08-12' < '2026-08-12' is false.
 */
export function validateBookingOverlap(
  propertyId: string,
  checkInDate: string,
  checkOutDate: string,
  allBookings: Booking[],
  excludeBookingId?: string
): OverlapResult {
  if (!propertyId || !checkInDate || !checkOutDate) {
    return { hasOverlap: false, conflictingBooking: null, errorMessage: null };
  }

  const activeBookings = allBookings.filter(
    (b) => b.propertyId === propertyId && b.status !== 'cancelled' && b.id !== excludeBookingId
  );

  for (const existing of activeBookings) {
    const isOverlapping = checkInDate < existing.checkOutDate && checkOutDate > existing.checkInDate;
    if (isOverlapping) {
      return {
        hasOverlap: true,
        conflictingBooking: existing,
        errorMessage: '⚠️ This unit is already booked for these dates!',
      };
    }
  }

  return { hasOverlap: false, conflictingBooking: null, errorMessage: null };
}
