"use client";

import { useEffect } from "react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function useRamadanEvents(onEvent: (event: MessageEvent) => void) {
  useEffect(() => {
    const source = new EventSource(`${BASE}/events`);
    const names = ["habit.created", "reminder.created", "reminder.updated", "reminder.deleted", "prayer_schedule.batch_upserted"];

    names.forEach((name) => source.addEventListener(name, onEvent));
    source.onerror = () => {
      source.close();
    };

    return () => {
      names.forEach((name) => source.removeEventListener(name, onEvent));
      source.close();
    };
  }, [onEvent]);
}
