import { addLocalDays, endOfLocalWeek, getLocalDateKey, startOfLocalDay, startOfLocalWeek } from "./local-date";
import type { FocusSession } from "@/types/focus-session";
import type { DailyFocusSummary, HeatmapLevel, HistoryOverviewData } from "@/types/history-analytics";

export function getHeatmapLevel(focusedSeconds: number): HeatmapLevel {
  const safeSeconds = Number.isFinite(focusedSeconds) ? Math.max(0, focusedSeconds) : 0;
  if (safeSeconds === 0) return 0;
  if (safeSeconds < 30 * 60) return 1;
  if (safeSeconds < 60 * 60) return 2;
  if (safeSeconds < 120 * 60) return 3;
  return 4;
}

export function createHeatmapDateRange(endDate = new Date()): Date[] {
  const logicalEnd = startOfLocalDay(endDate);
  const basicStart = addLocalDays(logicalEnd, -364);
  const rangeStart = startOfLocalWeek(basicStart);
  const rangeEnd = endOfLocalWeek(logicalEnd);
  const dates: Date[] = [];

  for (let cursor = rangeStart; cursor <= rangeEnd; cursor = addLocalDays(cursor, 1)) {
    dates.push(cursor);
  }

  return dates;
}

function safeFocusedSeconds(session: FocusSession): number {
  return Number.isFinite(session.focusedSeconds) ? Math.max(0, session.focusedSeconds) : 0;
}

function isFocusRecord(session: FocusSession): boolean {
  const phase = (session as FocusSession & { phase?: unknown }).phase;
  return phase !== "short-break" && phase !== "long-break";
}

export function aggregateSessionsByDay(
  sessions: FocusSession[],
  dates: Date[],
  category = "全部",
): DailyFocusSummary[] {
  const includedKeys = new Set(dates.map(getLocalDateKey));
  const summaries = new Map<string, Omit<DailyFocusSummary, "date" | "dateKey" | "level">>();

  for (const session of sessions) {
    if (!isFocusRecord(session)) continue;
    if (category !== "全部" && session.category !== category) continue;
    const dateKey = getLocalDateKey(session.endedAt);
    if (!includedKeys.has(dateKey)) continue;

    const focusedSeconds = safeFocusedSeconds(session);
    const current = summaries.get(dateKey) ?? {
      focusedSeconds: 0,
      sessionCount: 0,
      completedCount: 0,
      stoppedCount: 0,
      categorySeconds: {},
    };

    current.focusedSeconds += focusedSeconds;
    current.sessionCount += 1;
    current.completedCount += session.status === "completed" ? 1 : 0;
    current.stoppedCount += session.status === "stopped" ? 1 : 0;
    current.categorySeconds[session.category] = (current.categorySeconds[session.category] ?? 0) + focusedSeconds;
    summaries.set(dateKey, current);
  }

  return dates.map((date) => {
    const dateKey = getLocalDateKey(date);
    const summary = summaries.get(dateKey) ?? {
      focusedSeconds: 0,
      sessionCount: 0,
      completedCount: 0,
      stoppedCount: 0,
      categorySeconds: {},
    };
    return {
      dateKey,
      date: startOfLocalDay(date),
      ...summary,
      categorySeconds: { ...summary.categorySeconds },
      level: getHeatmapLevel(summary.focusedSeconds),
    };
  });
}

export function getLongestFocusStreak(summaries: DailyFocusSummary[]): number {
  let longest = 0;
  let current = 0;
  let previousActiveDate: Date | null = null;

  for (const summary of [...summaries].sort((a, b) => a.date.getTime() - b.date.getTime())) {
    if (summary.focusedSeconds <= 0) {
      current = 0;
      previousActiveDate = null;
      continue;
    }

    const isConsecutive = previousActiveDate !== null &&
      getLocalDateKey(addLocalDays(previousActiveDate, 1)) === summary.dateKey;
    current = isConsecutive ? current + 1 : 1;
    longest = Math.max(longest, current);
    previousActiveDate = summary.date;
  }

  return longest;
}

export function getHistoryOverview(summaries: DailyFocusSummary[]): HistoryOverviewData {
  return {
    focusedSeconds: summaries.reduce((total, day) => total + Math.max(0, day.focusedSeconds), 0),
    activeDays: summaries.filter((day) => day.focusedSeconds > 0).length,
    completedCount: summaries.reduce((total, day) => total + day.completedCount, 0),
    longestStreak: getLongestFocusStreak(summaries),
  };
}

export function getSessionsForDate(
  sessions: FocusSession[],
  dateKey: string,
  category = "全部",
): FocusSession[] {
  return sessions
    .filter((session) => isFocusRecord(session) && getLocalDateKey(session.endedAt) === dateKey &&
      (category === "全部" || session.category === category))
    .sort((left, right) => right.endedAt - left.endedAt);
}

export function getDefaultSelectedDateKey(summaries: DailyFocusSummary[], today = new Date()): string | null {
  const todayKey = getLocalDateKey(today);
  const todaySummary = summaries.find((summary) => summary.dateKey === todayKey);
  if (todaySummary && todaySummary.sessionCount > 0) return todayKey;

  const latest = [...summaries]
    .filter((summary) => summary.sessionCount > 0 && summary.date <= startOfLocalDay(today))
    .sort((left, right) => right.date.getTime() - left.date.getTime())[0];
  return latest?.dateKey ?? null;
}
