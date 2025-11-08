#!/usr/bin/env tsx
import { getDatabase } from './database';

async function migrate() {
  console.log('Starting database migration...');
  try {
    await getDatabase();
    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Only run if executed directly
if (require.main === module) {
  migrate();
}

export { migrate };

