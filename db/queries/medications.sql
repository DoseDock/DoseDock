-- name: ListMedicationsByPatient :many
SELECT * FROM medications
WHERE patient_id = ?
ORDER BY cartridge_index;

-- name: GetMedication :one
SELECT * FROM medications
WHERE id = ?;

-- name: CreateMedication :one
INSERT INTO medications (id, patient_id, label, color, stock_count, low_stock_threshold, cartridge_index, max_daily_dose)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
RETURNING *;

-- name: UpdateMedication :one
UPDATE medications
SET
  label = ?,
  color = ?,
  stock_count = ?,
  low_stock_threshold = ?,
  cartridge_index = ?,
  max_daily_dose = ?,
  updated_at = datetime('now')
WHERE id = ?
RETURNING *;

-- name: DeleteMedication :exec
DELETE FROM medications
WHERE id = ?;
