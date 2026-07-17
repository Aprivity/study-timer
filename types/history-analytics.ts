export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

export interface DailyFocusSummary {
  dateKey: string;
  date: Date;
  focusedSeconds: number;
  sessionCount: number;
  completedCount: number;
  stoppedCount: number;
  categorySeconds: Record<string, number>;
  level: HeatmapLevel;
}

export interface HistoryOverviewData {
  focusedSeconds: number;
  activeDays: number;
  completedCount: number;
  longestStreak: number;
}
