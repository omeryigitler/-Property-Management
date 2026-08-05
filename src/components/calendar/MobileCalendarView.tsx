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
import { getDaysForMonth } from '../../utils/dateUtilities';
import { getCellBookingState } from '../../utils/bookingCalculations';
import { calculatePropertyFinancials } from '../../utils/financeCalculations';
import { formatCents } from '../../utils/currency';
import { getGuestDisplayName } from '../../utils/guestNames';
import { CustomSelect } from '../common/CustomSelect';

const REPORT_PROPERTY_SESSION_KEY = 'shortlet-report-property-id';
type MobileSection = 'schedule' | 'finance';

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
          <div className="divide-y divide-[#e7dfdb] bg-white">
            {days.map((day) => {
              const state = getCellBookingState(
                property.id,
                day.dateStr,
                bookings
              );
              const booking = state.booking;
              const channelConfig = booking
                ? CHANNEL_CONFIG[booking.channel]
                : null;
              const guestName = booking
                ? getGuestDisplayName(booking.guestName)
                : '';

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() =>
                    booking
                      ? openModal('booking_edit', { bookingId: booking.id })
                      : openModal('booking_add', {
                          prefilledPropertyId: property.id,
                          prefilledDate: day.dateStr,
                        })
                  }
                  className={`grid min-h-[58px] w-full grid-cols-[58px_minmax(0,1fr)_32px] items-center gap-2 px-2 text-left transition-colors ${
                    day.isToday
                      ? 'bg-[#fff0ef]'
                      : day.isWeekend
                        ? 'bg-[#faf8f6]'
                        : 'bg-white'
                  }`}
                >
                  <div className="text-center">
                    <span className="block text-sm font-extrabold text-[#24211f]">
                      {day.dayNumber}
                    </span>
                    <span className="text-[8px] font-extrabold uppercase text-[#756e69]">
                      {day.weekday}
                    </span>
                  </div>

                  {booking && channelConfig ? (
                    <div
                      className={`min-w-0 rounded-xl border px-3 py-2 shadow-sm ${channelConfig.colorClass} ${
                        booking.status === 'provisional'
                          ? 'border-dashed'
                          : ''
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
                      <span className="mt-1 block text-[9px] font-semibold opacity-75">
                        {formatCents(booking.nightlyRateCents)} / night
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-extrabold uppercase text-[#9a918c]">
                      Available
                    </span>
                  )}

                  <CalendarPlus className="h-4 w-4 text-[#ff5a5f]" />
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
