import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  CalendarDays,
  CalendarPlus,
  CircleDot,
  LogOut,
  WalletCards,
} from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import {
  getActiveProperties,
  usePropertyStore,
} from '../../store/usePropertyStore';
import { LOCATIONS } from '../../config/locations';
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

const MOBILE_DAY_ROW_HEIGHT = 64;
const REPORT_PROPERTY_SESSION_KEY = 'shortlet-report-property-id';
type MobileSection = 'schedule' | 'finance';

const channelMeta = {
  airbnb: {
    label: 'Airbnb',
    dot: 'bg-[#ff5a5f]',
    accent: 'border-l-[#ff5a5f]',
    block: 'border-[#ffc8c5] bg-[#fff5f4] text-[#4e292c]',
    badge: 'border-[#f2b0ad] bg-white text-[#a93439]',
  },
  booking_com: {
    label: 'Booking.com',
    dot: 'bg-[#3478d4]',
    accent: 'border-l-[#3478d4]',
    block: 'border-[#bfd6ed] bg-[#f2f7fd] text-[#234f79]',
    badge: 'border-[#b7d0ea] bg-white text-[#245f9b]',
  },
  direct: {
    label: 'Direct',
    dot: 'bg-[#18a875]',
    accent: 'border-l-[#18a875]',
    block: 'border-[#b8dfcf] bg-[#f1f9f5] text-[#245c48]',
    badge: 'border-[#add9c6] bg-white text-[#1f6b4e]',
  },
  vrbo: {
    label: 'VRBO',
    dot: 'bg-[#8b5bd1]',
    accent: 'border-l-[#8b5bd1]',
    block: 'border-[#d4c2e6] bg-[#f7f2fb] text-[#5b4175]',
    badge: 'border-[#cdb8e0] bg-white text-[#684b8b]',
  },
} as const;

interface MobileBookingSpan {
  key: string;
  booking: Booking;
  startIndex: number;
  visibleDates: string[];
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
  const showProvisionalBlock = useDashboardStore(
    (state) => state.userPreferences.showProvisionalBlock
  );
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
  const dayByDate = useMemo(
    () => new Map(days.map((day) => [day.dateStr, day] as const)),
    [days]
  );
  const property = activeProperties.find(
    (item) => item.id === selectedPropertyId
  );

  const bookingSpans = useMemo<MobileBookingSpan[]>(() => {
    if (!property) return [];

    const spans: MobileBookingSpan[] = [];
    const processedBookingIds = new Set<string>();

    days.forEach((day, startIndex) => {
      const state = getCellBookingState(property.id, day.dateStr, bookings);
      if (
        !state.isOccupied ||
        !state.booking ||
        processedBookingIds.has(state.booking.id)
      ) {
        return;
      }

      const booking = state.booking;
      const visibleDates: string[] = [];
      let cursor = startIndex;

      while (cursor < days.length) {
        const cursorState = getCellBookingState(
          property.id,
          days[cursor].dateStr,
          bookings
        );
        if (
          !cursorState.isOccupied ||
          cursorState.booking?.id !== booking.id
        ) {
          break;
        }
        visibleDates.push(days[cursor].dateStr);
        cursor += 1;
      }

      processedBookingIds.add(booking.id);
      spans.push({
        key: `mobile-booking-${booking.id}-${day.dateStr}`,
        booking,
        startIndex,
        visibleDates,
      });
    });

    return spans;
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
      <div className="flex h-full items-center justify-center p-6 text-sm text-[#756e69] md:hidden">
        Add an active property from Settings.
      </div>
    );
  }

  const options = activeProperties.map((item) => ({
    value: item.id,
    label: item.name,
    icon: <Building2 className="h-4 w-4 text-[#ff5a5f]" />,
    badge: (
      <span className="text-[10px] font-semibold uppercase text-[#756e69]">
        {LOCATIONS.find((location) => location.id === item.locationId)?.name}
      </span>
    ),
  }));

  const openNewBooking = (dateStr?: string) => {
    openModal('booking_add', {
      prefilledPropertyId: property.id,
      ...(dateStr ? { prefilledDate: dateStr } : {}),
    });
  };

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
            className={`flex h-11 items-center justify-center gap-2 rounded-lg text-[11px] font-extrabold uppercase transition-colors ${
              section === 'schedule'
                ? 'bg-[#ff5a5f] text-white shadow-sm'
                : 'text-[#5f5955]'
            }`}
          >
            <CalendarDays className="h-4 w-4" /> Schedule
          </button>
          <button
            type="button"
            onClick={() => setSection('finance')}
            className={`flex h-11 items-center justify-center gap-2 rounded-lg text-[11px] font-extrabold uppercase transition-colors ${
              section === 'finance'
                ? 'bg-[#ff5a5f] text-white shadow-sm'
                : 'text-[#5f5955]'
            }`}
          >
            <WalletCards className="h-4 w-4" /> Finance
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
        {section === 'schedule' ? (
          <div
            className="relative grid grid-cols-[54px_minmax(0,1fr)] bg-white"
            style={{
              gridTemplateRows: `repeat(${days.length}, ${MOBILE_DAY_ROW_HEIGHT}px)`,
            }}
          >
            {days.map((day, index) => {
              const state = getCellBookingState(
                property.id,
                day.dateStr,
                bookings
              );
              const checkoutBooking =
                !state.isOccupied && state.isCheckOut ? state.booking : null;

              return (
                <React.Fragment key={day.dateStr}>
                  <div
                    style={{ gridColumn: 1, gridRow: index + 1 }}
                    className={`z-[1] flex flex-col items-center justify-center border-b border-r border-[#e7dfdb] ${
                      day.isToday
                        ? 'bg-[#fff0ef] text-[#c73e44]'
                        : day.isWeekend
                          ? 'bg-[#faf8f6] text-[#3f3a37]'
                          : 'bg-white text-[#24211f]'
                    }`}
                  >
                    <span className="text-[15px] font-extrabold leading-none tabular-nums">
                      {day.dayNumber}
                    </span>
                    <span className="mt-1.5 text-[9px] font-bold uppercase tracking-wide text-[#6f6864]">
                      {day.weekday}
                    </span>
                  </div>

                  <div
                    style={{ gridColumn: 2, gridRow: index + 1 }}
                    className={`border-b border-[#e7dfdb] ${
                      day.isToday
                        ? 'bg-[#fff8f7]'
                        : day.isWeekend
                          ? 'bg-[#fdfaf8]'
                          : 'bg-white'
                    }`}
                  >
                    {!state.isOccupied &&
                      (checkoutBooking ? (
                        <div className="flex h-full items-center justify-between gap-2 px-3">
                          <button
                            type="button"
                            onClick={() =>
                              openModal('booking_edit', {
                                bookingId: checkoutBooking.id,
                              })
                            }
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          >
                            <LogOut className="h-4 w-4 flex-shrink-0 text-[#a66a17]" />
                            <div className="min-w-0">
                              <span className="block truncate text-[11px] font-extrabold text-[#3f3a37]">
                                Checkout ·{' '}
                                {getGuestDisplayName(checkoutBooking.guestName)}
                              </span>
                              <span className="mt-0.5 block text-[10px] font-semibold text-[#817873]">
                                Ready for a new reservation
                              </span>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => openNewBooking(day.dateStr)}
                            className="flex h-11 min-w-11 flex-shrink-0 items-center justify-center rounded-xl border border-[#e7dfdb] bg-white px-3 text-[10px] font-extrabold uppercase text-[#5f5955] shadow-sm"
                            aria-label="Create a reservation on checkout day"
                          >
                            <CalendarPlus className="h-4 w-4 text-[#ff5a5f]" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openNewBooking(day.dateStr)}
                          className="flex h-full w-full items-center justify-between gap-3 px-3 text-left transition-colors hover:bg-[#fff7f5]"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <CircleDot className="h-4 w-4 flex-shrink-0 text-[#18a875]" />
                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#817873]">
                              Available
                            </span>
                          </div>
                          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-[#ff5a5f]">
                            <CalendarPlus className="h-5 w-5" />
                          </span>
                        </button>
                      ))}
                  </div>
                </React.Fragment>
              );
            })}

            {bookingSpans.map((span) => {
              const booking = span.booking;
              const channel = channelMeta[booking.channel];
              const occupiedBookingNights = getBookingOccupiedNights(booking);
              const guestName = getGuestDisplayName(booking.guestName);
              const totalNights = occupiedBookingNights.length;
              const totalCents = occupiedBookingNights.reduce(
                (sum, night) => sum + night.allocatedRevenueCents,
                0
              );
              const continuesOutsideMonth =
                span.visibleDates.length < totalNights;
              const provisionalStripeClass =
                booking.status === 'provisional' && showProvisionalBlock
                  ? 'bg-[linear-gradient(135deg,rgba(76,57,52,0.055)_25%,transparent_25%,transparent_50%,rgba(76,57,52,0.055)_50%,rgba(76,57,52,0.055)_75%,transparent_75%,transparent)] bg-[length:16px_16px]'
                  : '';

              const revenueForNight = (dateStr: string) =>
                occupiedBookingNights.find((night) => night.dateStr === dateStr)
                  ?.allocatedRevenueCents ?? booking.nightlyRateCents;

              return (
                <button
                  key={span.key}
                  type="button"
                  onClick={() =>
                    openModal('booking_edit', { bookingId: booking.id })
                  }
                  style={{
                    gridColumn: 2,
                    gridRow: `${span.startIndex + 1} / span ${span.visibleDates.length}`,
                  }}
                  className={`z-10 m-1.5 min-h-0 overflow-hidden rounded-2xl border border-l-4 text-left shadow-[0_6px_18px_rgba(52,42,37,0.08)] transition-transform active:scale-[0.99] ${channel.block} ${channel.accent} ${provisionalStripeClass}`}
                >
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="flex min-h-0 items-start justify-between gap-3 border-b border-black/10 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${channel.dot}`}
                          />
                          <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold normal-case leading-tight">
                            {guestName}
                          </span>
                        </div>
                        <span className="mt-1.5 block truncate text-[10px] font-semibold opacity-75">
                          {formatMobileDate(booking.checkInDate)} →{' '}
                          {formatMobileDate(booking.checkOutDate)} · {totalNights}{' '}
                          {totalNights === 1 ? 'night' : 'nights'}
                          {continuesOutsideMonth ? ' · Continues' : ''}
                        </span>
                      </div>

                      <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                        <span
                          className={`rounded-lg border px-2 py-1 text-[9px] font-extrabold leading-none ${channel.badge}`}
                        >
                          {channel.label}
                        </span>
                        <strong className="text-[12px] font-extrabold tabular-nums">
                          {formatCents(totalCents)}
                        </strong>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 divide-y divide-black/10">
                      {span.visibleDates.map((dateStr) => {
                        const day = dayByDate.get(dateStr);
                        return (
                          <div
                            key={dateStr}
                            className="flex min-h-[32px] flex-1 items-center justify-between gap-3 px-3"
                          >
                            <span className="flex min-w-0 items-baseline gap-2 text-[11px] font-bold">
                              <strong className="text-[12px] font-extrabold tabular-nums">
                                {day?.dayNumber ?? Number(dateStr.slice(-2))}
                              </strong>
                              <span className="uppercase opacity-65">
                                {day?.weekday}
                              </span>
                            </span>
                            <span className="flex-shrink-0 text-[11px] font-extrabold tabular-nums">
                              {formatCents(revenueForNight(dateStr))} / night
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : financials ? (
          <div className="space-y-3 bg-[#fffdfc] p-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="min-h-24 rounded-2xl border border-[#d9e4ec] bg-[#f3f8fb] p-3.5">
                <span className="text-[11px] font-extrabold uppercase text-[#506776]">
                  Occupancy
                </span>
                <strong className="mt-2 block text-xl font-extrabold text-[#285f7d] tabular-nums">
                  {occupancy}%
                </strong>
              </div>
              <div className="min-h-24 rounded-2xl border border-[#b8dfcf] bg-[#eef8f3] p-3.5">
                <span className="text-[11px] font-extrabold uppercase text-[#34745d]">
                  Booking Income
                </span>
                <strong className="mt-2 block text-xl font-extrabold text-[#1f6b4e] tabular-nums">
                  {formatCents(financials.bookingIncomeCents)}
                </strong>
              </div>
              <div className="min-h-24 rounded-2xl border border-[#efc3c0] bg-[#fff1f0] p-3.5">
                <span className="text-[11px] font-extrabold uppercase text-[#93454a]">
                  Expenses
                </span>
                <strong className="mt-2 block text-xl font-extrabold text-[#a93439] tabular-nums">
                  -{formatCents(financials.totalExpensesCents)}
                </strong>
              </div>
              <div className="min-h-24 rounded-2xl border border-[#e7dfdb] bg-white p-3.5">
                <span className="text-[11px] font-extrabold uppercase text-[#5f5955]">
                  Net Balance
                </span>
                <strong
                  className={`mt-2 block text-xl font-extrabold tabular-nums ${
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
              className="h-12 w-full rounded-xl bg-[#ff5a5f] text-[11px] font-extrabold uppercase text-white shadow-sm"
            >
              Edit Monthly Finance
            </button>
            <button
              type="button"
              onClick={openReports}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#e7dfdb] bg-white text-[11px] font-extrabold uppercase text-[#3f3a37]"
            >
              <BarChart3 className="h-4 w-4" /> Open Reports
            </button>
          </div>
        ) : null}
      </div>

      {section === 'schedule' && (
        <div className="flex-shrink-0 border-t border-[#e7dfdb] bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => openNewBooking()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ff5a5f] px-5 text-[11px] font-extrabold uppercase text-white shadow-[0_8px_20px_rgba(255,90,95,0.24)]"
          >
            <CalendarPlus className="h-5 w-5" /> New Booking
          </button>
        </div>
      )}
    </div>
  );
}
