export type FocusSessionStatus = "completed" | "stopped";

export interface FocusSession {
  id: string;
  taskName: string;
  category: string;
  plannedSeconds: number;
  focusedSeconds: number;
  startedAt: number;
  endedAt: number;
  status: FocusSessionStatus;
}
