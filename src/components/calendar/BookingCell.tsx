import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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

interface TooltipPosition {
  left: number;
  top: number;
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
  const activeModal = useDashboardStore((s) => s.activeModal);
  const setHoveredCell = useDashboardStore((s) => s.setHoveredCell);
  const showProvisionalBlock = useDashboardStore((s) => s.userPreferences.showProvisionalBlock);

  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);

  const { booking, isOccupied, isCheckIn, nightIndex, totalNights } = cellState;

  let bgClass = 'bg-slate-950/40 hover:bg-slate-800/60';
  if (isHoveredCell) {
    bgClass = 'bg-[#ff3e00]/20 ring-1 ring-[#ff3e00] z-10';
  } else if (isHoveredRow || isHoveredCol) {
    bgClass = 'bg-slate-800/40';
  }

  const hideBookingTooltip = () => {
    setShowTooltip(false);
    setTooltipPosition(null);
  };

  const canShowHoverTooltip = () =>
    typeof window !== 'undefined' &&
    window.innerWidth >= 768 &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    activeModal === null;

  const handleClick = () => {
    hideBookingTooltip();
    setHoveredCell(null);

    if (isOccupied && booking) {
      openModal('booking_edit', { bookingId: booking.id });
    } else {
      openModal('booking_add', { prefilledPropertyId: propertyId, prefilledDate: dateStr });
    }
  };

  const showBookingTooltip = (element: HTMLElement) => {
    if (!canShowHoverTooltip()) {
      hideBookingTooltip();
      return;
    }

    const bookingCard = element.querySelector<HTMLElement>('.booking-span-card');
    const rect = bookingCard?.getBoundingClientRect() ?? element.getBoundingClientRect();
    const tooltipWidth = 240;
    const viewportPadding = 8;
    const centeredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const maximumLeft = Math.max(viewportPadding, window.innerWidth - tooltipWidth - viewportPadding);

    setTooltipPosition({
      left: Math.min(Math.max(viewportPadding, centeredLeft), maximumLeft),
      top: rect.bottom + viewportPadding,
    });
    setShowTooltip(true);
  };

  useEffect(() => {
    if (activeModal !== null) {
      hideBookingTooltip();
      setHoveredCell(null);
    }
  }, [activeModal, setHoveredCell]);

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

  const tooltip =
    showTooltip && tooltipPosition && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="booking-span-tooltip fixed z-[1000] w-60 rounded-xl border border-slate-700/90 bg-slate-950 p-3 text-xs text-slate-100 shadow-2xl pointer-events-none animate-fade-in backdrop-blur-md"
            style={{
              left: tooltipPosition.left,
              top: tooltipPosition.top,
            }}
          >
            <div className="mb-1.5 flex items-center justify-between border-b border-slate-800 pb-1.5 font-extrabold">
              <span className="font-display font-black uppercase tracking-wider text-[#ff3e00]">
                {booking.guestName}
              </span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${channelCfg.badgeClass}`}>
                {channelCfg.name}
              </span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-300">
              <div>
                Dates:{' '}
                <strong className="text-slate-100">
                  {booking.checkInDate} → {booking.checkOutDate}
                </strong>
              </div>
              <div>
                Nightly Rate:{' '}
                <strong className="font-mono font-bold text-emerald-400">
                  {formatCents(booking.nightlyRateCents)}
                </strong>
              </div>
              <div>
                Accommodation Total:{' '}
                <strong className="font-mono font-bold text-cyan-300">
                  {formatCents(accommodationTotalCents)}
                </strong>
              </div>
              <div>
                Status: <strong className="uppercase text-slate-200">{booking.status}</strong>
              </div>
              {booking.bookingRef && <div>Ref: {booking.bookingRef}</div>}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        onClick={handleClick}
        onMouseEnter={(event) => {
          setHoveredCell({ propertyId, dateStr });
          showBookingTooltip(event.currentTarget);
        }}
        onMouseLeave={() => {
          setHoveredCell(null);
          hideBookingTooltip();
        }}
        onFocus={(event) => showBookingTooltip(event.currentTarget)}
        onBlur={hideBookingTooltip}
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
      </div>
      {tooltip}
    </>
  );
}