import type { Hadith } from "@/lib/api";

export function HadithsSection({ hadiths }: { hadiths: Hadith[] }) {
  if (!hadiths.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-[var(--soft)] p-8 text-center">
        <p className="font-bold text-[var(--green-dark)]">Hadiths are loading</p>
        <p className="mt-2 text-sm text-[var(--muted)]">Daily reflections will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-dark)]">Daily reflection</p>
        <h2 className="mt-1 font-display text-3xl font-bold text-[var(--green-dark)]">Hadiths</h2>
      </div>

      <div className="grid gap-3">
        {hadiths.map((hadith) => (
          <article key={hadith.id} className="rounded-2xl border border-[var(--line)] border-l-[3px] border-l-[var(--gold)] bg-[var(--night-card)] p-5 shadow-soft">
            <div className="flex gap-4">
              <div className="mt-1 h-12 w-1.5 rounded-full bg-gradient-to-b from-[var(--green)] to-[var(--gold)]" />
              <div>
                <h3 className="text-lg font-bold text-[var(--green-dark)]">{hadith.title}</h3>
                <p className="mt-3 font-display text-lg italic leading-8 text-[var(--ink)]">"{hadith.text}"</p>
                <p className="mt-4 text-sm font-semibold text-[var(--gold-dark)]">{hadith.source}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
