"use client";

import { useCountdown } from "@/hooks/useCountdown";
import type { WakePlan } from "@/lib/api";

export function CountdownRow({ wakePlan }: { wakePlan: WakePlan | null }) {
  const { suhurLeft, iftarLeft, suhurProgress, iftarProgress } = useCountdown(wakePlan?.suhur_alarm ?? "03:40", wakePlan?.iftar_alarm ?? "18:45");

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <AlarmCard title="Suhur" label="Wake before dawn" time={wakePlan?.suhur_alarm ?? "03:40"} left={suhurLeft} progress={suhurProgress} tone="green" />
      <AlarmCard title="Iftar" label="Break fast" time={wakePlan?.iftar_alarm ?? "18:45"} left={iftarLeft} progress={iftarProgress} tone="gold" />
    </div>
  );
}

function AlarmCard({
  title,
  label,
  time,
  left,
  progress,
  tone,
}: {
  title: string;
  label: string;
  time: string;
  left: string;
  progress: number;
  tone: "green" | "gold";
}) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div className={`rounded-2xl border border-[var(--line)] bg-[var(--night-card)] p-4 text-center shadow-soft ${tone === "green" ? "border-l-[3px] border-l-[#5b8dd9]" : "border-l-[3px] border-l-[var(--green)]"}`}>
      <p className="text-[11px] tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums text-[#f0c66a]">{left}</p>
      <p className="mt-0.5 text-[11px] text-[var(--muted)]">{time} · {title}</p>
      <div className="mt-3 hidden items-center gap-4">
        <svg className="-rotate-90" width="54" height="54" viewBox="0 0 84 84" aria-hidden="true">
          <circle cx="42" cy="42" r={radius} fill="none" stroke="var(--line)" strokeWidth="8" />
          <circle
            cx="42"
            cy="42"
            r={radius}
            fill="none"
            stroke={tone === "green" ? "var(--green)" : "var(--gold)"}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth="8"
            className="transition-[stroke-dashoffset] duration-700"
          />
        </svg>
      </div>
      <div className="mt-3 h-1 rounded-full bg-[var(--line)]">
        <div className={`h-full rounded-full transition-all ${tone === "green" ? "bg-[var(--green)]" : "bg-[var(--gold)]"}`} style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
    </div>
  );
}
