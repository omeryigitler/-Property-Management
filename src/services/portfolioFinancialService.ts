import {
  AggregatedFinancials,
  Booking,
  Expense,
  ExtraIncome,
  TaxConfiguration,
} from '../types';
import { calculatePropertyFinancials } from './financialCalculationService';
import { isTaxConfigured } from '../utils/taxCalculations';

export function calculatePortfolioFinancials(
  propertyIds: string[],
  year: number,
  month: number,
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  taxConfig: TaxConfiguration
): AggregatedFinancials {
  const financials = propertyIds.map((propertyId) =>
    calculatePropertyFinancials(
      propertyId,
      year,
      month,
      bookings,
      expenses,
      extraIncomes,
      taxConfig
    )
  );

  const configured = isTaxConfigured(taxConfig);
  const result: AggregatedFinancials = {
    combinedGrossBookingIncomeCents: 0,
    combinedOtaCommissionCents: 0,
    combinedNetBookingIncomeCents: 0,
    combinedExtraIncomeCents: 0,
    combinedExpenseCents: 0,
    combinedAccommodationVatCents: configured ? 0 : null,
    combinedStandardVatCents: configured ? 0 : null,
    combinedEcoContributionCents: configured ? 0 : null,
    combinedIncomeTaxCents: configured ? 0 : null,
    combinedCalculatedTaxesCents: configured ? 0 : null,
    combinedNetBalanceCents: configured ? 0 : null,
    isTaxConfigured: configured,
  };

  for (const item of financials) {
    result.combinedGrossBookingIncomeCents += item.grossBookingIncomeCents;
    result.combinedOtaCommissionCents += item.otaCommissionCents;
    result.combinedNetBookingIncomeCents += item.netBookingIncomeCents;
    result.combinedExtraIncomeCents += item.extraIncomeCents;
    result.combinedExpenseCents += item.totalExpensesCents;

    if (configured) {
      result.combinedAccommodationVatCents =
        (result.combinedAccommodationVatCents ?? 0) + (item.accommodationVatCents ?? 0);
      result.combinedStandardVatCents =
        (result.combinedStandardVatCents ?? 0) + (item.standardVatCents ?? 0);
      result.combinedEcoContributionCents =
        (result.combinedEcoContributionCents ?? 0) + (item.ecoContributionCents ?? 0);
      result.combinedIncomeTaxCents =
        (result.combinedIncomeTaxCents ?? 0) + (item.incomeTaxCents ?? 0);
      result.combinedCalculatedTaxesCents =
        (result.combinedCalculatedTaxesCents ?? 0) + (item.calculatedTaxesCents ?? 0);
      result.combinedNetBalanceCents =
        (result.combinedNetBalanceCents ?? 0) + (item.netBalanceCents ?? 0);
    }
  }

  return result;
}
