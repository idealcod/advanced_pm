package internal

import (
	"log/slog"
	"os"
	"strings"
)

var Logger = slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

func InitLogger() {
	level := slog.LevelInfo
	if strings.EqualFold(os.Getenv("LOG_LEVEL"), "debug") {
		level = slog.LevelDebug
	}

	opts := &slog.HandlerOptions{Level: level}
	if strings.EqualFold(os.Getenv("APP_ENV"), "prod") || strings.EqualFold(os.Getenv("LOG_FORMAT"), "json") {
		Logger = slog.New(slog.NewJSONHandler(os.Stdout, opts))
	} else {
		Logger = slog.New(slog.NewTextHandler(os.Stdout, opts))
	}
	slog.SetDefault(Logger)
}
