import React, { useState } from 'react';
import { X, Download, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import {
  exportBookingsCsv,
  exportFinancialSummaryCsv,
  exportJsonBackup,
  validateBackupJson,
} from '../../services/exportImportService';
import { BackupData } from '../../types';

export function ExportImportModal() {
  const activeModal = useDashboardStore((s) => s.activeModal);
  const closeModal = useDashboardStore((s) => s.closeModal);

  const selectedMonth = useDashboardStore((s) => s.selectedMonth);
  const selectedYear = useDashboardStore((s) => s.selectedYear);
  const taxConfiguration = useDashboardStore((s) => s.taxConfiguration);
  const bookings = useDashboardStore((s) => s.bookings);
  const expenses = useDashboardStore((s) => s.expenses);
  const extraIncomes = useDashboardStore((s) => s.extraIncomes);
  const userPreferences = useDashboardStore((s) => s.userPreferences);
  const activityHistory = useDashboardStore((s) => s.activityHistory);

  const importBackupData = useDashboardStore((s) => s.importBackupData);
  const openConfirmation = useDashboardStore((s) => s.openConfirmation);

  const [importPreview, setImportPreview] = useState<BackupData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  if (activeModal !== 'export_import') return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const valRes = validateBackupJson(content);
      if (valRes.isValid && valRes.data) {
        setImportPreview(valRes.data);
        setImportError(null);
      } else {
        setImportPreview(null);
        setImportError(valRes.error || 'Invalid backup file schema.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;

    openConfirmation({
      title: 'Replace Current Application Data?',
      message: `You are about to import ${importPreview.bookings.length} bookings and ${importPreview.expenses.length} expense records. Current data will be replaced.`,
      confirmText: 'Import & Overwrite',
      variant: 'danger',
      onConfirm: () => {
        importBackupData(importPreview);
        closeModal();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl text-slate-100 flex flex-col max-h-[88dvh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-slate-100">Data Import & Export Hub</h3>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Export Options */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Export Options</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  exportFinancialSummaryCsv(selectedYear, selectedMonth, bookings, expenses, extraIncomes, taxConfiguration)
                }
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">Financial Summary CSV</span>
                    <p className="text-[11px] text-slate-400">Monthly breakdown for {selectedMonth}/{selectedYear}</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
              </button>

              <button
                type="button"
                onClick={() => exportBookingsCsv(bookings)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">All Bookings CSV</span>
                    <p className="text-[11px] text-slate-400">Export all {bookings.length} reservations</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
              </button>

              <button
                type="button"
                onClick={() =>
                  exportJsonBackup(taxConfiguration, bookings, expenses, extraIncomes, userPreferences, activityHistory)
                }
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition-all text-left group sm:col-span-2"
              >
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-purple-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">Complete JSON System Backup</span>
                    <p className="text-[11px] text-slate-400">Full dump of bookings, expenses, extra income & tax configuration</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-purple-950 text-purple-300 text-[10px] font-bold border border-purple-800">
                  Full Backup
                </span>
              </button>
            </div>
          </div>

          {/* Import Backup Section */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Restore System Backup</h4>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-xl cursor-pointer bg-slate-900/50 transition-colors">
                <Upload className="w-8 h-8 text-amber-400 mb-2" />
                <span className="text-xs font-bold text-slate-200">Select JSON Backup File</span>
                <span className="text-[11px] text-slate-400">Drag & drop or browse from your computer</span>
                <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
              </label>

              {importError && (
                <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{importError}</span>
                </div>
              )}

              {importPreview && (
                <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-800/80 space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>Backup Verified & Validated</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    <li>Bookings Count: {importPreview.bookings.length}</li>
                    <li>Expense Records: {importPreview.expenses.length}</li>
                    <li>Extra Income Entries: {importPreview.extraIncomes.length}</li>
                    <li>
                      Tax Config: {importPreview.taxConfiguration.accommodationVatRate}% Acc VAT, {importPreview.taxConfiguration.incomeTaxRate}% Income Tax
                    </li>
                  </ul>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="w-full mt-2 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors shadow-lg"
                  >
                    Confirm Import & Overwrite
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900/90">
          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
