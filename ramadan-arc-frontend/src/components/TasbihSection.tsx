"use client";

import { useMemo, useState } from "react";

const CYCLE = [
  { phrase: "Subhanallah", target: 33 },
  { phrase: "Alhamdulillah", target: 33 },
  { phrase: "Allahu Akbar", target: 34 },
];

export function TasbihSection() {
  const [step, setStep] = useState(0);
  const [count, setCount] = useState(0);
  const [rounds, setRounds] = useState(0);
  const current = CYCLE[step];
  const total = useMemo(() => CYCLE.slice(0, step).reduce((sum, item) => sum + item.target, 0) + count, [count, step]);
  const progress = Math.round((count / current.target) * 100);

  function tap() {
    if ("vibrate" in navigator) navigator.vibrate(count + 1 >= current.target ? 90 : 18);
    if (count + 1 < current.target) {
      setCount(count + 1);
      return;
    }
    if (step + 1 < CYCLE.length) {
      setStep(step + 1);
      setCount(0);
      return;
    }
    setStep(0);
    setCount(0);
    setRounds(rounds + 1);
  }

  function reset() {
    setStep(0);
    setCount(0);
    setRounds(0);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <SectionTitle eyebrow="Dhikr" title="Digital tasbih" />
        <button onClick={reset} className="rounded-2xl border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--muted)]">
          Reset
        </button>
      </div>

      <div className="rounded-[28px] border border-[var(--line)] bg-[var(--soft)] p-5 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--gold-dark)]">{current.phrase}</p>
        <button
          onClick={tap}
        className="mx-auto mt-6 flex aspect-square w-full max-w-[320px] flex-col items-center justify-center rounded-full border border-[var(--line)] bg-[var(--night-card)] shadow-premium transition active:scale-95"
        >
          <span className="text-7xl font-bold tabular-nums text-[var(--green-dark)]">{count}</span>
          <span className="mt-2 text-sm font-bold text-[var(--muted)]">of {current.target}</span>
        </button>

        <div className="mx-auto mt-6 h-3 max-w-md overflow-hidden rounded-full bg-[var(--line)]">
          <div className="h-full rounded-full bg-gradient-to-r from-[var(--green)] to-[var(--gold)] transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {CYCLE.map((item, index) => (
            <div key={item.phrase} className={`rounded-xl p-3 ${index === step ? "bg-[var(--gold-soft)]" : "bg-[rgba(255,255,255,0.03)]"}`}>
              <p className="text-xs font-bold text-[var(--green-dark)]">{item.phrase}</p>
              <p className="mt-1 text-sm tabular-nums text-[var(--muted)]">{item.target}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 text-sm text-[var(--muted)]">Total this round: {total}/100 · Completed rounds: {rounds}</p>
      </div>
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
