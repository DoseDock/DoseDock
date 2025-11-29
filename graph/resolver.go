package graph

import (
	"context"
	"database/sql"

	"pillbox/internal/db"
)

// Resolver wires application dependencies into GraphQL resolvers.
type Resolver struct {
	DB      *sql.DB
	Queries *db.Queries
}

func (r *Resolver) withTx(ctx context.Context, fn func(q *db.Queries) error) error {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	qtx := r.Queries.WithTx(tx)
	if err := fn(qtx); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}
