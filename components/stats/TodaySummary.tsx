import { CheckCircle2, Clock3, Flame } from "lucide-react";
import { formatHumanDuration } from "@/lib/time-format";
import { getFocusStreak, getTodayCompletedCount, getTodayFocusedSeconds } from "@/lib/statistics";
import type { FocusSession } from "@/types/focus-session";

export function TodaySummary({ sessions }: { sessions: FocusSession[] }) {
  const items = [
    { label: "今日专注时长", value: formatHumanDuration(getTodayFocusedSeconds(sessions)), icon: Clock3 },
    { label: "今日完成次数", value: `${getTodayCompletedCount(sessions)} 次`, icon: CheckCircle2 },
    { label: "连续专注天数", value: `${getFocusStreak(sessions)} 天`, icon: Flame },
  ];
  return <section className="today-summary" aria-label="今日学习统计">{items.map(({ label, value, icon: Icon }) => <div key={label}><Icon size={18} /><span>{label}</span><strong>{value}</strong></div>)}</section>;
}
