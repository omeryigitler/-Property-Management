import test from 'node:test';
import assert from 'node:assert/strict';
import { Booking } from '../src/types';
import { ExportImportService, validateBackupJson } from '../src/services/exportImportService';
import { DEFAULT_USER_PREFERENCES } from '../src/services/persistenceRepository';
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
    status: 'confirmed',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

function generate(includePii: boolean) {
  return ExportImportService.generateBackup(LOCATIONS, DEFAULT_PROPERTIES, [booking()], [], [], DEFAULT_USER_PREFERENCES, [], includePii);
}

test('privacy-safe backup anonymizes guest names without mutating source records', () => {
  const source = booking();
  const backup = ExportImportService.generateBackup(LOCATIONS, DEFAULT_PROPERTIES, [source], [], [], DEFAULT_USER_PREFERENCES, [], false);
  assert.equal(backup.containsPii, false);
  assert.notEqual(backup.bookings[0].guestName, source.guestName);
  assert.equal(source.guestName, 'Private Guest');
  assert.equal('taxConfiguration' in backup, false);
});

test('full backup preserves guest names and the location catalog', () => {
  const backup = generate(true);
  assert.equal(backup.containsPii, true);
  assert.equal(backup.locations?.length, LOCATIONS.length);
  assert.equal(backup.bookings[0].guestName, 'Private Guest');
});

test('backup validation rejects properties linked to missing locations', () => {
  const backup = generate(true);
  backup.properties = [{ id: 'invalid-property', name: 'INVALID PROPERTY', locationId: 'unknown-location', active: true }];
  backup.bookings = [];
  const validation = validateBackupJson(backup);
  assert.equal(validation.isValid, false);
  assert.match(validation.error ?? '', /location/i);
});

test('legacy tax and removed reservation fields are ignored during validation', () => {
  const backup = generate(true) as unknown as Record<string, unknown>;
  backup.taxConfiguration = { accommodationVatRate: 18, incomeTaxRate: 25 };
  backup.bookings = [{ ...booking(), adults: 4, children: 2, cleaningFeeCents: 5000, commissionPercentage: 15 }];
  const validation = validateBackupJson(backup);
  assert.equal(validation.isValid, true);
  assert.ok(validation.data);
  assert.equal('taxConfiguration' in validation.data, false);
  assert.equal('adults' in validation.data.bookings[0], false);
  assert.equal('commissionPercentage' in validation.data.bookings[0], false);
});
