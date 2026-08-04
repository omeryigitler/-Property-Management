import test from 'node:test';
import assert from 'node:assert/strict';
import { Booking, Expense, ExtraIncome } from '../src/types';
import { calculatePropertyFinancials } from '../src/services/financialCalculationService';
import { calculatePortfolioFinancials } from '../src/services/portfolioFinancialService';
import { calculateReportSummary } from '../src/services/reportingService';

const booking: Booking = {
  id: 'b1',
  propertyId: '1-the-olive',
  guestName: 'Guest',
  channel: 'direct',
  checkInDate: '2026-08-01',
  checkOutDate: '2026-08-04',
  nightlyRateCents: 10_000,
  status: 'confirmed',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};
const expense: Expense = {
  id: 'e1',
  propertyId: '1-the-olive',
  year: 2026,
  month: 8,
  label: 'Rent',
  amountCents: 10_000,
  category: 'Rent',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};
const income: ExtraIncome = {
  id: 'i1',
  propertyId: '1-the-olive',
  year: 2026,
  month: 8,
  label: 'Service',
  amountCents: 2_000,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

test('property balance is booking income plus extra income minus all expenses', () => {
  const result = calculatePropertyFinancials(
    '1-the-olive',
    2026,
    8,
    [booking],
    [expense],
    [income]
  );
  assert.deepEqual(result, {
    propertyId: '1-the-olive',
    bookingIncomeCents: 30_000,
    extraIncomeCents: 2_000,
    totalExpensesCents: 10_000,
    netBalanceCents: 22_000,
  });
});

test('portfolio and reports use the same simplified net balance', () => {
  const portfolio = calculatePortfolioFinancials(
    ['1-the-olive'],
    2026,
    8,
    [booking],
    [expense],
    [income]
  );
  const report = calculateReportSummary(
    [booking],
    [expense],
    [income],
    {
      period: 'monthly',
      year: 2026,
      month: 8,
      propertyId: '1-the-olive',
    }
  );
  assert.equal(portfolio.combinedNetBalanceCents, 22_000);
  assert.equal(report.netBalanceCents, 22_000);
});
