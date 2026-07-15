import { Pause, Play, RotateCcw, Square } from "lucide-react";
import type { TimerStatus } from "@/types/timer";

export function TimerControls({ status, onStart, onPause, onResume, onEnd, onReset, onHistory }: {
  status: TimerStatus; onStart: () => void; onPause: () => void; onResume: () => void;
  onEnd: () => void; onReset: () => void; onHistory: () => void;
}) {
  if (status === "idle") return <div className="timer-controls"><button className="primary-button" onClick={onStart}><Play size={18} fill="currentColor" />开始专注</button></div>;
  if (status === "running") return <div className="timer-controls"><button className="primary-button" onClick={onPause}><Pause size={18} />暂停</button><button className="secondary-button" onClick={onEnd}><Square size={17} />提前结束</button></div>;
  if (status === "paused") return <div className="timer-controls"><button className="primary-button" onClick={onResume}><Play size={18} fill="currentColor" />继续专注</button><button className="secondary-button" onClick={onEnd}><Square size={17} />结束本次</button></div>;
  return <div className="timer-controls"><button className="primary-button" onClick={onReset}><RotateCcw size={18} />开始新的专注</button><button className="secondary-button" onClick={onHistory}>查看记录</button></div>;
}
