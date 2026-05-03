import type { WakePlan } from "@/lib/api";

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export interface PrayerTime {
  key: PrayerKey;
  label: string;
  time: string;
}

const PRAYER_LABELS: Record<PrayerKey, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

export function getPrayerTimes(wakePlan: WakePlan | null): PrayerTime[] {
  const fajr = wakePlan?.fajr ?? "04:25";
  const maghrib = wakePlan?.maghrib ?? "18:45";

  return [
    { key: "fajr", label: PRAYER_LABELS.fajr, time: fajr },
    { key: "dhuhr", label: PRAYER_LABELS.dhuhr, time: "13:15" },
    { key: "asr", label: PRAYER_LABELS.asr, time: "17:02" },
    { key: "maghrib", label: PRAYER_LABELS.maghrib, time: maghrib },
    { key: "isha", label: PRAYER_LABELS.isha, time: "20:20" },
  ];
}

export function currentPrayer(prayers: PrayerTime[]): PrayerKey {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let active: PrayerKey = "fajr";

  prayers.forEach((prayer) => {
    if (currentMinutes >= minutesFromTime(prayer.time)) active = prayer.key;
  });

  return active;
}

export function minutesFromTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
