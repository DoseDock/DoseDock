.PHONY: migrate-up migrate-down migrate-create sql graphql serve test test-coverage

DB_PATH ?= ./db/backend.db
MIGRATIONS_DIR ?= ./db/migrations
GOOSE_DRIVER ?= sqlite3

migrate-up:
	goose -dir $(MIGRATIONS_DIR) $(GOOSE_DRIVER) $(DB_PATH) up

migrate-down:
	goose -dir $(MIGRATIONS_DIR) $(GOOSE_DRIVER) $(DB_PATH) down

migrate-create:
	@if [ -z "$(name)" ]; then \
		echo "Usage: make migrate-create name=add_new_table"; \
		exit 1; \
	fi
	goose -dir $(MIGRATIONS_DIR) create $(name) sql

sql:
	sqlc generate

graphql:
	go run github.com/99designs/gqlgen generate

serve:
	go run server.go

test:
	go test ./graph/... -v

test-coverage:
	go test ./graph/... -cover

