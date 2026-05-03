"use client";

import { useState } from "react";
import type { Reminder } from "@/lib/api";

const TYPES = ["suhur", "iftar", "dhikr", "quran", "prayer"];

export function RemindersSection({
  reminders,
  onToggle,
  onCreate,
  onDelete,
}: {
  reminders: Reminder[];
  onToggle: (id: number) => Promise<void>;
  onCreate?: (type: string, message: string, time_value: string) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}) {
  const [type, setType] = useState("dhikr");
  const [message, setMessage] = useState("Evening dhikr");
  const [timeValue, setTimeValue] = useState("20:00");
  const [saving, setSaving] = useState(false);

  async function submitReminder() {
    if (!onCreate || !message.trim() || !timeValue.trim()) return;
    setSaving(true);
    try {
      await onCreate(type, message.trim(), timeValue.trim());
      setMessage("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-dark)]">Gentle nudges</p>
        <h2 className="mt-1 font-display text-3xl font-bold text-[var(--green-dark)]">Reminders</h2>
      </div>

      {onCreate && (
        <div className="rounded-[24px] border border-[var(--line)] bg-[var(--soft)] p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--green)]"
              placeholder="Reminder message"
            />
            <input
              value={timeValue}
              onChange={(event) => setTimeValue(event.target.value)}
              className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--green)]"
              placeholder="HH:MM"
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm capitalize outline-none focus:border-[var(--green)]"
            >
              {TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button
              disabled={saving}
              onClick={submitReminder}
              className="rounded-2xl bg-[var(--green)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--green-dark)] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add reminder"}
            </button>
          </div>
        </div>
      )}

      {!reminders.length && (
        <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-white p-8 text-center">
          <p className="font-bold text-[var(--green-dark)]">No reminders yet</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Create one for suhur, iftar, dhikr, Quran, or prayer.</p>
        </div>
      )}

      <div className="grid gap-3">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className="flex items-center gap-4 rounded-[22px] border border-[var(--line)] bg-white p-4 text-left shadow-soft transition hover:border-[var(--green)]/25"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--soft)] text-sm font-bold uppercase text-[var(--green-dark)]">
              {reminder.type.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-[var(--green-dark)]">{reminder.message}</p>
              <p className="mt-1 text-sm capitalize text-[var(--muted)]">
                {reminder.time_value} · {reminder.type}
              </p>
            </div>
            <button
              type="button"
              aria-label={reminder.enabled ? "Disable reminder" : "Enable reminder"}
              onClick={() => onToggle(reminder.id)}
              className={`h-6 w-11 rounded-full p-1 transition ${reminder.enabled ? "bg-[var(--green)]" : "bg-[var(--line)]"}`}
            >
              <span className={`block h-4 w-4 rounded-full bg-white transition ${reminder.enabled ? "translate-x-5" : ""}`} />
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(reminder.id)}
                className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-bold text-[var(--muted)] transition hover:border-red-200 hover:text-red-600"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
