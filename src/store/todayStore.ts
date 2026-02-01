import { create } from 'zustand';
import { DateTime } from 'luxon';
import type { EventLog, EventStatus } from '@types';
import { graphqlRequest } from '@/api/graphqlClient';
import { graphQLConfig } from '@/config/env';
import { useSessionStore } from './sessionStore';

interface TodayStore {
  events: EventLog[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTodayEvents: () => Promise<void>;
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
