import { getDatabase, generateId } from '../database';
import type { Pill } from '@types';

export class PillRepository {
  async getAll(): Promise<Pill[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM pill ORDER BY cartridge_index ASC');
    return rows.map(this.mapRow);
  }

  async getById(id: string): Promise<Pill | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>('SELECT * FROM pill WHERE id = ?', [id]);
    return row ? this.mapRow(row) : null;
  }

  async getByCartridgeIndex(index: number): Promise<Pill | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM pill WHERE cartridge_index = ?',
      [index]
    );
    return row ? this.mapRow(row) : null;
  }

  async create(pill: Omit<Pill, 'id' | 'createdAt'>): Promise<Pill> {
    const db = await getDatabase();
    const id = generateId();
    const createdAt = Date.now();

    await db.runAsync(
      `INSERT INTO pill (id, name, color, shape, cartridge_index, max_daily_dose, stock_count, low_stock_threshold, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        pill.name,
        pill.color,
        pill.shape,
        pill.cartridgeIndex,
        pill.maxDailyDose,
        pill.stockCount,
        pill.lowStockThreshold,
        createdAt,
      ]
    );

    return { ...pill, id, createdAt };
  }

  async update(id: string, updates: Partial<Omit<Pill, 'id' | 'createdAt'>>): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.shape !== undefined) {
      fields.push('shape = ?');
      values.push(updates.shape);
    }
    if (updates.cartridgeIndex !== undefined) {
      fields.push('cartridge_index = ?');
      values.push(updates.cartridgeIndex);
    }
    if (updates.maxDailyDose !== undefined) {
      fields.push('max_daily_dose = ?');
      values.push(updates.maxDailyDose);
    }
    if (updates.stockCount !== undefined) {
      fields.push('stock_count = ?');
      values.push(updates.stockCount);
    }
    if (updates.lowStockThreshold !== undefined) {
      fields.push('low_stock_threshold = ?');
      values.push(updates.lowStockThreshold);
    }

    if (fields.length === 0) return;

    values.push(id);
    await db.runAsync(`UPDATE pill SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM pill WHERE id = ?', [id]);
  }

  async decrementStock(id: string, amount: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE pill SET stock_count = stock_count - ? WHERE id = ?', [amount, id]);
  }

  private mapRow(row: any): Pill {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      shape: row.shape,
      cartridgeIndex: row.cartridge_index,
      maxDailyDose: row.max_daily_dose,
      stockCount: row.stock_count,
      lowStockThreshold: row.low_stock_threshold,
      createdAt: row.created_at,
    };
  }
}

export const pillRepository = new PillRepository();

