import {
  ActivityRecord,
  BackupData,
  Booking,
  BookingStatus,
  Channel,
  Expense,
  ExtraIncome,
  LocationConfig,
  PropertyConfig,
  UserPreferences,
} from '../types';
import { ALL_PROPERTIES, LOCATIONS } from '../config/locations';
import {
  calculateBookingRevenue,
  calculatePropertyFinancials,
} from './financialCalculationService';
import {
  DEFAULT_USER_PREFERENCES,
  normalizeBookingRecord,
  normalizeExpenseRecord,
  normalizeExtraIncomeRecord,
} from './persistenceRepository';
import { isRentExpense } from '../utils/expenseUtilities';

const CHANNELS = new Set<Channel>(['airbnb', 'booking_com', 'direct', 'vrbo']);
const BOOKING_STATUSES = new Set<BookingStatus>([
  'confirmed',
  'provisional',
  'cancelled',
  'checked_in',
  'checked_out',
]);
const ACTIVITY_ACTIONS = new Set<ActivityRecord['action']>([
  'booking_created',
  'booking_updated',
  'booking_cancelled',
  'booking_deleted',
  'expense_saved',
  'expense_deleted',
  'extra_income_saved',
  'extra_income_deleted',
  'property_saved',
  'location_saved',
  'backup_imported',
  'ical_imported',
  'pii_anonymized',
  'data_cleared',
]);

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadTextFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function euros(cents: number | null | undefined): string {
  return cents == null || !Number.isFinite(cents)
    ? ''
    : (cents / 100).toFixed(2);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateLocation(value: unknown): value is LocationConfig {
  return (
    isObject(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.headerColorClass) &&
    isNonEmptyString(value.badgeBgClass) &&
    isNonEmptyString(value.borderClass) &&
    (value.properties == null || Array.isArray(value.properties))
  );
}

function validateProperty(value: unknown): value is PropertyConfig {
  return (
    isObject(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.locationId) &&
    (value.active == null || typeof value.active === 'boolean')
  );
}

function hasDuplicateIds(values: Array<{ id: string }>): boolean {
  return new Set(values.map((value) => value.id)).size !== values.length;
}

function isActivityRecord(value: unknown): value is ActivityRecord {
  return (
    isObject(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.timestamp) &&
    ACTIVITY_ACTIONS.has(String(value.action) as ActivityRecord['action']) &&
    isNonEmptyString(value.entity) &&
    isNonEmptyString(value.description)
  );
}

export class ExportImportService {
  public static generateBackup(
    locations: LocationConfig[],
    properties: PropertyConfig[],
    bookings: Booking[],
    expenses: Expense[],
    extraIncomes: ExtraIncome[],
    userPreferences: UserPreferences,
    activityHistory: ActivityRecord[],
    includePii = false
  ): BackupData {
    const safeBookings = bookings.map((booking, index) => ({
      ...booking,
      guestName: includePii
        ? booking.guestName
        : `Guest ${String.fromCharCode(65 + (index % 26))}${index + 1}`,
    }));

    return {
      version: 3,
      exportedAt: new Date().toISOString(),
      containsPii: includePii,
      locations: locations.map((location) => ({ ...location, properties: [] })),
      properties,
      bookings: safeBookings,
      expenses,
      extraIncomes,
      userPreferences,
      activityHistory,
    };
  }

  public static downloadJsonBackup(backup: BackupData, filename?: string): void {
    downloadTextFile(
      JSON.stringify(backup, null, 2),
      filename ||
        `short_let_backup_${backup.containsPii ? 'FULL' : 'ANONYMIZED'}_${new Date()
          .toISOString()
          .slice(0, 10)}.json`,
      'application/json'
    );
  }

  public static exportBookingsCsv(bookings: Booking[], includePii = false): void {
    const headers = [
      'Booking ID',
      'Property ID',
      'Guest Name',
      'Channel',
      'Status',
      'Check In Date',
      'Check Out Date',
      'Nightly Rate (€)',
      'Total (€)',
    ];
    const rows = bookings.map((booking, index) => [
      booking.id,
      booking.propertyId,
      includePii
        ? booking.guestName
        : `Guest ${String.fromCharCode(65 + (index % 26))}${index + 1}`,
      booking.channel,
      booking.status,
      booking.checkInDate,
      booking.checkOutDate,
      euros(booking.nightlyRateCents),
      euros(calculateBookingRevenue(booking)),
    ]);
    downloadTextFile(
      [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n'),
      `bookings_export_${includePii ? 'full' : 'anonymous'}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`,
      'text/csv;charset=utf-8;'
    );
  }
}

export const exportBookingsCsv = ExportImportService.exportBookingsCsv;

export function exportFinancialSummaryCsv(
  year: number,
  month: number,
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[]
): void {
  const headers = [
    'Property',
    'Booking Income (€)',
    'Extra Income (€)',
    'Rent (€)',
    'Other Expenses (€)',
    'Total Expenses (€)',
    'Net Balance (€)',
    'Status',
  ];
  let totalBooking = 0;
  let totalExtra = 0;
  let totalRent = 0;
  let totalOther = 0;
  let totalExpenses = 0;
  let totalNet = 0;

  const rows = ALL_PROPERTIES.map((property) => {
    const financials = calculatePropertyFinancials(
      property.id,
      year,
      month,
      bookings,
      expenses,
      extraIncomes
    );
    const propertyExpenses = expenses.filter(
      (expense) =>
        expense.propertyId === property.id &&
        expense.year === year &&
        expense.month === month
    );
    const rent = propertyExpenses
      .filter(isRentExpense)
      .reduce((sum, item) => sum + item.amountCents, 0);
    const other = propertyExpenses
      .filter((item) => !isRentExpense(item))
      .reduce((sum, item) => sum + item.amountCents, 0);

    totalBooking += financials.bookingIncomeCents;
    totalExtra += financials.extraIncomeCents;
    totalRent += rent;
    totalOther += other;
    totalExpenses += financials.totalExpensesCents;
    totalNet += financials.netBalanceCents;

    return [
      property.name,
      euros(financials.bookingIncomeCents),
      euros(financials.extraIncomeCents),
      euros(rent),
      euros(other),
      euros(financials.totalExpensesCents),
      euros(financials.netBalanceCents),
      financials.netBalanceCents > 0
        ? 'Profitable'
        : financials.netBalanceCents < 0
          ? 'Loss'
          : 'Break-even',
    ];
  });

  rows.push([
    'PORTFOLIO TOTAL',
    euros(totalBooking),
    euros(totalExtra),
    euros(totalRent),
    euros(totalOther),
    euros(totalExpenses),
    euros(totalNet),
    totalNet > 0 ? 'Profitable' : totalNet < 0 ? 'Loss' : 'Break-even',
  ]);

  downloadTextFile(
    [['Report Year', year], ['Report Month', month], [], headers, ...rows]
      .map((row) => row.map(csvCell).join(','))
      .join('\n'),
    `financial_summary_${year}_${String(month).padStart(2, '0')}.csv`,
    'text/csv;charset=utf-8;'
  );
}

export function exportJsonBackup(
  locations: LocationConfig[],
  properties: PropertyConfig[],
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  userPreferences: UserPreferences,
  activityHistory: ActivityRecord[],
  includePii = false
): void {
  ExportImportService.downloadJsonBackup(
    ExportImportService.generateBackup(
      locations,
      properties,
      bookings,
      expenses,
      extraIncomes,
      userPreferences,
      activityHistory,
      includePii
    )
  );
}

export function validateBackupJson(
  jsonInput: string | unknown
): { isValid: boolean; data?: BackupData; error?: string } {
  try {
    const object = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
    if (!isObject(object)) {
      return { isValid: false, error: 'Backup file must contain a JSON object.' };
    }
    if (!Array.isArray(object.bookings)) {
      return { isValid: false, error: 'Backup is missing the bookings array.' };
    }
    if (!Array.isArray(object.expenses)) {
      return { isValid: false, error: 'Backup is missing the expenses array.' };
    }
    if (!Array.isArray(object.extraIncomes)) {
      return { isValid: false, error: 'Backup is missing the extra income array.' };
    }

    const locations = Array.isArray(object.locations)
      ? object.locations.filter(validateLocation)
      : undefined;
    const properties = Array.isArray(object.properties)
      ? object.properties.filter(validateProperty)
      : undefined;
    if (
      Array.isArray(object.locations) &&
      locations?.length !== object.locations.length
    ) {
      return { isValid: false, error: 'Backup contains an invalid locations list.' };
    }
    if (
      Array.isArray(object.properties) &&
      properties?.length !== object.properties.length
    ) {
      return { isValid: false, error: 'Backup contains an invalid properties list.' };
    }

    const bookings = object.bookings.map(normalizeBookingRecord);
    const expenses = object.expenses.map(normalizeExpenseRecord);
    const extraIncomes = object.extraIncomes.map(normalizeExtraIncomeRecord);
    const invalidBookingIndex = bookings.findIndex((item) => item == null);
    const invalidExpenseIndex = expenses.findIndex((item) => item == null);
    const invalidIncomeIndex = extraIncomes.findIndex((item) => item == null);
    if (invalidBookingIndex >= 0) {
      return {
        isValid: false,
        error: `Booking record ${invalidBookingIndex + 1} is incomplete or has invalid dates.`,
      };
    }
    if (invalidExpenseIndex >= 0) {
      return {
        isValid: false,
        error: `Expense record ${invalidExpenseIndex + 1} is incomplete or invalid.`,
      };
    }
    if (invalidIncomeIndex >= 0) {
      return {
        isValid: false,
        error: `Extra income record ${invalidIncomeIndex + 1} is incomplete or invalid.`,
      };
    }

    const cleanBookings = bookings as Booking[];
    const cleanExpenses = expenses as Expense[];
    const cleanIncomes = extraIncomes as ExtraIncome[];
    if (hasDuplicateIds(cleanBookings)) {
      return { isValid: false, error: 'Backup contains duplicate booking IDs.' };
    }
    if (hasDuplicateIds(cleanExpenses)) {
      return { isValid: false, error: 'Backup contains duplicate expense IDs.' };
    }
    if (hasDuplicateIds(cleanIncomes)) {
      return {
        isValid: false,
        error: 'Backup contains duplicate extra income IDs.',
      };
    }
    if (locations && hasDuplicateIds(locations)) {
      return { isValid: false, error: 'Backup contains duplicate location IDs.' };
    }
    if (properties && hasDuplicateIds(properties)) {
      return { isValid: false, error: 'Backup contains duplicate property IDs.' };
    }

    if (properties) {
      const locationIds = new Set((locations ?? LOCATIONS).map((location) => location.id));
      const invalidProperty = properties.find(
        (property) => !locationIds.has(property.locationId)
      );
      if (invalidProperty) {
        return {
          isValid: false,
          error: `Property ${invalidProperty.name} references a location that is not included in the backup.`,
        };
      }
      const propertyIds = new Set(properties.map((property) => property.id));
      if (
        cleanBookings.some((item) => !propertyIds.has(item.propertyId)) ||
        cleanExpenses.some((item) => !propertyIds.has(item.propertyId)) ||
        cleanIncomes.some((item) => !propertyIds.has(item.propertyId))
      ) {
        return {
          isValid: false,
          error:
            'Backup contains records linked to a property that is not included in the backup.',
        };
      }
    }

    const userPreferences = isObject(object.userPreferences)
      ? ({ ...DEFAULT_USER_PREFERENCES, ...object.userPreferences } as UserPreferences)
      : { ...DEFAULT_USER_PREFERENCES };
    const activityHistory = Array.isArray(object.activityHistory)
      ? object.activityHistory.filter(isActivityRecord)
      : [];

    return {
      isValid: true,
      data: {
        version: 3,
        exportedAt:
          typeof object.exportedAt === 'string'
            ? object.exportedAt
            : new Date().toISOString(),
        containsPii: object.containsPii === true,
        locations: locations?.map((location) => ({ ...location, properties: [] })),
        properties,
        bookings: cleanBookings,
        expenses: cleanExpenses,
        extraIncomes: cleanIncomes,
        userPreferences,
        activityHistory,
      },
    };
  } catch {
    return { isValid: false, error: 'Failed to parse JSON file format.' };
  }
}

export { CHANNELS, BOOKING_STATUSES };
