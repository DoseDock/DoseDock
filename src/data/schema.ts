// Database schema definitions
export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = `
-- Pill table
CREATE TABLE IF NOT EXISTS pill (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  shape TEXT NOT NULL,
  cartridge_index INTEGER NOT NULL UNIQUE,
  max_daily_dose INTEGER NOT NULL,
  stock_count INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  created_at INTEGER NOT NULL
);

-- Schedule table
CREATE TABLE IF NOT EXISTS schedule (
  id TEXT PRIMARY KEY,
  title TEXT,
  lockout_minutes INTEGER NOT NULL DEFAULT 60,
  snooze_interval_minutes INTEGER NOT NULL DEFAULT 10,
  snooze_max INTEGER NOT NULL DEFAULT 3,
  start_date_iso TEXT NOT NULL,
  end_date_iso TEXT,
  rrule TEXT NOT NULL,
  times_json TEXT NOT NULL
);

-- Schedule item junction table (many-to-many between schedule and pill)
CREATE TABLE IF NOT EXISTS schedule_item (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  pill_id TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (schedule_id) REFERENCES schedule(id) ON DELETE CASCADE,
  FOREIGN KEY (pill_id) REFERENCES pill(id) ON DELETE CASCADE
);

-- Event log for adherence tracking
CREATE TABLE IF NOT EXISTS event_log (
  id TEXT PRIMARY KEY,
  due_at_iso TEXT NOT NULL,
  group_label TEXT NOT NULL,
  status TEXT NOT NULL,
  acted_at_iso TEXT,
  details_json TEXT NOT NULL DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedule_item_schedule ON schedule_item(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_item_pill ON schedule_item(pill_id);
CREATE INDEX IF NOT EXISTS idx_event_log_due_at ON event_log(due_at_iso);
CREATE INDEX IF NOT EXISTS idx_event_log_status ON event_log(status);
`;

export const MIGRATIONS: Record<number, string> = {
  1: CREATE_TABLES_SQL,
};

