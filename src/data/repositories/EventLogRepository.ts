import { getDatabase, generateId } from '../database';
import type { EventLog, EventStatus } from '@types';
import {
  memoryGetEvents,
  memoryFindEvent,
  memoryAddEvent,
  memoryUpdateEvent,
  memoryDeleteEvent,
  memoryEventsByDateRange,
  memoryDeleteEventsByDateRange,
} from '../memoryStore';

export class EventLogRepository {
  async getAll(): Promise<EventLog[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<any>('SELECT * FROM event_log ORDER BY due_at_iso DESC');
      return rows.map(this.mapRow);
    } catch (error) {
      console.warn('[EventLogRepository] getAll fallback:', error);
      return memoryGetEvents();
    }
  }

  async getById(id: string): Promise<EventLog | null> {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<any>('SELECT * FROM event_log WHERE id = ?', [id]);
      return row ? this.mapRow(row) : null;
    } catch (error) {
      console.warn('[EventLogRepository] getById fallback:', error);
      return memoryFindEvent(id) || null;
    }
  }

  async getByDateRange(startISO: string, endISO: string): Promise<EventLog[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<any>(
        'SELECT * FROM event_log WHERE due_at_iso >= ? AND due_at_iso <= ? ORDER BY due_at_iso ASC',
        [startISO, endISO]
      );
      return rows.map(this.mapRow);
    } catch (error) {
      console.warn('[EventLogRepository] getByDateRange fallback:', error);
      return memoryEventsByDateRange(startISO, endISO);
    }
  }

  async getByStatus(status: EventStatus): Promise<EventLog[]> {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<any>(
        'SELECT * FROM event_log WHERE status = ? ORDER BY due_at_iso DESC',
        [status]
      );
      return rows.map(this.mapRow);
    } catch (error) {
      console.warn('[EventLogRepository] getByStatus fallback:', error);
      return memoryGetEvents().filter((event) => event.status === status);
    }
  }

  async getTodayEvents(todayStartISO: string, todayEndISO: string): Promise<EventLog[]> {
    return this.getByDateRange(todayStartISO, todayEndISO);
  }

  async create(event: Omit<EventLog, 'id'>): Promise<EventLog> {
    const id = generateId();
    try {
      const db = await getDatabase();

      await db.runAsync(
        `INSERT INTO event_log (id, due_at_iso, group_label, status, acted_at_iso, details_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          event.dueAtISO,
          event.groupLabel,
          event.status,
          event.actedAtISO || null,
          event.detailsJSON,
        ]
      );

      return { ...event, id };
    } catch (error) {
      console.warn('[EventLogRepository] create fallback:', error);
      const fallbackEvent: EventLog = { ...event, id };
      memoryAddEvent(fallbackEvent);
      return fallbackEvent;
    }
  }

  async update(
    id: string,
    updates: Partial<Omit<EventLog, 'id' | 'dueAtISO' | 'groupLabel'>>
  ): Promise<void> {
    try {
      const db = await getDatabase();
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      if (updates.actedAtISO !== undefined) {
        fields.push('acted_at_iso = ?');
        values.push(updates.actedAtISO);
      }
      if (updates.detailsJSON !== undefined) {
        fields.push('details_json = ?');
        values.push(updates.detailsJSON);
      }

      if (fields.length === 0) return;

      values.push(id);
      await db.runAsync(`UPDATE event_log SET ${fields.join(', ')} WHERE id = ?`, values);
    } catch (error) {
      console.warn('[EventLogRepository] update fallback:', error);
      memoryUpdateEvent(id, updates as EventLog);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM event_log WHERE id = ?', [id]);
    } catch (error) {
      console.warn('[EventLogRepository] delete fallback:', error);
      memoryDeleteEvent(id);
    }
  }

  async deleteByDateRange(startISO: string, endISO: string): Promise<void> {
    try {
      const db = await getDatabase();
      await db.runAsync(
        'DELETE FROM event_log WHERE due_at_iso >= ? AND due_at_iso <= ?',
        [startISO, endISO]
      );
    } catch (error) {
      console.warn('[EventLogRepository] deleteByDateRange fallback:', error);
      memoryDeleteEventsByDateRange(startISO, endISO);
    }
  }

  private mapRow(row: any): EventLog {
    return {
      id: row.id,
      dueAtISO: row.due_at_iso,
      groupLabel: row.group_label,
      status: row.status as EventStatus,
      actedAtISO: row.acted_at_iso,
      detailsJSON: row.details_json,
    };
  }
}

export const eventLogRepository = new EventLogRepository();



