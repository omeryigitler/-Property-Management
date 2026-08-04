import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  ArrowRight,
  BarChart3,
  BedDouble,
  Building2,
  CalendarPlus,
  CheckCircle2,
  CircleDot,
  Lock,
  Pencil,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { getActiveProperties, usePropertyStore } from '../../store/usePropertyStore';
import { LOCATIONS } from '../../config/locations';
import { Booking } from '../../types';
import {
  calculateNights,
  getDaysForMonth,
  parseDateString,
} from '../../utils/dateUtilities';
import { getCellBookingState } from '../../utils/bookingCalculations';
import { calculatePropertyFinancials } from '../../utils/financeCalculations';
import { formatCents } from '../../utils/currency';
import { isRentExpense, sumExpenses } from '../../utils/expenseUtilities';
import { CustomSelect } from '../common/CustomSelect';

const channelMeta = {
  airbnb: { label: 'Airbnb', badge: 'bg-rose-950 text-rose-300 border-rose-800' },
  booking_com: { label: 'Booking.com', badge: 'bg-blue-950 text-blue-300 border-blue-800' },
  direct: { label: 'Direct', badge: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  vrbo: { label: 'VRBO', badge: 'bg-violet-950 text-violet-300 border-violet-800' },
} as const;

type MobileScheduleSegment =
  | {
      type: 'booking';
      key: string;
      booking: Booking;
      visibleStartDate: string;
      visibleEndDate: string;
    }
  | {
      type: 'available';
      key: string;
      startDate: string;
      endDate: string;
      dayCount: number;
    };

function formatInclusiveRange(startDate: string, endDate: string) {
  const start = parseDateString(startDate);
  const end = parseDateString(endDate);

  if (startDate === endDate) return format(start, 'd MMM');
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, 'd')}–${format(end, 'd MMM')}`;
  }
  return `${format(start, 'd MMM')}–${format(end, 'd MMM')}`;
}

function formatBookingRange(booking: Booking) {
  const start = parseDateString(booking.checkInDate);
  const end = parseDateString(booking.checkOutDate);
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, 'd')}–${format(end, 'd MMM')}`;
  }
  return `${format(start, 'd MMM')}–${format(end, 'd MMM')}`;
}

export function MobileCalendarView() {
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const bookings = useDashboardStore((state) => state.bookings);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);
  const taxConfiguration = useDashboardStore((state) => state.taxConfiguration);
  const openModal = useDashboardStore((state) => state.openModal);
  const setMainViewMode = useDashboardStore((state) => state.setMainViewMode);

  const properties = usePropertyStore((state) => state.properties);
  const activeProperties = getActiveProperties(properties);
  const [selectedPropertyId, setSelectedPropertyId] = useState(activeProperties[0]?.id ?? '');

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

  const scheduleSegments = useMemo<MobileScheduleSegment[]>(() => {
    if (!selectedPropertyId) return [];

    const segments: MobileScheduleSegment[] = [];
    let dayIndex = 0;

    while (dayIndex < days.length) {
      const currentDay = days[dayIndex];
      const currentState = getCellBookingState(selectedPropertyId, currentDay.dateStr, bookings);

      if (currentState.isOccupied && currentState.booking) {
        const booking = currentState.booking;
        const startIndex = dayIndex;
        dayIndex += 1;

        while (dayIndex < days.length) {
          const nextState = getCellBookingState(
            selectedPropertyId,
            days[dayIndex].dateStr,
            bookings
          );
          if (!nextState.isOccupied || nextState.booking?.id !== booking.id) break;
          dayIndex += 1;
        }

        segments.push({
          type: 'booking',
          key: `booking-${booking.id}-${currentDay.dateStr}`,
          booking,
          visibleStartDate: days[startIndex].dateStr,
          visibleEndDate: days[dayIndex - 1].dateStr,
        });
        continue;
      }

      const availableStartIndex = dayIndex;
      dayIndex += 1;

      while (dayIndex < days.length) {
        const nextState = getCellBookingState(
          selectedPropertyId,
          days[dayIndex].dateStr,
          bookings
        );
        if (nextState.isOccupied) break;
        dayIndex += 1;
      }

      segments.push({
        type: 'available',
        key: `available-${days[availableStartIndex].dateStr}`,
        startDate: days[availableStartIndex].dateStr,
        endDate: days[dayIndex - 1].dateStr,
        dayCount: dayIndex - availableStartIndex,
      });
    }

    return segments;
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
          <button
            type="button"
            onClick={() => openModal('mobile_property_finance', { propertyId: selectedPropertyId })}
            className="rounded-xl border border-emerald-900/70 bg-emerald-950/20 p-2.5 text-left"
          >
            <span className="block text-[8px] font-black uppercase tracking-wider text-emerald-400">
              Net Booking
            </span>
            <span className="mt-1 block truncate font-mono text-sm font-black text-emerald-300">
              {formatCents(financials.netBookingIncomeCents)}
            </span>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-[max(6rem,env(safe-area-inset-bottom))] no-scrollbar">
        <section>
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-1 py-2.5 backdrop-blur">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                Monthly Schedule
              </p>
              <p className="text-[9px] text-slate-600">
                Consecutive nights are grouped into one reservation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openModal('settings', { section: 'finance', propertyId: selectedPropertyId })}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-cyan-800 bg-cyan-950/40 px-2.5 text-[9px] font-black uppercase tracking-wider text-cyan-300"
            >
              <WalletCards className="h-3.5 w-3.5" /> Finance
            </button>
          </div>

          <div className="space-y-2 py-2">
            {scheduleSegments.map((segment) => {
              if (segment.type === 'available') {
                return (
                  <button
                    key={segment.key}
                    type="button"
                    onClick={() => openNewBooking(segment.startDate)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-emerald-900/70 bg-emerald-950/10 px-3 py-3 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 min-w-16 flex-shrink-0 flex-col items-center justify-center rounded-lg border border-emerald-900 bg-slate-950 text-emerald-300">
                        <span className="font-mono text-[11px] font-black">
                          {formatInclusiveRange(segment.startDate, segment.endDate)}
                        </span>
                        <span className="text-[7px] font-black uppercase tracking-wider text-emerald-500">
                          {segment.dayCount} {segment.dayCount === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <CircleDot className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                          <span className="text-xs font-black uppercase tracking-wide text-slate-200">
                            Available
                          </span>
                        </div>
                        <p className="mt-1 text-[9px] text-slate-600">Tap to create a reservation</p>
                      </div>
                    </div>
                    <CalendarPlus className="h-4 w-4 flex-shrink-0 text-cyan-500" />
                  </button>
                );
              }

              const booking = segment.booking;
              const channel = channelMeta[booking.channel];
              const totalNights = calculateNights(booking.checkInDate, booking.checkOutDate);
              const accommodationTotal = booking.nightlyRateCents * totalNights - booking.discountCents;

              return (
                <button
                  key={segment.key}
                  type="button"
                  onClick={() => openModal('booking_edit', { bookingId: booking.id })}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-left shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 min-w-[76px] flex-shrink-0 flex-col items-center justify-center rounded-lg border border-[#ff3e00]/50 bg-[#ff3e00]/8 text-[#ff3e00]">
                      <span className="font-mono text-[11px] font-black">
                        {formatBookingRange(booking)}
                      </span>
                      <span className="text-[7px] font-black uppercase tracking-wider">
                        {totalNights} {totalNights === 1 ? 'night' : 'nights'}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                        <span className="truncate text-xs font-black uppercase tracking-wide text-slate-100">
                          {booking.guestName}
                        </span>
                        <span
                          className={`flex-shrink-0 rounded-md border px-1.5 py-0.5 text-[7px] font-black uppercase ${channel.badge}`}
                        >
                          {channel.label}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-semibold text-slate-500">
                        <span>{booking.checkInTime} → {booking.checkOutTime}</span>
                        <span>•</span>
                        <span>{formatCents(booking.nightlyRateCents)}/night</span>
                        <span>•</span>
                        <span>{formatCents(accommodationTotal)}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-500" />
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-3 border-t-2 border-[#ff3e00] pt-3">
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
              <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400">Net Booking</span>
              <span className="mt-1 block font-mono text-sm font-black text-emerald-300">
                {formatCents(financials.netBookingIncomeCents)}
              </span>
            </div>
            <div className="rounded-xl border border-violet-900/70 bg-violet-950/15 p-3">
              <span className="text-[8px] font-black uppercase tracking-wider text-violet-300">Rent</span>
              <span className="mt-1 block font-mono text-sm font-black text-violet-200">
                -{formatCents(rentTotalCents)}
              </span>
            </div>
            <div className="rounded-xl border border-emerald-900/70 bg-emerald-950/15 p-3">
              <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400">Extra Income</span>
              <span className="mt-1 block font-mono text-sm font-black text-emerald-300">
                +{formatCents(financials.extraIncomeCents)}
              </span>
            </div>
            <div className="rounded-xl border border-rose-900/70 bg-rose-950/15 p-3">
              <span className="text-[8px] font-black uppercase tracking-wider text-rose-400">Other Expenses</span>
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
              <span className="font-display text-xs font-black uppercase tracking-wider text-slate-100">Net Balance</span>
              {financials.isTaxConfigured ? (
                <span
                  className={`font-mono text-base font-black ${
                    netBalanceCents >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {formatCents(netBalanceCents)}
                </span>
              ) : (
                <span className="text-[9px] font-black uppercase text-amber-400">Configuration Required</span>
              )}
            </div>
          </div>
        </section>

        <section className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
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
                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Property Status</span>
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

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 flex justify-end">
        <button
          type="button"
          onClick={() => openNewBooking()}
          className="pointer-events-auto flex h-12 items-center gap-2 rounded-xl bg-[#ff3e00] px-4 text-xs font-black uppercase tracking-wider text-white shadow-2xl shadow-[#ff3e00]/30"
        >
          <CalendarPlus className="h-4 w-4" /> New Booking
        </button>
      </div>
    </div>
  );
}
