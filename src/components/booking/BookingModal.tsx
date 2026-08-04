import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Ban,
  Calendar as CalendarIcon,
  Copy,
  CreditCard,
  Mail,
  Phone,
  Save,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { ALL_PROPERTIES, CHANNEL_CONFIG } from '../../config/locations';
import { Booking, BookingStatus, Channel, CommissionMode } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { calculateNights } from '../../utils/dateUtilities';
import { centsToEuros, eurosToCents, formatCents } from '../../utils/currency';
import { getBookingOccupiedNights } from '../../utils/bookingCalculations';
import { DEFAULT_CHANNEL_COMMISSIONS } from '../../services/financialCalculationService';

function getChannelCommission(channel: Channel) {
  return DEFAULT_CHANNEL_COMMISSIONS[channel] ?? {
    percentage: 15,
    mode: 'percentage' as const,
  };
}

export function BookingModal() {
  const activeModal = useDashboardStore((state) => state.activeModal);
  const modalParams = useDashboardStore((state) => state.modalParams);
  const closeModal = useDashboardStore((state) => state.closeModal);
  const openModal = useDashboardStore((state) => state.openModal);
  const bookings = useDashboardStore((state) => state.bookings);
  const taxConfig = useDashboardStore((state) => state.taxConfiguration);
  const addBooking = useDashboardStore((state) => state.addBooking);
  const updateBooking = useDashboardStore((state) => state.updateBooking);
  const deleteBooking = useDashboardStore((state) => state.deleteBooking);
  const cancelBooking = useDashboardStore((state) => state.cancelBooking);
  const openConfirmation = useDashboardStore((state) => state.openConfirmation);

  const isEditing = activeModal === 'booking_edit';
  const isAdding = activeModal === 'booking_add';
  const editingBooking = isEditing
    ? bookings.find((booking) => booking.id === modalParams.bookingId)
    : undefined;
  const copiedBooking = isAdding && modalParams.copyFromBookingId
    ? bookings.find((booking) => booking.id === modalParams.copyFromBookingId)
    : undefined;

  const [propertyId, setPropertyId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [channel, setChannel] = useState<Channel>('airbnb');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [nightlyRate, setNightlyRate] = useState('');
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');
  const [status, setStatus] = useState<BookingStatus>('confirmed');
  const [discount, setDiscount] = useState('0');
  const [cleaningFee, setCleaningFee] = useState('0');
  const [notes, setNotes] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [commissionMode, setCommissionMode] = useState<CommissionMode>('percentage');
  const [commissionPercentage, setCommissionPercentage] = useState('15');
  const [commissionFixedAmount, setCommissionFixedAmount] = useState('0');
  const [commissionOverrideEnabled, setCommissionOverrideEnabled] = useState(false);
  const [checkInTime, setCheckInTime] = useState('15:00');
  const [checkOutTime, setCheckOutTime] = useState('10:00');
  const [earlyCheckIn, setEarlyCheckIn] = useState(false);
  const [lateCheckOut, setLateCheckOut] = useState(false);
  const [requiredTurnoverMinutes, setRequiredTurnoverMinutes] = useState('240');
  const [formError, setFormError] = useState<string | null>(null);

  const applyChannelDefaults = (nextChannel: Channel) => {
    const defaults = getChannelCommission(nextChannel);
    setCommissionMode(defaults.mode);
    setCommissionPercentage(defaults.percentage.toString());
    setCommissionFixedAmount('0');
  };

  const populateFromBooking = (booking: Booking, asCopy: boolean) => {
    const activePropertyId = ALL_PROPERTIES.some((property) => property.id === booking.propertyId)
      ? booking.propertyId
      : ALL_PROPERTIES[0]?.id ?? '';

    setPropertyId(activePropertyId);
    setGuestName(asCopy ? `${booking.guestName} (Copy)` : booking.guestName);
    setChannel(booking.channel);
    setCheckInDate(asCopy ? '' : booking.checkInDate);
    setCheckOutDate(asCopy ? '' : booking.checkOutDate);
    setNightlyRate(centsToEuros(booking.nightlyRateCents).toString());
    setAdults(booking.adults.toString());
    setChildren(booking.children.toString());
    setStatus(asCopy ? 'confirmed' : booking.status);
    setDiscount(centsToEuros(booking.discountCents).toString());
    setCleaningFee(centsToEuros(booking.cleaningFeeCents).toString());
    setNotes(booking.notes || '');
    setBookingRef(
      asCopy && booking.bookingRef ? `${booking.bookingRef}-COPY` : booking.bookingRef || ''
    );
    setContactEmail(booking.contactEmail || '');
    setContactPhone(booking.contactPhone || '');
    setCommissionMode(booking.commissionMode ?? getChannelCommission(booking.channel).mode);
    setCommissionPercentage(
      (booking.commissionPercentage ?? getChannelCommission(booking.channel).percentage).toString()
    );
    setCommissionFixedAmount(
      centsToEuros(booking.commissionFixedAmountCents ?? 0).toString()
    );
    setCommissionOverrideEnabled(booking.commissionOverrideEnabled ?? false);
    setCheckInTime(booking.checkInTime || taxConfig.defaultCheckInTime || '15:00');
    setCheckOutTime(booking.checkOutTime || taxConfig.defaultCheckOutTime || '10:00');
    setEarlyCheckIn(booking.earlyCheckIn ?? false);
    setLateCheckOut(booking.lateCheckOut ?? false);
    setRequiredTurnoverMinutes(
      String(booking.requiredTurnoverMinutes ?? taxConfig.defaultTurnoverMinutes ?? 240)
    );
  };

  useEffect(() => {
    if (isEditing && editingBooking) {
      populateFromBooking(editingBooking, false);
      setFormError(null);
      return;
    }

    if (!isAdding) return;

    if (copiedBooking) {
      populateFromBooking(copiedBooking, true);
      setFormError('Select new check-in and check-out dates for the copied reservation.');
      return;
    }

    const defaultChannel: Channel = 'airbnb';
    setPropertyId(modalParams.prefilledPropertyId || ALL_PROPERTIES[0]?.id || '');
    setGuestName('');
    setChannel(defaultChannel);
    setCheckInDate(modalParams.prefilledDate || '');

    if (modalParams.prefilledDate) {
      const [year, month, day] = String(modalParams.prefilledDate).split('-').map(Number);
      const checkoutDate = new Date(year, month - 1, day);
      checkoutDate.setDate(checkoutDate.getDate() + 2);
      setCheckOutDate(
        `${checkoutDate.getFullYear()}-${String(checkoutDate.getMonth() + 1).padStart(2, '0')}-${String(
          checkoutDate.getDate()
        ).padStart(2, '0')}`
      );
    } else {
      setCheckOutDate('');
    }

    setNightlyRate('120');
    setAdults('2');
    setChildren('0');
    setStatus('confirmed');
    setDiscount('0');
    setCleaningFee('40');
    setNotes('');
    setBookingRef('');
    setContactEmail('');
    setContactPhone('');
    applyChannelDefaults(defaultChannel);
    setCommissionOverrideEnabled(false);
    setCheckInTime(taxConfig.defaultCheckInTime || '15:00');
    setCheckOutTime(taxConfig.defaultCheckOutTime || '10:00');
    setEarlyCheckIn(false);
    setLateCheckOut(false);
    setRequiredTurnoverMinutes(String(taxConfig.defaultTurnoverMinutes || 240));
    setFormError(null);
  }, [activeModal, modalParams, editingBooking, copiedBooking, taxConfig]);

  if (!isAdding && !isEditing) return null;

  const handleChannelChange = (nextChannel: Channel) => {
    setChannel(nextChannel);
    if (!commissionOverrideEnabled) applyChannelDefaults(nextChannel);
  };

  const handleCommissionOverrideChange = (enabled: boolean) => {
    setCommissionOverrideEnabled(enabled);
    if (!enabled) applyChannelDefaults(channel);
  };

  const unavailableDates = useMemo(
    () =>
      bookings
        .filter(
          (booking) =>
            booking.propertyId === propertyId &&
            booking.status !== 'cancelled' &&
            booking.id !== editingBooking?.id
        )
        .flatMap((booking) =>
          getBookingOccupiedNights(booking).map((night) => night.dateStr)
        ),
    [bookings, editingBooking?.id, propertyId]
  );

  const nightsCount = Math.max(0, calculateNights(checkInDate, checkOutDate));
  const parsedNightlyRateCents = Math.max(0, eurosToCents(nightlyRate));
  const parsedDiscountCents = Math.max(0, eurosToCents(discount));
  const parsedCleaningFeeCents = Math.max(0, eurosToCents(cleaningFee));
  const parsedCommissionPercentage = Number.parseFloat(commissionPercentage) || 0;
  const parsedCommissionFixedCents = Math.max(0, eurosToCents(commissionFixedAmount));
  const grossAccommodationRevenueCents = Math.max(
    0,
    nightsCount * parsedNightlyRateCents - parsedDiscountCents
  );
  const grossBookingRevenueCents =
    grossAccommodationRevenueCents + parsedCleaningFeeCents;
  const percentageCommissionBaseCents =
    taxConfig.commissionBasis === 'accommodation_plus_fees' ||
    taxConfig.commissionBasis === 'gross_after_discounts'
      ? grossBookingRevenueCents
      : grossAccommodationRevenueCents;
  const otaCommissionCents =
    commissionMode === 'percentage'
      ? Math.round(percentageCommissionBaseCents * (parsedCommissionPercentage / 100))
      : commissionMode === 'fixed'
        ? parsedCommissionFixedCents
        : 0;
  const netBookingRevenueCents = grossBookingRevenueCents - otaCommissionCents;
  const suggestedCommissionPercentage = getChannelCommission(channel).percentage;

  const propertyOptions = ALL_PROPERTIES.map((property) => ({
    value: property.id,
    label: property.name,
  }));
  const statusOptions = [
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'provisional', label: 'Provisional (Pending)' },
    { value: 'checked_in', label: 'Checked In' },
    { value: 'checked_out', label: 'Checked Out' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!propertyId || !ALL_PROPERTIES.some((property) => property.id === propertyId)) {
      setFormError('Select an active property.');
      return;
    }
    if (!guestName.trim()) {
      setFormError('Guest name / lead contact is required.');
      return;
    }
    if (!checkInDate || !checkOutDate) {
      setFormError('Check-in and check-out dates are required.');
      return;
    }
    if (checkInDate >= checkOutDate || nightsCount <= 0) {
      setFormError('Check-out date must be strictly after check-in date.');
      return;
    }
    if (parsedCommissionPercentage < 0 || parsedCommissionPercentage > 100) {
      setFormError('Commission percentage must be between 0 and 100.');
      return;
    }

    const parsedAdults = Number.parseInt(adults, 10);
    const parsedChildren = Number.parseInt(children, 10);
    const parsedTurnoverMinutes = Number.parseInt(requiredTurnoverMinutes, 10);

    if (!Number.isInteger(parsedAdults) || parsedAdults < 1) {
      setFormError('At least one adult is required.');
      return;
    }
    if (!Number.isInteger(parsedChildren) || parsedChildren < 0) {
      setFormError('Children must be zero or a positive whole number.');
      return;
    }
    if (!Number.isInteger(parsedTurnoverMinutes) || parsedTurnoverMinutes < 0) {
      setFormError('Required cleaning time must be zero or a positive whole number.');
      return;
    }

    const payload = {
      propertyId,
      guestName: guestName.trim(),
      channel,
      checkInDate,
      checkOutDate,
      nightlyRateCents: parsedNightlyRateCents,
      adults: parsedAdults,
      children: parsedChildren,
      status,
      discountCents: parsedDiscountCents,
      cleaningFeeCents: parsedCleaningFeeCents,
      notes: notes.trim() || undefined,
      bookingRef: bookingRef.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      commissionMode,
      commissionPercentage: parsedCommissionPercentage,
      commissionFixedAmountCents: parsedCommissionFixedCents,
      suggestedCommissionPercentage,
      commissionOverrideEnabled,
      checkInTime,
      checkOutTime,
      timezone: 'Europe/Malta',
      earlyCheckIn,
      lateCheckOut,
      requiredTurnoverMinutes: parsedTurnoverMinutes,
      turnoverStatus: 'sufficient' as const,
      source: 'manual' as const,
      syncStatus: 'not_synced' as const,
    };

    const result = isEditing && editingBooking
      ? updateBooking(editingBooking.id, payload)
      : addBooking(payload);

    if (!result.success) {
      setFormError(result.error || 'The reservation could not be saved.');
      return;
    }

    closeModal();
  };

  const handleDelete = () => {
    if (!editingBooking) return;
    openConfirmation({
      title: 'Delete Reservation?',
      message: `Delete the reservation for ${editingBooking.guestName}? You can undo this action from the notification.`,
      confirmText: 'Delete Reservation',
      variant: 'danger',
      onConfirm: () => {
        deleteBooking(editingBooking.id);
        closeModal();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-0 backdrop-blur-md sm:p-4">
      <div className="relative flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-slate-900 text-slate-100 shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl sm:border sm:border-slate-700/90">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex-shrink-0 rounded-lg border border-[#ff3e00]/40 bg-[#ff3e00]/10 p-2 text-[#ff3e00]">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display text-base font-black uppercase tracking-tight text-slate-100 sm:text-lg">
                {isEditing ? 'Edit Reservation' : copiedBooking ? 'Copy Reservation' : 'New Reservation'}
              </h3>
              <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs">
                {isEditing
                  ? `Ref: ${editingBooking?.bookingRef || editingBooking?.id}`
                  : copiedBooking
                    ? 'Review details and select new dates'
                    : 'Select dates and guest details'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            aria-label="Close reservation form"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] no-scrollbar sm:p-6"
        >
          {formError && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-600/80 bg-rose-950/90 p-3.5 text-xs font-semibold text-rose-200 shadow-lg">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CustomSelect
              label="Property"
              options={propertyOptions}
              value={propertyId}
              onChange={(value) => setPropertyId(String(value))}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Booking Channel
              </label>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-800 bg-slate-950 p-1">
                {Object.values(CHANNEL_CONFIG).map((item) => {
                  const selected = channel === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleChannelChange(item.id as Channel)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all ${
                        selected
                          ? `${item.badgeClass} shadow-md`
                          : 'border-transparent bg-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${item.dotColor}`} />
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Guest Name / Lead Contact *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  className="w-full rounded-lg border border-slate-700/80 bg-slate-950 py-2.5 pl-9 pr-3.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
            </div>
            <CustomSelect
              label="Reservation Status"
              options={statusOptions}
              value={status}
              onChange={(value) => setStatus(value as BookingStatus)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="Guest email (optional)"
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 text-xs text-slate-100 outline-none focus:border-cyan-500"
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="tel"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                placeholder="Guest phone (optional)"
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 text-xs text-slate-100 outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CustomDatePicker
              label="Check-In Date *"
              value={checkInDate}
              onChange={setCheckInDate}
              unavailableDates={unavailableDates}
            />
            <CustomDatePicker
              label="Check-Out Date *"
              value={checkOutDate}
              onChange={setCheckOutDate}
              minDate={checkInDate}
              rangeStart={checkInDate}
              unavailableDates={unavailableDates}
            />
          </div>

          <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Operational Schedule & Turnovers
            </h4>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <label className="space-y-1 text-slate-400">
                <span className="block font-medium">Check-in</span>
                <input
                  type="time"
                  value={checkInTime}
                  onChange={(event) => setCheckInTime(event.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-slate-100"
                />
              </label>
              <label className="space-y-1 text-slate-400">
                <span className="block font-medium">Check-out</span>
                <input
                  type="time"
                  value={checkOutTime}
                  onChange={(event) => setCheckOutTime(event.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-slate-100"
                />
              </label>
              <label className="space-y-1 text-slate-400">
                <span className="block font-medium">Cleaning mins</span>
                <input
                  type="number"
                  min="0"
                  step="30"
                  value={requiredTurnoverMinutes}
                  onChange={(event) => setRequiredTurnoverMinutes(event.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-slate-100"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={earlyCheckIn}
                  onChange={(event) => setEarlyCheckIn(event.target.checked)}
                  className="themed-checkbox"
                />
                Early Check-in
              </label>
              <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={lateCheckOut}
                  onChange={(event) => setLateCheckOut(event.target.checked)}
                  className="themed-checkbox"
                />
                Late Check-out
              </label>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <CreditCard className="h-4 w-4" /> Financial & Commission Breakdown
              </h4>
              <span className="text-xs font-medium text-slate-400">
                {nightsCount} {nightsCount === 1 ? 'Night' : 'Nights'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ['Nightly Rate (€)', nightlyRate, setNightlyRate],
                ['Cleaning Fee (€)', cleaningFee, setCleaningFee],
                ['Discount (€)', discount, setDiscount],
              ].map(([label, value, setter]) => (
                <label key={String(label)} className="space-y-1 text-xs font-semibold text-slate-300">
                  <span className="block">{String(label)}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={String(value)}
                    onChange={(event) => (setter as (value: string) => void)(event.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </label>
              ))}
            </div>

            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs font-semibold text-amber-300">OTA Commission</span>
                  <p className="mt-0.5 text-[9px] text-slate-500">
                    Percentage base: {taxConfig.commissionBasis.replace(/_/g, ' ')}
                  </p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={commissionOverrideEnabled}
                    onChange={(event) =>
                      handleCommissionOverrideChange(event.target.checked)
                    }
                    className="themed-checkbox"
                  />
                  Override channel default
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                <label className="space-y-1 text-slate-400">
                  <span className="block">Commission Type</span>
                  <select
                    value={commissionMode}
                    disabled={!commissionOverrideEnabled}
                    onChange={(event) =>
                      setCommissionMode(event.target.value as CommissionMode)
                    }
                    data-custom-select-ignore="true"
                    className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (€)</option>
                    <option value="none">None (0%)</option>
                  </select>
                </label>

                {commissionMode === 'percentage' && (
                  <label className="space-y-1 text-slate-400">
                    <span className="block">Commission Rate (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      disabled={!commissionOverrideEnabled}
                      value={commissionPercentage}
                      onChange={(event) => setCommissionPercentage(event.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>
                )}

                {commissionMode === 'fixed' && (
                  <label className="space-y-1 text-slate-400">
                    <span className="block">Fixed Amount (€)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!commissionOverrideEnabled}
                      value={commissionFixedAmount}
                      onChange={(event) => setCommissionFixedAmount(event.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300">
              <div className="flex justify-between gap-3">
                <span>Accommodation ({nightsCount} nights)</span>
                <span className="font-medium text-slate-200">
                  {formatCents(nightsCount * parsedNightlyRateCents)}
                </span>
              </div>
              {parsedCleaningFeeCents > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>+ Cleaning Fee</span>
                  <span>{formatCents(parsedCleaningFeeCents)}</span>
                </div>
              )}
              {parsedDiscountCents > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>- Discount</span>
                  <span>{formatCents(parsedDiscountCents)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-800 pt-1 text-slate-200">
                <span>Gross Booking Total</span>
                <span className="font-bold">{formatCents(grossBookingRevenueCents)}</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>- Channel Commission</span>
                <span>-{formatCents(otaCommissionCents)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5 text-sm font-extrabold text-cyan-300">
                <span>Net Owner Payout</span>
                <span>{formatCents(netBookingRevenueCents)}</span>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-xs font-semibold text-slate-300">
              <span className="block">Adults</span>
              <input
                type="number"
                min="1"
                step="1"
                value={adults}
                onChange={(event) => setAdults(event.target.value)}
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-300">
              <span className="block">Children</span>
              <input
                type="number"
                min="0"
                step="1"
                value={children}
                onChange={(event) => setChildren(event.target.value)}
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100"
              />
            </label>
            <label className="col-span-2 space-y-1 text-xs font-semibold text-slate-300 sm:col-span-1">
              <span className="block">Booking Ref</span>
              <input
                type="text"
                value={bookingRef}
                onChange={(event) => setBookingRef(event.target.value)}
                className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100"
              />
            </label>
          </div>

          <label className="block space-y-1 text-xs font-semibold text-slate-300">
            <span>Internal Operational Notes</span>
            <textarea
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full resize-none rounded-lg border border-slate-700/80 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </label>

          {isEditing && editingBooking && (
            <div className="flex flex-col justify-between gap-1 border-t border-slate-800 pt-2 text-[10px] text-slate-500 sm:flex-row">
              <span>Created: {new Date(editingBooking.createdAt).toLocaleString()}</span>
              <span>Last Updated: {new Date(editingBooking.updatedAt).toLocaleString()}</span>
            </div>
          )}

          <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/95 py-3 backdrop-blur">
            {isEditing && editingBooking ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-rose-800 bg-rose-950 px-3 text-xs font-semibold text-rose-300 hover:bg-rose-900"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openModal('booking_add', { copyFromBookingId: editingBooking.id })
                  }
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-slate-800 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                >
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Copy to New</span>
                </button>
                {editingBooking.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => {
                      cancelBooking(editingBooking.id);
                      closeModal();
                    }}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-amber-800 bg-amber-950 px-3 text-xs font-semibold text-amber-300 hover:bg-amber-900"
                  >
                    <Ban className="h-4 w-4" />
                    <span className="hidden sm:inline">Cancel</span>
                  </button>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="h-10 rounded-lg border border-slate-700 bg-slate-800 px-4 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex h-10 items-center gap-2 rounded-lg bg-[#ff3e00] px-5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-[#ff3e00]/20 hover:bg-[#e03700]"
              >
                <Save className="h-4 w-4" />
                {isEditing ? 'Save Changes' : copiedBooking ? 'Create Copy' : 'Create Booking'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
