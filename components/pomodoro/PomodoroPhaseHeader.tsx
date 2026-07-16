import { Coffee, Focus, Sparkles } from "lucide-react";
import { getNextPhaseDescription, getPomodoroPhaseLabel } from "@/lib/pomodoro";
import type { PomodoroCycleState, PomodoroSettings } from "@/types/pomodoro";
import { PomodoroRoundProgress } from "./PomodoroRoundProgress";

export function PomodoroPhaseHeader({ state, settings }: { state: PomodoroCycleState; settings: PomodoroSettings }) {
  const Icon = state.phase === "focus" ? Focus : state.phase === "short-break" ? Coffee : Sparkles;
  return <div className={`pomodoro-phase-card ${state.phase}`}>
    <div className="pomodoro-phase-copy"><span><Icon />当前阶段：{getPomodoroPhaseLabel(state.phase)}</span><strong>第 {state.currentRound} / {settings.roundsBeforeLongBreak} 轮</strong><small>下一阶段：{getNextPhaseDescription(state, settings)}</small></div>
    <PomodoroRoundProgress state={state} total={settings.roundsBeforeLongBreak} />
  </div>;
}
