import { CalendarSearch, CheckCircle2, CircleStop, Layers3 } from "lucide-react";
import { formatHumanDuration } from "@/lib/time-format";
import type { FocusSession } from "@/types/focus-session";
import type { DailyFocusSummary } from "@/types/history-analytics";

function modeLabel(session: FocusSession): string {
  return session.mode === "pomodoro" && session.pomodoroRound && session.pomodoroRoundsTotal
    ? `番茄 · 第 ${session.pomodoroRound}/${session.pomodoroRoundsTotal} 轮`
    : "自由专注";
}

export function DayFocusDetails({ summary, sessions }: {
  summary: DailyFocusSummary | null;
  sessions: FocusSession[];
}) {
  if (!summary) {
    return (
      <section className="day-focus-details surface" aria-labelledby="day-details-title">
        <div className="day-details-empty">
          <CalendarSearch aria-hidden="true" />
          <h2 id="day-details-title">单日专注详情</h2>
          <p>选择一个有记录的日期，查看当天的任务与分类分布。</p>
        </div>
      </section>
    );
  }

  const categoryEntries = Object.entries(summary.categorySeconds)
    .filter(([, seconds]) => seconds > 0)
    .sort((left, right) => right[1] - left[1]);
  const primaryCategory = categoryEntries[0]?.[0] ?? "暂无";
  const maxCategorySeconds = categoryEntries[0]?.[1] ?? 1;
  const dateTitle = summary.date.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" });

  return (
    <section className="day-focus-details surface" aria-labelledby="day-details-title">
      <header className="day-details-heading">
        <div>
          <p className="eyebrow">Selected day</p>
          <h2 id="day-details-title">{dateTitle}</h2>
        </div>
        <span>{summary.sessionCount} 次记录</span>
      </header>

      {sessions.length === 0 ? (
        <div className="day-details-empty compact-empty"><CalendarSearch aria-hidden="true" /><p>这一天还没有专注记录。</p></div>
      ) : (
        <>
          <dl className="day-summary-grid">
            <div><dt>专注时间</dt><dd>{formatHumanDuration(summary.focusedSeconds)}</dd></div>
            <div><dt>完成次数</dt><dd>{summary.completedCount} 次</dd></div>
            <div><dt>中途结束</dt><dd>{summary.stoppedCount} 次</dd></div>
            <div><dt>主要分类</dt><dd>{primaryCategory}</dd></div>
          </dl>

          <div className="category-distribution" aria-label="当天分类分布">
            <h3><Layers3 aria-hidden="true" />分类分布</h3>
            {categoryEntries.map(([category, seconds]) => (
              <div key={category} className="category-distribution-row">
                <div><span>{category}</span><strong>{formatHumanDuration(seconds)}</strong></div>
                <span className="category-progress" aria-hidden="true"><i style={{ width: `${Math.max(4, (seconds / maxCategorySeconds) * 100)}%` }} /></span>
              </div>
            ))}
          </div>

          <div className="day-session-list">
            <h3>当天记录</h3>
            {sessions.map((session) => (
              <article key={session.id} className="day-session-item">
                <span className={`day-session-status ${session.status}`} aria-hidden="true">
                  {session.status === "completed" ? <CheckCircle2 /> : <CircleStop />}
                </span>
                <div>
                  <strong>{session.taskName}</strong>
                  <p>{session.category} · {formatHumanDuration(session.focusedSeconds)} · {session.status === "completed" ? "已完成" : "提前结束"}</p>
                  <small>{modeLabel(session)}</small>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
