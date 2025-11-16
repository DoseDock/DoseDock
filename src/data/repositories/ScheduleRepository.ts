import { getDatabase, generateId } from '../database';
import type { Schedule, ScheduleItem } from '@types';
import {
  memoryGetSchedules,
  memoryFindSchedule,
  memoryAddSchedule,
  memoryUpdateSchedule,
  memoryDeleteSchedule,
} from '../memoryStore';

export class ScheduleRepository {
  async getAll(): Promise<Schedule[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<any>('SELECT * FROM schedule');
      const schedules = await Promise.all(rows.map((row) => this.mapRow(row)));
      return schedules;
    } catch (error) {
      console.warn('[ScheduleRepository] Falling back to in-memory schedules:', error);
      return memoryGetSchedules();
    }
  }

  async getById(id: string): Promise<Schedule | null> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<any>('SELECT * FROM schedule WHERE id = ?', [id]);
      return row ? await this.mapRow(row) : null;
    } catch (error) {
      console.warn('[ScheduleRepository] getById fallback:', error);
      return memoryFindSchedule(id) || null;
    }
  }

  async create(schedule: Omit<Schedule, 'id'>): Promise<Schedule> {
    const id = generateId();
    try {
      const db = await getDatabase();

      await db.runAsync(
        `INSERT INTO schedule (id, title, lockout_minutes, snooze_interval_minutes, snooze_max, start_date_iso, end_date_iso, rrule, times_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          schedule.title || null,
          schedule.lockoutMinutes,
          schedule.snooze.intervalMinutes,
          schedule.snooze.maxSnoozes,
          schedule.startDateISO,
          schedule.endDateISO || null,
          schedule.rrule,
          JSON.stringify(schedule.times),
        ]
      );

      for (const item of schedule.items) {
        const itemId = generateId();
        await db.runAsync(
          'INSERT INTO schedule_item (id, schedule_id, pill_id, qty) VALUES (?, ?, ?, ?)',
          [itemId, id, item.pillId, item.qty]
        );
      }

      return { ...schedule, id };
    } catch (error) {
      console.warn('[ScheduleRepository] create fallback:', error);
      const fallbackSchedule: Schedule = { ...schedule, id };
      memoryAddSchedule(fallbackSchedule);
      return fallbackSchedule;
    }
  }

  async update(id: string, updates: Partial<Omit<Schedule, 'id'>>): Promise<void> {
    try {
      const db = await getDatabase();
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.title !== undefined) {
        fields.push('title = ?');
        values.push(updates.title);
      }
      if (updates.lockoutMinutes !== undefined) {
        fields.push('lockout_minutes = ?');
        values.push(updates.lockoutMinutes);
      }
      if (updates.snooze !== undefined) {
        fields.push('snooze_interval_minutes = ?, snooze_max = ?');
        values.push(updates.snooze.intervalMinutes, updates.snooze.maxSnoozes);
      }
      if (updates.startDateISO !== undefined) {
        fields.push('start_date_iso = ?');
        values.push(updates.startDateISO);
      }
      if (updates.endDateISO !== undefined) {
        fields.push('end_date_iso = ?');
        values.push(updates.endDateISO);
      }
      if (updates.rrule !== undefined) {
        fields.push('rrule = ?');
        values.push(updates.rrule);
      }
      if (updates.times !== undefined) {
        fields.push('times_json = ?');
        values.push(JSON.stringify(updates.times));
      }

      if (fields.length > 0) {
        values.push(id);
        await db.runAsync(`UPDATE schedule SET ${fields.join(', ')} WHERE id = ?`, values);
      }

      if (updates.items) {
        await db.runAsync('DELETE FROM schedule_item WHERE schedule_id = ?', [id]);
        for (const item of updates.items) {
          const itemId = generateId();
          await db.runAsync(
            'INSERT INTO schedule_item (id, schedule_id, pill_id, qty) VALUES (?, ?, ?, ?)',
            [itemId, id, item.pillId, item.qty]
          );
        }
      }
    } catch (error) {
      console.warn('[ScheduleRepository] update fallback:', error);
      memoryUpdateSchedule(id, updates);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM schedule WHERE id = ?', [id]);
    } catch (error) {
      console.warn('[ScheduleRepository] delete fallback:', error);
      memoryDeleteSchedule(id);
    }
  }

  async getItems(scheduleId: string): Promise<ScheduleItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM schedule_item WHERE schedule_id = ?',
      [scheduleId]
    );
    return rows.map((row) => ({
      id: row.id,
      scheduleId: row.schedule_id,
      pillId: row.pill_id,
      qty: row.qty,
    }));
  }

  private async mapRow(row: any): Promise<Schedule> {
    const items = await this.getItems(row.id);
    return {
      id: row.id,
      title: row.title,
      lockoutMinutes: row.lockout_minutes,
      snooze: {
        intervalMinutes: row.snooze_interval_minutes,
        maxSnoozes: row.snooze_max,
      },
      startDateISO: row.start_date_iso,
      endDateISO: row.end_date_iso,
      rrule: row.rrule,
      times: JSON.parse(row.times_json),
      items: items.map((item) => ({ pillId: item.pillId, qty: item.qty })),
    };
  }
}

export const scheduleRepository = new ScheduleRepository();



