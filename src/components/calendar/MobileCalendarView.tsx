import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Building2, CalendarDays, CalendarPlus, WalletCards } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { getActiveProperties, usePropertyStore } from '../../store/usePropertyStore';
import { LOCATIONS } from '../../config/locations';
import { getDaysForMonth } from '../../utils/dateUtilities';
import { getCellBookingState } from '../../utils/bookingCalculations';
import { calculatePropertyFinancials } from '../../utils/financeCalculations';
import { formatCents } from '../../utils/currency';
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
  const activeProperties = getActiveProperties(usePropertyStore((state) => state.properties));
  const [selectedPropertyId, setSelectedPropertyId] = useState(activeProperties[0]?.id ?? '');
  const [section, setSection] = useState<MobileSection>('schedule');

  useEffect(() => {
    if (!activeProperties.some((property) => property.id === selectedPropertyId)) {
      setSelectedPropertyId(activeProperties[0]?.id ?? '');
    }
  }, [activeProperties, selectedPropertyId]);

  const days = useMemo(() => getDaysForMonth(selectedYear, selectedMonth), [selectedYear, selectedMonth]);
  const property = activeProperties.find((item) => item.id === selectedPropertyId);
  const financials = property
    ? calculatePropertyFinancials(property.id, selectedYear, selectedMonth, bookings, expenses, extraIncomes)
    : null;
  const occupiedNights = property
    ? days.filter((day) => getCellBookingState(property.id, day.dateStr, bookings).isOccupied).length
    : 0;
  const occupancy = days.length > 0 ? Math.round((occupiedNights / days.length) * 100) : 0;

  if (!property) {
    return <div className="flex h-full items-center justify-center p-6 text-xs text-slate-500 md:hidden">Add an active property from Settings.</div>;
  }

  const options = activeProperties.map((item) => ({
    value: item.id,
    label: item.name,
    icon: <Building2 className="h-3.5 w-3.5 text-cyan-400" />,
    badge: <span className="text-[9px] uppercase text-slate-500">{LOCATIONS.find((location) => location.id === item.locationId)?.name}</span>,
  }));

  const openReports = () => {
    sessionStorage.setItem(REPORT_PROPERTY_SESSION_KEY, property.id);
    setMainViewMode('analytics');
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden md:hidden">
      <div className="flex-shrink-0 space-y-3 border-b border-slate-800 bg-slate-950 pb-3">
        <CustomSelect label="Property" value={property.id} options={options} onChange={setSelectedPropertyId} />
        <div className="grid grid-cols-2 rounded-xl border border-slate-800 bg-slate-900 p-1">
          <button type="button" onClick={() => setSection('schedule')} className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-[9px] font-black uppercase ${section === 'schedule' ? 'bg-[#ff3e00] text-white' : 'text-slate-400'}`}><CalendarDays className="h-3.5 w-3.5" /> Schedule</button>
          <button type="button" onClick={() => setSection('finance')} className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-[9px] font-black uppercase ${section === 'finance' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}><WalletCards className="h-3.5 w-3.5" /> Finance</button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-[max(6rem,env(safe-area-inset-bottom))] no-scrollbar">
        {section === 'schedule' ? (
          <div className="divide-y divide-slate-800">
            {days.map((day) => {
              const state = getCellBookingState(property.id, day.dateStr, bookings);
              return (
                <button key={day.dateStr} type="button" onClick={() => state.booking ? openModal('booking_edit', { bookingId: state.booking.id }) : openModal('booking_add', { prefilledPropertyId: property.id, prefilledDate: day.dateStr })} className={`grid min-h-14 w-full grid-cols-[58px_minmax(0,1fr)_32px] items-center gap-2 px-2 text-left ${day.isToday ? 'bg-[#ff3e00]/10' : day.isWeekend ? 'bg-slate-900/30' : 'bg-slate-950'}`}>
                  <div className="text-center"><span className="block font-mono text-sm font-black">{day.dayNumber}</span><span className="text-[8px] font-black uppercase text-slate-500">{day.weekday}</span></div>
                  {state.booking ? (
                    <div className="min-w-0 rounded-lg border border-cyan-900 bg-cyan-950/20 px-3 py-2"><span className="block truncate text-[10px] font-black uppercase text-cyan-200">{state.booking.guestName}</span><span className="mt-0.5 block text-[9px] text-slate-400">{state.booking.channel} · {formatCents(state.booking.nightlyRateCents)} / night</span></div>
                  ) : <span className="text-[10px] font-black uppercase text-slate-600">Available</span>}
                  <CalendarPlus className="h-4 w-4 text-cyan-500" />
                </button>
              );
            })}
          </div>
        ) : financials ? (
          <div className="space-y-3 p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-3"><span className="text-[9px] font-black uppercase text-slate-500">Occupancy</span><strong className="mt-1 block font-mono text-lg text-cyan-300">{occupancy}%</strong></div>
              <div className="rounded-xl border border-emerald-900 bg-emerald-950/20 p-3"><span className="text-[9px] font-black uppercase text-emerald-400">Booking Income</span><strong className="mt-1 block font-mono text-lg text-emerald-300">{formatCents(financials.bookingIncomeCents)}</strong></div>
              <div className="rounded-xl border border-rose-900 bg-rose-950/20 p-3"><span className="text-[9px] font-black uppercase text-rose-400">Expenses</span><strong className="mt-1 block font-mono text-lg text-rose-300">-{formatCents(financials.totalExpensesCents)}</strong></div>
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-3"><span className="text-[9px] font-black uppercase text-slate-400">Net Balance</span><strong className={`mt-1 block font-mono text-lg ${financials.netBalanceCents >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{formatCents(financials.netBalanceCents)}</strong></div>
            </div>
            <button type="button" onClick={() => openModal('settings', { section: 'finance', propertyId: property.id })} className="h-11 w-full rounded-xl bg-cyan-600 text-xs font-black uppercase text-white">Edit Monthly Finance</button>
            <button type="button" onClick={openReports} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 text-xs font-black uppercase text-slate-200"><BarChart3 className="h-4 w-4" /> Open Reports</button>
          </div>
        ) : null}
      </div>
      <button type="button" onClick={() => openModal('booking_add', { prefilledPropertyId: property.id })} className="absolute bottom-4 right-4 flex h-12 items-center gap-2 rounded-full bg-[#ff3e00] px-5 text-xs font-black uppercase text-white shadow-xl"><CalendarPlus className="h-4 w-4" /> New Booking</button>
    </div>
  );
}
