import { create } from 'zustand';
import {
  Booking,
  Expense,
  ExtraIncome,
  TaxConfiguration,
  UserPreferences,
  ActivityRecord,
  ToastMessage,
  BackupData,
  MainViewMode,
  TurnoverTask,
  Channel,
} from '../types';
import { PersistenceRepository, DEFAULT_TAX_CONFIG, DEFAULT_USER_PREFERENCES, createDefaultExpenses, createSeedBookings, createSeedExtraIncome } from '../services/persistenceRepository';
import { storageService } from '../services/storageService';
import { validateBookingOverlap } from '../utils/overlapValidation';
import { generateTurnoverTasksForDate } from '../services/turnoverService';
import { ParsedIcalEvent } from '../services/icalService';
import { DEFAULT_CHANNEL_COMMISSIONS } from '../services/financialCalculationService';

export type ModalType =
  | 'booking_add'
  | 'booking_edit'
  | 'tax_config'
  | 'settings'
  | 'history'
  | 'export_import'
  | 'calc_details'
  | 'mobile_property_finance'
  | 'ical_import'
  | 'privacy_retention'
  | null;

interface DashboardState {
  // Navigation & Main Views
  selectedMonth: number;
  selectedYear: number;
  mainViewMode: MainViewMode;

  // Domain Data
  taxConfiguration: TaxConfiguration;
  bookings: Booking[];
  expenses: Expense[];
  extraIncomes: ExtraIncome[];
  turnoverTasks: TurnoverTask[];
  userPreferences: UserPreferences;
  activityHistory: ActivityRecord[];

  // UI States
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

  // Navigation Actions
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  setMainViewMode: (mode: MainViewMode) => void;
  nextMonth: () => void;
  prevMonth: () => void;
  goToToday: () => void;

  // Booking Actions
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; error?: string };
  updateBooking: (id: string, updates: Partial<Booking>) => { success: boolean; error?: string };
  deleteBooking: (id: string) => void;
  cancelBooking: (id: string) => void;
  duplicateBooking: (id: string) => void;

  // Expense Actions
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  // Extra Income Actions
  addExtraIncome: (extraIncome: Omit<ExtraIncome, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateExtraIncome: (id: string, updates: Partial<ExtraIncome>) => void;
  deleteExtraIncome: (id: string) => void;

  // Turnover Tasks
  updateTurnoverTask: (id: string, updates: Partial<TurnoverTask>) => void;

  // Tax Actions
  updateTaxConfig: (config: Partial<TaxConfiguration>) => void;

  // Preferences & Privacy Actions
  updateUserPreferences: (prefs: Partial<UserPreferences>) => void;
  anonymizeAllPII: () => Promise<void>;
  clearAllData: () => Promise<void>;

  // iCal Import
  importIcalEvents: (events: ParsedIcalEvent[], targetPropertyId: string, channel: Channel) => void;

  // UI Actions
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

  // Toasts
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  // Audit
  addActivity: (action: ActivityRecord['action'], entity: string, description: string) => void;

  // Backup & Reset
  importBackupData: (backup: BackupData) => void;
  resetDefaultSeedData: () => void;

  // Private Persistence Helper
  _persist: () => void;
}

// Initial load from persistence
const loadedState = PersistenceRepository.load();

export const useDashboardStore = create<DashboardState>((set, get) => ({
  selectedMonth: loadedState.selectedMonth,
  selectedYear: loadedState.selectedYear,
  mainViewMode: 'calendar',

  taxConfiguration: {
    ...DEFAULT_TAX_CONFIG,
    vatBasis: 'gross',
    commissionBasis: 'accommodation_only',
    fixedCommissionAllocationRule: 'check_in_date',
    defaultCheckInTime: '15:00',
    defaultCheckOutTime: '10:00',
    defaultTurnoverMinutes: 240,
    insufficientTurnoverAction: 'warning_allow',
    ...loadedState.taxConfiguration,
  },
  bookings: loadedState.bookings.map((b) => ({
    commissionMode: 'percentage',
    commissionPercentage: DEFAULT_CHANNEL_COMMISSIONS[b.channel]?.percentage || 15,
    commissionFixedAmountCents: 0,
    suggestedCommissionPercentage: DEFAULT_CHANNEL_COMMISSIONS[b.channel]?.percentage || 15,
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
    ...b,
  })),
  expenses: loadedState.expenses,
  extraIncomes: loadedState.extraIncomes,
  turnoverTasks: [],
  userPreferences: {
    privacyMode: false,
    dataRetentionMonths: 24,
    ...DEFAULT_USER_PREFERENCES,
    ...loadedState.userPreferences,
  },
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
    if (selectedMonth === 12) {
      set({ selectedMonth: 1, selectedYear: selectedYear + 1 });
    } else {
      set({ selectedMonth: selectedMonth + 1 });
    }
    get()._persist();
  },

  prevMonth: () => {
    const { selectedMonth, selectedYear } = get();
    if (selectedMonth === 1) {
      set({ selectedMonth: 12, selectedYear: selectedYear - 1 });
    } else {
      set({ selectedMonth: selectedMonth - 1 });
    }
    get()._persist();
  },

  goToToday: () => {
    const today = new Date();
    set({ selectedMonth: today.getMonth() + 1, selectedYear: today.getFullYear() });
    get()._persist();
  },

  // BOOKINGS
  addBooking: (bookingInput) => {
    const { bookings, addActivity, addToast } = get();

    // Check overlap
    const overlap = validateBookingOverlap(
      bookingInput.propertyId,
      bookingInput.checkInDate,
      bookingInput.checkOutDate,
      bookings
    );

    if (overlap.hasOverlap) {
      return { success: false, error: overlap.errorMessage || '⚠️ Overlapping booking detected' };
    }

    const now = new Date().toISOString();
    const newBooking: Booking = {
      ...bookingInput,
      id: `b-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: now,
      updatedAt: now,
    };

    const newBookings = [...bookings, newBooking];
    set({ bookings: newBookings });
    get()._persist();

    addActivity('booking_created', newBooking.guestName, `Created booking in property ${newBooking.propertyId} (${newBooking.checkInDate} to ${newBooking.checkOutDate})`);
    addToast({
      type: 'success',
      title: 'Booking Created',
      message: `Reservation for ${newBooking.guestName} saved successfully.`,
    });

    return { success: true };
  },

  updateBooking: (id, updates) => {
    const { bookings, addActivity, addToast } = get();
    const existing = bookings.find((b) => b.id === id);
    if (!existing) return { success: false, error: 'Booking not found' };

    const targetPropertyId = updates.propertyId || existing.propertyId;
    const targetCheckIn = updates.checkInDate || existing.checkInDate;
    const targetCheckOut = updates.checkOutDate || existing.checkOutDate;

    // Validate overlap if dates or property changed
    if (updates.propertyId || updates.checkInDate || updates.checkOutDate) {
      const overlap = validateBookingOverlap(
        targetPropertyId,
        targetCheckIn,
        targetCheckOut,
        bookings,
        id
      );
      if (overlap.hasOverlap) {
        return { success: false, error: overlap.errorMessage || '⚠️ Overlapping booking detected' };
      }
    }

    const now = new Date().toISOString();
    const updatedBookings = bookings.map((b) =>
      b.id === id ? { ...b, ...updates, updatedAt: now } : b
    );

    set({ bookings: updatedBookings });
    get()._persist();

    addActivity('booking_updated', existing.guestName, `Updated booking details for ${existing.guestName}`);
    addToast({
      type: 'success',
      title: 'Booking Updated',
      message: `Changes for ${existing.guestName} saved.`,
    });

    return { success: true };
  },

  deleteBooking: (id) => {
    const { bookings, addActivity, addToast } = get();
    const existing = bookings.find((b) => b.id === id);
    if (!existing) return;

    const filtered = bookings.filter((b) => b.id !== id);
    set({ bookings: filtered });
    get()._persist();

    addActivity('booking_deleted', existing.guestName, `Deleted booking for ${existing.guestName}`);

    addToast({
      type: 'warning',
      title: 'Booking Deleted',
      message: `Deleted booking for ${existing.guestName}.`,
      undoAction: () => {
        set((state) => ({ bookings: [...state.bookings, existing] }));
        get()._persist();
        get().addActivity('booking_created', existing.guestName, `Restored deleted booking for ${existing.guestName}`);
        get().addToast({ type: 'success', title: 'Restored', message: `Restored booking for ${existing.guestName}.` });
      },
      duration: 6000,
    });
  },

  cancelBooking: (id) => {
    const { updateBooking } = get();
    updateBooking(id, { status: 'cancelled' });
  },

  duplicateBooking: (id) => {
    const { bookings, addBooking } = get();
    const existing = bookings.find((b) => b.id === id);
    if (!existing) return;

    const res = addBooking({
      ...existing,
      guestName: `${existing.guestName} (Copy)`,
      status: 'confirmed',
      bookingRef: existing.bookingRef ? `${existing.bookingRef}-COPY` : undefined,
    });

    if (!res.success) {
      get().addToast({
        type: 'error',
        title: 'Cannot Duplicate',
        message: res.error,
      });
    }
  },

  // EXPENSES
  addExpense: (expenseInput) => {
    const { expenses, addActivity, addToast } = get();
    const now = new Date().toISOString();
    const newExpense: Expense = {
      ...expenseInput,
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: now,
      updatedAt: now,
    };

    set({ expenses: [...expenses, newExpense] });
    get()._persist();

    addActivity('expense_saved', newExpense.label, `Added expense ${newExpense.label} (€${(newExpense.amountCents / 100).toFixed(2)})`);
    addToast({ type: 'success', title: 'Expense Added', message: `${newExpense.label} saved.` });
  },

  updateExpense: (id, updates) => {
    const { expenses, addActivity, addToast } = get();
    const existing = expenses.find((e) => e.id === id);
    if (!existing) return;

    const now = new Date().toISOString();
    const updated = expenses.map((e) => (e.id === id ? { ...e, ...updates, updatedAt: now } : e));

    set({ expenses: updated });
    get()._persist();

    addActivity('expense_saved', updates.label || existing.label, `Updated expense details`);
    addToast({ type: 'success', title: 'Expense Saved', message: `Expense updated.` });
  },

  deleteExpense: (id) => {
    const { expenses, addActivity, addToast } = get();
    const existing = expenses.find((e) => e.id === id);
    if (!existing) return;

    set({ expenses: expenses.filter((e) => e.id !== id) });
    get()._persist();

    addActivity('expense_deleted', existing.label, `Deleted expense ${existing.label}`);
    addToast({ type: 'info', title: 'Expense Deleted', message: `${existing.label} removed.` });
  },

  // EXTRA INCOME
  addExtraIncome: (incomeInput) => {
    const { extraIncomes, addActivity, addToast } = get();
    const now = new Date().toISOString();
    const newIncome: ExtraIncome = {
      ...incomeInput,
      id: `ext-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: now,
      updatedAt: now,
    };

    set({ extraIncomes: [...extraIncomes, newIncome] });
    get()._persist();

    addActivity('extra_income_saved', newIncome.label, `Added extra income ${newIncome.label} (€${(newIncome.amountCents / 100).toFixed(2)})`);
    addToast({ type: 'success', title: 'Extra Income Added', message: `${newIncome.label} saved.` });
  },

  updateExtraIncome: (id, updates) => {
    const { extraIncomes, addActivity, addToast } = get();
    const existing = extraIncomes.find((e) => e.id === id);
    if (!existing) return;

    const now = new Date().toISOString();
    const updated = extraIncomes.map((e) => (e.id === id ? { ...e, ...updates, updatedAt: now } : e));

    set({ extraIncomes: updated });
    get()._persist();

    addActivity('extra_income_saved', updates.label || existing.label, `Updated extra income details`);
    addToast({ type: 'success', title: 'Extra Income Saved', message: `Extra income updated.` });
  },

  deleteExtraIncome: (id) => {
    const { extraIncomes, addActivity, addToast } = get();
    const existing = extraIncomes.find((e) => e.id === id);
    if (!existing) return;

    set({ extraIncomes: extraIncomes.filter((e) => e.id !== id) });
    get()._persist();

    addActivity('extra_income_deleted', existing.label, `Deleted extra income ${existing.label}`);
    addToast({ type: 'info', title: 'Extra Income Deleted', message: `${existing.label} removed.` });
  },

  // TURNOVER TASKS
  updateTurnoverTask: (id, updates) => {
    const { turnoverTasks } = get();
    const now = new Date().toISOString();
    const updated = turnoverTasks.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: now } : t));
    set({ turnoverTasks: updated });
  },

  // TAX CONFIG
  updateTaxConfig: (updates) => {
    const { taxConfiguration, addActivity, addToast } = get();
    const updated = { ...taxConfiguration, ...updates };

    set({ taxConfiguration: updated });
    get()._persist();

    addActivity('tax_config_updated', 'Tax Settings', 'Updated tax rates and calculation assumptions');
    addToast({ type: 'success', title: 'Tax Settings Saved', message: 'Tax parameters updated successfully.' });
  },

  // PREFERENCES & PRIVACY
  updateUserPreferences: (prefs) => {
    const { userPreferences } = get();
    const updated = { ...userPreferences, ...prefs };
    set({ userPreferences: updated });
    get()._persist();
  },

  anonymizeAllPII: async () => {
    const { bookings, addActivity, addToast } = get();
    const anonymized = await storageService.anonymizePII(bookings);
    set({ bookings: anonymized });
    get()._persist();

    addActivity('pii_anonymized', 'Privacy', 'Anonymized all guest PII records while retaining financial totals');
    addToast({ type: 'success', title: 'PII Anonymized', message: 'Guest names, phone numbers, and notes removed.' });
  },

  clearAllData: async () => {
    await storageService.clearAll();
    get().resetDefaultSeedData();
  },

  // ICAL IMPORT
  importIcalEvents: (events, targetPropertyId, channel) => {
    const { bookings, addActivity, addToast } = get();
    const now = new Date().toISOString();
    let importedCount = 0;

    const newBookingsList = [...bookings];

    for (const ev of events) {
      // Check compound match
      const exists = newBookingsList.find(
        (b) => b.externalUid === ev.externalUid && b.propertyId === targetPropertyId
      );

      if (!exists) {
        newBookingsList.push({
          id: `b-ical-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          propertyId: targetPropertyId,
          guestName: ev.summary || `${channel.toUpperCase()} Guest`,
          channel,
          checkInDate: ev.startDateStr,
          checkOutDate: ev.endDateStr,
          nightlyRateCents: 12000,
          adults: 2,
          children: 0,
          status: 'confirmed',
          discountCents: 0,
          cleaningFeeCents: 4000,
          commissionMode: 'percentage',
          commissionPercentage: DEFAULT_CHANNEL_COMMISSIONS[channel]?.percentage || 15,
          commissionFixedAmountCents: 0,
          suggestedCommissionPercentage: DEFAULT_CHANNEL_COMMISSIONS[channel]?.percentage || 15,
          commissionOverrideEnabled: false,
          checkInTime: '15:00',
          checkOutTime: '10:00',
          timezone: 'Europe/Malta',
          earlyCheckIn: false,
          lateCheckOut: false,
          requiredTurnoverMinutes: 240,
          turnoverStatus: 'sufficient',
          source: channel === 'airbnb' ? 'airbnb_api' : channel === 'booking_com' ? 'booking_api' : 'ical',
          externalUid: ev.externalUid,
          importedAt: now,
          syncStatus: 'synced',
          createdAt: now,
          updatedAt: now,
        });
        importedCount++;
      }
    }

    set({ bookings: newBookingsList });
    get()._persist();

    addActivity('ical_imported', 'iCal Sync', `Imported ${importedCount} external reservation(s) into property ${targetPropertyId}`);
    addToast({ type: 'success', title: 'iCal Import Completed', message: `Imported ${importedCount} new reservation(s).` });
  },

  // UI MODALS & HOVER
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

  // TOASTS
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newToast: ToastMessage = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    const duration = toast.duration || 4500;
    setTimeout(() => {
      get().removeToast(id);
    }, duration);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  // AUDIT LOG
  addActivity: (action, entity, description) => {
    const newRecord: ActivityRecord = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action,
      entity,
      description,
    };
    set((state) => ({ activityHistory: [newRecord, ...state.activityHistory].slice(0, 100) }));
    get()._persist();
  },

  // BACKUP & RESET
  importBackupData: (backup) => {
    set({
      taxConfiguration: backup.taxConfiguration,
      bookings: backup.bookings,
      expenses: backup.expenses,
      extraIncomes: backup.extraIncomes,
      userPreferences: backup.userPreferences || DEFAULT_USER_PREFERENCES,
      activityHistory: backup.activityHistory || [],
    });
    get()._persist();

    get().addActivity('backup_imported', 'Backup File', `Imported backup containing ${backup.bookings.length} bookings.`);
    get().addToast({ type: 'success', title: 'Data Imported', message: 'All bookings, expenses, and tax settings restored.' });
  },

  resetDefaultSeedData: () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    const seedExpenses = createDefaultExpenses(currentYear, currentMonth);
    const seedBookings = createSeedBookings(currentYear, currentMonth);
    const seedExtraIncome = createSeedExtraIncome(currentYear, currentMonth);

    set({
      taxConfiguration: DEFAULT_TAX_CONFIG,
      bookings: seedBookings.map((b) => ({
        commissionMode: 'percentage',
        commissionPercentage: DEFAULT_CHANNEL_COMMISSIONS[b.channel]?.percentage || 15,
        commissionFixedAmountCents: 0,
        suggestedCommissionPercentage: DEFAULT_CHANNEL_COMMISSIONS[b.channel]?.percentage || 15,
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
        ...b,
      })),
      expenses: seedExpenses,
      extraIncomes: seedExtraIncome,
      selectedMonth: currentMonth,
      selectedYear: currentYear,
      userPreferences: DEFAULT_USER_PREFERENCES,
      activityHistory: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'tax_config_updated',
          entity: 'System',
          description: 'Reset system to clean seed data',
        },
      ],
    });

    get()._persist();
    get().addToast({ type: 'info', title: 'Reset Complete', message: 'Restored default properties, bookings, and tax settings.' });
  },

  // Sync to IndexedDB with AES-GCM PII encryption
  _persist: () => {
    const state = get();
    const persState = {
      version: 1,
      selectedMonth: state.selectedMonth,
      selectedYear: state.selectedYear,
      taxConfiguration: state.taxConfiguration,
      bookings: state.bookings,
      expenses: state.expenses,
      extraIncomes: state.extraIncomes,
      userPreferences: state.userPreferences,
      activityHistory: state.activityHistory,
    };

    PersistenceRepository.save(persState);
    storageService.saveState(persState);
  },
}));

