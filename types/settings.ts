import type { PomodoroSettings, TimerMode } from "./pomodoro";

export interface FocusSettings {
  soundEnabled: boolean;
  defaultDurationMinutes: number;
  confirmEndEnabled: boolean;
  autoFullscreen: boolean;
  reduceMotion: boolean;
  timerMode: TimerMode;
  pomodoro: PomodoroSettings;
}
