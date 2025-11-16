import * as SQLite from 'expo-sqlite';
import { SCHEMA_VERSION, MIGRATIONS } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  db = await SQLite.openDatabaseAsync('pillbox.db');
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  // Get current schema version
  let currentVersion = 0;
  try {
    const result = await database.getFirstAsync<{ user_version: number }>(
      'PRAGMA user_version'
    );
    currentVersion = result?.user_version || 0;
  } catch (error) {
    console.error('Error getting schema version:', error);
  }

  // Run migrations
  if (currentVersion < SCHEMA_VERSION) {
    console.log(`Migrating database from version ${currentVersion} to ${SCHEMA_VERSION}`);

    for (let version = currentVersion + 1; version <= SCHEMA_VERSION; version++) {
      const migration = MIGRATIONS[version];
      if (migration) {
        console.log(`Running migration ${version}...`);
        await database.execAsync(migration);
      }
    }

    // Update schema version
    await database.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    console.log('Database migration complete');
  }
}

export async function resetDatabase(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    DROP TABLE IF EXISTS event_log;
    DROP TABLE IF EXISTS schedule_item;
    DROP TABLE IF EXISTS schedule;
    DROP TABLE IF EXISTS pill;
    PRAGMA user_version = 0;
  `);
  await initializeDatabase(database);
}

// Helper to generate UUIDs (simple implementation)
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}



