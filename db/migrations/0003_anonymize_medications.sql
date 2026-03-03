-- +goose Up
-- +goose StatementBegin

-- Rename 'name' column to 'label' for anonymization
-- After this migration, the column becomes nullable (SQLite behavior after ALTER RENAME)
ALTER TABLE medications RENAME COLUMN name TO label;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE medications RENAME COLUMN label TO name;

-- +goose StatementEnd
