"use client";

import { useEffect, useMemo, useState } from "react";
import type { WakePlan } from "@/lib/api";
import { getPrayerTimes, minutesFromTime, type PrayerKey, todayKey } from "@/lib/prayers";

type PrayerStatus = "on_time" | "late" | "missed";

interface PrayerLog {
  prayer: PrayerKey;
  scheduled: string;
  marked_at: string | null;
  status: PrayerStatus;
}

const STORAGE_KEY = "ramadan-arc-prayer-logs";
const STATUS_LABEL: Record<PrayerStatus, string> = {
  on_time: "On time",
  late: "Late",
  missed: "Missed",
};

export function PrayerTrackerSection({ wakePlan }: { wakePlan: WakePlan | null }) {
  const prayers = useMemo(() => getPrayerTimes(wakePlan), [wakePlan]);
  const [now, setNow] = useState<Date | null>(null);
  const [logs, setLogs] = useState<Record<string, PrayerLog[]>>({});
  const [notifications, setNotifications] = useState(false);
  const day = now ? todayKey() : "";
  const todayLogs = logs[day] ?? [];

  useEffect(() => {
    if ("Notification" in window) {
      setNotifications(Notification.permission === "granted");
    }
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLogs(JSON.parse(raw));
    } catch {
      setLogs({});
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    if (!notifications) return;
    if (!("Notification" in window)) return;
    const timers = prayers.map((prayer) => {
      const delay = delayUntil(prayer.time, -10);
      return window.setTimeout(() => {
        new Notification(`${prayer.label} in 10 minutes`, { body: "Prepare for salah." });
      }, delay);
    });
    return () => timers.forEach(window.clearTimeout);
  }, [notifications, prayers]);

  async function enableNotifications() {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotifications(permission === "granted");
  }

  function markPrayer(prayer: PrayerKey, scheduled: string, canMark: boolean) {
    if (!canMark) return;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const scheduledMinutes = minutesFromTime(scheduled);
    const status: PrayerStatus = currentMinutes >= scheduledMinutes && currentMinutes <= scheduledMinutes + 15 ? "on_time" : "late";
    saveLog({ prayer, scheduled, marked_at: now.toISOString(), status });
    if ("vibrate" in navigator) navigator.vibrate(30);
  }

  function markMissed(prayer: PrayerKey, scheduled: string, canMarkMissed: boolean) {
    if (!canMarkMissed) return;
    saveLog({ prayer, scheduled, marked_at: null, status: "missed" });
  }

  function saveLog(next: PrayerLog) {
    setLogs((prev) => {
      const current = prev[day] ?? [];
      return {
        ...prev,
        [day]: [...current.filter((item) => item.prayer !== next.prayer), next],
      };
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle eyebrow="Salah" title="5 prayer tracker" />
        <button
          onClick={enableNotifications}
          className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 py-2.5 text-sm font-bold text-[var(--green-dark)]"
        >
          {notifications ? "Notifications on" : "Notify 10 min before"}
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--night-card)] p-4 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-dark)]">Video lesson</p>
            <h3 className="mt-1 font-display text-2xl font-bold text-[var(--green-dark)]">How to pray salah</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
              Watch the step-by-step lesson, then use the tracker below to keep your daily prayers organized.
            </p>
          </div>
          <a
            href="https://youtu.be/0QzCnV09lyU?si=k7tGqPCu9NR1ut56"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-[rgba(201,150,58,0.3)] bg-[rgba(201,150,58,0.12)] px-4 py-2.5 text-center text-sm font-bold text-[#f0c66a] transition hover:border-[var(--gold)]"
          >
            Open on YouTube
          </a>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)] bg-black">
          <iframe
            className="aspect-video w-full"
            src="https://www.youtube-nocookie.com/embed/0QzCnV09lyU"
            title="How to pray salah video lesson"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {prayers.map((prayer, index) => {
          const log = todayLogs.find((item) => item.prayer === prayer.key);
          const window = now ? prayerWindow(prayers, index, now) : pendingPrayerWindow();
          const locked = Boolean(log);
          return (
            <div key={prayer.key} className="rounded-xl border border-[var(--line)] bg-[var(--night-card)] p-4 xl:min-h-[148px]">
              <div className="flex h-full flex-col gap-4">
                <div>
                  <p className="text-lg font-bold text-[var(--green-dark)]">{prayer.label}</p>
                  <p className="mt-1 text-sm tabular-nums text-[var(--muted)]">Scheduled {prayer.time}</p>
                  {!log && (
                    <p className={`mt-2 text-sm font-bold ${window.state === "active" ? "text-[var(--gold)]" : "text-[var(--muted)]"}`}>
                      {window.message}
                    </p>
                  )}
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <button
                    onClick={() => markPrayer(prayer.key, prayer.time, window.state === "active" && !locked)}
                    disabled={window.state !== "active" || locked}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                      window.state === "active" && !locked
                        ? "bg-[var(--green)] text-white"
                        : "cursor-not-allowed border border-[var(--line)] bg-transparent text-[var(--muted)] opacity-60"
                    }`}
                  >
                    {window.state === "upcoming" ? window.shortCountdown : "Mark prayed"}
                  </button>
                  <button
                    onClick={() => markMissed(prayer.key, prayer.time, window.state === "passed" && !locked)}
                    disabled={window.state !== "passed" || locked}
                    className={`rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-bold transition ${
                      window.state === "passed" && !locked ? "text-[var(--gold)]" : "cursor-not-allowed text-[var(--muted)] opacity-60"
                    }`}
                  >
                    Missed
                  </button>
                </div>
              </div>
              {log && (
                <div className="mt-3 rounded-2xl bg-[var(--soft)] px-3 py-2 text-sm text-[var(--muted)]">
                  <span className="font-bold text-[var(--green-dark)]">{STATUS_LABEL[log.status]}</span>
                  {log.marked_at ? ` at ${new Date(log.marked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : " today"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-[24px] border border-[var(--line)] bg-[var(--soft)] p-5">
        <p className="text-sm font-bold text-[var(--green-dark)]">Today history</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-5 xl:grid-cols-5">
          {prayers.map((prayer) => {
            const log = todayLogs.find((item) => item.prayer === prayer.key);
            return (
              <div key={prayer.key} className="rounded-xl bg-[rgba(255,255,255,0.03)] p-3 text-sm">
                <p className="font-bold text-[var(--green-dark)]">{prayer.label}</p>
                <p className="mt-1 text-[var(--muted)]">{log ? STATUS_LABEL[log.status] : "Pending"}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function prayerWindow(prayers: { time: string }[], index: number, now: Date) {
  const current = now.getHours() * 60 + now.getMinutes();
  const start = minutesFromTime(prayers[index].time);
  const next = prayers[index + 1] ? minutesFromTime(prayers[index + 1].time) : 24 * 60;

  if (current < start) {
    const remaining = start - current;
    return {
      state: "upcoming" as const,
      message: `Available in ${formatRemaining(remaining)}.`,
      shortCountdown: formatRemaining(remaining),
    };
  }

  if (current >= start && current < next) {
    const remaining = next - current;
    return {
      state: "active" as const,
      message: `You can mark this prayer now. Window left: ${formatRemaining(remaining)}.`,
      shortCountdown: "Now",
    };
  }

  return {
    state: "passed" as const,
    message: "Prayer window ended. Mark it as missed if it was not prayed.",
    shortCountdown: "Ended",
  };
}

function pendingPrayerWindow() {
  return {
    state: "pending" as const,
    message: "Syncing prayer time...",
    shortCountdown: "--",
  };
}

function formatRemaining(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function delayUntil(time: string, offsetMinutes: number) {
  const now = new Date();
  const target = new Date(now);
  const [hours, minutes] = time.split(":").map(Number);
  target.setHours(hours, minutes + offsetMinutes, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-dark)]">{eyebrow}</p>
      <h2 className="mt-1 font-display text-3xl font-bold text-[var(--green-dark)]">{title}</h2>
    </div>
  );
}
