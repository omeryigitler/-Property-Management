import { TaxConfiguration, TaxTreatment } from '../types';

export interface MissingTaxField {
  key: keyof TaxConfiguration;
  label: string;
}

function isMissingRate(value: number | null | undefined): boolean {
  return value == null || !Number.isFinite(value) || value < 0;
}

/**
 * Checks whether all required tax values were explicitly configured.
 * Zero is a valid configured value; only missing, non-finite or negative values are rejected.
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

  if (isMissingRate(config.accommodationVatRate)) {
    missing.push({ key: 'accommodationVatRate', label: 'Accommodation VAT Rate' });
  }
  if (isMissingRate(config.standardVatRate)) {
    missing.push({ key: 'standardVatRate', label: 'Standard VAT Rate' });
  }
  if (isMissingRate(config.incomeTaxRate)) {
    missing.push({ key: 'incomeTaxRate', label: 'Income Tax Rate' });
  }
  if (isMissingRate(config.ecoContributionCents)) {
    missing.push({ key: 'ecoContributionCents', label: 'Eco Contribution / City Tax' });
  }

  return missing;
}

export function isTaxConfigured(config: TaxConfiguration | null | undefined): boolean {
  return getMissingTaxFields(config).length === 0;
}

export interface CalculateTaxInput {
  bookingIncomeCents: number;
  grossBookingIncomeCents?: number;
  netBookingIncomeCents?: number;
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
    grossBookingIncomeCents = bookingIncomeCents,
    netBookingIncomeCents = bookingIncomeCents,
    extraIncomeCents,
    extraIncomeByTreatment,
    totalExpensesCents,
    deductibleExpensesCents,
    occupiedNightsCount,
    bookingCount,
    totalGuestNightsCount,
    config,
  } = input;

  const accommodationRate = (config.accommodationVatRate || 0) / 100;
  const standardRate = (config.standardVatRate || 0) / 100;
  const incomeRate = (config.incomeTaxRate || 0) / 100;

  const accommodationBaseCents =
    Math.max(0, bookingIncomeCents) + (extraIncomeByTreatment.accommodation_vat || 0);
  const accommodationVatCents =
    config.vatInclusivity === 'inclusive'
      ? Math.round(
          accommodationBaseCents - accommodationBaseCents / (1 + accommodationRate)
        )
      : Math.round(accommodationBaseCents * accommodationRate);

  const standardBaseCents = extraIncomeByTreatment.standard_vat || 0;
  const standardVatCents =
    config.vatInclusivity === 'inclusive'
      ? Math.round(standardBaseCents - standardBaseCents / (1 + standardRate))
      : Math.round(standardBaseCents * standardRate);

  const ecoPerUnitCents = config.ecoContributionCents || 0;
  let ecoContributionCents = 0;
  if (config.ecoTaxBasis === 'per_occupied_night') {
    ecoContributionCents = occupiedNightsCount * ecoPerUnitCents;
  } else if (config.ecoTaxBasis === 'per_booking') {
    ecoContributionCents = bookingCount * ecoPerUnitCents;
  } else if (config.ecoTaxBasis === 'per_guest_per_night') {
    ecoContributionCents = totalGuestNightsCount * ecoPerUnitCents;
  }

  const grossTotalCents = grossBookingIncomeCents + extraIncomeCents;
  const netAfterCommissionCents = netBookingIncomeCents + extraIncomeCents;
  let taxableBaseCents = 0;

  if (config.incomeTaxBasis === 'gross_revenue') {
    taxableBaseCents = grossTotalCents;
  } else if (config.incomeTaxBasis === 'net_after_vat') {
    taxableBaseCents = grossTotalCents - accommodationVatCents - standardVatCents;
  } else if (config.incomeTaxBasis === 'net_after_commission') {
    taxableBaseCents = netAfterCommissionCents;
  } else {
    taxableBaseCents =
      netAfterCommissionCents -
      deductibleExpensesCents -
      accommodationVatCents -
      standardVatCents -
      ecoContributionCents;
  }

  taxableBaseCents = Math.max(0, taxableBaseCents);
  const incomeTaxCents = Math.round(taxableBaseCents * incomeRate);
  const calculatedTaxesCents =
    accommodationVatCents + standardVatCents + ecoContributionCents + incomeTaxCents;

  // Inclusive VAT is contained in the entered revenue and reduces the owner's proceeds.
  // Exclusive VAT is collected on top of the entered revenue, so subtracting it again here
  // would double-count the liability.
  const vatCashImpactCents =
    config.vatInclusivity === 'inclusive'
      ? accommodationVatCents + standardVatCents
      : 0;
  const netBalanceCents =
    netAfterCommissionCents -
    totalExpensesCents -
    vatCashImpactCents -
    ecoContributionCents -
    incomeTaxCents;

  return {
    accommodationVatCents,
    standardVatCents,
    ecoContributionCents,
    incomeTaxCents,
    calculatedTaxesCents,
    netBalanceCents,
  };
}
