import { CheckCircle2, CircleStop, Trash2 } from "lucide-react";
import { formatHumanDuration } from "@/lib/time-format";
import type { FocusSession } from "@/types/focus-session";

export function HistoryItem({ session, onDelete }: { session: FocusSession; onDelete: (id: string) => void }) {
  const start = new Date(session.startedAt);
  const modeLabel = session.mode === "pomodoro" && session.pomodoroRound && session.pomodoroRoundsTotal ? `番茄 · 第 ${session.pomodoroRound}/${session.pomodoroRoundsTotal} 轮` : "自由专注";
  return <article className="history-item">
    <div className={`history-status-icon ${session.status}`}>{session.status === "completed" ? <CheckCircle2 size={19} /> : <CircleStop size={19} />}</div>
    <div className="history-main"><h3>{session.taskName}</h3><div className="history-meta"><span>{session.category}</span><span>{modeLabel}</span><span>{start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span><span>{session.status === "completed" ? "按计划完成" : "提前结束"}</span></div></div>
    <div className="history-duration"><strong>{formatHumanDuration(session.focusedSeconds)}</strong><span>计划 {formatHumanDuration(session.plannedSeconds)}</span></div>
    <button className="delete-icon" type="button" onClick={() => onDelete(session.id)} aria-label={`删除记录：${session.taskName}`}><Trash2 size={17} /></button>
  </article>;
}
