export interface HistoryDayAggregate {
  date: string;
  focused_seconds: number;
  focus_count: number;
}

export interface HistoryTaskAggregate {
  task_name: string;
  focused_seconds: number;
  focus_count: number;
}

export interface HistoryPeriodAggregate {
  start_date: string;
  end_date: string;
  days: HistoryDayAggregate[];
  tasks: HistoryTaskAggregate[];
}

export interface HistoryAnalyzeRequest extends HistoryPeriodAggregate {
  previous_period?: HistoryPeriodAggregate;
}

export interface HistoryTaskSummary {
  task_name: string;
  focused_seconds: number;
}

export interface HistoryStatistics {
  period_days: 7;
  start_date: string;
  end_date: string;
  total_focused_seconds: number;
  focus_count: number;
  average_focus_seconds: number;
  main_tasks: HistoryTaskSummary[];
}

export interface HistoryAIAnalysis {
  summary: string;
  patterns: string[];
  suggestions: string[];
}

export type HistoryTrendDirection = "up" | "down" | "stable";

export interface HistoryTaskChange {
  task_name: string;
  current_focused_seconds: number;
  previous_focused_seconds: number;
  change_seconds: number;
}

export interface HistoryTrend {
  direction: HistoryTrendDirection;
  total_focused_seconds_change: number;
  total_focused_seconds_change_percent: number | null;
  focus_count_change: number;
  average_focus_seconds_change: number;
  task_changes: HistoryTaskChange[];
}

export interface HistoryAnalyzeResponse {
  stats: HistoryStatistics;
  previous_stats?: HistoryStatistics | null;
  trend?: HistoryTrend | null;
  analysis: HistoryAIAnalysis | null;
}
