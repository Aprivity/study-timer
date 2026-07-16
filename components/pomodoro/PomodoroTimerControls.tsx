import { Pause, Play, RotateCcw, SkipForward, Square } from "lucide-react";
import { getPomodoroPhaseLabel } from "@/lib/pomodoro";
import type { PomodoroPhase } from "@/types/pomodoro";
import type { TimerStatus } from "@/types/timer";

export function PomodoroTimerControls({ status, phase, onStart, onPause, onResume, onEndFocus, onSkipBreak, onResetCycle }: {
  status: TimerStatus; phase: PomodoroPhase; onStart: () => void; onPause: () => void; onResume: () => void;
  onEndFocus: () => void; onSkipBreak: () => void; onResetCycle: () => void;
}) {
  const focus = phase === "focus";
  const label = getPomodoroPhaseLabel(phase);
  if (status === "idle") return <div className="timer-controls"><button className="primary-button" onClick={onStart}><Play size={18} fill="currentColor" />开始{label}</button>{!focus && <button className="secondary-button" onClick={onSkipBreak}><SkipForward size={17} />跳过休息</button>}</div>;
  if (status === "running") return <div className="timer-controls"><button className="primary-button" onClick={onPause}><Pause size={18} />{focus ? "暂停" : "暂停休息"}</button><button className="secondary-button" onClick={focus ? onEndFocus : onSkipBreak}>{focus ? <Square size={17} /> : <SkipForward size={17} />}{focus ? "提前结束本轮" : "跳过休息"}</button></div>;
  if (status === "paused") return <div className="timer-controls"><button className="primary-button" onClick={onResume}><Play size={18} fill="currentColor" />{focus ? "继续专注" : "继续休息"}</button><button className="secondary-button" onClick={focus ? onEndFocus : onSkipBreak}>{focus ? <Square size={17} /> : <SkipForward size={17} />}{focus ? "结束本轮" : "跳过休息"}</button></div>;
  return <div className="timer-controls"><button className="primary-button" onClick={onResetCycle}><RotateCcw size={18} />重置番茄循环</button></div>;
}
