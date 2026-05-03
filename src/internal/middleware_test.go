package internal

import (
	"testing"
	"time"
)

func TestRateLimiterAllow(t *testing.T) {
	limiter := NewRateLimiter(2, time.Minute)

	if !limiter.Allow("client") {
		t.Fatal("first request should be allowed")
	}
	if !limiter.Allow("client") {
		t.Fatal("second request should be allowed")
	}
	if limiter.Allow("client") {
		t.Fatal("third request should be rate limited")
	}
}

func TestRateLimiterResetsAfterWindow(t *testing.T) {
	limiter := NewRateLimiter(1, time.Millisecond)

	if !limiter.Allow("client") {
		t.Fatal("first request should be allowed")
	}
	if limiter.Allow("client") {
		t.Fatal("second request inside window should be denied")
	}
	time.Sleep(2 * time.Millisecond)
	if !limiter.Allow("client") {
		t.Fatal("request after window should be allowed")
	}
}
