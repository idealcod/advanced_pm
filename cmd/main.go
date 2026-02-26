package main

import (
	"log"
	"net/http"
	"ramadan-arc/internal"
)

func main() {
	if err := internal.InitDB(); err != nil {
		log.Fatalf("failed to init db: %v", err)
	}
	defer internal.DB.Close()

	mux := http.NewServeMux()
	mux.HandleFunc("/login", internal.LoginHandler)
	mux.HandleFunc("/prayer-times", internal.PrayerTimesHandler)
	mux.HandleFunc("/habit", internal.HabitHandler)
	mux.HandleFunc("/analytics", internal.AnalyticsHandler)
	mux.Handle("/content", internal.RequireRole("Admin")(http.HandlerFunc(internal.ContentHandler)))

	log.Println("server listening on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
