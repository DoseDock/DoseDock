-- name: ListMedicationsByPatient :many
SELECT *
FROM medications
WHERE patient_id = ?
ORDER BY name;

-- name: GetMedication :one
SELECT *
FROM medications
WHERE id = ?;

-- name: CreateMedication :one
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
  external_id,
  max_daily_dose,
  metadata
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
RETURNING *;

-- name: UpdateMedication :one
UPDATE medications
SET
  name = ?,
  nickname = ?,
  color = ?,
  shape = ?,
  dosage_form = ?,
  strength = ?,
  dosage_mg = ?,
  instructions = ?,
  stock_count = ?,
  low_stock_threshold = ?,
  cartridge_index = ?,
  manufacturer = ?,
  external_id = ?,
  max_daily_dose = ?,
  metadata = ?,
  updated_at = datetime('now')
WHERE id = ?
RETURNING *;

-- name: DeleteMedication :exec
DELETE FROM medications
WHERE id = ?;

