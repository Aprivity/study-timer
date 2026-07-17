import { memo, type FocusEvent, type MouseEvent } from "react";
import { formatHumanDuration } from "@/lib/time-format";
import type { DailyFocusSummary } from "@/types/history-analytics";

function dateLabel(date: Date): string {
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
}

function ariaDuration(seconds: number): string {
  if (seconds > 0 && seconds < 60) return "不足 1 分钟";
  return formatHumanDuration(seconds);
}

export const HeatmapCell = memo(function HeatmapCell({
  summary,
  selected,
  today,
  disabled = false,
  onSelect,
  onShowTooltip,
  onHideTooltip,
}: {
  summary: DailyFocusSummary;
  selected: boolean;
  today: boolean;
  disabled?: boolean;
  onSelect: (dateKey: string) => void;
  onShowTooltip?: (summary: DailyFocusSummary, target: HTMLButtonElement) => void;
  onHideTooltip?: () => void;
}) {
  const label = `${dateLabel(summary.date)}，专注${ariaDuration(summary.focusedSeconds)}，共 ${summary.sessionCount} 次记录，强度等级 ${summary.level}${today ? "，今天" : ""}`;
  const showTooltip = (event: MouseEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>) => {
    if (!disabled) onShowTooltip?.(summary, event.currentTarget);
  };

  return (
    <span className="heatmap-cell-wrap">
      <button
        type="button"
        className={`heatmap-cell level-${summary.level}${selected ? " selected" : ""}${today ? " today" : ""}`}
        aria-label={label}
        aria-pressed={selected}
        data-date-key={summary.dateKey}
        data-level={summary.level}
        tabIndex={summary.sessionCount > 0 || today ? 0 : -1}
        disabled={disabled}
        onClick={() => onSelect(summary.dateKey)}
        onMouseEnter={showTooltip}
        onMouseLeave={onHideTooltip}
        onFocus={showTooltip}
        onBlur={onHideTooltip}
      >
        <span className="sr-only">{summary.level} 级</span>
      </button>
    </span>
  );
});
