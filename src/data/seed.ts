#!/usr/bin/env tsx
import { DateTime } from 'luxon';
import { RRule } from 'rrule';
import { pillRepository } from './repositories/PillRepository';
import { scheduleRepository } from './repositories/ScheduleRepository';
import { getDatabase } from './database';
import { pillHardwareRepository } from './repositories/PillHardwareRepository';
import { eventLogRepository } from './repositories/EventLogRepository';
import { EventStatus } from '../types';

const SEED_PILLS = [
  {
    name: 'Metformin',
    color: '#3b82f6',
    shape: 'oval',
    cartridgeIndex: 0,
    maxDailyDose: 4,
    stockCount: 60,
    lowStockThreshold: 10,
  },
  {
    name: 'Atorvastatin',
    color: '#ef4444',
    shape: 'round',
    cartridgeIndex: 1,
    maxDailyDose: 2,
    stockCount: 30,
    lowStockThreshold: 5,
  },
  {
    name: 'Lisinopril',
    color: '#10b981',
    shape: 'oblong',
    cartridgeIndex: 2,
    maxDailyDose: 1,
    stockCount: 30,
    lowStockThreshold: 5,
  },
  {
    name: 'Levothyroxine',
    color: '#f59e0b',
    shape: 'round',
    cartridgeIndex: 3,
    maxDailyDose: 1,
    stockCount: 30,
    lowStockThreshold: 5,
  },
  {
    name: 'Amlodipine',
    color: '#8b5cf6',
    shape: 'round',
    cartridgeIndex: 4,
    maxDailyDose: 1,
    stockCount: 30,
    lowStockThreshold: 5,
  },
  {
    name: 'Omeprazole',
    color: '#ec4899',
    shape: 'capsule',
    cartridgeIndex: 5,
    maxDailyDose: 2,
    stockCount: 30,
    lowStockThreshold: 5,
  },
  {
    name: 'Hydrochlorothiazide',
    color: '#06b6d4',
    shape: 'round',
    cartridgeIndex: 6,
    maxDailyDose: 2,
    stockCount: 30,
    lowStockThreshold: 5,
  },
  {
    name: 'Losartan',
    color: '#84cc16',
    shape: 'oblong',
    cartridgeIndex: 7,
    maxDailyDose: 2,
    stockCount: 30,
    lowStockThreshold: 5,
  },
  {
    name: 'Ibuprofen',
    color: '#f97316',
    shape: 'capsule',
    cartridgeIndex: 8,
    maxDailyDose: 6,
    stockCount: 100,
    lowStockThreshold: 20,
  },
  {
    name: 'Vitamin D',
    color: '#fbbf24',
    shape: 'round',
    cartridgeIndex: 9,
    maxDailyDose: 1,
    stockCount: 90,
    lowStockThreshold: 15,
  },
];

async function seed() {
  console.log('Starting database seeding...');

  try {
    await getDatabase();

    // Clear existing data
    console.log('Clearing existing data...');
    const db = await getDatabase();
    await db.execAsync('DELETE FROM event_log');
    await db.execAsync('DELETE FROM pill_hardware_profile');
    await db.execAsync('DELETE FROM schedule_item');
    await db.execAsync('DELETE FROM schedule');
    await db.execAsync('DELETE FROM pill');

    // Seed pills
    console.log('Seeding pills...');
    const pills = [];
    for (const pillData of SEED_PILLS) {
      const pill = await pillRepository.create(pillData);
      pills.push(pill);
      console.log(`  ✓ Created pill: ${pill.name}`);
    }

    // Seed hardware profiles
    console.log('Linking hardware metadata...');
    for (const pill of pills) {
      await pillHardwareRepository.upsert({
        pillId: pill.id,
        serialNumber: `SER-${pill.cartridgeIndex}-${pill.id.slice(-4)}`,
        manufacturer: 'PillBox Labs',
        formFactor: pill.shape,
        diameterMm: 8 + pill.cartridgeIndex * 0.5,
        lengthMm: pill.shape === 'capsule' ? 15 : 10,
        widthMm: pill.shape === 'oblong' ? 5 : null,
        heightMm: 4,
        weightMg: 250,
        density: 1.2,
        siloSlot: pill.cartridgeIndex,
        trapdoorOpenMs: 1100 + pill.cartridgeIndex * 10,
        trapdoorHoldMs: 700,
      });
    }

    // Seed schedules
    console.log('Seeding schedules...');

    // Schedule 1: Daily 08:00 - 2× Metformin + 1× Atorvastatin
    const metformin = pills.find((p) => p.name === 'Metformin')!;
    const atorvastatin = pills.find((p) => p.name === 'Atorvastatin')!;

    const schedule1RRule = new RRule({
      freq: RRule.DAILY,
      dtstart: DateTime.now().startOf('day').toJSDate(),
    });

    const schedule1 = await scheduleRepository.create({
      title: 'Morning Medication',
      times: ['08:00'],
      rrule: schedule1RRule.toString(),
      startDateISO: DateTime.now().startOf('day').toISO()!,
      lockoutMinutes: 60,
      snooze: {
        intervalMinutes: 10,
        maxSnoozes: 3,
      },
      items: [
        { pillId: metformin.id, qty: 2 },
        { pillId: atorvastatin.id, qty: 1 },
      ],
    });
    console.log(`  ✓ Created schedule: ${schedule1.title}`);

    // Schedule 2: Weekdays 22:00 - 1× Atorvastatin
    const schedule2RRule = new RRule({
      freq: RRule.WEEKLY,
      byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR],
      dtstart: DateTime.now().startOf('day').toJSDate(),
    });

    const schedule2 = await scheduleRepository.create({
      title: 'Evening Statin',
      times: ['22:00'],
      rrule: schedule2RRule.toString(),
      startDateISO: DateTime.now().startOf('day').toISO()!,
      lockoutMinutes: 60,
      snooze: {
        intervalMinutes: 10,
        maxSnoozes: 3,
      },
      items: [{ pillId: atorvastatin.id, qty: 1 }],
    });
    console.log(`  ✓ Created schedule: ${schedule2.title}`);

    console.log('Generating upcoming events...');
    const pillLookup = new Map(pills.map((pill) => [pill.id, pill]));
    const scheduleRecords = [schedule1, schedule2];
    const windowStart = DateTime.now().startOf('day');
    const windowEnd = windowStart.plus({ days: 7 }).endOf('day');

    for (const schedule of scheduleRecords) {
      const rrule = RRule.fromString(schedule.rrule);
      const occurrences = rrule.between(windowStart.toJSDate(), windowEnd.toJSDate(), true);
      const label =
        schedule.title ||
        schedule.items
          .map((item) => pillLookup.get(item.pillId)?.name ?? 'Dose')
          .join(', ');

      for (const occurrence of occurrences) {
        for (const time of schedule.times) {
          const [hour, minute] = time.split(':').map(Number);
          const dueAtISO = DateTime.fromJSDate(occurrence)
            .set({ hour, minute, second: 0, millisecond: 0 })
            .toISO()!;

          await eventLogRepository.create({
            dueAtISO,
            groupLabel: label,
            status: EventStatus.PENDING,
            detailsJSON: JSON.stringify({
              scheduleId: schedule.id,
              items: schedule.items,
              providerNotes:
                schedule.title === 'Morning Medication'
                  ? 'Take with breakfast'
                  : 'Take with water before bed',
            }),
          });
        }
      }
    }

    console.log('✅ Seeding complete!');
    console.log(`   ${pills.length} pills created`);
    console.log('   2 schedules created');
    console.log('   Upcoming events generated');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Only run if executed directly
if (require.main === module) {
  seed();
}

export { seed };



