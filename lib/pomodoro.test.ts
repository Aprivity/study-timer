import { describe, expect, it } from "vitest";
import { DEFAULT_POMODORO_SETTINGS, getNextPomodoroState, getPhaseDurationSeconds, getPomodoroPhaseLabel, INITIAL_POMODORO_STATE, shouldAutoStartNextPhase, shouldRecordPhase } from "./pomodoro";

describe("pomodoro state machine", () => {
  it("provides the requested defaults", () => {
    expect(DEFAULT_POMODORO_SETTINGS).toEqual({ focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, roundsBeforeLongBreak: 4, autoStartBreaks: false, autoStartFocus: false });
    expect(INITIAL_POMODORO_STATE).toEqual({ phase: "focus", currentRound: 1, cycleId: null });
  });

  it("moves first focus to a short break", () => {
    expect(getNextPomodoroState({ phase: "focus", currentRound: 1, cycleId: "cycle" }, DEFAULT_POMODORO_SETTINGS)).toEqual({ phase: "short-break", currentRound: 1, cycleId: "cycle" });
  });

  it("moves a short break to the next focus round", () => {
    expect(getNextPomodoroState({ phase: "short-break", currentRound: 1, cycleId: "cycle" }, DEFAULT_POMODORO_SETTINGS)).toEqual({ phase: "focus", currentRound: 2, cycleId: "cycle" });
  });

  it("moves the final focus to long break and resets after it", () => {
    const longBreak = getNextPomodoroState({ phase: "focus", currentRound: 4, cycleId: "cycle" }, DEFAULT_POMODORO_SETTINGS);
    expect(longBreak.phase).toBe("long-break");
    expect(getNextPomodoroState(longBreak, DEFAULT_POMODORO_SETTINGS)).toEqual(INITIAL_POMODORO_STATE);
  });

  it.each([2, 4, 8])("handles a %i-round cycle", (rounds) => {
    const settings = { ...DEFAULT_POMODORO_SETTINGS, roundsBeforeLongBreak: rounds };
    expect(getNextPomodoroState({ phase: "focus", currentRound: rounds - 1, cycleId: "x" }, settings).phase).toBe("short-break");
    expect(getNextPomodoroState({ phase: "focus", currentRound: rounds, cycleId: "x" }, settings).phase).toBe("long-break");
  });

  it("uses the correct duration and Chinese labels", () => {
    expect(getPhaseDurationSeconds("focus", DEFAULT_POMODORO_SETTINGS)).toBe(1500);
    expect(getPhaseDurationSeconds("short-break", DEFAULT_POMODORO_SETTINGS)).toBe(300);
    expect(getPhaseDurationSeconds("long-break", DEFAULT_POMODORO_SETTINGS)).toBe(900);
    expect(["focus", "short-break", "long-break"].map((phase) => getPomodoroPhaseLabel(phase as "focus" | "short-break" | "long-break"))).toEqual(["专注", "短休息", "长休息"]);
  });

  it("applies each auto-start switch only to its destination phase", () => {
    const settings = { ...DEFAULT_POMODORO_SETTINGS, autoStartBreaks: true, autoStartFocus: false };
    expect(shouldAutoStartNextPhase("short-break", settings)).toBe(true);
    expect(shouldAutoStartNextPhase("long-break", settings)).toBe(true);
    expect(shouldAutoStartNextPhase("focus", settings)).toBe(false);
  });

  it("never records break phases", () => {
    expect(shouldRecordPhase("pomodoro", "focus")).toBe(true);
    expect(shouldRecordPhase("pomodoro", "short-break")).toBe(false);
    expect(shouldRecordPhase("pomodoro", "long-break")).toBe(false);
    expect(shouldRecordPhase("free", "focus")).toBe(true);
  });
});
