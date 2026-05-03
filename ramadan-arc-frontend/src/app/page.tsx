"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Stars } from "@/components/Stars";
import { useGeolocationH3 } from "@/hooks/useGeolocationH3";
import { DEFAULT_H3, useRamadanApp } from "@/hooks/useRamadanApp";

const FEATURES = [
  { title: "Salah tracker", text: "Track five prayers, timing, missed status, and reminders." },
  { title: "Tasbih and qibla", text: "Digital dhikr counter and qibla compass for daily use." },
  { title: "Ramadan routine", text: "Suhur, iftar, habits, streaks, duas, and hadiths." },
  { title: "Arabic practice", text: "Small guided lessons connected to the backend." },
];

export default function LandingPage() {
  const router = useRouter();
  const app = useRamadanApp();
  const [showManualH3, setShowManualH3] = useState(false);
  const { locating, locationError, detectLocation } = useGeolocationH3(app.setH3Index);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await app.signIn();
      router.push("/dashboard");
    } catch {
      // The hook owns the visible error state.
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--night)] text-[var(--ink)]">
      <Stars />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_50%_0%,rgba(201,150,58,0.14),transparent_60%)]" />

      <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1440px] items-center gap-12 px-6 py-8 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 xl:px-12">
        <div>
          <div className="inline-flex items-center rounded-full border border-[var(--line)] bg-[rgba(201,150,58,0.12)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold)]">
            Ramadan digital assistant
          </div>

          <p className="mt-10 font-display text-4xl text-[var(--gold)]">Bismillah</p>
          <h1 className="mt-3 max-w-3xl font-display text-6xl font-bold leading-[0.92] text-[#f0c66a] sm:text-7xl lg:text-8xl">
            Ramadan ARC
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            A focused Ramadan companion for salah, suhur, iftar, duas, dhikr, habits, qibla, reminders, and Arabic learning.
          </p>

          <div className="mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="rounded-2xl border border-[var(--line)] bg-[var(--night-card)] p-5 shadow-soft">
                <div className="mb-4 h-1 w-12 rounded-full bg-gradient-to-r from-[var(--green)] to-[var(--gold)]" />
                <h2 className="text-base font-semibold text-[var(--ink)]">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--line)] bg-[var(--night-card)] p-6 shadow-premium xl:p-7">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gold)]">Sign in</p>
            <h2 className="mt-2 font-display text-4xl font-bold text-[#f0c66a]">Open dashboard</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Connect to the backend using your location.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[var(--ink)]">Email</span>
              <input
                value={app.email}
                onChange={(event) => app.setEmail(event.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--gold)]"
                placeholder="demo@ramadan-arc.app"
                type="email"
              />
            </label>

            <div className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <span className="block text-sm font-semibold text-[var(--ink)]">Location</span>
                  <span className="mt-1 block break-all text-xs text-[var(--muted)]">{app.h3Index}</span>
                </div>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locating}
                  className="rounded-xl border border-[rgba(201,150,58,0.3)] bg-[rgba(201,150,58,0.12)] px-4 py-2.5 text-sm font-bold text-[#f0c66a] transition hover:border-[var(--gold)] disabled:opacity-60"
                >
                  {locating ? "Detecting..." : "Detect location"}
                </button>
              </div>
              {locationError && <p className="mt-2 text-xs font-semibold text-[var(--gold)]">{locationError}</p>}
              <button type="button" onClick={() => setShowManualH3((value) => !value)} className="mt-3 text-xs font-bold text-[var(--gold)]">
                {showManualH3 ? "Hide manual index" : "Enter H3 manually"}
              </button>
              {showManualH3 && (
                <input
                  value={app.h3Index}
                  onChange={(event) => app.setH3Index(event.target.value)}
                  className="mt-3 w-full rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--gold)]"
                  placeholder={DEFAULT_H3}
                />
              )}
            </div>

            <button
              disabled={app.loading}
              className="w-full rounded-xl border border-[rgba(201,150,58,0.3)] bg-[rgba(201,150,58,0.15)] px-5 py-3.5 text-sm font-bold text-[#f0c66a] transition hover:bg-[rgba(201,150,58,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {app.loading ? "Connecting..." : "Enter dashboard"}
            </button>
          </form>

          {app.error && (
            <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              Could not sign in. Make sure the backend is running and POST /login is available.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
