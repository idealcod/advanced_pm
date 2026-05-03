package internal

import (
	"os"
	"testing"
)

func TestIssueAndVerifyJWT(t *testing.T) {
	t.Setenv("JWT_SECRET", "12345678901234567890123456789012")
	t.Setenv("JWT_TTL_HOURS", "1")

	user := User{ID: 7, Email: "user@example.com", Role: "user", H3Index: "872830828fffffff"}
	token, err := IssueJWT(user)
	if err != nil {
		t.Fatalf("IssueJWT returned error: %v", err)
	}

	claims, err := VerifyJWT(token)
	if err != nil {
		t.Fatalf("VerifyJWT returned error: %v", err)
	}
	if claims.UserID != user.ID || claims.Email != user.Email || claims.Role != user.Role {
		t.Fatalf("unexpected claims: %+v", claims)
	}
}

func TestJWTConfiguredRequiresLongSecret(t *testing.T) {
	previous := os.Getenv("JWT_SECRET")
	t.Cleanup(func() {
		if previous == "" {
			os.Unsetenv("JWT_SECRET")
			return
		}
		os.Setenv("JWT_SECRET", previous)
	})

	os.Setenv("JWT_SECRET", "short")
	if err := JWTConfigured(); err == nil {
		t.Fatal("expected short JWT_SECRET to fail")
	}
}
