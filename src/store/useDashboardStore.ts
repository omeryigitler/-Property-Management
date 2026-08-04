import { create } from 'zustand';
import {
  ActivityRecord,
  BackupData,
  Booking,
  Channel,
  Expense,
  ExtraIncome,
  MainViewMode,
  PersistedState,
  ToastMessage,
  UserPreferences,
} from '../types';
import {
  createDefaultExpenses,
  createSeedBookings,
  createSeedExtraIncome,
  CURRENT_SCHEMA_VERSION,
  DEFAULT_USER_PREFERENCES,
  normalizeBookingRecord,
  normalizePersistedState,
  PersistenceRepository,
} from '../services/persistenceRepository';
import { storageService } from '../services/storageService';
import { validateBookingOverlap } from '../utils/overlapValidation';
import { ParsedIcalEvent } from '../services/icalService';
import { usePropertyStore } from './usePropertyStore';

const LOCAL_REDACTED_GUEST_NAME = '[Encrypted guest data stored in IndexedDB]';

export type ModalType =
  | 'booking_add'
  | 'booking_edit'
  | 'settings'
  | 'history'
  | 'export_import'
  | 'mobile_property_finance'
  | 'ical_import'
  | 'privacy_retention'
  | null;

interface DashboardState {
  selectedMonth: number;
  selectedYear: number;
  mainViewMode: MainViewMode;
  bookings: Booking[];
  expenses: Expense[];
  extraIncomes: ExtraIncome[];
  userPreferences: UserPreferences;
  activityHistory: ActivityRecord[];
  toasts: ToastMessage[];
  hoveredCell: { propertyId: string; dateStr: string } | null;
  activeModal: ModalType;
  modalParams: Record<string, any>;
  confirmationModal: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  } | null;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  setMainViewMode: (mode: MainViewMode) => void;
  nextMonth: () => void;
  prevMonth: () => void;
  goToToday: () => void;
  addBooking: (
    booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>
  ) => { success: boolean; error?: string };
  updateBooking: (id: string, updates: Partial<Booking>) => { success: boolean; error?: string };
  deleteBooking: (id: string) => void;
  cancelBooking: (id: string) => void;
  duplicateBooking: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addExtraIncome: (
    income: Omit<ExtraIncome, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  updateExtraIncome: (id: string, updates: Partial<ExtraIncome>) => void;
  deleteExtraIncome: (id: string) => void;
  updateUserPreferences: (prefs: Partial<UserPreferences>) => void;
  anonymizeAllPII: () => Promise<void>;
  clearAllData: () => Promise<void>;
  importIcalEvents: (
    events: ParsedIcalEvent[],
    targetPropertyId: string,
    channel: Channel
  ) => void;
  setHoveredCell: (cell: { propertyId: string; dateStr: string } | null) => void;
  openModal: (type: ModalType, params?: Record<string, any>) => void;
  closeModal: () => void;
  openConfirmation: (config: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }) => void;
  closeConfirmation: () => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  addActivity: (action: ActivityRecord['action'], entity: string, description: string) => void;
  importBackupData: (backup: BackupData) => void;
  resetDefaultSeedData: () => void;
  _persist: () => void;
}

function createPersistedSnapshot(state: DashboardState): PersistedState {
  return {
    version: CURRENT_SCHEMA_VERSION,
    selectedMonth: state.selectedMonth,
    selectedYear: state.selectedYear,
    bookings: state.bookings,
    expenses: state.expenses,
    extraIncomes: state.extraIncomes,
    userPreferences: state.userPreferences,
    activityHistory: state.activityHistory,
  };
}

function redactLocalSnapshot(state: PersistedState): PersistedState {
  return {
    ...state,
    bookings: state.bookings.map((booking) => ({
      ...booking,
      guestName: LOCAL_REDACTED_GUEST_NAME,
    })),
  };
}

function containsRedactedGuests(bookings: Booking[]): boolean {
  return bookings.some((booking) => booking.guestName === LOCAL_REDACTED_GUEST_NAME);
}

const loadedState = PersistenceRepository.load();

export const useDashboardStore = create<DashboardState>((set, get) => ({
  selectedMonth: loadedState.selectedMonth,
  selectedYear: loadedState.selectedYear,
  mainViewMode: 'calendar',
  bookings: loadedState.bookings,
  expenses: loadedState.expenses,
  extraIncomes: loadedState.extraIncomes,
  userPreferences: { ...DEFAULT_USER_PREFERENCES, ...loadedState.userPreferences },
  activityHistory: loadedState.activityHistory,
  toasts: [],
  hoveredCell: null,
  activeModal: null,
  modalParams: {},
  confirmationModal: null,

  setSelectedMonth: (month) => {
    set({ selectedMonth: month });
    get()._persist();
  },
  setSelectedYear: (year) => {
    set({ selectedYear: year });
    get()._persist();
  },
  setMainViewMode: (mode) => set({ mainViewMode: mode }),
  nextMonth: () => {
    const { selectedMonth, selectedYear } = get();
    set(
      selectedMonth === 12
        ? { selectedMonth: 1, selectedYear: selectedYear + 1 }
        : { selectedMonth: selectedMonth + 1 }
    );
    get()._persist();
  },
  prevMonth: () => {
    const { selectedMonth, selectedYear } = get();
    set(
      selectedMonth === 1
        ? { selectedMonth: 12, selectedYear: selectedYear - 1 }
        : { selectedMonth: selectedMonth - 1 }
    );
    get()._persist();
  },
  goToToday: () => {
    const today = new Date();
    set({ selectedMonth: today.getMonth() + 1, selectedYear: today.getFullYear() });
    get()._persist();
  },

  addBooking: (bookingInput) => {
    const { bookings, addActivity, addToast } = get();
    const overlap = validateBookingOverlap(
      bookingInput.propertyId,
      bookingInput.checkInDate,
      bookingInput.checkOutDate,
      bookings
    );
    if (overlap.hasOverlap) {
      return { success: false, error: overlap.errorMessage || 'Overlapping booking detected' };
    }
    const now = new Date().toISOString();
    const newBooking = normalizeBookingRecord({
      ...bookingInput,
      id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    });
    if (!newBooking) return { success: false, error: 'Invalid reservation data.' };
    set({ bookings: [...bookings, newBooking] });
    get()._persist();
    addActivity(
      'booking_created',
      newBooking.guestName,
      `Created booking in property ${newBooking.propertyId} (${newBooking.checkInDate} to ${newBooking.checkOutDate})`
    );
    addToast({ type: 'success', title: 'Booking Created', message: `${newBooking.guestName} saved.` });
    return { success: true };
  },

  updateBooking: (id, updates) => {
    const { bookings, addActivity, addToast } = get();
    const existing = bookings.find((booking) => booking.id === id);
    if (!existing) return { success: false, error: 'Booking not found' };
    const propertyId = updates.propertyId ?? existing.propertyId;
    const checkInDate = updates.checkInDate ?? existing.checkInDate;
    const checkOutDate = updates.checkOutDate ?? existing.checkOutDate;
    if (updates.propertyId || updates.checkInDate || updates.checkOutDate) {
      const overlap = validateBookingOverlap(propertyId, checkInDate, checkOutDate, bookings, id);
      if (overlap.hasOverlap) {
        return { success: false, error: overlap.errorMessage || 'Overlapping booking detected' };
      }
    }
    const normalized = normalizeBookingRecord({
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    });
    if (!normalized) return { success: false, error: 'Invalid reservation data.' };
    set({ bookings: bookings.map((booking) => (booking.id === id ? normalized : booking)) });
    get()._persist();
    addActivity('booking_updated', normalized.guestName, `Updated booking for ${normalized.guestName}`);
    addToast({ type: 'success', title: 'Booking Updated', message: `${normalized.guestName} saved.` });
    return { success: true };
  },

  deleteBooking: (id) => {
    const { bookings, addActivity, addToast } = get();
    const existing = bookings.find((booking) => booking.id === id);
    if (!existing) return;
    set({ bookings: bookings.filter((booking) => booking.id !== id) });
    get()._persist();
    addActivity('booking_deleted', existing.guestName, `Deleted booking for ${existing.guestName}`);
    addToast({
      type: 'warning',
      title: 'Booking Deleted',
      message: `${existing.guestName} removed.`,
      undoAction: () => {
        set((state) => ({ bookings: [...state.bookings, existing] }));
        get()._persist();
      },
      duration: 6000,
    });
  },

  cancelBooking: (id) => {
    const existing = get().bookings.find((booking) => booking.id === id);
    if (!existing || existing.status === 'cancelled') return;
    get().updateBooking(id, { status: 'cancelled' });
    get().addActivity('booking_cancelled', existing.guestName, `Cancelled booking for ${existing.guestName}`);
  },

  duplicateBooking: (id) => {
    const existing = get().bookings.find((booking) => booking.id === id);
    if (!existing) return;
    const result = get().addBooking({
      propertyId: existing.propertyId,
      guestName: `${existing.guestName} (Copy)`,
      channel: existing.channel,
      checkInDate: existing.checkInDate,
      checkOutDate: existing.checkOutDate,
      nightlyRateCents: existing.nightlyRateCents,
      status: 'confirmed',
      externalUid: undefined,
    });
    if (!result.success) {
      get().addToast({ type: 'error', title: 'Cannot Duplicate', message: result.error });
    }
  },

  addExpense: (input) => {
    const now = new Date().toISOString();
    const expense: Expense = {
      ...input,
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ expenses: [...state.expenses, expense] }));
    get()._persist();
    get().addActivity('expense_saved', expense.label, `Added expense ${expense.label}`);
  },
  updateExpense: (id, updates) => {
    set((state) => ({
      expenses: state.expenses.map((item) =>
        item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
      ),
    }));
    get()._persist();
  },
  deleteExpense: (id) => {
    const existing = get().expenses.find((item) => item.id === id);
    if (!existing) return;
    set((state) => ({ expenses: state.expenses.filter((item) => item.id !== id) }));
    get()._persist();
    get().addActivity('expense_deleted', existing.label, `Deleted expense ${existing.label}`);
  },

  addExtraIncome: (input) => {
    const now = new Date().toISOString();
    const income: ExtraIncome = {
      ...input,
      id: `ext-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ extraIncomes: [...state.extraIncomes, income] }));
    get()._persist();
    get().addActivity('extra_income_saved', income.label, `Added extra income ${income.label}`);
  },
  updateExtraIncome: (id, updates) => {
    set((state) => ({
      extraIncomes: state.extraIncomes.map((item) =>
        item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
      ),
    }));
    get()._persist();
  },
  deleteExtraIncome: (id) => {
    const existing = get().extraIncomes.find((item) => item.id === id);
    if (!existing) return;
    set((state) => ({ extraIncomes: state.extraIncomes.filter((item) => item.id !== id) }));
    get()._persist();
    get().addActivity('extra_income_deleted', existing.label, `Deleted extra income ${existing.label}`);
  },

  updateUserPreferences: (prefs) => {
    set((state) => ({ userPreferences: { ...state.userPreferences, ...prefs } }));
    get()._persist();
  },

  anonymizeAllPII: async () => {
    const anonymized = await storageService.anonymizePII(get().bookings);
    set({ bookings: anonymized });
    get()._persist();
    get().addActivity('pii_anonymized', 'Privacy', 'Anonymized all guest names');
    get().addToast({ type: 'success', title: 'Guest Names Anonymized' });
  },

  clearAllData: async () => {
    await storageService.clearAll();
    usePropertyStore.getState().resetProperties();
    get().resetDefaultSeedData();
  },

  importIcalEvents: (events, targetPropertyId, channel) => {
    const now = new Date().toISOString();
    const currentBookings = [...get().bookings];
    let importedCount = 0;
    for (const event of events) {
      if (
        currentBookings.some(
          (booking) =>
            booking.externalUid === event.externalUid && booking.propertyId === targetPropertyId
        )
      ) {
        continue;
      }
      const normalized = normalizeBookingRecord({
        id: `b-ical-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        propertyId: targetPropertyId,
        guestName: event.summary || `${channel.toUpperCase()} Guest`,
        channel,
        checkInDate: event.startDateStr,
        checkOutDate: event.endDateStr,
        nightlyRateCents: 12000,
        status: 'confirmed',
        externalUid: event.externalUid,
        createdAt: now,
        updatedAt: now,
      });
      if (!normalized) continue;
      currentBookings.push(normalized);
      importedCount += 1;
    }
    set({ bookings: currentBookings });
    get()._persist();
    get().addActivity('ical_imported', 'iCal Sync', `Imported ${importedCount} reservation(s)`);
    get().addToast({
      type: importedCount > 0 ? 'success' : 'info',
      title: importedCount > 0 ? 'iCal Import Completed' : 'No New Reservations',
      message: importedCount > 0 ? `${importedCount} reservation(s) imported.` : undefined,
    });
  },

  setHoveredCell: (cell) => set({ hoveredCell: cell }),
  openModal: (type, params = {}) => set({ activeModal: type, modalParams: params }),
  closeModal: () => set({ activeModal: null, modalParams: {} }),
  openConfirmation: (config) =>
    set({
      confirmationModal: {
        isOpen: true,
        title: config.title,
        message: config.message,
        confirmText: config.confirmText || 'Confirm',
        cancelText: config.cancelText || 'Cancel',
        variant: config.variant || 'danger',
        onConfirm: config.onConfirm,
      },
    }),
  closeConfirmation: () => set({ confirmationModal: null }),
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => get().removeToast(id), toast.duration || 4500);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  addActivity: (action, entity, description) => {
    const record: ActivityRecord = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      action,
      entity,
      description,
    };
    set((state) => ({ activityHistory: [record, ...state.activityHistory].slice(0, 100) }));
    get()._persist();
  },

  importBackupData: (backup) => {
    const normalized = normalizePersistedState({
      ...backup,
      selectedMonth: get().selectedMonth,
      selectedYear: get().selectedYear,
    });
    set({
      bookings: normalized.bookings,
      expenses: normalized.expenses,
      extraIncomes: normalized.extraIncomes,
      userPreferences: normalized.userPreferences,
      activityHistory: normalized.activityHistory,
    });
    get()._persist();
    get().addActivity('backup_imported', 'Backup File', `Imported ${normalized.bookings.length} bookings`);
    get().addToast({ type: 'success', title: 'Data Imported' });
  },

  resetDefaultSeedData: () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    set({
      bookings: createSeedBookings(year, month),
      expenses: createDefaultExpenses(year, month),
      extraIncomes: createSeedExtraIncome(year, month),
      selectedMonth: month,
      selectedYear: year,
      userPreferences: { ...DEFAULT_USER_PREFERENCES },
      activityHistory: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'data_cleared',
          entity: 'System',
          description: 'Reset system to simplified seed data',
        },
      ],
    });
    get()._persist();
    get().addToast({ type: 'info', title: 'Reset Complete' });
  },

  _persist: () => {
    const snapshot = createPersistedSnapshot(get());
    PersistenceRepository.save(redactLocalSnapshot(snapshot));
    void storageService.saveState(snapshot);
  },
}));

const initialSnapshot = createPersistedSnapshot(useDashboardStore.getState());
if (containsRedactedGuests(initialSnapshot.bookings)) {
  void storageService
    .loadState()
    .then((state) => {
      if (!containsRedactedGuests(useDashboardStore.getState().bookings)) return;
      useDashboardStore.setState({
        selectedMonth: state.selectedMonth,
        selectedYear: state.selectedYear,
        bookings: state.bookings,
        expenses: state.expenses,
        extraIncomes: state.extraIncomes,
        userPreferences: state.userPreferences,
        activityHistory: state.activityHistory,
      });
    })
    .catch((error) => console.error('Encrypted dashboard hydration failed:', error));
} else {
  void storageService
    .saveState(initialSnapshot)
    .then(() => PersistenceRepository.save(redactLocalSnapshot(initialSnapshot)))
    .catch((error) => console.error('Dashboard migration failed:', error));
}
