import { create } from 'zustand';
import { DateTime } from 'luxon';
import type { Schedule } from '@types';
import { scheduleRepository } from '@data/repositories/ScheduleRepository';
import { eventLogRepository } from '@data/repositories/EventLogRepository';
import { expandOccurrences, buildGroupLabel } from '@engine/scheduler';
import { EventStatus } from '@types';
import { usePillStore } from './pillStore';
import * as NotificationService from '@notifications/index';

interface ScheduleStore {
  schedules: Schedule[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadSchedules: () => Promise<void>;
  getScheduleById: (id: string) => Schedule | undefined;
  addSchedule: (schedule: Omit<Schedule, 'id'>) => Promise<Schedule>;
  updateSchedule: (id: string, updates: Partial<Omit<Schedule, 'id'>>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  reconcileEvents: (daysAhead?: number) => Promise<void>;
  refreshSchedules: () => Promise<void>;
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedules: [],
  isLoading: false,
  error: null,

  loadSchedules: async () => {
    set({ isLoading: true, error: null });
    try {
      const schedules = await scheduleRepository.getAll();
      set({ schedules, isLoading: false });
    } catch (error) {
      console.error('Failed to load schedules:', error);
      set({ error: 'Failed to load schedules', isLoading: false });
    }
  },

  getScheduleById: (id: string) => {
    return get().schedules.find((s) => s.id === id);
  },

  addSchedule: async (scheduleData) => {
    set({ isLoading: true, error: null });
    try {
      const schedule = await scheduleRepository.create(scheduleData);
      set((state) => ({
        schedules: [...state.schedules, schedule],
        isLoading: false,
      }));

      // Schedule notifications
      const pillLookup = usePillStore.getState().pills;
      const groupLabel = buildGroupLabel(schedule.items, pillLookup);
      await NotificationService.scheduleNotificationsForSchedule(schedule, groupLabel);

      // Reconcile events
      await get().reconcileEvents();

      return schedule;
    } catch (error) {
      console.error('Failed to add schedule:', error);
      set({ error: 'Failed to add schedule', isLoading: false });
      throw error;
    }
  },

  updateSchedule: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await scheduleRepository.update(id, updates);
      set((state) => ({
        schedules: state.schedules.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        isLoading: false,
      }));

      // Refresh notifications for this schedule
      await NotificationService.cancelNotificationsForSchedule(id);
      const updatedSchedule = get().getScheduleById(id);
      if (updatedSchedule) {
        const pillLookup = usePillStore.getState().pills;
        const groupLabel = buildGroupLabel(updatedSchedule.items, pillLookup);
        await NotificationService.scheduleNotificationsForSchedule(updatedSchedule, groupLabel);
      }

      // Reconcile events
      await get().reconcileEvents();
    } catch (error) {
      console.error('Failed to update schedule:', error);
      set({ error: 'Failed to update schedule', isLoading: false });
      throw error;
    }
  },

  deleteSchedule: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await scheduleRepository.delete(id);
      set((state) => ({
        schedules: state.schedules.filter((s) => s.id !== id),
        isLoading: false,
      }));

      // Cancel notifications
      await NotificationService.cancelNotificationsForSchedule(id);
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      set({ error: 'Failed to delete schedule', isLoading: false });
      throw error;
    }
  },

  reconcileEvents: async (daysAhead = 7) => {
    try {
      const now = DateTime.now();
      const rangeEnd = now.plus({ days: daysAhead });
      const schedules = get().schedules;
      const pillLookup = usePillStore.getState().pills;

      // Get existing events in range
      const existingEvents = await eventLogRepository.getByDateRange(
        now.toISO()!,
        rangeEnd.toISO()!
      );
      const existingEventMap = new Map(
        existingEvents.map((e) => [e.dueAtISO + '-' + e.groupLabel, e])
      );

      // Generate events for all schedules
      for (const schedule of schedules) {
        const occurrences = expandOccurrences(schedule, now.toISO()!, rangeEnd.toISO()!);
        const groupLabel = buildGroupLabel(schedule.items, pillLookup);

        for (const occurrence of occurrences) {
          const key = occurrence.toISO() + '-' + groupLabel;

          // Only create if doesn't exist
          if (!existingEventMap.has(key)) {
            await eventLogRepository.create({
              dueAtISO: occurrence.toISO()!,
              groupLabel,
              status: EventStatus.PENDING,
              detailsJSON: JSON.stringify({
                scheduleId: schedule.id,
                items: schedule.items,
              }),
            });
          }
        }
      }

      console.log('Event reconciliation complete');
    } catch (error) {
      console.error('Failed to reconcile events:', error);
    }
  },

  refreshSchedules: async () => {
    await get().loadSchedules();
    await get().reconcileEvents();
  },
}));



