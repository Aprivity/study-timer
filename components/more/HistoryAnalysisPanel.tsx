"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  Layers3,
  Lightbulb,
  LoaderCircle,
  Minus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { analyzeHistory } from "@/lib/history-analysis-api";
import {
  calculateHistoryStatistics,
  calculateHistoryTrend,
  createHistoryAnalyzeRequest,
} from "@/lib/history-analysis";
import { parseSessions, STORAGE_KEYS } from "@/lib/storage";
import { formatHumanDuration } from "@/lib/time-format";
import type {
  HistoryAIAnalysis,
  HistoryAnalyzeRequest,
  HistoryAnalyzeResponse,
  HistoryTrend,
} from "@/types/history-analysis";

export type HistoryAnalyzer = (
  request: HistoryAnalyzeRequest,
  signal?: AbortSignal,
) => Promise<HistoryAnalyzeResponse>;

type AnalysisState =
  | { status: "idle" | "loading" | "error" }
  | { status: "success"; analysis: HistoryAIAnalysis };

const DATE_FORMAT = new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" });

function formatDateRange(start: string, end: string): string {
  const parse = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  };
  return `${DATE_FORMAT.format(parse(start))} – ${DATE_FORMAT.format(parse(end))}`;
}

function formatSignedCount(value: number): string {
  if (value === 0) return "持平";
  return `${value > 0 ? "+" : ""}${value} 次`;
}

function formatSignedDuration(value: number): string {
  if (value === 0) return "持平";
  return `${value > 0 ? "+" : "−"}${formatHumanDuration(Math.abs(value))}`;
}

function formatTrendChange(trend: HistoryTrend): string {
  if (trend.direction === "stable") return "持平";
  if (trend.total_focused_seconds_change_percent === null) return "新增投入";
  if (trend.total_focused_seconds_change_percent === 0) {
    return trend.direction === "up" ? "↑ <1%" : "↓ <1%";
  }
  const arrow = trend.direction === "up" ? "↑" : "↓";
  return `${arrow} ${Math.abs(trend.total_focused_seconds_change_percent)}%`;
}

function TrendIcon({ direction }: { direction: HistoryTrend["direction"] }) {
  if (direction === "up") return <ArrowUpRight aria-hidden="true" />;
  if (direction === "down") return <ArrowDownRight aria-hidden="true" />;
  return <Minus aria-hidden="true" />;
}

export function HistoryAnalysisPanel({ analyzer = analyzeHistory }: { analyzer?: HistoryAnalyzer }) {
  const [sessions, , hydrated] = useLocalStorage(STORAGE_KEYS.sessions, parseSessions);
  const [today, setToday] = useState<Date | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState<AnalysisState>({ status: "idle" });

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) setToday(new Date()); });
    return () => { active = false; };
  }, []);

  const request = useMemo(
    () => (today ? createHistoryAnalyzeRequest(sessions, today) : null),
    [sessions, today],
  );
  const stats = useMemo(
    () => (request ? calculateHistoryStatistics(request) : null),
    [request],
  );
  const comparison = useMemo(() => {
    if (!request?.previous_period) return null;
    return {
      previousStats: calculateHistoryStatistics(request.previous_period),
      trend: calculateHistoryTrend(request, request.previous_period),
    };
  }, [request]);

  useEffect(() => {
    if (!hydrated || !request || !stats || !comparison) return;
    if (stats.focus_count + comparison.previousStats.focus_count === 0) {
      queueMicrotask(() => setState({ status: "idle" }));
      return;
    }

    const controller = new AbortController();
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setState({ status: "loading" });
      analyzer(request, controller.signal).then(
        (result) => {
          if (!active) return;
          setState(result.analysis
            ? { status: "success", analysis: result.analysis }
            : { status: "error" });
        },
        (error: unknown) => {
          if (!active || (error instanceof DOMException && error.name === "AbortError")) return;
          setState({ status: "error" });
        },
      );
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [analyzer, comparison, hydrated, request, retryKey, stats]);

  const retry = useCallback(() => setRetryKey((current) => current + 1), []);

  if (!hydrated || !stats || !comparison) {
    return (
      <div className="history-analysis-loading" role="status">
        <LoaderCircle className="ai-loading-icon" aria-hidden="true" />
        <span>正在读取最近 14 天记录…</span>
      </div>
    );
  }

  const hasCurrentHistory = stats.focus_count > 0;
  const hasHistory = hasCurrentHistory || comparison.previousStats.focus_count > 0;
  return (
    <div className="history-analysis-panel">
      <section aria-labelledby="recent-focus-title">
        <div className="analysis-section-heading">
          <div>
            <p className="eyebrow">Last 7 days</p>
            <h2 id="recent-focus-title">最近专注</h2>
          </div>
          <span>{formatDateRange(stats.start_date, stats.end_date)}</span>
        </div>
        <div className="analysis-metrics">
          <article>
            <Clock3 aria-hidden="true" />
            <span>总专注</span>
            <strong>{formatHumanDuration(stats.total_focused_seconds)}</strong>
          </article>
          <article>
            <Layers3 aria-hidden="true" />
            <span>专注次数</span>
            <strong>{stats.focus_count} 次</strong>
          </article>
          <article>
            <Sparkles aria-hidden="true" />
            <span>平均单次</span>
            <strong>{formatHumanDuration(stats.average_focus_seconds)}</strong>
          </article>
        </div>
        <div className={`analysis-trend-strip trend-${comparison.trend.direction}`}>
          <div className="analysis-trend-primary">
            <span>对比前 7 天</span>
            <strong>
              最近 7 天 {formatHumanDuration(stats.total_focused_seconds)}
              <em>
                <TrendIcon direction={comparison.trend.direction} />
                {formatTrendChange(comparison.trend)}
              </em>
            </strong>
          </div>
          <div className="analysis-trend-details">
            <span>前 7 天 {formatHumanDuration(comparison.previousStats.total_focused_seconds)}</span>
            <span>次数 {formatSignedCount(comparison.trend.focus_count_change)}</span>
            <span>平均单次 {formatSignedDuration(comparison.trend.average_focus_seconds_change)}</span>
          </div>
        </div>
      </section>

      <section className="main-tasks" aria-labelledby="main-tasks-title">
        <div className="analysis-section-heading compact">
          <h2 id="main-tasks-title">主要任务</h2>
          <span>最近 7 天 · 按专注时长</span>
        </div>
        {hasCurrentHistory ? (
          <ol>
            {stats.main_tasks.map((task) => (
              <li key={task.task_name}>
                <span>{task.task_name}</span>
                <strong>{formatHumanDuration(task.focused_seconds)}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p className="analysis-empty-copy">最近 7 天还没有可分析的专注记录。</p>
        )}
      </section>

      <article className="ai-analysis-card surface" aria-labelledby="ai-analysis-title" aria-live="polite">
        <div className="ai-analysis-title">
          <span><Sparkles aria-hidden="true" /></span>
          <div>
            <p className="eyebrow">AI reflection</p>
            <h2 id="ai-analysis-title">简短趋势</h2>
          </div>
        </div>

        {!hasHistory && (
          <div className="ai-analysis-message">
            <p>完成一次专注后，这里会根据两个 7 天周期的统计给出简短趋势和建议。</p>
          </div>
        )}
        {hasHistory && state.status === "loading" && (
          <div className="ai-analysis-message" role="status">
            <LoaderCircle className="ai-loading-icon" aria-hidden="true" />
            <p>正在整理你的专注趋势…</p>
          </div>
        )}
        {hasHistory && state.status === "error" && (
          <div className="ai-analysis-message analysis-error" role="alert">
            <p>AI 分析暂时不可用，关键统计仍可正常查看，趋势也不受影响。</p>
            <button type="button" onClick={retry}><RefreshCw aria-hidden="true" />重试</button>
          </div>
        )}
        {state.status === "success" && (
          <div className="ai-analysis-content">
            <p className="analysis-summary">{state.analysis.summary}</p>
            <div>
              <h3>主要规律</h3>
              <ul>{state.analysis.patterns.map((pattern) => <li key={pattern}>{pattern}</li>)}</ul>
            </div>
            <div>
              <h3><Lightbulb aria-hidden="true" />下一步</h3>
              <ol>{state.analysis.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ol>
            </div>
          </div>
        )}
      </article>

      <p className="analysis-privacy-note">仅发送两个 7 天周期的汇总统计；不会上传逐条记录或修改计时器。</p>
    </div>
  );
}
