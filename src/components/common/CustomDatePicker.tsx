import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  getDaysInMonth,
  startOfMonth,
  getDay,
  isSameDay,
  isBefore,
  isAfter,
} from 'date-fns';
import { toDateString, parseDateString, formatReadableDate } from '../../utils/dateUtilities';

interface CustomDatePickerProps {
  id?: string;
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  minDate?: string;
  maxDate?: string;
  unavailableDates?: string[]; // Array of YYYY-MM-DD strings that are occupied
  rangeStart?: string; // If selecting range, start date
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function CustomDatePicker({
  id,
  label,
  value,
  onChange,
  minDate,
  maxDate,
  unavailableDates = [],
  rangeStart,
  placeholder = 'Select date',
  error,
  disabled = false,
  className = '',
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // View state for calendar modal
  const initialDate = value ? parseDateString(value) : new Date();
  const [viewDate, setViewDate] = useState<Date>(initialDate);

  useEffect(() => {
    if (value) {
      setViewDate(parseDateString(value));
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = () => setViewDate((d) => subMonths(d, 1));
  const handleNextMonth = () => setViewDate((d) => addMonths(d, 1));

  // Calendar matrix calculation
  const monthStart = startOfMonth(viewDate);
  const daysInMonth = getDaysInMonth(viewDate);
  const startDayOfWeek = getDay(monthStart); // 0 = Sun, 1 = Mon ...

  const daysGrid = [];
  // Padding for previous month days
  for (let i = 0; i < startDayOfWeek; i++) {
    daysGrid.push(null);
  }
  // Month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
    const dateStr = toDateString(dateObj);
    daysGrid.push({ dayNumber: d, dateObj, dateStr });
  }

  const selectedDateObj = value ? parseDateString(value) : null;
  const rangeStartObj = rangeStart ? parseDateString(rangeStart) : null;

  const handleSelectDay = (dateStr: string) => {
    if (disabled) return;
    onChange(dateStr);
    setIsOpen(false);
  };

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          {label}
        </label>
      )}

      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-900/50 border-slate-800 text-slate-500' : 'cursor-pointer bg-slate-900 border-slate-700/80 text-slate-100 hover:border-slate-600'
        } ${error ? 'border-rose-500 ring-1 ring-rose-500/40' : ''}`}
      >
        <div className="flex items-center gap-2 truncate">
          <Calendar className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span className={value ? 'text-slate-100 font-medium' : 'text-slate-400'}>
            {value ? formatReadableDate(value) : placeholder}
          </span>
        </div>
        {value && !disabled && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 top-[100%] left-0 mt-2 w-72 sm:w-80 p-3.5 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl text-slate-100 backdrop-blur-xl">
          {/* Calendar Header */}
          <div className="flex items-center justify-between gap-2 pb-3 mb-2 border-b border-slate-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-slate-100">
              {format(viewDate, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 mb-1">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysGrid.map((item, idx) => {
              if (!item) {
                return <div key={`empty-${idx}`} className="h-9 sm:h-10" />;
              }

              const { dayNumber, dateObj, dateStr } = item;

              const isSelected = selectedDateObj && isSameDay(dateObj, selectedDateObj);
              const isToday = isSameDay(dateObj, new Date());
              const isBooked = unavailableDates.includes(dateStr);

              let isDisabled = false;
              if (minDate && dateStr < minDate) isDisabled = true;
              if (maxDate && dateStr > maxDate) isDisabled = true;

              // Check if inside preview range
              let isInRange = false;
              if (rangeStartObj && selectedDateObj) {
                if (isAfter(dateObj, rangeStartObj) && isBefore(dateObj, selectedDateObj)) {
                  isInRange = true;
                }
              }

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(dateStr)}
                  className={`h-9 sm:h-10 w-full flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-all relative ${
                    isSelected
                      ? 'bg-cyan-600 text-white font-bold ring-2 ring-cyan-400 shadow-md scale-105 z-10'
                      : isInRange
                      ? 'bg-cyan-950/60 text-cyan-200 border border-cyan-800/60'
                      : isBooked
                      ? 'bg-rose-950/40 text-rose-300 border border-rose-900/60'
                      : isToday
                      ? 'bg-slate-800 text-cyan-300 border border-cyan-500/50 font-bold'
                      : isDisabled
                      ? 'opacity-30 cursor-not-allowed text-slate-600'
                      : 'hover:bg-slate-800/80 text-slate-200'
                  }`}
                >
                  <span>{dayNumber}</span>
                  {isBooked && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-rose-500 absolute bottom-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend / Info Footer */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span>Booked Date</span>
            </div>
            {rangeStart && (
              <span className="text-cyan-400 font-medium">Selecting Check-Out</span>
            )}
          </div>
        </div>
      )}

      {error && <span className="text-xs text-rose-400 font-medium">{error}</span>}
    </div>
  );
}
