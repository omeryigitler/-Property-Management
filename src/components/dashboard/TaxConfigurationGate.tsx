import React from 'react';
import { AlertTriangle, Settings, ArrowRight } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { getMissingTaxFields } from '../../utils/taxCalculations';

export function TaxConfigurationGate() {
  const taxConfig = useDashboardStore((state) => state.taxConfiguration);
  const openModal = useDashboardStore((state) => state.openModal);
  const missingFields = getMissingTaxFields(taxConfig);

  if (missingFields.length === 0) return null;

  return (
    <div className="flex w-full flex-col items-start justify-between gap-3 rounded-xl border border-amber-600/70 bg-amber-950/70 p-3 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex-shrink-0 rounded-lg border border-amber-700/80 bg-amber-900/80 p-2 text-amber-300">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wide text-amber-200 sm:text-sm">
              Tax Configuration Required
            </span>
            <span className="rounded-full border border-amber-700/60 bg-amber-900/80 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
              Net Balance Locked
            </span>
          </div>
          <p className="mt-1 text-xs text-amber-200/80">
            {missingFields.map((field) => field.label).join(', ')} must be completed in Settings.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => openModal('settings', { section: 'data' })}
        className="flex h-10 w-full flex-shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-xs font-bold text-slate-950 shadow-lg hover:bg-amber-400 sm:w-auto"
      >
        <Settings className="h-4 w-4" />
        <span>Open Settings</span>
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
