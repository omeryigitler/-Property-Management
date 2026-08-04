import React from 'react';
import { LOCATIONS, DAILY_TOTAL_COLUMN_CONFIG } from '../../config/locations';
import { getActiveProperties, usePropertyStore } from '../../store/usePropertyStore';

export function PropertyHeaderRow() {
  const properties = usePropertyStore((state) => state.properties);
  const activeProperties = getActiveProperties(properties);

  return (
    <div className="flex sticky top-9 z-20 select-none">
      <div className="sticky left-0 top-9 z-40 w-20 sm:w-24 min-w-[80px] sm:min-w-[96px] h-10 bg-slate-900 border-r border-b border-slate-700/80 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-400">
        PROPERTY →
      </div>

      {activeProperties.map((property, index) => {
        const parentLocation = LOCATIONS.find(
          (location) => location.id === property.locationId
        );

        return (
          <div
            key={property.id}
            className={`w-[190px] min-w-[160px] h-10 px-2.5 bg-slate-900/95 border-r border-b border-slate-700/80 flex items-center justify-between gap-1.5 text-slate-100 font-extrabold text-xs truncate ${parentLocation?.borderClass ?? ''}`}
          >
            <span className="text-[10px] font-mono font-black text-[#ff3e00] w-4 flex-shrink-0">
              {String(index + 1).padStart(2, '0')}.
            </span>
            <span className="truncate text-slate-100 font-bold tracking-tight">
              {property.name}
            </span>
          </div>
        );
      })}

      <div className="w-[120px] min-w-[110px] h-10 px-2.5 bg-yellow-950/90 border-r border-b border-yellow-700/80 flex items-center justify-center text-yellow-300 font-display font-black text-xs tracking-wider uppercase">
        {DAILY_TOTAL_COLUMN_CONFIG.name}
      </div>
    </div>
  );
}
