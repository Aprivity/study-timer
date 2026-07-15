import { describe, expect, it } from "vitest";
import { getFocusStreak, getTodayCompletedCount, getTodayFocusedSeconds } from "./statistics";
import type { FocusSession } from "@/types/focus-session";

const session = (id: string, endedAt: number, focusedSeconds = 1500, status: FocusSession["status"] = "completed"): FocusSession => ({
  id, taskName: "学习", category: "数学", plannedSeconds: 1500, focusedSeconds,
  startedAt: endedAt - focusedSeconds * 1000, endedAt, status,
});

describe("local-day statistics", () => {
  const now = new Date(2026, 6, 15, 20);
  it("sums today's focused time", () => expect(getTodayFocusedSeconds([
    session("a", new Date(2026, 6, 15, 9).getTime(), 1200),
    session("b", new Date(2026, 6, 15, 12).getTime(), 300, "stopped"),
    session("c", new Date(2026, 6, 14, 23).getTime(), 2400),
  ], now)).toBe(1500));
  it("counts only completed sessions today", () => expect(getTodayCompletedCount([
    session("a", new Date(2026, 6, 15, 9).getTime()),
    session("b", new Date(2026, 6, 15, 11).getTime(), 300, "stopped"),
  ], now)).toBe(1));
  it("counts consecutive local calendar days", () => expect(getFocusStreak([
    session("a", new Date(2026, 6, 15, 8).getTime()),
    session("b", new Date(2026, 6, 14, 8).getTime()),
    session("c", new Date(2026, 6, 13, 8).getTime()),
  ], now)).toBe(3));
  it("allows a streak ending yesterday", () => expect(getFocusStreak([
    session("a", new Date(2026, 6, 14, 8).getTime()),
    session("b", new Date(2026, 6, 13, 8).getTime()),
  ], now)).toBe(2));
});
