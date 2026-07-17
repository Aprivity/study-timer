import { StrictMode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FocusTimer } from "./FocusTimer";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const originalNotification = Object.getOwnPropertyDescriptor(window, "Notification");
const originalVisibility = Object.getOwnPropertyDescriptor(document, "visibilityState");

function installNotification(throwOnCreate = false) {
  const created: Array<{ title: string; options?: NotificationOptions }> = [];
  class FakeNotification {
    static permission: NotificationPermission = "granted";
    static requestPermission = vi.fn().mockResolvedValue("granted");
    onclick: (() => void) | null = null;
    close = vi.fn();
    constructor(public title: string, public options?: NotificationOptions) {
      if (throwOnCreate) throw new Error("notification failed");
      created.push(this);
    }
  }
  Object.defineProperty(window, "Notification", { configurable: true, value: FakeNotification });
  return created;
}

function persistExpiredTimer(overrides: Record<string, unknown> = {}) {
  window.localStorage.setItem("aprivity-focus:settings", JSON.stringify({ notificationsEnabled: true, soundEnabled: false }));
  window.localStorage.setItem("aprivity-focus:timer", JSON.stringify({
    version: 2, mode: "free", status: "running", totalSeconds: 2700, remainingSeconds: 1,
    endAt: Date.now() - 1000, startedAt: Date.now() - 2_700_000, taskName: "第一型曲面积分课程", category: "数学",
    sessionToken: "notification-token", savedSessionToken: null, notifiedToken: null, pomodoro: null,
    ...overrides,
  }));
}

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
});

afterEach(() => {
  if (originalNotification) Object.defineProperty(window, "Notification", originalNotification);
  else Reflect.deleteProperty(window, "Notification");
  if (originalVisibility) Object.defineProperty(document, "visibilityState", originalVisibility);
  vi.restoreAllMocks();
});

describe("FocusTimer desktop notifications", () => {
  it("notifies an expired free focus once in Strict Mode and persists deduplication", async () => {
    const created = installNotification();
    persistExpiredTimer();
    render(<StrictMode><FocusTimer /></StrictMode>);
    await waitFor(() => expect(created).toHaveLength(1));
    expect(created[0]).toMatchObject({ title: "专注完成", options: { body: "你已完成“第一型曲面积分课程”，本次专注 45 分钟。", tag: "aprivity-focus:free-complete:notification-token" } });
    await waitFor(() => {
      const timer = JSON.parse(window.localStorage.getItem("aprivity-focus:timer") ?? "null") as { notifiedToken: string; savedSessionToken: string };
      expect(timer).toMatchObject({ notifiedToken: "notification-token", savedSessionToken: "notification-token" });
    });

    cleanup();
    render(<FocusTimer />);
    await screen.findByRole("timer", { name: "剩余时间 00:00" });
    expect(created).toHaveLength(1);
  });

  it("does not send a desktop notification while the page is visible", async () => {
    const created = installNotification();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    persistExpiredTimer();
    render(<FocusTimer />);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(created).toHaveLength(0);
  });

  it("keeps record saving and completion feedback when Notification throws", async () => {
    installNotification(true);
    persistExpiredTimer();
    render(<FocusTimer />);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await waitFor(() => {
      const sessions = JSON.parse(window.localStorage.getItem("aprivity-focus:sessions") ?? "[]") as Array<{ id: string }>;
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe("notification-token");
    });
  });

  it("notifies a completed short break without creating a history record", async () => {
    const created = installNotification();
    persistExpiredTimer({
      mode: "pomodoro", totalSeconds: 300, startedAt: Date.now() - 300_000, taskName: "数学课程",
      sessionToken: "short-break-token", pomodoro: { phase: "short-break", currentRound: 2, cycleId: "cycle" },
    });
    render(<FocusTimer />);
    await waitFor(() => expect(created).toHaveLength(1));
    expect(created[0]).toMatchObject({ title: "短休息结束", options: { body: "准备开始第 3 轮专注。 继续任务：“数学课程”。" } });
    expect(window.localStorage.getItem("aprivity-focus:sessions")).toBeNull();
  });
});
