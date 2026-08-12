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

export interface HistoryAnalyzeRequest {
  start_date: string;
  end_date: string;
  days: HistoryDayAggregate[];
  tasks: HistoryTaskAggregate[];
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

export interface HistoryAnalyzeResponse {
  stats: HistoryStatistics;
  analysis: HistoryAIAnalysis | null;
}
