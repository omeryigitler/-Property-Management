import {
  Booking,
  Expense,
  ExtraIncome,
  TaxConfiguration,
  Channel,
} from '../types';
import { ALL_PROPERTIES, LOCATIONS } from '../config/locations';
import {
  calculatePropertyFinancials,
  calculateAggregatedFinancials,
  calculateBookingRevenueAndCommission,
  getBookingMonthlyAllocatedNights,
} from './financialCalculationService';
import { calculateSameDayTurnover } from './turnoverService';

export interface AnalyticsFilter {
  year: number;
  month: number | 'all';
  propertyId: string | 'all';
  locationId: string | 'all';
  channel: Channel | 'all';
  statusFilter: 'all' | 'confirmed_only' | 'include_provisional';
  revenueView: 'gross' | 'net';
}

export interface KpiMetrics {
  grossBookingRevenueCents: number;
  otaCommissionCents: number;
  netBookingRevenueCents: number;
  totalExtraIncomeCents: number;
  totalOperatingExpensesCents: number;
  calculatedTaxesCents: number | null;
  netBalanceCents: number | null;
  occupancyRatePct: number;
  adrCents: number;
  revParCents: number;
  averageLengthOfStayNights: number;
  totalBookingCount: number;
  cancellationCount: number;
  effectiveCommissionRatePct: number;
  sameDayTurnoverCount: number;
  insufficientTurnoverCount: number;
  isTaxConfigured: boolean;
}

/**
 * Calculates complete KPI metrics based on filter selections.
 */
export function calculateKpiMetrics(
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  taxConfig: TaxConfiguration,
  filter: AnalyticsFilter
): KpiMetrics {
  let filteredBookings = bookings;

  if (filter.propertyId !== 'all') {
    filteredBookings = filteredBookings.filter((b) => b.propertyId === filter.propertyId);
  } else if (filter.locationId !== 'all') {
    const loc = LOCATIONS.find((l) => l.id === filter.locationId);
    const pIds = loc ? loc.properties.map((p) => p.id) : [];
    filteredBookings = filteredBookings.filter((b) => pIds.includes(b.propertyId));
  }

  if (filter.channel !== 'all') {
    filteredBookings = filteredBookings.filter((b) => b.channel === filter.channel);
  }

  const cancelledBookings = filteredBookings.filter((b) => b.status === 'cancelled');

  let activeBookings = filteredBookings.filter((b) => b.status !== 'cancelled');
  if (filter.statusFilter === 'confirmed_only') {
    activeBookings = activeBookings.filter((b) => b.status !== 'provisional');
  }

  // Filter by year & month
  let grossRevCents = 0;
  let otaCommCents = 0;
  let extraIncCents = 0;
  let occupiedNights = 0;

  for (const b of activeBookings) {
    const nights = getBookingMonthlyAllocatedNights(b, taxConfig);
    const matchingNights = nights.filter((n) => {
      if (n.year !== filter.year) return false;
      if (filter.month !== 'all' && n.month !== filter.month) return false;
      return true;
    });

    for (const n of matchingNights) {
      grossRevCents += n.grossNightRevenueCents;
      otaCommCents += n.otaCommissionCents;
      occupiedNights++;
    }
  }

  const netRevCents = grossRevCents - otaCommCents;

  // Filter Extra Incomes & Expenses
  const filteredExtra = extraIncomes.filter((e) => {
    if (e.year !== filter.year) return false;
    if (filter.month !== 'all' && e.month !== filter.month) return false;
    if (filter.propertyId !== 'all' && e.propertyId !== filter.propertyId) return false;
    if (filter.locationId !== 'all') {
      const loc = LOCATIONS.find((l) => l.id === filter.locationId);
      const pIds = loc ? loc.properties.map((p) => p.id) : [];
      if (!pIds.includes(e.propertyId)) return false;
    }
    return true;
  });
  extraIncCents = filteredExtra.reduce((sum, e) => sum + e.amountCents, 0);

  const filteredExp = expenses.filter((e) => {
    if (e.year !== filter.year) return false;
    if (filter.month !== 'all' && e.month !== filter.month) return false;
    if (filter.propertyId !== 'all' && e.propertyId !== filter.propertyId) return false;
    if (filter.locationId !== 'all') {
      const loc = LOCATIONS.find((l) => l.id === filter.locationId);
      const pIds = loc ? loc.properties.map((p) => p.id) : [];
      if (!pIds.includes(e.propertyId)) return false;
    }
    return true;
  });
  const operatingExpensesCents = filteredExp.reduce((sum, e) => sum + e.amountCents, 0);

  // Financial aggregates for Tax and Net Balance
  let targetProps = ALL_PROPERTIES;
  if (filter.propertyId !== 'all') {
    targetProps = ALL_PROPERTIES.filter((p) => p.id === filter.propertyId);
  } else if (filter.locationId !== 'all') {
    const loc = LOCATIONS.find((l) => l.id === filter.locationId);
    targetProps = loc ? ALL_PROPERTIES.filter((p) => loc.properties.some((lp) => lp.id === p.id)) : ALL_PROPERTIES;
  }

  const monthsToEvaluate = filter.month === 'all' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [filter.month];

  let calcTaxesCents: number | null = 0;
  let isTaxCfg = true;

  for (const m of monthsToEvaluate) {
    for (const prop of targetProps) {
      const fin = calculatePropertyFinancials(prop.id, filter.year, m, bookings, expenses, extraIncomes, taxConfig);
      if (!fin.isTaxConfigured) {
        isTaxCfg = false;
        calcTaxesCents = null;
        break;
      }
      calcTaxesCents = (calcTaxesCents ?? 0) + (fin.calculatedTaxesCents ?? 0);
    }
    if (!isTaxCfg) break;
  }

  const netBalCents = isTaxCfg && calcTaxesCents !== null ? netRevCents + extraIncCents - operatingExpensesCents - calcTaxesCents : null;

  // Occupancy metrics
  const propCount = targetProps.length;
  const daysInPeriod = filter.month === 'all' ? 365 : new Date(filter.year, filter.month, 0).getDate();
  const totalAvailableNights = propCount * daysInPeriod;

  const occupancyRatePct = totalAvailableNights > 0 ? Math.round((occupiedNights / totalAvailableNights) * 1000) / 10 : 0;
  const adrCents = occupiedNights > 0 ? Math.round(grossRevCents / occupiedNights) : 0;
  const revParCents = totalAvailableNights > 0 ? Math.round(grossRevCents / totalAvailableNights) : 0;

  const activeBookingCount = activeBookings.length;
  const averageLengthOfStayNights = activeBookingCount > 0 ? Math.round((occupiedNights / activeBookingCount) * 10) / 10 : 0;

  const effectiveCommissionRatePct = grossRevCents > 0 ? Math.round((otaCommCents / grossRevCents) * 1000) / 10 : 0;

  // Turnovers
  let sameDayTurnovers = 0;
  let insufficientTurnovers = 0;

  for (let i = 0; i < activeBookings.length; i++) {
    for (let j = 0; j < activeBookings.length; j++) {
      if (i !== j && activeBookings[i].propertyId === activeBookings[j].propertyId) {
        if (activeBookings[i].checkOutDate === activeBookings[j].checkInDate) {
          sameDayTurnovers++;
          const calc = calculateSameDayTurnover(activeBookings[i], activeBookings[j]);
          if (calc.status === 'insufficient' || calc.status === 'tight') {
            insufficientTurnovers++;
          }
        }
      }
    }
  }

  return {
    grossBookingRevenueCents: grossRevCents,
    otaCommissionCents: otaCommCents,
    netBookingRevenueCents: netRevCents,
    totalExtraIncomeCents: extraIncCents,
    totalOperatingExpensesCents: operatingExpensesCents,
    calculatedTaxesCents: calcTaxesCents,
    netBalanceCents: netBalCents,
    occupancyRatePct,
    adrCents,
    revParCents,
    averageLengthOfStayNights,
    totalBookingCount: activeBookingCount,
    cancellationCount: cancelledBookings.length,
    effectiveCommissionRatePct,
    sameDayTurnoverCount: sameDayTurnovers,
    insufficientTurnoverCount: insufficientTurnovers,
    isTaxConfigured: isTaxCfg,
  };
}
