import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_USER_PREFERENCES,
  PersistenceRepository,
} from '../src/services/persistenceRepository';

const STORAGE_KEY = 'short_let_dashboard_v1';

test('an explicitly saved empty dashboard remains empty after reload', () => {
  const values = new Map<string, string>();
  const previousDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage'
  );

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });

  try {
    values.set(
      STORAGE_KEY,
      JSON.stringify({
        version: CURRENT_SCHEMA_VERSION,
        selectedMonth: 8,
        selectedYear: 2026,
        bookings: [],
        expenses: [],
        extraIncomes: [],
        userPreferences: DEFAULT_USER_PREFERENCES,
        activityHistory: [],
      })
    );

    const loaded = PersistenceRepository.load();
    assert.deepEqual(loaded.bookings, []);
    assert.deepEqual(loaded.expenses, []);
    assert.deepEqual(loaded.extraIncomes, []);
    assert.equal(loaded.selectedMonth, 8);
    assert.equal(loaded.selectedYear, 2026);
  } finally {
    if (previousDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', previousDescriptor);
    } else {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  }
});
