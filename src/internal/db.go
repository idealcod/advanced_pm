package internal

import (
	"context"
	"database/sql"
	"fmt"
	"net"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

var DB *sql.DB

func InitDB() error {
	_ = godotenv.Load(".env")

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL != "" {
		var err error
		DB, err = sql.Open("postgres", databaseURL)
		if err != nil {
			return err
		}
		configurePool(DB)

		if err := pingWithRetry(DB, 2*time.Minute); err != nil {
			return err
		}
		return applySchema()
	}

	host := resolveDockerHost(os.Getenv("POSTGRES_HOST"))
	port := os.Getenv("POSTGRES_PORT")
	user := os.Getenv("POSTGRES_USER")
	password := os.Getenv("POSTGRES_PASSWORD")
	dbname := os.Getenv("POSTGRES_DB")
	sslmode := os.Getenv("POSTGRES_SSLMODE")
	if sslmode == "" {
		sslmode = "disable"
	}

	if host == "" || port == "" || user == "" || password == "" || dbname == "" {
		return fmt.Errorf("missing one or more postgres env vars")
	}

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host,
		port,
		user,
		password,
		dbname,
		sslmode,
	)

	var err error
	DB, err = sql.Open("postgres", dsn)
	if err != nil {
		return err
	}
	configurePool(DB)

	if err := pingWithRetry(DB, 2*time.Minute); err != nil {
		return err
	}
	return applySchema()
}

func resolveDockerHost(host string) string {
	if host == "" || os.Getenv("APP_ENV") != "dev" {
		return host
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	resolver := net.Resolver{
		PreferGo: true,
		Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
			dialer := net.Dialer{}
			return dialer.DialContext(ctx, "udp", "127.0.0.11:53")
		},
	}
	ips, err := resolver.LookupHost(ctx, host)
	if err != nil || len(ips) == 0 {
		return host
	}
	return ips[0]
}

func pingWithRetry(db *sql.DB, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	var lastErr error

	for {
		if err := db.Ping(); err == nil {
			return nil
		} else {
			lastErr = err
		}

		if time.Now().After(deadline) {
			return fmt.Errorf("postgres unavailable after %s: %w", timeout, lastErr)
		}
		time.Sleep(time.Second)
	}
}

func applySchema() error {
	schema, err := os.ReadFile("src/db/schema.sql")
	if err != nil {
		return fmt.Errorf("read schema: %w", err)
	}

	if _, err := DB.Exec(string(schema)); err != nil {
		return fmt.Errorf("apply schema: %w", err)
	}

	return nil
}

func configurePool(db *sql.DB) {
	db.SetMaxOpenConns(envInt("DB_MAX_OPEN_CONNS", 25))
	db.SetMaxIdleConns(envInt("DB_MAX_IDLE_CONNS", 10))
	db.SetConnMaxLifetime(time.Duration(envInt("DB_CONN_MAX_LIFETIME_MINUTES", 30)) * time.Minute)
	db.SetConnMaxIdleTime(time.Duration(envInt("DB_CONN_MAX_IDLE_MINUTES", 5)) * time.Minute)
}

func envInt(key string, fallback int) int {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}
