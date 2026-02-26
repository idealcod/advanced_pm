package internal

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
)

type loginRequest struct {
	Email   string `json:"email"`
	Role    string `json:"role"`
	H3Index string `json:"h3_index"`
}

type habitRequest struct {
	UserID  int    `json:"user_id"`
	Type    string `json:"type"`
	H3Index string `json:"h3_index"`
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if req.Email == "" {
		http.Error(w, "email is required", http.StatusBadRequest)
		return
	}
	if req.Role == "" {
		req.Role = "User"
	}

	var user User
	err := DB.QueryRow(
		`INSERT INTO users (email, role, h3_index)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, h3_index = EXCLUDED.h3_index
		 RETURNING id, email, role, h3_index`,
		req.Email,
		req.Role,
		req.H3Index,
	).Scan(&user.ID, &user.Email, &user.Role, &user.H3Index)
	if err != nil {
		http.Error(w, "failed to login", http.StatusInternalServerError)
		return
	}

	if err := insertAudit(user.ID, "login"); err != nil {
		http.Error(w, "failed to log audit", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"user": user,
		"role": user.Role,
	})
}

func PrayerTimesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	h3 := strings.TrimSpace(r.URL.Query().Get("h3"))
	if h3 == "" {
		http.Error(w, "h3 is required", http.StatusBadRequest)
		return
	}

	var schedule PrayerSchedule
	err := DB.QueryRow(
		`SELECT date::text, h3_index, fajr, maghrib
		 FROM prayer_schedule
		 WHERE h3_index = $1
		 ORDER BY date DESC
		 LIMIT 1`,
		h3,
	).Scan(&schedule.Date, &schedule.H3Index, &schedule.Fajr, &schedule.Maghrib)
	if err == sql.ErrNoRows {
		http.Error(w, "prayer schedule not found", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("prayer schedule query failed for h3=%q: %v", h3, err)
		http.Error(w, "failed to load prayer schedule", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, schedule)
}

func HabitHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req habitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if req.UserID == 0 || req.Type == "" || req.H3Index == "" {
		http.Error(w, "user_id, type, h3_index are required", http.StatusBadRequest)
		return
	}

	var habit Habit
	err := DB.QueryRow(
		`INSERT INTO habits (user_id, type, h3_index, timestamp)
		 VALUES ($1, $2, $3, NOW())
		 RETURNING id, user_id, type, h3_index, timestamp`,
		req.UserID,
		req.Type,
		req.H3Index,
	).Scan(&habit.ID, &habit.UserID, &habit.Type, &habit.H3Index, &habit.Timestamp)
	if err != nil {
		http.Error(w, "failed to save habit", http.StatusInternalServerError)
		return
	}

	_, err = DB.Exec(
		`INSERT INTO analytics_daily (date, h3_index, habit_count)
		 VALUES (CURRENT_DATE, $1, 1)
		 ON CONFLICT (date, h3_index)
		 DO UPDATE SET habit_count = analytics_daily.habit_count + 1`,
		req.H3Index,
	)
	if err != nil {
		http.Error(w, "failed to update analytics", http.StatusInternalServerError)
		return
	}

	if err := insertAudit(req.UserID, fmt.Sprintf("habit_created:%s", req.Type)); err != nil {
		http.Error(w, "failed to log audit", http.StatusInternalServerError)
		return
	}

	Publish("habit.created", habit)
	writeJSON(w, http.StatusCreated, habit)
}

func AnalyticsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	h3 := r.URL.Query().Get("h3")
	if h3 == "" {
		http.Error(w, "h3 is required", http.StatusBadRequest)
		return
	}

	var count int
	err := DB.QueryRow(
		`SELECT COALESCE(SUM(habit_count), 0)
		 FROM analytics_daily
		 WHERE h3_index = $1`,
		h3,
	).Scan(&count)
	if err != nil {
		http.Error(w, "failed to load analytics", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"h3_index":    h3,
		"habit_count": count,
	})
}

func ContentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"status": "content published",
	})
}

func insertAudit(userID int, action string) error {
	_, err := DB.Exec(
		`INSERT INTO audit_logs (user_id, action, timestamp)
		 VALUES ($1, $2, NOW())`,
		userID,
		action,
	)
	return err
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
