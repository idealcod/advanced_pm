import type { WakePlan } from "@/lib/api";
import { currentPrayer, getPrayerTimes } from "@/lib/prayers";
import { PrayerStripSkeleton } from "@/components/DashboardSkeletons";

export function PrayerStrip({ wakePlan, loading }: { wakePlan: WakePlan | null; loading?: boolean }) {
  if (loading && !wakePlan) {
    return <PrayerStripSkeleton />;
  }

  const prayers = getPrayerTimes(wakePlan);
  const active = currentPrayer(prayers);

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--night-card)] px-5 py-4 shadow-soft">
      <div className="mb-3 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">Prayer times</div>
      <div className="hidden items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-dark)]">Prayer times</p>
          <h2 className="mt-1 font-display text-3xl font-bold text-[var(--green-dark)]">Today</h2>
        </div>
        <div className="rounded-2xl bg-[var(--soft)] px-3 py-2 text-right">
          <p className="text-xs font-semibold text-[var(--muted)]">Suhur alarm</p>
          <p className="font-bold tabular-nums text-[var(--green-dark)]">{wakePlan?.suhur_alarm ?? "03:40"}</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1">
        {prayers.map((prayer) => {
          const isActive = active === prayer.key;
          return (
            <div
              key={prayer.key}
              className={`rounded-lg px-1 py-1 text-center ${
                isActive ? "bg-[rgba(201,150,58,0.08)]" : ""
              }`}
            >
              <p className={`text-[10px] tracking-wide ${isActive ? "text-[var(--gold)]" : "text-[var(--muted)]"}`}>{prayer.label}</p>
              <p className={`mt-1 text-sm font-medium tabular-nums ${isActive ? "text-[#f0c66a]" : "text-[var(--ink)]"}`}>{prayer.time}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
