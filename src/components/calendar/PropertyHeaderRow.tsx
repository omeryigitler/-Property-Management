import React from 'react';
import { LOCATIONS, DAILY_TOTAL_COLUMN_CONFIG } from '../../config/locations';
import { getActiveProperties, usePropertyStore } from '../../store/usePropertyStore';

export function PropertyHeaderRow() {
  const properties = usePropertyStore((state) => state.properties);
  const activeProperties = getActiveProperties(properties);

  return (
    <div className="sticky top-10 z-20 flex select-none">
      <div className="sticky left-0 top-10 z-40 flex h-11 w-20 min-w-[80px] items-center justify-center border-r border-b border-[#e3dcd8] bg-[#faf8f6] text-[10px] font-extrabold uppercase tracking-[0.04em] text-[#6a625e] sm:w-24 sm:min-w-[96px]">
        Property →
      </div>

      {activeProperties.map((property, index) => {
        const parentLocation = LOCATIONS.find(
          (location) => location.id === property.locationId
        );

        return (
          <div
            key={property.id}
            className={`flex h-11 w-[190px] min-w-[160px] items-center gap-2 border-r border-b border-[#e3dcd8] bg-white px-3 text-xs ${parentLocation?.borderClass ?? ''}`}
          >
            <span className="w-6 flex-shrink-0 text-[10px] font-extrabold tabular-nums text-[#c73e44]">
              {String(index + 1).padStart(2, '0')}.
            </span>
            <span className="truncate text-[12px] font-extrabold tracking-[-0.01em] text-[#2c2826]">
              {property.name}
            </span>
          </div>
        );
      })}

      <div className="flex h-11 w-[120px] min-w-[110px] items-center justify-center border-r border-b border-[#e4d29e] bg-[#fff8e5] px-2.5 text-[11px] font-extrabold uppercase tracking-[0.035em] text-[#72560d]">
        {DAILY_TOTAL_COLUMN_CONFIG.name}
      </div>
    </div>
  );
}
