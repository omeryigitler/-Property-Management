import React, { useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Download, FileText, LockKeyhole, ShieldCheck, Upload, X } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { usePropertyStore } from '../../store/usePropertyStore';
import { exportBookingsCsv, exportFinancialSummaryCsv, exportJsonBackup, validateBackupJson } from '../../services/exportImportService';
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
  const bookings = useDashboardStore((state) => state.bookings);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);
  const userPreferences = useDashboardStore((state) => state.userPreferences);
  const activityHistory = useDashboardStore((state) => state.activityHistory);
  const importBackupData = useDashboardStore((state) => state.importBackupData);
  const locations = usePropertyStore((state) => state.locations);
  const properties = usePropertyStore((state) => state.properties);
  const replaceCatalog = usePropertyStore((state) => state.replaceCatalog);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<BackupData | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (activeModal !== 'export_import') return null;
  const returnToSettings = Boolean(modalParams.returnToSettings);
  const handleClose = () => returnToSettings ? openModal('settings', { section: modalParams.returnSection || 'data' }) : closeModal();
  const exportBackup = (includePii: boolean) => exportJsonBackup(locations, properties, bookings, expenses, extraIncomes, userPreferences, activityHistory, includePii);

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreview(null); setError(null);
    if (file.size > MAX_BACKUP_FILE_BYTES) { setError('Backup file exceeds the 5 MB limit.'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = validateBackupJson(loadEvent.target?.result as string);
      if (result.isValid && result.data) setPreview(result.data);
      else setError(result.error || 'Invalid backup file.');
    };
    reader.onerror = () => setError('The selected backup file could not be read.');
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!preview) return;
    openConfirmation({
      title: 'Replace Current Application Data?',
      message: `Import ${preview.bookings.length} bookings, ${preview.expenses.length} expenses and ${preview.extraIncomes.length} income records. Current data will be replaced.`,
      confirmText: 'Import & Overwrite',
      variant: 'danger',
      onConfirm: () => {
        if (preview.properties?.length) replaceCatalog(preview.locations, preview.properties);
        importBackupData(preview);
        setPreview(null); setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (returnToSettings) openModal('settings', { section: 'data' }); else closeModal();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-0 backdrop-blur-md sm:p-4">
      <div className="relative flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden bg-slate-900 text-slate-100 shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl sm:border sm:border-slate-700">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-4 sm:px-6"><div className="flex items-center gap-2.5"><Download className="h-5 w-5 text-cyan-400" /><div><h3 className="text-lg font-bold">Data Import & Export</h3><p className="text-[10px] uppercase text-slate-500">Reports and backups</p></div></div><button type="button" onClick={handleClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">{returnToSettings ? <ArrowLeft className="h-5 w-5" /> : <X className="h-5 w-5" />}</button></header>
        <div className="flex-1 space-y-6 overflow-y-auto p-4 no-scrollbar sm:p-6">
          <section className="space-y-3"><h4 className="text-xs font-bold uppercase text-cyan-400">Exports</h4><div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => exportFinancialSummaryCsv(selectedYear, selectedMonth, bookings, expenses, extraIncomes)} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4 text-left"><span className="flex items-center gap-3"><FileText className="h-5 w-5 text-emerald-400" /><span><strong className="block text-xs">Financial Summary CSV</strong><small className="text-slate-500">Selected month</small></span></span><Download className="h-4 w-4 text-slate-500" /></button>
            <button type="button" onClick={() => exportBookingsCsv(bookings, false)} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4 text-left"><span className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-blue-400" /><span><strong className="block text-xs">Anonymous Bookings CSV</strong><small className="text-slate-500">Guest names hidden</small></span></span><Download className="h-4 w-4 text-slate-500" /></button>
            <button type="button" onClick={() => exportBackup(false)} className="flex items-center gap-3 rounded-xl border border-emerald-900 bg-emerald-950/15 p-4 text-left"><ShieldCheck className="h-5 w-5 text-emerald-400" /><span><strong className="block text-xs">Privacy-Safe JSON Backup</strong><small className="text-slate-500">Guest names anonymized</small></span></button>
            <button type="button" onClick={() => openConfirmation({ title: 'Export Full Backup?', message: 'This file contains guest names. Store it securely.', confirmText: 'Export Full Backup', variant: 'warning', onConfirm: () => exportBackup(true) })} className="flex items-center gap-3 rounded-xl border border-violet-800 bg-violet-950/20 p-4 text-left"><LockKeyhole className="h-5 w-5 text-violet-400" /><span><strong className="block text-xs">Full JSON Backup</strong><small className="text-slate-500">Includes guest names</small></span></button>
          </div></section>
          <section className="space-y-3 border-t border-slate-800 pt-5"><h4 className="text-xs font-bold uppercase text-amber-400">Restore Backup</h4><label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950 p-6 text-center"><Upload className="mb-2 h-8 w-8 text-amber-400" /><span className="text-xs font-bold">Select JSON Backup</span><span className="text-[11px] text-slate-500">Older backups are converted to the simplified data model during import.</span><input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleFile} className="hidden" /></label>
            {error && <div className="flex gap-2 rounded-lg border border-rose-800 bg-rose-950/80 p-3 text-xs text-rose-300"><AlertCircle className="h-4 w-4 flex-shrink-0" />{error}</div>}
            {preview && <div className="space-y-3 rounded-xl border border-amber-800 bg-amber-950/30 p-4"><div className="flex items-center gap-2 text-xs font-bold text-amber-300"><CheckCircle2 className="h-4 w-4" /> Backup Verified</div><div className="grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded bg-slate-950 p-2"><small className="block text-slate-500">Bookings</small><strong>{preview.bookings.length}</strong></div><div className="rounded bg-slate-950 p-2"><small className="block text-slate-500">Expenses</small><strong>{preview.expenses.length}</strong></div><div className="rounded bg-slate-950 p-2"><small className="block text-slate-500">Income</small><strong>{preview.extraIncomes.length}</strong></div></div><button type="button" onClick={confirmImport} className="w-full rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-slate-950">Confirm Import & Overwrite</button></div>}
          </section>
        </div>
      </div>
    </div>
  );
}
