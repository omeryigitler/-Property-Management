import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, User, CreditCard, Save, Trash2, Copy, AlertCircle, Ban } from 'lucide-react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { ALL_PROPERTIES, CHANNEL_CONFIG } from '../../config/locations';
import { Channel, BookingStatus, CommissionMode } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { calculateNights } from '../../utils/dateUtilities';
import { eurosToCents, centsToEuros, formatCents } from '../../utils/currency';
import { getBookingOccupiedNights } from '../../utils/bookingCalculations';

export function BookingModal() {
  const activeModal = useDashboardStore((s) => s.activeModal);
  const modalParams = useDashboardStore((s) => s.modalParams);
  const closeModal = useDashboardStore((s) => s.closeModal);
  const bookings = useDashboardStore((s) => s.bookings);

  const addBooking = useDashboardStore((s) => s.addBooking);
  const updateBooking = useDashboardStore((s) => s.updateBooking);
  const deleteBooking = useDashboardStore((s) => s.deleteBooking);
  const duplicateBooking = useDashboardStore((s) => s.duplicateBooking);
  const cancelBooking = useDashboardStore((s) => s.cancelBooking);
  const openConfirmation = useDashboardStore((s) => s.openConfirmation);

  const isEditing = activeModal === 'booking_edit';
  const isAdding = activeModal === 'booking_add';

  const editingBooking = isEditing ? bookings.find((b) => b.id === modalParams.bookingId) : null;

  // Form State
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

  // OTA Commission State
  const [commissionMode, setCommissionMode] = useState<CommissionMode>('percentage');
  const [commissionPercentage, setCommissionPercentage] = useState('15');
  const [commissionFixedAmount, setCommissionFixedAmount] = useState('0');
  const [commissionOverrideEnabled, setCommissionOverrideEnabled] = useState(false);

  // Time & Turnover State
  const [checkInTime, setCheckInTime] = useState('15:00');
  const [checkOutTime, setCheckOutTime] = useState('10:00');
  const [earlyCheckIn, setEarlyCheckIn] = useState(false);
  const [lateCheckOut, setLateCheckOut] = useState(false);
  const [requiredTurnoverMinutes, setRequiredTurnoverMinutes] = useState('240');

  const [formError, setFormError] = useState<string | null>(null);

  // Initialize or update fields when modal opens
  useEffect(() => {
    if (isEditing && editingBooking) {
      setPropertyId(editingBooking.propertyId);
      setGuestName(editingBooking.guestName);
      setChannel(editingBooking.channel);
      setCheckInDate(editingBooking.checkInDate);
      setCheckOutDate(editingBooking.checkOutDate);
      setNightlyRate(centsToEuros(editingBooking.nightlyRateCents).toString());
      setAdults(editingBooking.adults.toString());
      setChildren(editingBooking.children.toString());
      setStatus(editingBooking.status);
      setDiscount(centsToEuros(editingBooking.discountCents).toString());
      setCleaningFee(centsToEuros(editingBooking.cleaningFeeCents).toString());
      setNotes(editingBooking.notes || '');
      setBookingRef(editingBooking.bookingRef || '');
      setContactEmail(editingBooking.contactEmail || '');
      setContactPhone(editingBooking.contactPhone || '');

      setCommissionMode(editingBooking.commissionMode || 'percentage');
      setCommissionPercentage((editingBooking.commissionPercentage ?? 15).toString());
      setCommissionFixedAmount(centsToEuros(editingBooking.commissionFixedAmountCents || 0).toString());
      setCommissionOverrideEnabled(editingBooking.commissionOverrideEnabled || false);

      setCheckInTime(editingBooking.checkInTime || '15:00');
      setCheckOutTime(editingBooking.checkOutTime || '10:00');
      setEarlyCheckIn(editingBooking.earlyCheckIn || false);
      setLateCheckOut(editingBooking.lateCheckOut || false);
      setRequiredTurnoverMinutes((editingBooking.requiredTurnoverMinutes || 240).toString());

      setFormError(null);
    } else if (isAdding) {
      setPropertyId(modalParams.prefilledPropertyId || ALL_PROPERTIES[0].id);
      setGuestName('');
      setChannel('airbnb');
      setCheckInDate(modalParams.prefilledDate || '');
      if (modalParams.prefilledDate) {
        const parts = modalParams.prefilledDate.split('-');
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          d.setDate(d.getDate() + 2);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          setCheckOutDate(`${yyyy}-${mm}-${dd}`);
        } else {
          setCheckOutDate('');
        }
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

      setCommissionMode('percentage');
      setCommissionPercentage('15');
      setCommissionFixedAmount('0');
      setCommissionOverrideEnabled(false);

      setCheckInTime('15:00');
      setCheckOutTime('10:00');
      setEarlyCheckIn(false);
      setLateCheckOut(false);
      setRequiredTurnoverMinutes('240');

      setFormError(null);
    }
  }, [activeModal, modalParams, editingBooking]);

  if (!isAdding && !isEditing) return null;

  // Update suggested channel commission when channel changes
  const handleChannelChange = (newChannel: Channel) => {
    setChannel(newChannel);
    if (!commissionOverrideEnabled) {
      if (newChannel === 'airbnb' || newChannel === 'booking_com') {
        setCommissionMode('percentage');
        setCommissionPercentage('15');
      } else if (newChannel === 'vrbo') {
        setCommissionMode('percentage');
        setCommissionPercentage('10');
      } else {
        setCommissionMode('none');
        setCommissionPercentage('0');
      }
    }
  };

  const unavailableDates = bookings
    .filter((b) => b.propertyId === propertyId && b.status !== 'cancelled' && b.id !== editingBooking?.id)
    .flatMap((b) => getBookingOccupiedNights(b).map((n) => n.dateStr));

  // Calculations
  const nightsCount = calculateNights(checkInDate, checkOutDate);
  const parsedNightlyRateCents = eurosToCents(nightlyRate);
  const parsedDiscountCents = eurosToCents(discount);
  const parsedCleaningFeeCents = eurosToCents(cleaningFee);

  const grossAccRevenueCents = Math.max(0, nightsCount * parsedNightlyRateCents - parsedDiscountCents);
  const grossBookingRevenueCents = grossAccRevenueCents + parsedCleaningFeeCents;

  let otaCommissionCents = 0;
  if (commissionMode === 'percentage') {
    otaCommissionCents = Math.round((grossAccRevenueCents * (parseFloat(commissionPercentage) || 0)) / 100);
  } else if (commissionMode === 'fixed') {
    otaCommissionCents = eurosToCents(commissionFixedAmount);
  }

  const netBookingRevenueCents = grossBookingRevenueCents - otaCommissionCents;

  const propertyOptions = ALL_PROPERTIES.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const statusOptions = [
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'provisional', label: 'Provisional (Pending)' },
    { value: 'checked_in', label: 'Checked In' },
    { value: 'checked_out', label: 'Checked Out' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!guestName.trim()) {
      setFormError('Guest name / lead contact is required.');
      return;
    }
    if (!checkInDate || !checkOutDate) {
      setFormError('Check-in and check-out dates are required.');
      return;
    }
    if (checkInDate >= checkOutDate) {
      setFormError('Check-out date must be strictly after check-in date.');
      return;
    }

    const payload = {
      propertyId,
      guestName: guestName.trim(),
      channel,
      checkInDate,
      checkOutDate,
      nightlyRateCents: parsedNightlyRateCents,
      adults: parseInt(adults) || 1,
      children: parseInt(children) || 0,
      status: status as BookingStatus,
      discountCents: parsedDiscountCents,
      cleaningFeeCents: parsedCleaningFeeCents,
      notes: notes.trim() || undefined,
      bookingRef: bookingRef.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,

      commissionMode,
      commissionPercentage: parseFloat(commissionPercentage) || 0,
      commissionFixedAmountCents: eurosToCents(commissionFixedAmount),
      suggestedCommissionPercentage: parseFloat(commissionPercentage) || 0,
      commissionOverrideEnabled,

      checkInTime,
      checkOutTime,
      timezone: 'Europe/Malta',
      earlyCheckIn,
      lateCheckOut,
      requiredTurnoverMinutes: parseInt(requiredTurnoverMinutes) || 240,
      turnoverStatus: 'sufficient' as const,

      source: 'manual' as const,
      syncStatus: 'not_synced' as const,
    };

    if (isEditing && editingBooking) {
      const res = updateBooking(editingBooking.id, payload);
      if (!res.success) {
        setFormError(res.error || 'Failed to update booking.');
        return;
      }
    } else {
      const res = addBooking(payload);
      if (!res.success) {
        setFormError(res.error || 'Failed to add booking.');
        return;
      }
    }

    closeModal();
  };

  const handleDelete = () => {
    if (!editingBooking) return;
    openConfirmation({
      title: 'Delete Reservation?',
      message: `Are you sure you want to delete the reservation for ${editingBooking.guestName}? You can undo this action from the toast notification.`,
      confirmText: 'Delete Reservation',
      variant: 'danger',
      onConfirm: () => {
        deleteBooking(editingBooking.id);
        closeModal();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl text-slate-100 flex flex-col max-h-[92dvh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#ff3e00]/10 text-[#ff3e00] border border-[#ff3e00]/40">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-display font-black uppercase tracking-tight text-slate-100">
                {isEditing ? 'Edit Reservation' : 'New Short-Let Reservation'}
              </h3>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {isEditing ? `Ref: ${editingBooking?.bookingRef || editingBooking?.id}` : 'Select dates and guest details'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-600/80 text-rose-200 text-xs font-semibold flex items-center gap-2.5 animate-shake shadow-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          {/* Property & Channel Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomSelect
              label="Property"
              options={propertyOptions}
              value={propertyId}
              onChange={(val) => setPropertyId(val as string)}
            />

            {/* Channel Selectable Segmented Buttons */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Booking Channel
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                {Object.values(CHANNEL_CONFIG).map((ch) => {
                  const isSelected = channel === ch.id;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => handleChannelChange(ch.id as Channel)}
                      className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        isSelected
                          ? `${ch.badgeClass} shadow-md`
                          : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${ch.dotColor}`} />
                      <span>{ch.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Guest Name & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Guest Name / Lead Contact *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alexander Wright"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700/80 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
            </div>

            <CustomSelect
              label="Reservation Status"
              options={statusOptions}
              value={status}
              onChange={(val) => setStatus(val as BookingStatus)}
            />
          </div>

          {/* Check-In & Check-Out Custom Date Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomDatePicker
              label="Check-In Date *"
              value={checkInDate}
              onChange={(d) => setCheckInDate(d)}
              unavailableDates={unavailableDates}
            />

            <CustomDatePicker
              label="Check-Out Date *"
              value={checkOutDate}
              onChange={(d) => setCheckOutDate(d)}
              minDate={checkInDate}
              rangeStart={checkInDate}
              unavailableDates={unavailableDates}
            />
          </div>

          {/* Operational Times */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Operational Schedule & Turnovers
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Check-in Time</label>
                <input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 font-medium block mb-1">Check-out Time</label>
                <input
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 font-medium block mb-1">Required Cleaning (mins)</label>
                <input
                  type="number"
                  step="30"
                  value={requiredTurnoverMinutes}
                  onChange={(e) => setRequiredTurnoverMinutes(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
                />
              </div>
              <div className="flex flex-col justify-end gap-1 pb-1">
                <label className="inline-flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={earlyCheckIn}
                    onChange={(e) => setEarlyCheckIn(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                  />
                  <span>Early Check-in</span>
                </label>
                <label className="inline-flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lateCheckOut}
                    onChange={(e) => setLateCheckOut(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500"
                  />
                  <span>Late Check-out</span>
                </label>
              </div>
            </div>
          </div>

          {/* Pricing & Fees & OTA Commission */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4" />
                <span>Financial & OTA Commission Breakdown</span>
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {nightsCount} {nightsCount === 1 ? 'Night' : 'Nights'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-300">Nightly Rate (€)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={nightlyRate}
                    onChange={(e) => setNightlyRate(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-300">Cleaning Fee (€)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cleaningFee}
                    onChange={(e) => setCleaningFee(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-300">Discount (€)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 text-xs">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* OTA Commission Controls */}
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-300">OTA Commission Structure</span>
                <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={commissionOverrideEnabled}
                    onChange={(e) => setCommissionOverrideEnabled(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-cyan-500"
                  />
                  <span>Override Default ({channel.toUpperCase()})</span>
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Commission Type</label>
                  <select
                    value={commissionMode}
                    onChange={(e) => setCommissionMode(e.target.value as CommissionMode)}
                    className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (€)</option>
                    <option value="none">None (0%)</option>
                  </select>
                </div>

                {commissionMode === 'percentage' && (
                  <div>
                    <label className="text-slate-400 block mb-1">Commission Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={commissionPercentage}
                      onChange={(e) => setCommissionPercentage(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200"
                    />
                  </div>
                )}

                {commissionMode === 'fixed' && (
                  <div>
                    <label className="text-slate-400 block mb-1">Fixed Amount (€)</label>
                    <input
                      type="number"
                      step="1"
                      value={commissionFixedAmount}
                      onChange={(e) => setCommissionFixedAmount(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-200"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Live Calculation Preview Box */}
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1 text-slate-300">
              <div className="flex items-center justify-between">
                <span>Accommodation ({nightsCount} nights × {formatCents(parsedNightlyRateCents)}):</span>
                <span className="font-medium text-slate-200">{formatCents(nightsCount * parsedNightlyRateCents)}</span>
              </div>
              {parsedCleaningFeeCents > 0 && (
                <div className="flex items-center justify-between text-emerald-400">
                  <span>+ Cleaning Fee:</span>
                  <span>{formatCents(parsedCleaningFeeCents)}</span>
                </div>
              )}
              {parsedDiscountCents > 0 && (
                <div className="flex items-center justify-between text-rose-400">
                  <span>- Discount:</span>
                  <span>{formatCents(parsedDiscountCents)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-slate-200">
                <span>Gross Booking Total:</span>
                <span className="font-bold">{formatCents(grossBookingRevenueCents)}</span>
              </div>
              <div className="flex items-center justify-between text-amber-400">
                <span>- Estimated Channel Commission ({channel.toUpperCase()}):</span>
                <span>-{formatCents(otaCommissionCents)}</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-800 text-sm font-extrabold text-cyan-300">
                <span>Net Owner Payout:</span>
                <span>{formatCents(netBookingRevenueCents)}</span>
              </div>
            </div>
          </div>

          {/* Operational Fields: Guests & References */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-300">Adults</label>
              <input
                type="number"
                min="1"
                value={adults}
                onChange={(e) => setAdults(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-300">Children</label>
              <input
                type="number"
                min="0"
                value={children}
                onChange={(e) => setChildren(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100"
              />
            </div>

            <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
              <label className="text-xs font-semibold text-slate-300">Booking Ref</label>
              <input
                type="text"
                placeholder="e.g. HM-1029"
                value={bookingRef}
                onChange={(e) => setBookingRef(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-300">Internal Operational Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Late arrival around 22:00, needs extra cot"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700/80 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
            />
          </div>

          {isEditing && editingBooking && (
            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800 flex justify-between">
              <span>Created: {new Date(editingBooking.createdAt).toLocaleString()}</span>
              <span>Last Updated: {new Date(editingBooking.updatedAt).toLocaleString()}</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
            {isEditing && editingBooking ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    duplicateBooking(editingBooking.id);
                    closeModal();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Duplicate</span>
                </button>

                {editingBooking.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => {
                      cancelBooking(editingBooking.id);
                      closeModal();
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 text-xs font-semibold transition-colors"
                  >
                    <Ban className="w-4 h-4" />
                    <span className="hidden sm:inline">Cancel</span>
                  </button>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 hover:text-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#ff3e00] hover:bg-[#e03700] text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#ff3e00]/20"
              >
                <Save className="w-4 h-4" />
                <span>{isEditing ? 'Save Changes' : 'Create Booking'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
