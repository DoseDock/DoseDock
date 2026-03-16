package main

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	_ "github.com/glebarez/sqlite"
	"github.com/joho/godotenv"
	"github.com/pressly/goose/v3"
	"github.com/rs/cors"

	"pillbox/graph"
	"pillbox/internal/db"
	"pillbox/internal/notifications"
)

//go:embed db/migrations/*.sql
var embedMigrations embed.FS

func main() {
	_ = godotenv.Load(".env")
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

	// Run embedded migrations on startup
	goose.SetBaseFS(embedMigrations)
	if err := goose.SetDialect("sqlite3"); err != nil {
		log.Fatalf("set goose dialect: %v", err)
	}
	if err := goose.Up(conn, "db/migrations"); err != nil {
		log.Fatalf("run migrations: %v", err)
	}
	log.Printf("database migrations applied")

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

	notificationsEnabled := envOrDefault("NOTIFICATIONS_ENABLED", "true")
	if strings.EqualFold(notificationsEnabled, "true") {
		sender, err := notifications.NewTwilioSenderFromEnv()
		if err != nil {
			log.Fatalf("init twilio sender: %v", err)
		}

		ttsClient, err := notifications.NewGoogleTTSClientFromEnv(context.Background())
		if err != nil {
			log.Fatalf("init google tts client: %v", err)
		}

		worker := notifications.NewWorker(resolver.Queries, sender, ttsClient)
		go worker.Start(context.Background())
		log.Printf("notification worker started")
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
