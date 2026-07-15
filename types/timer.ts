export type TimerStatus = "idle" | "running" | "paused" | "completed";

export interface PersistedTimer {
  version: 1;
  status: TimerStatus;
  totalSeconds: number;
  remainingSeconds: number;
  endAt: number | null;
  startedAt: number | null;
  taskName: string;
  category: string;
  sessionToken: string | null;
  savedSessionToken: string | null;
}
