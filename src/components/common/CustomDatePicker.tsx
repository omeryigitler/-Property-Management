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
  value: string;
  onChange: (dateStr: string) => void;
  minDate?: string;
  maxDate?: string;
  unavailableDates?: string[];
  rangeStart?: string;
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
  const initialDate = value ? parseDateString(value) : new Date();
  const [viewDate, setViewDate] = useState<Date>(initialDate);

  useEffect(() => {
    if (value) setViewDate(parseDateString(value));
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthStart = startOfMonth(viewDate);
  const daysInMonth = getDaysInMonth(viewDate);
  const startDayOfWeek = getDay(monthStart);
  const daysGrid: Array<null | { dayNumber: number; dateObj: Date; dateStr: string }> = [];

  for (let index = 0; index < startDayOfWeek; index += 1) daysGrid.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateObj = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    daysGrid.push({ dayNumber: day, dateObj, dateStr: toDateString(dateObj) });
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
        <label htmlFor={id} className="text-sm font-semibold text-[#4d4744]">
          {label}
        </label>
      )}

      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((previous) => !previous)}
        className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-4 focus:ring-[#ff5a5f]/10 ${
          disabled
            ? 'cursor-not-allowed border-[#e7e2df] bg-[#f5f2f0] text-[#aaa3a0] opacity-60'
            : 'cursor-pointer border-[#ded8d4] bg-white text-[#222222] hover:border-[#cfc6c1] focus:border-[#ff5a5f]'
        } ${error ? 'border-[#d9474d] ring-1 ring-[#d9474d]/20' : ''}`}
      >
        <div className="flex min-w-0 items-center gap-2 truncate">
          <Calendar className="h-4 w-4 flex-shrink-0 text-[#d9474d]" />
          <span className={value ? 'truncate font-medium text-[#222222]' : 'truncate text-[#8a817d]'}>
            {value ? formatReadableDate(value) : placeholder}
          </span>
        </div>
        {value && !disabled && (
          <span
            onClick={(event) => {
              event.stopPropagation();
              onChange('');
            }}
            className="rounded-lg p-1 text-[#8a817d] transition-colors hover:bg-[#f4efed] hover:text-[#222222]"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-[#ded8d4] bg-white p-3.5 text-[#222222] shadow-[0_18px_55px_rgba(45,32,28,0.18)] sm:w-80">
          <div className="mb-2 flex items-center justify-between gap-2 border-b border-[#eee8e5] pb-3">
            <button
              type="button"
              onClick={() => setViewDate((date) => subMonths(date, 1))}
              className="rounded-xl border border-[#e7e2df] bg-[#fffdfc] p-1.5 text-[#4f4f4f] transition-colors hover:bg-[#fff5f3]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-[#222222]">
              {format(viewDate, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setViewDate((date) => addMonths(date, 1))}
              className="rounded-xl border border-[#e7e2df] bg-[#fffdfc] p-1.5 text-[#4f4f4f] transition-colors hover:bg-[#fff5f3]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 text-center text-xs font-semibold text-[#8a817d]">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {daysGrid.map((item, index) => {
              if (!item) return <div key={`empty-${index}`} className="h-9 sm:h-10" />;

              const { dayNumber, dateObj, dateStr } = item;
              const isSelected = selectedDateObj && isSameDay(dateObj, selectedDateObj);
              const isToday = isSameDay(dateObj, new Date());
              const isBooked = unavailableDates.includes(dateStr);
              const isDisabled =
                Boolean(minDate && dateStr < minDate) || Boolean(maxDate && dateStr > maxDate);
              const isInRange = Boolean(
                rangeStartObj &&
                  selectedDateObj &&
                  isAfter(dateObj, rangeStartObj) &&
                  isBefore(dateObj, selectedDateObj)
              );

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(dateStr)}
                  className={`relative flex h-9 w-full flex-col items-center justify-center rounded-xl text-xs font-semibold transition-all sm:h-10 ${
                    isSelected
                      ? 'z-10 bg-[#ff5a5f] text-white shadow-[0_7px_16px_rgba(255,90,95,0.28)]'
                      : isInRange
                        ? 'border border-[#ffd1ce] bg-[#fff0ef] text-[#b13a40]'
                        : isBooked
                          ? 'border border-[#f2d2cf] bg-[#fff5f4] text-[#b13a40]'
                          : isToday
                            ? 'border border-[#ffb9b5] bg-[#fff8f7] text-[#c83f45]'
                            : isDisabled
                              ? 'cursor-not-allowed text-[#c8c1bd] opacity-55'
                              : 'text-[#4f4f4f] hover:bg-[#f8f6f5]'
                  }`}
                >
                  <span>{dayNumber}</span>
                  {isBooked && !isSelected && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#d9474d]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#eee8e5] pt-2.5 text-[11px] text-[#8a817d]">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[#d9474d]" />
              <span>Booked Date</span>
            </div>
            {rangeStart && <span className="font-semibold text-[#c83f45]">Selecting Check-Out</span>}
          </div>
        </div>
      )}

      {error && <span className="text-xs font-medium text-[#b13a40]">{error}</span>}
    </div>
  );
}
