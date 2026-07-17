import type { FocusSession } from "@/types/focus-session";
import type { FocusSettings } from "@/types/settings";
import type { PersistedTimer, TimerStatus } from "@/types/timer";
import type { PomodoroCycleState, PomodoroPhase, TimerMode } from "@/types/pomodoro";
import { DEFAULT_POMODORO_SETTINGS, INITIAL_POMODORO_STATE } from "./pomodoro";

export const STORAGE_KEYS = {
  timer: "aprivity-focus:timer",
  sessions: "aprivity-focus:sessions",
  settings: "aprivity-focus:settings",
} as const;

export const DEFAULT_SETTINGS: FocusSettings = {
  soundEnabled: true,
  notificationsEnabled: false,
  defaultDurationMinutes: 45,
  confirmEndEnabled: true,
  autoFullscreen: false,
  reduceMotion: false,
  timerMode: "free",
  pomodoro: { ...DEFAULT_POMODORO_SETTINGS },
};

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
const modes: TimerMode[] = ["free", "pomodoro"];
const phases: PomodoroPhase[] = ["focus", "short-break", "long-break"];

function numberIn(value: unknown, min: number, max: number, fallback: number): number {
  return finiteNumber(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
}

export function parsePomodoroState(value: unknown): PomodoroCycleState {
  if (!isRecord(value)) return { ...INITIAL_POMODORO_STATE };
  return {
    phase: phases.includes(value.phase as PomodoroPhase) ? value.phase as PomodoroPhase : "focus",
    currentRound: numberIn(value.currentRound, 1, 12, 1),
    cycleId: typeof value.cycleId === "string" ? value.cycleId : null,
  };
}

export function parseTimer(raw: string | null, fallbackSeconds = 2700): PersistedTimer | null {
  const value = parse(raw);
  if (!isRecord(value) || !statuses.includes(value.status as TimerStatus)) return null;
  const total = finiteNumber(value.totalSeconds) && value.totalSeconds >= 60 && value.totalSeconds <= 43200
    ? Math.round(value.totalSeconds) : fallbackSeconds;
  const remaining = finiteNumber(value.remainingSeconds)
    ? Math.max(0, Math.min(total, Math.round(value.remainingSeconds))) : total;
  const mode: TimerMode = value.version === 1 ? "free" : modes.includes(value.mode as TimerMode) ? value.mode as TimerMode : "free";
  return {
    version: 2,
    status: value.status as TimerStatus,
    mode,
    totalSeconds: total,
    remainingSeconds: remaining,
    endAt: finiteNumber(value.endAt) ? value.endAt : null,
    startedAt: finiteNumber(value.startedAt) ? value.startedAt : null,
    taskName: typeof value.taskName === "string" ? value.taskName.slice(0, 120) : "",
    category: typeof value.category === "string" ? value.category : "其他",
    sessionToken: typeof value.sessionToken === "string" ? value.sessionToken : null,
    savedSessionToken: typeof value.savedSessionToken === "string" ? value.savedSessionToken : null,
    notifiedToken: typeof value.notifiedToken === "string" ? value.notifiedToken : null,
    pomodoro: mode === "pomodoro" ? parsePomodoroState(value.pomodoro) : null,
  };
}

function isSession(value: unknown): value is FocusSession {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.taskName === "string" &&
    typeof value.category === "string" && finiteNumber(value.plannedSeconds) &&
    finiteNumber(value.focusedSeconds) && finiteNumber(value.startedAt) &&
    finiteNumber(value.endedAt) && (value.status === "completed" || value.status === "stopped") &&
    (value.mode === undefined || value.mode === "free" || value.mode === "pomodoro") &&
    (value.cycleId === undefined || typeof value.cycleId === "string") &&
    (value.pomodoroRound === undefined || finiteNumber(value.pomodoroRound)) &&
    (value.pomodoroRoundsTotal === undefined || finiteNumber(value.pomodoroRoundsTotal));
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
  const pomodoro = isRecord(value.pomodoro) ? value.pomodoro : {};
  return {
    soundEnabled: typeof value.soundEnabled === "boolean" ? value.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
    notificationsEnabled: typeof value.notificationsEnabled === "boolean" ? value.notificationsEnabled : DEFAULT_SETTINGS.notificationsEnabled,
    defaultDurationMinutes: duration,
    confirmEndEnabled: typeof value.confirmEndEnabled === "boolean" ? value.confirmEndEnabled : DEFAULT_SETTINGS.confirmEndEnabled,
    autoFullscreen: typeof value.autoFullscreen === "boolean" ? value.autoFullscreen : DEFAULT_SETTINGS.autoFullscreen,
    reduceMotion: typeof value.reduceMotion === "boolean" ? value.reduceMotion : DEFAULT_SETTINGS.reduceMotion,
    timerMode: modes.includes(value.timerMode as TimerMode) ? value.timerMode as TimerMode : DEFAULT_SETTINGS.timerMode,
    pomodoro: {
      focusMinutes: numberIn(pomodoro.focusMinutes, 1, 180, DEFAULT_POMODORO_SETTINGS.focusMinutes),
      shortBreakMinutes: numberIn(pomodoro.shortBreakMinutes, 1, 60, DEFAULT_POMODORO_SETTINGS.shortBreakMinutes),
      longBreakMinutes: numberIn(pomodoro.longBreakMinutes, 1, 120, DEFAULT_POMODORO_SETTINGS.longBreakMinutes),
      roundsBeforeLongBreak: numberIn(pomodoro.roundsBeforeLongBreak, 2, 12, DEFAULT_POMODORO_SETTINGS.roundsBeforeLongBreak),
      autoStartBreaks: typeof pomodoro.autoStartBreaks === "boolean" ? pomodoro.autoStartBreaks : DEFAULT_POMODORO_SETTINGS.autoStartBreaks,
      autoStartFocus: typeof pomodoro.autoStartFocus === "boolean" ? pomodoro.autoStartFocus : DEFAULT_POMODORO_SETTINGS.autoStartFocus,
    },
  };
}

export function readStorage<T>(key: string, parser: (raw: string | null) => T): T {
  if (typeof window === "undefined") return parser(null);
  return parser(window.localStorage.getItem(key));
}

export function writeStorage(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage can be unavailable. */ }
}
