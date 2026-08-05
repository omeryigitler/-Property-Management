import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedBookings } from '../src/services/persistenceRepository';
import { repairUnreadableGuestNames } from '../src/services/storageService';
import {
  getGuestDisplayName,
  isUnreadableGuestName,
} from '../src/utils/guestNames';

test('technical encrypted guest placeholders are never shown to the UI', () => {
  assert.equal(isUnreadableGuestName('[ENCRYPTED_PII_UNREADABLE]'), true);
  assert.equal(
    isUnreadableGuestName('[Encrypted guest data stored in IndexedDB]'),
    true
  );
  assert.equal(getGuestDisplayName('[ENCRYPTED_PII_UNREADABLE]'), 'Guest');
  assert.equal(getGuestDisplayName('Alex Morgan'), 'Alex Morgan');
});

test('unreadable seed bookings recover their original demo names', () => {
  const seed = createSeedBookings(2026, 8)[0];
  const result = repairUnreadableGuestNames(
    [{ ...seed, guestName: '[ENCRYPTED_PII_UNREADABLE]' }],
    2026,
    8
  );

  assert.equal(result.repaired, true);
  assert.equal(result.bookings[0].guestName, seed.guestName);
});

test('unrecoverable custom bookings receive a readable stable fallback', () => {
  const seed = createSeedBookings(2026, 8)[0];
  const result = repairUnreadableGuestNames(
    [
      {
        ...seed,
        id: 'custom-booking',
        guestName: '[ENCRYPTED_PII_UNREADABLE]',
      },
    ],
    2026,
    8
  );

  assert.equal(result.repaired, true);
  assert.equal(result.bookings[0].guestName, 'Guest 1');
});
