import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  LockKeyhole,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { usePropertyStore } from '../../store/usePropertyStore';
import {
  exportBookingsCsv,
  exportFinancialSummaryCsv,
  exportJsonBackup,
  validateBackupJson,
} from '../../services/exportImportService';
import { BackupData } from '../../types';

const MAX_BACKUP_FILE_BYTES = 5 * 1024 * 1024;

export function ExportImportModal() {
  const activeModal = useDashboardStore((state) => state.activeModal);
  const modalParams = useDashboardStore((state) => state.modalParams);
  const closeModal = useDashboardStore((state) => state.closeModal);
  const openModal = useDashboardStore((state) => state.openModal);
  const openConfirmation = useDashboardStore((state) => state.openConfirmation);
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const taxConfiguration = useDashboardStore((state) => state.taxConfiguration);
  const bookings = useDashboardStore((state) => state.bookings);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);
  const userPreferences = useDashboardStore((state) => state.userPreferences);
  const activityHistory = useDashboardStore((state) => state.activityHistory);
  const importBackupData = useDashboardStore((state) => state.importBackupData);

  const properties = usePropertyStore((state) => state.properties);
  const replaceProperties = usePropertyStore((state) => state.replaceProperties);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importPreview, setImportPreview] = useState<BackupData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  if (activeModal !== 'export_import') return null;

  const returnToSettings = Boolean(modalParams.returnToSettings);
  const handleClose = () => {
    if (returnToSettings) {
      openModal('settings', {
        section: modalParams.returnSection || 'data',
      });
    } else {
      closeModal();
    }
  };

  const exportBackup = (includePii: boolean) => {
    exportJsonBackup(
      taxConfiguration,
      properties,
      bookings,
      expenses,
      extraIncomes,
      userPreferences,
      activityHistory,
      includePii
    );
  };

  const handleFullBackup = () => {
    openConfirmation({
      title: 'Export Full Restorable Backup?',
      message:
        'This file includes guest names, contact details and operational notes. Store it securely and do not share it through public channels.',
      confirmText: 'Export Full Backup',
      variant: 'warning',
      onConfirm: () => exportBackup(true),
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportPreview(null);
    setImportError(null);

    if (file.size > MAX_BACKUP_FILE_BYTES) {
      setImportError('Backup file exceeds the 5 MB safety limit.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const validation = validateBackupJson(loadEvent.target?.result as string);
      if (validation.isValid && validation.data) {
        setImportPreview(validation.data);
        setImportError(null);
      } else {
        setImportPreview(null);
        setImportError(validation.error || 'Invalid backup file schema.');
      }
    };
    reader.onerror = () => {
      setImportPreview(null);
      setImportError('The selected backup file could not be read.');
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;

    openConfirmation({
      title: 'Replace Current Application Data?',
      message: `Import ${importPreview.bookings.length} bookings, ${importPreview.expenses.length} expenses, ${importPreview.extraIncomes.length} extra-income records and ${importPreview.properties?.length ?? properties.length} properties. Current data will be replaced.`,
      confirmText: 'Import & Overwrite',
      variant: 'danger',
      onConfirm: () => {
        if (importPreview.properties?.length) {
          replaceProperties(importPreview.properties);
        }
        importBackupData(importPreview);
        setImportPreview(null);
        setImportError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        if (returnToSettings) {
          openModal('settings', { section: 'data' });
        } else {
          closeModal();
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-0 backdrop-blur-md sm:p-4">
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-900 text-slate-100 shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:max-w-3xl sm:rounded-2xl sm:border sm:border-slate-700/90">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5">
            <Download className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-slate-100 sm:text-lg">
                Data Import & Export
              </h3>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Reports, privacy-safe exports and full system restore
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            aria-label={returnToSettings ? 'Back to settings' : 'Close data tools'}
          >
            {returnToSettings ? (
              <ArrowLeft className="h-5 w-5" />
            ) : (
              <X className="h-5 w-5" />
            )}
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] no-scrollbar sm:p-6">
          <section className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Reports & Privacy-Safe Exports
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  exportFinancialSummaryCsv(
                    selectedYear,
                    selectedMonth,
                    bookings,
                    expenses,
                    extraIncomes,
                    taxConfiguration
                  )
                }
                className="group flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-left transition-all hover:border-cyan-500/50 hover:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-emerald-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">
                      Financial Summary CSV
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Property and portfolio totals for the selected month
                    </p>
                  </div>
                </div>
                <Download className="h-4 w-4 text-slate-500 group-hover:text-cyan-400" />
              </button>

              <button
                type="button"
                onClick={() => exportBookingsCsv(bookings, false)}
                className="group flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-left transition-all hover:border-cyan-500/50 hover:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">
                      Anonymized Bookings CSV
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {bookings.length} reservations without guest PII
                    </p>
                  </div>
                </div>
                <Download className="h-4 w-4 text-slate-500 group-hover:text-cyan-400" />
              </button>

              <button
                type="button"
                onClick={() => exportBackup(false)}
                className="group flex items-center justify-between rounded-xl border border-emerald-900/70 bg-emerald-950/15 p-3.5 text-left transition-all hover:border-emerald-600 hover:bg-emerald-950/30"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300">
                      Privacy-Safe JSON Backup
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Full operational structure with anonymized guests
                    </p>
                  </div>
                </div>
                <span className="rounded-md border border-emerald-800 bg-emerald-950 px-2 py-1 text-[9px] font-black uppercase text-emerald-300">
                  No PII
                </span>
              </button>

              <button
                type="button"
                onClick={handleFullBackup}
                className="group flex items-center justify-between rounded-xl border border-violet-800/80 bg-violet-950/20 p-3.5 text-left transition-all hover:border-violet-500 hover:bg-violet-950/40"
              >
                <div className="flex items-center gap-3">
                  <LockKeyhole className="h-5 w-5 text-violet-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-violet-300">
                      Full Restorable JSON Backup
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Includes guest details required for a complete restore
                    </p>
                  </div>
                </div>
                <span className="rounded-md border border-violet-700 bg-violet-950 px-2 py-1 text-[9px] font-black uppercase text-violet-300">
                  Contains PII
                </span>
              </button>
            </div>
          </section>

          <section className="space-y-3 border-t border-slate-800 pt-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Restore System Backup
            </h4>
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 p-6 text-center transition-colors hover:border-amber-500/50">
                <Upload className="mb-2 h-8 w-8 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">
                  Select JSON Backup File
                </span>
                <span className="text-[11px] text-slate-400">
                  Validated locally · maximum 5 MB
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {importError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-800 bg-rose-950/80 p-3 text-xs text-rose-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-400" />
                  <span>{importError}</span>
                </div>
              )}

              {importPreview && (
                <div className="space-y-3 rounded-lg border border-amber-800/80 bg-amber-950/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                      <CheckCircle2 className="h-4 w-4 text-amber-400" />
                      <span>Backup Verified</span>
                    </div>
                    <span
                      className={`rounded-md border px-2 py-1 text-[9px] font-black uppercase ${
                        importPreview.containsPii
                          ? 'border-violet-700 bg-violet-950 text-violet-300'
                          : 'border-emerald-800 bg-emerald-950 text-emerald-300'
                      }`}
                    >
                      {importPreview.containsPii ? 'Contains PII' : 'Anonymized'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 sm:grid-cols-4">
                    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
                      <span className="block text-[9px] uppercase text-slate-500">Properties</span>
                      <strong>{importPreview.properties?.length ?? 'Legacy'}</strong>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
                      <span className="block text-[9px] uppercase text-slate-500">Bookings</span>
                      <strong>{importPreview.bookings.length}</strong>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
                      <span className="block text-[9px] uppercase text-slate-500">Expenses</span>
                      <strong>{importPreview.expenses.length}</strong>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
                      <span className="block text-[9px] uppercase text-slate-500">Extra Income</span>
                      <strong>{importPreview.extraIncomes.length}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="w-full rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
                  >
                    Confirm Import & Overwrite
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="flex flex-shrink-0 justify-end border-t border-slate-800 bg-slate-900/95 p-3 sm:p-4">
          <button
            type="button"
            onClick={handleClose}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 text-xs font-semibold text-slate-200 hover:bg-slate-700 sm:w-auto"
          >
            {returnToSettings && <ArrowLeft className="h-3.5 w-3.5" />}
            {returnToSettings ? 'Back to Settings' : 'Close'}
          </button>
        </footer>
      </div>
    </div>
  );
}
