package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"ramadan-arc/src/internal"
)

func corsMiddleware(next http.Handler) http.Handler {
	allowedOrigin := os.Getenv("FRONTEND_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "http://localhost:3000,http://localhost:3001"
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && originAllowed(origin, allowedOrigin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID")
		w.Header().Set("Access-Control-Expose-Headers", "X-Request-ID")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func originAllowed(origin, allowed string) bool {
	for _, item := range strings.Split(allowed, ",") {
		if strings.TrimRight(strings.TrimSpace(item), "/") == origin {
			return true
		}
	}
	return false
}

func main() {
	internal.InitLogger()
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := internal.InitDB(); err != nil {
		internal.Logger.Error("failed to init db", slog.Any("error", err))
		os.Exit(1)
	}
	defer internal.DB.Close()
	if err := internal.JWTConfigured(); err != nil {
		internal.Logger.Error("failed to init auth", slog.Any("error", err))
		os.Exit(1)
	}
	internal.InitEventBus(ctx)
	internal.StartOutboxRelay(ctx, 15*time.Second)

	mux := http.NewServeMux()
	loginLimiter := internal.NewRateLimiter(10, time.Minute)
	habitLimiter := internal.NewRateLimiter(60, time.Minute)

	mux.HandleFunc("/health", internal.HealthHandler)
	mux.Handle("/login", loginLimiter.Middleware(http.HandlerFunc(internal.LogHandler)))
	mux.HandleFunc("/refresh", internal.RefreshHandler)
	mux.HandleFunc("/prayer-times", internal.PrayerTimHand)
	mux.Handle("/prayer-times/batch", internal.RequireRole("Admin")(http.HandlerFunc(internal.PrayerTimesBatchHandler)))
	mux.HandleFunc("/alarms", internal.ClockHand)
	mux.Handle("/habit", habitLimiter.Middleware(http.HandlerFunc(internal.HabitHandler)))
	mux.HandleFunc("/analytics", internal.AnalyticHand)
	mux.HandleFunc("/duas", internal.DuasHandler)
	mux.HandleFunc("/hadiths", internal.HadithsHandler)
	mux.HandleFunc("/reminders", internal.RemindersHandler)
	mux.HandleFunc("/reminders/", internal.ReminderByIDHandler)
	mux.HandleFunc("/arabic-lesson", internal.ArabicLessonHandler)
	mux.HandleFunc("/events", internal.EventsHandler)
	mux.Handle("/content", internal.RequireRole("Admin")(http.HandlerFunc(internal.ContentHandler)))

	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = "8080"
	}

	handler := internal.RequestLogger(corsMiddleware(mux))
	server := &http.Server{
		Addr:              "0.0.0.0:" + port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		internal.Logger.Info("server listening", slog.String("addr", server.Addr))
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			internal.Logger.Error("server failed", slog.Any("error", err))
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	internal.Logger.Info("server shutting down")
	if err := server.Shutdown(shutdownCtx); err != nil {
		internal.Logger.Error("server shutdown failed", slog.Any("error", err))
		os.Exit(1)
	}
}
