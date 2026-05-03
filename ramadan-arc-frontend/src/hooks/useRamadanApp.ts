"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addReminder,
  deleteReminder,
  getAnalytics,
  getDuas,
  getHadiths,
  getPrayerTimes,
  getReminders,
  getTodayHabits,
  getWakePlan,
  login,
  recordHabit,
  setAuthToken,
  submitLesson,
  updateReminder,
  type ArabicLesson,
  type Analytics,
  type AuthSession,
  type Dua,
  type HabitType,
  type Hadith,
  type PrayerSchedule,
  type Reminder,
  type User,
  type WakePlan,
} from "@/lib/api";

export const DEFAULT_H3 = "872830828fffffff";
const SESSION_KEY = "ramadan-arc-user";
export const AUTH_EXPIRED_EVENT = "ramadan-arc-auth-expired";

export interface HabitState {
  type: HabitType;
  label: string;
  accent: string;
  note: string;
  done: boolean;
}

const HABIT_META: Omit<HabitState, "done">[] = [
  { type: "fasting", label: "Fasting", accent: "F", note: "Daily fast completed" },
  { type: "tahajjud", label: "Tahajjud", accent: "T", note: "Night prayer offered" },
  { type: "quran", label: "Quran", accent: "Q", note: "Recitation or study" },
  { type: "sadaqah", label: "Sadaqah", accent: "S", note: "Charity or service" },
];

const FALLBACK_WAKE_PLAN: WakePlan = {
  date: new Date().toISOString().slice(0, 10),
  h3_index: DEFAULT_H3,
  fajr: "04:25",
  maghrib: "18:45",
  suhur: { kind: "suhur", time: "03:40", can_skip: false, no_way_to_skip: true },
  iftar: { kind: "iftar", time: "18:45", can_skip: false, no_way_to_skip: true },
  suhur_alarm: "03:40",
  iftar_alarm: "18:45",
  before_suhur_minutes: 45,
};

const FALLBACK_DUAS: Dua[] = [
  {
    id: 1,
    title: "Breaking the fast",
    arabic: "Dhahaba az-zamau wabtallatil-urooqu wa thabatal-ajru in sha Allah",
    meaning: "The thirst has gone, the veins are moistened, and the reward is confirmed, if Allah wills.",
    category: "iftar",
  },
  {
    id: 2,
    title: "Laylat al-Qadr",
    arabic: "Allahumma innaka afuwwun tuhibbul-afwa fafu anni",
    meaning: "O Allah, You are Most Forgiving and love forgiveness, so forgive me.",
    category: "ramadan",
  },
  {
    id: 3,
    title: "Guidance",
    arabic: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina adhaban-nar",
    meaning: "Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.",
    category: "daily",
  },
  {
    id: 4,
    title: "Between the two prostrations",
    arabic: "Rabbighfir li, warhamni, wajburni, warfani, warzuqni, wahdini",
    meaning: "My Lord, forgive me, have mercy on me, strengthen me, raise me, provide for me, and guide me.",
    category: "salah",
  },
  {
    id: 5,
    title: "Seeking forgiveness",
    arabic: "Astaghfirullah",
    meaning: "I seek forgiveness from Allah.",
    category: "dhikr",
  },
];

const FALLBACK_HADITHS: Hadith[] = [
  {
    id: 1,
    title: "Fasting reward",
    text: "Whoever fasts Ramadan with faith and seeking reward will have past sins forgiven.",
    source: "Sahih al-Bukhari; Sahih Muslim",
  },
  {
    id: 2,
    title: "Actions by intentions",
    text: "Actions are judged by intentions, and each person will have what they intended.",
    source: "Sahih al-Bukhari 1; Sahih Muslim 1907",
  },
  {
    id: 3,
    title: "Beloved deeds",
    text: "The most beloved deeds to Allah are those done consistently, even if they are few.",
    source: "Sahih al-Bukhari; Sahih Muslim",
  },
  {
    id: 4,
    title: "Guarding the tongue while fasting",
    text: "Whoever does not give up false speech and acting upon it, Allah has no need of him leaving his food and drink.",
    source: "Sahih al-Bukhari",
  },
];

const FALLBACK_ANALYTICS: Analytics = {
  h3_index: DEFAULT_H3,
  habit_count: 0,
  streak_days: 0,
  by_day: [],
  by_type: [],
};

function normalizeAnalytics(input: Analytics, h3Index: string): Analytics {
  return {
    h3_index: input.h3_index ?? h3Index,
    habit_count: input.habit_count ?? 0,
    streak_days: input.streak_days ?? 0,
    by_day: input.by_day ?? [],
    by_type: input.by_type ?? [],
  };
}

export function readStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User | AuthSession;
    return "user" in parsed ? parsed.user : parsed;
  } catch {
    return null;
  }
}

export function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User | AuthSession;
    const session = "user" in parsed ? parsed : { user: parsed, token: "" };
    setAuthToken(session.token);
    return session;
  } catch {
    return null;
  }
}

export function clearStoredUser() {
  if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
  setAuthToken("");
}

export function useRamadanApp(initialUser?: User | null) {
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("demo@ramadan-arc.app");
  const [role, setRole] = useState("user");
  const [h3Index, setH3Index] = useState(DEFAULT_H3);
  const [beforeSuhur, setBeforeSuhur] = useState(45);
  const [prayerSchedule, setPrayerSchedule] = useState<PrayerSchedule | null>(null);
  const [wakePlan, setWakePlan] = useState<WakePlan | null>(null);
  const [habits, setHabits] = useState<HabitState[]>(HABIT_META.map((h) => ({ ...h, done: false })));
  const [habitCount, setHabitCount] = useState(0);
  const [analytics, setAnalytics] = useState<Analytics>(FALLBACK_ANALYTICS);
  const [duas, setDuas] = useState<Dua[]>([]);
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [lesson, setLesson] = useState<ArabicLesson | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  const completedToday = useMemo(() => habits.filter((habit) => habit.done).length, [habits]);

  useEffect(() => {
    const storedSession = readStoredSession();
    const stored = initialUser ?? storedSession?.user;
    if (stored) {
      setUser(stored);
      setToken(storedSession?.token ?? "");
      setEmail(stored.email);
      setRole(stored.role);
      setH3Index(stored.h3_index);
    }
  }, [initialUser]);

  const loadForUser = useCallback(
    async (nextUser: User, nextH3 = nextUser.h3_index, suhurGap = beforeSuhur) => {
      setLoading(true);
      setError(null);
      try {
        const [prayers, alarms, analytics, todaysHabits, duaList, hadithList, reminderList] = await Promise.all([
          getPrayerTimes(nextH3),
          getWakePlan(nextH3, suhurGap),
          getAnalytics(nextH3, nextUser.id),
          getTodayHabits(nextUser.id),
          getDuas(),
          getHadiths(),
          getReminders(nextUser.id),
        ]);

        setPrayerSchedule(prayers);
        setWakePlan(alarms);
        const normalizedAnalytics = normalizeAnalytics(analytics, nextH3);
        setHabitCount(normalizedAnalytics.habit_count);
        setAnalytics(normalizedAnalytics);
        setDuas(duaList);
        setHadiths(hadithList);
        setReminders(reminderList);
        const doneTypes = new Set(todaysHabits.map((habit) => habit.type));
        setHabits(HABIT_META.map((habit) => ({ ...habit, done: doneTypes.has(habit.type) })));
        setApiMessage("Dashboard synced with backend.");
      } catch (err) {
        setWakePlan(FALLBACK_WAKE_PLAN);
        setPrayerSchedule({
          date: FALLBACK_WAKE_PLAN.date,
          h3_index: nextH3,
          fajr: FALLBACK_WAKE_PLAN.fajr,
          maghrib: FALLBACK_WAKE_PLAN.maghrib,
        });
        setDuas(FALLBACK_DUAS);
        setHadiths(FALLBACK_HADITHS);
        setReminders([]);
        setAnalytics({ ...FALLBACK_ANALYTICS, h3_index: nextH3 });
        setError(err instanceof Error ? err.message : "Backend unavailable");
      } finally {
        setLoading(false);
      }
    },
    [beforeSuhur]
  );

  const signIn = useCallback(
    async (nextEmail = email, nextH3 = h3Index, nextRole = role) => {
      setLoading(true);
      setError(null);
      try {
        const session = await login(nextEmail, nextH3, nextRole);
        const nextUser = session.user;
        setUser(nextUser);
        setToken(session.token);
        setEmail(nextUser.email);
        setRole(nextUser.role);
        setH3Index(nextUser.h3_index);
        setAuthToken(session.token);
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return nextUser;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to sign in");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [email, h3Index, role]
  );

  const signOut = useCallback(() => {
    clearStoredUser();
    setUser(null);
    setToken("");
  }, []);

  const toggleHabit = useCallback(
    async (type: HabitType) => {
      setHabits((prev) => prev.map((habit) => (habit.type === type ? { ...habit, done: !habit.done } : habit)));
      if (!user) return;

      try {
        await recordHabit(user.id, type, user.h3_index);
        const analytics = await getAnalytics(user.h3_index, user.id);
        const normalizedAnalytics = normalizeAnalytics(analytics, user.h3_index);
        setHabitCount(normalizedAnalytics.habit_count);
        setAnalytics(normalizedAnalytics);
        setApiMessage(`Saved ${type} habit.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to save habit");
      }
    },
    [user]
  );

  const toggleReminder = useCallback(async (id: number) => {
    const target = reminders.find((reminder) => reminder.id === id);
    if (!target) return;

    setReminders((prev) => prev.map((reminder) => (reminder.id === id ? { ...reminder, enabled: !reminder.enabled } : reminder)));
    try {
      const saved = await updateReminder(id, { enabled: !target.enabled });
      setReminders((prev) => prev.map((reminder) => (reminder.id === id ? saved : reminder)));
      setApiMessage("Reminder updated.");
    } catch (err) {
      setReminders((prev) => prev.map((reminder) => (reminder.id === id ? target : reminder)));
      setError(err instanceof Error ? err.message : "Unable to update reminder");
    }
  }, [reminders]);

  const removeReminder = useCallback(async (id: number) => {
    const target = reminders.find((reminder) => reminder.id === id);
    if (!target) return;

    setReminders((prev) => prev.filter((reminder) => reminder.id !== id));
    try {
      await deleteReminder(id);
      setApiMessage("Reminder deleted.");
    } catch (err) {
      setReminders((prev) => [target, ...prev].sort((a, b) => b.id - a.id));
      setError(err instanceof Error ? err.message : "Unable to delete reminder");
    }
  }, [reminders]);

  const createReminder = useCallback(
    async (type: string, message: string, timeValue: string) => {
      if (!user) return;
      const reminder = await addReminder(user.id, type, message, timeValue);
      setReminders((prev) => [reminder, ...prev]);
      setApiMessage("Reminder created.");
    },
    [user]
  );

  const sendLesson = useCallback(async (topic: string, text: string) => {
    setLessonLoading(true);
    setError(null);
    try {
      const nextLesson = await submitLesson("beginner", topic, text);
      setLesson(nextLesson);
      setApiMessage("Arabic lesson checked.");
    } catch (err) {
      setLesson({
        level: "beginner",
        topic,
        words: ["sawm", "suhur", "iftar"],
        practice: "Try one short sentence using today's vocabulary.",
        reply: "Lesson service is offline, but your practice was saved locally for this session.",
      });
      setError(err instanceof Error ? err.message : "Unable to check lesson");
    } finally {
      setLessonLoading(false);
    }
  }, []);

  return {
    user,
    token,
    email,
    role,
    h3Index,
    beforeSuhur,
    prayerSchedule,
    wakePlan,
    habits,
    habitCount,
    analytics,
    completedToday,
    duas,
    hadiths,
    reminders,
    lesson,
    lessonLoading,
    loading,
    error,
    apiMessage,
    setEmail,
    setRole,
    setH3Index,
    setBeforeSuhur,
    signIn,
    signOut,
    loadForUser,
    toggleHabit,
    toggleReminder,
    removeReminder,
    createReminder,
    sendLesson,
  };
}
