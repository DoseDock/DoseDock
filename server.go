package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	_ "github.com/glebarez/sqlite"
	"github.com/rs/cors"

	"pillbox/graph"
	"pillbox/internal/db"
)

func main() {
	port := envOrDefault("PORT", "8081")
	dbPath := envOrDefault("DB_PATH", "./db/backend.db")

	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		log.Fatalf("ensure db directory: %v", err)
	}

	conn, err := sql.Open("sqlite", fmt.Sprintf("file:%s?_pragma=foreign_keys(ON)&_pragma=journal_mode(WAL)", dbPath))
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer conn.Close()

	conn.SetMaxOpenConns(1)
	conn.SetMaxIdleConns(1)
	conn.SetConnMaxLifetime(0)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := conn.PingContext(ctx); err != nil {
		log.Fatalf("ping database: %v", err)
	}

	resolver := &graph.Resolver{
		DB:      conn,
		Queries: db.New(conn),
	}

	srv := handler.NewDefaultServer(graph.NewExecutableSchema(graph.Config{Resolvers: resolver}))

	mux := http.NewServeMux()
	mux.Handle("/", playground.Handler("GraphQL Playground", "/query"))
	mux.Handle("/query", srv)

	handlerWithCors := cors.AllowAll().Handler(mux)

	log.Printf("⇨ GraphQL server running on http://localhost:%s/", port)
	if err := http.ListenAndServe(":"+port, handlerWithCors); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}

func envOrDefault(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
