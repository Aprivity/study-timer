import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FocusTimer } from "./FocusTimer";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("FocusTimer core controls", () => {
  beforeEach(() => window.localStorage.clear());
  it("keeps free focus as the default mode", async () => {
    render(<FocusTimer />);
    expect(await screen.findByRole("button", { name: "自由专注" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "番茄循环" })).toHaveAttribute("aria-pressed", "false");
  });
  it("starts and pauses a focus session", async () => {
    render(<FocusTimer />);
    expect(await screen.findByRole("timer", { name: "剩余时间 45:00" })).toBeInTheDocument();
    expect(screen.getByLabelText("本次学习任务")).toHaveValue("");
    const start = await screen.findByRole("button", { name: /开始专注/ });
    fireEvent.click(start);
    expect(await screen.findByRole("button", { name: "暂停" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "25 分钟" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "暂停" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /继续专注/ })).toBeInTheDocument());
  });

  it("discards an early stop without creating history and resets to idle", async () => {
    render(<FocusTimer />);
    fireEvent.click(await screen.findByRole("button", { name: /开始专注/ }));
    fireEvent.click(await screen.findByRole("button", { name: "提前结束" }));
    fireEvent.click(await screen.findByRole("button", { name: "放弃本次记录" }));
    expect(await screen.findByRole("button", { name: /开始专注/ })).toBeInTheDocument();
    expect(window.localStorage.getItem("aprivity-focus:sessions")).toBeNull();
  });

  it("applies the persisted default duration to a fresh timer", async () => {
    window.localStorage.setItem("aprivity-focus:settings", JSON.stringify({ defaultDurationMinutes: 25 }));
    render(<FocusTimer />);
    expect(await screen.findByRole("timer", { name: "剩余时间 25:00" })).toBeInTheDocument();
  });

  it("continues safely when automatic fullscreen is rejected", async () => {
    window.localStorage.setItem("aprivity-focus:settings", JSON.stringify({ autoFullscreen: true }));
    const requestFullscreen = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(document.documentElement, "requestFullscreen", { configurable: true, value: requestFullscreen });
    render(<FocusTimer />);
    fireEvent.click(await screen.findByRole("button", { name: /开始专注/ }));
    expect(await screen.findByRole("button", { name: "暂停" })).toBeInTheDocument();
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    Reflect.deleteProperty(document.documentElement, "requestFullscreen");
  });

  it("switches to pomodoro only while idle and starts the first 25-minute round", async () => {
    render(<FocusTimer />);
    fireEvent.click(await screen.findByRole("button", { name: "番茄循环" }));
    expect(await screen.findByRole("timer", { name: "剩余时间 25:00" })).toBeInTheDocument();
    expect(screen.getByText("第 1 / 4 轮")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "开始专注" }));
    expect(await screen.findByRole("button", { name: "暂停" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "自由专注" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "番茄循环" })).toBeDisabled();
  });

  it("restores and skips a paused short break without creating history", async () => {
    window.localStorage.setItem("aprivity-focus:timer", JSON.stringify({
      version: 2, mode: "pomodoro", status: "paused", totalSeconds: 300, remainingSeconds: 240,
      endAt: null, startedAt: Date.now() - 60_000, taskName: "数学课程", category: "数学",
      sessionToken: "break-token", savedSessionToken: null,
      pomodoro: { phase: "short-break", currentRound: 1, cycleId: "cycle-one" },
    }));
    render(<FocusTimer />);
    expect(await screen.findByRole("button", { name: "继续休息" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "跳过休息" }));
    expect(await screen.findByText("第 2 / 4 轮")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始专注" })).toBeInTheDocument();
    expect(window.localStorage.getItem("aprivity-focus:sessions")).toBeNull();
  });

  it("saves an incomplete pomodoro focus as stopped and resets the cycle", async () => {
    window.localStorage.setItem("aprivity-focus:timer", JSON.stringify({
      version: 2, mode: "pomodoro", status: "paused", totalSeconds: 1500, remainingSeconds: 1400,
      endAt: null, startedAt: Date.now() - 100_000, taskName: "番茄任务", category: "项目",
      sessionToken: "focus-token", savedSessionToken: null,
      pomodoro: { phase: "focus", currentRound: 2, cycleId: "cycle-two" },
    }));
    render(<FocusTimer />);
    fireEvent.click(await screen.findByRole("button", { name: "结束本轮" }));
    fireEvent.click(await screen.findByRole("button", { name: "保存当前专注时长" }));
    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem("aprivity-focus:sessions") ?? "[]") as Array<{ status: string; mode: string; pomodoroRound: number }>;
      expect(stored[0]).toMatchObject({ status: "stopped", mode: "pomodoro", pomodoroRound: 2 });
    });
    expect(await screen.findByText("第 1 / 4 轮")).toBeInTheDocument();
  });
});
