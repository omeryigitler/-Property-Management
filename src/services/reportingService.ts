import { Booking, Channel, Expense, ExtraIncome, PropertyConfig } from '../types';
import { ALL_PROPERTIES, CHANNEL_CONFIG } from '../config/locations';
import { MONTH_SHORT_NAMES } from '../utils/dateUtilities';
import { getBookingMonthlyAllocatedNights } from './financialCalculationService';

export type ReportPeriod = 'monthly' | 'yearly';
export type ReportChannel = Channel | 'all';

export interface ReportFilter {
  period: ReportPeriod;
  year: number;
  month: number;
  propertyId: string | 'all';
  throughMonth?: number;
}

export interface ReportSummary {
  bookingIncomeCents: number;
  extraIncomeCents: number;
  totalExpensesCents: number;
  netBalanceCents: number;
  occupiedNights: number;
  availableNights: number;
  occupancyRatePct: number;
  adrCents: number;
  revParCents: number;
  bookingCount: number;
}

export interface FinancialSeriesPoint extends ReportSummary {
  key: string;
  label: string;
  propertyId?: string;
  month?: number;
}

export interface YearComparisonPoint {
  key: string;
  label: string;
  month: number;
  currentNetCents: number;
  previousNetCents: number;
  currentBookingIncomeCents: number;
  previousBookingIncomeCents: number;
}

export interface YearComparison {
  current: ReportSummary;
  previous: ReportSummary;
  netDeltaCents: number;
  netChangePct: number | null;
  bookingIncomeDeltaCents: number;
  bookingIncomeChangePct: number | null;
  occupancyDeltaPoints: number;
}

export interface ChannelSeriesPoint {
  channel: Channel;
  label: string;
  bookingIncomeCents: number;
  bookingCount: number;
  occupiedNights: number;
  averageBookingCents: number;
  averageStayNights: number;
  incomeSharePct: number;
  previousBookingIncomeCents: number;
  incomeChangePct: number | null;
  provisionalIncomeCents: number;
}

export interface ChannelMonthlyPoint {
  key: string;
  label: string;
  month: number;
  airbnbCents: number;
  bookingComCents: number;
  directCents: number;
  vrboCents: number;
}

export interface ChannelYearComparisonPoint {
  key: string;
  label: string;
  month: number;
  currentIncomeCents: number;
  previousIncomeCents: number;
}

export interface ExpenseSeriesPoint {
  key: string;
  label: string;
  amountCents: number;
}

export interface PropertyAnnualPerformance {
  propertyId: string;
  propertyName: string;
  active: boolean;
  bookingIncomeCents: number;
  totalExpensesCents: number;
  netBalanceCents: number;
  previousNetBalanceCents: number;
  netChangePct: number | null;
  occupancyRatePct: number;
  bestMonth: FinancialSeriesPoint | null;
  topChannel: Channel | null;
  topChannelSharePct: number;
}

export interface PropertyMonthlyPerformance extends FinancialSeriesPoint {
  previousNetBalanceCents: number;
  netChangePct: number | null;
}

export interface PropertyChannelMatrixRow {
  propertyId: string;
  propertyName: string;
  active: boolean;
  airbnbCents: number;
  bookingComCents: number;
  directCents: number;
  vrboCents: number;
  totalCents: number;
  topChannel: Channel | null;
  topChannelSharePct: number;
}

export interface BookingReportDetail {
  bookingId: string;
  guestName: string;
  propertyId: string;
  propertyName: string;
  channel: Channel;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  amountCents: number;
}

export interface YearHighlights {
  bestMonth: FinancialSeriesPoint | null;
  worstMonth: FinancialSeriesPoint | null;
  negativeMonthCount: number;
}

const CHANNELS = Object.keys(CHANNEL_CONFIG) as Channel[];

function clampMonth(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(12, Math.max(1, Math.round(value ?? fallback)));
}

function getMonths(filter: ReportFilter): number[] {
  if (filter.period === 'monthly') return [clampMonth(filter.month, 1)];
  const throughMonth = clampMonth(filter.throughMonth, 12);
  return Array.from({ length: throughMonth }, (_, index) => index + 1);
}

function getPropertyIds(
  propertyId: string | 'all',
  properties: PropertyConfig[] = ALL_PROPERTIES
): string[] {
  return propertyId === 'all'
    ? properties.map((property) => property.id)
    : [propertyId];
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isReportableBooking(booking: Booking): boolean {
  return (
    booking.status === 'confirmed' ||
    booking.status === 'checked_in' ||
    booking.status === 'checked_out'
  );
}

function isProvisionalBooking(booking: Booking): boolean {
  return booking.status === 'provisional';
}

function matchedNights(
  booking: Booking,
  year: number,
  months: Set<number>
) {
  return getBookingMonthlyAllocatedNights(booking).filter(
    (night) => night.year === year && months.has(night.month)
  );
}

function percentageChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function hasFinancialData(point: ReportSummary): boolean {
  return (
    point.bookingIncomeCents !== 0 ||
    point.extraIncomeCents !== 0 ||
    point.totalExpensesCents !== 0 ||
    point.bookingCount !== 0
  );
}

export function calculateReportSummary(
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  filter: ReportFilter,
  properties: PropertyConfig[] = ALL_PROPERTIES
): ReportSummary {
  const months = getMonths(filter);
  const monthSet = new Set(months);
  const propertyIds = getPropertyIds(filter.propertyId, properties);
  const propertyIdSet = new Set(propertyIds);

  let bookingIncomeCents = 0;
  let occupiedNights = 0;
  const bookingIds = new Set<string>();

  for (const booking of bookings) {
    if (!isReportableBooking(booking) || !propertyIdSet.has(booking.propertyId)) {
      continue;
    }
    const nights = matchedNights(booking, filter.year, monthSet);
    if (nights.length === 0) continue;
    occupiedNights += nights.length;
    bookingIncomeCents += nights.reduce(
      (sum, night) => sum + night.revenueCents,
      0
    );
    bookingIds.add(booking.id);
  }

  const extraIncomeCents = extraIncomes
    .filter(
      (income) =>
        propertyIdSet.has(income.propertyId) &&
        income.year === filter.year &&
        monthSet.has(income.month)
    )
    .reduce((sum, income) => sum + Math.max(0, income.amountCents), 0);

  const totalExpensesCents = expenses
    .filter(
      (expense) =>
        propertyIdSet.has(expense.propertyId) &&
        expense.year === filter.year &&
        monthSet.has(expense.month)
    )
    .reduce((sum, expense) => sum + Math.max(0, expense.amountCents), 0);

  const availableNights =
    propertyIds.length *
    months.reduce((sum, month) => sum + daysInMonth(filter.year, month), 0);
  const occupancyRatePct =
    availableNights > 0
      ? Math.round((occupiedNights / availableNights) * 1000) / 10
      : 0;

  return {
    bookingIncomeCents,
    extraIncomeCents,
    totalExpensesCents,
    netBalanceCents: bookingIncomeCents + extraIncomeCents - totalExpensesCents,
    occupiedNights,
    availableNights,
    occupancyRatePct,
    adrCents:
      occupiedNights > 0 ? Math.round(bookingIncomeCents / occupiedNights) : 0,
    revParCents:
      availableNights > 0 ? Math.round(bookingIncomeCents / availableNights) : 0,
    bookingCount: bookingIds.size,
  };
}

export function buildMonthlyFinancialSeries(
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  year: number,
  propertyId: string | 'all',
  properties: PropertyConfig[] = ALL_PROPERTIES,
  throughMonth = 12
): FinancialSeriesPoint[] {
  const lastMonth = clampMonth(throughMonth, 12);
  return Array.from({ length: lastMonth }, (_, index) => {
    const month = index + 1;
    return {
      ...calculateReportSummary(
        bookings,
        expenses,
        extraIncomes,
        {
          period: 'monthly',
          year,
          month,
          propertyId,
        },
        properties
      ),
      key: `${year}-${String(month).padStart(2, '0')}`,
      label: MONTH_SHORT_NAMES[index],
      month,
    };
  });
}

export function buildPropertyFinancialSeries(
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  filter: ReportFilter,
  properties: PropertyConfig[] = ALL_PROPERTIES
): FinancialSeriesPoint[] {
  const selectedProperties =
    filter.propertyId === 'all'
      ? properties
      : properties.filter((property) => property.id === filter.propertyId);

  return selectedProperties.map((property) => ({
    ...calculateReportSummary(
      bookings,
      expenses,
      extraIncomes,
      { ...filter, propertyId: property.id },
      properties
    ),
    key: property.id,
    label: property.name,
    propertyId: property.id,
  }));
}

export function calculateYearComparison(
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  year: number,
  throughMonth: number,
  propertyId: string | 'all',
  properties: PropertyConfig[] = ALL_PROPERTIES
): YearComparison {
  const current = calculateReportSummary(
    bookings,
    expenses,
    extraIncomes,
    {
      period: 'yearly',
      year,
      month: throughMonth,
      throughMonth,
      propertyId,
    },
    properties
  );
  const previous = calculateReportSummary(
    bookings,
    expenses,
    extraIncomes,
    {
      period: 'yearly',
      year: year - 1,
      month: throughMonth,
      throughMonth,
      propertyId,
    },
    properties
  );

  return {
    current,
    previous,
    netDeltaCents: current.netBalanceCents - previous.netBalanceCents,
    netChangePct: percentageChange(
      current.netBalanceCents,
      previous.netBalanceCents
    ),
    bookingIncomeDeltaCents:
      current.bookingIncomeCents - previous.bookingIncomeCents,
    bookingIncomeChangePct: percentageChange(
      current.bookingIncomeCents,
      previous.bookingIncomeCents
    ),
    occupancyDeltaPoints:
      Math.round((current.occupancyRatePct - previous.occupancyRatePct) * 10) /
      10,
  };
}

export function buildYearOverYearMonthlySeries(
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  year: number,
  throughMonth: number,
  propertyId: string | 'all',
  properties: PropertyConfig[] = ALL_PROPERTIES
): YearComparisonPoint[] {
  const current = buildMonthlyFinancialSeries(
    bookings,
    expenses,
    extraIncomes,
    year,
    propertyId,
    properties,
    throughMonth
  );
  const previous = buildMonthlyFinancialSeries(
    bookings,
    expenses,
    extraIncomes,
    year - 1,
    propertyId,
    properties,
    throughMonth
  );

  return current.map((item, index) => ({
    key: item.key,
    label: item.label,
    month: item.month ?? index + 1,
    currentNetCents: item.netBalanceCents,
    previousNetCents: previous[index]?.netBalanceCents ?? 0,
    currentBookingIncomeCents: item.bookingIncomeCents,
    previousBookingIncomeCents: previous[index]?.bookingIncomeCents ?? 0,
  }));
}

export function getYearHighlights(
  points: FinancialSeriesPoint[]
): YearHighlights {
  const dataPoints = points.filter(hasFinancialData);
  if (dataPoints.length === 0) {
    return { bestMonth: null, worstMonth: null, negativeMonthCount: 0 };
  }

  return {
    bestMonth: dataPoints.reduce((best, point) =>
      point.netBalanceCents > best.netBalanceCents ? point : best
    ),
    worstMonth: dataPoints.reduce((worst, point) =>
      point.netBalanceCents < worst.netBalanceCents ? point : worst
    ),
    negativeMonthCount: dataPoints.filter((point) => point.netBalanceCents < 0)
      .length,
  };
}

function summarizeChannel(
  bookings: Booking[],
  channel: Channel,
  year: number,
  months: Set<number>,
  propertyIds: Set<string>,
  provisional = false
) {
  let bookingIncomeCents = 0;
  let occupiedNights = 0;
  const bookingIds = new Set<string>();

  for (const booking of bookings) {
    const eligible = provisional
      ? isProvisionalBooking(booking)
      : isReportableBooking(booking);
    if (
      !eligible ||
      booking.channel !== channel ||
      !propertyIds.has(booking.propertyId)
    ) {
      continue;
    }
    const nights = matchedNights(booking, year, months);
    if (nights.length === 0) continue;
    bookingIds.add(booking.id);
    occupiedNights += nights.length;
    bookingIncomeCents += nights.reduce(
      (sum, night) => sum + night.revenueCents,
      0
    );
  }

  return {
    bookingIncomeCents,
    occupiedNights,
    bookingCount: bookingIds.size,
  };
}

export function buildChannelFinancialSeries(
  bookings: Booking[],
  filter: ReportFilter,
  properties: PropertyConfig[] = ALL_PROPERTIES
): ChannelSeriesPoint[] {
  const months = new Set(getMonths(filter));
  const propertyIds = new Set(getPropertyIds(filter.propertyId, properties));
  const current = CHANNELS.map((channel) => ({
    channel,
    ...summarizeChannel(
      bookings,
      channel,
      filter.year,
      months,
      propertyIds
    ),
  }));
  const totalIncomeCents = current.reduce(
    (sum, item) => sum + item.bookingIncomeCents,
    0
  );

  return current
    .map((item) => {
      const previous = summarizeChannel(
        bookings,
        item.channel,
        filter.year - 1,
        months,
        propertyIds
      );
      const provisional = summarizeChannel(
        bookings,
        item.channel,
        filter.year,
        months,
        propertyIds,
        true
      );
      return {
        channel: item.channel,
        label: CHANNEL_CONFIG[item.channel].name,
        bookingIncomeCents: item.bookingIncomeCents,
        bookingCount: item.bookingCount,
        occupiedNights: item.occupiedNights,
        averageBookingCents:
          item.bookingCount > 0
            ? Math.round(item.bookingIncomeCents / item.bookingCount)
            : 0,
        averageStayNights:
          item.bookingCount > 0
            ? Math.round((item.occupiedNights / item.bookingCount) * 10) / 10
            : 0,
        incomeSharePct:
          totalIncomeCents > 0
            ? Math.round((item.bookingIncomeCents / totalIncomeCents) * 1000) /
              10
            : 0,
        previousBookingIncomeCents: previous.bookingIncomeCents,
        incomeChangePct: percentageChange(
          item.bookingIncomeCents,
          previous.bookingIncomeCents
        ),
        provisionalIncomeCents: provisional.bookingIncomeCents,
      };
    })
    .filter(
      (item) =>
        item.bookingIncomeCents !== 0 ||
        item.bookingCount !== 0 ||
        item.provisionalIncomeCents !== 0
    )
    .sort((a, b) => b.bookingIncomeCents - a.bookingIncomeCents);
}

export function buildChannelMonthlySeries(
  bookings: Booking[],
  year: number,
  throughMonth: number,
  propertyId: string | 'all',
  properties: PropertyConfig[] = ALL_PROPERTIES
): ChannelMonthlyPoint[] {
  const propertyIds = new Set(getPropertyIds(propertyId, properties));
  return Array.from({ length: clampMonth(throughMonth, 12) }, (_, index) => {
    const month = index + 1;
    const months = new Set([month]);
    return {
      key: `${year}-${String(month).padStart(2, '0')}`,
      label: MONTH_SHORT_NAMES[index],
      month,
      airbnbCents: summarizeChannel(
        bookings,
        'airbnb',
        year,
        months,
        propertyIds
      ).bookingIncomeCents,
      bookingComCents: summarizeChannel(
        bookings,
        'booking_com',
        year,
        months,
        propertyIds
      ).bookingIncomeCents,
      directCents: summarizeChannel(
        bookings,
        'direct',
        year,
        months,
        propertyIds
      ).bookingIncomeCents,
      vrboCents: summarizeChannel(
        bookings,
        'vrbo',
        year,
        months,
        propertyIds
      ).bookingIncomeCents,
    };
  });
}

export function buildChannelYearComparisonSeries(
  bookings: Booking[],
  year: number,
  throughMonth: number,
  propertyId: string | 'all',
  channel: Channel,
  properties: PropertyConfig[] = ALL_PROPERTIES
): ChannelYearComparisonPoint[] {
  const propertyIds = new Set(getPropertyIds(propertyId, properties));
  return Array.from({ length: clampMonth(throughMonth, 12) }, (_, index) => {
    const month = index + 1;
    const months = new Set([month]);
    return {
      key: `${year}-${String(month).padStart(2, '0')}`,
      label: MONTH_SHORT_NAMES[index],
      month,
      currentIncomeCents: summarizeChannel(
        bookings,
        channel,
        year,
        months,
        propertyIds
      ).bookingIncomeCents,
      previousIncomeCents: summarizeChannel(
        bookings,
        channel,
        year - 1,
        months,
        propertyIds
      ).bookingIncomeCents,
    };
  });
}

export function buildExpenseSeries(
  expenses: Expense[],
  filter: ReportFilter,
  properties: PropertyConfig[] = ALL_PROPERTIES
): ExpenseSeriesPoint[] {
  const months = new Set(getMonths(filter));
  const propertyIds = new Set(getPropertyIds(filter.propertyId, properties));
  const categoryTotals = new Map<string, number>();

  for (const expense of expenses) {
    if (
      expense.year !== filter.year ||
      !months.has(expense.month) ||
      !propertyIds.has(expense.propertyId)
    ) {
      continue;
    }
    const label = expense.category?.trim() || expense.label?.trim() || 'Other';
    categoryTotals.set(
      label,
      (categoryTotals.get(label) ?? 0) + Math.max(0, expense.amountCents)
    );
  }

  return Array.from(categoryTotals.entries())
    .map(([label, amountCents]) => ({
      key: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      label,
      amountCents,
    }))
    .sort((a, b) => b.amountCents - a.amountCents);
}

export function buildPropertyAnnualRanking(
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  year: number,
  throughMonth: number,
  properties: PropertyConfig[] = ALL_PROPERTIES
): PropertyAnnualPerformance[] {
  return properties
    .map((property) => {
      const current = calculateReportSummary(
        bookings,
        expenses,
        extraIncomes,
        {
          period: 'yearly',
          year,
          month: throughMonth,
          throughMonth,
          propertyId: property.id,
        },
        properties
      );
      const previous = calculateReportSummary(
        bookings,
        expenses,
        extraIncomes,
        {
          period: 'yearly',
          year: year - 1,
          month: throughMonth,
          throughMonth,
          propertyId: property.id,
        },
        properties
      );
      const monthly = buildMonthlyFinancialSeries(
        bookings,
        expenses,
        extraIncomes,
        year,
        property.id,
        properties,
        throughMonth
      );
      const bestMonth = getYearHighlights(monthly).bestMonth;
      const channels = buildChannelFinancialSeries(
        bookings,
        {
          period: 'yearly',
          year,
          month: throughMonth,
          throughMonth,
          propertyId: property.id,
        },
        properties
      );
      const topChannel = channels[0] ?? null;

      return {
        propertyId: property.id,
        propertyName: property.name,
        active: property.active,
        bookingIncomeCents: current.bookingIncomeCents,
        totalExpensesCents: current.totalExpensesCents,
        netBalanceCents: current.netBalanceCents,
        previousNetBalanceCents: previous.netBalanceCents,
        netChangePct: percentageChange(
          current.netBalanceCents,
          previous.netBalanceCents
        ),
        occupancyRatePct: current.occupancyRatePct,
        bestMonth,
        topChannel: topChannel?.channel ?? null,
        topChannelSharePct: topChannel?.incomeSharePct ?? 0,
      };
    })
    .filter((item) => {
      const property = properties.find(
        (candidate) => candidate.id === item.propertyId
      );
      return (
        property?.active ||
        item.bookingIncomeCents !== 0 ||
        item.totalExpensesCents !== 0 ||
        item.previousNetBalanceCents !== 0
      );
    })
    .sort((a, b) => b.netBalanceCents - a.netBalanceCents);
}

export function buildPropertyMonthlyPerformance(
  bookings: Booking[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[],
  year: number,
  throughMonth: number,
  propertyId: string,
  properties: PropertyConfig[] = ALL_PROPERTIES
): PropertyMonthlyPerformance[] {
  const current = buildMonthlyFinancialSeries(
    bookings,
    expenses,
    extraIncomes,
    year,
    propertyId,
    properties,
    throughMonth
  );
  const previous = buildMonthlyFinancialSeries(
    bookings,
    expenses,
    extraIncomes,
    year - 1,
    propertyId,
    properties,
    throughMonth
  );

  return current.map((item, index) => ({
    ...item,
    previousNetBalanceCents: previous[index]?.netBalanceCents ?? 0,
    netChangePct: percentageChange(
      item.netBalanceCents,
      previous[index]?.netBalanceCents ?? 0
    ),
  }));
}

export function buildPropertyChannelMatrix(
  bookings: Booking[],
  year: number,
  throughMonth: number,
  properties: PropertyConfig[] = ALL_PROPERTIES
): PropertyChannelMatrixRow[] {
  return properties
    .map((property) => {
      const series = buildChannelFinancialSeries(
        bookings,
        {
          period: 'yearly',
          year,
          month: throughMonth,
          throughMonth,
          propertyId: property.id,
        },
        properties
      );
      const byChannel = new Map(
        series.map((item) => [item.channel, item.bookingIncomeCents])
      );
      const airbnbCents = byChannel.get('airbnb') ?? 0;
      const bookingComCents = byChannel.get('booking_com') ?? 0;
      const directCents = byChannel.get('direct') ?? 0;
      const vrboCents = byChannel.get('vrbo') ?? 0;
      const totalCents =
        airbnbCents + bookingComCents + directCents + vrboCents;
      const top = series
        .filter((item) => item.bookingIncomeCents > 0)
        .sort((a, b) => b.bookingIncomeCents - a.bookingIncomeCents)[0];

      return {
        propertyId: property.id,
        propertyName: property.name,
        active: property.active,
        airbnbCents,
        bookingComCents,
        directCents,
        vrboCents,
        totalCents,
        topChannel: top?.channel ?? null,
        topChannelSharePct:
          totalCents > 0 && top
            ? Math.round((top.bookingIncomeCents / totalCents) * 1000) / 10
            : 0,
      };
    })
    .filter((item) => item.active || item.totalCents !== 0)
    .sort((a, b) => b.totalCents - a.totalCents);
}

export function buildBookingReportDetails(
  bookings: Booking[],
  filter: ReportFilter,
  channel: ReportChannel,
  properties: PropertyConfig[] = ALL_PROPERTIES
): BookingReportDetail[] {
  const months = new Set(getMonths(filter));
  const propertyIds = new Set(getPropertyIds(filter.propertyId, properties));
  const propertyNames = new Map(
    properties.map((property) => [property.id, property.name])
  );

  return bookings
    .filter(
      (booking) =>
        isReportableBooking(booking) &&
        propertyIds.has(booking.propertyId) &&
        (channel === 'all' || booking.channel === channel)
    )
    .map((booking) => {
      const nights = matchedNights(booking, filter.year, months);
      if (nights.length === 0) return null;
      return {
        bookingId: booking.id,
        guestName: booking.guestName,
        propertyId: booking.propertyId,
        propertyName:
          propertyNames.get(booking.propertyId) ?? booking.propertyId,
        channel: booking.channel,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        nights: nights.length,
        amountCents: nights.reduce(
          (sum, night) => sum + night.revenueCents,
          0
        ),
      };
    })
    .filter((item): item is BookingReportDetail => item !== null)
    .sort((a, b) => b.checkInDate.localeCompare(a.checkInDate));
}
