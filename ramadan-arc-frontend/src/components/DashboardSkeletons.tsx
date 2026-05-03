export function PrayerStripSkeleton() {
  return (
    <div className="rounded-[24px] border border-white/60 bg-white/70 p-5 shadow-soft dark:border-white/10 dark:bg-white/10">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-3">
          <div className="h-3 w-28 animate-pulse rounded-full bg-[var(--line)]" />
          <div className="h-9 w-24 animate-pulse rounded-full bg-[var(--line)]" />
        </div>
        <div className="h-14 w-24 animate-pulse rounded-2xl bg-[var(--line)]" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-2xl bg-[var(--soft)]" />
        ))}
      </div>
    </div>
  );
}

export function HabitCardsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="h-3 w-32 animate-pulse rounded-full bg-[var(--line)]" />
        <div className="h-9 w-48 animate-pulse rounded-full bg-[var(--line)]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-44 animate-pulse rounded-[24px] border border-[var(--line)] bg-white/70 dark:bg-white/10" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr]">
        <div className="h-32 animate-pulse rounded-[24px] bg-[var(--soft)]" />
        <div className="h-32 animate-pulse rounded-[24px] bg-white/70 dark:bg-white/10" />
      </div>
    </div>
  );
}
