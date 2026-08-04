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
import {
  PersistenceRepository,
  DEFAULT_TAX_CONFIG,
  DEFAULT_USER_PREFERENCES,
  createDefaultExpenses,
  createSeedBookings,
  createSeedExtraIncome,
} from '../services/persistenceRepository';
import { storageService } from '../services/storageService';
import { validateBookingOverlap } from '../utils/overlapValidation';
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
  selectedMonth: number;
  selectedYear: number;
  mainViewMode: MainViewMode;
  taxConfiguration: TaxConfiguration;
  bookings: Booking[];
  expenses: Expense[];
  extraIncomes: ExtraIncome[];
  turnoverTasks: TurnoverTask[];
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
    extraIncome: Omit<ExtraIncome, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  updateExtraIncome: (id: string, updates: Partial<ExtraIncome>) => void;
  deleteExtraIncome: (id: string) => void;
  updateTurnoverTask: (id: string, updates: Partial<TurnoverTask>) => void;
  updateTaxConfig: (config: Partial<TaxConfiguration>) => void;
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

function getChannelDefaults(channel: Channel) {
  return DEFAULT_CHANNEL_COMMISSIONS[channel] ?? {
    percentage: 15,
    mode: 'percentage' as const,
  };
}

function normalizeBooking(booking: Booking): Booking {
  const channelDefaults = getChannelDefaults(booking.channel);

  return {
    commissionMode: booking.commissionMode ?? channelDefaults.mode,
    commissionPercentage: booking.commissionPercentage ?? channelDefaults.percentage,
    commissionFixedAmountCents: booking.commissionFixedAmountCents ?? 0,
    suggestedCommissionPercentage:
      booking.suggestedCommissionPercentage ?? channelDefaults.percentage,
    commissionOverrideEnabled: booking.commissionOverrideEnabled ?? false,
    checkInTime: booking.checkInTime ?? '15:00',
    checkOutTime: booking.checkOutTime ?? '10:00',
    timezone: booking.timezone ?? 'Europe/Malta',
    earlyCheckIn: booking.earlyCheckIn ?? false,
    lateCheckOut: booking.lateCheckOut ?? false,
    requiredTurnoverMinutes: booking.requiredTurnoverMinutes ?? 240,
    turnoverStatus: booking.turnoverStatus ?? 'sufficient',
    source: booking.source ?? 'manual',
    syncStatus: booking.syncStatus ?? 'not_synced',
    ...booking,
  };
}

const loadedState = PersistenceRepository.load();

export const useDashboardStore = create<DashboardState>((set, get) => ({
  selectedMonth: loadedState.selectedMonth,
  selectedYear: loadedState.selectedYear,
  mainViewMode: 'calendar',
  taxConfiguration: {
    ...DEFAULT_TAX_CONFIG,
    ...loadedState.taxConfiguration,
  },
  bookings: loadedState.bookings.map(normalizeBooking),
  expenses: loadedState.expenses,
  extraIncomes: loadedState.extraIncomes,
  turnoverTasks: [],
  userPreferences: {
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
      return {
        success: false,
        error: overlap.errorMessage || 'Overlapping booking detected',
      };
    }

    const now = new Date().toISOString();
    const newBooking = normalizeBooking({
      ...bookingInput,
      id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    });

    set({ bookings: [...bookings, newBooking] });
    get()._persist();
    addActivity(
      'booking_created',
      newBooking.guestName,
      `Created booking in property ${newBooking.propertyId} (${newBooking.checkInDate} to ${newBooking.checkOutDate})`
    );
    addToast({
      type: 'success',
      title: 'Booking Created',
      message: `Reservation for ${newBooking.guestName} saved successfully.`,
    });
    return { success: true };
  },

  updateBooking: (id, updates) => {
    const { bookings, addActivity, addToast } = get();
    const existing = bookings.find((booking) => booking.id === id);
    if (!existing) return { success: false, error: 'Booking not found' };

    const targetPropertyId = updates.propertyId ?? existing.propertyId;
    const targetCheckIn = updates.checkInDate ?? existing.checkInDate;
    const targetCheckOut = updates.checkOutDate ?? existing.checkOutDate;

    if (updates.propertyId || updates.checkInDate || updates.checkOutDate) {
      const overlap = validateBookingOverlap(
        targetPropertyId,
        targetCheckIn,
        targetCheckOut,
        bookings,
        id
      );
      if (overlap.hasOverlap) {
        return {
          success: false,
          error: overlap.errorMessage || 'Overlapping booking detected',
        };
      }
    }

    const now = new Date().toISOString();
    const updatedBookings = bookings.map((booking) =>
      booking.id === id
        ? normalizeBooking({ ...booking, ...updates, updatedAt: now })
        : booking
    );

    set({ bookings: updatedBookings });
    get()._persist();
    addActivity(
      'booking_updated',
      existing.guestName,
      `Updated booking details for ${existing.guestName}`
    );
    addToast({
      type: 'success',
      title: 'Booking Updated',
      message: `Changes for ${existing.guestName} saved.`,
    });
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
      message: `Deleted booking for ${existing.guestName}.`,
      undoAction: () => {
        set((state) => ({ bookings: [...state.bookings, existing] }));
        get()._persist();
        get().addActivity(
          'booking_created',
          existing.guestName,
          `Restored deleted booking for ${existing.guestName}`
        );
        get().addToast({
          type: 'success',
          title: 'Restored',
          message: `Restored booking for ${existing.guestName}.`,
        });
      },
      duration: 6000,
    });
  },

  cancelBooking: (id) => {
    const { bookings, addActivity, addToast } = get();
    const existing = bookings.find((booking) => booking.id === id);
    if (!existing || existing.status === 'cancelled') return;

    const now = new Date().toISOString();
    set({
      bookings: bookings.map((booking) =>
        booking.id === id ? { ...booking, status: 'cancelled', updatedAt: now } : booking
      ),
    });
    get()._persist();
    addActivity('booking_cancelled', existing.guestName, `Cancelled booking for ${existing.guestName}`);
    addToast({
      type: 'warning',
      title: 'Booking Cancelled',
      message: `Reservation for ${existing.guestName} was cancelled.`,
    });
  },

  duplicateBooking: (id) => {
    const { bookings, addBooking } = get();
    const existing = bookings.find((booking) => booking.id === id);
    if (!existing) return;

    const result = addBooking({
      ...existing,
      guestName: `${existing.guestName} (Copy)`,
      status: 'confirmed',
      bookingRef: existing.bookingRef ? `${existing.bookingRef}-COPY` : undefined,
    });

    if (!result.success) {
      get().addToast({
        type: 'error',
        title: 'Cannot Duplicate',
        message: result.error,
      });
    }
  },

  addExpense: (expenseInput) => {
    const { expenses, addActivity, addToast } = get();
    const now = new Date().toISOString();
    const newExpense: Expense = {
      ...expenseInput,
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    set({ expenses: [...expenses, newExpense] });
    get()._persist();
    addActivity(
      'expense_saved',
      newExpense.label,
      `Added expense ${newExpense.label} (€${(newExpense.amountCents / 100).toFixed(2)})`
    );
    addToast({ type: 'success', title: 'Expense Added', message: `${newExpense.label} saved.` });
  },

  updateExpense: (id, updates) => {
    const { expenses, addActivity, addToast } = get();
    const existing = expenses.find((expense) => expense.id === id);
    if (!existing) return;
    const now = new Date().toISOString();
    set({
      expenses: expenses.map((expense) =>
        expense.id === id ? { ...expense, ...updates, updatedAt: now } : expense
      ),
    });
    get()._persist();
    addActivity('expense_saved', updates.label || existing.label, 'Updated expense details');
    addToast({ type: 'success', title: 'Expense Saved', message: 'Expense updated.' });
  },

  deleteExpense: (id) => {
    const { expenses, addActivity, addToast } = get();
    const existing = expenses.find((expense) => expense.id === id);
    if (!existing) return;
    set({ expenses: expenses.filter((expense) => expense.id !== id) });
    get()._persist();
    addActivity('expense_deleted', existing.label, `Deleted expense ${existing.label}`);
    addToast({ type: 'info', title: 'Expense Deleted', message: `${existing.label} removed.` });
  },

  addExtraIncome: (incomeInput) => {
    const { extraIncomes, addActivity, addToast } = get();
    const now = new Date().toISOString();
    const newIncome: ExtraIncome = {
      ...incomeInput,
      id: `ext-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    set({ extraIncomes: [...extraIncomes, newIncome] });
    get()._persist();
    addActivity(
      'extra_income_saved',
      newIncome.label,
      `Added extra income ${newIncome.label} (€${(newIncome.amountCents / 100).toFixed(2)})`
    );
    addToast({
      type: 'success',
      title: 'Extra Income Added',
      message: `${newIncome.label} saved.`,
    });
  },

  updateExtraIncome: (id, updates) => {
    const { extraIncomes, addActivity, addToast } = get();
    const existing = extraIncomes.find((income) => income.id === id);
    if (!existing) return;
    const now = new Date().toISOString();
    set({
      extraIncomes: extraIncomes.map((income) =>
        income.id === id ? { ...income, ...updates, updatedAt: now } : income
      ),
    });
    get()._persist();
    addActivity(
      'extra_income_saved',
      updates.label || existing.label,
      'Updated extra income details'
    );
    addToast({
      type: 'success',
      title: 'Extra Income Saved',
      message: 'Extra income updated.',
    });
  },

  deleteExtraIncome: (id) => {
    const { extraIncomes, addActivity, addToast } = get();
    const existing = extraIncomes.find((income) => income.id === id);
    if (!existing) return;
    set({ extraIncomes: extraIncomes.filter((income) => income.id !== id) });
    get()._persist();
    addActivity('extra_income_deleted', existing.label, `Deleted extra income ${existing.label}`);
    addToast({
      type: 'info',
      title: 'Extra Income Deleted',
      message: `${existing.label} removed.`,
    });
  },

  updateTurnoverTask: (id, updates) => {
    const now = new Date().toISOString();
    set((state) => ({
      turnoverTasks: state.turnoverTasks.map((task) =>
        task.id === id ? { ...task, ...updates, updatedAt: now } : task
      ),
    }));
  },

  updateTaxConfig: (updates) => {
    const { taxConfiguration, addActivity, addToast } = get();
    set({ taxConfiguration: { ...taxConfiguration, ...updates } });
    get()._persist();
    addActivity(
      'tax_config_updated',
      'Tax Settings',
      'Updated tax rates and calculation assumptions'
    );
    addToast({
      type: 'success',
      title: 'Tax Settings Saved',
      message: 'Tax parameters updated successfully.',
    });
  },

  updateUserPreferences: (prefs) => {
    set((state) => ({ userPreferences: { ...state.userPreferences, ...prefs } }));
    get()._persist();
  },

  anonymizeAllPII: async () => {
    const { bookings, addActivity, addToast } = get();
    const anonymized = await storageService.anonymizePII(bookings);
    set({ bookings: anonymized.map(normalizeBooking) });
    get()._persist();
    addActivity(
      'pii_anonymized',
      'Privacy',
      'Anonymized all guest PII records while retaining financial totals'
    );
    addToast({
      type: 'success',
      title: 'PII Anonymized',
      message: 'Guest names, phone numbers, and notes removed.',
    });
  },

  clearAllData: async () => {
    await storageService.clearAll();
    get().resetDefaultSeedData();
  },

  importIcalEvents: (events, targetPropertyId, channel) => {
    const { bookings, addActivity, addToast } = get();
    const now = new Date().toISOString();
    const channelDefaults = getChannelDefaults(channel);
    let importedCount = 0;
    const newBookings = [...bookings];

    for (const event of events) {
      const exists = newBookings.some(
        (booking) =>
          booking.externalUid === event.externalUid &&
          booking.propertyId === targetPropertyId
      );
      if (exists) continue;

      newBookings.push(
        normalizeBooking({
          id: `b-ical-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          propertyId: targetPropertyId,
          guestName: event.summary || `${channel.toUpperCase()} Guest`,
          channel,
          checkInDate: event.startDateStr,
          checkOutDate: event.endDateStr,
          nightlyRateCents: 12000,
          adults: 2,
          children: 0,
          status: 'confirmed',
          discountCents: 0,
          cleaningFeeCents: 4000,
          commissionMode: channelDefaults.mode,
          commissionPercentage: channelDefaults.percentage,
          commissionFixedAmountCents: 0,
          suggestedCommissionPercentage: channelDefaults.percentage,
          commissionOverrideEnabled: false,
          checkInTime: '15:00',
          checkOutTime: '10:00',
          timezone: 'Europe/Malta',
          earlyCheckIn: false,
          lateCheckOut: false,
          requiredTurnoverMinutes: 240,
          turnoverStatus: 'sufficient',
          source:
            channel === 'airbnb'
              ? 'airbnb_api'
              : channel === 'booking_com'
                ? 'booking_api'
                : 'ical',
          externalUid: event.externalUid,
          importedAt: now,
          syncStatus: 'synced',
          createdAt: now,
          updatedAt: now,
        })
      );
      importedCount += 1;
    }

    set({ bookings: newBookings });
    get()._persist();
    addActivity(
      'ical_imported',
      'iCal Sync',
      `Imported ${importedCount} external reservation(s) into property ${targetPropertyId}`
    );
    addToast({
      type: importedCount > 0 ? 'success' : 'info',
      title: importedCount > 0 ? 'iCal Import Completed' : 'No New Reservations',
      message:
        importedCount > 0
          ? `Imported ${importedCount} new reservation(s).`
          : 'All matching external reservations were already imported.',
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
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    const duration = toast.duration || 4500;
    setTimeout(() => get().removeToast(id), duration);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },

  addActivity: (action, entity, description) => {
    const newRecord: ActivityRecord = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      entity,
      description,
    };
    set((state) => ({
      activityHistory: [newRecord, ...state.activityHistory].slice(0, 100),
    }));
    get()._persist();
  },

  importBackupData: (backup) => {
    set({
      taxConfiguration: {
        ...DEFAULT_TAX_CONFIG,
        ...backup.taxConfiguration,
      },
      bookings: backup.bookings.map(normalizeBooking),
      expenses: backup.expenses,
      extraIncomes: backup.extraIncomes,
      userPreferences: {
        ...DEFAULT_USER_PREFERENCES,
        ...backup.userPreferences,
      },
      activityHistory: backup.activityHistory || [],
    });
    get()._persist();
    get().addActivity(
      'backup_imported',
      'Backup File',
      `Imported backup containing ${backup.bookings.length} bookings.`
    );
    get().addToast({
      type: 'success',
      title: 'Data Imported',
      message: 'All bookings, expenses, and tax settings restored.',
    });
  },

  resetDefaultSeedData: () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    set({
      taxConfiguration: { ...DEFAULT_TAX_CONFIG },
      bookings: createSeedBookings(currentYear, currentMonth).map(normalizeBooking),
      expenses: createDefaultExpenses(currentYear, currentMonth),
      extraIncomes: createSeedExtraIncome(currentYear, currentMonth),
      selectedMonth: currentMonth,
      selectedYear: currentYear,
      userPreferences: { ...DEFAULT_USER_PREFERENCES },
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
    get().addToast({
      type: 'info',
      title: 'Reset Complete',
      message: 'Restored default properties, bookings, and tax settings.',
    });
  },

  _persist: () => {
    const state = get();
    const persistedState = {
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
    PersistenceRepository.save(persistedState);
    void storageService.saveState(persistedState);
  },
}));
