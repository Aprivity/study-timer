import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FocusTimer } from "./FocusTimer";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function persistPomodoroTimer(phase: "focus" | "short-break" | "long-break", currentRound: number, overrides: Record<string, unknown> = {}) {
  window.localStorage.setItem("aprivity-focus:timer", JSON.stringify({
    version: 2, mode: "pomodoro", status: "running", totalSeconds: phase === "focus" ? 1500 : phase === "short-break" ? 300 : 900,
    remainingSeconds: 1, endAt: Date.now() - 1000, startedAt: Date.now() - 100_000,
    taskName: "恢复番茄", category: "数学", sessionToken: `${phase}-token`, savedSessionToken: null,
    pomodoro: { phase, currentRound, cycleId: "cycle-recovery" }, ...overrides,
  }));
}

describe("Pomodoro completion and recovery", () => {
  beforeEach(() => window.localStorage.clear());

  it("records an expired focus once and waits at short break", async () => {
    persistPomodoroTimer("focus", 1);
    render(<FocusTimer />);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "开始短休息" })).toBeInTheDocument();
    await waitFor(() => {
      const sessions = JSON.parse(window.localStorage.getItem("aprivity-focus:sessions") ?? "[]") as Array<{ id: string; mode: string; pomodoroRound: number }>;
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({ id: "focus-token", mode: "pomodoro", pomodoroRound: 1 });
    });
  });

  it("does not record an expired short break and advances to round two", async () => {
    persistPomodoroTimer("short-break", 1);
    render(<FocusTimer />);
    expect(await screen.findByText("第 2 / 4 轮")).toBeInTheDocument();
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "开始专注" })).toBeInTheDocument();
    expect(window.localStorage.getItem("aprivity-focus:sessions")).toBeNull();
  });

  it("resets to a new first round after an expired long break", async () => {
    persistPomodoroTimer("long-break", 4);
    render(<FocusTimer />);
    expect(await screen.findByText("第 1 / 4 轮")).toBeInTheDocument();
    expect(screen.getByLabelText("本次学习任务")).toBeInTheDocument();
    expect(window.localStorage.getItem("aprivity-focus:sessions")).toBeNull();
  });

  it("auto-starts a break exactly once with a new stage token", async () => {
    window.localStorage.setItem("aprivity-focus:settings", JSON.stringify({ pomodoro: { autoStartBreaks: true } }));
    persistPomodoroTimer("focus", 1);
    render(<FocusTimer />);
    expect(await screen.findByRole("button", { name: "暂停休息" })).toBeInTheDocument();
    await waitFor(() => {
      const timer = JSON.parse(window.localStorage.getItem("aprivity-focus:timer") ?? "null") as { status: string; sessionToken: string; pomodoro: { phase: string } };
      expect(timer).toMatchObject({ status: "running", pomodoro: { phase: "short-break" } });
      expect(timer.sessionToken).not.toBe("focus-token");
    });
  });

  it("auto-starts focus after a break when enabled", async () => {
    window.localStorage.setItem("aprivity-focus:settings", JSON.stringify({ pomodoro: { autoStartFocus: true } }));
    persistPomodoroTimer("short-break", 1);
    render(<FocusTimer />);
    expect(await screen.findByRole("button", { name: "暂停" })).toBeInTheDocument();
    expect(screen.getByText("第 2 / 4 轮")).toBeInTheDocument();
    expect(window.localStorage.getItem("aprivity-focus:sessions")).toBeNull();
  });
});
