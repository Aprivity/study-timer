import { describe, expect, it } from "vitest";
import type { FocusSession } from "@/types/focus-session";
import {
  calculateHistoryStatistics,
  calculateHistoryTrend,
  createHistoryAnalyzeRequest,
} from "./history-analysis";

function session(
  id: string,
  taskName: string,
  endedAt: Date,
  focusedSeconds: number,
  extra: Partial<FocusSession & { phase: string }> = {},
): FocusSession {
  return {
    id,
    taskName,
    category: "学习",
    plannedSeconds: 1_800,
    focusedSeconds,
    startedAt: endedAt.getTime() - focusedSeconds * 1_000,
    endedAt: endedAt.getTime(),
    status: "completed",
    ...extra,
  };
}

describe("two-period history analysis aggregation", () => {
  const now = new Date(2026, 7, 12, 18);

  it("uses two adjacent seven-day local calendar periods", () => {
    const request = createHistoryAnalyzeRequest([], now);

    expect(request.start_date).toBe("2026-08-06");
    expect(request.end_date).toBe("2026-08-12");
    expect(request.days.map((day) => day.date)).toEqual([
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
    ]);
    expect(request.previous_period?.start_date).toBe("2026-07-30");
    expect(request.previous_period?.end_date).toBe("2026-08-05");
    expect(request.previous_period?.days).toHaveLength(7);
  });

  it("calculates current, previous, percentage, count, average, and task changes", () => {
    const records = [
      session("math-1", "高数", new Date(2026, 7, 12, 10), 1_800),
      session("math-2", "高数", new Date(2026, 7, 10, 9), 1_200, { status: "stopped" }),
      session("english", "英语阅读", new Date(2026, 7, 7, 14), 900),
      session("previous-math", "高数", new Date(2026, 7, 5, 11), 1_500),
      session("previous-project", "项目", new Date(2026, 7, 1, 11), 900),
      session("too-old", "旧任务", new Date(2026, 6, 29, 23, 59), 3_600),
      session("zero", "零时长", new Date(2026, 7, 12, 12), 0),
      session("break", "休息", new Date(2026, 7, 12, 13), 300, { phase: "short-break" }),
    ];

    const request = createHistoryAnalyzeRequest(records, now);
    const previous = request.previous_period;
    expect(previous).toBeDefined();
    if (!previous) return;

    expect(request.tasks).toEqual([
      { task_name: "高数", focused_seconds: 3_000, focus_count: 2 },
      { task_name: "英语阅读", focused_seconds: 900, focus_count: 1 },
    ]);
    expect(previous.tasks).toEqual([
      { task_name: "高数", focused_seconds: 1_500, focus_count: 1 },
      { task_name: "项目", focused_seconds: 900, focus_count: 1 },
    ]);
    expect(calculateHistoryStatistics(request)).toMatchObject({
      total_focused_seconds: 3_900,
      focus_count: 3,
      average_focus_seconds: 1_300,
    });
    expect(calculateHistoryStatistics(previous)).toMatchObject({
      total_focused_seconds: 2_400,
      focus_count: 2,
      average_focus_seconds: 1_200,
    });
    expect(calculateHistoryTrend(request, previous)).toEqual({
      direction: "up",
      total_focused_seconds_change: 1_500,
      total_focused_seconds_change_percent: 63,
      focus_count_change: 1,
      average_focus_seconds_change: 100,
      task_changes: [
        {
          task_name: "高数",
          current_focused_seconds: 3_000,
          previous_focused_seconds: 1_500,
          change_seconds: 1_500,
        },
        {
          task_name: "英语阅读",
          current_focused_seconds: 900,
          previous_focused_seconds: 0,
          change_seconds: 900,
        },
        {
          task_name: "项目",
          current_focused_seconds: 0,
          previous_focused_seconds: 900,
          change_seconds: -900,
        },
      ],
    });
  });

  it("does not invent a percentage when the previous period is zero", () => {
    const request = createHistoryAnalyzeRequest([
      session("unnamed", "   ", new Date(2026, 7, 12, 10), 60),
    ], now);
    const previous = request.previous_period;
    expect(previous).toBeDefined();
    if (!previous) return;

    expect(request.tasks[0].task_name).toBe("未命名专注");
    expect(calculateHistoryTrend(request, previous)).toMatchObject({
      direction: "up",
      total_focused_seconds_change_percent: null,
    });
  });

  it("keeps two empty periods at a stable zero", () => {
    const request = createHistoryAnalyzeRequest([], now);
    const previous = request.previous_period;
    expect(previous).toBeDefined();
    if (!previous) return;

    expect(calculateHistoryStatistics(request)).toMatchObject({
      total_focused_seconds: 0,
      focus_count: 0,
      average_focus_seconds: 0,
      main_tasks: [],
    });
    expect(calculateHistoryTrend(request, previous)).toMatchObject({
      direction: "stable",
      total_focused_seconds_change: 0,
      total_focused_seconds_change_percent: 0,
      focus_count_change: 0,
      average_focus_seconds_change: 0,
      task_changes: [],
    });
  });
});
