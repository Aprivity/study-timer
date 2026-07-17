import type { PomodoroCycleState, PomodoroPhase, PomodoroSettings, TimerMode } from "@/types/pomodoro";

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  roundsBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
};

export const INITIAL_POMODORO_STATE: PomodoroCycleState = { phase: "focus", currentRound: 1, cycleId: null };

export function getPhaseDurationSeconds(phase: PomodoroPhase, settings: PomodoroSettings): number {
  const minutes = phase === "focus" ? settings.focusMinutes : phase === "short-break" ? settings.shortBreakMinutes : settings.longBreakMinutes;
  return minutes * 60;
}

export function getNextPomodoroState(state: PomodoroCycleState, settings: PomodoroSettings): PomodoroCycleState {
  if (state.phase === "focus") return {
    phase: state.currentRound >= settings.roundsBeforeLongBreak ? "long-break" : "short-break",
    currentRound: Math.min(state.currentRound, settings.roundsBeforeLongBreak),
    cycleId: state.cycleId,
  };
  if (state.phase === "short-break") return { phase: "focus", currentRound: Math.min(state.currentRound + 1, settings.roundsBeforeLongBreak), cycleId: state.cycleId };
  return { ...INITIAL_POMODORO_STATE };
}

export function getPomodoroPhaseLabel(phase: PomodoroPhase): string {
  return phase === "focus" ? "专注" : phase === "short-break" ? "短休息" : "长休息";
}

export function shouldAutoStartNextPhase(phase: PomodoroPhase, settings: PomodoroSettings): boolean {
  return phase === "focus" ? settings.autoStartFocus : settings.autoStartBreaks;
}

export function shouldRecordPhase(mode: TimerMode, phase: PomodoroPhase): boolean {
  return mode === "free" || phase === "focus";
}

export function getNextPhaseDescription(state: PomodoroCycleState, settings: PomodoroSettings): string {
  const next = getNextPomodoroState(state, settings);
  return `${getPomodoroPhaseLabel(next.phase)} ${Math.round(getPhaseDurationSeconds(next.phase, settings) / 60)} 分钟`;
}
