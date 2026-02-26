package internal

import "log"

func Publish(event string, payload any) {
	log.Printf("event=%s payload=%v", event, payload)
}
