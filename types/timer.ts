import type { PomodoroCycleState, TimerMode } from "./pomodoro";

export type TimerStatus = "idle" | "running" | "paused" | "completed";

export interface PersistedTimer {
  version: 2;
  status: TimerStatus;
  mode: TimerMode;
  totalSeconds: number;
  remainingSeconds: number;
  endAt: number | null;
  startedAt: number | null;
  taskName: string;
  category: string;
  sessionToken: string | null;
  savedSessionToken: string | null;
  notifiedToken: string | null;
  pomodoro: PomodoroCycleState | null;
}
