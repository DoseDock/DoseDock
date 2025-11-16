import { DateTime } from 'luxon';

/**
 * Parse a "HH:mm" time string into a DateTime in the current zone
 */
export function parseTimeString(timeStr: string, date?: DateTime): DateTime {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const baseDate = date || DateTime.now();
  return baseDate.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
}

/**
 * Format a DateTime to "HH:mm" string
 */
export function formatTimeString(dt: DateTime): string {
  return dt.toFormat('HH:mm');
}

/**
 * Get start and end of day for a given date
 */
export function getStartOfDay(dt: DateTime = DateTime.now()): DateTime {
  return dt.startOf('day');
}

export function getEndOfDay(dt: DateTime = DateTime.now()): DateTime {
  return dt.endOf('day');
}

/**
 * Check if two DateTimes are on the same day
 */
export function isSameDay(dt1: DateTime, dt2: DateTime): boolean {
  return dt1.hasSame(dt2, 'day');
}

/**
 * Get a human-readable relative time string
 */
export function getRelativeTime(dt: DateTime): string {
  const now = DateTime.now();
  const diff = dt.diff(now, ['days', 'hours', 'minutes']).toObject();

  if (diff.days && Math.abs(diff.days) >= 1) {
    return dt.toRelativeCalendar() || dt.toLocaleString(DateTime.DATE_MED);
  }

  if (diff.hours && Math.abs(diff.hours) >= 1) {
    return `in ${Math.round(diff.hours)} ${Math.abs(Math.round(diff.hours)) === 1 ? 'hour' : 'hours'}`;
  }

  if (diff.minutes && Math.abs(diff.minutes) >= 1) {
    return `in ${Math.round(diff.minutes)} ${Math.abs(Math.round(diff.minutes)) === 1 ? 'minute' : 'minutes'}`;
  }

  return 'now';
}

/**
 * Check if a time is within quiet hours
 */
export function isInQuietHours(
  dt: DateTime,
  quietStart: string,
  quietEnd: string
): boolean {
  const start = parseTimeString(quietStart, dt);
  const end = parseTimeString(quietEnd, dt);
  
  // Handle overnight quiet hours (e.g., 22:00 to 06:00)
  if (end < start) {
    return dt >= start || dt <= end;
  }
  
  return dt >= start && dt <= end;
}

/**
 * Add minutes to a DateTime
 */
export function addMinutes(dt: DateTime, minutes: number): DateTime {
  return dt.plus({ minutes });
}

/**
 * Get the week dates (Mon-Sun) for a given date
 */
export function getWeekDates(dt: DateTime = DateTime.now()): DateTime[] {
  const startOfWeek = dt.startOf('week'); // Monday
  return Array.from({ length: 7 }, (_, i) => startOfWeek.plus({ days: i }));
}



