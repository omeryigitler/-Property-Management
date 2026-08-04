import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
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

export function ExportImportModal() {
  const activeModal = useDashboardStore((state) => state.activeModal);
  const modalParams = useDashboardStore((state) => state.modalParams);
  const closeModal = useDashboardStore((state) => state.closeModal);
  const openModal = useDashboardStore((state) => state.openModal);

  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const taxConfiguration = useDashboardStore((state) => state.taxConfiguration);
  const bookings = useDashboardStore((state) => state.bookings);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);
  const userPreferences = useDashboardStore((state) => state.userPreferences);
  const activityHistory = useDashboardStore((state) => state.activityHistory);

  const importBackupData = useDashboardStore((state) => state.importBackupData);
  const openConfirmation = useDashboardStore((state) => state.openConfirmation);
  const properties = usePropertyStore((state) => state.properties);
  const replaceProperties = usePropertyStore((state) => state.replaceProperties);

  const [importPreview, setImportPreview] = useState<BackupData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  if (activeModal !== 'export_import') return null;

  const returnToSettings = Boolean(modalParams.returnToSettings);
  const handleClose = () => {
    if (returnToSettings) {
      openModal('settings', { section: modalParams.returnSection || 'data' });
    } else {
      closeModal();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const content = loadEvent.target?.result as string;
      const validation = validateBackupJson(content);
      if (validation.isValid && validation.data) {
        setImportPreview(validation.data);
        setImportError(null);
      } else {
        setImportPreview(null);
        setImportError(validation.error || 'Invalid backup file schema.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;

    openConfirmation({
      title: 'Replace Current Application Data?',
      message: `You are about to import ${importPreview.bookings.length} bookings, ${importPreview.expenses.length} expenses and ${importPreview.properties?.length ?? properties.length} properties. Current data will be replaced.`,
      confirmText: 'Import & Overwrite',
      variant: 'danger',
      onConfirm: () => {
        if (importPreview.properties?.length) {
          replaceProperties(importPreview.properties);
        }
        importBackupData(importPreview);
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
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-900 text-slate-100 shadow-2xl sm:h-auto sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-slate-700/90">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5">
            <Download className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100 sm:text-lg">Data Import & Export</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            {returnToSettings ? <ArrowLeft className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] no-scrollbar sm:p-6">
          <section className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Export Options</h4>
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
                    <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">Financial Summary CSV</span>
                    <p className="text-[11px] text-slate-400">Selected month summary</p>
                  </div>
                </div>
                <Download className="h-4 w-4 text-slate-500 group-hover:text-cyan-400" />
              </button>

              <button
                type="button"
                onClick={() => exportBookingsCsv(bookings)}
                className="group flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-left transition-all hover:border-cyan-500/50 hover:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">All Bookings CSV</span>
                    <p className="text-[11px] text-slate-400">Export {bookings.length} reservations</p>
                  </div>
                </div>
                <Download className="h-4 w-4 text-slate-500 group-hover:text-cyan-400" />
              </button>

              <button
                type="button"
                onClick={() =>
                  exportJsonBackup(
                    taxConfiguration,
                    properties,
                    bookings,
                    expenses,
                    extraIncomes,
                    userPreferences,
                    activityHistory
                  )
                }
                className="group flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-left transition-all hover:border-violet-500/50 hover:bg-slate-900 sm:col-span-2"
              >
                <div className="flex items-center gap-3">
                  <Download className="h-5 w-5 text-violet-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-violet-300">Complete JSON Backup</span>
                    <p className="text-[11px] text-slate-400">Properties, bookings, finance, tax and settings</p>
                  </div>
                </div>
                <span className="rounded-md border border-violet-800 bg-violet-950 px-2.5 py-1 text-[10px] font-bold text-violet-300">Full Backup</span>
              </button>
            </div>
          </section>

          <section className="space-y-3 border-t border-slate-800 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Restore System Backup</h4>
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 p-6 transition-colors hover:border-amber-500/50">
                <Upload className="mb-2 h-8 w-8 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">Select JSON Backup File</span>
                <span className="text-[11px] text-slate-400">Browse from your device</span>
                <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
              </label>

              {importError && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-800 bg-rose-950/80 p-3 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400" />
                  <span>{importError}</span>
                </div>
              )}

              {importPreview && (
                <div className="space-y-2 rounded-lg border border-amber-800/80 bg-amber-950/40 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <CheckCircle2 className="h-4 w-4 text-amber-400" />
                    <span>Backup Verified</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-300">
                    <li>Properties: {importPreview.properties?.length ?? 'Legacy backup'}</li>
                    <li>Bookings: {importPreview.bookings.length}</li>
                    <li>Expenses: {importPreview.expenses.length}</li>
                    <li>Extra income: {importPreview.extraIncomes.length}</li>
                  </ul>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="mt-2 w-full rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
                  >
                    Confirm Import & Overwrite
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="flex flex-shrink-0 justify-end border-t border-slate-800 bg-slate-900/95 p-3 sm:p-4">
          <button
            type="button"
            onClick={handleClose}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 text-xs font-semibold text-slate-200 hover:bg-slate-700 sm:w-auto"
          >
            {returnToSettings && <ArrowLeft className="h-3.5 w-3.5" />}
            {returnToSettings ? 'Back to Settings' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
