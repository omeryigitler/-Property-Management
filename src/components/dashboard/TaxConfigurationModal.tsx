import React, { useState } from 'react';
import { X, ShieldAlert, ChevronDown, ChevronUp, Save, Check } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { CustomSelect } from '../common/CustomSelect';
import { eurosToCents, centsToEuros } from '../../utils/currency';

export function TaxConfigurationModal() {
  const activeModal = useDashboardStore((s) => s.activeModal);
  const closeModal = useDashboardStore((s) => s.closeModal);
  const taxConfig = useDashboardStore((s) => s.taxConfiguration);
  const updateTaxConfig = useDashboardStore((s) => s.updateTaxConfig);

  const [accVat, setAccVat] = useState<string>(
    taxConfig.accommodationVatRate != null ? taxConfig.accommodationVatRate.toString() : ''
  );
  const [stdVat, setStdVat] = useState<string>(
    taxConfig.standardVatRate != null ? taxConfig.standardVatRate.toString() : ''
  );
  const [incomeTax, setIncomeTax] = useState<string>(
    taxConfig.incomeTaxRate != null ? taxConfig.incomeTaxRate.toString() : ''
  );
  const [ecoTax, setEcoTax] = useState<string>(
    taxConfig.ecoContributionCents != null ? centsToEuros(taxConfig.ecoContributionCents).toString() : ''
  );

  // Advanced Rules
  const [vatInclusivity, setVatInclusivity] = useState(taxConfig.vatInclusivity || 'inclusive');
  const [ecoTaxBasis, setEcoTaxBasis] = useState(taxConfig.ecoTaxBasis || 'per_occupied_night');
  const [incomeTaxBasis, setIncomeTaxBasis] = useState(taxConfig.incomeTaxBasis || 'taxable_profit');
  const [defaultExtraIncomeTaxTreatment, setDefaultExtraIncomeTaxTreatment] = useState(
    taxConfig.defaultExtraIncomeTaxTreatment || 'standard_vat'
  );

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (activeModal !== 'tax_config') return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const parsedAccVat = parseFloat(accVat);
    if (!accVat || isNaN(parsedAccVat)) {
      newErrors.accVat = 'Accommodation VAT rate is required.';
    } else if (parsedAccVat < 0 || parsedAccVat > 100) {
      newErrors.accVat = 'Percentage must be between 0 and 100.';
    }

    const parsedStdVat = parseFloat(stdVat);
    if (!stdVat || isNaN(parsedStdVat)) {
      newErrors.stdVat = 'Standard VAT rate is required.';
    } else if (parsedStdVat < 0 || parsedStdVat > 100) {
      newErrors.stdVat = 'Percentage must be between 0 and 100.';
    }

    const parsedIncomeTax = parseFloat(incomeTax);
    if (!incomeTax || isNaN(parsedIncomeTax)) {
      newErrors.incomeTax = 'Income tax rate is required.';
    } else if (parsedIncomeTax < 0 || parsedIncomeTax > 100) {
      newErrors.incomeTax = 'Percentage must be between 0 and 100.';
    }

    const parsedEcoTax = parseFloat(ecoTax);
    if (!ecoTax || isNaN(parsedEcoTax)) {
      newErrors.ecoTax = 'Eco Contribution amount is required.';
    } else if (parsedEcoTax < 0) {
      newErrors.ecoTax = 'Amount cannot be negative.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    updateTaxConfig({
      accommodationVatRate: parsedAccVat,
      standardVatRate: parsedStdVat,
      incomeTaxRate: parsedIncomeTax,
      ecoContributionCents: eurosToCents(parsedEcoTax),
      vatInclusivity,
      ecoTaxBasis,
      incomeTaxBasis,
      defaultExtraIncomeTaxTreatment,
    });

    closeModal();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl text-slate-100 flex flex-col max-h-[90dvh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Tax & Financial Settings</h3>
              <p className="text-xs text-slate-400">Configure tax rates to calculate net balances & VAT breakdown.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">
          {/* Mandatory Tax Rates */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Mandatory Tax Parameters</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Accommodation VAT */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Accommodation VAT Rate (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g. 7.00"
                    value={accVat}
                    onChange={(e) => setAccVat(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                      errors.accVat ? 'border-rose-500' : 'border-slate-700/80'
                    }`}
                  />
                  <span className="absolute right-3.5 top-2.5 text-slate-400 text-sm">%</span>
                </div>
                {errors.accVat && <span className="text-xs text-rose-400">{errors.accVat}</span>}
              </div>

              {/* Standard VAT */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Standard VAT Rate (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g. 18.00"
                    value={stdVat}
                    onChange={(e) => setStdVat(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                      errors.stdVat ? 'border-rose-500' : 'border-slate-700/80'
                    }`}
                  />
                  <span className="absolute right-3.5 top-2.5 text-slate-400 text-sm">%</span>
                </div>
                {errors.stdVat && <span className="text-xs text-rose-400">{errors.stdVat}</span>}
              </div>

              {/* Income Tax Rate */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Income Tax Rate (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g. 15.00"
                    value={incomeTax}
                    onChange={(e) => setIncomeTax(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                      errors.incomeTax ? 'border-rose-500' : 'border-slate-700/80'
                    }`}
                  />
                  <span className="absolute right-3.5 top-2.5 text-slate-400 text-sm">%</span>
                </div>
                {errors.incomeTax && <span className="text-xs text-rose-400">{errors.incomeTax}</span>}
              </div>

              {/* Eco Contribution */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Eco Contribution / City Tax (€)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 0.50"
                    value={ecoTax}
                    onChange={(e) => setEcoTax(e.target.value)}
                    className={`w-full pl-8 pr-3.5 py-2.5 rounded-lg bg-slate-950 border text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                      errors.ecoTax ? 'border-rose-500' : 'border-slate-700/80'
                    }`}
                  />
                </div>
                {errors.ecoTax && <span className="text-xs text-rose-400">{errors.ecoTax}</span>}
              </div>
            </div>
          </div>

          {/* Advanced Tax Rules Collapsible */}
          <div className="border border-slate-800 rounded-xl bg-slate-950/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-slate-900/80 transition-colors"
            >
              <span>Advanced Tax Rules & Accounting Assumptions</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="p-4 border-t border-slate-800 space-y-4 animate-fade-in text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CustomSelect
                    label="Booking Prices Treatment"
                    options={[
                      { value: 'inclusive', label: 'VAT-Inclusive (Rates contain VAT)' },
                      { value: 'exclusive', label: 'VAT-Exclusive (VAT added to rates)' },
                    ]}
                    value={vatInclusivity}
                    onChange={(val) => setVatInclusivity(val as any)}
                  />

                  <CustomSelect
                    label="Eco Contribution Basis"
                    options={[
                      { value: 'per_occupied_night', label: 'Per Occupied Night' },
                      { value: 'per_booking', label: 'Per Booking' },
                      { value: 'per_guest_per_night', label: 'Per Guest Per Occupied Night' },
                    ]}
                    value={ecoTaxBasis}
                    onChange={(val) => setEcoTaxBasis(val as any)}
                  />

                  <CustomSelect
                    label="Income Tax Basis"
                    options={[
                      { value: 'taxable_profit', label: 'Taxable Profit (Revenue - Deductible Expenses)' },
                      { value: 'net_after_vat', label: 'Revenue After VAT' },
                      { value: 'gross_revenue', label: 'Gross Accommodation Revenue' },
                    ]}
                    value={incomeTaxBasis}
                    onChange={(val) => setIncomeTaxBasis(val as any)}
                  />

                  <CustomSelect
                    label="Default Extra Income Tax"
                    options={[
                      { value: 'standard_vat', label: 'Standard VAT' },
                      { value: 'accommodation_vat', label: 'Accommodation VAT' },
                      { value: 'vat_exempt', label: 'VAT Exempt' },
                    ]}
                    value={defaultExtraIncomeTaxTreatment}
                    onChange={(val) => setDefaultExtraIncomeTaxTreatment(val as any)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Active Assumptions Summary */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
            <span className="font-semibold text-slate-200">Active Calculation Assumptions:</span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-400">
              <li>VAT Treatment: {vatInclusivity === 'inclusive' ? 'Prices are VAT-inclusive' : 'Prices are VAT-exclusive'}</li>
              <li>Eco Contribution: Calculated {ecoTaxBasis.replace(/_/g, ' ')}</li>
              <li>Income Tax: Calculated on {incomeTaxBasis.replace(/_/g, ' ')}</li>
            </ul>
          </div>

          {/* Tax Disclaimer */}
          <p className="text-[11px] text-slate-400 italic bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
            ⚠️ <strong>Disclaimer:</strong> Financial calculations and tax estimations generated by this dashboard are estimates based on your entered parameters and are intended for operational planning only. They do not constitute official professional tax or legal advice.
          </p>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 hover:text-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-lg hover:shadow-cyan-600/20"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
