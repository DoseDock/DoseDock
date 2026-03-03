import { create } from 'zustand';
import { DateTime } from 'luxon';
import { rrulestr } from 'rrule';
import type { EventLog, EventStatus } from '@types';
import { graphqlRequest } from '@/api/graphqlClient';
import { graphQLConfig } from '@/config/env';
import { useSessionStore } from './sessionStore';

type ScheduleForHistory = {
  id: string;
  title: string;
  rrule: string;
  startDateISO: string;
  endDateISO?: string;
  status: string;
};

interface TodayStore {
  events: EventLog[];
  historyEvents: EventLog[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTodayEvents: () => Promise<void>;
  loadHistoryEvents: (daysBack?: number) => Promise<void>;
  recordAction: (eventId: string, status: 'TAKEN' | 'SKIPPED' | 'FAILED') => Promise<void>;
  refreshEvents: () => Promise<void>;
}

const EVENT_FIELDS = `
  id
  scheduleId
  dueAtISO
  status
  actedAtISO
  actionSource
`;

const ensurePatientId = (): string => {
  const runtimePatientId = useSessionStore.getState().patient?.id;
  if (runtimePatientId) {
    return runtimePatientId;
  }
  if (graphQLConfig.patientId) {
    return graphQLConfig.patientId;
  }
  throw new Error(
    'No patient selected. Log in first or set EXPO_PUBLIC_GRAPHQL_PATIENT_ID.'
  );
};

export const useTodayStore = create<TodayStore>((set, get) => ({
  events: [],
  historyEvents: [],
  isLoading: false,
  error: null,

  loadTodayEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const patientId = ensurePatientId();
      const today = DateTime.now();
      const startISO = today.startOf('day').toISO()!;
      const endISO = today.endOf('day').toISO()!;

      const data = await graphqlRequest<{ dispenseEvents: EventLog[] }>(
        `query DispenseEvents($patientId: ID!, $range: DateRangeInput!) {
          dispenseEvents(patientId: $patientId, range: $range) {
            ${EVENT_FIELDS}
          }
        }`,
        { patientId, range: { start: startISO, end: endISO } }
      );
      set({ events: data.dispenseEvents, isLoading: false });
    } catch (error) {
      console.error('Failed to load today events:', error);
      set({ error: 'Failed to load today events', isLoading: false });
    }
  },

  loadHistoryEvents: async (daysBack = 30) => {
    set({ isLoading: true, error: null });
    try {
      const patientId = ensurePatientId();
      const now = DateTime.now();
      const startDT = now.minus({ days: daysBack }).startOf('day');
      const endDT = now; // Only up to current time for missed calculation
      const startISO = startDT.toUTC().toISO()!;
      const endISO = now.toUTC().endOf('day').toISO()!;

      // Fetch both dispense events and schedules in parallel
      const [eventsData, schedulesData] = await Promise.all([
        graphqlRequest<{ dispenseEvents: EventLog[] }>(
          `query DispenseEvents($patientId: ID!, $range: DateRangeInput!) {
            dispenseEvents(patientId: $patientId, range: $range) {
              ${EVENT_FIELDS}
            }
          }`,
          { patientId, range: { start: startISO, end: endISO } }
        ),
        graphqlRequest<{ schedules: ScheduleForHistory[] }>(
          `query Schedules($patientId: ID!) {
            schedules(patientId: $patientId) {
              id
              title
              rrule
              startDateISO
              endDateISO
              status
            }
          }`,
          { patientId }
        ),
      ]);

      const recordedEvents = eventsData.dispenseEvents;
      const schedules = schedulesData.schedules.filter(s => s.status === 'ACTIVE');

      // Create a set of recorded event keys (scheduleId + dueAtISO rounded to minute)
      const recordedEventKeys = new Set(
        recordedEvents.map(e => `${e.scheduleId}|${DateTime.fromISO(e.dueAtISO).toFormat('yyyy-MM-dd HH:mm')}`)
      );

      // Compute missed events from schedules
      const missedEvents: EventLog[] = [];

      for (const schedule of schedules) {
        try {
          const dtstart = new Date(schedule.startDateISO);
          const rule = rrulestr(schedule.rrule, { dtstart });

          // Get all occurrences in the date range (includes time from DTSTART)
          const occurrences = rule.between(
            startDT.toJSDate(),
            endDT.toJSDate(),
            true
          );

          for (const occurrence of occurrences) {
            const occDT = DateTime.fromJSDate(occurrence);

            // Skip if this occurrence is in the future
            if (occDT > now) continue;

            // Skip if schedule has an end date and this occurrence is after it
            if (schedule.endDateISO && occDT > DateTime.fromISO(schedule.endDateISO)) continue;

            // Check if there's a recorded event for this occurrence
            const eventKey = `${schedule.id}|${occDT.toFormat('yyyy-MM-dd HH:mm')}`;

            if (!recordedEventKeys.has(eventKey)) {
              // No recorded event - this is a MISSED dose
              missedEvents.push({
                id: `missed-${schedule.id}-${occDT.toISO()}`,
                scheduleId: schedule.id,
                dueAtISO: occDT.toUTC().toISO()!,
                status: 'MISSED' as EventStatus,
                actedAtISO: undefined,
                actionSource: 'computed',
              });
            }
          }
        } catch (err) {
          console.warn('[History] Failed to expand RRULE for schedule', schedule.id, err);
        }
      }

      // Combine recorded events with computed missed events
      const allEvents = [...recordedEvents, ...missedEvents];

      // Sort by dueAtISO descending (most recent first)
      allEvents.sort((a, b) => b.dueAtISO.localeCompare(a.dueAtISO));

      set({ historyEvents: allEvents, isLoading: false });
    } catch (error) {
      console.error('Failed to load history events:', error);
      set({ error: 'Failed to load history events', isLoading: false });
    }
  },

  recordAction: async (eventId, status) => {
    try {
      const actedAtISO = DateTime.now().toISO()!;
      const data = await graphqlRequest<{ recordDispenseAction: EventLog }>(
        `mutation RecordDispenseAction($input: DispenseActionInput!) {
          recordDispenseAction(input: $input) {
            ${EVENT_FIELDS}
          }
        }`,
        {
          input: {
            eventId,
            status,
            actedAtISO,
            actionSource: 'APP',
          },
        }
      );
      const updatedEvent = data.recordDispenseAction;

      // Update local state
      set((state) => ({
        events: state.events.map((e) =>
          e.id === eventId ? updatedEvent : e
        ),
      }));
    } catch (error) {
      console.error('Failed to record dispense action:', error);
      throw error;
    }
  },

  refreshEvents: async () => {
    await get().loadTodayEvents();
  },
}));
