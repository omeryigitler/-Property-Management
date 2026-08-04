import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Ban,
  Calendar as CalendarIcon,
  Copy,
  Save,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { ALL_PROPERTIES, CHANNEL_CONFIG } from '../../config/locations';
import { Booking, BookingStatus, Channel } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { calculateNights } from '../../utils/dateUtilities';
import { centsToEuros, eurosToCents } from '../../utils/currency';
import { getBookingOccupiedNights } from '../../utils/bookingCalculations';
import { DEFAULT_CHANNEL_COMMISSIONS } from '../../services/financialCalculationService';

function getChannelCommission(channel: Channel) {
  return DEFAULT_CHANNEL_COMMISSIONS[channel] ?? {
    percentage: 15,
    mode: 'percentage' as const,
  };
}

function euroInputFromCents(cents: number): string {
  return centsToEuros(cents).toFixed(2).replace(/\.00$/, '');
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
  const [status, setStatus] = useState<BookingStatus>('confirmed');
  const [formError, setFormError] = useState<string | null>(null);

  const populateFromBooking = (booking: Booking, asCopy: boolean) => {
    const activePropertyId = ALL_PROPERTIES.some((property) => property.id === booking.propertyId)
      ? booking.propertyId
      : ALL_PROPERTIES[0]?.id ?? '';

    setPropertyId(activePropertyId);
    setGuestName(asCopy ? `${booking.guestName} (Copy)` : booking.guestName);
    setChannel(booking.channel);
    setCheckInDate(asCopy ? '' : booking.checkInDate);
    setCheckOutDate(asCopy ? '' : booking.checkOutDate);
    setNightlyRate(euroInputFromCents(booking.nightlyRateCents));
    setStatus(asCopy ? 'confirmed' : booking.status);
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

    setPropertyId(modalParams.prefilledPropertyId || ALL_PROPERTIES[0]?.id || '');
    setGuestName('');
    setChannel('airbnb');
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
    setStatus('confirmed');
    setFormError(null);
  }, [activeModal, modalParams, editingBooking, copiedBooking, isAdding, isEditing]);

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
  const calculatedTotalCents = nightsCount * parsedNightlyRateCents;
  const pricingMatchesStoredBooking = Boolean(
    isEditing &&
      editingBooking &&
      editingBooking.checkInDate === checkInDate &&
      editingBooking.checkOutDate === checkOutDate &&
      editingBooking.nightlyRateCents === parsedNightlyRateCents
  );
  const displayedTotalCents =
    pricingMatchesStoredBooking && editingBooking?.accommodationTotalCents != null
      ? editingBooking.accommodationTotalCents
      : calculatedTotalCents;

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

  if (!isAdding && !isEditing) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!propertyId || !ALL_PROPERTIES.some((property) => property.id === propertyId)) {
      setFormError('Select an active property.');
      return;
    }
    if (!guestName.trim()) {
      setFormError('Guest name is required.');
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
    if (!nightlyRate.trim()) {
      setFormError('Nightly rate is required.');
      return;
    }

    if (isEditing && editingBooking) {
      const updates: Partial<Booking> = {
        propertyId,
        guestName: guestName.trim(),
        channel,
        checkInDate,
        checkOutDate,
        nightlyRateCents: parsedNightlyRateCents,
        status,
      };

      if (!pricingMatchesStoredBooking) {
        updates.accommodationTotalCents = calculatedTotalCents;
      }

      if (channel !== editingBooking.channel) {
        const channelDefaults = getChannelCommission(channel);
        updates.suggestedCommissionPercentage = channelDefaults.percentage;

        if (!editingBooking.commissionOverrideEnabled) {
          updates.commissionMode = channelDefaults.mode;
          updates.commissionPercentage = channelDefaults.percentage;
          updates.commissionFixedAmountCents = 0;
          updates.commissionOverrideEnabled = false;
        }
      }

      const result = updateBooking(editingBooking.id, updates);
      if (!result.success) {
        setFormError(result.error || 'The reservation could not be saved.');
        return;
      }

      closeModal();
      return;
    }

    const channelDefaults = getChannelCommission(channel);
    const result = addBooking({
      propertyId,
      guestName: guestName.trim(),
      channel,
      checkInDate,
      checkOutDate,
      nightlyRateCents: parsedNightlyRateCents,
      accommodationTotalCents: calculatedTotalCents,
      adults: 2,
      children: 0,
      status,
      discountCents: 0,
      cleaningFeeCents: 0,
      notes: undefined,
      bookingRef: undefined,
      contactEmail: undefined,
      contactPhone: undefined,
      commissionMode: channelDefaults.mode,
      commissionPercentage: channelDefaults.percentage,
      commissionFixedAmountCents: 0,
      suggestedCommissionPercentage: channelDefaults.percentage,
      commissionOverrideEnabled: false,
      checkInTime: taxConfig.defaultCheckInTime || '15:00',
      checkOutTime: taxConfig.defaultCheckOutTime || '10:00',
      timezone: 'Europe/Malta',
      earlyCheckIn: false,
      lateCheckOut: false,
      requiredTurnoverMinutes: Math.max(0, taxConfig.defaultTurnoverMinutes ?? 240),
      turnoverStatus: 'sufficient',
      source: 'manual',
      syncStatus: 'not_synced',
    });

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
                  ? 'Update reservation details'
                  : copiedBooking
                    ? 'Review details and select new dates'
                    : 'Enter reservation details'}
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
                      onClick={() => setChannel(item.id as Channel)}
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
                Guest Name *
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

          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-semibold text-slate-300">
              <span className="block uppercase tracking-wider">Nightly Rate (€) *</span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={nightlyRate}
                onChange={(event) => setNightlyRate(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </label>

            <label className="space-y-1.5 text-xs font-semibold text-slate-300">
              <span className="flex items-center justify-between gap-2 uppercase tracking-wider">
                <span>Total (€)</span>
                <span className="text-[10px] font-medium normal-case tracking-normal text-slate-500">
                  {nightsCount} {nightsCount === 1 ? 'night' : 'nights'}
                </span>
              </span>
              <input
                type="number"
                readOnly
                value={nightsCount > 0 ? euroInputFromCents(displayedTotalCents) : ''}
                placeholder="Select dates"
                className="h-10 w-full cursor-not-allowed rounded-lg border border-cyan-800 bg-cyan-950/20 px-3 text-sm font-bold text-cyan-100 outline-none"
              />
            </label>
          </div>

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
