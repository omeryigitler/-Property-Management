import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BedDouble,
  Building2,
  CalendarPlus,
  CheckCircle2,
  CircleDot,
  LogOut,
  Pencil,
  WalletCards,
} from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { getActiveProperties, usePropertyStore } from '../../store/usePropertyStore';
import { LOCATIONS } from '../../config/locations';
import { getDaysForMonth } from '../../utils/dateUtilities';
import { getCellBookingState } from '../../utils/bookingCalculations';
import { calculatePropertyFinancials } from '../../utils/financeCalculations';
import { formatCents } from '../../utils/currency';
import { CustomSelect } from '../common/CustomSelect';

const channelMeta = {
  airbnb: { label: 'Airbnb', badge: 'bg-rose-950 text-rose-300 border-rose-800' },
  booking_com: { label: 'Booking.com', badge: 'bg-blue-950 text-blue-300 border-blue-800' },
  direct: { label: 'Direct', badge: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  vrbo: { label: 'VRBO', badge: 'bg-violet-950 text-violet-300 border-violet-800' },
} as const;

export function MobileCalendarView() {
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const bookings = useDashboardStore((state) => state.bookings);
  const expenses = useDashboardStore((state) => state.expenses);
  const extraIncomes = useDashboardStore((state) => state.extraIncomes);
  const taxConfiguration = useDashboardStore((state) => state.taxConfiguration);
  const openModal = useDashboardStore((state) => state.openModal);

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

  if (!selectedProperty || !selectedPropertyId) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-slate-800 bg-slate-950 p-6 text-center text-xs text-slate-500">
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

  const openNewBooking = (dateStr: string) => {
    openModal('booking_add', {
      prefilledPropertyId: selectedPropertyId,
      prefilledDate: dateStr,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden md:hidden">
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

      <div className="min-h-0 flex-1 overflow-y-auto pb-[max(5rem,env(safe-area-inset-bottom))] no-scrollbar">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-1 py-2.5 backdrop-blur">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-300">
              Daily Schedule
            </p>
            <p className="text-[9px] text-slate-600">Tap a booking to edit or an available day to add.</p>
          </div>
          <button
            type="button"
            onClick={() => openModal('settings', { section: 'finance', propertyId: selectedPropertyId })}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-cyan-800 bg-cyan-950/40 px-2.5 text-[9px] font-black uppercase tracking-wider text-cyan-300"
          >
            <WalletCards className="h-3.5 w-3.5" /> Finance
          </button>
        </div>

        <div className="divide-y divide-slate-800/80">
          {days.map((day) => {
            const cellState = getCellBookingState(selectedPropertyId, day.dateStr, bookings);
            const booking = cellState.booking;
            const channel = booking ? channelMeta[booking.channel] : null;

            return (
              <div
                key={day.dateStr}
                className={`grid min-h-[68px] grid-cols-[54px_minmax(0,1fr)] gap-2 px-1 py-2 ${
                  day.isToday
                    ? 'bg-[#ff3e00]/8'
                    : day.isWeekend
                      ? 'bg-slate-900/25'
                      : 'bg-slate-950'
                }`}
              >
                <div
                  className={`flex flex-col items-center justify-center rounded-xl border ${
                    day.isToday
                      ? 'border-[#ff3e00]/70 bg-[#ff3e00]/10 text-[#ff3e00]'
                      : day.isWeekend
                        ? 'border-amber-900/70 bg-amber-950/20 text-amber-300'
                        : 'border-slate-800 bg-slate-900/70 text-slate-300'
                  }`}
                >
                  <span className="font-mono text-base font-black leading-none">{day.dayNumber}</span>
                  <span className="mt-1 text-[8px] font-black uppercase tracking-wider">{day.weekday}</span>
                </div>

                {cellState.isOccupied && booking ? (
                  <button
                    type="button"
                    onClick={() => openModal('booking_edit', { bookingId: booking.id })}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-left shadow-sm"
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        {cellState.isCheckIn ? (
                          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                        ) : (
                          <BedDouble className="h-3.5 w-3.5 flex-shrink-0 text-cyan-400" />
                        )}
                        <span className="truncate text-xs font-black uppercase tracking-wide text-slate-100">
                          {booking.guestName}
                        </span>
                        <span
                          className={`flex-shrink-0 rounded-md border px-1.5 py-0.5 text-[7px] font-black uppercase ${channel?.badge}`}
                        >
                          {channel?.label}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[9px] font-semibold text-slate-500">
                        <span>{cellState.isCheckIn ? `Check-in ${booking.checkInTime}` : `Night ${cellState.nightIndex}/${cellState.totalNights}`}</span>
                        <span>•</span>
                        <span>{formatCents(booking.nightlyRateCents)}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-500" />
                  </button>
                ) : cellState.isCheckOut && booking ? (
                  <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-amber-900/60 bg-amber-950/15 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => openModal('booking_edit', { bookingId: booking.id })}
                      className="min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <LogOut className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                        <span className="truncate text-xs font-black uppercase text-slate-200">
                          {booking.guestName}
                        </span>
                      </div>
                      <p className="mt-1 text-[9px] font-semibold text-amber-300/80">
                        Checkout · {booking.checkOutTime}
                      </p>
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
                    className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-dashed border-slate-800 bg-slate-950 px-3 py-2 text-left hover:border-cyan-800 hover:bg-cyan-950/10"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <CircleDot className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                      <div>
                        <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Available
                        </span>
                        <span className="mt-0.5 block text-[9px] text-slate-600">Tap to create a reservation</span>
                      </div>
                    </div>
                    <CalendarPlus className="h-4 w-4 flex-shrink-0 text-cyan-500" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 flex justify-end">
        <button
          type="button"
          onClick={() => openModal('booking_add', { prefilledPropertyId: selectedPropertyId })}
          className="pointer-events-auto flex h-12 items-center gap-2 rounded-xl bg-[#ff3e00] px-4 text-xs font-black uppercase tracking-wider text-white shadow-2xl shadow-[#ff3e00]/30"
        >
          <CalendarPlus className="h-4 w-4" /> New Booking
        </button>
      </div>
    </div>
  );
}
