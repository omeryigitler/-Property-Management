import React from 'react';
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

export function BookingCell({ propertyId, dateStr, cellState, isHoveredRow, isHoveredCol, isHoveredCell }: BookingCellProps) {
  const openModal = useDashboardStore((state) => state.openModal);
  const setHoveredCell = useDashboardStore((state) => state.setHoveredCell);
  const showProvisionalBlock = useDashboardStore((state) => state.userPreferences.showProvisionalBlock);
  const { booking, isOccupied, isCheckIn, nightIndex } = cellState;

  const handleClick = () => {
    setHoveredCell(null);
    if (isOccupied && booking) openModal('booking_edit', { bookingId: booking.id });
    else openModal('booking_add', { prefilledPropertyId: propertyId, prefilledDate: dateStr });
  };

  let bgClass = 'bg-slate-950/40 hover:bg-slate-800/60';
  if (isHoveredCell) bgClass = 'bg-[#ff3e00]/20 ring-1 ring-[#ff3e00] z-10';
  else if (isHoveredRow || isHoveredCol) bgClass = 'bg-slate-800/40';

  if (!isOccupied || !booking) {
    return (
      <div onClick={handleClick} onMouseEnter={() => setHoveredCell({ propertyId, dateStr })} onMouseLeave={() => setHoveredCell(null)} role="button" tabIndex={0} className={`relative flex h-9 w-[190px] min-w-[160px] cursor-pointer items-center justify-center border-r border-b border-slate-800/70 sm:h-10 ${bgClass}`}>
        <span className="text-[10px] font-black uppercase text-[#ff3e00] opacity-0 hover:opacity-100">+ Book</span>
      </div>
    );
  }

  const occupiedNights = getBookingOccupiedNights(booking);
  const visibleMonthPrefix = dateStr.slice(0, 7);
  const firstVisibleDay = dateStr.endsWith('-01');
  const isSpanAnchor = isCheckIn || (firstVisibleDay && nightIndex > 1);
  if (!isSpanAnchor) {
    return <div onClick={handleClick} role="button" tabIndex={0} className="booking-span-continuation relative h-9 w-[190px] min-w-[160px] cursor-pointer border-r border-b border-slate-800/70 sm:h-10" />;
  }

  const visibleNights = occupiedNights.filter((night) => night.dateStr >= dateStr && night.dateStr.startsWith(visibleMonthPrefix));
  const totalCents = occupiedNights.reduce((sum, night) => sum + night.allocatedRevenueCents, 0);
  const channel = CHANNEL_CONFIG[booking.channel] || CHANNEL_CONFIG.airbnb;
  const stripe = booking.status === 'provisional' && showProvisionalBlock
    ? 'bg-[linear-gradient(45deg,rgba(0,0,0,0.3)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0.3)_75%,transparent_75%,transparent)] bg-[length:12px_12px]'
    : '';

  return (
    <div onClick={handleClick} onMouseEnter={() => setHoveredCell({ propertyId, dateStr })} onMouseLeave={() => setHoveredCell(null)} role="button" tabIndex={0} title={`${booking.guestName} · ${booking.checkInDate} → ${booking.checkOutDate} · ${formatCents(totalCents)}`} className="booking-span-anchor relative h-9 w-[190px] min-w-[160px] cursor-pointer border-r border-b border-slate-800/70 sm:h-10">
      <div className={`booking-span-card ${visibleNights.length <= 2 ? 'booking-span-card--compact' : ''} ${channel.colorClass} ${stripe}`} style={{ height: `calc(var(--calendar-booking-row-height) * ${Math.max(visibleNights.length, 1)})` }}>
        <div className="booking-summary-rail">
          <div className="booking-summary-vertical"><span className="booking-summary-name">{booking.guestName}</span><strong className="booking-summary-total">{formatCents(totalCents)}</strong></div>
          <span className={`booking-channel-badge ${channel.badgeClass}`}>{channel.name.slice(0, 3)}</span>
        </div>
        <div className="booking-night-list">
          {visibleNights.map((night) => <div key={night.dateStr} className="booking-night-row"><span className="booking-night-date">{Number(night.dateStr.slice(-2))}</span><span className="booking-night-rate">{formatCents(night.allocatedRevenueCents)}</span></div>)}
        </div>
      </div>
    </div>
  );
}
