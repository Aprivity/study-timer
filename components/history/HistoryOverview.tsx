import { CalendarDays, CheckCircle2, Clock3, Flame } from "lucide-react";
import { formatHumanDuration } from "@/lib/time-format";
import type { HistoryOverviewData } from "@/types/history-analytics";

const METRICS = [
  { key: "focusedSeconds", label: "累计专注", icon: Clock3 },
  { key: "activeDays", label: "活跃天数", icon: CalendarDays },
  { key: "longestStreak", label: "最长连续", icon: Flame },
  { key: "completedCount", label: "完成次数", icon: CheckCircle2 },
] as const;

export function HistoryOverview({ data, category }: { data: HistoryOverviewData; category: string }) {
  const values = {
    focusedSeconds: formatHumanDuration(data.focusedSeconds),
    activeDays: `${data.activeDays} 天`,
    longestStreak: `${data.longestStreak} 天`,
    completedCount: `${data.completedCount} 次`,
  };

  return (
    <section className="history-overview" aria-labelledby="history-overview-title">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Year in focus</p>
          <h2 id="history-overview-title">历史概览</h2>
        </div>
        <span>{category === "全部" ? "全部分类" : category} · 过去一年</span>
      </div>
      <div className="history-overview-grid">
        {METRICS.map(({ key, label, icon: Icon }) => (
          <article key={key} className="overview-metric surface">
            <Icon aria-hidden="true" />
            <div>
              <span>{label}</span>
              <strong>{values[key]}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
