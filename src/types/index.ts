// Domain types for the PillBox Dispenser app

export type DosePill = {
  pillId: string;
  qty: number;
};

export type Schedule = {
  id: string;
  title?: string | null;
  times: string[]; // "HH:mm" format
  rrule: string; // RFC5545 RRULE string
  startDateISO: string;
  endDateISO?: string | null;
  lockoutMinutes: number;
  snooze: {
    intervalMinutes: number;
    maxSnoozes: number;
  };
  items: DosePill[];
};

export type Pill = {
  id: string;
  name: string;
  color: string;
  shape: string;
  cartridgeIndex: number;
  maxDailyDose: number;
  stockCount: number;
  lowStockThreshold: number;
  createdAt: number;
};

export type ScheduleItem = {
  id: string;
  scheduleId: string;
  pillId: string;
  qty: number;
};

export enum EventStatus {
  PENDING = 'PENDING',
  TAKEN = 'TAKEN',
  SKIPPED = 'SKIPPED',
  SNOOZED = 'SNOOZED',
  FAILED = 'FAILED',
  MISSED = 'MISSED',
}

export type EventLog = {
  id: string;
  dueAtISO: string;
  groupLabel: string;
  status: EventStatus;
  actedAtISO?: string | null;
  detailsJSON: string; // JSON stringified object
};

export type EventDetails = {
  scheduleId?: string;
  items?: DosePill[];
  reason?: string;
  errorCode?: string;
  snoozeCount?: number;
};

export type Conflict = {
  type: 'TIME_OVERLAP' | 'DAILY_LIMIT_EXCEEDED';
  message: string;
  scheduleIds: string[];
  pillId?: string;
  occurrenceISO?: string;
};

export type TodayCard = {
  id: string;
  dueAtISO: string;
  groupLabel: string;
  items: DosePill[];
  status: EventStatus;
  scheduleId: string;
  snoozeCount: number;
  maxSnoozes: number;
  lockoutUntilISO?: string;
};

export type DeviceStatus = {
  connected: boolean;
  batteryLevel: number;
  wifiStrength: number;
  cartridges: CartridgeStatus[];
};

export type CartridgeStatus = {
  index: number;
  pillId?: string;
  stockLevel: number;
  isLow: boolean;
};

export type Settings = {
  timeZone: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "HH:mm"
  quietHoursEnd: string; // "HH:mm"
  caregiverEmail?: string;
  pinEnabled: boolean;
  pinCode?: string;
};

