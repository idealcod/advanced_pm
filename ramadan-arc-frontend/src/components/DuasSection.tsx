import type { Dua } from "@/lib/api";

export function DuasSection({ duas }: { duas: Dua[] }) {
  if (!duas.length) return <EmptyState title="Duas are loading" text="Your dua library will appear here." />;

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="Spiritual library" title="Duas" />
      <div className="grid gap-2.5">
        {duas.map((dua) => (
          <article key={dua.id} className="rounded-2xl border border-[var(--line)] bg-[var(--night-card)] p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-[var(--green-dark)]">{dua.title}</h3>
              <span className="rounded-full bg-[var(--gold-soft)] px-3 py-1 text-xs font-bold text-[var(--gold-dark)]">
                {dua.category}
              </span>
            </div>
            <p className="mt-4 rounded-xl bg-[rgba(255,255,255,0.03)] p-4 text-right font-display text-xl leading-8 text-[#f0c66a]" dir="rtl">
              {dua.arabic}
            </p>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{dua.meaning}</p>
          </article>
        ))}
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

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-[var(--soft)] p-8 text-center">
      <p className="font-bold text-[var(--green-dark)]">{title}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{text}</p>
    </div>
  );
}
