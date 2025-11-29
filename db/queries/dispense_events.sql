-- name: ListDispenseEventsByPatient :many
SELECT
  id,
  patient_id,
  schedule_id,
  schedule_item_id,
  due_at_iso,
  acted_at_iso,
  status,
  action_source,
  notes,
  metadata,
  created_at
FROM dispense_events
WHERE patient_id = ?
  AND due_at_iso >= ?
  AND due_at_iso <= ?
ORDER BY due_at_iso DESC;

-- name: GetDispenseEvent :one
SELECT
  id,
  patient_id,
  schedule_id,
  schedule_item_id,
  due_at_iso,
  acted_at_iso,
  status,
  action_source,
  notes,
  metadata,
  created_at
FROM dispense_events
WHERE id = ?;

-- name: CreateDispenseEvent :one
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
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
RETURNING
  id,
  patient_id,
  schedule_id,
  schedule_item_id,
  due_at_iso,
  acted_at_iso,
  status,
  action_source,
  notes,
  metadata,
  created_at;

-- name: UpdateDispenseEvent :one
UPDATE dispense_events
SET
  patient_id = ?,
  schedule_id = ?,
  schedule_item_id = ?,
  due_at_iso = ?,
  acted_at_iso = ?,
  status = ?,
  action_source = ?,
  notes = ?,
  metadata = ?
WHERE id = ?
RETURNING
  id,
  patient_id,
  schedule_id,
  schedule_item_id,
  due_at_iso,
  acted_at_iso,
  status,
  action_source,
  notes,
  metadata,
  created_at;

