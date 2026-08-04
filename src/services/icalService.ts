import { Booking, Channel } from '../types';

export interface ParsedIcalEvent {
  externalUid: string;
  summary: string;
  description?: string;
  startDateStr: string;
  endDateStr: string;
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

export function parseIcalContent(icsText: string): ParsedIcalEvent[] {
  const events: ParsedIcalEvent[] = [];
  const lines = icsText.split(/\r?\n/);
  let currentEvent: Partial<ParsedIcalEvent> | null = null;

  for (let line of lines) {
    line = line.trim();

    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
      continue;
    }

    if (line === 'END:VEVENT') {
      if (
        currentEvent?.externalUid &&
        currentEvent.startDateStr &&
        currentEvent.endDateStr
      ) {
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
      continue;
    }

    if (!currentEvent) continue;

    if (line.startsWith('UID:')) {
      currentEvent.externalUid = line.substring(4).trim();
    } else if (line.startsWith('SUMMARY:')) {
      currentEvent.summary = line.substring(8).trim();
    } else if (line.startsWith('DESCRIPTION:')) {
      currentEvent.description = line.substring(12).trim();
    } else if (line.startsWith('STATUS:')) {
      currentEvent.status = line.substring(7).trim();
    } else if (line.startsWith('DTSTART')) {
      const value = line.split(':')[1];
      if (value) currentEvent.startDateStr = parseIcalDate(value);
    } else if (line.startsWith('DTEND')) {
      const value = line.split(':')[1];
      if (value) currentEvent.endDateStr = parseIcalDate(value);
    }
  }

  return events;
}

function parseIcalDate(rawDateStr: string): string {
  const clean = rawDateStr.replace(/[^0-9]/g, '');
  if (clean.length < 8) return rawDateStr;
  return `${clean.substring(0, 4)}-${clean.substring(4, 6)}-${clean.substring(6, 8)}`;
}

export function generateIcalImportPreview(
  parsedEvents: ParsedIcalEvent[],
  targetPropertyId: string,
  sourceChannel: Channel,
  existingBookings: Booking[]
): IcalImportPreviewReport {
  const items: IcalImportPreviewItem[] = [];
  let newBookingsCount = 0;
  let duplicatesCount = 0;
  let conflictsCount = 0;

  const propertyBookings = existingBookings.filter(
    (booking) =>
      booking.propertyId === targetPropertyId && booking.status !== 'cancelled'
  );

  for (const event of parsedEvents) {
    const duplicate = propertyBookings.find(
      (booking) => booking.externalUid === event.externalUid
    );

    if (duplicate) {
      const unchanged =
        duplicate.checkInDate === event.startDateStr &&
        duplicate.checkOutDate === event.endDateStr;

      if (unchanged) duplicatesCount += 1;

      items.push({
        event,
        targetPropertyId,
        channel: sourceChannel,
        action: unchanged ? 'skip_duplicate' : 'update',
        existingBooking: duplicate,
      });
      continue;
    }

    const overlap = propertyBookings.find(
      (booking) =>
        event.startDateStr < booking.checkOutDate &&
        event.endDateStr > booking.checkInDate
    );

    if (overlap) {
      conflictsCount += 1;
      items.push({
        event,
        targetPropertyId,
        channel: sourceChannel,
        action: 'conflict',
        existingBooking: overlap,
        conflictReason: `Overlaps existing booking for ${overlap.guestName} (${overlap.checkInDate} → ${overlap.checkOutDate})`,
      });
      continue;
    }

    newBookingsCount += 1;
    items.push({
      event,
      targetPropertyId,
      channel: sourceChannel,
      action: 'create',
    });
  }

  return {
    totalParsed: parsedEvents.length,
    newBookingsCount,
    duplicatesCount,
    conflictsCount,
    items,
  };
}
