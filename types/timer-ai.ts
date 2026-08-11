import type { TimerMode } from "./pomodoro";

export interface TimerParseResult {
  mode: TimerMode;
  task_name: string | null;
  duration_minutes: number | null;
  focus_minutes: number | null;
  short_break_minutes: number | null;
  rounds: number | null;
  long_break_minutes: number | null;
}
