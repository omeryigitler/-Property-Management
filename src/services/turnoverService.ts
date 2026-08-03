import { Booking, TurnoverStatus, TurnoverTask, CleaningStatus } from '../types';
import { ALL_PROPERTIES } from '../config/locations';

export interface TurnoverCalculationResult {
  departingBooking: Booking | null;
  incomingBooking: Booking | null;
  availableMinutes: number;
  requiredMinutes: number;
  status: TurnoverStatus;
  message: string;
}

/**
 * Calculates same-day turnover time and status between a departing booking and incoming booking.
 */
export function calculateSameDayTurnover(
  departingBooking: Booking | null,
  incomingBooking: Booking | null,
  propertyRequiredTurnoverMinutes: number = 240
): TurnoverCalculationResult {
  if (!departingBooking || !incomingBooking) {
    return {
      departingBooking,
      incomingBooking,
      availableMinutes: 1440,
      requiredMinutes: propertyRequiredTurnoverMinutes,
      status: 'not_applicable',
      message: 'No same-day turnover',
    };
  }

  const [outH, outM] = (departingBooking.checkOutTime || '10:00').split(':').map(Number);
  const [inH, inM] = (incomingBooking.checkInTime || '15:00').split(':').map(Number);

  const outTotalMin = outH * 60 + outM;
  const inTotalMin = inH * 60 + inM;

  const availableMinutes = inTotalMin - outTotalMin;
  const requiredMinutes =
    incomingBooking.requiredTurnoverMinutes ||
    departingBooking.requiredTurnoverMinutes ||
    propertyRequiredTurnoverMinutes;

  let status: TurnoverStatus = 'sufficient';
  let message = `Available: ${Math.floor(availableMinutes / 60)}h ${availableMinutes % 60}m (Required: ${Math.floor(requiredMinutes / 60)}h ${requiredMinutes % 60}m)`;

  if (availableMinutes <= 0) {
    status = 'insufficient';
    message = `INSUFFICIENT TURNOVER: Check-in (${incomingBooking.checkInTime}) is before or at check-out (${departingBooking.checkOutTime})`;
  } else if (availableMinutes < requiredMinutes) {
    status = 'tight';
    message = `TIGHT TURNOVER: ${availableMinutes} mins available vs ${requiredMinutes} mins required`;
  }

  return {
    departingBooking,
    incomingBooking,
    availableMinutes,
    requiredMinutes,
    status,
    message,
  };
}

/**
 * Generates turnover tasks for a specific date across all properties.
 */
export function generateTurnoverTasksForDate(
  dateStr: string,
  bookings: Booking[],
  existingTasks: TurnoverTask[] = []
): TurnoverTask[] {
  const activeBookings = bookings.filter((b) => b.status !== 'cancelled');
  const resultTasks: TurnoverTask[] = [];

  for (const property of ALL_PROPERTIES) {
    const departing = activeBookings.find(
      (b) => b.propertyId === property.id && b.checkOutDate === dateStr
    );
    const incoming = activeBookings.find(
      (b) => b.propertyId === property.id && b.checkInDate === dateStr
    );

    if (departing || incoming) {
      const existing = existingTasks.find(
        (t) => t.propertyId === property.id && t.date === dateStr
      );

      const turnoverCalc = calculateSameDayTurnover(departing || null, incoming || null);

      resultTasks.push({
        id: existing?.id || `turnover-${property.id}-${dateStr}`,
        propertyId: property.id,
        date: dateStr,
        departingBookingId: departing?.id,
        incomingBookingId: incoming?.id,
        checkOutTime: departing?.checkOutTime || '10:00',
        checkInTime: incoming?.checkInTime || '15:00',
        availableMinutes: turnoverCalc.availableMinutes,
        requiredMinutes: turnoverCalc.requiredMinutes,
        status: existing?.status || 'scheduled',
        assignedCleaner: existing?.assignedCleaner || 'Team Alpha',
        notes: existing?.notes || turnoverCalc.message,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return resultTasks;
}
