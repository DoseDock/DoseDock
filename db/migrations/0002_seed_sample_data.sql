-- +goose Up
-- +goose StatementBegin
INSERT INTO users (id, email, full_name, phone, timezone)
VALUES
  ('user_demo_caregiver', 'caregiver@example.com', 'Care Giver', '+1-555-1000', 'America/New_York'),
  ('user_demo_patient', 'patient@example.com', 'Ava Stone', '+1-555-2000', 'America/New_York');

INSERT INTO patients (
  id,
  user_id,
  first_name,
  last_name,
  date_of_birth,
  gender,
  timezone,
  preferred_language,
  caregiver_name,
  caregiver_email,
  caregiver_phone,
  notes,
  metadata
)
VALUES
  (
    'patient_demo_001',
    'user_demo_caregiver',
    'Ava',
    'Stone',
    '1990-04-12',
    'FEMALE',
    'America/New_York',
    'en',
    'Care Giver',
    'caregiver@example.com',
    '+1-555-1000',
    'Demo patient used for sandbox queries.',
    json_object('riskLevel', 'medium', 'tags', json_array('demo', 'primary'))
  ),
  (
    'patient_demo_002',
    'user_demo_patient',
    'Leo',
    'Nguyen',
    '1986-09-02',
    'MALE',
    'America/Chicago',
    'en',
    null,
    null,
    null,
    'Second patient with a different timezone.',
    json_object('riskLevel', 'low')
  );

INSERT INTO medications (
  id,
  patient_id,
  name,
  nickname,
  color,
  shape,
  dosage_form,
  strength,
  dosage_mg,
  instructions,
  stock_count,
  low_stock_threshold,
  cartridge_index,
  manufacturer,
  external_id
)
VALUES
  ('med_demo_metformin', 'patient_demo_001', 'Metformin', 'Met', '#6EE7B7', 'round', 'tablet', '500mg', 500, 'Take with breakfast.', 60, 10, 0, 'HealthCo', 'RX-METFORMIN'),
  ('med_demo_atorvastatin', 'patient_demo_001', 'Atorvastatin', 'Atorva', '#FBBF24', 'oval', 'tablet', '20mg', 20, 'Take before bed.', 90, 15, 1, 'HealthCo', 'RX-ATORVA'),
  ('med_demo_lisinopril', 'patient_demo_002', 'Lisinopril', 'Lisi', '#93C5FD', 'round', 'tablet', '10mg', 10, 'Morning dose with water.', 45, 10, 2, 'HealthCo', 'RX-LISINO');

INSERT INTO schedules (
  id,
  patient_id,
  title,
  timezone,
  rrule,
  start_date_iso,
  end_date_iso,
  lockout_minutes,
  snooze_interval_minutes,
  snooze_max,
  status,
  notes,
  metadata
)
VALUES
  (
    'sched_demo_morning',
    'patient_demo_001',
    'Morning Routine',
    'America/New_York',
    'RRULE:FREQ=DAILY',
    '2025-01-01T08:00:00Z',
    null,
    60,
    10,
    3,
    'ACTIVE',
    'Default morning medications.',
    json_object('category', 'routine')
  ),
  (
    'sched_demo_evening',
    'patient_demo_001',
    'Evening Cholesterol',
    'America/New_York',
    'RRULE:FREQ=DAILY',
    '2025-01-01T21:00:00Z',
    null,
    90,
    15,
    2,
    'ACTIVE',
    'Single nightly statin dose.',
    json_object('category', 'cholesterol')
  ),
  (
    'sched_demo_central',
    'patient_demo_002',
    'Central Time Morning',
    'America/Chicago',
    'RRULE:FREQ=DAILY',
    '2025-01-01T07:30:00Z',
    null,
    60,
    10,
    3,
    'ACTIVE',
    'Midwest patient routine.',
    json_object('category', 'routine')
  );

INSERT INTO schedule_items (id, schedule_id, medication_id, qty, instructions)
VALUES
  ('sched_item_demo_001', 'sched_demo_morning', 'med_demo_metformin', 1, 'Take with food.'),
  ('sched_item_demo_002', 'sched_demo_morning', 'med_demo_atorvastatin', 1, 'Swallow whole.'),
  ('sched_item_demo_003', 'sched_demo_evening', 'med_demo_atorvastatin', 1, 'Take before bed.'),
  ('sched_item_demo_004', 'sched_demo_central', 'med_demo_lisinopril', 1, 'With water.');

INSERT INTO dispense_events (
  id,
  patient_id,
  schedule_id,
  schedule_item_id,
  due_at_iso,
  acted_at_iso,
  status,
  action_source,
  notes,
  metadata
)
VALUES
  (
    'event_demo_001',
    'patient_demo_001',
    'sched_demo_morning',
    'sched_item_demo_001',
    '2025-02-01T13:00:00Z',
    '2025-02-01T13:02:00Z',
    'TAKEN',
    'SANDBOX',
    'Initial test dose.',
    json_object('enteredBy', 'migration')
  ),
  (
    'event_demo_002',
    'patient_demo_001',
    'sched_demo_evening',
    'sched_item_demo_003',
    '2025-02-01T02:00:00Z',
    null,
    'PENDING',
    'SANDBOX',
    'Awaiting confirmation.',
    json_object('enteredBy', 'migration')
  ),
  (
    'event_demo_003',
    'patient_demo_002',
    'sched_demo_central',
    'sched_item_demo_004',
    '2025-02-02T13:30:00Z',
    null,
    'PENDING',
    'SANDBOX',
    'Central time patient upcoming dose.',
    json_object('enteredBy', 'migration')
  );
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

