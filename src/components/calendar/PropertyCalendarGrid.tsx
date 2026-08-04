import React, { useEffect, useRef, useState } from 'react';
import { useDashboardStore } from '../../store/useDashboardStore';
import { getActiveProperties, usePropertyStore } from '../../store/usePropertyStore';
import { getDaysForMonth } from '../../utils/dateUtilities';
import { calculateDailyTotalRevenue, getCellBookingState } from '../../utils/bookingCalculations';

import { LocationHeaderRow } from './LocationHeaderRow';
import { PropertyHeaderRow } from './PropertyHeaderRow';
import { DayColumn } from './DayColumn';
import { BookingCell } from './BookingCell';
import { DailyTotalColumn } from './DailyTotalColumn';
import { MobileCalendarView } from './MobileCalendarView';

interface PropertyCalendarGridProps {
  children?: React.ReactNode;
}

export function PropertyCalendarGrid({ children }: PropertyCalendarGridProps) {
  const selectedMonth = useDashboardStore((state) => state.selectedMonth);
  const selectedYear = useDashboardStore((state) => state.selectedYear);
  const bookings = useDashboardStore((state) => state.bookings);
  const hoveredCell = useDashboardStore((state) => state.hoveredCell);
  const openModal = useDashboardStore((state) => state.openModal);
  const properties = usePropertyStore((state) => state.properties);
  const activeProperties = getActiveProperties(properties);

  const daysGrid = getDaysForMonth(selectedYear, selectedMonth);
  const [focusedIndex, setFocusedIndex] = useState<{ dayIdx: number; propIdx: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!focusedIndex) return;
      if (useDashboardStore.getState().activeModal !== null) return;

      const { dayIdx, propIdx } = focusedIndex;
      const totalDays = daysGrid.length;
      const totalProperties = activeProperties.length;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setFocusedIndex({ dayIdx: Math.min(totalDays - 1, dayIdx + 1), propIdx });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusedIndex({ dayIdx: Math.max(0, dayIdx - 1), propIdx });
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setFocusedIndex({ dayIdx, propIdx: Math.min(totalProperties - 1, propIdx + 1) });
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setFocusedIndex({ dayIdx, propIdx: Math.max(0, propIdx - 1) });
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const targetDay = daysGrid[dayIdx];
        const targetProperty = activeProperties[propIdx];
        if (!targetDay || !targetProperty) return;

        const cellState = getCellBookingState(targetProperty.id, targetDay.dateStr, bookings);
        if (cellState.isOccupied && cellState.booking) {
          openModal('booking_edit', { bookingId: cellState.booking.id });
        } else {
          openModal('booking_add', {
            prefilledPropertyId: targetProperty.id,
            prefilledDate: targetDay.dateStr,
          });
        }
      } else if (event.key === 'Escape') {
        setFocusedIndex(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, daysGrid, bookings, openModal, activeProperties]);

  return (
    <div className="relative flex w-full flex-1 min-h-0 flex-col bg-slate-950">
      <MobileCalendarView />

      <div className="hidden h-full min-h-0 flex-col md:flex">
        <div
          ref={containerRef}
          className="relative w-full flex-1 overflow-auto custom-scrollbar touch-pan-x touch-pan-y"
          tabIndex={0}
        >
          <div className="inline-block min-w-full align-top pb-6">
            <LocationHeaderRow />
            <PropertyHeaderRow />

            {daysGrid.map((dayItem, dayIndex) => {
              const isHoveredRow =
                hoveredCell?.dateStr === dayItem.dateStr || focusedIndex?.dayIdx === dayIndex;
              const activePropertyIds = new Set(activeProperties.map((property) => property.id));
              const dailyTotalCents = calculateDailyTotalRevenue(
                dayItem.dateStr,
                bookings.filter((booking) => activePropertyIds.has(booking.propertyId))
              );

              return (
                <div
                  key={dayItem.dateStr}
                  className={`flex items-center transition-colors ${
                    dayItem.isWeekend ? 'bg-slate-900/20' : ''
                  }`}
                >
                  <DayColumn
                    dayNumber={dayItem.dayNumber}
                    dateStr={dayItem.dateStr}
                    weekday={dayItem.weekday}
                    isWeekend={dayItem.isWeekend}
                    isToday={dayItem.isToday}
                    isHoveredRow={isHoveredRow}
                  />

                  {activeProperties.map((property, propertyIndex) => {
                    const cellState = getCellBookingState(property.id, dayItem.dateStr, bookings);
                    const isHoveredCol =
                      hoveredCell?.propertyId === property.id || focusedIndex?.propIdx === propertyIndex;
                    const isHoveredCell =
                      (hoveredCell?.propertyId === property.id &&
                        hoveredCell?.dateStr === dayItem.dateStr) ||
                      (focusedIndex?.dayIdx === dayIndex &&
                        focusedIndex?.propIdx === propertyIndex);

                    return (
                      <div
                        key={`${property.id}-${dayItem.dateStr}`}
                        onClick={() => setFocusedIndex({ dayIdx: dayIndex, propIdx: propertyIndex })}
                      >
                        <BookingCell
                          propertyId={property.id}
                          dateStr={dayItem.dateStr}
                          cellState={cellState}
                          isHoveredRow={isHoveredRow}
                          isHoveredCol={isHoveredCol}
                          isHoveredCell={isHoveredCell}
                        />
                      </div>
                    );
                  })}

                  <DailyTotalColumn
                    dailyTotalCents={dailyTotalCents}
                    isHoveredRow={isHoveredRow}
                  />
                </div>
              );
            })}

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
