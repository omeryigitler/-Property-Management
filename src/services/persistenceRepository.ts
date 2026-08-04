import {
  ActivityRecord,
  Booking,
  BookingStatus,
  Channel,
  Expense,
  ExtraIncome,
  PersistedState,
  UserPreferences,
} from '../types';
import { ALL_PROPERTIES } from '../config/locations';
import { calculateNights } from '../utils/dateUtilities';

const STORAGE_KEY = 'short_let_dashboard_v1';
export const CURRENT_SCHEMA_VERSION = 3;

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  stickyDailyTotal: true,
  showProvisionalBlock: true,
  compactGridRows: false,
  currencySymbol: '€',
  privacyMode: false,
  dataRetentionMonths: 24,
};

const CHANNELS = new Set<Channel>(['airbnb', 'booking_com', 'direct', 'vrbo']);
const STATUSES = new Set<BookingStatus>([
  'confirmed',
  'provisional',
  'cancelled',
  'checked_in',
  'checked_out',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nonNegativeInteger(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : fallback;
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * Converts legacy reservations to the reduced schema and deliberately drops
 * guest-count, contact, fee, discount, commission, tax and turnover fields.
 */
export function normalizeBookingRecord(value: unknown): Booking | null {
  if (!isRecord(value)) return null;

  const propertyId = stringValue(value.propertyId).trim();
  const guestName = stringValue(value.guestName).trim();
  const checkInDate = stringValue(value.checkInDate);
  const checkOutDate = stringValue(value.checkOutDate);
  const channel = CHANNELS.has(value.channel as Channel)
    ? (value.channel as Channel)
    : 'direct';
  const status = STATUSES.has(value.status as BookingStatus)
    ? (value.status as BookingStatus)
    : 'confirmed';

  if (!propertyId || !guestName || !checkInDate || !checkOutDate) return null;
  if (checkOutDate <= checkInDate) return null;

  const nights = calculateNights(checkInDate, checkOutDate);
  if (nights <= 0) return null;

  const legacyExactTotal = nonNegativeInteger(value.accommodationTotalCents, -1);
  const storedNightlyRate = nonNegativeInteger(value.nightlyRateCents, 0);
  const nightlyRateCents =
    legacyExactTotal >= 0 ? Math.round(legacyExactTotal / nights) : storedNightlyRate;
  const now = new Date().toISOString();

  return {
    id: stringValue(value.id).trim() || `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    propertyId,
    guestName,
    channel,
    checkInDate,
    checkOutDate,
    nightlyRateCents: Math.max(0, nightlyRateCents),
    status,
    externalUid: stringValue(value.externalUid).trim() || undefined,
    createdAt: stringValue(value.createdAt) || now,
    updatedAt: stringValue(value.updatedAt) || now,
  };
}

export function normalizeExpenseRecord(value: unknown): Expense | null {
  if (!isRecord(value)) return null;
  const id = stringValue(value.id).trim();
  const propertyId = stringValue(value.propertyId).trim();
  const label = stringValue(value.label).trim();
  const category = stringValue(value.category).trim() || 'General';
  const year = Number(value.year);
  const month = Number(value.month);
  const amountCents = nonNegativeInteger(value.amountCents, -1);
  if (!id || !propertyId || !label || !Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (month < 1 || month > 12 || amountCents < 0) return null;
  const now = new Date().toISOString();
  return {
    id,
    propertyId,
    year,
    month,
    label,
    category,
    amountCents,
    notes: stringValue(value.notes).trim() || undefined,
    isRecurring: value.isRecurring === true,
    createdAt: stringValue(value.createdAt) || now,
    updatedAt: stringValue(value.updatedAt) || now,
  };
}

export function normalizeExtraIncomeRecord(value: unknown): ExtraIncome | null {
  if (!isRecord(value)) return null;
  const id = stringValue(value.id).trim();
  const propertyId = stringValue(value.propertyId).trim();
  const label = stringValue(value.label).trim();
  const year = Number(value.year);
  const month = Number(value.month);
  const amountCents = nonNegativeInteger(value.amountCents, -1);
  if (!id || !propertyId || !label || !Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (month < 1 || month > 12 || amountCents < 0) return null;
  const now = new Date().toISOString();
  return {
    id,
    propertyId,
    year,
    month,
    label,
    amountCents,
    notes: stringValue(value.notes).trim() || undefined,
    createdAt: stringValue(value.createdAt) || now,
    updatedAt: stringValue(value.updatedAt) || now,
  };
}

function normalizeActivityRecord(value: unknown): ActivityRecord | null {
  if (!isRecord(value)) return null;
  const id = stringValue(value.id).trim();
  const timestamp = stringValue(value.timestamp);
  const rawAction = stringValue(value.action);
  if (rawAction === 'tax_config_updated') return null;
  const action = rawAction as ActivityRecord['action'];
  const entity = stringValue(value.entity).trim();
  const description = stringValue(value.description).trim();
  if (!id || !timestamp || !action || !entity || !description) return null;
  return { id, timestamp, action, entity, description };
}

export function normalizePersistedState(
  value: unknown,
  fallbackYear = new Date().getFullYear(),
  fallbackMonth = new Date().getMonth() + 1
): PersistedState {
  const record = isRecord(value) ? value : {};
  const bookings = Array.isArray(record.bookings)
    ? record.bookings.map(normalizeBookingRecord).filter((item): item is Booking => Boolean(item))
    : [];
  const expenses = Array.isArray(record.expenses)
    ? record.expenses.map(normalizeExpenseRecord).filter((item): item is Expense => Boolean(item))
    : [];
  const extraIncomes = Array.isArray(record.extraIncomes)
    ? record.extraIncomes
        .map(normalizeExtraIncomeRecord)
        .filter((item): item is ExtraIncome => Boolean(item))
    : [];
  const activityHistory = Array.isArray(record.activityHistory)
    ? record.activityHistory
        .map(normalizeActivityRecord)
        .filter((item): item is ActivityRecord => Boolean(item))
    : [];

  return {
    version: CURRENT_SCHEMA_VERSION,
    selectedMonth:
      Number.isInteger(record.selectedMonth) && Number(record.selectedMonth) >= 1 && Number(record.selectedMonth) <= 12
        ? Number(record.selectedMonth)
        : fallbackMonth,
    selectedYear: Number.isInteger(record.selectedYear) ? Number(record.selectedYear) : fallbackYear,
    bookings,
    expenses,
    extraIncomes,
    userPreferences: isRecord(record.userPreferences)
      ? { ...DEFAULT_USER_PREFERENCES, ...record.userPreferences }
      : { ...DEFAULT_USER_PREFERENCES },
    activityHistory,
  };
}

export function createDefaultExpenses(year: number, month: number): Expense[] {
  const now = new Date().toISOString();
  return ALL_PROPERTIES.flatMap((property) => [
    {
      id: `exp-rent-${property.id}-${year}-${month}`,
      propertyId: property.id,
      month,
      year,
      label: 'Rent',
      amountCents: 65000,
      category: 'Rent',
      notes: 'Monthly property lease',
      isRecurring: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `exp-clean-${property.id}-${year}-${month}`,
      propertyId: property.id,
      month,
      year,
      label: 'Cleaning',
      amountCents: 12000,
      category: 'Cleaning',
      notes: 'Monthly cleaning cost',
      isRecurring: true,
      createdAt: now,
      updatedAt: now,
    },
  ]);
}

export function createSeedBookings(year: number, month: number): Booking[] {
  const now = new Date().toISOString();
  const monthText = String(month).padStart(2, '0');
  const names = ['Alex Morgan', 'Sophia Martin', 'Luca Rossi', 'Emma Brown', 'David Miller'];
  const channels: Channel[] = ['airbnb', 'booking_com', 'direct', 'vrbo'];

  return ALL_PROPERTIES.slice(0, Math.min(ALL_PROPERTIES.length, 10)).map((property, index) => {
    const checkInDay = 1 + (index * 2) % 20;
    const checkOutDay = checkInDay + 3;
    return {
      id: `b-seed-${index + 1}`,
      propertyId: property.id,
      guestName: names[index % names.length],
      channel: channels[index % channels.length],
      checkInDate: `${year}-${monthText}-${String(checkInDay).padStart(2, '0')}`,
      checkOutDate: `${year}-${monthText}-${String(checkOutDay).padStart(2, '0')}`,
      nightlyRateCents: 11000 + index * 1000,
      status: index === 4 ? 'provisional' : 'confirmed',
      createdAt: now,
      updatedAt: now,
    };
  });
}

export function createSeedExtraIncome(year: number, month: number): ExtraIncome[] {
  const now = new Date().toISOString();
  const propertyId = ALL_PROPERTIES[0]?.id;
  if (!propertyId) return [];
  return [
    {
      id: `ext-${propertyId}-${year}-${month}`,
      propertyId,
      month,
      year,
      label: 'Additional Service',
      amountCents: 3500,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function createInitialState(year: number, month: number): PersistedState {
  return {
    version: CURRENT_SCHEMA_VERSION,
    selectedMonth: month,
    selectedYear: year,
    bookings: createSeedBookings(year, month),
    expenses: createDefaultExpenses(year, month),
    extraIncomes: createSeedExtraIncome(year, month),
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
}

export class PersistenceRepository {
  public static load(): PersistedState {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    if (typeof localStorage === 'undefined') return createInitialState(year, month);

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const normalized = normalizePersistedState(JSON.parse(raw), year, month);
        if (
          normalized.bookings.length > 0 ||
          normalized.expenses.length > 0 ||
          normalized.extraIncomes.length > 0
        ) {
          return normalized;
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted dashboard state:', error);
    }

    return createInitialState(year, month);
  }

  public static save(state: PersistedState): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizePersistedState(state)));
  }
}
