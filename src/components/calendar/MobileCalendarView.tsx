import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  CalendarDays,
  CalendarPlus,
  CircleDot,
  Lock,
  LogOut,
  Pencil,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { getActiveProperties, usePropertyStore } from '../../store/usePropertyStore';
import { LOCATIONS } from '../../config/locations';
import { Booking } from '../../types';
import { getDaysForMonth } from '../../utils/dateUtilities';
import {
  getBookingOccupiedNights,
  getCellBookingState,
} from '../../utils/bookingCalculations';
import { calculatePropertyFinancials } from '../../utils/financeCalculations';
import { formatCents } from '../../utils/currency';
import { isRentExpense, sumExpenses } from '../../utils/expenseUtilities';
import { CustomSelect } from '../common/CustomSelect';

const MOBILE_DAY_ROW_HEIGHT = 58;

type MobileSection = 'schedule' | 'finance';

const channelMeta = {
  airbnb: {
    label: 'Airbnb',
    badge: 'bg-rose-950 text-rose-200 border-rose-700',
    block: 'border-rose-700 bg-rose-950/90',
    rail: 'border-rose-700 bg-rose-900/75',
  },
  booking_com: {
    label: 'Booking.com',
    badge: 'bg-blue-950 text-blue-200 border-blue-700',
    block: 'border-blue-700 bg-blue-950/90',
    rail: 'border-blue-700 bg-blue-900/75',
  },
  direct: {
    label: 'Direct',
    badge: 'bg-emerald-950 text-emerald-200 border-emerald-700',
    block: 'border-emerald-700 bg-emerald-950/90',
    rail: 'border-emerald-700 bg-emerald-900/75',
  },
  vrbo: {
    label: 'VRBO',
    badge: 'bg-violet-950 text-violet-200 border-violet-700',
    block: 'border-violet-700 bg-violet-950/90',
    rail: 'border-violet-700 bg-violet-900/75',
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
  const taxConfiguration = useDashboardStore((state) => state.taxConfiguration);
  const showProvisionalBlock = useDashboardStore(
    (state) => state.userPreferences.showProvisionalBlock
  );
  const openModal = useDashboardStore((state) => state.openModal);
  const setMainViewMode = useDashboardStore((state) => state.setMainViewMode);

  const properties = usePropertyStore((state) => state.properties);
  const activeProperties = getActiveProperties(properties);
  const [selectedPropertyId, setSelectedPropertyId] = useState(activeProperties[0]?.id ?? '');
  const [mobileSection, setMobileSection] = useState<MobileSection>('schedule');

  useEffect(() => {
    if (activeProperties.some((property) => property.id === selectedPropertyId)) return;
    setSelectedPropertyId(activeProperties[0]?.id ?? '');
  }, [activeProperties, selectedPropertyId]);

  const selectedProperty = activeProperties.find((property) => property.id === selectedPropertyId);
  const days = useMemo(
    () => getDaysForMonth(selectedYear, selectedMonth),
    [selectedMonth, selectedYear]
  );

  const propertyOptions = activeProperties.map((property) => {
    const location = LOCATIONS.find((item) => item.id === property.locationId)?.name;
    return {
      value: property.id,
      label: property.name,
      badge: (
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
          {location}
        </span>
      ),
      icon: <Building2 className="h-3.5 w-3.5 text-cyan-400" />,
    };
  });

  const bookingSpans = useMemo<MobileBookingSpan[]>(() => {
    if (!selectedPropertyId) return [];

    const spans: MobileBookingSpan[] = [];
    const processedBookingIds = new Set<string>();

    days.forEach((day, startIndex) => {
      const state = getCellBookingState(selectedPropertyId, day.dateStr, bookings);
      if (!state.isOccupied || !state.booking || processedBookingIds.has(state.booking.id)) return;

      const booking = state.booking;
      const visibleDates: string[] = [];
      let cursor = startIndex;

      while (cursor < days.length) {
        const cursorState = getCellBookingState(
          selectedPropertyId,
          days[cursor].dateStr,
          bookings
        );
        if (!cursorState.isOccupied || cursorState.booking?.id !== booking.id) break;
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
  }, [bookings, days, selectedPropertyId]);

  if (!selectedProperty || !selectedPropertyId) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-slate-800 bg-slate-950 p-6 text-center text-xs text-slate-500 md:hidden">
        Add an active property from Settings to use the calendar.
      </div>
    );
  }

  const financials = calculatePropertyFinancials(
    selectedPropertyId,
    selectedYear,
    selectedMonth,
    bookings,
    expenses,
    extraIncomes,
    taxConfiguration
  );

  const occupiedNights = days.reduce((total, day) => {
    return total + (getCellBookingState(selectedPropertyId, day.dateStr, bookings).isOccupied ? 1 : 0);
  }, 0);
  const occupancy = days.length > 0 ? Math.round((occupiedNights / days.length) * 100) : 0;

  const propertyExpenses = expenses.filter(
    (expense) =>
      expense.propertyId === selectedPropertyId &&
      expense.year === selectedYear &&
      expense.month === selectedMonth
  );
  const rentTotalCents = sumExpenses(propertyExpenses.filter(isRentExpense));
  const otherExpenses = propertyExpenses.filter((expense) => !isRentExpense(expense));
  const otherExpensesTotalCents = sumExpenses(otherExpenses);
  const propertyExtraIncomes = extraIncomes.filter(
    (income) =>
      income.propertyId === selectedPropertyId &&
      income.year === selectedYear &&
      income.month === selectedMonth
  );

  const netBalanceCents = financials.netBalanceCents ?? 0;
  const profitabilityLabel = !financials.isTaxConfigured
    ? 'Tax setup required'
    : netBalanceCents > 0
      ? 'Profitable'
      : netBalanceCents < 0
        ? 'Loss'
        : 'Break-even';

  const openNewBooking = (dateStr?: string) => {
    openModal('booking_add', {
      prefilledPropertyId: selectedPropertyId,
      ...(dateStr ? { prefilledDate: dateStr } : {}),
    });
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden md:hidden">
      <div className="flex-shrink-0 space-y-3 border-b border-slate-800 bg-slate-950 pb-3">
        <CustomSelect
          label="Property"
          value={selectedPropertyId}
          options={propertyOptions}
          onChange={setSelectedPropertyId}
        />

        <div className="grid grid-cols-2 rounded-xl border border-slate-800 bg-slate-900 p-1">
          <button
            type="button"
            onClick={() => setMobileSection('schedule')}
            className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${
              mobileSection === 'schedule'
                ? 'bg-[#ff3e00] text-white shadow-md shadow-[#ff3e00]/20'
                : 'text-slate-400'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Schedule
          </button>
          <button
            type="button"
            onClick={() => setMobileSection('finance')}
            className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${
              mobileSection === 'finance'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                : 'text-slate-400'
            }`}
          >
            <WalletCards className="h-3.5 w-3.5" /> Finance
          </button>
        </div>

        {mobileSection === 'schedule' && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
              <span className="block text-[8px] font-black uppercase tracking-wider text-slate-500">
                Occupancy
              </span>
              <span className="mt-1 block font-mono text-sm font-black text-cyan-300">
                {occupancy}%
              </span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5">
              <span className="block text-[8px] font-black uppercase tracking-wider text-slate-500">
                Booked Nights
              </span>
              <span className="mt-1 block font-mono text-sm font-black text-slate-100">
                {occupiedNights}
              </span>
            </div>
            <div className="rounded-xl border border-emerald-900/70 bg-emerald-950/20 p-2.5">
              <span className="block text-[8px] font-black uppercase tracking-wider text-emerald-400">
                Net Booking
              </span>
              <span className="mt-1 block truncate font-mono text-sm font-black text-emerald-300">
                {formatCents(financials.netBookingIncomeCents)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-[max(6rem,env(safe-area-inset-bottom))] no-scrollbar">
        {mobileSection === 'schedule' ? (
          <section>
            <div className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 px-1 py-2.5 backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                Monthly Schedule
              </p>
              <p className="text-[9px] text-slate-600">
                Same merged booking layout as the desktop calendar.
              </p>
            </div>

            <div
              className="relative grid grid-cols-[58px_minmax(0,1fr)] bg-slate-950"
              style={{ gridTemplateRows: `repeat(${days.length}, ${MOBILE_DAY_ROW_HEIGHT}px)` }}
            >
              {days.map((day, index) => {
                const state = getCellBookingState(selectedPropertyId, day.dateStr, bookings);
                const checkoutBooking = !state.isOccupied && state.isCheckOut ? state.booking : null;

                return (
                  <React.Fragment key={day.dateStr}>
                    <div
                      style={{ gridColumn: 1, gridRow: index + 1 }}
                      className={`z-[1] flex flex-col items-center justify-center border-b border-r ${
                        day.isToday
                          ? 'border-[#ff3e00]/50 bg-[#ff3e00]/10 text-[#ff3e00]'
                          : day.isWeekend
                            ? 'border-slate-800 bg-amber-950/15 text-amber-300'
                            : 'border-slate-800 bg-slate-900/70 text-slate-300'
                      }`}
                    >
                      <span className="font-mono text-sm font-black leading-none">{day.dayNumber}</span>
                      <span className="mt-1 text-[8px] font-black uppercase tracking-wider">{day.weekday}</span>
                    </div>

                    <div
                      style={{ gridColumn: 2, gridRow: index + 1 }}
                      className={`border-b border-slate-800 ${
                        day.isToday
                          ? 'bg-[#ff3e00]/[0.03]'
                          : day.isWeekend
                            ? 'bg-slate-900/20'
                            : 'bg-slate-950'
                      }`}
                    >
                      {!state.isOccupied && (
                        checkoutBooking ? (
                          <div className="flex h-full items-center justify-between gap-2 px-2">
                            <button
                              type="button"
                              onClick={() => openModal('booking_edit', { bookingId: checkoutBooking.id })}
                              className="flex min-w-0 items-center gap-2 text-left"
                            >
                              <LogOut className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                              <div className="min-w-0">
                                <span className="block truncate text-[10px] font-black uppercase text-slate-300">
                                  Checkout · {checkoutBooking.guestName}
                                </span>
                                <span className="mt-0.5 block text-[8px] font-bold text-amber-400/80">
                                  {checkoutBooking.checkOutTime}
                                </span>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => openNewBooking(day.dateStr)}
                              className="flex h-8 flex-shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 text-[8px] font-black uppercase text-slate-300"
                            >
                              <CalendarPlus className="h-3 w-3" /> Book
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openNewBooking(day.dateStr)}
                            className="flex h-full w-full items-center justify-between gap-3 px-3 text-left hover:bg-cyan-950/10"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <CircleDot className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                Available
                              </span>
                            </div>
                            <CalendarPlus className="h-4 w-4 flex-shrink-0 text-cyan-600" />
                          </button>
                        )
                      )}
                    </div>
                  </React.Fragment>
                );
              })}

              {bookingSpans.map((span) => {
                const booking = span.booking;
                const channel = channelMeta[booking.channel];
                const occupiedBookingNights = getBookingOccupiedNights(booking);
                const compact = span.visibleDates.length <= 2;
                const isProvisional = booking.status === 'provisional';
                const stripeStyle =
                  isProvisional && showProvisionalBlock
                    ? 'bg-[linear-gradient(45deg,rgba(0,0,0,0.3)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0.3)_75%,transparent_75%,transparent)] bg-[length:12px_12px]'
                    : '';

                const accommodationForNight = (dateStr: string) => {
                  const night = occupiedBookingNights.find((item) => item.dateStr === dateStr);
                  if (!night) return booking.nightlyRateCents;
                  return Math.max(
                    0,
                    night.allocatedRevenueCents -
                      (night.nightIndex === 1 ? booking.cleaningFeeCents || 0 : 0)
                  );
                };

                const visibleAccommodationTotalCents = span.visibleDates.reduce(
                  (total, dateStr) => total + accommodationForNight(dateStr),
                  0
                );

                return (
                  <button
                    key={span.key}
                    type="button"
                    onClick={() => openModal('booking_edit', { bookingId: booking.id })}
                    style={{
                      gridColumn: 2,
                      gridRow: `${span.startIndex + 1} / span ${span.visibleDates.length}`,
                    }}
                    className={`z-10 min-h-0 overflow-hidden border text-left shadow-lg ${channel.block} ${stripeStyle}`}
                  >
                    <div
                      className={`grid h-full min-h-0 ${
                        compact
                          ? 'grid-cols-[92px_minmax(0,1fr)]'
                          : 'grid-cols-[66px_minmax(0,1fr)]'
                      }`}
                    >
                      <div className={`flex min-h-0 flex-col overflow-hidden border-r ${channel.rail}`}>
                        {compact ? (
                          <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden px-2 text-center">
                            <span className="w-full truncate text-[8px] font-black uppercase tracking-wide text-white">
                              {booking.guestName}
                            </span>
                            <strong className="mt-1 font-mono text-[9px] font-black text-white">
                              {formatCents(visibleAccommodationTotalCents)}
                            </strong>
                          </div>
                        ) : (
                          <>
                            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden py-1">
                              <div
                                className="flex items-center gap-2 whitespace-nowrap"
                                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                              >
                                <span className="max-h-full overflow-hidden text-ellipsis text-[10px] font-black uppercase tracking-wider text-white">
                                  {booking.guestName}
                                </span>
                                <strong className="font-mono text-[9px] font-black text-white">
                                  {formatCents(visibleAccommodationTotalCents)}
                                </strong>
                              </div>
                            </div>
                            <span
                              className={`mx-auto mb-1 flex-shrink-0 rounded border px-1 py-0.5 text-[6px] font-black uppercase leading-none ${channel.badge}`}
                            >
                              {channel.label.slice(0, 3)}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex min-h-0 flex-col">
                        {span.visibleDates.map((dateStr) => (
                          <div
                            key={dateStr}
                            className="flex min-h-0 flex-1 items-center justify-between gap-2 border-b border-white/10 px-3 last:border-b-0"
                          >
                            <span className="font-mono text-[10px] font-black text-white">
                              {Number(dateStr.slice(-2))}
                            </span>
                            <span className="font-mono text-[9px] font-black text-white/95">
                              {formatCents(accommodationForNight(dateStr))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <div className="space-y-3 pt-3">
            <section className="border-t-2 border-[#ff3e00] pt-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-xs font-black uppercase tracking-widest text-[#ff3e00]">
                    Monthly Financial Ledger
                  </h3>
                  <p className="mt-1 text-[9px] text-slate-600">Selected property · current month</p>
                </div>
                <button
                  type="button"
                  onClick={() => openModal('settings', { section: 'finance', propertyId: selectedPropertyId })}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-cyan-800 bg-cyan-950/40 px-2.5 text-[9px] font-black uppercase text-cyan-300"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-emerald-900/70 bg-emerald-950/15 p-3">
                  <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400">
                    Net Booking
                  </span>
                  <span className="mt-1 block font-mono text-sm font-black text-emerald-300">
                    {formatCents(financials.netBookingIncomeCents)}
                  </span>
                </div>
                <div className="rounded-xl border border-violet-900/70 bg-violet-950/15 p-3">
                  <span className="text-[8px] font-black uppercase tracking-wider text-violet-300">
                    Rent
                  </span>
                  <span className="mt-1 block font-mono text-sm font-black text-violet-200">
                    -{formatCents(rentTotalCents)}
                  </span>
                </div>
                <div className="rounded-xl border border-emerald-900/70 bg-emerald-950/15 p-3">
                  <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400">
                    Extra Income
                  </span>
                  <span className="mt-1 block font-mono text-sm font-black text-emerald-300">
                    +{formatCents(financials.extraIncomeCents)}
                  </span>
                </div>
                <div className="rounded-xl border border-rose-900/70 bg-rose-950/15 p-3">
                  <span className="text-[8px] font-black uppercase tracking-wider text-rose-400">
                    Other Expenses
                  </span>
                  <span className="mt-1 block font-mono text-sm font-black text-rose-300">
                    -{formatCents(otherExpensesTotalCents)}
                  </span>
                </div>
              </div>

              {(propertyExtraIncomes.length > 0 || otherExpenses.length > 0) && (
                <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  {propertyExtraIncomes.map((income) => (
                    <div key={income.id} className="flex items-center justify-between gap-3 py-1 text-[10px]">
                      <span className="min-w-0 truncate font-semibold text-slate-400">{income.label}</span>
                      <span className="flex-shrink-0 font-mono font-black text-emerald-300">
                        +{formatCents(income.amountCents)}
                      </span>
                    </div>
                  ))}
                  {otherExpenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between gap-3 py-1 text-[10px]">
                      <span className="min-w-0 truncate font-semibold text-slate-400">{expense.label}</span>
                      <span className="flex-shrink-0 font-mono font-black text-rose-300">
                        -{formatCents(expense.amountCents)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900 p-3">
                <div className="flex items-center justify-between gap-3 text-[10px]">
                  <span className="font-bold uppercase tracking-wider text-slate-500">Total Expenses</span>
                  <span className="font-mono font-black text-rose-300">
                    -{formatCents(financials.totalExpensesCents)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-800 pt-2 text-[10px]">
                  <span className="font-bold uppercase tracking-wider text-amber-400">Calculated Taxes</span>
                  {financials.isTaxConfigured ? (
                    <span className="font-mono font-black text-amber-300">
                      -{formatCents(financials.calculatedTaxesCents)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 font-bold text-amber-400">
                      <Lock className="h-3 w-3" /> Required
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-800 pt-2">
                  <span className="font-display text-xs font-black uppercase tracking-wider text-slate-100">
                    Net Balance
                  </span>
                  {financials.isTaxConfigured ? (
                    <span
                      className={`font-mono text-base font-black ${
                        netBalanceCents >= 0 ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {formatCents(netBalanceCents)}
                    </span>
                  ) : (
                    <span className="text-[9px] font-black uppercase text-amber-400">
                      Configuration Required
                    </span>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${
                      !financials.isTaxConfigured
                        ? 'border-amber-800 bg-amber-950/40 text-amber-300'
                        : netBalanceCents >= 0
                          ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                          : 'border-rose-800 bg-rose-950/40 text-rose-300'
                    }`}
                  >
                    {netBalanceCents >= 0 ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">
                      Property Status
                    </span>
                    <span className="mt-1 block truncate text-sm font-black uppercase text-slate-100">
                      {profitabilityLabel}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMainViewMode('analytics')}
                  className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 text-[9px] font-black uppercase tracking-wider text-cyan-300"
                >
                  <BarChart3 className="h-3.5 w-3.5" /> Reports
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      {mobileSection === 'schedule' && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 flex justify-end">
          <button
            type="button"
            onClick={() => openNewBooking()}
            className="pointer-events-auto flex h-12 items-center gap-2 rounded-xl bg-[#ff3e00] px-4 text-xs font-black uppercase tracking-wider text-white shadow-2xl shadow-[#ff3e00]/30"
          >
            <CalendarPlus className="h-4 w-4" /> New Booking
          </button>
        </div>
      )}
    </div>
  );
}
