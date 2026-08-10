export interface PomodoroParseResult {
  task_name: string | null;
  focus_minutes: number | null;
  short_break_minutes: number | null;
  rounds: number | null;
  long_break_minutes: number | null;
}
