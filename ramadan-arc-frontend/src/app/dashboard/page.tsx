"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArabicSection } from "@/components/ArabicSection";
import { CountdownRow } from "@/components/CountdownRow";
import { DuasSection } from "@/components/DuasSection";
import { HabitsSection } from "@/components/HabitsSection";
import { HadithsSection } from "@/components/HadithsSection";
import { PrayerStrip } from "@/components/PrayerStrip";
import { PrayerTrackerSection } from "@/components/PrayerTrackerSection";
import { QiblaSection } from "@/components/QiblaSection";
import { RemindersSection } from "@/components/RemindersSection";
import { Stars } from "@/components/Stars";
import { TasbihSection } from "@/components/TasbihSection";
import { HabitCardsSkeleton } from "@/components/DashboardSkeletons";
import { AUTH_EXPIRED_EVENT, readStoredUser, useRamadanApp } from "@/hooks/useRamadanApp";
import { useRamadanEvents } from "@/hooks/useRamadanEvents";

type Tab = "prayers" | "tasbih" | "qibla" | "habits" | "duas" | "hadiths" | "reminders" | "arabic";

const TABS: { id: Tab; label: string }[] = [
  { id: "prayers", label: "Prayer" },
  { id: "tasbih", label: "Tasbih" },
  { id: "qibla", label: "Qibla" },
  { id: "habits", label: "Habits" },
  { id: "duas", label: "Dua" },
  { id: "hadiths", label: "Hadith" },
  { id: "reminders", label: "Reminders" },
  { id: "arabic", label: "Arabic" },
];

export default function DashboardPage() {
  const router = useRouter();
  const app = useRamadanApp();
  const [tab, setTab] = useState<Tab>("prayers");
  const liveUser = app.user;
  const loadForUser = app.loadForUser;
  const signOutSession = app.signOut;
  const handleLiveEvent = useCallback(() => {
    if (liveUser) loadForUser(liveUser);
  }, [liveUser, loadForUser]);

  useRamadanEvents(handleLiveEvent);

  useEffect(() => {
    const stored = readStoredUser();
    if (!stored) {
      router.replace("/");
      return;
    }
    app.loadForUser(stored);
  }, [router]);

  useEffect(() => {
    function handleAuthExpired() {
      signOutSession();
      router.replace("/");
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, [router, signOutSession]);

  function signOut() {
    app.signOut();
    router.replace("/");
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[var(--night)] text-[var(--ink)]">
      <Stars />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(circle_at_50%_0%,rgba(201,150,58,0.12),transparent_60%)]" />

      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 py-6 lg:px-8 xl:px-10 2xl:px-12">
        <header className="flex flex-col gap-5 rounded-3xl border border-[var(--line)] bg-[var(--night-card)] p-6 shadow-soft lg:flex-row lg:items-center lg:justify-between xl:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gold)]">Ramadan digital assistant</p>
            <h1 className="mt-2 font-display text-5xl font-bold text-[#f0c66a]">Ramadan ARC</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{app.user?.email ?? "Loading session"}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[500px] xl:min-w-[560px]">
            <Metric label="Fajr" value={app.wakePlan?.fajr ?? "--:--"} />
            <Metric label="Iftar" value={app.wakePlan?.iftar_alarm ?? "--:--"} />
            <Metric label="Done" value={`${app.completedToday}/4`} />
          </div>
        </header>

        {app.error && (
          <div className="mt-5 rounded-xl border border-[var(--line)] bg-[rgba(201,150,58,0.1)] px-4 py-3 text-sm text-[var(--gold)]">
            Backend data is unavailable, so the dashboard is showing graceful sample content.
          </div>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)] xl:grid-cols-[430px_minmax(0,1fr)] 2xl:grid-cols-[460px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <PrayerStrip wakePlan={app.wakePlan} loading={app.loading} />
            <CountdownRow wakePlan={app.wakePlan} />
            <AnalyticsCard habitCount={app.habitCount} completedToday={app.completedToday} streakDays={app.analytics.streak_days} />
          </aside>

          <section className="min-w-0 rounded-3xl border border-[var(--line)] bg-[rgba(22,28,38,0.82)] p-5 shadow-soft backdrop-blur xl:p-6">
            <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--line)] bg-[var(--night-card)] p-2 sm:grid-cols-4 xl:grid-cols-8">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    tab === item.id
                      ? "bg-[rgba(201,150,58,0.15)] text-[#f0c66a]"
                      : "text-[var(--muted)] hover:text-[var(--gold)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="mt-6">
              {tab === "prayers" && <PrayerTrackerSection wakePlan={app.wakePlan} />}
              {tab === "tasbih" && <TasbihSection />}
              {tab === "qibla" && <QiblaSection />}
              {tab === "habits" &&
                (app.loading ? (
                  <HabitCardsSkeleton />
                ) : (
                  <HabitsSection
                    habits={app.habits}
                    habitCount={app.habitCount}
                    analytics={app.analytics}
                    loading={app.loading}
                    onToggle={app.toggleHabit}
                  />
                ))}
              {tab === "duas" && <DuasSection duas={app.duas} />}
              {tab === "hadiths" && <HadithsSection hadiths={app.hadiths} />}
              {tab === "reminders" && (
                <RemindersSection
                  reminders={app.reminders}
                  onToggle={app.toggleReminder}
                  onCreate={app.createReminder}
                  onDelete={app.removeReminder}
                />
              )}
              {tab === "arabic" && <ArabicSection lesson={app.lesson} loading={app.lessonLoading} onSubmit={app.sendLesson} />}
            </div>
          </section>
        </div>

        <button
          onClick={signOut}
          className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--night-card)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--gold)]"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-[#f0c66a]">{value}</p>
    </div>
  );
}

function AnalyticsCard({ habitCount, completedToday, streakDays }: { habitCount: number; completedToday: number; streakDays: number }) {
  const percent = Math.min(100, Math.round((completedToday / 4) * 100));

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--night-card)] p-5 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Analytics</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric label="Total" value={`${habitCount}`} />
        <Metric label="Today" value={`${completedToday}/4`} />
        <Metric label="Streak" value={`${streakDays}`} />
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
        <div className="h-full rounded-full bg-gradient-to-r from-[var(--green)] to-[var(--gold)] transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
