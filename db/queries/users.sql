-- name: ListUsers :many
SELECT
  id,
  email,
  full_name,
  phone,
  timezone,
  created_at,
  updated_at
FROM users
ORDER BY created_at DESC;

-- name: GetUser :one
SELECT
  id,
  email,
  full_name,
  phone,
  timezone,
  created_at,
  updated_at
FROM users
WHERE id = ?;

-- name: GetUserByEmail :one
SELECT
  id,
  email,
  full_name,
  phone,
  timezone,
  password_hash,
  created_at,
  updated_at
FROM users
WHERE email = ?;

-- name: CreateUser :one
INSERT INTO users (
  id,
  email,
  full_name,
  phone,
  timezone,
  password_hash
)
VALUES (?, ?, ?, ?, ?, ?)
RETURNING
  id,
  email,
  full_name,
  phone,
  timezone,
  password_hash,
  created_at,
  updated_at;

-- name: UpdateUser :one
UPDATE users
SET
  email = ?,
  full_name = ?,
  phone = ?,
  timezone = ?,
  password_hash = ?,
  updated_at = datetime('now')
WHERE id = ?
RETURNING
  id,
  email,
  full_name,
  phone,
  timezone,
  password_hash,
  created_at,
  updated_at;

