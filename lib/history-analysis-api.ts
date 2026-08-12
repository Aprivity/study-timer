import { getAiApiBaseUrl } from "./ai-api";
import { calculateHistoryStatistics, calculateHistoryTrend } from "./history-analysis";
import type {
  HistoryAIAnalysis,
  HistoryAnalyzeRequest,
  HistoryAnalyzeResponse,
  HistoryStatistics,
  HistoryTaskSummary,
  HistoryTaskChange,
  HistoryTrend,
} from "@/types/history-analysis";

export type HistoryAnalysisApiErrorKind = "network" | "backend" | "invalid-response";

export class HistoryAnalysisApiError extends Error {
  constructor(
    public readonly kind: HistoryAnalysisApiErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "HistoryAnalysisApiError";
  }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getHistoryAnalyzeUrl(): string {
  return `${getAiApiBaseUrl()}/v1/history/analyze`;
}

function exactRecord(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HistoryAnalysisApiError("invalid-response", "AI 分析服务返回了无法识别的数据");
  }
  const record = value as Record<string, unknown>;
  const actualKeys = Object.keys(record);
  if (keys.some((key) => !(key in record)) || actualKeys.some((key) => !keys.includes(key))) {
    throw new HistoryAnalysisApiError("invalid-response", "AI 分析服务返回的数据不完整或包含未知字段");
  }
  return record;
}

function nonNegativeInteger(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new HistoryAnalysisApiError("invalid-response", "AI 分析服务返回了无效统计值");
  }
  return value as number;
}

function signedInteger(value: unknown): number {
  if (!Number.isInteger(value)) {
    throw new HistoryAnalysisApiError("invalid-response", "AI 分析服务返回了无效变化值");
  }
  return value as number;
}

function parseTask(value: unknown): HistoryTaskSummary {
  const record = exactRecord(value, ["task_name", "focused_seconds"]);
  if (typeof record.task_name !== "string" || !record.task_name.trim() || record.task_name.length > 120) {
    throw new HistoryAnalysisApiError("invalid-response", "AI 分析服务返回了无效任务名称");
  }
  const focusedSeconds = nonNegativeInteger(record.focused_seconds);
  if (focusedSeconds === 0) {
    throw new HistoryAnalysisApiError("invalid-response", "AI 分析服务返回了无效任务时长");
  }
  return { task_name: record.task_name.trim(), focused_seconds: focusedSeconds };
}

function parseStatistics(value: unknown): HistoryStatistics {
  const record = exactRecord(value, [
    "period_days",
    "start_date",
    "end_date",
    "total_focused_seconds",
    "focus_count",
    "average_focus_seconds",
    "main_tasks",
  ]);
  if (record.period_days !== 7
    || typeof record.start_date !== "string" || !DATE_PATTERN.test(record.start_date)
    || typeof record.end_date !== "string" || !DATE_PATTERN.test(record.end_date)
    || !Array.isArray(record.main_tasks) || record.main_tasks.length > 3) {
    throw new HistoryAnalysisApiError("invalid-response", "AI 分析服务返回了无效统计范围");
  }
  return {
    period_days: 7,
    start_date: record.start_date,
    end_date: record.end_date,
    total_focused_seconds: nonNegativeInteger(record.total_focused_seconds),
    focus_count: nonNegativeInteger(record.focus_count),
    average_focus_seconds: nonNegativeInteger(record.average_focus_seconds),
    main_tasks: record.main_tasks.map(parseTask),
  };
}

function textList(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3
    || value.some((item) => typeof item !== "string" || !item.trim() || item.trim().length > 180)) {
    throw new HistoryAnalysisApiError("invalid-response", "AI 分析服务返回了无效分析内容");
  }
  return value.map((item) => (item as string).trim());
}

function parseAnalysis(value: unknown): HistoryAIAnalysis | null {
  if (value === null) return null;
  const record = exactRecord(value, ["summary", "patterns", "suggestions"]);
  if (typeof record.summary !== "string" || !record.summary.trim() || record.summary.trim().length > 180) {
    throw new HistoryAnalysisApiError("invalid-response", "AI 分析服务返回了无效总结");
  }
  return {
    summary: record.summary.trim(),
    patterns: textList(record.patterns),
    suggestions: textList(record.suggestions),
  };
}

function parseTaskChange(value: unknown): HistoryTaskChange {
  const record = exactRecord(value, [
    "task_name",
    "current_focused_seconds",
    "previous_focused_seconds",
    "change_seconds",
  ]);
  if (typeof record.task_name !== "string"
    || !record.task_name.trim()
    || record.task_name.trim().length > 120) {
    throw new HistoryAnalysisApiError("invalid-response", "AI 分析服务返回了无效任务变化");
  }
  const currentSeconds = nonNegativeInteger(record.current_focused_seconds);
  const previousSeconds = nonNegativeInteger(record.previous_focused_seconds);
  const changeSeconds = signedInteger(record.change_seconds);
  if (changeSeconds !== currentSeconds - previousSeconds || changeSeconds === 0) {
    throw new HistoryAnalysisApiError("invalid-response", "AI 分析服务返回了不一致的任务变化");
  }
  return {
    task_name: record.task_name.trim(),
    current_focused_seconds: currentSeconds,
    previous_focused_seconds: previousSeconds,
    change_seconds: changeSeconds,
  };
}

function parseTrend(value: unknown): HistoryTrend | null {
  if (value === null || value === undefined) return null;
  const record = exactRecord(value, [
    "direction",
    "total_focused_seconds_change",
    "total_focused_seconds_change_percent",
    "focus_count_change",
    "average_focus_seconds_change",
    "task_changes",
  ]);
  if (record.direction !== "up" && record.direction !== "down" && record.direction !== "stable") {
    throw new HistoryAnalysisApiError("invalid-response", "AI 分析服务返回了无效趋势方向");
  }
  const percent = record.total_focused_seconds_change_percent;
  if (percent !== null && !Number.isInteger(percent)) {
    throw new HistoryAnalysisApiError("invalid-response", "AI 分析服务返回了无效变化比例");
  }
  if (!Array.isArray(record.task_changes) || record.task_changes.length > 5) {
    throw new HistoryAnalysisApiError("invalid-response", "AI 分析服务返回了无效任务趋势");
  }
  return {
    direction: record.direction,
    total_focused_seconds_change: signedInteger(record.total_focused_seconds_change),
    total_focused_seconds_change_percent: percent as number | null,
    focus_count_change: signedInteger(record.focus_count_change),
    average_focus_seconds_change: signedInteger(record.average_focus_seconds_change),
    task_changes: record.task_changes.map(parseTaskChange),
  };
}

function matchesExpectedStats(actual: HistoryStatistics, expected: HistoryStatistics): boolean {
  return actual.period_days === expected.period_days
    && actual.start_date === expected.start_date
    && actual.end_date === expected.end_date
    && actual.total_focused_seconds === expected.total_focused_seconds
    && actual.focus_count === expected.focus_count
    && actual.average_focus_seconds === expected.average_focus_seconds
    && JSON.stringify(actual.main_tasks) === JSON.stringify(expected.main_tasks);
}

function responseRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HistoryAnalysisApiError("invalid-response", "AI 分析服务返回了无法识别的数据");
  }
  const record = value as Record<string, unknown>;
  const required = ["stats", "analysis"];
  const allowed = [...required, "previous_stats", "trend"];
  if (required.some((key) => !(key in record))
    || Object.keys(record).some((key) => !allowed.includes(key))) {
    throw new HistoryAnalysisApiError("invalid-response", "AI 分析服务返回的数据不完整或包含未知字段");
  }
  return record;
}

function parseResponse(payload: unknown, request: HistoryAnalyzeRequest): HistoryAnalyzeResponse {
  const record = responseRecord(payload);
  const stats = parseStatistics(record.stats);
  const previousStats = record.previous_stats === undefined || record.previous_stats === null
    ? null
    : parseStatistics(record.previous_stats);
  const trend = parseTrend(record.trend);
  const analysis = parseAnalysis(record.analysis);
  const expectedStats = calculateHistoryStatistics(request);
  const expectedPreviousStats = request.previous_period
    ? calculateHistoryStatistics(request.previous_period)
    : null;
  const expectedTrend = request.previous_period
    ? calculateHistoryTrend(request, request.previous_period)
    : null;
  const comparisonMatches = expectedPreviousStats && expectedTrend
    ? previousStats !== null
      && trend !== null
      && matchesExpectedStats(previousStats, expectedPreviousStats)
      && JSON.stringify(trend) === JSON.stringify(expectedTrend)
    : previousStats === null && trend === null;
  const combinedFocusCount = stats.focus_count + (previousStats?.focus_count ?? 0);
  if (!matchesExpectedStats(stats, expectedStats)
    || !comparisonMatches
    || (combinedFocusCount > 0 && analysis === null)
    || (combinedFocusCount === 0 && analysis !== null)) {
    throw new HistoryAnalysisApiError("invalid-response", "AI 分析服务返回的统计结果不一致");
  }
  return {
    stats,
    ...(record.previous_stats !== undefined ? { previous_stats: previousStats } : {}),
    ...(record.trend !== undefined ? { trend } : {}),
    analysis,
  };
}

export async function analyzeHistory(
  request: HistoryAnalyzeRequest,
  signal?: AbortSignal,
): Promise<HistoryAnalyzeResponse> {
  let response: Response;
  try {
    response = await fetch(getHistoryAnalyzeUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new HistoryAnalysisApiError("network", "无法连接 AI 分析服务");
  }

  if (!response.ok) {
    throw new HistoryAnalysisApiError("backend", "AI 分析服务暂时不可用", response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new HistoryAnalysisApiError("invalid-response", "AI 分析服务返回了无法识别的数据");
  }
  return parseResponse(payload, request);
}
