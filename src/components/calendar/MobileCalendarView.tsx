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

const MOBILE_DAY_ROW_HEIGHT = 58;
const REPORT_PROPERTY_SESSION_KEY = 'shortlet-report-property-id';
type MobileSection = 'schedule' | 'finance';

const channelMeta = {
  airbnb: {
    label: 'Airbnb',
    badge: 'border-[#f0aaa6] bg-white/90 text-[#a93439]',
    block: 'border-[#ffb9b5] bg-[#fff0ef] text-[#5c292c]',
    rail: 'border-[#e5484e] bg-[#ff5a5f]',
  },
  booking_com: {
    label: 'Booking.com',
    badge: 'border-[#b9d2eb] bg-white/90 text-[#1f5f9f]',
    block: 'border-[#bdd4ed] bg-[#eef5ff] text-[#254d77]',
    rail: 'border-[#2e68b8] bg-[#3478d4]',
  },
  direct: {
    label: 'Direct',
    badge: 'border-[#add9c6] bg-white/90 text-[#1f6b4e]',
    block: 'border-[#b7dfce] bg-[#edf8f3] text-[#245b47]',
    rail: 'border-[#14875e] bg-[#18a875]',
  },
  vrbo: {
    label: 'VRBO',
    badge: 'border-[#ceb8e1] bg-white/90 text-[#65468b]',
    block: 'border-[#d5c1e7] bg-[#f5effc] text-[#5d4475]',
    rail: 'border-[#7047ad] bg-[#8b5bd1]',
  },
} as const;

interface MobileBookingSpan {
  key: string;
  booking: Booking;
  startIndex: number;
  visibleDates: string[];
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
      <div className="flex h-full items-center justify-center p-6 text-xs text-[#756e69] md:hidden">
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
          <div
            className="relative grid grid-cols-[58px_minmax(0,1fr)] bg-white"
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
                          ? 'bg-[#faf8f6] text-[#4f4946]'
                          : 'bg-white text-[#24211f]'
                    }`}
                  >
                    <span className="text-sm font-extrabold leading-none">
                      {day.dayNumber}
                    </span>
                    <span className="mt-1 text-[8px] font-extrabold uppercase tracking-wide text-[#756e69]">
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
                        <div className="flex h-full items-center justify-between gap-2 px-2">
                          <button
                            type="button"
                            onClick={() =>
                              openModal('booking_edit', {
                                bookingId: checkoutBooking.id,
                              })
                            }
                            className="flex min-w-0 items-center gap-2 text-left"
                          >
                            <LogOut className="h-3.5 w-3.5 flex-shrink-0 text-[#b7791f]" />
                            <span className="block min-w-0 truncate text-[10px] font-extrabold text-[#4f4946]">
                              Checkout ·{' '}
                              {getGuestDisplayName(checkoutBooking.guestName)}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openNewBooking(day.dateStr)}
                            className="flex h-8 flex-shrink-0 items-center gap-1 rounded-lg border border-[#e7dfdb] bg-white px-2 text-[8px] font-extrabold uppercase text-[#6f6864]"
                          >
                            <CalendarPlus className="h-3 w-3 text-[#ff5a5f]" />
                            Book
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openNewBooking(day.dateStr)}
                          className="flex h-full w-full items-center justify-between gap-3 px-3 text-left hover:bg-[#fff7f5]"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <CircleDot className="h-3.5 w-3.5 flex-shrink-0 text-[#18a875]" />
                            <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#9a918c]">
                              Available
                            </span>
                          </div>
                          <CalendarPlus className="h-4 w-4 flex-shrink-0 text-[#ff5a5f]" />
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
              const isCompact = span.visibleDates.length <= 2;
              const provisionalStripeClass =
                booking.status === 'provisional' && showProvisionalBlock
                  ? 'bg-[linear-gradient(45deg,rgba(76,57,52,0.10)_25%,transparent_25%,transparent_50%,rgba(76,57,52,0.10)_50%,rgba(76,57,52,0.10)_75%,transparent_75%,transparent)] bg-[length:12px_12px]'
                  : '';

              const revenueForNight = (dateStr: string) =>
                occupiedBookingNights.find((night) => night.dateStr === dateStr)
                  ?.allocatedRevenueCents ?? booking.nightlyRateCents;

              const visibleTotalCents = span.visibleDates.reduce(
                (total, dateStr) => total + revenueForNight(dateStr),
                0
              );

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
                  className={`z-10 min-h-0 overflow-hidden border text-left shadow-[0_6px_18px_rgba(52,42,37,0.08)] ${channel.block} ${provisionalStripeClass}`}
                >
                  <div
                    className={`grid h-full min-h-0 ${
                      isCompact
                        ? 'grid-cols-[96px_minmax(0,1fr)]'
                        : 'grid-cols-[66px_minmax(0,1fr)]'
                    }`}
                  >
                    <div
                      className={`flex min-h-0 flex-col overflow-hidden border-r ${channel.rail}`}
                    >
                      {isCompact ? (
                        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-2 py-1 text-center">
                          <span className="w-full truncate text-[8px] font-extrabold uppercase tracking-wide text-white">
                            {guestName}
                          </span>
                          <strong className="mt-0.5 text-[8px] font-extrabold text-white">
                            {formatCents(visibleTotalCents)}
                          </strong>
                        </div>
                      ) : (
                        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden py-1">
                          <div
                            className="flex items-center gap-2 whitespace-nowrap"
                            style={{
                              writingMode: 'vertical-rl',
                              transform: 'rotate(180deg)',
                            }}
                          >
                            <span className="max-h-full overflow-hidden text-ellipsis text-[10px] font-extrabold uppercase tracking-wide text-white">
                              {guestName}
                            </span>
                            <strong className="text-[9px] font-extrabold text-white">
                              {formatCents(visibleTotalCents)}
                            </strong>
                          </div>
                        </div>
                      )}

                      {!isCompact && (
                        <span
                          className={`mx-auto mb-1 flex-shrink-0 rounded border px-1 py-0.5 text-[6px] font-extrabold uppercase leading-none ${channel.badge}`}
                        >
                          {channel.label.slice(0, 3)}
                        </span>
                      )}
                    </div>

                    <div className="flex min-h-0 flex-col">
                      {span.visibleDates.map((dateStr) => (
                        <div
                          key={dateStr}
                          className="flex min-h-0 flex-1 items-center justify-between gap-2 border-b border-black/5 px-3 last:border-b-0"
                        >
                          <span className="text-[10px] font-extrabold">
                            {Number(dateStr.slice(-2))}
                          </span>
                          <span className="text-[9px] font-extrabold">
                            {formatCents(revenueForNight(dateStr))}
                          </span>
                        </div>
                      ))}
                    </div>
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

      {section === 'schedule' && (
        <button
          type="button"
          onClick={() => openNewBooking()}
          className="absolute bottom-4 right-4 flex h-12 items-center gap-2 rounded-full bg-[#ff5a5f] px-5 text-xs font-extrabold uppercase text-white shadow-xl"
        >
          <CalendarPlus className="h-4 w-4" /> New Booking
        </button>
      )}
    </div>
  );
}
