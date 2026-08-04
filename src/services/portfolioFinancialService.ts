import { AggregatedFinancials, Booking, Expense, ExtraIncome } from '../types';
import { calculatePropertyFinancials } from './financialCalculationService';

export function calculatePortfolioFinancials(
  propertyIds: string[],
  year: number,
  month: number,
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[]
): AggregatedFinancials {
  return propertyIds.reduce<AggregatedFinancials>(
    (result, propertyId) => {
      const item = calculatePropertyFinancials(
        propertyId,
        year,
        month,
        bookings,
        expenses,
        extraIncomes
      );
      result.combinedBookingIncomeCents += item.bookingIncomeCents;
      result.combinedExtraIncomeCents += item.extraIncomeCents;
      result.combinedExpenseCents += item.totalExpensesCents;
      result.combinedNetBalanceCents += item.netBalanceCents;
      return result;
    },
    {
      combinedBookingIncomeCents: 0,
      combinedExtraIncomeCents: 0,
      combinedExpenseCents: 0,
      combinedNetBalanceCents: 0,
    }
  );
}
