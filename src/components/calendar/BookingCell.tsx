import React, { useState } from 'react';
import { CHANNEL_CONFIG } from '../../config/locations';
import { CellBookingState, getBookingOccupiedNights } from '../../utils/bookingCalculations';
import { formatCents } from '../../utils/currency';
import { useDashboardStore } from '../../store/useDashboardStore';
import './booking-span.css';

interface BookingCellProps {
  propertyId: string;
  dateStr: string;
  cellState: CellBookingState;
  isHoveredRow: boolean;
  isHoveredCol: boolean;
  isHoveredCell: boolean;
}

export function BookingCell({
  propertyId,
  dateStr,
  cellState,
  isHoveredRow,
  isHoveredCol,
  isHoveredCell,
}: BookingCellProps) {
  const openModal = useDashboardStore((s) => s.openModal);
  const setHoveredCell = useDashboardStore((s) => s.setHoveredCell);
  const showProvisionalBlock = useDashboardStore((s) => s.userPreferences.showProvisionalBlock);

  const [showTooltip, setShowTooltip] = useState(false);

  const { booking, isOccupied, isCheckIn, nightIndex, totalNights } = cellState;

  let bgClass = 'bg-slate-950/40 hover:bg-slate-800/60';
  if (isHoveredCell) {
    bgClass = 'bg-[#ff3e00]/20 ring-1 ring-[#ff3e00] z-10';
  } else if (isHoveredRow || isHoveredCol) {
    bgClass = 'bg-slate-800/40';
  }

  const handleClick = () => {
    if (isOccupied && booking) {
      openModal('booking_edit', { bookingId: booking.id });
    } else {
      openModal('booking_add', { prefilledPropertyId: propertyId, prefilledDate: dateStr });
    }
  };

  if (!isOccupied || !booking) {
    return (
      <div
        onClick={handleClick}
        onMouseEnter={() => setHoveredCell({ propertyId, dateStr })}
        onMouseLeave={() => setHoveredCell(null)}
        tabIndex={0}
        role="button"
        aria-label={`Available cell for property ${propertyId} on date ${dateStr}`}
        className={`w-[190px] min-w-[160px] h-9 sm:h-10 border-r border-b border-slate-800/70 cursor-pointer transition-colors relative flex items-center justify-center group ${bgClass}`}
      >
        <span className="hidden group-hover:inline-block text-[11px] text-[#ff3e00] font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
          + Book
        </span>
      </div>
    );
  }

  const channelCfg = CHANNEL_CONFIG[booking.channel] || CHANNEL_CONFIG.airbnb;
  const isProvisional = booking.status === 'provisional';
  const stripeStyle =
    isProvisional && showProvisionalBlock
      ? 'bg-[linear-gradient(45deg,rgba(0,0,0,0.3)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0.3)_75%,transparent_75%,transparent)] bg-[length:12px_12px]'
      : '';

  const occupiedNights = getBookingOccupiedNights(booking);
  const visibleMonthPrefix = dateStr.slice(0, 7);
  const isFirstVisibleDayOfMonth = dateStr.endsWith('-01');
  const isSpanAnchor = isCheckIn || (isFirstVisibleDayOfMonth && nightIndex > 1);
  const visibleNights = occupiedNights.filter(
    (night) => night.dateStr >= dateStr && night.dateStr.startsWith(visibleMonthPrefix)
  );

  const accommodationForNight = (night: (typeof occupiedNights)[number]) =>
    Math.max(
      0,
      night.allocatedRevenueCents - (night.nightIndex === 1 ? booking.cleaningFeeCents || 0 : 0)
    );

  const accommodationTotalCents = occupiedNights.reduce(
    (total, night) => total + accommodationForNight(night),
    0
  );

  if (!isSpanAnchor) {
    return (
      <div
        onClick={handleClick}
        onMouseEnter={() => setHoveredCell({ propertyId, dateStr })}
        onMouseLeave={() => setHoveredCell(null)}
        tabIndex={0}
        role="button"
        aria-label={`Booking for ${booking.guestName}, night ${nightIndex} of ${totalNights}`}
        className="booking-span-continuation w-[190px] min-w-[160px] h-9 sm:h-10 border-r border-b border-slate-800/70 cursor-pointer relative"
      />
    );
  }

  const spanHeight = `calc(var(--calendar-booking-row-height) * ${Math.max(visibleNights.length, 1)})`;
  const compactClass = visibleNights.length <= 2 ? 'booking-span-card--compact' : '';

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => {
        setHoveredCell({ propertyId, dateStr });
        setShowTooltip(true);
      }}
      onMouseLeave={() => {
        setHoveredCell(null);
        setShowTooltip(false);
      }}
      tabIndex={0}
      role="button"
      aria-label={`Booking for ${booking.guestName}, ${totalNights} nights, ${formatCents(accommodationTotalCents)}`}
      className="booking-span-anchor w-[190px] min-w-[160px] h-9 sm:h-10 border-r border-b border-slate-800/70 cursor-pointer relative"
    >
      <div
        className={`booking-span-card ${compactClass} ${channelCfg.colorClass} ${stripeStyle}`}
        style={{ height: spanHeight }}
      >
        <div className="booking-summary-rail">
          <div className="booking-summary-vertical">
            <span className="booking-summary-name">{booking.guestName}</span>
            <strong className="booking-summary-total">{formatCents(accommodationTotalCents)}</strong>
          </div>
          <span className={`booking-channel-badge ${channelCfg.badgeClass}`}>
            {channelCfg.name.slice(0, 3)}
          </span>
        </div>

        <div className="booking-night-list">
          {visibleNights.map((night) => (
            <div key={night.dateStr} className="booking-night-row">
              <span className="booking-night-date">{Number(night.dateStr.slice(-2))}</span>
              <span className="booking-night-rate">{formatCents(accommodationForNight(night))}</span>
            </div>
          ))}
        </div>
      </div>

      {showTooltip && (
        <div className="booking-span-tooltip absolute z-[80] left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-60 p-3 bg-slate-950 border border-slate-700/90 rounded-xl shadow-2xl text-xs text-slate-100 pointer-events-none animate-fade-in backdrop-blur-md">
          <div className="flex items-center justify-between font-extrabold border-b border-slate-800 pb-1.5 mb-1.5">
            <span className="text-[#ff3e00] uppercase font-display font-black tracking-wider">{booking.guestName}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${channelCfg.badgeClass}`}>
              {channelCfg.name}
            </span>
          </div>
          <div className="space-y-1 text-slate-300 text-[11px]">
            <div>Dates: <strong className="text-slate-100">{booking.checkInDate} → {booking.checkOutDate}</strong></div>
            <div>Nightly Rate: <strong className="text-emerald-400 font-mono font-bold">{formatCents(booking.nightlyRateCents)}</strong></div>
            <div>Accommodation Total: <strong className="text-cyan-300 font-mono font-bold">{formatCents(accommodationTotalCents)}</strong></div>
            <div>Status: <strong className="uppercase text-slate-200">{booking.status}</strong></div>
            {booking.bookingRef && <div>Ref: {booking.bookingRef}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
