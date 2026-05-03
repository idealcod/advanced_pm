package internal

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type TokenClaims struct {
	UserID int    `json:"sub"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	Exp    int64  `json:"exp"`
}

var (
	ErrMissingToken = errors.New("missing bearer token")
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("expired token")
)

func IssueJWT(user User) (string, error) {
	claims := TokenClaims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		Exp:    time.Now().Add(tokenTTL()).Unix(),
	}

	header := map[string]string{"alg": "HS256", "typ": "JWT"}
	headerJSON, err := json.Marshal(header)
	if err != nil {
		return "", err
	}
	claimsJSON, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}

	encodedHeader := base64.RawURLEncoding.EncodeToString(headerJSON)
	encodedClaims := base64.RawURLEncoding.EncodeToString(claimsJSON)
	unsigned := encodedHeader + "." + encodedClaims
	signature := signJWT(unsigned)

	return unsigned + "." + signature, nil
}

func VerifyJWT(raw string) (TokenClaims, error) {
	parts := strings.Split(raw, ".")
	if len(parts) != 3 {
		return TokenClaims{}, ErrInvalidToken
	}

	unsigned := parts[0] + "." + parts[1]
	expected := signJWT(unsigned)
	if !hmac.Equal([]byte(expected), []byte(parts[2])) {
		return TokenClaims{}, ErrInvalidToken
	}

	claimsJSON, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return TokenClaims{}, ErrInvalidToken
	}

	var claims TokenClaims
	if err := json.Unmarshal(claimsJSON, &claims); err != nil {
		return TokenClaims{}, ErrInvalidToken
	}
	if claims.Exp <= time.Now().Unix() {
		return TokenClaims{}, ErrExpiredToken
	}
	if claims.UserID <= 0 || claims.Email == "" || claims.Role == "" {
		return TokenClaims{}, ErrInvalidToken
	}

	return claims, nil
}

func bearerToken(authHeader string) (string, error) {
	const prefix = "Bearer "
	if !strings.HasPrefix(authHeader, prefix) {
		return "", ErrMissingToken
	}
	token := strings.TrimSpace(strings.TrimPrefix(authHeader, prefix))
	if token == "" {
		return "", ErrMissingToken
	}
	return token, nil
}

func signJWT(unsigned string) string {
	mac := hmac.New(sha256.New, jwtSecret())
	mac.Write([]byte(unsigned))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func tokenTTL() time.Duration {
	hours, err := strconv.Atoi(os.Getenv("JWT_TTL_HOURS"))
	if err != nil || hours <= 0 {
		hours = 24
	}
	return time.Duration(hours) * time.Hour
}

func JWTConfigured() error {
	if len(jwtSecret()) < 32 {
		return fmt.Errorf("JWT_SECRET must be at least 32 characters")
	}
	return nil
}

func jwtSecret() []byte {
	return []byte(os.Getenv("JWT_SECRET"))
}
