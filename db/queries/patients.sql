-- name: ListPatients :many
SELECT id, user_id, first_name, last_name, timezone, created_at, updated_at
FROM patients
ORDER BY created_at DESC;

-- name: ListPatientsByUser :many
SELECT id, user_id, first_name, last_name, timezone, created_at, updated_at
FROM patients
WHERE user_id = ?
ORDER BY created_at DESC;

-- name: GetPatient :one
SELECT id, user_id, first_name, last_name, timezone, created_at, updated_at
FROM patients
WHERE id = ?;

-- name: CreatePatient :one
INSERT INTO patients (id, user_id, first_name, last_name, timezone)
VALUES (?, ?, ?, ?, ?)
RETURNING id, user_id, first_name, last_name, timezone, created_at, updated_at;

-- name: UpdatePatient :one
UPDATE patients
SET
  user_id = ?,
  first_name = ?,
  last_name = ?,
  timezone = ?,
  updated_at = datetime('now')
WHERE id = ?
RETURNING id, user_id, first_name, last_name, timezone, created_at, updated_at;
