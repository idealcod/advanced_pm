const BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const SESSION_KEY = "ramadan-arc-user";
const AUTH_EXPIRED_EVENT = "ramadan-arc-auth-expired";

let inMemoryToken = "";

export interface User {
  id: number;
  email: string;
  role: string;
  h3_index: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

export interface PrayerSchedule {
  date: string;
  h3_index: string;
  fajr: string;
  maghrib: string;
}

export interface WakePlan {
  date: string;
  h3_index: string;
  fajr: string;
  maghrib: string;
  suhur: { kind: string; time: string; can_skip: boolean; no_way_to_skip: boolean };
  iftar: { kind: string; time: string; can_skip: boolean; no_way_to_skip: boolean };
  suhur_alarm: string;
  iftar_alarm: string;
  before_suhur_minutes: number;
}

export interface Habit {
  id: number;
  user_id: number;
  type: string;
  h3_index: string;
  timestamp: string;
}

export interface Analytics {
  h3_index: string;
  habit_count: number;
  streak_days: number;
  by_day: { date: string; count: number }[];
  by_type: { type: string; count: number }[];
}

export interface Dua {
  id: number;
  title: string;
  arabic: string;
  meaning: string;
  category: string;
}

export interface Hadith {
  id: number;
  title: string;
  text: string;
  source: string;
}

export interface Reminder {
  id: number;
  user_id: number;
  type: string;
  message: string;
  time_value: string;
  enabled: boolean;
  created_at: string;
}

export interface ArabicLesson {
  level: string;
  topic: string;
  words: string[];
  practice: string;
  reply: string;
}

export type HabitType = "fasting" | "tahajjud" | "quran" | "sadaqah";

export class ApiAuthError extends Error {
  constructor(message = "Session expired. Please sign in again.") {
    super(message);
    this.name = "ApiAuthError";
  }
}

export function setAuthToken(token: string) {
  inMemoryToken = token;
}

function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User | AuthSession;
    return "user" in parsed ? parsed : { user: parsed, token: "" };
  } catch {
    return null;
  }
}

function writeStoredSession(session: AuthSession) {
  setAuthToken(session.token);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

function clearStoredSession() {
  setAuthToken("");
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}

function authHeaders(): Record<string, string> {
  const token = inMemoryToken || readStoredSession()?.token || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  if (!BASE) throw new Error("NEXT_PUBLIC_API_URL is not configured");

  const headers = {
    ...authHeaders(),
    ...(init.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${BASE}${path}`, { cache: "no-store", ...init, headers });
  if (res.status === 401 && retry) {
    const refreshed = await refreshSession().catch(() => null);
    if (refreshed) return request<T>(path, init, false);
    clearStoredSession();
    throw new ApiAuthError();
  }
  if (res.status === 401) {
    clearStoredSession();
    throw new ApiAuthError();
  }
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} -> ${res.status}: ${await res.text()}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

async function post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function del(path: string): Promise<void> {
  await request<void>(path, { method: "DELETE" });
}

export async function login(email: string, h3_index: string, role = "user"): Promise<AuthSession> {
  const session = await post<AuthSession>("/login", { email, role, h3_index });
  writeStoredSession(session);
  return session;
}

export async function refreshSession(): Promise<AuthSession> {
  const session = await request<AuthSession>("/refresh", { method: "POST" }, false);
  writeStoredSession(session);
  return session;
}

export async function getPrayerTimes(h3: string): Promise<PrayerSchedule> {
  return get<PrayerSchedule>(`/prayer-times?h3=${encodeURIComponent(h3)}`);
}

export async function getWakePlan(h3: string, before_suhur = 45): Promise<WakePlan> {
  return get<WakePlan>(`/alarms?h3=${encodeURIComponent(h3)}&before_suhur=${before_suhur}`);
}

export async function recordHabit(user_id: number, type: HabitType, h3_index: string): Promise<Habit> {
  return post<Habit>("/habit", { user_id, type, h3_index });
}

export async function getTodayHabits(user_id: number, date = new Date().toISOString().slice(0, 10)): Promise<Habit[]> {
  return get<Habit[]>(`/habit?user_id=${user_id}&date=${encodeURIComponent(date)}`);
}

export async function getAnalytics(h3: string, user_id?: number): Promise<Analytics> {
  const user = user_id ? `&user_id=${user_id}` : "";
  return get<Analytics>(`/analytics?h3=${encodeURIComponent(h3)}${user}`);
}

export async function getDuas(category?: string): Promise<Dua[]> {
  const q = category ? `?category=${encodeURIComponent(category)}` : "";
  return asArray<Dua>(await get<Dua[] | { value?: Dua[] }>(`/duas${q}`));
}

export async function getHadiths(limit = 20, offset = 0): Promise<Hadith[]> {
  return asArray<Hadith>(await get<Hadith[] | { value?: Hadith[] }>(`/hadiths?limit=${limit}&offset=${offset}`));
}

export async function getReminders(user_id: number, type?: string): Promise<Reminder[]> {
  const q = type ? `&type=${encodeURIComponent(type)}` : "";
  return asArray<Reminder>(await get<Reminder[] | { value?: Reminder[] }>(`/reminders?user_id=${user_id}${q}`));
}

export async function addReminder(
  user_id: number,
  type: string,
  message: string,
  time_value: string,
  enabled = true
): Promise<Reminder> {
  return post<Reminder>("/reminders", { user_id, type, message, time_value, enabled });
}

export async function updateReminder(id: number, body: Partial<Pick<Reminder, "type" | "message" | "time_value" | "enabled">>): Promise<Reminder> {
  return patch<Reminder>(`/reminders/${id}`, body);
}

export async function deleteReminder(id: number): Promise<void> {
  return del(`/reminders/${id}`);
}

export async function submitLesson(level: string, topic: string, text: string): Promise<ArabicLesson> {
  return post<ArabicLesson>("/arabic-lesson", { level, topic, text });
}

function asArray<T>(payload: T[] | { value?: T[] }): T[] {
  return Array.isArray(payload) ? payload : payload.value ?? [];
}
