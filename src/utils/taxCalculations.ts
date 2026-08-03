import { TaxConfiguration, TaxTreatment } from '../types';

export interface MissingTaxField {
  key: keyof TaxConfiguration;
  label: string;
}

/**
 * Checks whether tax configuration is complete.
 * Values that are null, undefined, or <= 0 count as missing.
 */
export function getMissingTaxFields(config: TaxConfiguration | null | undefined): MissingTaxField[] {
  if (!config) {
    return [
      { key: 'accommodationVatRate', label: 'Accommodation VAT Rate' },
      { key: 'standardVatRate', label: 'Standard VAT Rate' },
      { key: 'incomeTaxRate', label: 'Income Tax Rate' },
      { key: 'ecoContributionCents', label: 'Eco Contribution / City Tax' },
    ];
  }

  const missing: MissingTaxField[] = [];

  if (config.accommodationVatRate == null || config.accommodationVatRate <= 0) {
    missing.push({ key: 'accommodationVatRate', label: 'Accommodation VAT Rate' });
  }
  if (config.standardVatRate == null || config.standardVatRate <= 0) {
    missing.push({ key: 'standardVatRate', label: 'Standard VAT Rate' });
  }
  if (config.incomeTaxRate == null || config.incomeTaxRate <= 0) {
    missing.push({ key: 'incomeTaxRate', label: 'Income Tax Rate' });
  }
  if (config.ecoContributionCents == null || config.ecoContributionCents <= 0) {
    missing.push({ key: 'ecoContributionCents', label: 'Eco Contribution / City Tax' });
  }

  return missing;
}

export function isTaxConfigured(config: TaxConfiguration | null | undefined): boolean {
  return getMissingTaxFields(config).length === 0;
}

export interface CalculateTaxInput {
  bookingIncomeCents: number;
  extraIncomeCents: number;
  extraIncomeByTreatment: Record<TaxTreatment, number>;
  totalExpensesCents: number;
  deductibleExpensesCents: number;
  occupiedNightsCount: number;
  bookingCount: number;
  totalGuestNightsCount: number;
  config: TaxConfiguration;
}

export interface TaxCalculationResult {
  accommodationVatCents: number;
  standardVatCents: number;
  ecoContributionCents: number;
  incomeTaxCents: number;
  calculatedTaxesCents: number;
  netBalanceCents: number;
}

/**
 * Computes exact tax components and net balance based on tax rules.
 */
export function calculatePropertyTaxes(input: CalculateTaxInput): TaxCalculationResult {
  const {
    bookingIncomeCents,
    extraIncomeCents,
    extraIncomeByTreatment,
    totalExpensesCents,
    deductibleExpensesCents,
    occupiedNightsCount,
    bookingCount,
    totalGuestNightsCount,
    config,
  } = input;

  const accRate = (config.accommodationVatRate || 0) / 100;
  const stdRate = (config.standardVatRate || 0) / 100;
  const incRate = (config.incomeTaxRate || 0) / 100;

  // 1. Accommodation VAT
  // Extra income marked as accommodation_vat is included in accommodation VAT base
  const totalAccBase = bookingIncomeCents + (extraIncomeByTreatment.accommodation_vat || 0);

  let accommodationVatCents = 0;
  if (config.vatInclusivity === 'inclusive') {
    accommodationVatCents = Math.round(totalAccBase - totalAccBase / (1 + accRate));
  } else {
    accommodationVatCents = Math.round(totalAccBase * accRate);
  }

  // 2. Standard VAT (from extra incomes marked standard_vat)
  const stdExtraBase = extraIncomeByTreatment.standard_vat || 0;
  let standardVatCents = 0;
  if (config.vatInclusivity === 'inclusive') {
    standardVatCents = Math.round(stdExtraBase - stdExtraBase / (1 + stdRate));
  } else {
    standardVatCents = Math.round(stdExtraBase * stdRate);
  }

  // 3. Eco Contribution
  const ecoPerUnitCents = config.ecoContributionCents || 0;
  let ecoContributionCents = 0;
  if (config.ecoTaxBasis === 'per_occupied_night') {
    ecoContributionCents = occupiedNightsCount * ecoPerUnitCents;
  } else if (config.ecoTaxBasis === 'per_booking') {
    ecoContributionCents = bookingCount * ecoPerUnitCents;
  } else if (config.ecoTaxBasis === 'per_guest_per_night') {
    ecoContributionCents = totalGuestNightsCount * ecoPerUnitCents;
  }

  // 4. Income Tax
  let taxableBaseCents = 0;
  const grossTotal = bookingIncomeCents + extraIncomeCents;

  if (config.incomeTaxBasis === 'gross_revenue') {
    taxableBaseCents = grossTotal;
  } else if (config.incomeTaxBasis === 'net_after_vat') {
    taxableBaseCents = grossTotal - accommodationVatCents - standardVatCents;
  } else {
    // taxable_profit
    taxableBaseCents = grossTotal - deductibleExpensesCents - accommodationVatCents - standardVatCents - ecoContributionCents;
  }

  if (taxableBaseCents < 0) taxableBaseCents = 0;
  const incomeTaxCents = Math.round(taxableBaseCents * incRate);

  const calculatedTaxesCents = accommodationVatCents + standardVatCents + ecoContributionCents + incomeTaxCents;
  const netBalanceCents = grossTotal - totalExpensesCents - calculatedTaxesCents;

  return {
    accommodationVatCents,
    standardVatCents,
    ecoContributionCents,
    incomeTaxCents,
    calculatedTaxesCents,
    netBalanceCents,
  };
}
