import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Copy,
  Save,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { ALL_PROPERTIES, CHANNEL_CONFIG } from '../../config/locations';
import { BookingStatus, Channel } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { calculateNights } from '../../utils/dateUtilities';
import { centsToEuros, eurosToCents } from '../../utils/currency';
import { getBookingOccupiedNights } from '../../utils/bookingCalculations';

function euroInputFromCents(cents: number): string {
  return centsToEuros(cents).toFixed(2).replace(/\.00$/, '');
}

export function BookingModal() {
  const activeModal = useDashboardStore((state) => state.activeModal);
  const modalParams = useDashboardStore((state) => state.modalParams);
  const closeModal = useDashboardStore((state) => state.closeModal);
  const openModal = useDashboardStore((state) => state.openModal);
  const bookings = useDashboardStore((state) => state.bookings);
  const addBooking = useDashboardStore((state) => state.addBooking);
  const updateBooking = useDashboardStore((state) => state.updateBooking);
  const deleteBooking = useDashboardStore((state) => state.deleteBooking);
  const openConfirmation = useDashboardStore((state) => state.openConfirmation);

  const isEditing = activeModal === 'booking_edit';
  const isAdding = activeModal === 'booking_add';
  const editingBooking = isEditing
    ? bookings.find((booking) => booking.id === modalParams.bookingId)
    : undefined;
  const copiedBooking =
    isAdding && modalParams.copyFromBookingId
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

  useEffect(() => {
    if (isEditing && editingBooking) {
      setPropertyId(editingBooking.propertyId);
      setGuestName(editingBooking.guestName);
      setChannel(editingBooking.channel);
      setCheckInDate(editingBooking.checkInDate);
      setCheckOutDate(editingBooking.checkOutDate);
      setNightlyRate(euroInputFromCents(editingBooking.nightlyRateCents));
      setStatus(editingBooking.status === 'provisional' ? 'provisional' : 'confirmed');
      setFormError(null);
      return;
    }

    if (!isAdding) return;

    if (copiedBooking) {
      setPropertyId(copiedBooking.propertyId);
      setGuestName(`${copiedBooking.guestName} (Copy)`);
      setChannel(copiedBooking.channel);
      setCheckInDate('');
      setCheckOutDate('');
      setNightlyRate(euroInputFromCents(copiedBooking.nightlyRateCents));
      setStatus('confirmed');
      setFormError('Select new check-in and check-out dates for the copied reservation.');
      return;
    }

    const prefilledDate = String(modalParams.prefilledDate || '');
    setPropertyId(modalParams.prefilledPropertyId || ALL_PROPERTIES[0]?.id || '');
    setGuestName('');
    setChannel('airbnb');
    setCheckInDate(prefilledDate);
    setNightlyRate('120');
    setStatus('confirmed');

    if (prefilledDate) {
      const [year, month, day] = prefilledDate.split('-').map(Number);
      const checkout = new Date(year, month - 1, day);
      checkout.setDate(checkout.getDate() + 2);
      setCheckOutDate(
        `${checkout.getFullYear()}-${String(checkout.getMonth() + 1).padStart(2, '0')}-${String(
          checkout.getDate()
        ).padStart(2, '0')}`
      );
    } else {
      setCheckOutDate('');
    }
    setFormError(null);
  }, [isEditing, isAdding, editingBooking, copiedBooking, modalParams]);

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

  if (!isAdding && !isEditing) return null;

  const nightsCount = Math.max(0, calculateNights(checkInDate, checkOutDate));
  const nightlyRateCents = Math.max(0, eurosToCents(nightlyRate));
  const totalCents = nightsCount * nightlyRateCents;
  const propertyOptions = ALL_PROPERTIES.map((property) => ({
    value: property.id,
    label: property.name,
  }));
  const statusOptions: Array<{ value: BookingStatus; label: string }> = [
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'provisional', label: 'Provisional (Pending)' },
  ];

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!ALL_PROPERTIES.some((property) => property.id === propertyId)) {
      setFormError('Select an active property.');
      return;
    }
    if (!guestName.trim()) {
      setFormError('Guest name is required.');
      return;
    }
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate || nightsCount <= 0) {
      setFormError('Check-out date must be after check-in date.');
      return;
    }
    if (!nightlyRate.trim()) {
      setFormError('Nightly rate is required.');
      return;
    }

    const payload = {
      propertyId,
      guestName: guestName.trim(),
      channel,
      checkInDate,
      checkOutDate,
      nightlyRateCents,
      status,
    };
    const result =
      isEditing && editingBooking
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
      message: `Delete the reservation for ${editingBooking.guestName}?`,
      confirmText: 'Delete Reservation',
      variant: 'danger',
      onConfirm: () => {
        deleteBooking(editingBooking.id);
        closeModal();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#352b29]/40 p-0 backdrop-blur-sm sm:p-4">
      <div className="relative flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-white text-[#222222] shadow-[0_28px_90px_rgba(45,32,28,0.22)] sm:h-auto sm:max-h-[92dvh] sm:rounded-3xl sm:border sm:border-[#e7e2df]">
        <header className="flex items-center justify-between border-b border-[#eee8e5] bg-[#fffaf9] px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl border border-[#ffd1ce] bg-[#fff0ef] p-2.5 text-[#d9474d]">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display text-lg font-extrabold tracking-[-0.025em] text-[#222222] sm:text-xl">
                {isEditing ? 'Edit reservation' : copiedBooking ? 'Copy reservation' : 'New reservation'}
              </h3>
              <p className="truncate text-xs font-medium text-[#717171]">
                Add the essential reservation details.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-xl p-2 text-[#717171] transition-colors hover:bg-[#f4efed] hover:text-[#222222]"
            aria-label="Close reservation form"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto p-4 no-scrollbar sm:p-6">
          {formError && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-[#f5c7c4] bg-[#fff1f0] p-3.5 text-sm font-semibold text-[#a93439]">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-[#d9474d]" />
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
              <label className="text-sm font-semibold text-[#4d4744]">Booking Channel</label>
              <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-[#e7e2df] bg-[#f8f6f5] p-1.5">
                {Object.values(CHANNEL_CONFIG).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setChannel(item.id as Channel)}
                    className={`flex min-h-9 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-bold transition-all ${
                      channel === item.id
                        ? 'border-[#ffc7c4] bg-white text-[#c83f45] shadow-sm'
                        : 'border-transparent text-[#717171] hover:bg-white hover:text-[#222222]'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${item.dotColor}`} />
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-[#4d4744]">Guest Name *</span>
              <span className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-[#9a918d]" />
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[#ded8d4] bg-white py-2.5 pl-10 pr-3.5 text-sm text-[#222222] outline-none transition-all placeholder:text-[#aaa3a0] focus:border-[#ff5a5f] focus:ring-4 focus:ring-[#ff5a5f]/10"
                />
              </span>
            </label>
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

          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[#eee8e5] bg-[#fffaf9] p-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-semibold text-[#4d4744]">
              <span className="block">Nightly Rate (€) *</span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={nightlyRate}
                onChange={(event) => setNightlyRate(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#ded8d4] bg-white px-3.5 text-sm text-[#222222] outline-none transition-all focus:border-[#ff5a5f] focus:ring-4 focus:ring-[#ff5a5f]/10"
              />
            </label>
            <label className="space-y-1.5 text-sm font-semibold text-[#4d4744]">
              <span className="flex items-center justify-between gap-2">
                <span>Total (€)</span>
                <span className="text-xs font-medium text-[#8a817d]">
                  {nightsCount} {nightsCount === 1 ? 'night' : 'nights'}
                </span>
              </span>
              <input
                type="text"
                readOnly
                value={nightsCount > 0 ? euroInputFromCents(totalCents) : ''}
                placeholder="Select dates"
                className="h-11 w-full cursor-not-allowed rounded-xl border border-[#ffcfc9] bg-[#fff1ef] px-3.5 text-sm font-bold text-[#a93439] placeholder:text-[#b98d89]"
              />
            </label>
          </div>

          <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-[#eee8e5] bg-white/95 py-3 backdrop-blur">
            {isEditing && editingBooking ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex h-10 items-center gap-1.5 rounded-xl border border-[#f1c9c6] bg-[#fff5f4] px-3 text-xs font-bold text-[#b13a40] transition-colors hover:bg-[#ffebe9]"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openModal('booking_add', { copyFromBookingId: editingBooking.id })
                  }
                  className="flex h-10 items-center gap-1.5 rounded-xl border border-[#e7e2df] bg-white px-3 text-xs font-bold text-[#4f4f4f] transition-colors hover:bg-[#f8f6f5]"
                >
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Copy</span>
                </button>
              </div>
            ) : (
              <div />
            )}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="h-10 rounded-xl border border-[#ded8d4] bg-white px-4 text-xs font-bold text-[#5f5f5f] transition-colors hover:bg-[#f8f6f5]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex h-10 items-center gap-2 rounded-xl bg-[#ff5a5f] px-5 text-xs font-bold text-white shadow-[0_8px_18px_rgba(255,90,95,0.22)] transition-colors hover:bg-[#e94f54]"
              >
                <Save className="h-4 w-4" />
                {isEditing ? 'Save Changes' : 'Create Booking'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
