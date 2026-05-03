"use client";

import { useState } from "react";
import type { ArabicLesson } from "@/lib/api";

const TOPICS = ["ramadan", "prayer", "quran", "dhikr", "wudu", "qibla"];

const VOCAB: Record<string, { arabic: string; word: string; meaning: string; example: string }[]> = {
  ramadan: [
    { arabic: "صَوْم", word: "sawm", meaning: "fasting", example: "Ana asumu Ramadan." },
    { arabic: "سُحُور", word: "suhur", meaning: "pre-dawn meal", example: "As-suhur qabla al-fajr." },
    { arabic: "إِفْطَار", word: "iftar", meaning: "breaking the fast", example: "Al-iftar ba'da al-maghrib." },
    { arabic: "صَبْر", word: "sabr", meaning: "patience", example: "As-sabr jamil." },
  ],
  prayer: [
    { arabic: "صَلَاة", word: "salah", meaning: "prayer", example: "As-salah nur." },
    { arabic: "فَجْر", word: "fajr", meaning: "dawn prayer", example: "Salat al-fajr mubakkirah." },
    { arabic: "رُكُوع", word: "ruku", meaning: "bowing", example: "Ar-ruku fi as-salah." },
    { arabic: "سُجُود", word: "sujud", meaning: "prostration", example: "As-sujud qurb." },
  ],
  quran: [
    { arabic: "آيَة", word: "ayah", meaning: "verse", example: "Hadihi ayah." },
    { arabic: "سُورَة", word: "surah", meaning: "chapter", example: "Surat al-Fatihah." },
    { arabic: "تَجْوِيد", word: "tajweed", meaning: "recitation rules", example: "At-tajweed yuhassin at-tilawah." },
    { arabic: "تِلَاوَة", word: "tilawah", meaning: "recitation", example: "Tilawat al-Quran." },
  ],
  dhikr: [
    { arabic: "تَسْبِيح", word: "tasbih", meaning: "saying Subhanallah", example: "At-tasbih ba'da as-salah." },
    { arabic: "تَحْمِيد", word: "tahmid", meaning: "saying Alhamdulillah", example: "At-tahmid shukr." },
    { arabic: "تَكْبِير", word: "takbir", meaning: "saying Allahu Akbar", example: "At-takbir dhikr." },
    { arabic: "اِسْتِغْفَار", word: "istighfar", meaning: "seeking forgiveness", example: "Al-istighfar yutahhir al-qalb." },
  ],
  wudu: [
    { arabic: "وُضُوء", word: "wudu", meaning: "ablution", example: "Al-wudu qabla as-salah." },
    { arabic: "نِيَّة", word: "niyyah", meaning: "intention", example: "An-niyyah fi al-qalb." },
    { arabic: "غَسْل", word: "ghasl", meaning: "washing", example: "Ghasl al-yadayn." },
    { arabic: "طَهَارَة", word: "taharah", meaning: "purification", example: "At-taharah min al-iman." },
  ],
  qibla: [
    { arabic: "قِبْلَة", word: "qiblah", meaning: "prayer direction", example: "Al-qiblah ila Makkah." },
    { arabic: "كَعْبَة", word: "kaaba", meaning: "the Sacred House", example: "Al-Kaaba fi Makkah." },
    { arabic: "مَكَّة", word: "makkah", meaning: "Mecca", example: "Makkah madinah muqaddasah." },
    { arabic: "اِتِّجَاه", word: "ittijah", meaning: "direction", example: "Ayna ittijah al-qiblah?" },
  ],
};

export function ArabicSection({
  lesson,
  loading,
  onSubmit,
}: {
  lesson: ArabicLesson | null;
  loading: boolean;
  onSubmit: (topic: string, text: string) => void;
}) {
  const [topic, setTopic] = useState("ramadan");
  const [text, setText] = useState("");
  const displayTopic = lesson?.topic ?? topic;
  const words = lesson?.words?.length
    ? lesson.words.map((word) => ({ arabic: "", word, meaning: "lesson word", example: "Use this word in a short sentence." }))
    : VOCAB[displayTopic] ?? VOCAB.ramadan;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-dark)]">Micro lesson</p>
        <h2 className="mt-1 font-display text-3xl font-bold text-[var(--green-dark)]">Arabic practice</h2>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--line)] bg-[var(--night-card)] p-1 sm:grid-cols-3">
        {TOPICS.map((item) => (
          <button
            key={item}
            onClick={() => setTopic(item)}
            className={`rounded-2xl px-3 py-2.5 text-sm font-bold capitalize transition ${
              topic === item ? "bg-[rgba(201,150,58,0.15)] text-[#f0c66a]" : "text-[var(--muted)]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--night-card)] p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold capitalize text-[var(--muted)]">
            {lesson?.level ?? "beginner"} · {displayTopic}
          </p>
          <span className="rounded-full bg-[var(--gold-soft)] px-3 py-1 text-xs font-bold text-[var(--gold-dark)]">
            Lesson
          </span>
        </div>

        <div className="mt-4 grid gap-2">
          {words.map((item) => (
            <div key={item.word} className="rounded-xl bg-[rgba(255,255,255,0.03)] p-4">
              {item.arabic && <p className="text-right font-display text-3xl font-bold text-[#f0c66a]" dir="rtl">{item.arabic}</p>}
              <p className="mt-2 font-display text-2xl font-bold text-[var(--green-dark)]">{item.word}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{item.meaning}</p>
              <p className="mt-2 text-xs italic text-[var(--gold)]">{item.example}</p>
            </div>
          ))}
        </div>
      </div>

      <textarea
        rows={4}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Write a short sentence using one of the words, for example: As-salah nur."
        className="w-full resize-none rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-4 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--gold)]"
      />

      <button
        disabled={loading}
        onClick={() => onSubmit(topic, text)}
        className="w-full rounded-xl border border-[rgba(201,150,58,0.3)] bg-[rgba(201,150,58,0.15)] px-5 py-3 text-sm font-bold text-[#f0c66a] transition hover:bg-[rgba(201,150,58,0.25)] disabled:opacity-60"
      >
        {loading ? "Checking..." : "Check answer"}
      </button>

      {(lesson?.practice || lesson?.reply) && (
        <div className="rounded-[22px] border border-[var(--green)]/20 bg-[var(--green-soft)] p-4 text-sm leading-7 text-[var(--green-dark)]">
          {lesson.practice && <p>{lesson.practice}</p>}
          {lesson.reply && <p className="mt-2 font-semibold">{lesson.reply}</p>}
        </div>
      )}
    </div>
  );
}
