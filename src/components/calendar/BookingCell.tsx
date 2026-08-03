import React, { useState } from 'react';
import { CHANNEL_CONFIG } from '../../config/locations';
import { Booking } from '../../types';
import { CellBookingState } from '../../utils/bookingCalculations';
import { formatCents } from '../../utils/currency';
import { useDashboardStore } from '../../store/useDashboardStore';

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

  const { booking, isOccupied, isCheckIn, isCheckOut, nightIndex, totalNights } = cellState;

  // Background state for empty cells
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
        aria-label={`Empty cell for property ${propertyId} on date ${dateStr}`}
        className={`w-[190px] min-w-[160px] h-9 sm:h-10 border-r border-b border-slate-800/70 cursor-pointer transition-colors relative flex items-center justify-center group ${bgClass}`}
      >
        {isCheckOut && (
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider opacity-70">
            Out / Avail
          </span>
        )}
        <span className="hidden group-hover:inline-block text-[11px] text-[#ff3e00] font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
          + Book
        </span>
      </div>
    );
  }

  // Booked Cell Styling
  const channelCfg = CHANNEL_CONFIG[booking.channel] || CHANNEL_CONFIG.airbnb;
  const isProvisional = booking.status === 'provisional';

  const stripeStyle =
    isProvisional && showProvisionalBlock
      ? 'bg-[linear-gradient(45deg,rgba(0,0,0,0.3)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0.3)_75%,transparent_75%,transparent)] bg-[length:12px_12px]'
      : '';

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
      aria-label={`Booking for ${booking.guestName}, night ${nightIndex} of ${totalNights}`}
      className={`w-[190px] min-w-[160px] h-9 sm:h-10 border-r border-b border-slate-800/70 px-2 cursor-pointer relative flex items-center transition-all ${channelCfg.colorClass} ${stripeStyle}`}
    >
      {/* Night Indicator Bar on left edge */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${
          isCheckIn ? 'bg-[#ff3e00]' : 'bg-slate-600/50'
        }`}
      />

      {/* Content */}
      <div className="flex items-center justify-between w-full pl-1 truncate text-xs">
        {isCheckIn ? (
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-black truncate text-white uppercase tracking-tight">{booking.guestName}</span>
            <span className="px-1 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-black/50 text-slate-100">
              {channelCfg.name.slice(0, 3)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[11px] text-slate-200/90 font-bold truncate">
            <span>↳ {booking.guestName}</span>
          </div>
        )}

        <div className="flex items-center gap-1 flex-shrink-0 ml-1 text-[10px] font-mono font-bold opacity-90">
          <span>{nightIndex}/{totalNights}</span>
        </div>
      </div>

      {/* Detailed Tooltip on Hover */}
      {showTooltip && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-60 p-3 bg-slate-950 border border-slate-700/90 rounded-xl shadow-2xl text-xs text-slate-100 pointer-events-none animate-fade-in backdrop-blur-md">
          <div className="flex items-center justify-between font-extrabold border-b border-slate-800 pb-1.5 mb-1.5">
            <span className="text-[#ff3e00] uppercase font-display font-black tracking-wider">{booking.guestName}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${channelCfg.badgeClass}`}>
              {channelCfg.name}
            </span>
          </div>
          <div className="space-y-1 text-slate-300 text-[11px]">
            <div>Dates: <strong className="text-slate-100">{booking.checkInDate} → {booking.checkOutDate}</strong></div>
            <div>Nightly Rate: <strong className="text-emerald-400 font-mono font-bold">{formatCents(booking.nightlyRateCents)}</strong></div>
            <div>Night Position: <strong>Night {nightIndex} of {totalNights}</strong></div>
            <div>Status: <strong className="uppercase text-slate-200">{booking.status}</strong></div>
            {booking.bookingRef && <div>Ref: {booking.bookingRef}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
