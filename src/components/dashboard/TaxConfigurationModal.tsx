import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Save,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { CustomSelect } from '../common/CustomSelect';
import { centsToEuros, eurosToCents } from '../../utils/currency';
import {
  EcoTaxBasis,
  IncomeTaxBasis,
  TaxTreatment,
  VatInclusivity,
} from '../../types';

export function TaxConfigurationModal() {
  const activeModal = useDashboardStore((state) => state.activeModal);
  const modalParams = useDashboardStore((state) => state.modalParams);
  const closeModal = useDashboardStore((state) => state.closeModal);
  const openModal = useDashboardStore((state) => state.openModal);
  const taxConfig = useDashboardStore((state) => state.taxConfiguration);
  const updateTaxConfig = useDashboardStore((state) => state.updateTaxConfig);

  const [accommodationVat, setAccommodationVat] = useState('');
  const [standardVat, setStandardVat] = useState('');
  const [incomeTax, setIncomeTax] = useState('');
  const [ecoTax, setEcoTax] = useState('');
  const [vatInclusivity, setVatInclusivity] = useState<VatInclusivity>('inclusive');
  const [ecoTaxBasis, setEcoTaxBasis] = useState<EcoTaxBasis>('per_occupied_night');
  const [incomeTaxBasis, setIncomeTaxBasis] = useState<IncomeTaxBasis>('taxable_profit');
  const [extraIncomeTaxTreatment, setExtraIncomeTaxTreatment] =
    useState<TaxTreatment>('standard_vat');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeModal !== 'tax_config') return;
    setAccommodationVat(
      taxConfig.accommodationVatRate != null
        ? taxConfig.accommodationVatRate.toString()
        : ''
    );
    setStandardVat(
      taxConfig.standardVatRate != null ? taxConfig.standardVatRate.toString() : ''
    );
    setIncomeTax(
      taxConfig.incomeTaxRate != null ? taxConfig.incomeTaxRate.toString() : ''
    );
    setEcoTax(
      taxConfig.ecoContributionCents != null
        ? centsToEuros(taxConfig.ecoContributionCents).toString()
        : ''
    );
    setVatInclusivity(taxConfig.vatInclusivity || 'inclusive');
    setEcoTaxBasis(taxConfig.ecoTaxBasis || 'per_occupied_night');
    setIncomeTaxBasis(taxConfig.incomeTaxBasis || 'taxable_profit');
    setExtraIncomeTaxTreatment(
      taxConfig.defaultExtraIncomeTaxTreatment || 'standard_vat'
    );
    setErrors({});
  }, [activeModal, taxConfig]);

  if (activeModal !== 'tax_config') return null;

  const returnToSettings = Boolean(modalParams.returnToSettings);
  const handleClose = () => {
    if (returnToSettings) {
      openModal('settings', { section: modalParams.returnSection || 'data' });
    } else {
      closeModal();
    }
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const parsedAccommodationVat = Number.parseFloat(accommodationVat);
    const parsedStandardVat = Number.parseFloat(standardVat);
    const parsedIncomeTax = Number.parseFloat(incomeTax);
    const parsedEcoTax = Number.parseFloat(ecoTax);

    const validatePercentage = (value: number, raw: string, key: string, label: string) => {
      if (!raw || Number.isNaN(value)) {
        nextErrors[key] = `${label} is required.`;
      } else if (value < 0 || value > 100) {
        nextErrors[key] = 'Percentage must be between 0 and 100.';
      }
    };

    validatePercentage(
      parsedAccommodationVat,
      accommodationVat,
      'accommodationVat',
      'Accommodation VAT rate'
    );
    validatePercentage(parsedStandardVat, standardVat, 'standardVat', 'Standard VAT rate');
    validatePercentage(parsedIncomeTax, incomeTax, 'incomeTax', 'Income tax rate');

    if (!ecoTax || Number.isNaN(parsedEcoTax)) {
      nextErrors.ecoTax = 'Eco contribution amount is required.';
    } else if (parsedEcoTax < 0) {
      nextErrors.ecoTax = 'Amount cannot be negative.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    updateTaxConfig({
      accommodationVatRate: parsedAccommodationVat,
      standardVatRate: parsedStandardVat,
      incomeTaxRate: parsedIncomeTax,
      ecoContributionCents: eurosToCents(parsedEcoTax),
      vatInclusivity,
      ecoTaxBasis,
      incomeTaxBasis,
      defaultExtraIncomeTaxTreatment: extraIncomeTaxTreatment,
    });
    handleClose();
  };

  const percentageField = (
    label: string,
    value: string,
    setValue: (value: string) => void,
    errorKey: string
  ) => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-300">{label}</label>
      <div className="relative">
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className={`h-11 w-full rounded-lg border bg-slate-950 px-3.5 pr-9 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/50 ${
            errors[errorKey] ? 'border-rose-500' : 'border-slate-700/80'
          }`}
        />
        <span className="absolute right-3.5 top-3 text-sm text-slate-400">%</span>
      </div>
      {errors[errorKey] && (
        <span className="text-xs text-rose-400">{errors[errorKey]}</span>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-0 backdrop-blur-md sm:p-4">
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-900 text-slate-100 shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-slate-700/90">
        <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg border border-cyan-800 bg-cyan-950 p-2 text-cyan-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 sm:text-lg">
                Tax & Financial Settings
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure rates used by net balance calculations.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            {returnToSettings ? <ArrowLeft className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </button>
        </header>

        <form
          onSubmit={handleSave}
          className="flex-1 space-y-6 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] no-scrollbar sm:p-6"
        >
          <section className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Mandatory Tax Parameters
            </h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {percentageField(
                'Accommodation VAT Rate (%)',
                accommodationVat,
                setAccommodationVat,
                'accommodationVat'
              )}
              {percentageField(
                'Standard VAT Rate (%)',
                standardVat,
                setStandardVat,
                'standardVat'
              )}
              {percentageField(
                'Income Tax Rate (%)',
                incomeTax,
                setIncomeTax,
                'incomeTax'
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Eco Contribution / City Tax (€)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-sm text-slate-400">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={ecoTax}
                    onChange={(event) => setEcoTax(event.target.value)}
                    className={`h-11 w-full rounded-lg border bg-slate-950 pl-8 pr-3.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                      errors.ecoTax ? 'border-rose-500' : 'border-slate-700/80'
                    }`}
                  />
                </div>
                {errors.ecoTax && (
                  <span className="text-xs text-rose-400">{errors.ecoTax}</span>
                )}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60">
            <button
              type="button"
              onClick={() => setShowAdvanced((current) => !current)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-slate-900/80"
            >
              <span>Advanced Tax Rules</span>
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 gap-4 border-t border-slate-800 p-4 sm:grid-cols-2">
                <CustomSelect
                  label="Booking Prices Treatment"
                  options={[
                    { value: 'inclusive', label: 'VAT-Inclusive' },
                    { value: 'exclusive', label: 'VAT-Exclusive' },
                  ]}
                  value={vatInclusivity}
                  onChange={(value) => setVatInclusivity(value as VatInclusivity)}
                />
                <CustomSelect
                  label="Eco Contribution Basis"
                  options={[
                    { value: 'per_occupied_night', label: 'Per Occupied Night' },
                    { value: 'per_booking', label: 'Per Booking' },
                    { value: 'per_guest_per_night', label: 'Per Guest Per Night' },
                  ]}
                  value={ecoTaxBasis}
                  onChange={(value) => setEcoTaxBasis(value as EcoTaxBasis)}
                />
                <CustomSelect
                  label="Income Tax Basis"
                  options={[
                    { value: 'taxable_profit', label: 'Taxable Profit' },
                    { value: 'net_after_vat', label: 'Revenue After VAT' },
                    { value: 'gross_revenue', label: 'Gross Revenue' },
                  ]}
                  value={incomeTaxBasis}
                  onChange={(value) => setIncomeTaxBasis(value as IncomeTaxBasis)}
                />
                <CustomSelect
                  label="Default Extra Income Tax"
                  options={[
                    { value: 'standard_vat', label: 'Standard VAT' },
                    { value: 'accommodation_vat', label: 'Accommodation VAT' },
                    { value: 'vat_exempt', label: 'VAT Exempt' },
                  ]}
                  value={extraIncomeTaxTreatment}
                  onChange={(value) => setExtraIncomeTaxTreatment(value as TaxTreatment)}
                />
              </div>
            )}
          </section>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs text-slate-400">
            These values are operational estimates. Confirm official tax treatment with a qualified Malta tax professional.
          </div>

          <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-800 bg-slate-900/95 py-3 backdrop-blur sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 text-xs font-semibold text-slate-300 hover:bg-slate-700"
            >
              {returnToSettings && <ArrowLeft className="h-3.5 w-3.5" />}
              {returnToSettings ? 'Back to Settings' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex h-10 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-5 text-xs font-bold text-white hover:bg-cyan-500"
            >
              <Save className="h-4 w-4" />
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
