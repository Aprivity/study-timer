"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Filter } from "lucide-react";
import { CATEGORIES } from "@/components/focus/TaskInput";
import { getLocalDateKey, startOfLocalDay } from "@/lib/local-date";
import { formatHumanDuration } from "@/lib/time-format";
import type { DailyFocusSummary } from "@/types/history-analytics";
import { HeatmapCell } from "./HeatmapCell";
import { HeatmapLegend } from "./HeatmapLegend";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

interface MonthLabel {
  column: number;
  text: string;
}

interface TooltipState {
  summary: DailyFocusSummary;
  x: number;
  y: number;
  below: boolean;
}

function tooltipDuration(seconds: number): string {
  return seconds > 0 && seconds < 60 ? "不足 1 分钟" : formatHumanDuration(seconds);
}

function getMonthLabels(summaries: DailyFocusSummary[]): MonthLabel[] {
  const labels: MonthLabel[] = [];
  const weeks = Math.ceil(summaries.length / 7);
  for (let week = 0; week < weeks; week += 1) {
    const dates = summaries.slice(week * 7, week * 7 + 7).map((summary) => summary.date);
    const firstOfMonth = dates.find((date) => date.getDate() === 1);
    const labelDate = week === 0 ? dates[0] : firstOfMonth;
    if (!labelDate) continue;
    const includeYear = week === 0 || labelDate.getMonth() === 0;
    labels.push({
      column: week + 1,
      text: includeYear ? `${labelDate.getFullYear()}年${labelDate.getMonth() + 1}月` : `${labelDate.getMonth() + 1}月`,
    });
  }
  return labels;
}

export function FocusHeatmap({
  summaries,
  selectedDateKey,
  today,
  category,
  hasSessions,
  onSelectDate,
  onCategoryChange,
}: {
  summaries: DailyFocusSummary[];
  selectedDateKey: string | null;
  today: Date;
  category: string;
  hasSessions: boolean;
  onSelectDate: (dateKey: string) => void;
  onCategoryChange: (category: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const monthLabels = useMemo(() => getMonthLabels(summaries), [summaries]);
  const weekCount = Math.ceil(summaries.length / 7);
  const todayStart = startOfLocalDay(today);
  const todayKey = getLocalDateKey(today);
  const hasVisibleSessions = summaries.some((summary) => summary.sessionCount > 0);
  const gridStyle = { "--heatmap-weeks": weekCount } as CSSProperties;

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active && scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    });
    return () => { active = false; };
  }, [category]);

  const showTooltip = useCallback((summary: DailyFocusSummary, target: HTMLButtonElement) => {
    const bounds = target.getBoundingClientRect();
    const safeX = Math.min(Math.max(bounds.left + bounds.width / 2, 132), window.innerWidth - 132);
    const below = bounds.top < 180;
    setTooltip({ summary, x: safeX, y: below ? bounds.bottom + 10 : bounds.top - 10, below });
  }, []);
  const hideTooltip = useCallback(() => setTooltip(null), []);

  return (
    <section className="focus-heatmap surface" aria-labelledby="focus-heatmap-title">
      <header className="heatmap-heading">
        <div>
          <p className="eyebrow">Past 365 days</p>
          <h2 id="focus-heatmap-title">过去一年专注热力图</h2>
          <p id="heatmap-description">颜色越深表示当天专注时间越长；点击日期可查看完整记录。</p>
        </div>
        <label className="history-category-filter" htmlFor="history-category">
          <Filter aria-hidden="true" />
          <span>分类</span>
          <select
            id="history-category"
            aria-label="历史分类"
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
          >
            <option>全部</option>
            {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </header>

      <div className="heatmap-plot" role="group" aria-label="过去一年专注热力图" aria-describedby="heatmap-description">
        <div className="heatmap-weekdays" aria-hidden="true">
          {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
        </div>
        <div ref={scrollRef} className="heatmap-scroll" data-testid="heatmap-scroll-container">
          <div className="heatmap-canvas">
            <div className="heatmap-months" style={gridStyle} aria-hidden="true">
              {monthLabels.map((label) => (
                <span key={`${label.column}-${label.text}`} style={{ gridColumn: label.column }}>{label.text}</span>
              ))}
            </div>
            <div className="heatmap-grid">
              {summaries.map((summary) => {
                return (
                  <HeatmapCell
                    key={summary.dateKey}
                    summary={summary}
                    selected={selectedDateKey === summary.dateKey}
                    today={todayKey === summary.dateKey}
                    disabled={summary.date > todayStart}
                    onSelect={onSelectDate}
                    onShowTooltip={showTooltip}
                    onHideTooltip={hideTooltip}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {!hasVisibleSessions && (
        <div className="heatmap-empty-copy" role="status">
          {hasSessions
            ? <p>“{category}”分类还没有专注记录。</p>
            : <p>完成第一次专注后，<br />这里会逐渐长出属于你的学习轨迹。</p>}
        </div>
      )}
      <HeatmapLegend />
      {tooltip && createPortal((
        <div className={`heatmap-tooltip${tooltip.below ? " below" : ""}`} role="tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <strong>{tooltip.summary.date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}</strong>
          <span>专注 {tooltipDuration(tooltip.summary.focusedSeconds)}</span>
          <span>共 {tooltip.summary.sessionCount} 次记录</span>
          <span>完成 {tooltip.summary.completedCount} 次 · 中途结束 {tooltip.summary.stoppedCount} 次</span>
          {Object.entries(tooltip.summary.categorySeconds)
            .filter(([, seconds]) => seconds > 0)
            .sort((left, right) => right[1] - left[1])
            .slice(0, 3)
            .map(([name, seconds]) => <small key={name}>{name} {tooltipDuration(seconds)}</small>)}
        </div>
      ), document.querySelector(".app-root") ?? document.body)}
    </section>
  );
}
