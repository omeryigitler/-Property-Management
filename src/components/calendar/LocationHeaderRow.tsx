import React from 'react';
import { LOCATIONS, DAILY_TOTAL_COLUMN_CONFIG } from '../../config/locations';

export function LocationHeaderRow() {
  return (
    <div className="flex sticky top-0 z-30 select-none">
      {/* Top-left sticky intersection cell above day column */}
      <div className="sticky left-0 top-0 z-50 w-20 sm:w-24 min-w-[80px] sm:min-w-[96px] h-9 bg-slate-950 border-r border-b border-slate-700/80 flex items-center justify-center text-[10px] font-display font-black uppercase tracking-widest text-slate-300">
        DATE
      </div>

      {/* Location headers */}
      {LOCATIONS.map((loc) => {
        const propCount = loc.properties.length;
        return (
          <div
            key={loc.id}
            className={`flex items-center justify-center px-2 h-9 border-r border-b font-display font-black text-xs uppercase tracking-widest shadow-sm transition-colors ${loc.headerColorClass}`}
            style={{ width: `${propCount * 190}px`, minWidth: `${propCount * 160}px` }}
          >
            <span>{loc.name}</span>
          </div>
        );
      })}

      {/* Daily Total Column Location Header */}
      <div
        className={`flex items-center justify-center px-2 h-9 border-r border-b font-display font-black text-xs uppercase tracking-widest ${DAILY_TOTAL_COLUMN_CONFIG.headerColorClass}`}
        style={{ width: '120px', minWidth: '110px' }}
      >
        <span>TOTAL</span>
      </div>
    </div>
  );
}
