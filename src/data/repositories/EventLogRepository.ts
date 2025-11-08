import { getDatabase, generateId } from '../database';
import type { EventLog, EventStatus } from '@types';

export class EventLogRepository {
  async getAll(): Promise<EventLog[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM event_log ORDER BY due_at_iso DESC');
    return rows.map(this.mapRow);
  }

  async getById(id: string): Promise<EventLog | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>('SELECT * FROM event_log WHERE id = ?', [id]);
    return row ? this.mapRow(row) : null;
  }

  async getByDateRange(startISO: string, endISO: string): Promise<EventLog[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM event_log WHERE due_at_iso >= ? AND due_at_iso <= ? ORDER BY due_at_iso ASC',
      [startISO, endISO]
    );
    return rows.map(this.mapRow);
  }

  async getByStatus(status: EventStatus): Promise<EventLog[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM event_log WHERE status = ? ORDER BY due_at_iso DESC',
      [status]
    );
    return rows.map(this.mapRow);
  }

  async getTodayEvents(todayStartISO: string, todayEndISO: string): Promise<EventLog[]> {
    return this.getByDateRange(todayStartISO, todayEndISO);
  }

  async create(event: Omit<EventLog, 'id'>): Promise<EventLog> {
    const db = await getDatabase();
    const id = generateId();

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
  }

  async update(
    id: string,
    updates: Partial<Omit<EventLog, 'id' | 'dueAtISO' | 'groupLabel'>>
  ): Promise<void> {
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
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM event_log WHERE id = ?', [id]);
  }

  async deleteByDateRange(startISO: string, endISO: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'DELETE FROM event_log WHERE due_at_iso >= ? AND due_at_iso <= ?',
      [startISO, endISO]
    );
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

