-- +goose Up
-- +goose StatementBegin

-- Single-row table to track the most recently signed up patient
-- Used by Raspberry Pi firmware to know which patient to operate on
CREATE TABLE IF NOT EXISTS active_patient (
  id INTEGER PRIMARY KEY CHECK (id = 1),  -- Ensures only one row
  patient_id TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS active_patient;

-- +goose StatementEnd
