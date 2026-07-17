import { describe, expect, it } from "vitest";
import { parseSessions, parseSettings, parseTimer } from "./storage";

describe("storage validation", () => {
  it("falls back when JSON is invalid", () => {
    expect(parseSessions("{broken")).toEqual([]);
    expect(parseTimer("{broken")).toBeNull();
    expect(parseSettings("{broken").defaultDurationMinutes).toBe(45);
  });
  it("rejects malformed session entries", () => expect(parseSessions(JSON.stringify([{ id: "x" }]))).toEqual([]));
  it("fills missing settings fields with safe defaults", () => {
    const settings = parseSettings(JSON.stringify({ soundEnabled: false }));
    expect(settings).toEqual({
      soundEnabled: false,
      notificationsEnabled: false,
      defaultDurationMinutes: 45,
      confirmEndEnabled: true,
      autoFullscreen: false,
      reduceMotion: false,
      timerMode: "free",
      pomodoro: {
        focusMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        roundsBeforeLongBreak: 4,
        autoStartBreaks: false,
        autoStartFocus: false,
      },
    });
  });
  it("accepts only a boolean desktop notification setting", () => {
    expect(parseSettings(JSON.stringify({ notificationsEnabled: true })).notificationsEnabled).toBe(true);
    expect(parseSettings(JSON.stringify({ notificationsEnabled: "yes" })).notificationsEnabled).toBe(false);
  });
  it("migrates V1 timer state to free mode without losing active time", () => {
    const timer = parseTimer(JSON.stringify({ version: 1, status: "running", totalSeconds: 2700, remainingSeconds: 1200, endAt: 9999, taskName: "旧任务", category: "阅读" }));
    expect(timer).toMatchObject({ version: 2, mode: "free", status: "running", remainingSeconds: 1200, taskName: "旧任务", pomodoro: null });
  });
  it("clamps invalid pomodoro settings", () => {
    const settings = parseSettings(JSON.stringify({ timerMode: "pomodoro", pomodoro: { focusMinutes: 999, shortBreakMinutes: 0, longBreakMinutes: -2, roundsBeforeLongBreak: 40, autoStartBreaks: true } }));
    expect(settings.timerMode).toBe("pomodoro");
    expect(settings.pomodoro).toEqual({ focusMinutes: 180, shortBreakMinutes: 1, longBreakMinutes: 1, roundsBeforeLongBreak: 12, autoStartBreaks: true, autoStartFocus: false });
  });
  it("restores valid pomodoro phase state and falls back from invalid fields", () => {
    const timer = parseTimer(JSON.stringify({ version: 2, mode: "pomodoro", status: "paused", totalSeconds: 300, remainingSeconds: 200, pomodoro: { phase: "short-break", currentRound: 2, cycleId: "cycle" } }));
    expect(timer?.pomodoro).toEqual({ phase: "short-break", currentRound: 2, cycleId: "cycle" });
    expect(timer?.notifiedToken).toBeNull();
    const invalid = parseTimer(JSON.stringify({ version: 2, mode: "pomodoro", status: "idle", totalSeconds: 1500, pomodoro: { phase: "invalid", currentRound: 99 } }));
    expect(invalid?.pomodoro).toEqual({ phase: "focus", currentRound: 12, cycleId: null });
  });
  it("keeps legacy history records as free focus sessions", () => {
    const sessions = parseSessions(JSON.stringify([{ id: "old", taskName: "旧记录", category: "数学", plannedSeconds: 60, focusedSeconds: 60, startedAt: 1, endedAt: 2, status: "completed" }]));
    expect(sessions).toHaveLength(1);
    expect(sessions[0].mode).toBeUndefined();
  });
  it("clamps corrupt timer remaining time", () => {
    const timer = parseTimer(JSON.stringify({ status: "paused", totalSeconds: 1500, remainingSeconds: 9999 }));
    expect(timer?.remainingSeconds).toBe(1500);
  });
});
