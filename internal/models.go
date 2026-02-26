package internal

import "time"

type User struct {
	ID      int    `json:"id"`
	Email   string `json:"email"`
	Role    string `json:"role"`
	H3Index string `json:"h3_index"`
}

type Habit struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	Type      string    `json:"type"`
	H3Index   string    `json:"h3_index"`
	Timestamp time.Time `json:"timestamp"`
}

type AuditLog struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	Action    string    `json:"action"`
	Timestamp time.Time `json:"timestamp"`
}

type PrayerSchedule struct {
	Date    string `json:"date"`
	H3Index string `json:"h3_index"`
	Fajr    string `json:"fajr"`
	Maghrib string `json:"maghrib"`
}
