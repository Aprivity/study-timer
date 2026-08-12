import type { FocusSession } from "@/types/focus-session";
import type {
  HistoryAnalyzeRequest,
  HistoryStatistics,
  HistoryTaskAggregate,
} from "@/types/history-analysis";
import { addLocalDays, getLocalDateKey, startOfLocalDay } from "./local-date";

export const HISTORY_ANALYSIS_PERIOD_DAYS = 7;

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

export function createHistoryAnalyzeRequest(
  sessions: FocusSession[],
  now = new Date(),
): HistoryAnalyzeRequest {
  const endDate = startOfLocalDay(now);
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

export function calculateHistoryStatistics(request: HistoryAnalyzeRequest): HistoryStatistics {
  const totalFocusedSeconds = request.days.reduce(
    (total, day) => total + day.focused_seconds,
    0,
  );
  const focusCount = request.days.reduce((total, day) => total + day.focus_count, 0);
  return {
    period_days: HISTORY_ANALYSIS_PERIOD_DAYS,
    start_date: request.start_date,
    end_date: request.end_date,
    total_focused_seconds: totalFocusedSeconds,
    focus_count: focusCount,
    average_focus_seconds: focusCount > 0 ? Math.floor(totalFocusedSeconds / focusCount) : 0,
    main_tasks: [...request.tasks].sort(compareTasks).slice(0, 3).map((task) => ({
      task_name: task.task_name,
      focused_seconds: task.focused_seconds,
    })),
  };
}
