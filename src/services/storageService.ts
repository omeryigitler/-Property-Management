import { PersistedState, Booking, Expense, ExtraIncome, TaxConfiguration, UserPreferences, ActivityRecord, TurnoverTask } from '../types';
import { encryptionService } from './encryptionService';
import { DEFAULT_TAX_CONFIG, DEFAULT_USER_PREFERENCES, createDefaultExpenses, createSeedBookings, createSeedExtraIncome } from './persistenceRepository';

const DB_NAME = 'ShortLetHQ_DB';
const DB_VERSION = 1;
const STORE_NAME = 'dashboard_state';
const STATE_KEY = 'current_state';

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
    });

    return this.dbPromise;
  }

  /**
   * Encrypts guest PII fields before persisting state to IndexedDB.
   */
  public async saveState(state: PersistedState): Promise<void> {
    try {
      const db = await this.getDB();
      
      // Encrypt PII fields in bookings
      const encryptedBookings: Booking[] = await Promise.all(
        state.bookings.map(async (b) => ({
          ...b,
          guestName: await encryptionService.encrypt(b.guestName),
          contactEmail: b.contactEmail ? await encryptionService.encrypt(b.contactEmail) : undefined,
          contactPhone: b.contactPhone ? await encryptionService.encrypt(b.contactPhone) : undefined,
          address: b.address ? await encryptionService.encrypt(b.address) : undefined,
          identificationDetails: b.identificationDetails ? await encryptionService.encrypt(b.identificationDetails) : undefined,
          notes: b.notes ? await encryptionService.encrypt(b.notes) : undefined,
        }))
      );

      const stateToSave = {
        ...state,
        bookings: encryptedBookings,
      };

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(stateToSave, STATE_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error('IndexedDB save failed, falling back:', e);
      // Fallback save to localStorage
      localStorage.setItem('short_let_fallback_state', JSON.stringify(state));
    }
  }

  /**
   * Loads state from IndexedDB and decrypts guest PII.
   */
  public async loadState(): Promise<PersistedState> {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    try {
      const db = await this.getDB();
      const rawState = await new Promise<PersistedState | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(STATE_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });

      if (rawState && rawState.bookings) {
        // Decrypt guest PII fields
        const decryptedBookings: Booking[] = await Promise.all(
          rawState.bookings.map(async (b) => ({
            ...b,
            guestName: await encryptionService.decrypt(b.guestName),
            contactEmail: b.contactEmail ? await encryptionService.decrypt(b.contactEmail) : undefined,
            contactPhone: b.contactPhone ? await encryptionService.decrypt(b.contactPhone) : undefined,
            address: b.address ? await encryptionService.decrypt(b.address) : undefined,
            identificationDetails: b.identificationDetails ? await encryptionService.decrypt(b.identificationDetails) : undefined,
            notes: b.notes ? await encryptionService.decrypt(b.notes) : undefined,
          }))
        );

        return {
          ...rawState,
          bookings: decryptedBookings,
          taxConfiguration: {
            ...DEFAULT_TAX_CONFIG,
            ...rawState.taxConfiguration,
          },
          userPreferences: {
            ...DEFAULT_USER_PREFERENCES,
            ...rawState.userPreferences,
          },
        };
      }
    } catch (e) {
      console.warn('Failed to load state from IndexedDB:', e);
    }

    // Seed state if nothing in IndexedDB
    const seedExpenses = createDefaultExpenses(currentYear, currentMonth);
    const seedBookings = createSeedBookings(currentYear, currentMonth);
    const seedExtraIncome = createSeedExtraIncome(currentYear, currentMonth);

    const initialState: PersistedState = {
      version: 1,
      taxConfiguration: DEFAULT_TAX_CONFIG,
      bookings: seedBookings,
      expenses: seedExpenses,
      extraIncomes: seedExtraIncome,
      selectedMonth: currentMonth,
      selectedYear: currentYear,
      userPreferences: DEFAULT_USER_PREFERENCES,
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

  /**
   * Anonymizes all guest PII while preserving financial numbers and bookings.
   */
  public async anonymizePII(currentBookings: Booking[]): Promise<Booking[]> {
    return currentBookings.map((b, idx) => ({
      ...b,
      guestName: `Guest ${String.fromCharCode(65 + (idx % 26))}${idx + 1}`,
      contactEmail: undefined,
      contactPhone: undefined,
      address: undefined,
      identificationDetails: undefined,
      notes: undefined,
    }));
  }

  /**
   * Clears IndexedDB completely.
   */
  public async clearAll(): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      localStorage.clear();
    } catch (e) {
      console.error('Failed to clear IndexedDB:', e);
    }
  }
}

export const storageService = new StorageService();
