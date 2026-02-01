// Domain types for the simplified 3-silo PillBox Dispenser app

export type Pill = {
  id: string;
  patientId?: string;
  name: string;
  color: string;
  cartridgeIndex: number | null; // 0, 1, 2, or null (unassigned)
  maxDailyDose: number;
  stockCount: number;
  lowStockThreshold: number;
  createdAt: number;
  updatedAt?: number;
};

export type DosePill = {
  pillId: string;
  qty: number;
};

export type Schedule = {
  id: string;
  patientId?: string;
  title?: string;
  times: string[];
  rrule: string;
  startDateISO: string;
  endDateISO?: string;
  lockoutMinutes: number;
  items: ScheduleItem[];
  status?: string;
};

export type ScheduleItem = {
  id?: string;
  scheduleId?: string;
  pillId: string;
  qty: number;
};

export type EventStatus = 'PENDING' | 'TAKEN' | 'SKIPPED' | 'FAILED' | 'MISSED';

export type EventLog = {
  id: string;
  scheduleId?: string;
  dueAtISO: string;
  status: EventStatus;
  actedAtISO?: string;
  actionSource?: string;
};

export type TodayCard = {
  id: string;
  groupLabel: string;
  time: string;
  status: EventStatus;
  pills: Pill[];
};

export type Conflict = {
  type: 'overlap' | 'dailyLimit';
  message: string;
  scheduleIds: string[];
};
