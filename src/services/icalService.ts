import { Booking, Channel, SyncStatus, BookingSource } from '../types';

export interface ParsedIcalEvent {
  externalUid: string;
  summary: string;
  description?: string;
  startDateStr: string; // YYYY-MM-DD
  endDateStr: string; // YYYY-MM-DD
  status?: string;
}

export interface IcalImportPreviewItem {
  event: ParsedIcalEvent;
  targetPropertyId: string;
  channel: Channel;
  action: 'create' | 'update' | 'skip_duplicate' | 'conflict';
  existingBooking?: Booking;
  conflictReason?: string;
}

export interface IcalImportPreviewReport {
  totalParsed: number;
  newBookingsCount: number;
  duplicatesCount: number;
  conflictsCount: number;
  items: IcalImportPreviewItem[];
}

/**
 * Parses raw .ics string content into structured events.
 */
export function parseIcalContent(icsText: string): ParsedIcalEvent[] {
  const events: ParsedIcalEvent[] = [];
  const lines = icsText.split(/\r?\n/);

  let currentEvent: Partial<ParsedIcalEvent> | null = null;

  for (let line of lines) {
    line = line.trim();
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT') {
      if (currentEvent && currentEvent.externalUid && currentEvent.startDateStr && currentEvent.endDateStr) {
        events.push({
          externalUid: currentEvent.externalUid,
          summary: currentEvent.summary || 'Reserved',
          description: currentEvent.description,
          startDateStr: currentEvent.startDateStr,
          endDateStr: currentEvent.endDateStr,
          status: currentEvent.status,
        });
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (line.startsWith('UID:')) {
        currentEvent.externalUid = line.substring(4).trim();
      } else if (line.startsWith('SUMMARY:')) {
        currentEvent.summary = line.substring(8).trim();
      } else if (line.startsWith('DESCRIPTION:')) {
        currentEvent.description = line.substring(12).trim();
      } else if (line.startsWith('STATUS:')) {
        currentEvent.status = line.substring(7).trim();
      } else if (line.startsWith('DTSTART')) {
        const val = line.split(':')[1];
        if (val) currentEvent.startDateStr = parseIcalDate(val);
      } else if (line.startsWith('DTEND')) {
        const val = line.split(':')[1];
        if (val) currentEvent.endDateStr = parseIcalDate(val);
      }
    }
  }

  return events;
}

/**
 * Parses iCal date strings like "20260810", "20260810T150000Z" to "YYYY-MM-DD".
 */
function parseIcalDate(rawDateStr: string): string {
  const clean = rawDateStr.replace(/[^0-9]/g, '');
  if (clean.length >= 8) {
    const yyyy = clean.substring(0, 4);
    const mm = clean.substring(4, 6);
    const dd = clean.substring(6, 8);
    return `${yyyy}-${mm}-${dd}`;
  }
  return rawDateStr;
}

/**
 * Previews iCal import against existing bookings to detect duplicates and overlap conflicts.
 */
export function generateIcalImportPreview(
  parsedEvents: ParsedIcalEvent[],
  targetPropertyId: string,
  sourceChannel: Channel,
  existingBookings: Booking[]
): IcalImportPreviewReport {
  const items: IcalImportPreviewItem[] = [];
  let newCount = 0;
  let dupCount = 0;
  let conflictCount = 0;

  const propertyBookings = existingBookings.filter(
    (b) => b.propertyId === targetPropertyId && b.status !== 'cancelled'
  );

  for (const event of parsedEvents) {
    // Check compound key: source + externalUid + propertyId
    const sourceKey: BookingSource = sourceChannel === 'airbnb' ? 'airbnb_api' : sourceChannel === 'booking_com' ? 'booking_api' : 'ical';

    const duplicateMatch = propertyBookings.find(
      (b) => b.externalUid === event.externalUid && b.propertyId === targetPropertyId
    );

    if (duplicateMatch) {
      if (
        duplicateMatch.checkInDate === event.startDateStr &&
        duplicateMatch.checkOutDate === event.endDateStr
      ) {
        dupCount++;
        items.push({
          event,
          targetPropertyId,
          channel: sourceChannel,
          action: 'skip_duplicate',
          existingBooking: duplicateMatch,
        });
        continue;
      } else {
        // Date updated externally
        items.push({
          event,
          targetPropertyId,
          channel: sourceChannel,
          action: 'update',
          existingBooking: duplicateMatch,
        });
        continue;
      }
    }

    // Check for date overlap conflict with existing bookings
    // DTEND is exclusive! Event [startDateStr, endDateStr)
    const overlapConflict = propertyBookings.find((b) => {
      return (
        event.startDateStr < b.checkOutDate && event.endDateStr > b.checkInDate
      );
    });

    if (overlapConflict) {
      conflictCount++;
      items.push({
        event,
        targetPropertyId,
        channel: sourceChannel,
        action: 'conflict',
        existingBooking: overlapConflict,
        conflictReason: `Overlaps existing booking for ${overlapConflict.guestName} (${overlapConflict.checkInDate} → ${overlapConflict.checkOutDate})`,
      });
    } else {
      newCount++;
      items.push({
        event,
        targetPropertyId,
        channel: sourceChannel,
        action: 'create',
      });
    }
  }

  return {
    totalParsed: parsedEvents.length,
    newBookingsCount: newCount,
    duplicatesCount: dupCount,
    conflictsCount: conflictCount,
    items,
  };
}
