import { useEffect, useMemo, useState } from 'react';
import {
  buildBookingReportDetails,
  buildChannelMonthlySeries,
  buildChannelYearComparisonSeries,
  buildExpenseSeries,
  buildMonthlyFinancialSeries,
  buildPropertyAnnualRanking,
  buildPropertyChannelMatrix,
  buildPropertyFinancialSeries,
  buildPropertyMonthlyPerformance,
  buildYearOverYearMonthlySeries,
  calculateReportSummary,
  calculateYearComparison,
  getYearHighlights,
  ReportChannel,
  ReportFilter,
  ReportPeriod,
} from '../../../services/reportingService';
import { buildCompleteChannelFinancialSeries } from '../../../services/reportingPresentationService';
import { useDashboardStore } from '../../../store/useDashboardStore';
import { usePropertyStore } from '../../../store/usePropertyStore';
import { MONTH_NAMES } from '../../../utils/dateUtilities';
import { AnnualPropertyRow } from './reportUi';

const REPORT_PROPERTY_SESSION_KEY = 'shortlet-report-property-id';

export function useReportsDashboardData() {
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const bookings = useDashboardStore((state) => state.bookings);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);
  const openModal = useDashboardStore((state) => state.openModal);
  const properties = usePropertyStore((state) => state.properties);

  const reportProperties = useMemo(() => {
    const usedIds = new Set([
      ...bookings.map((booking) => booking.propertyId),
      ...expenses.map((expense) => expense.propertyId),
      ...extraIncomes.map((income) => income.propertyId),
    ]);
    const relevant = properties.filter(
      (property) => property.active || usedIds.has(property.id)
    );
    return relevant.length > 0 ? relevant : properties;
  }, [bookings, expenses, extraIncomes, properties]);

  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [platform, setPlatform] = useState<ReportChannel>('all');
  const [propertyId, setPropertyId] = useState<string | 'all'>(() => {
    const requested =
      typeof window === 'undefined'
        ? null
        : sessionStorage.getItem(REPORT_PROPERTY_SESSION_KEY);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(REPORT_PROPERTY_SESSION_KEY);
    }
    return requested && reportProperties.some((property) => property.id === requested)
      ? requested
      : 'all';
  });

  useEffect(() => {
    if (
      propertyId !== 'all' &&
      !reportProperties.some((property) => property.id === propertyId)
    ) {
      setPropertyId('all');
    }
  }, [propertyId, reportProperties]);

  const currentCalendarYear = new Date().getFullYear();
  const throughMonth =
    period === 'yearly' && selectedYear === currentCalendarYear
      ? selectedMonth
      : 12;
  const filter: ReportFilter = {
    period,
    year: selectedYear,
    month: selectedMonth,
    throughMonth,
    propertyId,
  };

  const summary = useMemo(
    () =>
      calculateReportSummary(
        bookings,
        expenses,
        extraIncomes,
        filter,
        reportProperties
      ),
    [bookings, expenses, extraIncomes, period, selectedYear, selectedMonth, throughMonth, propertyId, reportProperties]
  );

  const yearComparison = useMemo(
    () =>
      period === 'yearly'
        ? calculateYearComparison(
            bookings,
            expenses,
            extraIncomes,
            selectedYear,
            throughMonth,
            propertyId,
            reportProperties
          )
        : null,
    [bookings, expenses, extraIncomes, period, selectedYear, throughMonth, propertyId, reportProperties]
  );

  const monthlySeries = useMemo(
    () =>
      buildMonthlyFinancialSeries(
        bookings,
        expenses,
        extraIncomes,
        selectedYear,
        propertyId,
        reportProperties,
        throughMonth
      ),
    [bookings, expenses, extraIncomes, selectedYear, throughMonth, propertyId, reportProperties]
  );
  const highlights = useMemo(() => getYearHighlights(monthlySeries), [monthlySeries]);

  const propertyFinancialSeries = useMemo(
    () =>
      buildPropertyFinancialSeries(
        bookings,
        expenses,
        extraIncomes,
        filter,
        reportProperties
      ).map((item) => ({
        ...item,
        expensesDisplayCents: -item.totalExpensesCents,
      })),
    [bookings, expenses, extraIncomes, period, selectedYear, selectedMonth, propertyId, reportProperties]
  );

  const yearOverYearSeries = useMemo(
    () =>
      buildYearOverYearMonthlySeries(
        bookings,
        expenses,
        extraIncomes,
        selectedYear,
        throughMonth,
        propertyId,
        reportProperties
      ),
    [bookings, expenses, extraIncomes, selectedYear, throughMonth, propertyId, reportProperties]
  );

  const channelSeries = useMemo(
    () => buildCompleteChannelFinancialSeries(bookings, filter, reportProperties),
    [bookings, period, selectedYear, selectedMonth, throughMonth, propertyId, reportProperties]
  );
  const expenseSeries = useMemo(
    () => buildExpenseSeries(expenses, filter, reportProperties),
    [expenses, period, selectedYear, selectedMonth, throughMonth, propertyId, reportProperties]
  );

  const propertyRanking = useMemo<AnnualPropertyRow[]>(
    () =>
      period === 'yearly'
        ? buildPropertyAnnualRanking(
            bookings,
            expenses,
            extraIncomes,
            selectedYear,
            throughMonth,
            reportProperties
          ).map((item) => {
            const detail = calculateReportSummary(
              bookings,
              expenses,
              extraIncomes,
              {
                period: 'yearly',
                year: selectedYear,
                month: throughMonth,
                throughMonth,
                propertyId: item.propertyId,
              },
              reportProperties
            );
            return {
              ...item,
              extraIncomeCents: detail.extraIncomeCents,
              totalIncomeCents: detail.bookingIncomeCents + detail.extraIncomeCents,
            };
          })
        : [],
    [bookings, expenses, extraIncomes, period, selectedYear, throughMonth, reportProperties]
  );

  const propertyMonthlyPerformance = useMemo(
    () =>
      period === 'yearly' && propertyId !== 'all'
        ? buildPropertyMonthlyPerformance(
            bookings,
            expenses,
            extraIncomes,
            selectedYear,
            throughMonth,
            propertyId,
            reportProperties
          )
        : [],
    [bookings, expenses, extraIncomes, period, selectedYear, throughMonth, propertyId, reportProperties]
  );

  const channelMonthlySeries = useMemo(
    () =>
      buildChannelMonthlySeries(
        bookings,
        selectedYear,
        throughMonth,
        propertyId,
        reportProperties
      ),
    [bookings, selectedYear, throughMonth, propertyId, reportProperties]
  );
  const selectedChannelComparison = useMemo(
    () =>
      platform === 'all'
        ? []
        : buildChannelYearComparisonSeries(
            bookings,
            selectedYear,
            throughMonth,
            propertyId,
            platform,
            reportProperties
          ),
    [bookings, selectedYear, throughMonth, propertyId, platform, reportProperties]
  );
  const propertyChannelMatrix = useMemo(
    () =>
      period === 'yearly' && propertyId === 'all'
        ? buildPropertyChannelMatrix(
            bookings,
            selectedYear,
            throughMonth,
            reportProperties
          )
        : [],
    [bookings, period, selectedYear, throughMonth, propertyId, reportProperties]
  );
  const bookingDetails = useMemo(
    () => buildBookingReportDetails(bookings, filter, platform, reportProperties),
    [bookings, period, selectedYear, selectedMonth, throughMonth, propertyId, platform, reportProperties]
  );

  const propertyOptions = [
    { value: 'all', label: 'All Properties' },
    ...reportProperties.map((property) => ({
      value: property.id,
      label: `${property.name}${property.active ? '' : ' · Inactive'}`,
    })),
  ];
  const periodLabel =
    period === 'yearly'
      ? throughMonth < 12
        ? `January–${MONTH_NAMES[throughMonth - 1]} ${selectedYear}`
        : `${selectedYear} full year`
      : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  return {
    selectedMonth,
    selectedYear,
    period,
    setPeriod,
    platform,
    setPlatform,
    propertyId,
    setPropertyId,
    throughMonth,
    propertyOptions,
    periodLabel,
    summary,
    yearComparison,
    highlights,
    propertyFinancialSeries,
    yearOverYearSeries,
    channelSeries,
    expenseSeries,
    propertyRanking,
    propertyMonthlyPerformance,
    channelMonthlySeries,
    selectedChannelComparison,
    propertyChannelMatrix,
    bookingDetails,
    openBooking: (bookingId: string) => openModal('booking_edit', { bookingId }),
  };
}
