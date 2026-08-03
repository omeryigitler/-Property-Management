import React from 'react';
import { X, Settings, RotateCcw } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';

export function SettingsModal() {
  const activeModal = useDashboardStore((s) => s.activeModal);
  const closeModal = useDashboardStore((s) => s.closeModal);
  const prefs = useDashboardStore((s) => s.userPreferences);
  const updateUserPreferences = useDashboardStore((s) => s.updateUserPreferences);
  const resetDefaultSeedData = useDashboardStore((s) => s.resetDefaultSeedData);
  const openConfirmation = useDashboardStore((s) => s.openConfirmation);

  if (activeModal !== 'settings') return null;

  const handleReset = () => {
    openConfirmation({
      title: 'Reset Application Data?',
      message: 'This will restore default properties, sample bookings, and tax configuration. Any unsaved custom data will be overwritten.',
      confirmText: 'Reset All Data',
      variant: 'danger',
      onConfirm: () => {
        resetDefaultSeedData();
        closeModal();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl text-slate-100 flex flex-col max-h-[85dvh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-slate-100">Display & User Preferences</h3>
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
          {/* Toggles */}
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-200">Sticky Daily Total Column</span>
                <span className="text-xs text-slate-400">Keep 'DAILY TOTAL' pinned on the right of the grid</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.stickyDailyTotal}
                onChange={(e) => updateUserPreferences({ stickyDailyTotal: e.target.checked })}
                className="w-4 h-4 text-cyan-600 bg-slate-900 border-slate-700 rounded focus:ring-cyan-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-200">Highlight Provisional Bookings</span>
                <span className="text-xs text-slate-400">Show distinctive striped pattern for unconfirmed bookings</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.showProvisionalBlock}
                onChange={(e) => updateUserPreferences({ showProvisionalBlock: e.target.checked })}
                className="w-4 h-4 text-cyan-600 bg-slate-900 border-slate-700 rounded focus:ring-cyan-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-200">Compact Density Rows</span>
                <span className="text-xs text-slate-400">Reduce cell padding for high-density screen view</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.compactGridRows}
                onChange={(e) => updateUserPreferences({ compactGridRows: e.target.checked })}
                className="w-4 h-4 text-cyan-600 bg-slate-900 border-slate-700 rounded focus:ring-cyan-500"
              />
            </label>
          </div>

          {/* Reset Seed Data */}
          <div className="pt-4 border-t border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2">Danger Zone</h4>
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/50 flex items-center justify-between gap-3">
              <div>
                <h5 className="text-xs font-bold text-rose-200">Reset Demo Seed Data</h5>
                <p className="text-[11px] text-rose-300/80">Restores default 10 properties, bookings, and tax settings.</p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-900 hover:bg-rose-800 text-rose-100 text-xs font-semibold border border-rose-700 transition-colors flex-shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900/90">
          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
