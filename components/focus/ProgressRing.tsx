import type { TimerStatus } from "@/types/timer";
import type { PomodoroPhase } from "@/types/pomodoro";

interface ProgressRingProps {
  progress: number;
  status: TimerStatus;
  children: React.ReactNode;
  phase?: PomodoroPhase;
}

export function ProgressRing({ progress, status, children, phase }: ProgressRingProps) {
  const size = 440;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeProgress = Math.max(0, Math.min(1, progress));
  const offset = circumference * (1 - safeProgress);
  const urgent = status === "running" && safeProgress < 0.1;
  return (
    <div className={`progress-ring ${status}${phase ? ` phase-${phase}` : ""}`}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`剩余进度 ${Math.round(safeProgress * 100)}%`}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
        <circle
          className={`ring-value${urgent ? " urgent" : ""}`}
          cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
        />
      </svg>
      <div className="ring-content">{children}</div>
    </div>
  );
}
