import {
  format,
  parseISO,
  getDaysInMonth,
  isLeapYear,
  isWeekend,
  isToday as isTodayFns,
  addDays,
  differenceInCalendarDays,
  isValid,
} from 'date-fns';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Formats a JS Date to YYYY-MM-DD string
 */
export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parses YYYY-MM-DD string safely into JS Date
 */
export function parseDateString(dateStr: string): Date {
  const parsed = parseISO(dateStr);
  if (!isValid(parsed)) return new Date();
  return parsed;
}

/**
 * Returns array of days for a given year and month (1-indexed month 1..12)
 */
export function getDaysForMonth(year: number, month: number): { dayNumber: number; dateStr: string; date: Date; weekday: string; isWeekend: boolean; isToday: boolean }[] {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1));
  const result = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dateStr = toDateString(date);
    result.push({
      dayNumber: d,
      dateStr,
      date,
      weekday: format(date, 'EEE'),
      isWeekend: isWeekend(date),
      isToday: isTodayFns(date),
    });
  }

  return result;
}

/**
 * Difference in days between two YYYY-MM-DD strings
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const inDate = parseDateString(checkIn);
  const outDate = parseDateString(checkOut);
  const diff = differenceInCalendarDays(outDate, inDate);
  return diff > 0 ? diff : 0;
}

/**
 * Checks if year is a leap year
 */
export { isLeapYear };

/**
 * Formats YYYY-MM-DD to readable format like "10 Aug 2026"
 */
export function formatReadableDate(dateStr: string): string {
  if (!dateStr) return '';
  const parsed = parseDateString(dateStr);
  return format(parsed, 'd MMM yyyy');
}

/**
 * Checks if a specific date string falls within a specific year & month
 */
export function isDateInMonth(dateStr: string, year: number, month: number): boolean {
  const d = parseDateString(dateStr);
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}
