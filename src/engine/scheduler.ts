import { DateTime } from 'luxon';
import { RRule, rrulestr } from 'rrule';
import type { Schedule, Conflict, Pill, DosePill } from '@types';
import { parseTimeString } from '@utils/time';

/**
 * Expand schedule occurrences within a date range
 * Returns array of DateTimes representing when the schedule should trigger
 */
export function expandOccurrences(
  schedule: Schedule,
  rangeStartISO: string,
  rangeEndISO: string
): DateTime[] {
  const startDate = DateTime.fromISO(rangeStartISO);
  const endDate = DateTime.fromISO(rangeEndISO);
  
  // Parse the RRULE
  const rule = rrulestr(schedule.rrule);
  
  // Get all dates that match the recurrence rule
  const dates = rule.between(startDate.toJSDate(), endDate.toJSDate(), true);
  
  // For each date, create occurrences for each time
  const occurrences: DateTime[] = [];
  
  for (const date of dates) {
    const dt = DateTime.fromJSDate(date);
    
    for (const timeStr of schedule.times) {
      const occurrence = parseTimeString(timeStr, dt);
      
      // Only include if within range and after schedule start date
      const scheduleStart = DateTime.fromISO(schedule.startDateISO);
      const scheduleEnd = schedule.endDateISO ? DateTime.fromISO(schedule.endDateISO) : null;
      
      if (occurrence >= scheduleStart && occurrence >= startDate && occurrence <= endDate) {
        if (!scheduleEnd || occurrence <= scheduleEnd) {
          occurrences.push(occurrence);
        }
      }
    }
  }
  
  return occurrences.sort((a, b) => a.toMillis() - b.toMillis());
}

/**
 * Build a human-readable group label for a dose
 */
export function buildGroupLabel(items: DosePill[], pillLookup: Map<string, Pill>): string {
  const parts: string[] = [];
  
  for (const item of items) {
    const pill = pillLookup.get(item.pillId);
    if (pill) {
      parts.push(`${item.qty}× ${pill.name}`);
    }
  }
  
  return parts.join(' + ');
}

/**
 * Detect conflicts between schedules
 */
export function detectConflicts(
  schedules: Schedule[],
  pillLookup: Map<string, Pill>,
  rangeStartISO: string,
  rangeEndISO: string
): Conflict[] {
  const conflicts: Conflict[] = [];
  
  // Expand all occurrences
  const allOccurrences: Array<{ schedule: Schedule; time: DateTime }> = [];
  
  for (const schedule of schedules) {
    const occurrences = expandOccurrences(schedule, rangeStartISO, rangeEndISO);
    for (const time of occurrences) {
      allOccurrences.push({ schedule, time });
    }
  }
  
  // Sort by time
  allOccurrences.sort((a, b) => a.time.toMillis() - b.time.toMillis());
  
  // Check for time overlaps (within the same minute)
  for (let i = 0; i < allOccurrences.length - 1; i++) {
    const current = allOccurrences[i];
    const next = allOccurrences[i + 1];
    
    // Check if they're within the same minute
    if (current.time.hasSame(next.time, 'minute') && current.schedule.id !== next.schedule.id) {
      conflicts.push({
        type: 'TIME_OVERLAP',
        message: `Schedules overlap at ${current.time.toFormat('HH:mm')} on ${current.time.toFormat('MMM dd')}`,
        scheduleIds: [current.schedule.id, next.schedule.id],
        occurrenceISO: current.time.toISO()!,
      });
    }
  }
  
  // Check for daily dose limits
  // Group occurrences by day and pill
  const dailyDoses = new Map<string, Map<string, number>>();
  
  for (const { schedule, time } of allOccurrences) {
    const dayKey = time.toISODate()!;
    
    if (!dailyDoses.has(dayKey)) {
      dailyDoses.set(dayKey, new Map());
    }
    
    const dayMap = dailyDoses.get(dayKey)!;
    
    for (const item of schedule.items) {
      const currentQty = dayMap.get(item.pillId) || 0;
      dayMap.set(item.pillId, currentQty + item.qty);
    }
  }
  
  // Check if any day exceeds max daily dose
  for (const [dayKey, pillQtys] of dailyDoses.entries()) {
    for (const [pillId, qty] of pillQtys.entries()) {
      const pill = pillLookup.get(pillId);
      if (pill && qty > pill.maxDailyDose) {
        const affectedSchedules = schedules.filter((s) =>
          s.items.some((item) => item.pillId === pillId)
        );
        conflicts.push({
          type: 'DAILY_LIMIT_EXCEEDED',
          message: `${pill.name} daily limit exceeded on ${dayKey}: ${qty} pills (max ${pill.maxDailyDose})`,
          scheduleIds: affectedSchedules.map((s) => s.id),
          pillId,
          occurrenceISO: dayKey,
        });
      }
    }
  }
  
  return conflicts;
}

/**
 * Calculate the next eligible time for dispensing based on lockout
 */
export function nextEligibleTime(lastDispenseISO: string, lockoutMinutes: number): DateTime {
  const lastDispense = DateTime.fromISO(lastDispenseISO);
  return lastDispense.plus({ minutes: lockoutMinutes });
}

/**
 * Generate a plain language summary of a schedule
 */
export function plainLanguageSummary(schedule: Schedule, pillLookup: Map<string, Pill>): string {
  const parts: string[] = [];
  
  // Pills
  const pillNames = schedule.items
    .map((item) => {
      const pill = pillLookup.get(item.pillId);
      return pill ? `${item.qty} ${pill.name}` : null;
    })
    .filter(Boolean);
  
  parts.push(`Take ${pillNames.join(', ')}`);
  
  // Times
  const times = schedule.times.join(', ');
  parts.push(`at ${times}`);
  
  // Recurrence
  const rule = rrulestr(schedule.rrule);
  const ruleText = rule.toText();
  parts.push(ruleText.toLowerCase());
  
  // Date range
  const startDate = DateTime.fromISO(schedule.startDateISO);
  parts.push(`starting ${startDate.toFormat('MMM dd, yyyy')}`);
  
  if (schedule.endDateISO) {
    const endDate = DateTime.fromISO(schedule.endDateISO);
    parts.push(`until ${endDate.toFormat('MMM dd, yyyy')}`);
  }
  
  return parts.join(' ');
}

/**
 * Check if a schedule is active on a given date
 */
export function isScheduleActive(schedule: Schedule, date: DateTime): boolean {
  const startDate = DateTime.fromISO(schedule.startDateISO);
  
  if (date < startDate.startOf('day')) {
    return false;
  }
  
  if (schedule.endDateISO) {
    const endDate = DateTime.fromISO(schedule.endDateISO);
    if (date > endDate.endOf('day')) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get the next occurrence for a schedule after a given time
 */
export function getNextOccurrence(schedule: Schedule, afterISO?: string): DateTime | null {
  const after = afterISO ? DateTime.fromISO(afterISO) : DateTime.now();
  const rangeEnd = after.plus({ months: 1 });
  
  const occurrences = expandOccurrences(schedule, after.toISO()!, rangeEnd.toISO()!);
  
  return occurrences.length > 0 ? occurrences[0] : null;
}



