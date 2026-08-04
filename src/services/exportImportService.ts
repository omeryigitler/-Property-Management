import {
  ActivityRecord,
  BackupData,
  Booking,
  BookingStatus,
  Channel,
  CommissionBasis,
  EcoTaxBasis,
  Expense,
  ExtraIncome,
  FixedCommissionAllocationRule,
  IncomeTaxBasis,
  InsufficientTurnoverAction,
  LocationConfig,
  PropertyConfig,
  TaxConfiguration,
  TaxTreatment,
  UserPreferences,
  VatBasis,
  VatInclusivity,
} from '../types';
import { ALL_PROPERTIES, LOCATIONS } from '../config/locations';
import {
  calculateBookingRevenueAndCommission,
  calculatePropertyFinancials,
} from './financialCalculationService';
import {
  DEFAULT_TAX_CONFIG,
  DEFAULT_USER_PREFERENCES,
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
const TAX_TREATMENTS = new Set<TaxTreatment>([
  'accommodation_vat',
  'standard_vat',
  'vat_exempt',
]);
const VAT_INCLUSIVITY_VALUES = new Set<VatInclusivity>(['inclusive', 'exclusive']);
const VAT_BASIS_VALUES = new Set<VatBasis>([
  'gross',
  'net_after_commission',
  'excluding_vat',
]);
const ECO_BASIS_VALUES = new Set<EcoTaxBasis>([
  'per_occupied_night',
  'per_booking',
  'per_guest_per_night',
]);
const INCOME_BASIS_VALUES = new Set<IncomeTaxBasis>([
  'gross_revenue',
  'net_after_vat',
  'net_after_commission',
  'taxable_profit',
]);
const COMMISSION_BASIS_VALUES = new Set<CommissionBasis>([
  'accommodation_only',
  'accommodation_plus_fees',
  'gross_after_discounts',
  'manual',
]);
const FIXED_ALLOCATION_VALUES = new Set<FixedCommissionAllocationRule>([
  'check_in_date',
  'proportional_nights',
  'payout_date',
]);
const TURNOVER_ACTION_VALUES = new Set<InsufficientTurnoverAction>([
  'warning_allow',
  'require_confirmation',
  'block_submission',
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
  return cents == null || !Number.isFinite(cents) ? '' : (cents / 100).toFixed(2);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isOptionalNonNegativeNumber(value: unknown): boolean {
  return value == null || isNonNegativeNumber(value);
}

function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isOptionalEnum<T extends string>(value: unknown, allowed: Set<T>): boolean {
  return value == null || (typeof value === 'string' && allowed.has(value as T));
}

function validateTaxConfiguration(value: unknown): value is TaxConfiguration {
  if (!isObject(value)) return false;

  return (
    isOptionalNonNegativeNumber(value.accommodationVatRate) &&
    isOptionalNonNegativeNumber(value.standardVatRate) &&
    isOptionalNonNegativeNumber(value.incomeTaxRate) &&
    isOptionalNonNegativeNumber(value.ecoContributionCents) &&
    isOptionalEnum(value.vatInclusivity, VAT_INCLUSIVITY_VALUES) &&
    isOptionalEnum(value.vatBasis, VAT_BASIS_VALUES) &&
    isOptionalEnum(value.ecoTaxBasis, ECO_BASIS_VALUES) &&
    isOptionalEnum(value.incomeTaxBasis, INCOME_BASIS_VALUES) &&
    isOptionalEnum(value.defaultExtraIncomeTaxTreatment, TAX_TREATMENTS) &&
    isOptionalEnum(value.commissionBasis, COMMISSION_BASIS_VALUES) &&
    isOptionalEnum(value.fixedCommissionAllocationRule, FIXED_ALLOCATION_VALUES) &&
    isOptionalEnum(value.insufficientTurnoverAction, TURNOVER_ACTION_VALUES) &&
    (value.defaultCheckInTime == null || isNonEmptyString(value.defaultCheckInTime)) &&
    (value.defaultCheckOutTime == null || isNonEmptyString(value.defaultCheckOutTime)) &&
    isOptionalNonNegativeNumber(value.defaultTurnoverMinutes)
  );
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

function validateBooking(value: unknown): value is Booking {
  if (!isObject(value)) return false;
  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.propertyId) ||
    !isNonEmptyString(value.guestName) ||
    !CHANNELS.has(value.channel as Channel) ||
    !BOOKING_STATUSES.has(value.status as BookingStatus) ||
    !isValidDateString(value.checkInDate) ||
    !isValidDateString(value.checkOutDate) ||
    value.checkOutDate <= value.checkInDate
  ) {
    return false;
  }

  return (
    isNonNegativeNumber(value.nightlyRateCents) &&
    isOptionalNonNegativeNumber(value.accommodationTotalCents) &&
    isNonNegativeNumber(value.discountCents) &&
    isNonNegativeNumber(value.cleaningFeeCents) &&
    isNonNegativeNumber(value.adults) &&
    isNonNegativeNumber(value.children)
  );
}

function validateExpense(value: unknown): value is Expense {
  return (
    isObject(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.propertyId) &&
    Number.isInteger(value.year) &&
    Number.isInteger(value.month) &&
    Number(value.month) >= 1 &&
    Number(value.month) <= 12 &&
    isNonEmptyString(value.label) &&
    isNonEmptyString(value.category) &&
    isNonNegativeNumber(value.amountCents) &&
    typeof value.isDeductible === 'boolean'
  );
}

function validateExtraIncome(value: unknown): value is ExtraIncome {
  return (
    isObject(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.propertyId) &&
    Number.isInteger(value.year) &&
    Number.isInteger(value.month) &&
    Number(value.month) >= 1 &&
    Number(value.month) <= 12 &&
    isNonEmptyString(value.label) &&
    isNonNegativeNumber(value.amountCents) &&
    TAX_TREATMENTS.has(value.taxTreatment as TaxTreatment)
  );
}

function findInvalidIndex(values: unknown[], validator: (value: unknown) => boolean): number {
  return values.findIndex((value) => !validator(value));
}

function hasDuplicateIds(values: Array<{ id: string }>): boolean {
  return new Set(values.map((value) => value.id)).size !== values.length;
}

export class ExportImportService {
  public static generateBackup(
    taxConfiguration: TaxConfiguration,
    locations: LocationConfig[],
    properties: PropertyConfig[],
    bookings: Booking[],
    expenses: Expense[],
    extraIncomes: ExtraIncome[],
    userPreferences: UserPreferences,
    activityHistory: ActivityRecord[],
    includePii: boolean = false
  ): BackupData {
    const safeBookings = includePii
      ? bookings
      : bookings.map((booking, index) => ({
          ...booking,
          guestName: `Guest ${String.fromCharCode(65 + (index % 26))}${index + 1}`,
          contactEmail: undefined,
          contactPhone: undefined,
          address: undefined,
          identificationDetails: undefined,
          notes: undefined,
        }));

    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      containsPii: includePii,
      taxConfiguration,
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
        `short_let_backup_${backup.containsPii ? 'FULL_PII' : 'ANONYMIZED'}_${new Date()
          .toISOString()
          .slice(0, 10)}.json`,
      'application/json'
    );
  }

  public static exportBookingsCsv(bookings: Booking[], includePii: boolean = false): void {
    const headers = [
      'Booking ID',
      'Property ID',
      'Guest Name',
      'Channel',
      'Check In Date',
      'Check Out Date',
      'Nightly Rate (€)',
      'Exact Accommodation Total (€)',
      'Cleaning Fee (€)',
      'Discount (€)',
      'Gross Revenue (€)',
      'Commission Rate (%)',
      'Commission (€)',
      'Net Revenue (€)',
      'Status',
      'Booking Ref',
    ];

    const rows = bookings.map((booking, index) => {
      const totals = calculateBookingRevenueAndCommission(booking);
      const guest = includePii
        ? booking.guestName
        : `Guest ${String.fromCharCode(65 + (index % 26))}${index + 1}`;

      return [
        booking.id,
        booking.propertyId,
        guest,
        booking.channel,
        booking.checkInDate,
        booking.checkOutDate,
        euros(booking.nightlyRateCents),
        euros(booking.accommodationTotalCents),
        euros(booking.cleaningFeeCents),
        euros(booking.discountCents),
        euros(totals.grossBookingRevenueCents),
        Number(booking.commissionPercentage ?? 0).toFixed(1),
        euros(totals.otaCommissionCents),
        euros(totals.netBookingRevenueCents),
        booking.status,
        booking.bookingRef || '',
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => csvCell(value)).join(','))
      .join('\n');

    downloadTextFile(
      csvContent,
      `bookings_export_${includePii ? 'pii' : 'no_pii'}_${new Date()
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
  extraIncomes: ExtraIncome[],
  taxConfig: TaxConfiguration
): void {
  const headers = [
    'Property',
    'Gross Booking Revenue (€)',
    'OTA Commission (€)',
    'Net Booking Revenue (€)',
    'Extra Income (€)',
    'Rent (€)',
    'Other Expenses (€)',
    'Total Expenses (€)',
    'Pre-Tax Balance (€)',
    'Calculated Taxes (€)',
    'Net Balance (€)',
    'Status',
  ];

  let totalGross = 0;
  let totalCommission = 0;
  let totalNetBooking = 0;
  let totalExtraIncome = 0;
  let totalRent = 0;
  let totalOtherExpenses = 0;
  let totalExpenses = 0;
  let totalPreTax = 0;
  let totalTaxes = 0;
  let totalNetBalance = 0;
  let allTaxesConfigured = true;

  const rows = ALL_PROPERTIES.map((property) => {
    const financials = calculatePropertyFinancials(
      property.id,
      year,
      month,
      bookings,
      expenses,
      extraIncomes,
      taxConfig
    );
    const periodExpenses = expenses.filter(
      (expense) =>
        expense.propertyId === property.id &&
        expense.year === year &&
        expense.month === month
    );
    const rentCents = periodExpenses
      .filter(isRentExpense)
      .reduce((sum, expense) => sum + expense.amountCents, 0);
    const otherExpensesCents = periodExpenses
      .filter((expense) => !isRentExpense(expense))
      .reduce((sum, expense) => sum + expense.amountCents, 0);
    const preTaxBalanceCents =
      financials.netBookingIncomeCents +
      financials.extraIncomeCents -
      financials.totalExpensesCents;

    totalGross += financials.grossBookingIncomeCents;
    totalCommission += financials.otaCommissionCents;
    totalNetBooking += financials.netBookingIncomeCents;
    totalExtraIncome += financials.extraIncomeCents;
    totalRent += rentCents;
    totalOtherExpenses += otherExpensesCents;
    totalExpenses += financials.totalExpensesCents;
    totalPreTax += preTaxBalanceCents;

    if (financials.isTaxConfigured) {
      totalTaxes += financials.calculatedTaxesCents ?? 0;
      totalNetBalance += financials.netBalanceCents ?? 0;
    } else {
      allTaxesConfigured = false;
    }

    const balance = financials.netBalanceCents ?? preTaxBalanceCents;
    const status = !financials.isTaxConfigured
      ? 'Tax configuration required'
      : balance > 0
        ? 'Profitable'
        : balance < 0
          ? 'Loss'
          : 'Break-even';

    return [
      property.name,
      euros(financials.grossBookingIncomeCents),
      euros(financials.otaCommissionCents),
      euros(financials.netBookingIncomeCents),
      euros(financials.extraIncomeCents),
      euros(rentCents),
      euros(otherExpensesCents),
      euros(financials.totalExpensesCents),
      euros(preTaxBalanceCents),
      euros(financials.calculatedTaxesCents),
      euros(financials.netBalanceCents),
      status,
    ];
  });

  rows.push([
    'PORTFOLIO TOTAL',
    euros(totalGross),
    euros(totalCommission),
    euros(totalNetBooking),
    euros(totalExtraIncome),
    euros(totalRent),
    euros(totalOtherExpenses),
    euros(totalExpenses),
    euros(totalPreTax),
    allTaxesConfigured ? euros(totalTaxes) : '',
    allTaxesConfigured ? euros(totalNetBalance) : '',
    allTaxesConfigured
      ? totalNetBalance > 0
        ? 'Profitable'
        : totalNetBalance < 0
          ? 'Loss'
          : 'Break-even'
      : 'Tax configuration required',
  ]);

  const csvContent = [
    ['Report Year', year],
    ['Report Month', month],
    [],
    headers,
    ...rows,
  ]
    .map((row) => row.map((value) => csvCell(value)).join(','))
    .join('\n');

  downloadTextFile(
    csvContent,
    `financial_summary_${year}_${String(month).padStart(2, '0')}.csv`,
    'text/csv;charset=utf-8;'
  );
}

export function exportJsonBackup(
  taxConfiguration: TaxConfiguration,
  locations: LocationConfig[],
  properties: PropertyConfig[],
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  userPreferences: UserPreferences,
  activityHistory: ActivityRecord[],
  includePii: boolean = false
): void {
  ExportImportService.downloadJsonBackup(
    ExportImportService.generateBackup(
      taxConfiguration,
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
    if (!validateTaxConfiguration(object.taxConfiguration)) {
      return { isValid: false, error: 'Backup contains an invalid tax configuration.' };
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
    if (object.locations != null && !Array.isArray(object.locations)) {
      return { isValid: false, error: 'Backup contains an invalid locations list.' };
    }
    if (object.properties != null && !Array.isArray(object.properties)) {
      return { isValid: false, error: 'Backup contains an invalid properties list.' };
    }
    if (object.activityHistory != null && !Array.isArray(object.activityHistory)) {
      return { isValid: false, error: 'Backup contains an invalid activity history.' };
    }
    if (object.userPreferences != null && !isObject(object.userPreferences)) {
      return { isValid: false, error: 'Backup contains invalid user preferences.' };
    }

    const invalidLocationIndex = Array.isArray(object.locations)
      ? findInvalidIndex(object.locations, validateLocation)
      : -1;
    const invalidPropertyIndex = Array.isArray(object.properties)
      ? findInvalidIndex(object.properties, validateProperty)
      : -1;
    const invalidBookingIndex = findInvalidIndex(object.bookings, validateBooking);
    const invalidExpenseIndex = findInvalidIndex(object.expenses, validateExpense);
    const invalidIncomeIndex = findInvalidIndex(object.extraIncomes, validateExtraIncome);

    if (invalidLocationIndex >= 0) {
      return {
        isValid: false,
        error: `Location record ${invalidLocationIndex + 1} is incomplete or invalid.`,
      };
    }
    if (invalidPropertyIndex >= 0) {
      return {
        isValid: false,
        error: `Property record ${invalidPropertyIndex + 1} is incomplete or invalid.`,
      };
    }
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

    const locations = Array.isArray(object.locations)
      ? (object.locations as LocationConfig[])
      : undefined;
    const properties = Array.isArray(object.properties)
      ? (object.properties as PropertyConfig[])
      : undefined;
    const bookings = object.bookings as Booking[];
    const expenses = object.expenses as Expense[];
    const extraIncomes = object.extraIncomes as ExtraIncome[];

    if (locations && hasDuplicateIds(locations)) {
      return { isValid: false, error: 'Backup contains duplicate location IDs.' };
    }
    if (properties && hasDuplicateIds(properties)) {
      return { isValid: false, error: 'Backup contains duplicate property IDs.' };
    }
    if (hasDuplicateIds(bookings)) {
      return { isValid: false, error: 'Backup contains duplicate booking IDs.' };
    }
    if (hasDuplicateIds(expenses)) {
      return { isValid: false, error: 'Backup contains duplicate expense IDs.' };
    }
    if (hasDuplicateIds(extraIncomes)) {
      return { isValid: false, error: 'Backup contains duplicate extra income IDs.' };
    }

    if (properties) {
      const validLocationIds = new Set(
        (locations ?? LOCATIONS).map((location) => location.id)
      );
      const invalidPropertyLocation = properties.find(
        (property) => !validLocationIds.has(property.locationId)
      );
      if (invalidPropertyLocation) {
        return {
          isValid: false,
          error: `Property ${invalidPropertyLocation.name} references a location that is not included in the backup.`,
        };
      }

      const propertyIds = new Set(properties.map((property) => property.id));
      const orphanBooking = bookings.find((booking) => !propertyIds.has(booking.propertyId));
      const orphanExpense = expenses.find((expense) => !propertyIds.has(expense.propertyId));
      const orphanIncome = extraIncomes.find((income) => !propertyIds.has(income.propertyId));

      if (orphanBooking || orphanExpense || orphanIncome) {
        return {
          isValid: false,
          error: 'Backup contains records linked to a property that is not included in the backup.',
        };
      }
    }

    const normalized: BackupData = {
      version: typeof object.version === 'number' ? object.version : 1,
      exportedAt:
        typeof object.exportedAt === 'string' ? object.exportedAt : new Date().toISOString(),
      containsPii: object.containsPii === true,
      taxConfiguration: {
        ...DEFAULT_TAX_CONFIG,
        ...(object.taxConfiguration as Partial<TaxConfiguration>),
      },
      locations: locations?.map((location) => ({ ...location, properties: [] })),
      properties,
      bookings,
      expenses,
      extraIncomes,
      userPreferences: isObject(object.userPreferences)
        ? ({ ...DEFAULT_USER_PREFERENCES, ...object.userPreferences } as UserPreferences)
        : { ...DEFAULT_USER_PREFERENCES },
      activityHistory: Array.isArray(object.activityHistory)
        ? (object.activityHistory as ActivityRecord[])
        : [],
    };

    return { isValid: true, data: normalized };
  } catch {
    return { isValid: false, error: 'Failed to parse JSON file format.' };
  }
}
