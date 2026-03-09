-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS notification_events (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  schedule_id TEXT NOT NULL,
  user_id TEXT,
  due_at_iso TEXT NOT NULL,
  channel TEXT NOT NULL,
  destination TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
  FOREIGN KEY (schedule_id) REFERENCES schedules (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_events_unique_send
  ON notification_events (patient_id, schedule_id, due_at_iso, channel);

CREATE INDEX IF NOT EXISTS idx_notification_events_patient
  ON notification_events (patient_id);

CREATE INDEX IF NOT EXISTS idx_notification_events_schedule
  ON notification_events (schedule_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_notification_events_schedule;
DROP INDEX IF EXISTS idx_notification_events_patient;
DROP INDEX IF EXISTS idx_notification_events_unique_send;
DROP TABLE IF EXISTS notification_events;

-- +goose StatementEnd