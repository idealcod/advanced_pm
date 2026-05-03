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

type PraySched struct {
	Date    string `json:"date"`
	H3Index string `json:"h3_index"`
	Fajr    string `json:"fajr"`
	Maghrib string `json:"maghrib"`
}

type PrayerScheduleBatch struct {
	Items []PraySched `json:"items"`
}

type AnalyticsDay struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type AnalyticsType struct {
	Type  string `json:"type"`
	Count int    `json:"count"`
}

type AnalyticsSummary struct {
	H3Index    string          `json:"h3_index"`
	HabitCount int             `json:"habit_count"`
	StreakDays int             `json:"streak_days"`
	ByDay      []AnalyticsDay  `json:"by_day"`
	ByType     []AnalyticsType `json:"by_type"`
}

type Dua struct {
	ID       int    `json:"id"`
	Title    string `json:"title"`
	Arabic   string `json:"arabic"`
	Meaning  string `json:"meaning"`
	Category string `json:"category"`
}

type Hadith struct {
	ID     int    `json:"id"`
	Title  string `json:"title"`
	Text   string `json:"text"`
	Source string `json:"source"`
}

type Reminder struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	Type      string    `json:"type"`
	Message   string    `json:"message"`
	TimeValue string    `json:"time_value"`
	Enabled   bool      `json:"enabled"`
	CreatedAt time.Time `json:"created_at"`
}

type RamadanBell struct {
	Kind        string `json:"kind"`
	Time        string `json:"time"`
	CanSkip     bool   `json:"can_skip"`
	NoWayToSkip bool   `json:"no_way_to_skip"`
}

type RamadanWakePlan struct {
	Date        string      `json:"date"`
	H3Index     string      `json:"h3_index"`
	Fajr        string      `json:"fajr"`
	Maghrib     string      `json:"maghrib"`
	Suhur       RamadanBell `json:"suhur"`
	Iftar       RamadanBell `json:"iftar"`
	SuhurAlarm  string      `json:"suhur_alarm"`
	IftarAlarm  string      `json:"iftar_alarm"`
	BeforeSuhur int         `json:"before_suhur_minutes"`
}

type ArabicLesson struct {
	Level    string   `json:"level"`
	Topic    string   `json:"topic"`
	Words    []string `json:"words"`
	Practice string   `json:"practice"`
	Reply    string   `json:"reply"`
}
