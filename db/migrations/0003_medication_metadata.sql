-- +goose Up
-- +goose StatementBegin
ALTER TABLE medications ADD COLUMN max_daily_dose INTEGER NOT NULL DEFAULT 1;
ALTER TABLE medications ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE medications DROP COLUMN metadata;
ALTER TABLE medications DROP COLUMN max_daily_dose;
-- +goose StatementEnd


