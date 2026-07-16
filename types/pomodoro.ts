export type TimerMode = "free" | "pomodoro";
export type PomodoroPhase = "focus" | "short-break" | "long-break";

export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  roundsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
}

export interface PomodoroCycleState {
  phase: PomodoroPhase;
  currentRound: number;
  cycleId: string | null;
}
