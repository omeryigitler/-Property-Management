import { PersistedState, Booking } from '../types';
import { encryptionService } from './encryptionService';
import {
  DEFAULT_TAX_CONFIG,
  DEFAULT_USER_PREFERENCES,
  createDefaultExpenses,
  createSeedBookings,
  createSeedExtraIncome,
} from './persistenceRepository';

const DB_NAME = 'ShortLetHQ_DB';
const DB_VERSION = 1;
const STORE_NAME = 'dashboard_state';
const STATE_KEY = 'current_state';
const FALLBACK_STORAGE_KEY = 'short_let_fallback_state';
const DASHBOARD_STORAGE_KEY = 'short_let_dashboard_v1';
const CRYPTO_STORAGE_KEY = 'short_let_crypto_key_v1';
const REDACTED_GUEST_NAME = '[Encrypted guest data unavailable]';

function createPrivateFallbackState(state: PersistedState): PersistedState {
  return {
    ...state,
    bookings: state.bookings.map((booking) => ({
      ...booking,
      guestName: REDACTED_GUEST_NAME,
      contactEmail: undefined,
      contactPhone: undefined,
      address: undefined,
      identificationDetails: undefined,
      notes: undefined,
    })),
  };
}

function normalizePersistedState(state: PersistedState): PersistedState {
  return {
    ...state,
    taxConfiguration: {
      ...DEFAULT_TAX_CONFIG,
      ...state.taxConfiguration,
    },
    userPreferences: {
      ...DEFAULT_USER_PREFERENCES,
      ...state.userPreferences,
    },
    bookings: Array.isArray(state.bookings) ? state.bookings : [],
    expenses: Array.isArray(state.expenses) ? state.expenses : [],
    extraIncomes: Array.isArray(state.extraIncomes) ? state.extraIncomes : [],
    activityHistory: Array.isArray(state.activityHistory) ? state.activityHistory : [],
  };
}

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB open request was blocked.'));
    });

    return this.dbPromise;
  }

  public async saveState(state: PersistedState): Promise<void> {
    try {
      const db = await this.getDB();
      const encryptedBookings: Booking[] = await Promise.all(
        state.bookings.map(async (booking) => ({
          ...booking,
          guestName: await encryptionService.encrypt(booking.guestName),
          contactEmail: booking.contactEmail
            ? await encryptionService.encrypt(booking.contactEmail)
            : undefined,
          contactPhone: booking.contactPhone
            ? await encryptionService.encrypt(booking.contactPhone)
            : undefined,
          address: booking.address
            ? await encryptionService.encrypt(booking.address)
            : undefined,
          identificationDetails: booking.identificationDetails
            ? await encryptionService.encrypt(booking.identificationDetails)
            : undefined,
          notes: booking.notes ? await encryptionService.encrypt(booking.notes) : undefined,
        }))
      );

      const stateToSave: PersistedState = {
        ...state,
        bookings: encryptedBookings,
      };

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
        transaction.objectStore(STORE_NAME).put(stateToSave, STATE_KEY);
      });

      localStorage.removeItem(FALLBACK_STORAGE_KEY);
    } catch (error) {
      console.error('IndexedDB save failed; storing a PII-redacted fallback:', error);
      localStorage.setItem(
        FALLBACK_STORAGE_KEY,
        JSON.stringify(createPrivateFallbackState(state))
      );
    }
  }

  public async loadState(): Promise<PersistedState> {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    try {
      const db = await this.getDB();
      const rawState = await new Promise<PersistedState | null>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).get(STATE_KEY);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });

      if (rawState?.bookings) {
        const decryptedBookings: Booking[] = await Promise.all(
          rawState.bookings.map(async (booking) => ({
            ...booking,
            guestName: await encryptionService.decrypt(booking.guestName),
            contactEmail: booking.contactEmail
              ? await encryptionService.decrypt(booking.contactEmail)
              : undefined,
            contactPhone: booking.contactPhone
              ? await encryptionService.decrypt(booking.contactPhone)
              : undefined,
            address: booking.address
              ? await encryptionService.decrypt(booking.address)
              : undefined,
            identificationDetails: booking.identificationDetails
              ? await encryptionService.decrypt(booking.identificationDetails)
              : undefined,
            notes: booking.notes
              ? await encryptionService.decrypt(booking.notes)
              : undefined,
          }))
        );

        return normalizePersistedState({
          ...rawState,
          bookings: decryptedBookings,
        });
      }
    } catch (error) {
      console.warn('Failed to load state from IndexedDB:', error);
    }

    try {
      const fallback = localStorage.getItem(FALLBACK_STORAGE_KEY);
      if (fallback) {
        return normalizePersistedState(JSON.parse(fallback) as PersistedState);
      }
    } catch (error) {
      console.warn('Failed to load the local fallback state:', error);
      localStorage.removeItem(FALLBACK_STORAGE_KEY);
    }

    const initialState: PersistedState = {
      version: 1,
      taxConfiguration: { ...DEFAULT_TAX_CONFIG },
      bookings: createSeedBookings(currentYear, currentMonth),
      expenses: createDefaultExpenses(currentYear, currentMonth),
      extraIncomes: createSeedExtraIncome(currentYear, currentMonth),
      selectedMonth: currentMonth,
      selectedYear: currentYear,
      userPreferences: { ...DEFAULT_USER_PREFERENCES },
      activityHistory: [
        {
          id: 'act-init',
          timestamp: new Date().toISOString(),
          action: 'tax_config_updated',
          entity: 'System',
          description: 'Initial system seed state loaded',
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
      contactEmail: undefined,
      contactPhone: undefined,
      address: undefined,
      identificationDetails: undefined,
      notes: undefined,
    }));
  }

  public async clearAll(): Promise<void> {
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
