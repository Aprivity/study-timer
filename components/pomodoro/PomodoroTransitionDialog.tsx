"use client";

import { ArrowRight, Clock3, X } from "lucide-react";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { getPhaseDurationSeconds, getPomodoroPhaseLabel } from "@/lib/pomodoro";
import type { PomodoroCycleState, PomodoroPhase, PomodoroSettings } from "@/types/pomodoro";

export function PomodoroTransitionDialog({ open, completedPhase, completedRound, nextState, settings, taskName, onStart, onLater }: {
  open: boolean; completedPhase: PomodoroPhase | null; nextState: PomodoroCycleState; settings: PomodoroSettings;
  completedRound: number; taskName: string; onStart: () => void; onLater: () => void;
}) {
  const dialogRef = useDialogFocus(open, onLater);
  if (!open || !completedPhase) return null;
  const wasFocus = completedPhase === "focus";
  const completedTitle = completedPhase === "long-break" ? "长休息结束" : wasFocus && nextState.phase === "long-break" ? "本轮循环完成" : wasFocus ? `第 ${completedRound} 轮专注完成` : "休息结束";
  const nextLabel = getPomodoroPhaseLabel(nextState.phase);
  const minutes = getPhaseDurationSeconds(nextState.phase, settings) / 60;
  return <div className="dialog-backdrop" role="presentation"><div ref={dialogRef} className="dialog complete-dialog" role="dialog" aria-modal="true" aria-labelledby="pomodoro-transition-title" aria-describedby="pomodoro-transition-description">
    <button className="dialog-close" onClick={onLater} aria-label="关闭阶段提示"><X size={18} /></button>
    <span className="complete-icon"><ArrowRight size={24} /></span><p className="eyebrow">Pomodoro transition</p>
    <h2 id="pomodoro-transition-title">{completedTitle}</h2>
    <p id="pomodoro-transition-description">下一阶段：{nextLabel} {minutes} 分钟<br />任务：“{taskName || "未命名专注"}”</p>
    <div className="dialog-actions"><button className="primary-button" onClick={onStart}><Clock3 size={17} />开始{nextLabel}</button><button className="secondary-button" onClick={onLater}>稍后开始</button></div>
  </div></div>;
}
