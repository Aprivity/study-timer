import { describe, expect, it } from "vitest";
import type { FocusSession } from "@/types/focus-session";
import { calculateHistoryStatistics, createHistoryAnalyzeRequest } from "./history-analysis";

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

describe("seven-day history analysis aggregation", () => {
  const now = new Date(2026, 7, 12, 18);

  it("uses exactly the latest seven local calendar days", () => {
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
  });

  it("reliably aggregates positive focus records by day and task", () => {
    const records = [
      session("math-1", "高数", new Date(2026, 7, 12, 10), 1_800),
      session("math-2", "高数", new Date(2026, 7, 10, 9), 1_200, { status: "stopped" }),
      session("english", "英语阅读", new Date(2026, 7, 7, 14), 900),
      session("old", "旧任务", new Date(2026, 7, 5, 23, 59), 3_600),
      session("zero", "零时长", new Date(2026, 7, 12, 12), 0),
      session("break", "休息", new Date(2026, 7, 12, 13), 300, { phase: "short-break" }),
    ];

    const request = createHistoryAnalyzeRequest(records, now);
    const stats = calculateHistoryStatistics(request);

    expect(request.tasks).toEqual([
      { task_name: "高数", focused_seconds: 3_000, focus_count: 2 },
      { task_name: "英语阅读", focused_seconds: 900, focus_count: 1 },
    ]);
    expect(stats).toEqual({
      period_days: 7,
      start_date: "2026-08-06",
      end_date: "2026-08-12",
      total_focused_seconds: 3_900,
      focus_count: 3,
      average_focus_seconds: 1_300,
      main_tasks: [
        { task_name: "高数", focused_seconds: 3_000 },
        { task_name: "英语阅读", focused_seconds: 900 },
      ],
    });
  });

  it("uses a stable fallback for an empty task name and keeps an empty period at zero", () => {
    const request = createHistoryAnalyzeRequest([
      session("unnamed", "   ", new Date(2026, 7, 12, 10), 60),
    ], now);
    expect(request.tasks[0].task_name).toBe("未命名专注");

    expect(calculateHistoryStatistics(createHistoryAnalyzeRequest([], now))).toMatchObject({
      total_focused_seconds: 0,
      focus_count: 0,
      average_focus_seconds: 0,
      main_tasks: [],
    });
  });
});
