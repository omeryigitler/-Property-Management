import React from 'react';
import { AlertTriangle, Settings, ArrowRight } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { getMissingTaxFields } from '../../utils/taxCalculations';

export function TaxConfigurationGate() {
  const taxConfig = useDashboardStore((s) => s.taxConfiguration);
  const openModal = useDashboardStore((s) => s.openModal);

  const missingFields = getMissingTaxFields(taxConfig);

  if (missingFields.length === 0) return null;

  return (
    <div className="w-full bg-amber-950/70 border border-amber-600/70 rounded-xl p-4 shadow-xl backdrop-blur-md animate-fade-in flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-lg bg-amber-900/80 text-amber-300 border border-amber-700/80 flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-amber-200 uppercase tracking-wide">
              Tax Configuration Required
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-900/80 text-amber-300 text-xs font-semibold border border-amber-700/60">
              Net Balances Locked
            </span>
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            Financial net calculations are currently locked until all mandatory tax rates are set. Please provide:
          </p>
          <ul className="list-disc list-inside text-xs text-amber-100 font-medium space-y-0.5 mt-1">
            {missingFields.map((field) => (
              <li key={field.key}>
                ⚠️ Action Required: Please enter <strong className="text-amber-300 underline">{field.label}</strong> to view accurate Net Balances.
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button
        type="button"
        onClick={() => openModal('tax_config')}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-lg hover:shadow-amber-500/20 flex-shrink-0 self-stretch md:self-auto justify-center"
      >
        <Settings className="w-4 h-4" />
        <span>Configure Taxes</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
