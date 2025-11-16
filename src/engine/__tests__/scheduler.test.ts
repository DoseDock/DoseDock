import { DateTime } from 'luxon';
import { RRule } from 'rrule';
import {
  expandOccurrences,
  buildGroupLabel,
  detectConflicts,
  nextEligibleTime,
  plainLanguageSummary,
  getNextOccurrence,
} from '../scheduler';
import type { Schedule, Pill, DosePill } from '@types';

describe('Scheduler Engine', () => {
  const mockPill1: Pill = {
    id: 'pill-1',
    name: 'Metformin',
    color: '#3b82f6',
    shape: 'oval',
    cartridgeIndex: 0,
    maxDailyDose: 4,
    stockCount: 60,
    lowStockThreshold: 10,
    createdAt: Date.now(),
  };

  const mockPill2: Pill = {
    id: 'pill-2',
    name: 'Atorvastatin',
    color: '#ef4444',
    shape: 'round',
    cartridgeIndex: 1,
    maxDailyDose: 2,
    stockCount: 30,
    lowStockThreshold: 5,
    createdAt: Date.now(),
  };

  const pillLookup = new Map<string, Pill>([
    [mockPill1.id, mockPill1],
    [mockPill2.id, mockPill2],
  ]);

  describe('expandOccurrences', () => {
    it('should expand daily schedule for 7 days', () => {
      const startDate = DateTime.fromISO('2024-01-01T00:00:00');
      const rrule = new RRule({
        freq: RRule.DAILY,
        dtstart: startDate.toJSDate(),
      });

      const schedule: Schedule = {
        id: 'schedule-1',
        times: ['08:00', '20:00'],
        rrule: rrule.toString(),
        startDateISO: startDate.toISO()!,
        lockoutMinutes: 60,
        snooze: { intervalMinutes: 10, maxSnoozes: 3 },
        items: [{ pillId: 'pill-1', qty: 2 }],
      };

      const endDate = startDate.plus({ days: 7 });
      const occurrences = expandOccurrences(schedule, startDate.toISO()!, endDate.toISO()!);

      // Should have 7 days × 2 times = 14 occurrences
      expect(occurrences.length).toBe(14);
      expect(occurrences[0].hour).toBe(8);
      expect(occurrences[1].hour).toBe(20);
    });

    it('should expand weekdays-only schedule', () => {
      const startDate = DateTime.fromISO('2024-01-01T00:00:00'); // Monday
      const rrule = new RRule({
        freq: RRule.WEEKLY,
        byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR],
        dtstart: startDate.toJSDate(),
      });

      const schedule: Schedule = {
        id: 'schedule-2',
        times: ['09:00'],
        rrule: rrule.toString(),
        startDateISO: startDate.toISO()!,
        lockoutMinutes: 60,
        snooze: { intervalMinutes: 10, maxSnoozes: 3 },
        items: [{ pillId: 'pill-1', qty: 1 }],
      };

      const endDate = startDate.plus({ days: 7 });
      const occurrences = expandOccurrences(schedule, startDate.toISO()!, endDate.toISO()!);

      // Should have 5 weekdays
      expect(occurrences.length).toBe(5);
    });

    it('should respect schedule end date', () => {
      const startDate = DateTime.fromISO('2024-01-01T00:00:00');
      const endDate = DateTime.fromISO('2024-01-03T23:59:59');
      const rrule = new RRule({
        freq: RRule.DAILY,
        dtstart: startDate.toJSDate(),
      });

      const schedule: Schedule = {
        id: 'schedule-3',
        times: ['10:00'],
        rrule: rrule.toString(),
        startDateISO: startDate.toISO()!,
        endDateISO: endDate.toISO()!,
        lockoutMinutes: 60,
        snooze: { intervalMinutes: 10, maxSnoozes: 3 },
        items: [{ pillId: 'pill-1', qty: 1 }],
      };

      const rangeEnd = startDate.plus({ days: 7 });
      const occurrences = expandOccurrences(schedule, startDate.toISO()!, rangeEnd.toISO()!);

      // Should only have 3 days (Jan 1, 2, 3)
      expect(occurrences.length).toBe(3);
    });
  });

  describe('buildGroupLabel', () => {
    it('should build label for single pill', () => {
      const items: DosePill[] = [{ pillId: 'pill-1', qty: 2 }];
      const label = buildGroupLabel(items, pillLookup);
      expect(label).toBe('2× Metformin');
    });

    it('should build label for multiple pills', () => {
      const items: DosePill[] = [
        { pillId: 'pill-1', qty: 2 },
        { pillId: 'pill-2', qty: 1 },
      ];
      const label = buildGroupLabel(items, pillLookup);
      expect(label).toBe('2× Metformin + 1× Atorvastatin');
    });

    it('should handle missing pills gracefully', () => {
      const items: DosePill[] = [
        { pillId: 'pill-1', qty: 2 },
        { pillId: 'nonexistent', qty: 1 },
      ];
      const label = buildGroupLabel(items, pillLookup);
      expect(label).toBe('2× Metformin');
    });
  });

  describe('detectConflicts', () => {
    it('should detect time overlap conflicts', () => {
      const startDate = DateTime.fromISO('2024-01-01T00:00:00');
      const rrule = new RRule({
        freq: RRule.DAILY,
        dtstart: startDate.toJSDate(),
      });

      const schedule1: Schedule = {
        id: 'schedule-1',
        times: ['08:00'],
        rrule: rrule.toString(),
        startDateISO: startDate.toISO()!,
        lockoutMinutes: 60,
        snooze: { intervalMinutes: 10, maxSnoozes: 3 },
        items: [{ pillId: 'pill-1', qty: 1 }],
      };

      const schedule2: Schedule = {
        id: 'schedule-2',
        times: ['08:00'],
        rrule: rrule.toString(),
        startDateISO: startDate.toISO()!,
        lockoutMinutes: 60,
        snooze: { intervalMinutes: 10, maxSnoozes: 3 },
        items: [{ pillId: 'pill-2', qty: 1 }],
      };

      const endDate = startDate.plus({ days: 1 });
      const conflicts = detectConflicts(
        [schedule1, schedule2],
        pillLookup,
        startDate.toISO()!,
        endDate.toISO()!
      );

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].type).toBe('TIME_OVERLAP');
    });

    it('should detect daily limit exceeded', () => {
      const startDate = DateTime.fromISO('2024-01-01T00:00:00');
      const rrule = new RRule({
        freq: RRule.DAILY,
        dtstart: startDate.toJSDate(),
      });

      const schedule1: Schedule = {
        id: 'schedule-1',
        times: ['08:00', '12:00', '16:00'],
        rrule: rrule.toString(),
        startDateISO: startDate.toISO()!,
        lockoutMinutes: 60,
        snooze: { intervalMinutes: 10, maxSnoozes: 3 },
        items: [{ pillId: 'pill-1', qty: 2 }],
      };

      const endDate = startDate.plus({ days: 1 });
      const conflicts = detectConflicts(
        [schedule1],
        pillLookup,
        startDate.toISO()!,
        endDate.toISO()!
      );

      // 3 times × 2 pills = 6 pills > max 4
      expect(conflicts.some((c) => c.type === 'DAILY_LIMIT_EXCEEDED')).toBe(true);
    });

    it('should return no conflicts for valid schedules', () => {
      const startDate = DateTime.fromISO('2024-01-01T00:00:00');
      const rrule = new RRule({
        freq: RRule.DAILY,
        dtstart: startDate.toJSDate(),
      });

      const schedule: Schedule = {
        id: 'schedule-1',
        times: ['08:00', '20:00'],
        rrule: rrule.toString(),
        startDateISO: startDate.toISO()!,
        lockoutMinutes: 60,
        snooze: { intervalMinutes: 10, maxSnoozes: 3 },
        items: [{ pillId: 'pill-1', qty: 1 }],
      };

      const endDate = startDate.plus({ days: 1 });
      const conflicts = detectConflicts([schedule], pillLookup, startDate.toISO()!, endDate.toISO()!);

      expect(conflicts.length).toBe(0);
    });
  });

  describe('nextEligibleTime', () => {
    it('should calculate next eligible time with lockout', () => {
      const lastDispense = DateTime.fromISO('2024-01-01T08:00:00');
      const lockoutMinutes = 60;

      const nextTime = nextEligibleTime(lastDispense.toISO()!, lockoutMinutes);

      expect(nextTime.toISO()).toBe(DateTime.fromISO('2024-01-01T09:00:00').toISO());
    });

    it('should handle different lockout periods', () => {
      const lastDispense = DateTime.fromISO('2024-01-01T08:00:00');
      const lockoutMinutes = 120;

      const nextTime = nextEligibleTime(lastDispense.toISO()!, lockoutMinutes);

      expect(nextTime.toISO()).toBe(DateTime.fromISO('2024-01-01T10:00:00').toISO());
    });
  });

  describe('plainLanguageSummary', () => {
    it('should generate readable summary', () => {
      const startDate = DateTime.fromISO('2024-01-01T00:00:00');
      const rrule = new RRule({
        freq: RRule.DAILY,
        dtstart: startDate.toJSDate(),
      });

      const schedule: Schedule = {
        id: 'schedule-1',
        times: ['08:00'],
        rrule: rrule.toString(),
        startDateISO: startDate.toISO()!,
        lockoutMinutes: 60,
        snooze: { intervalMinutes: 10, maxSnoozes: 3 },
        items: [{ pillId: 'pill-1', qty: 2 }],
      };

      const summary = plainLanguageSummary(schedule, pillLookup);

      expect(summary).toContain('2 Metformin');
      expect(summary).toContain('08:00');
      expect(summary).toContain('daily');
    });
  });

  describe('getNextOccurrence', () => {
    it('should get next occurrence after a given time', () => {
      const startDate = DateTime.fromISO('2024-01-01T00:00:00');
      const rrule = new RRule({
        freq: RRule.DAILY,
        dtstart: startDate.toJSDate(),
      });

      const schedule: Schedule = {
        id: 'schedule-1',
        times: ['08:00', '20:00'],
        rrule: rrule.toString(),
        startDateISO: startDate.toISO()!,
        lockoutMinutes: 60,
        snooze: { intervalMinutes: 10, maxSnoozes: 3 },
        items: [{ pillId: 'pill-1', qty: 1 }],
      };

      const after = DateTime.fromISO('2024-01-01T09:00:00');
      const next = getNextOccurrence(schedule, after.toISO()!);

      expect(next).not.toBeNull();
      expect(next!.hour).toBe(20);
    });
  });
});



