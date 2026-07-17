import { describe, expect, it } from "vitest";
import {
  aggregateSessionsByDay,
  createHeatmapDateRange,
  getDefaultSelectedDateKey,
  getHeatmapLevel,
  getHistoryOverview,
  getSessionsForDate,
} from "./history-analytics";
import { getLocalDateKey } from "./local-date";
import type { FocusSession } from "@/types/focus-session";

function session(
  id: string,
  endedAt: number,
  focusedSeconds: number,
  options: Partial<FocusSession> = {},
): FocusSession {
  return {
    id,
    taskName: "学习",
    category: "数学",
    plannedSeconds: 1500,
    focusedSeconds,
    startedAt: endedAt - Math.max(0, focusedSeconds) * 1000,
    endedAt,
    status: "completed",
    ...options,
  };
}

describe("heatmap levels", () => {
  it.each([
    [0, 0],
    [1, 1],
    [29 * 60, 1],
    [30 * 60, 2],
    [59 * 60, 2],
    [60 * 60, 3],
    [119 * 60, 3],
    [120 * 60, 4],
  ] as const)("maps %i seconds to level %i", (seconds, level) => {
    expect(getHeatmapLevel(seconds)).toBe(level);
  });
});

describe("heatmap date range", () => {
  it("covers the past 365 days and expands to complete Monday-first weeks", () => {
    const end = new Date(2026, 6, 17);
    const dates = createHeatmapDateRange(end);
    expect(dates.length % 7).toBe(0);
    expect(dates[0].getDay()).toBe(1);
    expect(dates.at(-1)?.getDay()).toBe(0);
    expect(dates.some((date) => getLocalDateKey(date) === "2026-07-17")).toBe(true);
    expect(dates.length).toBeGreaterThanOrEqual(365);
  });
});

describe("daily focus aggregation", () => {
  const dates = [new Date(2026, 6, 16), new Date(2026, 6, 17), new Date(2026, 6, 18)];
  const day = new Date(2026, 6, 17, 20).getTime();
  const sessions = [
    session("free", day, 1200),
    session("pomodoro", day - 1000, 1500, { mode: "pomodoro", pomodoroRound: 2, pomodoroRoundsTotal: 4 }),
    session("stopped", day - 2000, 300, { status: "stopped", category: "项目" }),
    session("negative", day - 3000, -500),
    session("break", day - 4000, 900, { category: "其他", phase: "short-break" } as Partial<FocusSession>),
  ];

  it("combines free, pomodoro and saved stopped records without counting breaks or negatives", () => {
    const summary = aggregateSessionsByDay(sessions, dates)[1];
    expect(summary.focusedSeconds).toBe(3000);
    expect(summary.sessionCount).toBe(4);
    expect(summary.completedCount).toBe(3);
    expect(summary.stoppedCount).toBe(1);
    expect(summary.categorySeconds).toEqual({ 数学: 2700, 项目: 300 });
  });

  it("fills dates without records and filters every metric by category", () => {
    const summaries = aggregateSessionsByDay(sessions, dates, "项目");
    expect(summaries[0]).toMatchObject({ focusedSeconds: 0, sessionCount: 0, level: 0 });
    expect(summaries[1]).toMatchObject({ focusedSeconds: 300, sessionCount: 1, completedCount: 0, stoppedCount: 1 });
    expect(summaries[2]).toMatchObject({ focusedSeconds: 0, sessionCount: 0, level: 0 });
  });

  it("returns matching day records newest first", () => {
    expect(getSessionsForDate(sessions, "2026-07-17").map((item) => item.id)).toEqual([
      "free", "pomodoro", "stopped", "negative",
    ]);
  });
});

describe("history overview", () => {
  it("calculates total time, active days, completed count and cross-year longest streak", () => {
    const dates = [
      new Date(2025, 11, 30),
      new Date(2025, 11, 31),
      new Date(2026, 0, 1),
      new Date(2026, 0, 2),
      new Date(2026, 0, 3),
    ];
    const sessions = [
      session("a", new Date(2025, 11, 30, 9).getTime(), 600),
      session("b", new Date(2025, 11, 31, 9).getTime(), 900),
      session("c", new Date(2026, 0, 1, 9).getTime(), 1200, { status: "stopped" }),
      session("d", new Date(2026, 0, 3, 9).getTime(), 300),
    ];
    const overview = getHistoryOverview(aggregateSessionsByDay(sessions, dates));
    expect(overview).toEqual({ focusedSeconds: 3000, activeDays: 4, completedCount: 3, longestStreak: 3 });
  });

  it("updates the overview after category filtering", () => {
    const dates = [new Date(2026, 6, 16), new Date(2026, 6, 17)];
    const sessions = [
      session("math", new Date(2026, 6, 16, 9).getTime(), 1800),
      session("project", new Date(2026, 6, 17, 9).getTime(), 3600, { category: "项目" }),
    ];
    expect(getHistoryOverview(aggregateSessionsByDay(sessions, dates, "项目"))).toEqual({
      focusedSeconds: 3600,
      activeDays: 1,
      completedCount: 1,
      longestStreak: 1,
    });
  });

  it("selects today, otherwise the latest active day, and clears when empty", () => {
    const dates = [new Date(2026, 6, 16), new Date(2026, 6, 17)];
    const today = new Date(2026, 6, 17, 12);
    const withToday = aggregateSessionsByDay([session("today", today.getTime(), 60)], dates);
    expect(getDefaultSelectedDateKey(withToday, today)).toBe("2026-07-17");

    const previous = aggregateSessionsByDay([session("previous", new Date(2026, 6, 16, 9).getTime(), 60)], dates);
    expect(getDefaultSelectedDateKey(previous, today)).toBe("2026-07-16");
    expect(getDefaultSelectedDateKey(aggregateSessionsByDay([], dates), today)).toBeNull();
  });
});
