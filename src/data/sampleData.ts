import type { Pill, PillHardwareProfile, Schedule, EventLog } from '@types';
import { EventStatus } from '@types';
import { DateTime } from 'luxon';

const isoAt = (daysOffset: number, hour: number) =>
  DateTime.now().startOf('day').plus({ days: daysOffset, hours: hour }).toISO();

export const SAMPLE_PILLS: Pill[] = [
  {
    id: 'sample-metformin',
    name: 'Metformin',
    color: '#3b82f6',
    shape: 'oval',
    cartridgeIndex: 0,
    maxDailyDose: 4,
    stockCount: 60,
    lowStockThreshold: 10,
    createdAt: Date.now(),
  },
  {
    id: 'sample-atorvastatin',
    name: 'Atorvastatin',
    color: '#ef4444',
    shape: 'round',
    cartridgeIndex: 1,
    maxDailyDose: 2,
    stockCount: 30,
    lowStockThreshold: 5,
    createdAt: Date.now(),
  },
  {
    id: 'sample-lisinopril',
    name: 'Lisinopril',
    color: '#10b981',
    shape: 'oblong',
    cartridgeIndex: 2,
    maxDailyDose: 1,
    stockCount: 30,
    lowStockThreshold: 5,
    createdAt: Date.now(),
  },
];

export const SAMPLE_HARDWARE_PROFILES: PillHardwareProfile[] = [
  {
    pillId: 'sample-metformin',
    serialNumber: 'SER-001-MET',
    manufacturer: 'PillBox Labs',
    formFactor: 'oval',
    diameterMm: 9,
    lengthMm: 12,
    widthMm: 4,
    heightMm: 3,
    weightMg: 500,
    density: 1.2,
    siloSlot: 0,
    trapdoorOpenMs: 1200,
    trapdoorHoldMs: 800,
  },
  {
    pillId: 'sample-atorvastatin',
    serialNumber: 'SER-002-ATO',
    manufacturer: 'PillBox Labs',
    formFactor: 'round',
    diameterMm: 8,
    lengthMm: null,
    widthMm: null,
    heightMm: 3,
    weightMg: 300,
    density: 1.1,
    siloSlot: 1,
    trapdoorOpenMs: 1180,
    trapdoorHoldMs: 780,
  },
  {
    pillId: 'sample-lisinopril',
    serialNumber: 'SER-003-LIS',
    manufacturer: 'PillBox Labs',
    formFactor: 'oblong',
    diameterMm: null,
    lengthMm: 11,
    widthMm: 5,
    heightMm: 3,
    weightMg: 200,
    density: 1.15,
    siloSlot: 2,
    trapdoorOpenMs: 1220,
    trapdoorHoldMs: 820,
  },
];

export const SAMPLE_SCHEDULES: Schedule[] = [
  {
    id: 'sample-schedule-morning',
    title: 'Morning Medication',
    lockoutMinutes: 60,
    snooze: { intervalMinutes: 10, maxSnoozes: 3 },
    startDateISO: new Date().toISOString(),
    endDateISO: null,
    rrule: 'RRULE:FREQ=DAILY',
    times: ['08:00'],
    items: [
      { pillId: 'sample-metformin', qty: 2 },
      { pillId: 'sample-atorvastatin', qty: 1 },
    ],
  },
  {
    id: 'sample-schedule-evening',
    title: 'Evening Pill',
    lockoutMinutes: 60,
    snooze: { intervalMinutes: 15, maxSnoozes: 2 },
    startDateISO: new Date().toISOString(),
    endDateISO: null,
    rrule: 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    times: ['21:00'],
    items: [{ pillId: 'sample-lisinopril', qty: 1 }],
  },
];

export const SAMPLE_EVENTS: EventLog[] = [
  {
    id: 'sample-event-1',
    dueAtISO: isoAt(-1, 8),
    groupLabel: 'Morning Medication',
    status: EventStatus.TAKEN,
    actedAtISO: isoAt(-1, 8),
    detailsJSON: JSON.stringify({
      scheduleId: 'sample-schedule-morning',
      items: SAMPLE_SCHEDULES[0].items,
      providerNotes: 'Take with breakfast.',
    }),
  },
  {
    id: 'sample-event-2',
    dueAtISO: isoAt(-1, 21),
    groupLabel: 'Evening Pill',
    status: EventStatus.MISSED,
    actedAtISO: null,
    detailsJSON: JSON.stringify({
      scheduleId: 'sample-schedule-evening',
      items: SAMPLE_SCHEDULES[1].items,
    }),
  },
  {
    id: 'sample-event-3',
    dueAtISO: isoAt(0, 8),
    groupLabel: 'Morning Medication',
    status: EventStatus.PENDING,
    actedAtISO: null,
    detailsJSON: JSON.stringify({
      scheduleId: 'sample-schedule-morning',
      items: SAMPLE_SCHEDULES[0].items,
    }),
  },
  {
    id: 'sample-event-4',
    dueAtISO: isoAt(0, 21),
    groupLabel: 'Evening Pill',
    status: EventStatus.PENDING,
    actedAtISO: null,
    detailsJSON: JSON.stringify({
      scheduleId: 'sample-schedule-evening',
      items: SAMPLE_SCHEDULES[1].items,
    }),
  },
  {
    id: 'sample-event-5',
    dueAtISO: isoAt(1, 8),
    groupLabel: 'Morning Medication',
    status: EventStatus.PENDING,
    actedAtISO: null,
    detailsJSON: JSON.stringify({
      scheduleId: 'sample-schedule-morning',
      items: SAMPLE_SCHEDULES[0].items,
    }),
  },
];

