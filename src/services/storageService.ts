import { Booking, PersistedState } from '../types';
import { encryptionService } from './encryptionService';
import {
  createDefaultExpenses,
  createSeedBookings,
  createSeedExtraIncome,
  CURRENT_SCHEMA_VERSION,
  DEFAULT_USER_PREFERENCES,
  normalizePersistedState,
} from './persistenceRepository';

const DB_NAME = 'ShortLetHQ_DB';
const DB_VERSION = 2;
const STORE_NAME = 'dashboard_state';
const STATE_KEY = 'current_state';
const FALLBACK_STORAGE_KEY = 'short_let_fallback_state';
const DASHBOARD_STORAGE_KEY = 'short_let_dashboard_v1';
const CRYPTO_STORAGE_KEY = 'short_let_crypto_key_v1';
const REDACTED_GUEST_NAME = '[Encrypted guest data unavailable]';

function cloneState(state: PersistedState): PersistedState {
  return JSON.parse(JSON.stringify(state)) as PersistedState;
}

function createPrivateFallbackState(state: PersistedState): PersistedState {
  return {
    ...state,
    bookings: state.bookings.map((booking) => ({
      ...booking,
      guestName: REDACTED_GUEST_NAME,
    })),
  };
}

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private saveQueue: Promise<void> = Promise.resolve();

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB open request was blocked.'));
    });
    return this.dbPromise;
  }

  private async writeState(state: PersistedState): Promise<void> {
    try {
      const db = await this.getDB();
      const encryptedBookings: Booking[] = await Promise.all(
        state.bookings.map(async (booking) => ({
          ...booking,
          guestName: await encryptionService.encrypt(booking.guestName),
        }))
      );
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
        transaction.objectStore(STORE_NAME).put({ ...state, bookings: encryptedBookings }, STATE_KEY);
      });
      localStorage.removeItem(FALLBACK_STORAGE_KEY);
    } catch (error) {
      console.error('IndexedDB save failed; storing an anonymized fallback:', error);
      localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(createPrivateFallbackState(state)));
    }
  }

  public saveState(state: PersistedState): Promise<void> {
    const snapshot = cloneState(normalizePersistedState(state));
    this.saveQueue = this.saveQueue.catch(() => undefined).then(() => this.writeState(snapshot));
    return this.saveQueue;
  }

  public async loadState(): Promise<PersistedState> {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    await this.saveQueue.catch(() => undefined);

    try {
      const db = await this.getDB();
      const rawState = await new Promise<unknown>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).get(STATE_KEY);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      });
      const normalized = normalizePersistedState(rawState, year, month);
      if (normalized.bookings.length > 0) {
        normalized.bookings = await Promise.all(
          normalized.bookings.map(async (booking) => ({
            ...booking,
            guestName: await encryptionService.decrypt(booking.guestName),
          }))
        );
        return normalized;
      }
    } catch (error) {
      console.warn('Failed to load state from IndexedDB:', error);
    }

    for (const storageKey of [FALLBACK_STORAGE_KEY, DASHBOARD_STORAGE_KEY]) {
      try {
        const fallback = localStorage.getItem(storageKey);
        if (fallback) return normalizePersistedState(JSON.parse(fallback), year, month);
      } catch (error) {
        console.warn(`Failed to load local state from ${storageKey}:`, error);
        localStorage.removeItem(storageKey);
      }
    }

    const initialState: PersistedState = {
      version: CURRENT_SCHEMA_VERSION,
      bookings: createSeedBookings(year, month),
      expenses: createDefaultExpenses(year, month),
      extraIncomes: createSeedExtraIncome(year, month),
      selectedMonth: month,
      selectedYear: year,
      userPreferences: { ...DEFAULT_USER_PREFERENCES },
      activityHistory: [
        {
          id: 'act-init',
          timestamp: new Date().toISOString(),
          action: 'data_cleared',
          entity: 'System',
          description: 'Initial simplified data loaded',
        },
      ],
    };
    await this.saveState(initialState);
    return initialState;
  }

  public async anonymizePII(currentBookings: Booking[]): Promise<Booking[]> {
    return currentBookings.map((booking, index) => ({
      ...booking,
      guestName: `Guest ${String.fromCharCode(65 + (index % 26))}${index + 1}`,
    }));
  }

  public async clearAll(): Promise<void> {
    await this.saveQueue.catch(() => undefined);
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
        transaction.objectStore(STORE_NAME).clear();
      });
    } catch (error) {
      console.error('Failed to clear IndexedDB:', error);
    }
    localStorage.removeItem(DASHBOARD_STORAGE_KEY);
    localStorage.removeItem(FALLBACK_STORAGE_KEY);
    localStorage.removeItem(CRYPTO_STORAGE_KEY);
  }
}

export const storageService = new StorageService();
