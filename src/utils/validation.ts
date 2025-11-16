import { z } from 'zod';

// Validation schema for creating a schedule
export const scheduleSchema = z.object({
  title: z.string().optional(),
  times: z.array(z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format')).min(1, 'At least one time required'),
  rrule: z.string().min(1, 'Recurrence rule required'),
  startDateISO: z.string().datetime(),
  endDateISO: z.string().datetime().optional().nullable(),
  lockoutMinutes: z.number().min(0).max(1440),
  snooze: z.object({
    intervalMinutes: z.number().min(1).max(60),
    maxSnoozes: z.number().min(0).max(10),
  }),
  items: z.array(
    z.object({
      pillId: z.string().min(1),
      qty: z.number().min(1).max(10),
    })
  ).min(1, 'At least one pill required'),
});

// Validation schema for pill
export const pillSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  shape: z.enum(['round', 'oval', 'oblong', 'capsule', 'square']),
  cartridgeIndex: z.number().min(0).max(9),
  maxDailyDose: z.number().min(1).max(20),
  stockCount: z.number().min(0),
  lowStockThreshold: z.number().min(0),
});

// Validation schema for settings
export const settingsSchema = z.object({
  timeZone: z.string().min(1),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  caregiverEmail: z.string().email('Invalid email').optional(),
  pinEnabled: z.boolean(),
  pinCode: z.string().length(4, 'PIN must be 4 digits').optional(),
});

export type ScheduleFormData = z.infer<typeof scheduleSchema>;
export type PillFormData = z.infer<typeof pillSchema>;
export type SettingsFormData = z.infer<typeof settingsSchema>;



