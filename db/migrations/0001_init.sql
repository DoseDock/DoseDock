-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth TEXT,
  gender TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  preferred_language TEXT,
  caregiver_name TEXT,
  caregiver_email TEXT,
  caregiver_phone TEXT,
  notes TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS medications (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  name TEXT NOT NULL,
  nickname TEXT,
  color TEXT,
  shape TEXT,
  dosage_form TEXT,
  strength TEXT,
  dosage_mg INTEGER,
  instructions TEXT,
  stock_count INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 0,
  cartridge_index INTEGER,
  manufacturer TEXT,
  external_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  title TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  rrule TEXT NOT NULL,
  start_date_iso TEXT NOT NULL,
  end_date_iso TEXT,
  lockout_minutes INTEGER NOT NULL DEFAULT 60,
  snooze_interval_minutes INTEGER NOT NULL DEFAULT 10,
  snooze_max INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS schedule_items (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  medication_id TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  instructions TEXT,
  FOREIGN KEY (schedule_id) REFERENCES schedules (id) ON DELETE CASCADE,
  FOREIGN KEY (medication_id) REFERENCES medications (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dispense_events (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  schedule_id TEXT NOT NULL,
  schedule_item_id TEXT,
  due_at_iso TEXT NOT NULL,
  acted_at_iso TEXT,
  status TEXT NOT NULL,
  action_source TEXT,
  notes TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
  FOREIGN KEY (schedule_id) REFERENCES schedules (id) ON DELETE CASCADE,
  FOREIGN KEY (schedule_item_id) REFERENCES schedule_items (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS patient_tags (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients (user_id);
CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications (patient_id);
CREATE INDEX IF NOT EXISTS idx_schedules_patient ON schedules (patient_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_schedule ON schedule_items (schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_medication ON schedule_items (medication_id);
CREATE INDEX IF NOT EXISTS idx_dispense_events_patient ON dispense_events (patient_id);
CREATE INDEX IF NOT EXISTS idx_dispense_events_schedule ON dispense_events (schedule_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS patient_tags;
DROP TABLE IF EXISTS dispense_events;
DROP TABLE IF EXISTS schedule_items;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS medications;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS users;
-- +goose StatementEnd

