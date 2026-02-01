-- +goose Up
-- +goose StatementBegin
INSERT INTO users (id, email, full_name, phone, timezone)
VALUES
  ('user_demo_caregiver', 'caregiver@example.com', 'Care Giver', '+1-555-1000', 'America/New_York'),
  ('user_demo_patient', 'patient@example.com', 'Ava Stone', '+1-555-2000', 'America/New_York');

INSERT INTO patients (id, user_id, first_name, last_name, timezone)
VALUES
  ('patient_demo_001', 'user_demo_caregiver', 'Ava', 'Stone', 'America/New_York'),
  ('patient_demo_002', 'user_demo_patient', 'Leo', 'Nguyen', 'America/Chicago');

INSERT INTO medications (id, patient_id, name, color, stock_count, low_stock_threshold, cartridge_index, max_daily_dose)
VALUES
  ('med_demo_metformin', 'patient_demo_001', 'Metformin', '#6EE7B7', 60, 10, 0, 2),
  ('med_demo_atorvastatin', 'patient_demo_001', 'Atorvastatin', '#FBBF24', 90, 15, 1, 1),
  ('med_demo_lisinopril', 'patient_demo_002', 'Lisinopril', '#93C5FD', 45, 10, 2, 1);

INSERT INTO schedules (id, patient_id, title, timezone, rrule, start_date_iso, end_date_iso, lockout_minutes, status)
VALUES
  ('sched_demo_morning', 'patient_demo_001', 'Morning Routine', 'America/New_York', 'RRULE:FREQ=DAILY', '2025-01-01T08:00:00Z', null, 60, 'ACTIVE'),
  ('sched_demo_evening', 'patient_demo_001', 'Evening Cholesterol', 'America/New_York', 'RRULE:FREQ=DAILY', '2025-01-01T21:00:00Z', null, 90, 'ACTIVE'),
  ('sched_demo_central', 'patient_demo_002', 'Central Time Morning', 'America/Chicago', 'RRULE:FREQ=DAILY', '2025-01-01T07:30:00Z', null, 60, 'ACTIVE');

INSERT INTO schedule_items (id, schedule_id, medication_id, qty)
VALUES
  ('sched_item_demo_001', 'sched_demo_morning', 'med_demo_metformin', 1),
  ('sched_item_demo_002', 'sched_demo_morning', 'med_demo_atorvastatin', 1),
  ('sched_item_demo_003', 'sched_demo_evening', 'med_demo_atorvastatin', 1),
  ('sched_item_demo_004', 'sched_demo_central', 'med_demo_lisinopril', 1);

INSERT INTO dispense_events (id, patient_id, schedule_id, due_at_iso, acted_at_iso, status, action_source)
VALUES
  ('event_demo_001', 'patient_demo_001', 'sched_demo_morning', '2025-02-01T13:00:00Z', '2025-02-01T13:02:00Z', 'TAKEN', 'SANDBOX'),
  ('event_demo_002', 'patient_demo_001', 'sched_demo_evening', '2025-02-01T02:00:00Z', null, 'PENDING', 'SANDBOX'),
  ('event_demo_003', 'patient_demo_002', 'sched_demo_central', '2025-02-02T13:30:00Z', null, 'PENDING', 'SANDBOX');
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM dispense_events WHERE id IN ('event_demo_001', 'event_demo_002', 'event_demo_003');
DELETE FROM schedule_items WHERE id IN ('sched_item_demo_001', 'sched_item_demo_002', 'sched_item_demo_003', 'sched_item_demo_004');
DELETE FROM schedules WHERE id IN ('sched_demo_morning', 'sched_demo_evening', 'sched_demo_central');
DELETE FROM medications WHERE id IN ('med_demo_metformin', 'med_demo_atorvastatin', 'med_demo_lisinopril');
DELETE FROM patients WHERE id IN ('patient_demo_001', 'patient_demo_002');
DELETE FROM users WHERE id IN ('user_demo_caregiver', 'user_demo_patient');
-- +goose StatementEnd
