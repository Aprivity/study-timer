import type { FocusSession } from "@/types/focus-session";
import type { FocusSettings } from "@/types/settings";
import type { PersistedTimer, TimerStatus } from "@/types/timer";

export const STORAGE_KEYS = {
  timer: "aprivity-focus:timer",
  sessions: "aprivity-focus:sessions",
  settings: "aprivity-focus:settings",
} as const;

export const DEFAULT_SETTINGS: FocusSettings = { soundEnabled: true, defaultDurationMinutes: 45 };

function parse(raw: string | null): unknown {
  if (!raw) return null;
  try { return JSON.parse(raw) as unknown; } catch { return null; }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

const statuses: TimerStatus[] = ["idle", "running", "paused", "completed"];

export function parseTimer(raw: string | null, fallbackSeconds = 2700): PersistedTimer | null {
  const value = parse(raw);
  if (!isRecord(value) || !statuses.includes(value.status as TimerStatus)) return null;
  const total = finiteNumber(value.totalSeconds) && value.totalSeconds >= 60 && value.totalSeconds <= 43200
    ? Math.round(value.totalSeconds) : fallbackSeconds;
  const remaining = finiteNumber(value.remainingSeconds)
    ? Math.max(0, Math.min(total, Math.round(value.remainingSeconds))) : total;
  return {
    version: 1,
    status: value.status as TimerStatus,
    totalSeconds: total,
    remainingSeconds: remaining,
    endAt: finiteNumber(value.endAt) ? value.endAt : null,
    startedAt: finiteNumber(value.startedAt) ? value.startedAt : null,
    taskName: typeof value.taskName === "string" ? value.taskName.slice(0, 120) : "",
    category: typeof value.category === "string" ? value.category : "其他",
    sessionToken: typeof value.sessionToken === "string" ? value.sessionToken : null,
    savedSessionToken: typeof value.savedSessionToken === "string" ? value.savedSessionToken : null,
  };
}

function isSession(value: unknown): value is FocusSession {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.taskName === "string" &&
    typeof value.category === "string" && finiteNumber(value.plannedSeconds) &&
    finiteNumber(value.focusedSeconds) && finiteNumber(value.startedAt) &&
    finiteNumber(value.endedAt) && (value.status === "completed" || value.status === "stopped");
}

export function parseSessions(raw: string | null): FocusSession[] {
  const value = parse(raw);
  if (!Array.isArray(value)) return [];
  return value.filter(isSession).map((s) => ({ ...s, focusedSeconds: Math.max(0, s.focusedSeconds) }));
}

export function parseSettings(raw: string | null): FocusSettings {
  const value = parse(raw);
  if (!isRecord(value)) return DEFAULT_SETTINGS;
  const duration = finiteNumber(value.defaultDurationMinutes) && value.defaultDurationMinutes >= 1 && value.defaultDurationMinutes <= 720
    ? Math.round(value.defaultDurationMinutes) : DEFAULT_SETTINGS.defaultDurationMinutes;
  return { soundEnabled: typeof value.soundEnabled === "boolean" ? value.soundEnabled : true, defaultDurationMinutes: duration };
}

export function readStorage<T>(key: string, parser: (raw: string | null) => T): T {
  if (typeof window === "undefined") return parser(null);
  return parser(window.localStorage.getItem(key));
}

export function writeStorage(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage can be unavailable. */ }
}
