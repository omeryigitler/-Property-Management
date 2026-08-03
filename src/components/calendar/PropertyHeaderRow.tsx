import React from 'react';
import { ALL_PROPERTIES, LOCATIONS, DAILY_TOTAL_COLUMN_CONFIG } from '../../config/locations';

export function PropertyHeaderRow() {
  return (
    <div className="flex sticky top-9 z-20 select-none">
      {/* Top-left sticky intersection cell */}
      <div className="sticky left-0 top-9 z-40 w-20 sm:w-24 min-w-[80px] sm:min-w-[96px] h-10 bg-slate-900 border-r border-b border-slate-700/80 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-400">
        PROPERTY →
      </div>

      {/* Individual Property Columns */}
      {ALL_PROPERTIES.map((prop, idx) => {
        const parentLoc = LOCATIONS.find((loc) => loc.properties.some((p) => p.id === prop.id));
        return (
          <div
            key={prop.id}
            className={`w-[190px] min-w-[160px] h-10 px-2.5 bg-slate-900/95 border-r border-b border-slate-700/80 flex items-center justify-between gap-1.5 text-slate-100 font-extrabold text-xs truncate ${parentLoc?.borderClass}`}
          >
            <span className="text-[10px] font-mono font-black text-[#ff3e00] w-4 flex-shrink-0">
              {String(idx + 1).padStart(2, '0')}.
            </span>
            <span className="truncate text-slate-100 font-bold tracking-tight">{prop.name}</span>
          </div>
        );
      })}

      {/* Daily Total Column Header */}
      <div className="w-[120px] min-w-[110px] h-10 px-2.5 bg-yellow-950/90 border-r border-b border-yellow-700/80 flex items-center justify-center text-yellow-300 font-display font-black text-xs tracking-wider uppercase">
        {DAILY_TOTAL_COLUMN_CONFIG.name}
      </div>
    </div>
  );
}
