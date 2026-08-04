import React from 'react';
import { LOCATIONS, DAILY_TOTAL_COLUMN_CONFIG } from '../../config/locations';
import { getActiveProperties, usePropertyStore } from '../../store/usePropertyStore';

const PROPERTY_COLUMN_WIDTH = 190;

export function LocationHeaderRow() {
  const properties = usePropertyStore((state) => state.properties);
  const activeProperties = getActiveProperties(properties);

  return (
    <div className="flex w-max min-w-full sticky top-0 z-30 select-none">
      <div className="dashboard-day-column sticky left-0 top-0 z-50 h-9 bg-slate-950 border-r border-b border-slate-700/80 flex items-center justify-center text-[10px] font-display font-black uppercase tracking-widest text-slate-300">
        DATE
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
            className={`flex-none flex items-center justify-center px-2 h-9 border-r border-b font-display font-black text-xs uppercase tracking-widest shadow-sm transition-colors ${location.headerColorClass}`}
            style={{ width: groupWidth, minWidth: groupWidth }}
          >
            <span>{location.name}</span>
          </div>
        );
      })}

      <div className={`dashboard-total-column flex items-center justify-center px-2 h-9 border-r border-b font-display font-black text-xs uppercase tracking-widest ${DAILY_TOTAL_COLUMN_CONFIG.headerColorClass}`}>
        <span>TOTAL</span>
      </div>
    </div>
  );
}
