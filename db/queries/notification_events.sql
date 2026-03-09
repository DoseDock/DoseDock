-- name: CreateNotificationEvent :one
INSERT INTO notification_events (
  id,
  patient_id,
  schedule_id,
  user_id,
  due_at_iso,
  channel,
  destination,
  message,
  status,
  provider_message_id,
  error_message
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
RETURNING
  id,
  patient_id,
  schedule_id,
  user_id,
  due_at_iso,
  channel,
  destination,
  message,
  status,
  provider_message_id,
  error_message,
  created_at;

-- name: GetNotificationEventByOccurrence :one
SELECT
  id,
  patient_id,
  schedule_id,
  user_id,
  due_at_iso,
  channel,
  destination,
  message,
  status,
  provider_message_id,
  error_message,
  created_at
FROM notification_events
WHERE patient_id = ?
  AND schedule_id = ?
  AND due_at_iso = ?
  AND channel = ?;

-- name: ListNotificationEventsByPatient :many
SELECT
  id,
  patient_id,
  schedule_id,
  user_id,
  due_at_iso,
  channel,
  destination,
  message,
  status,
  provider_message_id,
  error_message,
  created_at
FROM notification_events
WHERE patient_id = ?
ORDER BY created_at DESC;