package internal

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

type loginRequest struct {
	Email   string `json:"email"`
	Role    string `json:"role"`
	H3Index string `json:"h3_index"`
}

type incomingHabit struct {
	UID  int    `json:"user_id"`
	Kind string `json:"type"`
	Cell string `json:"h3_index"`
}

type reminderDraft struct {
	UID    int    `json:"user_id"`
	Kind   string `json:"type"`
	Body   string `json:"message"`
	FireAt string `json:"time_value"`
	Active *bool  `json:"enabled"`
}

type reminderPatch struct {
	Kind   *string `json:"type"`
	Body   *string `json:"message"`
	FireAt *string `json:"time_value"`
	Active *bool   `json:"enabled"`
}

type lessonSubmission struct {
	Level    string `json:"level"`
	Topic    string `json:"topic"`
	UserText string `json:"text"`
}

func LogHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req loginRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "bad request body", http.StatusBadRequest)
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.H3Index = strings.TrimSpace(req.H3Index)

	if req.Email == "" {
		http.Error(w, "email required", http.StatusBadRequest)
		return
	}
	if len(req.H3Index) < 10 {
		http.Error(w, "h3_index is too short", http.StatusBadRequest)
		return
	}
	if req.Role == "" || req.Role == "admin" {
		req.Role = "user"
	}

	var u User
	err = DB.QueryRow(`
		INSERT INTO users (email, role, h3_index)
		VALUES ($1, $2, $3)
		ON CONFLICT (email) DO UPDATE
		SET role = EXCLUDED.role,
		    h3_index = EXCLUDED.h3_index
		RETURNING id, email, role, h3_index`,
		req.Email, req.Role, req.H3Index,
	).Scan(&u.ID, &u.Email, &u.Role, &u.H3Index)
	if err != nil {
		Logger.ErrorContext(r.Context(), "login upsert failed", "email", req.Email, "error", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	token, err := IssueJWT(u)
	if err != nil {
		Logger.ErrorContext(r.Context(), "jwt issue failed", "user_id", u.ID, "error", err)
		http.Error(w, "token error", http.StatusInternalServerError)
		return
	}

	_, err = DB.Exec(
		`INSERT INTO audit_logs (user_id, action, timestamp) VALUES ($1, 'login', NOW())`,
		u.ID,
	)
	if err != nil {
		Logger.WarnContext(r.Context(), "audit login failed", "user_id", u.ID, "error", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"user": u, "token": token})
}

func RefreshHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST only", http.StatusMethodNotAllowed)
		return
	}

	token, err := bearerToken(r.Header.Get("Authorization"))
	if err != nil {
		http.Error(w, "missing bearer token", http.StatusUnauthorized)
		return
	}

	claims, err := VerifyJWT(token)
	if err != nil {
		http.Error(w, "invalid bearer token", http.StatusUnauthorized)
		return
	}

	var u User
	err = DB.QueryRow(`
		SELECT id, email, role, h3_index
		FROM users
		WHERE id = $1`, claims.UserID,
	).Scan(&u.ID, &u.Email, &u.Role, &u.H3Index)
	if err == sql.ErrNoRows {
		http.Error(w, "user not found", http.StatusUnauthorized)
		return
	}
	if err != nil {
		Logger.ErrorContext(r.Context(), "refresh user fetch failed", "user_id", claims.UserID, "error", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	nextToken, err := IssueJWT(u)
	if err != nil {
		Logger.ErrorContext(r.Context(), "jwt refresh failed", "user_id", u.ID, "error", err)
		http.Error(w, "token error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"user": u, "token": nextToken})
}

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "GET only", http.StatusMethodNotAllowed)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	status := http.StatusOK
	body := map[string]any{
		"status": "ok",
		"db":     "ok",
		"events": "ok",
	}
	if err := DB.PingContext(ctx); err != nil {
		status = http.StatusServiceUnavailable
		body["status"] = "degraded"
		body["db"] = err.Error()
	}
	if Events == nil {
		status = http.StatusServiceUnavailable
		body["status"] = "degraded"
		body["events"] = "not initialized"
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}

func PrayerTimHand(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "GET only", http.StatusMethodNotAllowed)
		return
	}

	cell := strings.TrimSpace(r.URL.Query().Get("h3"))
	if cell == "" {
		http.Error(w, "missing h3 param", http.StatusBadRequest)
		return
	}
	date := strings.TrimSpace(r.URL.Query().Get("date"))
	if date != "" {
		if _, err := time.Parse("2006-01-02", date); err != nil {
			http.Error(w, "date must be YYYY-MM-DD", http.StatusBadRequest)
			return
		}
	}

	var s PraySched
	query := `
		SELECT date::text, h3_index, fajr, maghrib
		FROM prayer_schedule
		WHERE h3_index = $1
		  AND (($2::date IS NOT NULL AND date = $2::date)
		       OR ($2::date IS NULL AND date >= CURRENT_DATE))
		ORDER BY date ASC
		LIMIT 1`
	var dateArg any
	if date != "" {
		dateArg = date
	}
	err := DB.QueryRow(query, cell, dateArg).Scan(&s.Date, &s.H3Index, &s.Fajr, &s.Maghrib)
	if err == sql.ErrNoRows {
		http.Error(w, fmt.Sprintf("no schedule for cell %s", cell), http.StatusNotFound)
		return
	}
	if err != nil {
		Logger.ErrorContext(r.Context(), "prayer schedule query failed", "h3_index", cell, "date", date, "error", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s)
}

func PrayerTimesBatchHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST only", http.StatusMethodNotAllowed)
		return
	}

	var batch PrayerScheduleBatch
	if err := json.NewDecoder(r.Body).Decode(&batch); err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	if len(batch.Items) == 0 {
		http.Error(w, "items required", http.StatusBadRequest)
		return
	}
	if len(batch.Items) > 366 {
		http.Error(w, "too many schedule items", http.StatusBadRequest)
		return
	}

	tx, err := DB.BeginTx(r.Context(), nil)
	if err != nil {
		Logger.ErrorContext(r.Context(), "schedule batch begin failed", "error", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	for i, item := range batch.Items {
		item.H3Index = strings.TrimSpace(item.H3Index)
		if item.H3Index == "" || item.Date == "" || item.Fajr == "" || item.Maghrib == "" {
			http.Error(w, fmt.Sprintf("item %d: date, h3_index, fajr and maghrib required", i), http.StatusBadRequest)
			return
		}
		if _, err := time.Parse("2006-01-02", item.Date); err != nil {
			http.Error(w, fmt.Sprintf("item %d: date must be YYYY-MM-DD", i), http.StatusBadRequest)
			return
		}
		if _, err := time.Parse("15:04", item.Fajr); err != nil {
			http.Error(w, fmt.Sprintf("item %d: fajr must be HH:MM", i), http.StatusBadRequest)
			return
		}
		if _, err := time.Parse("15:04", item.Maghrib); err != nil {
			http.Error(w, fmt.Sprintf("item %d: maghrib must be HH:MM", i), http.StatusBadRequest)
			return
		}

		_, err := tx.ExecContext(r.Context(), `
			INSERT INTO prayer_schedule (date, h3_index, fajr, maghrib)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (date, h3_index) DO UPDATE
			SET fajr = EXCLUDED.fajr,
			    maghrib = EXCLUDED.maghrib`,
			item.Date, item.H3Index, item.Fajr, item.Maghrib,
		)
		if err != nil {
			Logger.ErrorContext(r.Context(), "schedule batch item failed", "index", i, "error", err)
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		Logger.ErrorContext(r.Context(), "schedule batch commit failed", "error", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	Publish("prayer_schedule.batch_upserted", map[string]int{"count": len(batch.Items)})
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"inserted": len(batch.Items)})
}

func HabitHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		listHabits(w, r)
	case http.MethodPost:
		addHabit(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func listHabits(w http.ResponseWriter, r *http.Request) {
	uid, err := strconv.Atoi(r.URL.Query().Get("user_id"))
	if err != nil || uid <= 0 {
		http.Error(w, "valid user_id required", http.StatusBadRequest)
		return
	}

	date := strings.TrimSpace(r.URL.Query().Get("date"))
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	if _, err := time.Parse("2006-01-02", date); err != nil {
		http.Error(w, "date must be YYYY-MM-DD", http.StatusBadRequest)
		return
	}

	rows, err := DB.QueryContext(r.Context(), `
		SELECT id, user_id, type, h3_index, timestamp
		FROM habits
		WHERE user_id = $1
		  AND timestamp::date = $2::date
		ORDER BY timestamp DESC`, uid, date,
	)
	if err != nil {
		Logger.ErrorContext(r.Context(), "habits fetch failed", "user_id", uid, "date", date, "error", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	out := []Habit{}
	for rows.Next() {
		var h Habit
		if err := rows.Scan(&h.ID, &h.UserID, &h.Type, &h.H3Index, &h.Timestamp); err != nil {
			Logger.WarnContext(r.Context(), "habit scan failed", "user_id", uid, "error", err)
			continue
		}
		out = append(out, h)
	}
	if err := rows.Err(); err != nil {
		Logger.ErrorContext(r.Context(), "habits rows failed", "user_id", uid, "error", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

func addHabit(w http.ResponseWriter, r *http.Request) {
	var h incomingHabit
	err := json.NewDecoder(r.Body).Decode(&h)
	if err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	if h.UID <= 0 || h.Kind == "" || h.Cell == "" {
		http.Error(w, "user_id, type and h3_index required", http.StatusBadRequest)
		return
	}

	h.Kind = strings.ToLower(strings.TrimSpace(h.Kind))
	allowed := map[string]bool{"fasting": true, "tahajjud": true, "quran": true, "sadaqah": true}
	if !allowed[h.Kind] {
		http.Error(w, "unknown habit type", http.StatusBadRequest)
		return
	}

	var saved Habit
	err = DB.QueryRow(`
		INSERT INTO habits (user_id, type, h3_index, timestamp)
		VALUES ($1, $2, $3, NOW())
		RETURNING id, user_id, type, h3_index, timestamp`,
		h.UID, h.Kind, h.Cell,
	).Scan(&saved.ID, &saved.UserID, &saved.Type, &saved.H3Index, &saved.Timestamp)
	if err != nil {
		Logger.ErrorContext(r.Context(), "habit insert failed", "user_id", h.UID, "type", h.Kind, "error", err)
		http.Error(w, "could not save", http.StatusInternalServerError)
		return
	}

	_, err = DB.Exec(`
		INSERT INTO analytics_daily (date, h3_index, habit_count)
		VALUES (CURRENT_DATE, $1, 1)
		ON CONFLICT (date, h3_index)
		DO UPDATE SET habit_count = analytics_daily.habit_count + 1`, h.Cell,
	)
	if err != nil {
		Logger.WarnContext(r.Context(), "analytics daily update failed", "h3_index", h.Cell, "error", err)
	}

	_, err = DB.Exec(
		`INSERT INTO audit_logs (user_id, action, timestamp) VALUES ($1, $2, NOW())`,
		h.UID, "habit:"+h.Kind,
	)
	if err != nil {
		Logger.WarnContext(r.Context(), "audit habit failed", "user_id", h.UID, "error", err)
	}

	Events.Publish(r.Context(), "habit.created", saved)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(saved)
}

func AnalyticHand(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "GET only", http.StatusMethodNotAllowed)
		return
	}

	cell := strings.TrimSpace(r.URL.Query().Get("h3"))
	if cell == "" {
		http.Error(w, "h3 required", http.StatusBadRequest)
		return
	}
	date := strings.TrimSpace(r.URL.Query().Get("date"))
	if date != "" {
		if _, err := time.Parse("2006-01-02", date); err != nil {
			http.Error(w, "date must be YYYY-MM-DD", http.StatusBadRequest)
			return
		}
	}

	uid, err := optionalPositiveInt(r.URL.Query().Get("user_id"))
	if err != nil {
		http.Error(w, "user_id must be a positive integer", http.StatusBadRequest)
		return
	}

	summary, err := analyticsSummary(r.Context(), cell, uid)
	if err != nil {
		Logger.ErrorContext(r.Context(), "analytics query failed", "h3_index", cell, "error", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

func analyticsSummary(ctx context.Context, h3Index string, userID int) (AnalyticsSummary, error) {
	out := AnalyticsSummary{
		H3Index: h3Index,
		ByDay:   []AnalyticsDay{},
		ByType:  []AnalyticsType{},
	}

	err := DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM habits WHERE h3_index = $1 AND ($2::int = 0 OR user_id = $2)`,
		h3Index, userID,
	).Scan(&out.HabitCount)
	if err != nil {
		return out, err
	}

	dayRows, err := DB.QueryContext(ctx, `
		SELECT timestamp::date::text AS day, COUNT(*)::int
		FROM habits
		WHERE h3_index = $1
		  AND ($2::int = 0 OR user_id = $2)
		GROUP BY day
		ORDER BY day DESC
		LIMIT 30`, h3Index, userID,
	)
	if err != nil {
		return out, err
	}
	defer dayRows.Close()
	for dayRows.Next() {
		var item AnalyticsDay
		if err := dayRows.Scan(&item.Date, &item.Count); err != nil {
			return out, err
		}
		out.ByDay = append(out.ByDay, item)
	}
	if err := dayRows.Err(); err != nil {
		return out, err
	}

	typeRows, err := DB.QueryContext(ctx, `
		SELECT type, COUNT(*)::int
		FROM habits
		WHERE h3_index = $1
		  AND ($2::int = 0 OR user_id = $2)
		GROUP BY type
		ORDER BY type`, h3Index, userID,
	)
	if err != nil {
		return out, err
	}
	defer typeRows.Close()
	for typeRows.Next() {
		var item AnalyticsType
		if err := typeRows.Scan(&item.Type, &item.Count); err != nil {
			return out, err
		}
		out.ByType = append(out.ByType, item)
	}
	if err := typeRows.Err(); err != nil {
		return out, err
	}

	err = DB.QueryRowContext(ctx, `
		WITH habit_days AS (
			SELECT DISTINCT timestamp::date AS day
			FROM habits
			WHERE h3_index = $1
			  AND ($2::int = 0 OR user_id = $2)
		),
		ranked AS (
			SELECT day, ROW_NUMBER() OVER (ORDER BY day DESC) AS rn
			FROM habit_days
			WHERE day <= CURRENT_DATE
		),
		streak AS (
			SELECT day
			FROM ranked
			WHERE day = CURRENT_DATE - ((rn - 1) * INTERVAL '1 day')
		)
		SELECT COUNT(*)::int FROM streak`, h3Index, userID,
	).Scan(&out.StreakDays)
	if err != nil {
		return out, err
	}

	return out, nil
}

func ClockHand(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "GET only", http.StatusMethodNotAllowed)
		return
	}

	cell := strings.TrimSpace(r.URL.Query().Get("h3"))
	if cell == "" {
		http.Error(w, "h3 required", http.StatusBadRequest)
		return
	}
	date := strings.TrimSpace(r.URL.Query().Get("date"))
	if date != "" {
		if _, err := time.Parse("2006-01-02", date); err != nil {
			http.Error(w, "date must be YYYY-MM-DD", http.StatusBadRequest)
			return
		}
	}

	suhurGap := 45
	raw := strings.TrimSpace(r.URL.Query().Get("before_suhur"))
	if raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 5 || n > 180 {
			http.Error(w, "before_suhur: integer 5-180 expected", http.StatusBadRequest)
			return
		}
		suhurGap = n
	}

	var sched PraySched
	err := DB.QueryRow(`
		SELECT date::text, h3_index, fajr, maghrib
		FROM prayer_schedule
		WHERE h3_index = $1
		  AND (($2::date IS NOT NULL AND date = $2::date)
		       OR ($2::date IS NULL AND date >= CURRENT_DATE))
		ORDER BY date ASC
		LIMIT 1`, cell, nullableDate(date),
	).Scan(&sched.Date, &sched.H3Index, &sched.Fajr, &sched.Maghrib)
	if err == sql.ErrNoRows {
		http.Error(w, "no schedule for this cell", http.StatusNotFound)
		return
	}
	if err != nil {
		Logger.ErrorContext(r.Context(), "wake plan schedule query failed", "h3_index", cell, "error", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	fajr, err := time.Parse("15:04", sched.Fajr)
	if err != nil {
		Logger.ErrorContext(r.Context(), "bad fajr value in schedule", "h3_index", cell, "fajr", sched.Fajr, "error", err)
		http.Error(w, "bad fajr time in db", http.StatusInternalServerError)
		return
	}

	suhurAt := fajr.Add(-time.Duration(suhurGap) * time.Minute).Format("15:04")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(RamadanWakePlan{
		Date:    sched.Date,
		H3Index: sched.H3Index,
		Fajr:    sched.Fajr,
		Maghrib: sched.Maghrib,
		Suhur: RamadanBell{
			Kind:        "suhur",
			Time:        suhurAt,
			CanSkip:     false,
			NoWayToSkip: true,
		},
		Iftar: RamadanBell{
			Kind:        "iftar",
			Time:        sched.Maghrib,
			CanSkip:     true,
			NoWayToSkip: false,
		},
		SuhurAlarm:  suhurAt,
		IftarAlarm:  sched.Maghrib,
		BeforeSuhur: suhurGap,
	})
}

func DuasHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "GET only", http.StatusMethodNotAllowed)
		return
	}

	cat := strings.TrimSpace(r.URL.Query().Get("category"))
	queryText := `SELECT id, title, arabic, meaning, category FROM duas`
	args := []any{}
	if cat != "" {
		queryText += ` WHERE category = $1`
		args = append(args, cat)
	}
	queryText += ` ORDER BY id`

	rows, err := DB.Query(queryText, args...)
	if err != nil {
		Logger.ErrorContext(r.Context(), "duas query failed", "category", cat, "error", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	out := []Dua{}
	for rows.Next() {
		var d Dua
		err = rows.Scan(&d.ID, &d.Title, &d.Arabic, &d.Meaning, &d.Category)
		if err != nil {
			Logger.WarnContext(r.Context(), "duas scan failed", "error", err)
			continue
		}
		out = append(out, d)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

func HadithsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "GET only", http.StatusMethodNotAllowed)
		return
	}

	limit, err := boundedQueryInt(r, "limit", 20, 1, 100)
	if err != nil {
		http.Error(w, "limit must be 1-100", http.StatusBadRequest)
		return
	}
	offset, err := boundedQueryInt(r, "offset", 0, 0, 100000)
	if err != nil {
		http.Error(w, "offset must be a non-negative integer", http.StatusBadRequest)
		return
	}

	rows, err := DB.Query(`SELECT id, title, text, source FROM hadiths ORDER BY id LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		Logger.ErrorContext(r.Context(), "hadiths query failed", "error", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	out := []Hadith{}
	for rows.Next() {
		var h Hadith
		err = rows.Scan(&h.ID, &h.Title, &h.Text, &h.Source)
		if err != nil {
			Logger.WarnContext(r.Context(), "hadiths scan failed", "error", err)
			continue
		}
		out = append(out, h)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

func optionalPositiveInt(raw string) (int, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return 0, fmt.Errorf("positive integer expected")
	}
	return value, nil
}

func boundedQueryInt(r *http.Request, key string, fallback, min, max int) (int, error) {
	raw := strings.TrimSpace(r.URL.Query().Get(key))
	if raw == "" {
		return fallback, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < min || value > max {
		return 0, fmt.Errorf("%s out of bounds", key)
	}
	return value, nil
}

func RemindersHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		listReminders(w, r)
	case http.MethodPost:
		addReminder(w, r)
	case http.MethodPatch:
		updateReminder(w, r)
	case http.MethodDelete:
		deleteReminder(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func ReminderByIDHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPatch:
		updateReminder(w, r)
	case http.MethodDelete:
		deleteReminder(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func listReminders(w http.ResponseWriter, r *http.Request) {
	uid, err := strconv.Atoi(r.URL.Query().Get("user_id"))
	if err != nil || uid <= 0 {
		http.Error(w, "valid user_id required", http.StatusBadRequest)
		return
	}

	kind := strings.TrimSpace(r.URL.Query().Get("type"))
	queryText := `SELECT id, user_id, type, message, time_value, enabled, created_at
		FROM reminders WHERE user_id = $1`
	args := []any{uid}
	if kind != "" {
		queryText += ` AND type = $2`
		args = append(args, kind)
	}
	queryText += ` ORDER BY id DESC`

	rows, err := DB.Query(queryText, args...)
	if err != nil {
		Logger.ErrorContext(r.Context(), "reminders fetch failed", "user_id", uid, "error", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	out := []Reminder{}
	for rows.Next() {
		var rm Reminder
		err = rows.Scan(&rm.ID, &rm.UserID, &rm.Type, &rm.Message, &rm.TimeValue, &rm.Enabled, &rm.CreatedAt)
		if err != nil {
			Logger.WarnContext(r.Context(), "reminders scan failed", "user_id", uid, "error", err)
			continue
		}
		out = append(out, rm)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

func addReminder(w http.ResponseWriter, r *http.Request) {
	var draft reminderDraft
	err := json.NewDecoder(r.Body).Decode(&draft)
	if err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	if draft.UID <= 0 || draft.Kind == "" || draft.Body == "" || draft.FireAt == "" {
		http.Error(w, "user_id, type, message, time_value required", http.StatusBadRequest)
		return
	}
	if _, err := time.Parse("15:04", draft.FireAt); err != nil {
		http.Error(w, "time_value must be HH:MM", http.StatusBadRequest)
		return
	}
	if draft.Kind == "iftar" {
		t, _ := time.Parse("15:04", draft.FireAt)
		if t.Hour() < 15 {
			http.Error(w, "iftar reminder before 15:00 looks wrong", http.StatusBadRequest)
			return
		}
	}

	on := true
	if draft.Active != nil {
		on = *draft.Active
	}

	var saved Reminder
	err = DB.QueryRow(`
		INSERT INTO reminders (user_id, type, message, time_value, enabled, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		RETURNING id, user_id, type, message, time_value, enabled, created_at`,
		draft.UID, draft.Kind, draft.Body, draft.FireAt, on,
	).Scan(&saved.ID, &saved.UserID, &saved.Type, &saved.Message, &saved.TimeValue, &saved.Enabled, &saved.CreatedAt)
	if err != nil {
		Logger.ErrorContext(r.Context(), "reminder insert failed", "user_id", draft.UID, "error", err)
		http.Error(w, "could not save reminder", http.StatusInternalServerError)
		return
	}

	_, err = DB.Exec(
		`INSERT INTO audit_logs (user_id, action, timestamp) VALUES ($1, 'reminder_added', NOW())`,
		draft.UID,
	)
	if err != nil {
		Logger.WarnContext(r.Context(), "audit reminder failed", "user_id", draft.UID, "error", err)
	}
	Events.Publish(r.Context(), "reminder.created", saved)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(saved)
}

func updateReminder(w http.ResponseWriter, r *http.Request) {
	id, err := reminderID(r)
	if err != nil {
		http.Error(w, "valid reminder id required", http.StatusBadRequest)
		return
	}

	var patch reminderPatch
	if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}

	var current Reminder
	err = DB.QueryRow(`
		SELECT id, user_id, type, message, time_value, enabled, created_at
		FROM reminders
		WHERE id = $1`, id,
	).Scan(&current.ID, &current.UserID, &current.Type, &current.Message, &current.TimeValue, &current.Enabled, &current.CreatedAt)
	if err == sql.ErrNoRows {
		http.Error(w, "reminder not found", http.StatusNotFound)
		return
	}
	if err != nil {
		Logger.ErrorContext(r.Context(), "reminder fetch failed", "id", id, "error", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	nextType := current.Type
	nextMessage := current.Message
	nextTimeValue := current.TimeValue
	nextEnabled := current.Enabled

	if patch.Kind != nil {
		nextType = strings.TrimSpace(*patch.Kind)
	}
	if patch.Body != nil {
		nextMessage = strings.TrimSpace(*patch.Body)
	}
	if patch.FireAt != nil {
		nextTimeValue = strings.TrimSpace(*patch.FireAt)
	}
	if patch.Active != nil {
		nextEnabled = *patch.Active
	}
	if nextType == "" || nextMessage == "" || nextTimeValue == "" {
		http.Error(w, "type, message and time_value cannot be empty", http.StatusBadRequest)
		return
	}
	if _, err := time.Parse("15:04", nextTimeValue); err != nil {
		http.Error(w, "time_value must be HH:MM", http.StatusBadRequest)
		return
	}

	var saved Reminder
	err = DB.QueryRow(`
		UPDATE reminders
		SET type = $2, message = $3, time_value = $4, enabled = $5
		WHERE id = $1
		RETURNING id, user_id, type, message, time_value, enabled, created_at`,
		id, nextType, nextMessage, nextTimeValue, nextEnabled,
	).Scan(&saved.ID, &saved.UserID, &saved.Type, &saved.Message, &saved.TimeValue, &saved.Enabled, &saved.CreatedAt)
	if err != nil {
		Logger.ErrorContext(r.Context(), "reminder update failed", "id", id, "error", err)
		http.Error(w, "could not update reminder", http.StatusInternalServerError)
		return
	}

	Events.Publish(r.Context(), "reminder.updated", saved)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(saved)
}

func deleteReminder(w http.ResponseWriter, r *http.Request) {
	id, err := reminderID(r)
	if err != nil {
		http.Error(w, "valid reminder id required", http.StatusBadRequest)
		return
	}

	result, err := DB.Exec(`DELETE FROM reminders WHERE id = $1`, id)
	if err != nil {
		Logger.ErrorContext(r.Context(), "reminder delete failed", "id", id, "error", err)
		http.Error(w, "could not delete reminder", http.StatusInternalServerError)
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		http.Error(w, "reminder not found", http.StatusNotFound)
		return
	}

	Events.Publish(r.Context(), "reminder.deleted", map[string]int{"id": id})
	w.WriteHeader(http.StatusNoContent)
}

func reminderID(r *http.Request) (int, error) {
	raw := strings.Trim(strings.TrimPrefix(r.URL.Path, "/reminders/"), "/")
	if raw == "" || raw == r.URL.Path {
		raw = strings.TrimSpace(r.URL.Query().Get("id"))
	}
	return strconv.Atoi(raw)
}

func nullableDate(date string) any {
	if strings.TrimSpace(date) == "" {
		return nil
	}
	return date
}

var lessonVocab = map[string][]string{
	"ramadan": {"sawm - fasting", "suhur - pre-dawn meal", "iftar - breaking the fast", "sabr - patience"},
	"prayer":  {"salah - prayer", "fajr - dawn prayer", "ruku - bowing", "sujud - prostration"},
	"quran":   {"ayah - verse", "surah - chapter", "tajweed - rules of recitation", "tilawah - recitation"},
	"dhikr":   {"tasbih - saying Subhanallah", "tahmid - saying Alhamdulillah", "takbir - saying Allahu Akbar", "istighfar - seeking forgiveness"},
	"wudu":    {"niyyah - intention", "ghasl - washing", "mash - wiping", "taharah - purification"},
	"qibla":   {"kaaba - the Sacred House", "makkah - Mecca", "ittijah - direction", "qiblah - prayer direction"},
}

func ArabicLessonHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST only", http.StatusMethodNotAllowed)
		return
	}

	var sub lessonSubmission
	err := json.NewDecoder(r.Body).Decode(&sub)
	if err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}

	if sub.Level == "" {
		sub.Level = "beginner"
	}

	topic := strings.ToLower(strings.TrimSpace(sub.Topic))
	if topic == "" {
		topic = "ramadan"
	}

	words, ok := lessonVocab[topic]
	if !ok {
		words = lessonVocab["ramadan"]
	}

	feedback := "Good start. Read each word aloud and write one sentence using it."
	if strings.TrimSpace(sub.UserText) != "" {
		feedback = "Checked your answer. The meaning is correct - try adding one more example sentence."
	}
	if claudeReply, err := claudeLessonFeedback(r.Context(), sub, topic, words); err == nil && claudeReply != "" {
		feedback = claudeReply
	} else if err != nil {
		Logger.WarnContext(r.Context(), "claude lesson fallback", "topic", topic, "error", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ArabicLesson{
		Level:    sub.Level,
		Topic:    topic,
		Words:    words,
		Practice: "Write a short sentence using one of the words from this lesson.",
		Reply:    feedback,
	})
}

func claudeLessonFeedback(ctx context.Context, sub lessonSubmission, topic string, words []string) (string, error) {
	apiKey := strings.TrimSpace(os.Getenv("ANTHROPIC_API_KEY"))
	if apiKey == "" {
		return "", nil
	}

	model := strings.TrimSpace(os.Getenv("CLAUDE_MODEL"))
	if model == "" {
		model = "claude-haiku-4-5"
	}

	prompt := fmt.Sprintf(
		"Create concise beginner Arabic lesson feedback for topic %q. Vocabulary: %s. Learner text: %q. Keep it warm, specific, and under 70 words.",
		topic,
		strings.Join(words, ", "),
		strings.TrimSpace(sub.UserText),
	)
	client := anthropic.NewClient(option.WithAPIKey(apiKey))
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	message, err := client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.Model(model),
		MaxTokens: 180,
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(anthropic.NewTextBlock(prompt)),
		},
		System: []anthropic.TextBlockParam{
			{Text: "You are a careful Arabic tutor for Ramadan learners. Correct gently and avoid overclaiming religious rulings."},
		},
	})
	if err != nil {
		return "", err
	}
	for _, item := range message.Content {
		if item.Type == "text" && strings.TrimSpace(item.Text) != "" {
			return strings.TrimSpace(item.Text), nil
		}
	}
	return "", nil
}

func ContentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "content published",
	})
}

func EventsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "GET only", http.StatusMethodNotAllowed)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	events, unsubscribe := Events.Subscribe(32)
	defer unsubscribe()

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	for {
		select {
		case <-r.Context().Done():
			return
		case event := <-events:
			fmt.Fprintf(w, "event: %s\n", event.Type)
			fmt.Fprintf(w, "data: %s\n\n", event.Payload)
			flusher.Flush()
		}
	}
}
