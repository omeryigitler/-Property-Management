import React from 'react';
import { LOCATIONS, DAILY_TOTAL_COLUMN_CONFIG } from '../../config/locations';
import { getActiveProperties, usePropertyStore } from '../../store/usePropertyStore';

const PROPERTY_COLUMN_WIDTH = 190;

export function LocationHeaderRow() {
  const properties = usePropertyStore((state) => state.properties);
  const activeProperties = getActiveProperties(properties);

  return (
    <div className="sticky top-0 z-30 flex w-max min-w-full select-none shadow-[0_3px_12px_rgba(48,38,34,0.08)]">
      <div className="dashboard-day-column sticky left-0 top-0 z-50 flex h-10 items-center justify-center border-r border-b border-[#ded7d2] bg-white text-[11px] font-extrabold uppercase tracking-[0.05em] text-[#514b48]">
        Date
      </div>

      {LOCATIONS.map((location) => {
        const propertyCount = activeProperties.filter(
          (property) => property.locationId === location.id
        ).length;
        if (propertyCount === 0) return null;

        const groupWidth = propertyCount * PROPERTY_COLUMN_WIDTH;
        return (
          <div
            key={location.id}
            className={`flex h-10 flex-none items-center justify-center border-r border-b px-3 text-[13px] font-extrabold uppercase tracking-[0.045em] ${location.headerColorClass}`}
            style={{ width: groupWidth, minWidth: groupWidth }}
          >
            <span className="truncate">{location.name}</span>
          </div>
        );
      })}

      <div
        className={`dashboard-total-column flex h-10 items-center justify-center border-r border-b px-2 text-[12px] font-extrabold uppercase tracking-[0.04em] ${DAILY_TOTAL_COLUMN_CONFIG.headerColorClass}`}
      >
        <span>Total</span>
      </div>
    </div>
  );
}
