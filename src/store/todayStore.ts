import { create } from 'zustand';
import { DateTime } from 'luxon';
import type { TodayCard, EventLog, EventDetails } from '@types';
import { eventLogRepository } from '@data/repositories/EventLogRepository';
import { EventStatus } from '@types';
import { getStartOfDay, getEndOfDay } from '@utils/time';

interface TodayStore {
  events: EventLog[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTodayEvents: () => Promise<void>;
  getTodayCards: () => TodayCard[];
  updateEventStatus: (
    eventId: string,
    status: EventStatus,
    details?: Partial<EventDetails>
  ) => Promise<void>;
  refreshEvents: () => Promise<void>;
}

export const useTodayStore = create<TodayStore>((set, get) => ({
  events: [],
  isLoading: false,
  error: null,

  loadTodayEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const today = DateTime.now();
      const startISO = getStartOfDay(today).toISO()!;
      const endISO = getEndOfDay(today).toISO()!;

      const events = await eventLogRepository.getTodayEvents(startISO, endISO);
      set({ events, isLoading: false });
    } catch (error) {
      console.error('Failed to load today events:', error);
      set({ error: 'Failed to load today events', isLoading: false });
    }
  },

  getTodayCards: () => {
    const events = get().events;
    const cards: TodayCard[] = [];

    for (const event of events) {
      try {
        const details: EventDetails = JSON.parse(event.detailsJSON);

        cards.push({
          id: event.id,
          dueAtISO: event.dueAtISO,
          groupLabel: event.groupLabel,
          items: details.items || [],
          status: event.status,
          scheduleId: details.scheduleId || '',
          snoozeCount: details.snoozeCount || 0,
          maxSnoozes: 3, // TODO: Get from schedule
          lockoutUntilISO: undefined, // TODO: Calculate from lockout
        });
      } catch (error) {
        console.error('Failed to parse event details:', error);
      }
    }

    // Sort by due time
    cards.sort((a, b) => a.dueAtISO.localeCompare(b.dueAtISO));

    return cards;
  },

  updateEventStatus: async (eventId, status, details = {}) => {
    try {
      const event = get().events.find((e) => e.id === eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      const existingDetails: EventDetails = JSON.parse(event.detailsJSON);
      const updatedDetails: EventDetails = { ...existingDetails, ...details };

      await eventLogRepository.update(eventId, {
        status,
        actedAtISO: DateTime.now().toISO()!,
        detailsJSON: JSON.stringify(updatedDetails),
      });

      // Update local state
      set((state) => ({
        events: state.events.map((e) =>
          e.id === eventId
            ? {
                ...e,
                status,
                actedAtISO: DateTime.now().toISO()!,
                detailsJSON: JSON.stringify(updatedDetails),
              }
            : e
        ),
      }));
    } catch (error) {
      console.error('Failed to update event status:', error);
      throw error;
    }
  },

  refreshEvents: async () => {
    await get().loadTodayEvents();
  },
}));

