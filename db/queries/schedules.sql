-- name: ListSchedulesByPatient :many
SELECT
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
  metadata,
  created_at,
  updated_at
FROM schedules
WHERE patient_id = ?
ORDER BY created_at DESC;

-- name: GetSchedule :one
SELECT
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
  metadata,
  created_at,
  updated_at
FROM schedules
WHERE id = ?;

-- name: CreateSchedule :one
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
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
RETURNING
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
  metadata,
  created_at,
  updated_at;

-- name: UpdateSchedule :one
UPDATE schedules
SET
  title = ?,
  timezone = ?,
  rrule = ?,
  start_date_iso = ?,
  end_date_iso = ?,
  lockout_minutes = ?,
  snooze_interval_minutes = ?,
  snooze_max = ?,
  status = ?,
  notes = ?,
  metadata = ?,
  updated_at = datetime('now')
WHERE id = ?
RETURNING
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
  metadata,
  created_at,
  updated_at;

-- name: ArchiveSchedule :one
UPDATE schedules
SET
  status = 'ARCHIVED',
  updated_at = datetime('now')
WHERE id = ?
RETURNING
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
  metadata,
  created_at,
  updated_at;

-- name: DeleteScheduleItemsBySchedule :exec
DELETE FROM schedule_items
WHERE schedule_id = ?;

-- name: CreateScheduleItem :one
INSERT INTO schedule_items (
  id,
  schedule_id,
  medication_id,
  qty,
  instructions
)
VALUES (?, ?, ?, ?, ?)
RETURNING
  id,
  schedule_id,
  medication_id,
  qty,
  instructions;

-- name: ListScheduleItemsBySchedule :many
SELECT
  si.id AS schedule_item_id,
  si.schedule_id,
  si.medication_id AS schedule_medication_id,
  si.qty,
  si.instructions AS schedule_item_instructions,
  m.id AS medication_id,
  m.patient_id AS medication_patient_id,
  m.name AS medication_name,
  m.nickname AS medication_nickname,
  m.color AS medication_color,
  m.shape AS medication_shape,
  m.dosage_form AS medication_dosage_form,
  m.strength AS medication_strength,
  m.dosage_mg AS medication_dosage_mg,
  m.instructions AS medication_instructions,
  m.stock_count AS medication_stock_count,
  m.low_stock_threshold AS medication_low_stock_threshold,
  m.cartridge_index AS medication_cartridge_index,
  m.manufacturer AS medication_manufacturer,
  m.external_id AS medication_external_id,
  m.max_daily_dose AS medication_max_daily_dose,
  m.metadata AS medication_metadata,
  m.created_at AS medication_created_at,
  m.updated_at AS medication_updated_at
FROM schedule_items si
JOIN medications m ON m.id = si.medication_id
WHERE si.schedule_id = ?
ORDER BY m.name;

