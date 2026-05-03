package internal

import (
	"context"
	"encoding/json"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

const defaultEventStream = "ramadan_arc_events"

type Event struct {
	Type      string          `json:"type"`
	Payload   json.RawMessage `json:"payload"`
	CreatedAt time.Time       `json:"created_at"`
}

type EventBus struct {
	mu          sync.RWMutex
	subscribers map[chan Event]struct{}
	redis       *redis.Client
	stream      string
}

var Events = NewEventBus(nil, defaultEventStream)

func NewEventBus(redisClient *redis.Client, stream string) *EventBus {
	if stream == "" {
		stream = defaultEventStream
	}
	return &EventBus{
		subscribers: map[chan Event]struct{}{},
		redis:       redisClient,
		stream:      stream,
	}
}

func InitEventBus(ctx context.Context) {
	client := redisClientFromEnv()
	if client == nil {
		Events = NewEventBus(nil, os.Getenv("REDIS_STREAM"))
		Logger.InfoContext(ctx, "event bus initialized", "mode", "in_process")
		return
	}
	if err := client.Ping(ctx).Err(); err != nil {
		Logger.WarnContext(ctx, "redis unavailable, using in-process event bus", "error", err)
		Events = NewEventBus(nil, os.Getenv("REDIS_STREAM"))
		return
	}
	Events = NewEventBus(client, os.Getenv("REDIS_STREAM"))
	Logger.InfoContext(ctx, "event bus initialized", "mode", "redis_streams", "stream", Events.stream)
}

func StartOutboxRelay(ctx context.Context, interval time.Duration) {
	if interval <= 0 {
		interval = 15 * time.Second
	}
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				relayOutbox(ctx, 100)
			}
		}
	}()
}

func relayOutbox(ctx context.Context, limit int) {
	if DB == nil || Events == nil {
		return
	}

	rows, err := DB.QueryContext(ctx, `
		SELECT id, event_type, payload, created_at
		FROM event_outbox
		WHERE delivered_at IS NULL
		ORDER BY id
		LIMIT $1`, limit,
	)
	if err != nil {
		Logger.ErrorContext(ctx, "event outbox relay query failed", "error", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var event Event
		var id int
		if err := rows.Scan(&id, &event.Type, &event.Payload, &event.CreatedAt); err != nil {
			Logger.WarnContext(ctx, "event outbox scan failed", "error", err)
			continue
		}
		Events.deliver(ctx, event)
		if _, err := DB.ExecContext(ctx, `UPDATE event_outbox SET delivered_at = NOW() WHERE id = $1`, id); err != nil {
			Logger.ErrorContext(ctx, "event outbox mark delivered failed", "id", id, "error", err)
		}
	}
	if err := rows.Err(); err != nil {
		Logger.ErrorContext(ctx, "event outbox relay rows failed", "error", err)
	}
}

func Publish(eventType string, payload any) {
	if Events == nil {
		Events = NewEventBus(nil, defaultEventStream)
	}
	Events.Publish(context.Background(), eventType, payload)
}

func (b *EventBus) Publish(ctx context.Context, eventType string, payload any) {
	body, err := json.Marshal(payload)
	if err != nil {
		Logger.ErrorContext(ctx, "event marshal failed", "event", eventType, "error", err)
		return
	}

	event := Event{Type: eventType, Payload: body, CreatedAt: time.Now().UTC()}

	outboxID := 0
	if DB != nil {
		if err := DB.QueryRowContext(ctx,
			`INSERT INTO event_outbox (event_type, payload, created_at) VALUES ($1, $2, NOW()) RETURNING id`,
			event.Type,
			string(event.Payload),
		).Scan(&outboxID); err != nil {
			Logger.ErrorContext(ctx, "event outbox write failed", "event", event.Type, "error", err)
		}
	}

	b.deliver(ctx, event)
	if outboxID > 0 {
		if _, err := DB.ExecContext(ctx, `UPDATE event_outbox SET delivered_at = NOW() WHERE id = $1`, outboxID); err != nil {
			Logger.ErrorContext(ctx, "event outbox mark delivered failed", "id", outboxID, "error", err)
		}
	}
}

func (b *EventBus) publishRedis(ctx context.Context, event Event) {
	if b.redis == nil {
		return
	}
	if err := b.redis.XAdd(ctx, &redis.XAddArgs{
		Stream: b.stream,
		Values: map[string]any{
			"type":       event.Type,
			"payload":    string(event.Payload),
			"created_at": event.CreatedAt.Format(time.RFC3339Nano),
		},
	}).Err(); err != nil {
		Logger.ErrorContext(ctx, "redis stream publish failed", "event", event.Type, "error", err)
	}
}

func (b *EventBus) deliver(ctx context.Context, event Event) {
	b.publishRedis(ctx, event)

	b.mu.RLock()
	defer b.mu.RUnlock()
	for ch := range b.subscribers {
		select {
		case ch <- event:
		default:
			Logger.WarnContext(ctx, "dropping event for slow subscriber", "event", event.Type)
		}
	}
}

func (b *EventBus) Subscribe(buffer int) (<-chan Event, func()) {
	if buffer <= 0 {
		buffer = 16
	}
	ch := make(chan Event, buffer)

	b.mu.Lock()
	b.subscribers[ch] = struct{}{}
	b.mu.Unlock()

	return ch, func() {
		b.mu.Lock()
		delete(b.subscribers, ch)
		close(ch)
		b.mu.Unlock()
	}
}

func redisClientFromEnv() *redis.Client {
	url := strings.TrimSpace(os.Getenv("REDIS_URL"))
	if url != "" {
		opts, err := redis.ParseURL(url)
		if err != nil {
			Logger.Warn("invalid REDIS_URL", "error", err)
			return nil
		}
		return redis.NewClient(opts)
	}

	host := strings.TrimSpace(os.Getenv("REDIS_HOST"))
	if host == "" {
		return nil
	}
	port := strings.TrimSpace(os.Getenv("REDIS_PORT"))
	if port == "" {
		port = "6379"
	}
	return redis.NewClient(&redis.Options{Addr: host + ":" + port})
}
