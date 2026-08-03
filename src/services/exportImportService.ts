import { BackupData, Booking, Expense, ExtraIncome, TaxConfiguration, UserPreferences, ActivityRecord } from '../types';
import { maskGuestName, maskContact } from '../utils/privacy';

export class ExportImportService {
  /**
   * Generates JSON backup payload.
   */
  public static generateBackup(
    taxConfiguration: TaxConfiguration,
    bookings: Booking[],
    expenses: Expense[],
    extraIncomes: ExtraIncome[],
    userPreferences: UserPreferences,
    activityHistory: ActivityRecord[],
    includePii: boolean = false
  ): BackupData {
    const safeBookings = includePii
      ? bookings
      : bookings.map((b, idx) => ({
          ...b,
          guestName: `Guest ${String.fromCharCode(65 + (idx % 26))}${idx + 1}`,
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
      bookings: safeBookings,
      expenses,
      extraIncomes,
      userPreferences,
      activityHistory,
    };
  }

  /**
   * Triggers browser download of JSON backup.
   */
  public static downloadJsonBackup(backup: BackupData, filename?: string): void {
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `short_let_backup_${backup.containsPii ? 'FULL_PII' : 'ANONYMIZED'}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generates CSV export for Bookings. Guest details stripped by default.
   */
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

    const rows = bookings.map((b, idx) => {
      const gross = (b.nightlyRateCents * 5 + b.cleaningFeeCents - b.discountCents) / 100;
      const comm = (gross * (b.commissionPercentage || 0)) / 100;
      const net = gross - comm;

      const guest = includePii ? b.guestName : `Guest ${String.fromCharCode(65 + (idx % 26))}${idx + 1}`;

      return [
        b.id,
        b.propertyId,
        `"${guest.replace(/"/g, '""')}"`,
        b.channel,
        b.checkInDate,
        b.checkOutDate,
        (b.nightlyRateCents / 100).toFixed(2),
        (b.cleaningFeeCents / 100).toFixed(2),
        (b.discountCents / 100).toFixed(2),
        gross.toFixed(2),
        (b.commissionPercentage || 0).toFixed(1),
        comm.toFixed(2),
        net.toFixed(2),
        b.status,
        b.bookingRef || '',
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookings_export_${includePii ? 'pii' : 'no_pii'}_${new Date().toISOString().slice(0, 10)}.csv`;
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
  const headers = ['Metric', 'Amount (€)'];
  const rows = [
    ['Year', year.toString()],
    ['Month', month.toString()],
    ['Total Bookings Count', bookings.length.toString()],
    ['Total Expenses Count', expenses.length.toString()],
    ['Total Extra Incomes Count', extraIncomes.length.toString()],
  ];

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
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
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  userPreferences: UserPreferences,
  activityHistory: ActivityRecord[],
  includePii: boolean = false
): void {
  const backup = ExportImportService.generateBackup(
    taxConfiguration,
    bookings,
    expenses,
    extraIncomes,
    userPreferences,
    activityHistory,
    includePii
  );
  ExportImportService.downloadJsonBackup(backup);
}

export function validateBackupJson(jsonInput: string | any): { isValid: boolean; data?: BackupData; error?: string } {
  try {
    const obj = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
    if (
      obj &&
      typeof obj === 'object' &&
      Array.isArray(obj.bookings) &&
      obj.taxConfiguration
    ) {
      return { isValid: true, data: obj as BackupData };
    }
    return { isValid: false, error: 'File is missing required bookings array or tax configuration.' };
  } catch (e) {
    return { isValid: false, error: 'Failed to parse JSON file format.' };
  }
}

