import { create } from 'zustand';
import type { Schedule, ScheduleItem } from '@types';
import { graphqlRequest } from '@/api/graphqlClient';
import { graphQLConfig } from '@/config/env';
import { useSessionStore } from './sessionStore';

interface ScheduleStore {
  schedules: Schedule[];
  isLoading: boolean;
  error: string | null;

  loadSchedules: () => Promise<void>;
  getScheduleById: (id: string) => Schedule | undefined;
  addSchedule: (input: CreateScheduleInput) => Promise<Schedule>;
  archiveSchedule: (id: string) => Promise<void>;
  refreshSchedules: () => Promise<void>;
}

export type CreateScheduleInput = {
  title: string;
  timezone: string;
  rrule: string;
  startDateISO: string;
  endDateISO?: string;
  lockoutMinutes: number;
  items: { medicationId: string; qty: number }[];
};

const SCHEDULE_FIELDS = `
  id
  patientId
  title
  timezone
  rrule
  startDateISO
  endDateISO
  lockoutMinutes
  status
  items {
    id
    scheduleId
    medication {
      id
      name
    }
    qty
  }
`;

type ScheduleItemGQL = {
  id: string;
  scheduleId: string;
  medication: { id: string; name: string };
  qty: number;
};

type ScheduleGQL = {
  id: string;
  patientId: string;
  title: string;
  timezone: string;
  rrule: string;
  startDateISO: string;
  endDateISO?: string;
  lockoutMinutes: number;
  status: string;
  items: ScheduleItemGQL[];
};

const ensurePatientId = (): string => {
  const runtimePatientId = useSessionStore.getState().patient?.id;
  if (runtimePatientId) return runtimePatientId;
  if (graphQLConfig.patientId) return graphQLConfig.patientId;
  throw new Error('No patient selected. Log in first or set EXPO_PUBLIC_GRAPHQL_PATIENT_ID.');
};

const mapGQLToSchedule = (gql: ScheduleGQL): Schedule => ({
  id: gql.id,
  patientId: gql.patientId,
  title: gql.title,
  times: [],
  rrule: gql.rrule,
  startDateISO: gql.startDateISO,
  endDateISO: gql.endDateISO,
  lockoutMinutes: gql.lockoutMinutes,
  status: gql.status,
  items: gql.items.map((item): ScheduleItem => ({
    id: item.id,
    scheduleId: item.scheduleId,
    pillId: item.medication.id,
    qty: item.qty,
  })),
});

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedules: [],
  isLoading: false,
  error: null,

  loadSchedules: async () => {
    set({ isLoading: true, error: null });
    try {
      const patientId = ensurePatientId();
      const data = await graphqlRequest<{ schedules: ScheduleGQL[] }>(
        `query Schedules($patientId: ID!) {
          schedules(patientId: $patientId) {
            ${SCHEDULE_FIELDS}
          }
        }`,
        { patientId }
      );
      set({ schedules: data.schedules.map(mapGQLToSchedule), isLoading: false });
    } catch (error) {
      console.error('Failed to load schedules:', error);
      set({ error: 'Failed to load schedules', isLoading: false });
    }
  },

  getScheduleById: (id) => get().schedules.find((s) => s.id === id),

  addSchedule: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const patientId = ensurePatientId();
      const data = await graphqlRequest<{ createSchedule: ScheduleGQL }>(
        `mutation CreateSchedule($input: ScheduleInput!) {
          createSchedule(input: $input) {
            ${SCHEDULE_FIELDS}
          }
        }`,
        {
          input: {
            patientId,
            title: input.title,
            timezone: input.timezone,
            rrule: input.rrule,
            startDateISO: input.startDateISO,
            endDateISO: input.endDateISO,
            lockoutMinutes: input.lockoutMinutes,
            items: input.items,
          },
        }
      );
      const schedule = mapGQLToSchedule(data.createSchedule);
      set((state) => ({
        schedules: [...state.schedules, schedule],
        isLoading: false,
      }));
      return schedule;
    } catch (error) {
      console.error('Failed to add schedule:', error);
      set({ error: 'Failed to add schedule', isLoading: false });
      throw error;
    }
  },

  archiveSchedule: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await graphqlRequest(
        `mutation ArchiveSchedule($id: ID!) {
          archiveSchedule(id: $id) { id }
        }`,
        { id }
      );
      set((state) => ({
        schedules: state.schedules.filter((s) => s.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to archive schedule:', error);
      set({ error: 'Failed to archive schedule', isLoading: false });
      throw error;
    }
  },

  refreshSchedules: async () => {
    await get().loadSchedules();
  },
}));
