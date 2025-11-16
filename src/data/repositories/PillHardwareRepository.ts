import { getDatabase, generateId } from '../database';
import type { PillHardwareProfile } from '@types';

export class PillHardwareRepository {
  async getAll(): Promise<PillHardwareProfile[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM pill_hardware_profile');
    return rows.map(this.mapRow);
  }

  async getByPillId(pillId: string): Promise<PillHardwareProfile | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM pill_hardware_profile WHERE pill_id = ?',
      [pillId]
    );
    return row ? this.mapRow(row) : null;
  }

  async getBySerial(serial: string): Promise<PillHardwareProfile | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM pill_hardware_profile WHERE serial_number = ?',
      [serial]
    );
    return row ? this.mapRow(row) : null;
  }

  async upsert(profile: PillHardwareProfile): Promise<void> {
    const db = await getDatabase();
    const existing = await this.getByPillId(profile.pillId);

    if (existing) {
      await db.runAsync(
        `UPDATE pill_hardware_profile
         SET serial_number = ?, manufacturer = ?, form_factor = ?, diameter_mm = ?, length_mm = ?, width_mm = ?, height_mm = ?, weight_mg = ?, density_g_cm3 = ?, silo_slot = ?, trapdoor_open_ms = ?, trapdoor_hold_ms = ?
         WHERE pill_id = ?`,
        [
          profile.serialNumber,
          profile.manufacturer,
          profile.formFactor,
          profile.diameterMm,
          profile.lengthMm,
          profile.widthMm,
          profile.heightMm,
          profile.weightMg,
          profile.density,
          profile.siloSlot,
          profile.trapdoorOpenMs,
          profile.trapdoorHoldMs,
          profile.pillId,
        ]
      );
    } else {
      await db.runAsync(
        `INSERT INTO pill_hardware_profile
         (pill_id, serial_number, manufacturer, form_factor, diameter_mm, length_mm, width_mm, height_mm, weight_mg, density_g_cm3, silo_slot, trapdoor_open_ms, trapdoor_hold_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          profile.pillId,
          profile.serialNumber,
          profile.manufacturer,
          profile.formFactor,
          profile.diameterMm,
          profile.lengthMm,
          profile.widthMm,
          profile.heightMm,
          profile.weightMg,
          profile.density,
          profile.siloSlot,
          profile.trapdoorOpenMs,
          profile.trapdoorHoldMs,
        ]
      );
    }
  }

  async delete(pillId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM pill_hardware_profile WHERE pill_id = ?', [pillId]);
  }

  private mapRow(row: any): PillHardwareProfile {
    return {
      pillId: row.pill_id,
      serialNumber: row.serial_number,
      manufacturer: row.manufacturer ?? '',
      formFactor: row.form_factor ?? 'tablet',
      diameterMm: row.diameter_mm ?? null,
      lengthMm: row.length_mm ?? null,
      widthMm: row.width_mm ?? null,
      heightMm: row.height_mm ?? null,
      weightMg: row.weight_mg ?? null,
      density: row.density_g_cm3 ?? null,
      siloSlot: row.silo_slot ?? null,
      trapdoorOpenMs: row.trapdoor_open_ms ?? 1200,
      trapdoorHoldMs: row.trapdoor_hold_ms ?? 800,
    };
  }
}

export const pillHardwareRepository = new PillHardwareRepository();

