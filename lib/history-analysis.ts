import type { FocusSession } from "@/types/focus-session";
import type {
  HistoryAnalyzeRequest,
  HistoryPeriodAggregate,
  HistoryStatistics,
  HistoryTaskAggregate,
  HistoryTrend,
} from "@/types/history-analysis";
import { addLocalDays, getLocalDateKey, startOfLocalDay } from "./local-date";

export const HISTORY_ANALYSIS_PERIOD_DAYS = 7;
export const HISTORY_ANALYSIS_COMPARISON_DAYS = HISTORY_ANALYSIS_PERIOD_DAYS * 2;
const MAX_TREND_TASKS = 5;

function isFocusRecord(session: FocusSession): boolean {
  const phase = (session as FocusSession & { phase?: unknown }).phase;
  return phase !== "short-break" && phase !== "long-break";
}

function safeFocusedSeconds(session: FocusSession): number {
  return Number.isFinite(session.focusedSeconds)
    ? Math.max(0, Math.floor(session.focusedSeconds))
    : 0;
}

function compareTasks(left: HistoryTaskAggregate, right: HistoryTaskAggregate): number {
  return right.focused_seconds - left.focused_seconds
    || right.focus_count - left.focus_count
    || (left.task_name < right.task_name ? -1 : left.task_name > right.task_name ? 1 : 0);
}

function createPeriodAggregate(
  sessions: FocusSession[],
  endDate: Date,
): HistoryPeriodAggregate {
  const startDate = addLocalDays(endDate, -(HISTORY_ANALYSIS_PERIOD_DAYS - 1));
  const days = Array.from({ length: HISTORY_ANALYSIS_PERIOD_DAYS }, (_, index) => ({
    date: getLocalDateKey(addLocalDays(startDate, index)),
    focused_seconds: 0,
    focus_count: 0,
  }));
  const daysByDate = new Map(days.map((day) => [day.date, day]));
  const tasksByName = new Map<string, HistoryTaskAggregate>();

  for (const session of sessions) {
    if (!isFocusRecord(session)) continue;
    const focusedSeconds = safeFocusedSeconds(session);
    if (focusedSeconds === 0) continue;

    const dateKey = getLocalDateKey(session.endedAt);
    const day = daysByDate.get(dateKey);
    if (!day) continue;

    const taskName = session.taskName.trim() || "未命名专注";
    const task = tasksByName.get(taskName) ?? {
      task_name: taskName,
      focused_seconds: 0,
      focus_count: 0,
    };
    day.focused_seconds += focusedSeconds;
    day.focus_count += 1;
    task.focused_seconds += focusedSeconds;
    task.focus_count += 1;
    tasksByName.set(taskName, task);
  }

  return {
    start_date: getLocalDateKey(startDate),
    end_date: getLocalDateKey(endDate),
    days,
    tasks: [...tasksByName.values()].sort(compareTasks),
  };
}

export function createHistoryAnalyzeRequest(
  sessions: FocusSession[],
  now = new Date(),
): HistoryAnalyzeRequest {
  const currentEndDate = startOfLocalDay(now);
  const currentPeriod = createPeriodAggregate(sessions, currentEndDate);
  const previousPeriod = createPeriodAggregate(
    sessions,
    addLocalDays(currentEndDate, -HISTORY_ANALYSIS_PERIOD_DAYS),
  );
  return { ...currentPeriod, previous_period: previousPeriod };
}

export function calculateHistoryStatistics(period: HistoryPeriodAggregate): HistoryStatistics {
  const totalFocusedSeconds = period.days.reduce(
    (total, day) => total + day.focused_seconds,
    0,
  );
  const focusCount = period.days.reduce((total, day) => total + day.focus_count, 0);
  return {
    period_days: HISTORY_ANALYSIS_PERIOD_DAYS,
    start_date: period.start_date,
    end_date: period.end_date,
    total_focused_seconds: totalFocusedSeconds,
    focus_count: focusCount,
    average_focus_seconds: focusCount > 0 ? Math.floor(totalFocusedSeconds / focusCount) : 0,
    main_tasks: [...period.tasks].sort(compareTasks).slice(0, 3).map((task) => ({
      task_name: task.task_name,
      focused_seconds: task.focused_seconds,
    })),
  };
}

function roundedPercentageChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  const difference = current - previous;
  const magnitude = Math.floor(
    (Math.abs(difference) * 100 + Math.floor(previous / 2)) / previous,
  );
  return Math.sign(difference) * magnitude;
}

export function calculateHistoryTrend(
  currentPeriod: HistoryPeriodAggregate,
  previousPeriod: HistoryPeriodAggregate,
): HistoryTrend {
  const currentStats = calculateHistoryStatistics(currentPeriod);
  const previousStats = calculateHistoryStatistics(previousPeriod);
  const totalChange = currentStats.total_focused_seconds
    - previousStats.total_focused_seconds;
  const currentTasks = new Map(
    currentPeriod.tasks.map((task) => [task.task_name, task.focused_seconds]),
  );
  const previousTasks = new Map(
    previousPeriod.tasks.map((task) => [task.task_name, task.focused_seconds]),
  );
  const taskNames = new Set([...currentTasks.keys(), ...previousTasks.keys()]);
  const taskChanges = [...taskNames].map((taskName) => {
    const currentSeconds = currentTasks.get(taskName) ?? 0;
    const previousSeconds = previousTasks.get(taskName) ?? 0;
    return {
      task_name: taskName,
      current_focused_seconds: currentSeconds,
      previous_focused_seconds: previousSeconds,
      change_seconds: currentSeconds - previousSeconds,
    };
  }).filter((task) => task.change_seconds !== 0).sort((left, right) => (
    Math.abs(right.change_seconds) - Math.abs(left.change_seconds)
    || right.current_focused_seconds - left.current_focused_seconds
    || (left.task_name < right.task_name ? -1 : left.task_name > right.task_name ? 1 : 0)
  )).slice(0, MAX_TREND_TASKS);

  return {
    direction: totalChange > 0 ? "up" : totalChange < 0 ? "down" : "stable",
    total_focused_seconds_change: totalChange,
    total_focused_seconds_change_percent: roundedPercentageChange(
      currentStats.total_focused_seconds,
      previousStats.total_focused_seconds,
    ),
    focus_count_change: currentStats.focus_count - previousStats.focus_count,
    average_focus_seconds_change: currentStats.average_focus_seconds
      - previousStats.average_focus_seconds,
    task_changes: taskChanges,
  };
}
