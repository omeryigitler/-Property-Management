import {
  ActivityRecord,
  BackupData,
  Booking,
  Expense,
  ExtraIncome,
  PropertyConfig,
  TaxConfiguration,
  UserPreferences,
} from '../types';
import { ALL_PROPERTIES } from '../config/locations';
import {
  calculateBookingRevenueAndCommission,
  calculatePropertyFinancials,
} from './financialCalculationService';
import { DEFAULT_USER_PREFERENCES } from './persistenceRepository';
import { isRentExpense } from '../utils/expenseUtilities';

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
  return cents == null ? '' : (cents / 100).toFixed(2);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export class ExportImportService {
  public static generateBackup(
    taxConfiguration: TaxConfiguration,
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
      version: 1,
      exportedAt: new Date().toISOString(),
      containsPii: includePii,
      taxConfiguration,
      properties,
      bookings: safeBookings,
      expenses,
      extraIncomes,
      userPreferences,
      activityHistory,
    };
  }

  public static downloadJsonBackup(backup: BackupData, filename?: string): void {
    const jsonString = JSON.stringify(backup, null, 2);
    downloadTextFile(
      jsonString,
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
        euros(booking.cleaningFeeCents),
        euros(booking.discountCents),
        euros(totals.grossBookingRevenueCents),
        (booking.commissionPercentage || 0).toFixed(1),
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

  const metadataRows = [
    ['Report Year', year],
    ['Report Month', month],
    [],
  ];

  const csvContent = [...metadataRows, headers, ...rows]
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
  properties: PropertyConfig[],
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  userPreferences: UserPreferences,
  activityHistory: ActivityRecord[],
  includePii: boolean = false
): void {
  const backup = ExportImportService.generateBackup(
    taxConfiguration,
    properties,
    bookings,
    expenses,
    extraIncomes,
    userPreferences,
    activityHistory,
    includePii
  );
  ExportImportService.downloadJsonBackup(backup);
}

export function validateBackupJson(
  jsonInput: string | unknown
): { isValid: boolean; data?: BackupData; error?: string } {
  try {
    const object = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;

    if (!isObject(object)) {
      return { isValid: false, error: 'Backup file must contain a JSON object.' };
    }
    if (!isObject(object.taxConfiguration)) {
      return { isValid: false, error: 'Backup is missing a valid tax configuration.' };
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
    if (object.properties != null && !Array.isArray(object.properties)) {
      return { isValid: false, error: 'Backup contains an invalid properties list.' };
    }
    if (object.activityHistory != null && !Array.isArray(object.activityHistory)) {
      return { isValid: false, error: 'Backup contains an invalid activity history.' };
    }
    if (object.userPreferences != null && !isObject(object.userPreferences)) {
      return { isValid: false, error: 'Backup contains invalid user preferences.' };
    }

    const normalized: BackupData = {
      version: typeof object.version === 'number' ? object.version : 1,
      exportedAt:
        typeof object.exportedAt === 'string' ? object.exportedAt : new Date().toISOString(),
      containsPii: object.containsPii === true,
      taxConfiguration: object.taxConfiguration as unknown as TaxConfiguration,
      properties: Array.isArray(object.properties)
        ? (object.properties as PropertyConfig[])
        : undefined,
      bookings: object.bookings as Booking[],
      expenses: object.expenses as Expense[],
      extraIncomes: object.extraIncomes as ExtraIncome[],
      userPreferences: isObject(object.userPreferences)
        ? ({ ...DEFAULT_USER_PREFERENCES, ...object.userPreferences } as UserPreferences)
        : DEFAULT_USER_PREFERENCES,
      activityHistory: Array.isArray(object.activityHistory)
        ? (object.activityHistory as ActivityRecord[])
        : [],
    };

    return { isValid: true, data: normalized };
  } catch {
    return { isValid: false, error: 'Failed to parse JSON file format.' };
  }
}
