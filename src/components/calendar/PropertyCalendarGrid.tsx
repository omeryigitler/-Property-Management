import React, { useEffect, useRef, useState } from 'react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { ALL_PROPERTIES } from '../../config/locations';
import { getDaysForMonth } from '../../utils/dateUtilities';
import { calculateDailyTotalRevenue, getCellBookingState } from '../../utils/bookingCalculations';

import { LocationHeaderRow } from './LocationHeaderRow';
import { PropertyHeaderRow } from './PropertyHeaderRow';
import { DayColumn } from './DayColumn';
import { BookingCell } from './BookingCell';
import { DailyTotalColumn } from './DailyTotalColumn';

interface PropertyCalendarGridProps {
  children?: React.ReactNode; // FinancialGrid rendered at bottom of grid scroll container
}

export function PropertyCalendarGrid({ children }: PropertyCalendarGridProps) {
  const selectedMonth = useDashboardStore((s) => s.selectedMonth);
  const selectedYear = useDashboardStore((s) => s.selectedYear);
  const bookings = useDashboardStore((s) => s.bookings);
  const hoveredCell = useDashboardStore((s) => s.hoveredCell);
  const openModal = useDashboardStore((s) => s.openModal);

  const daysGrid = getDaysForMonth(selectedYear, selectedMonth);

  // Keyboard navigation state
  const [focusedIndex, setFocusedIndex] = useState<{ dayIdx: number; propIdx: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Handle keyboard arrow navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!focusedIndex) return;

      const activeModal = useDashboardStore.getState().activeModal;
      if (activeModal !== null) return; // Modal open, don't hijack keys

      const { dayIdx, propIdx } = focusedIndex;
      const totalDays = daysGrid.length;
      const totalProps = ALL_PROPERTIES.length;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex({ dayIdx: Math.min(totalDays - 1, dayIdx + 1), propIdx });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex({ dayIdx: Math.max(0, dayIdx - 1), propIdx });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedIndex({ dayIdx, propIdx: Math.min(totalProps - 1, propIdx + 1) });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedIndex({ dayIdx, propIdx: Math.max(0, propIdx - 1) });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const targetDay = daysGrid[dayIdx];
        const targetProp = ALL_PROPERTIES[propIdx];
        if (targetDay && targetProp) {
          const cellState = getCellBookingState(targetProp.id, targetDay.dateStr, bookings);
          if (cellState.isOccupied && cellState.booking) {
            openModal('booking_edit', { bookingId: cellState.booking.id });
          } else {
            openModal('booking_add', { prefilledPropertyId: targetProp.id, prefilledDate: targetDay.dateStr });
          }
        }
      } else if (e.key === 'Escape') {
        setFocusedIndex(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, daysGrid, bookings, openModal]);

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-slate-950">
      {/* Main Coordinated Scroll Area */}
      <div
        ref={containerRef}
        className="w-full flex-1 overflow-auto custom-scrollbar relative touch-pan-x touch-pan-y"
        tabIndex={0}
      >
        <div className="inline-block min-w-full align-top pb-6">
          {/* Sticky Header Rows */}
          <LocationHeaderRow />
          <PropertyHeaderRow />

          {/* Calendar Rows */}
          {daysGrid.map((dayItem, dayIdx) => {
            const isHoveredRow = hoveredCell?.dateStr === dayItem.dateStr || focusedIndex?.dayIdx === dayIdx;
            const dailyTotalCents = calculateDailyTotalRevenue(dayItem.dateStr, bookings);

            return (
              <div
                key={dayItem.dateStr}
                className={`flex items-center transition-colors ${
                  dayItem.isWeekend ? 'bg-slate-900/20' : ''
                }`}
              >
                {/* Left Day Column */}
                <DayColumn
                  dayNumber={dayItem.dayNumber}
                  dateStr={dayItem.dateStr}
                  weekday={dayItem.weekday}
                  isWeekend={dayItem.isWeekend}
                  isToday={dayItem.isToday}
                  isHoveredRow={isHoveredRow}
                />

                {/* Property Columns */}
                {ALL_PROPERTIES.map((prop, propIdx) => {
                  const cellState = getCellBookingState(prop.id, dayItem.dateStr, bookings);
                  const isHoveredCol = hoveredCell?.propertyId === prop.id || focusedIndex?.propIdx === propIdx;
                  const isHoveredCell =
                    (hoveredCell?.propertyId === prop.id && hoveredCell?.dateStr === dayItem.dateStr) ||
                    (focusedIndex?.dayIdx === dayIdx && focusedIndex?.propIdx === propIdx);

                  return (
                    <div
                      key={`${prop.id}-${dayItem.dateStr}`}
                      onClick={() => setFocusedIndex({ dayIdx, propIdx })}
                    >
                      <BookingCell
                        propertyId={prop.id}
                        dateStr={dayItem.dateStr}
                        cellState={cellState}
                        isHoveredRow={isHoveredRow}
                        isHoveredCol={isHoveredCol}
                        isHoveredCell={isHoveredCell}
                      />
                    </div>
                  );
                })}

                {/* Far-Right Daily Total Column */}
                <DailyTotalColumn dailyTotalCents={dailyTotalCents} isHoveredRow={isHoveredRow} />
              </div>
            );
          })}

          {/* Financial Ledger Section Aligned With Grid Columns */}
          {children}
        </div>
      </div>
    </div>
  );
}
