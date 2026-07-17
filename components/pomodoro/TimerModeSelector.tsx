import type { TimerMode } from "@/types/pomodoro";

export function TimerModeSelector({ mode, disabled, onChange }: { mode: TimerMode; disabled: boolean; onChange: (mode: TimerMode) => void }) {
  return <div className="timer-mode-selector" role="group" aria-label="计时模式">
    <button type="button" aria-pressed={mode === "free"} disabled={disabled} onClick={() => onChange("free")}>自由专注</button>
    <button type="button" aria-pressed={mode === "pomodoro"} disabled={disabled} onClick={() => onChange("pomodoro")}>番茄循环</button>
  </div>;
}
