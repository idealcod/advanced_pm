"use client";
import { useState, useEffect } from "react";

interface CountdownTarget {
  left: string;
  progress: number;
}

function targetDetails(hhmm: string): CountdownTarget {
  const now = new Date();
  const [h, m] = hhmm.split(":").map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  let diff = target.getTime() - now.getTime();
  if (diff < 0) diff += 86_400_000;

  const hh = Math.floor(diff / 3_600_000);
  const mm = Math.floor((diff % 3_600_000) / 60_000);
  const ss = Math.floor((diff % 60_000) / 1_000);
  return {
    left: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`,
    progress: Math.min(1, Math.max(0, 1 - diff / 86_400_000)),
  };
}

export function useCountdown(suhurAlarm: string, iftarAlarm: string) {
  const [suhurLeft, setSuhurLeft] = useState("--:--:--");
  const [iftarLeft, setIftarLeft] = useState("--:--:--");
  const [suhurProgress, setSuhurProgress] = useState(0);
  const [iftarProgress, setIftarProgress] = useState(0);

  useEffect(() => {
    function tick() {
      const suhur = targetDetails(suhurAlarm);
      const iftar = targetDetails(iftarAlarm);
      setSuhurLeft(suhur.left);
      setIftarLeft(iftar.left);
      setSuhurProgress(suhur.progress);
      setIftarProgress(iftar.progress);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [suhurAlarm, iftarAlarm]);

  return { suhurLeft, iftarLeft, suhurProgress, iftarProgress };
}
