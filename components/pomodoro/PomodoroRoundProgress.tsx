import type { PomodoroCycleState } from "@/types/pomodoro";

export function PomodoroRoundProgress({ state, total }: { state: PomodoroCycleState; total: number }) {
  const completed = state.phase === "focus" ? state.currentRound - 1 : state.currentRound;
  return <div className="pomodoro-round-dots" role="img" aria-label={`已完成 ${completed} 轮，共 ${total} 轮`}>
    {Array.from({ length: total }, (_, index) => {
      const round = index + 1;
      const className = round <= completed ? "completed" : state.phase === "focus" && round === state.currentRound ? "current" : "";
      return <span key={round} className={className} />;
    })}
  </div>;
}
