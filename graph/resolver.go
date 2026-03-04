package graph

import (
	"context"
	"database/sql"
	"sync"
	"time"

	"pillbox/graph/model"
	"pillbox/internal/db"

	"github.com/google/uuid"
)

// PendingDispenseStore holds pending dispense requests in memory (for demo purposes)
type PendingDispenseStore struct {
	mu       sync.Mutex
	requests map[string]*model.DispenseRequest // keyed by patientId
}

var pendingDispenseStore = &PendingDispenseStore{
	requests: make(map[string]*model.DispenseRequest),
}

// Add adds a pending dispense request for a patient (overwrites any existing)
func (s *PendingDispenseStore) Add(patientID string, silo, qty int) *model.DispenseRequest {
	s.mu.Lock()
	defer s.mu.Unlock()

	req := &model.DispenseRequest{
		ID:        uuid.NewString(),
		PatientID: patientID,
		Silo:      silo,
		Qty:       qty,
		CreatedAt: time.Now(),
	}
	s.requests[patientID] = req
	return req
}

// Pop retrieves and removes the pending request for a patient
func (s *PendingDispenseStore) Pop(patientID string) *model.DispenseRequest {
	s.mu.Lock()
	defer s.mu.Unlock()

	req := s.requests[patientID]
	if req != nil {
		delete(s.requests, patientID)
	}
	return req
}

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
