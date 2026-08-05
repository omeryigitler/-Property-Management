import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  CalendarDays,
  CalendarPlus,
  WalletCards,
} from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import {
  getActiveProperties,
  usePropertyStore,
} from '../../store/usePropertyStore';
import { CHANNEL_CONFIG, LOCATIONS } from '../../config/locations';
import { Booking } from '../../types';
import { getDaysForMonth } from '../../utils/dateUtilities';
import {
  getBookingOccupiedNights,
  getCellBookingState,
} from '../../utils/bookingCalculations';
import { calculatePropertyFinancials } from '../../utils/financeCalculations';
import { formatCents } from '../../utils/currency';
import { getGuestDisplayName } from '../../utils/guestNames';
import { CustomSelect } from '../common/CustomSelect';

const REPORT_PROPERTY_SESSION_KEY = 'shortlet-report-property-id';
type MobileSection = 'schedule' | 'finance';

interface MobileBookingSpan {
  booking: Booking;
  startIndex: number;
  rowSpan: number;
  visibleNights: number;
  totalNights: number;
  totalCents: number;
}

function formatMobileDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function MobileCalendarView() {
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const bookings = useDashboardStore((state) => state.bookings);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);
  const openModal = useDashboardStore((state) => state.openModal);
  const setMainViewMode = useDashboardStore((state) => state.setMainViewMode);
  const activeProperties = getActiveProperties(
    usePropertyStore((state) => state.properties)
  );
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    activeProperties[0]?.id ?? ''
  );
  const [section, setSection] = useState<MobileSection>('schedule');

  useEffect(() => {
    if (!activeProperties.some((property) => property.id === selectedPropertyId)) {
      setSelectedPropertyId(activeProperties[0]?.id ?? '');
    }
  }, [activeProperties, selectedPropertyId]);

  const days = useMemo(
    () => getDaysForMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );
  const property = activeProperties.find(
    (item) => item.id === selectedPropertyId
  );

  const bookingSpans = useMemo<MobileBookingSpan[]>(() => {
    if (!property) return [];

    const dayIndexByDate = new Map(
      days.map((day, index) => [day.dateStr, index] as const)
    );

    return bookings
      .filter(
        (booking) =>
          booking.propertyId === property.id && booking.status !== 'cancelled'
      )
      .map((booking) => {
        const allNights = getBookingOccupiedNights(booking);
        const visibleNights = allNights.filter((night) =>
          dayIndexByDate.has(night.dateStr)
        );

        if (visibleNights.length === 0) return null;

        const indexes = visibleNights
          .map((night) => dayIndexByDate.get(night.dateStr))
          .filter((index): index is number => index != null);
        const startIndex = Math.min(...indexes);
        const endIndex = Math.max(...indexes);

        return {
          booking,
          startIndex,
          rowSpan: endIndex - startIndex + 1,
          visibleNights: visibleNights.length,
          totalNights: allNights.length,
          totalCents: allNights.reduce(
            (sum, night) => sum + night.allocatedRevenueCents,
            0
          ),
        };
      })
      .filter((span): span is MobileBookingSpan => Boolean(span))
      .sort((left, right) => left.startIndex - right.startIndex);
  }, [bookings, days, property]);

  const financials = property
    ? calculatePropertyFinancials(
        property.id,
        selectedYear,
        selectedMonth,
        bookings,
        expenses,
        extraIncomes
      )
    : null;
  const occupiedNights = property
    ? days.filter(
        (day) => getCellBookingState(property.id, day.dateStr, bookings).isOccupied
      ).length
    : 0;
  const occupancy =
    days.length > 0 ? Math.round((occupiedNights / days.length) * 100) : 0;

  if (!property) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-xs text-slate-500 md:hidden">
        Add an active property from Settings.
      </div>
    );
  }

  const options = activeProperties.map((item) => ({
    value: item.id,
    label: item.name,
    icon: <Building2 className="h-3.5 w-3.5 text-[#ff5a5f]" />,
    badge: (
      <span className="text-[9px] uppercase text-[#756e69]">
        {LOCATIONS.find((location) => location.id === item.locationId)?.name}
      </span>
    ),
  }));

  const openReports = () => {
    sessionStorage.setItem(REPORT_PROPERTY_SESSION_KEY, property.id);
    setMainViewMode('analytics');
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden md:hidden">
      <div className="flex-shrink-0 space-y-3 border-b border-[#e7dfdb] bg-[#fffdfc] pb-3">
        <CustomSelect
          label="Property"
          value={property.id}
          options={options}
          onChange={setSelectedPropertyId}
        />
        <div className="grid grid-cols-2 rounded-xl border border-[#e7dfdb] bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setSection('schedule')}
            className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-[10px] font-extrabold uppercase transition-colors ${
              section === 'schedule'
                ? 'bg-[#ff5a5f] text-white shadow-sm'
                : 'text-[#6f6864]'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Schedule
          </button>
          <button
            type="button"
            onClick={() => setSection('finance')}
            className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-[10px] font-extrabold uppercase transition-colors ${
              section === 'finance'
                ? 'bg-[#ff5a5f] text-white shadow-sm'
                : 'text-[#6f6864]'
            }`}
          >
            <WalletCards className="h-3.5 w-3.5" /> Finance
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-[max(6rem,env(safe-area-inset-bottom))] no-scrollbar">
        {section === 'schedule' ? (
          <div className="grid auto-rows-[58px] grid-cols-[58px_minmax(0,1fr)_36px] bg-white">
            {days.map((day, index) => {
              const state = getCellBookingState(
                property.id,
                day.dateStr,
                bookings
              );
              const occupiedBooking = state.isOccupied ? state.booking : null;

              return (
                <React.Fragment key={day.dateStr}>
                  <div
                    aria-hidden="true"
                    className={`z-0 border-b border-[#e7dfdb] ${
                      day.isToday
                        ? 'bg-[#fff0ef]'
                        : day.isWeekend
                          ? 'bg-[#faf8f6]'
                          : 'bg-white'
                    }`}
                    style={{ gridColumn: '1 / -1', gridRow: index + 1 }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      occupiedBooking
                        ? openModal('booking_edit', {
                            bookingId: occupiedBooking.id,
                          })
                        : openModal('booking_add', {
                            prefilledPropertyId: property.id,
                            prefilledDate: day.dateStr,
                          })
                    }
                    className="z-10 flex flex-col items-center justify-center text-center"
                    style={{ gridColumn: 1, gridRow: index + 1 }}
                    aria-label={`${day.dayNumber} ${day.weekday}`}
                  >
                    <span className="block text-sm font-extrabold text-[#24211f]">
                      {day.dayNumber}
                    </span>
                    <span className="text-[8px] font-extrabold uppercase text-[#756e69]">
                      {day.weekday}
                    </span>
                  </button>

                  {!state.isOccupied && (
                    <button
                      type="button"
                      onClick={() =>
                        openModal('booking_add', {
                          prefilledPropertyId: property.id,
                          prefilledDate: day.dateStr,
                        })
                      }
                      className="z-10 flex items-center px-3 text-left text-[10px] font-extrabold uppercase text-[#9a918c]"
                      style={{ gridColumn: 2, gridRow: index + 1 }}
                    >
                      Available
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      occupiedBooking
                        ? openModal('booking_edit', {
                            bookingId: occupiedBooking.id,
                          })
                        : openModal('booking_add', {
                            prefilledPropertyId: property.id,
                            prefilledDate: day.dateStr,
                          })
                    }
                    className="z-30 flex items-center justify-center text-[#ff5a5f]"
                    style={{ gridColumn: 3, gridRow: index + 1 }}
                    aria-label={occupiedBooking ? 'Edit booking' : 'Add booking'}
                  >
                    <CalendarPlus className="h-4 w-4" />
                  </button>
                </React.Fragment>
              );
            })}

            {bookingSpans.map((span) => {
              const channelConfig = CHANNEL_CONFIG[span.booking.channel];
              const guestName = getGuestDisplayName(span.booking.guestName);
              const compact = span.rowSpan === 1;

              return (
                <button
                  key={span.booking.id}
                  type="button"
                  onClick={() =>
                    openModal('booking_edit', { bookingId: span.booking.id })
                  }
                  className={`z-20 m-1 min-h-0 overflow-hidden rounded-xl border text-left shadow-sm transition-transform active:scale-[0.99] ${
                    channelConfig.colorClass
                  } ${
                    span.booking.status === 'provisional'
                      ? 'border-dashed'
                      : ''
                  }`}
                  style={{
                    gridColumn: 2,
                    gridRow: `${span.startIndex + 1} / span ${span.rowSpan}`,
                  }}
                >
                  <div
                    className={`flex h-full min-h-0 flex-col ${
                      compact ? 'justify-center px-3 py-2' : 'p-3'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`h-2 w-2 flex-shrink-0 rounded-full ${channelConfig.dotColor}`}
                      />
                      <span className="min-w-0 flex-1 truncate text-[11px] font-extrabold normal-case">
                        {guestName}
                      </span>
                      <span
                        className={`flex-shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-bold ${channelConfig.badgeClass}`}
                      >
                        {channelConfig.name}
                      </span>
                    </div>

                    {compact ? (
                      <span className="mt-1 block text-[9px] font-semibold opacity-75">
                        {formatCents(span.booking.nightlyRateCents)} / night
                      </span>
                    ) : (
                      <>
                        <span className="mt-2 text-[9px] font-semibold opacity-75">
                          {formatMobileDate(span.booking.checkInDate)} →{' '}
                          {formatMobileDate(span.booking.checkOutDate)} ·{' '}
                          {span.totalNights}{' '}
                          {span.totalNights === 1 ? 'night' : 'nights'}
                        </span>
                        <div className="mt-auto flex items-end justify-between gap-2 border-t border-current/15 pt-2">
                          <span className="text-[9px] font-semibold opacity-75">
                            {formatCents(span.booking.nightlyRateCents)} / night
                          </span>
                          <strong className="text-[11px] font-extrabold">
                            {formatCents(span.totalCents)}
                          </strong>
                        </div>
                      </>
                    )}

                    {span.visibleNights < span.totalNights && (
                      <span className="mt-1 text-[8px] font-semibold opacity-60">
                        Continues outside this month
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : financials ? (
          <div className="space-y-3 bg-[#fffdfc] p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[#d9e4ec] bg-[#f3f8fb] p-3">
                <span className="text-[9px] font-extrabold uppercase text-[#5f7180]">
                  Occupancy
                </span>
                <strong className="mt-1 block text-lg font-extrabold text-[#285f7d]">
                  {occupancy}%
                </strong>
              </div>
              <div className="rounded-xl border border-[#b8dfcf] bg-[#eef8f3] p-3">
                <span className="text-[9px] font-extrabold uppercase text-[#34745d]">
                  Booking Income
                </span>
                <strong className="mt-1 block text-lg font-extrabold text-[#1f6b4e]">
                  {formatCents(financials.bookingIncomeCents)}
                </strong>
              </div>
              <div className="rounded-xl border border-[#efc3c0] bg-[#fff1f0] p-3">
                <span className="text-[9px] font-extrabold uppercase text-[#a34b4f]">
                  Expenses
                </span>
                <strong className="mt-1 block text-lg font-extrabold text-[#a93439]">
                  -{formatCents(financials.totalExpensesCents)}
                </strong>
              </div>
              <div className="rounded-xl border border-[#e7dfdb] bg-white p-3">
                <span className="text-[9px] font-extrabold uppercase text-[#6f6864]">
                  Net Balance
                </span>
                <strong
                  className={`mt-1 block text-lg font-extrabold ${
                    financials.netBalanceCents >= 0
                      ? 'text-[#1f6b4e]'
                      : 'text-[#a93439]'
                  }`}
                >
                  {formatCents(financials.netBalanceCents)}
                </strong>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                openModal('settings', {
                  section: 'finance',
                  propertyId: property.id,
                })
              }
              className="h-11 w-full rounded-xl bg-[#ff5a5f] text-xs font-extrabold uppercase text-white shadow-sm"
            >
              Edit Monthly Finance
            </button>
            <button
              type="button"
              onClick={openReports}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#e7dfdb] bg-white text-xs font-extrabold uppercase text-[#3f3a37]"
            >
              <BarChart3 className="h-4 w-4" /> Open Reports
            </button>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() =>
          openModal('booking_add', { prefilledPropertyId: property.id })
        }
        className="absolute bottom-4 right-4 flex h-12 items-center gap-2 rounded-full bg-[#ff5a5f] px-5 text-xs font-extrabold uppercase text-white shadow-xl"
      >
        <CalendarPlus className="h-4 w-4" /> New Booking
      </button>
    </div>
  );
}
