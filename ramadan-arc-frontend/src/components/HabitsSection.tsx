"use client";

import type { HabitState } from "@/hooks/useRamadanApp";
import type { Analytics, HabitType } from "@/lib/api";
import { HabitCardsSkeleton } from "@/components/DashboardSkeletons";

export function HabitsSection({
  habits,
  habitCount,
  onToggle,
  analytics,
  loading,
}: {
  habits: HabitState[];
  habitCount: number;
  analytics: Analytics;
  loading?: boolean;
  onToggle: (type: HabitType) => void;
}) {
  if (loading) return <HabitCardsSkeleton />;

  const typeCounts = new Map(analytics.by_type.map((item) => [item.type, item.count]));

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="Daily worship" title="Habit tracking" />

      <div className="grid grid-cols-2 gap-2">
        {habits.map((habit) => (
          <button
            key={habit.type}
            onClick={() => onToggle(habit.type)}
            className={`group rounded-xl border p-4 text-center transition hover:scale-[1.02] ${
              habit.done
                ? "border-[rgba(201,150,58,0.4)] bg-[rgba(201,150,58,0.12)]"
                : "border-[var(--line)] bg-[var(--night-card)] hover:border-[rgba(201,150,58,0.35)]"
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--green)] text-lg font-bold text-white">
                {habit.accent}
              </div>
              <span
                className={`text-[11px] font-medium ${
                  habit.done ? "text-[var(--gold)]" : "text-[var(--muted)]"
                }`}
              >
                {habit.done ? "✓ Completed" : "Tap to mark"}
              </span>
            </div>
            <h3 className="mt-3 text-sm font-medium text-[var(--ink)]">{habit.label}</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{habit.note}</p>
            <p className="mt-2 text-xs text-[var(--muted)]">{typeCounts.get(habit.type) ?? 0} total logs</p>
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--night-card)] p-4">
          <p className="text-sm font-semibold text-[var(--muted)]">Backend completed habits</p>
          <p className="mt-2 text-4xl font-bold text-[var(--green-dark)]">{habitCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--night-card)] p-4">
          <p className="text-sm font-semibold text-[var(--muted)]">Ramadan heatmap</p>
          <HabitHeatmap days={analytics.by_day} />
          <p className="mt-3 text-sm text-[var(--muted)]">{analytics.streak_days} day current streak across the last 30 days.</p>
        </div>
      </div>
    </div>
  );
}

function HabitHeatmap({ days }: { days: Analytics["by_day"] }) {
  const counts = new Map(days.map((day) => [day.date, day.count]));
  const today = new Date();
  const cells = Array.from({ length: 30 }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - index));
    const key = date.toISOString().slice(0, 10);
    const count = counts.get(key) ?? 0;
    return { key, count };
  });

  return (
    <div className="mt-4 grid grid-cols-10 gap-1.5" aria-label="30 day habit heatmap">
      {cells.map((cell) => (
        <span
          key={cell.key}
          title={`${cell.key}: ${cell.count} habits`}
          className={`aspect-square rounded-md ${
            cell.count >= 4
              ? "bg-[var(--green)]"
              : cell.count >= 2
                ? "bg-[var(--gold)]"
                : cell.count === 1
                  ? "bg-[var(--green-soft)]"
                  : "bg-[var(--line)]"
          }`}
        />
      ))}
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-dark)]">{eyebrow}</p>
      <h2 className="mt-1 font-display text-3xl font-bold text-[var(--green-dark)]">{title}</h2>
    </div>
  );
}
