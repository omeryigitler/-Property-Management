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
import { calculateBookingRevenueAndCommission } from './financialCalculationService';

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
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      filename ||
      `short_let_backup_${backup.containsPii ? 'FULL_PII' : 'ANONYMIZED'}_${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        `"${guest.replace(/"/g, '""')}"`,
        booking.channel,
        booking.checkInDate,
        booking.checkOutDate,
        (booking.nightlyRateCents / 100).toFixed(2),
        (booking.cleaningFeeCents / 100).toFixed(2),
        (booking.discountCents / 100).toFixed(2),
        (totals.grossBookingRevenueCents / 100).toFixed(2),
        (booking.commissionPercentage || 0).toFixed(1),
        (totals.otaCommissionCents / 100).toFixed(2),
        (totals.netBookingRevenueCents / 100).toFixed(2),
        booking.status,
        booking.bookingRef || '',
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookings_export_${includePii ? 'pii' : 'no_pii'}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
  const headers = ['Metric', 'Amount'];
  const rows = [
    ['Year', year.toString()],
    ['Month', month.toString()],
    ['Total Bookings Count', bookings.length.toString()],
    ['Total Expenses Count', expenses.length.toString()],
    ['Total Extra Incomes Count', extraIncomes.length.toString()],
    ['Accommodation VAT Rate', String(taxConfig.accommodationVatRate ?? '')],
    ['Income Tax Rate', String(taxConfig.incomeTaxRate ?? '')],
  ];

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `financial_summary_${year}_${month}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
    if (
      object &&
      typeof object === 'object' &&
      Array.isArray((object as BackupData).bookings) &&
      (object as BackupData).taxConfiguration
    ) {
      return { isValid: true, data: object as BackupData };
    }
    return {
      isValid: false,
      error: 'File is missing the required bookings array or tax configuration.',
    };
  } catch {
    return { isValid: false, error: 'Failed to parse JSON file format.' };
  }
}
