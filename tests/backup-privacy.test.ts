import test from 'node:test';
import assert from 'node:assert/strict';
import { Booking } from '../src/types';
import {
  ExportImportService,
  validateBackupJson,
} from '../src/services/exportImportService';
import {
  DEFAULT_TAX_CONFIG,
  DEFAULT_USER_PREFERENCES,
} from '../src/services/persistenceRepository';
import { DEFAULT_PROPERTIES, LOCATIONS } from '../src/config/locations';

function booking(): Booking {
  return {
    id: 'pii-booking',
    propertyId: '1-the-olive',
    guestName: 'Private Guest',
    channel: 'direct',
    checkInDate: '2026-08-01',
    checkOutDate: '2026-08-03',
    nightlyRateCents: 10_000,
    accommodationTotalCents: 19_999,
    adults: 2,
    children: 0,
    status: 'confirmed',
    discountCents: 0,
    cleaningFeeCents: 4_000,
    contactEmail: 'private@example.com',
    contactPhone: '+35600000000',
    notes: 'Private operational note',
    commissionMode: 'none',
    commissionPercentage: 0,
    commissionFixedAmountCents: 0,
    suggestedCommissionPercentage: 0,
    commissionOverrideEnabled: false,
    checkInTime: '15:00',
    checkOutTime: '10:00',
    timezone: 'Europe/Malta',
    earlyCheckIn: false,
    lateCheckOut: false,
    requiredTurnoverMinutes: 240,
    turnoverStatus: 'sufficient',
    source: 'manual',
    syncStatus: 'not_synced',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

function generate(includePii: boolean) {
  return ExportImportService.generateBackup(
    DEFAULT_TAX_CONFIG,
    LOCATIONS,
    DEFAULT_PROPERTIES,
    [booking()],
    [],
    [],
    DEFAULT_USER_PREFERENCES,
    [],
    includePii
  );
}

test('privacy-safe backup removes guest PII without mutating source records', () => {
  const source = booking();
  const backup = ExportImportService.generateBackup(
    DEFAULT_TAX_CONFIG,
    LOCATIONS,
    DEFAULT_PROPERTIES,
    [source],
    [],
    [],
    DEFAULT_USER_PREFERENCES,
    [],
    false
  );

  assert.equal(backup.containsPii, false);
  assert.notEqual(backup.bookings[0].guestName, source.guestName);
  assert.equal(backup.bookings[0].contactEmail, undefined);
  assert.equal(backup.bookings[0].contactPhone, undefined);
  assert.equal(backup.bookings[0].notes, undefined);
  assert.equal(backup.bookings[0].accommodationTotalCents, 19_999);
  assert.equal(source.guestName, 'Private Guest');
  assert.equal(source.contactEmail, 'private@example.com');
});

test('full backup preserves guest details and the location catalog', () => {
  const backup = generate(true);

  assert.equal(backup.containsPii, true);
  assert.equal(backup.locations?.length, LOCATIONS.length);
  assert.equal(backup.bookings[0].guestName, 'Private Guest');
  assert.equal(backup.bookings[0].contactEmail, 'private@example.com');
  assert.equal(backup.bookings[0].contactPhone, '+35600000000');
  assert.equal(backup.bookings[0].notes, 'Private operational note');
});

test('backup validation rejects properties linked to missing locations', () => {
  const backup = generate(true);
  backup.properties = [
    {
      id: 'invalid-property',
      name: 'INVALID PROPERTY',
      locationId: 'unknown-location',
      active: true,
    },
  ];
  backup.bookings = [];

  const validation = validateBackupJson(backup);

  assert.equal(validation.isValid, false);
  assert.match(validation.error ?? '', /location/i);
});

test('backup validation rejects unsupported tax rule values', () => {
  const backup = generate(false) as unknown as Record<string, unknown>;
  backup.taxConfiguration = {
    ...DEFAULT_TAX_CONFIG,
    incomeTaxBasis: 'unsupported-basis',
  };

  const validation = validateBackupJson(backup);

  assert.equal(validation.isValid, false);
  assert.match(validation.error ?? '', /tax configuration/i);
});
