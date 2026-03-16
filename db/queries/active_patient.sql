-- name: GetActivePatient :one
SELECT patient_id, updated_at
FROM active_patient
WHERE id = 1;

-- name: SetActivePatient :exec
INSERT INTO active_patient (id, patient_id, updated_at)
VALUES (1, ?, datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  patient_id = excluded.patient_id,
  updated_at = datetime('now');
