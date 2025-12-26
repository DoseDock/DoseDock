import type { Schedule, EventLog } from '@types';

const schedules: Schedule[] = [];
const events: EventLog[] = [];

export const memoryStore = {
  schedules,
  events,
};

export function memoryGetSchedules(): Schedule[] {
  return schedules;
}

export function memoryFindSchedule(id: string): Schedule | undefined {
  return schedules.find((schedule) => schedule.id === id);
}

export function memoryAddSchedule(schedule: Schedule) {
  schedules.push(schedule);
}

export function memoryUpdateSchedule(id: string, updates: Partial<Schedule>) {
  const index = schedules.findIndex((schedule) => schedule.id === id);
  if (index >= 0) {
    schedules[index] = { ...schedules[index], ...updates };
  }
}

export function memoryDeleteSchedule(id: string) {
  const index = schedules.findIndex((schedule) => schedule.id === id);
  if (index >= 0) {
    schedules.splice(index, 1);
  }
}

export function memoryGetEvents(): EventLog[] {
  return events;
}

export function memoryFindEvent(id: string): EventLog | undefined {
  return events.find((event) => event.id === id);
}

export function memoryAddEvent(event: EventLog) {
  events.push(event);
}

export function memoryUpdateEvent(id: string, updates: Partial<EventLog>) {
  const index = events.findIndex((event) => event.id === id);
  if (index >= 0) {
    events[index] = { ...events[index], ...updates };
  }
}

export function memoryDeleteEvent(id: string) {
  const index = events.findIndex((event) => event.id === id);
  if (index >= 0) {
    events.splice(index, 1);
  }
}

export function memoryEventsByDateRange(startISO: string, endISO: string): EventLog[] {
  return events.filter(
    (event) => event.dueAtISO >= startISO && event.dueAtISO <= endISO
  );
}

export function memoryDeleteEventsByDateRange(startISO: string, endISO: string): void {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].dueAtISO >= startISO && events[i].dueAtISO <= endISO) {
      events.splice(i, 1);
    }
  }
}

