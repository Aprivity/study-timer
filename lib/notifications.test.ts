import { afterEach, describe, expect, it, vi } from "vitest";
import { canSendNotification, createCompletionNotification, getNotificationIconPath, getNotificationPermission, isNotificationSupported, requestNotificationPermission, sendBrowserNotification, shouldSendDesktopNotification } from "./notifications";
import { DEFAULT_POMODORO_SETTINGS } from "./pomodoro";

const originalNotification = Object.getOwnPropertyDescriptor(window, "Notification");

function installNotification(permission: NotificationPermission, requestResult: NotificationPermission = permission, throwOnCreate = false) {
  const created: Array<{ title: string; options?: NotificationOptions; close: ReturnType<typeof vi.fn>; onclick: (() => void) | null }> = [];
  const requestPermission = vi.fn().mockResolvedValue(requestResult);
  class FakeNotification {
    static permission = permission;
    static requestPermission = requestPermission;
    close = vi.fn();
    onclick: (() => void) | null = null;
    constructor(public title: string, public options?: NotificationOptions) {
      if (throwOnCreate) throw new Error("blocked");
      created.push(this);
    }
  }
  Object.defineProperty(window, "Notification", { configurable: true, value: FakeNotification });
  return { created, requestPermission };
}

afterEach(() => {
  if (originalNotification) Object.defineProperty(window, "Notification", originalNotification);
  else Reflect.deleteProperty(window, "Notification");
  vi.restoreAllMocks();
});

describe("browser notification service", () => {
  it("reports unsupported browsers safely", () => {
    Reflect.deleteProperty(window, "Notification");
    expect(isNotificationSupported()).toBe(false);
    expect(getNotificationPermission()).toBe("default");
    expect(canSendNotification(true)).toBe(false);
  });

  it.each(["default", "granted", "denied"] as const)("reads %s permission", (permission) => {
    installNotification(permission);
    expect(getNotificationPermission()).toBe(permission);
  });

  it("requests permission only while undecided", async () => {
    const undecided = installNotification("default", "granted");
    await expect(requestNotificationPermission()).resolves.toBe("granted");
    expect(undecided.requestPermission).toHaveBeenCalledTimes(1);
    const denied = installNotification("denied");
    await expect(requestNotificationPermission()).resolves.toBe("denied");
    expect(denied.requestPermission).not.toHaveBeenCalled();
  });

  it("sends only for an enabled, authorized background page", () => {
    expect(shouldSendDesktopNotification({ enabled: true, supported: true, permission: "granted", visibilityState: "hidden" })).toBe(true);
    expect(shouldSendDesktopNotification({ enabled: true, supported: true, permission: "granted", visibilityState: "visible" })).toBe(false);
    expect(shouldSendDesktopNotification({ enabled: false, supported: true, permission: "granted", visibilityState: "hidden" })).toBe(false);
    expect(shouldSendDesktopNotification({ enabled: true, supported: true, permission: "denied", visibilityState: "hidden" })).toBe(false);
  });

  it("uses local and GitHub Pages icon paths", () => {
    expect(getNotificationIconPath(false)).toBe("/icon.svg");
    expect(getNotificationIconPath(true)).toBe("/study-timer/icon.svg");
  });

  it("focuses the page and closes the notification when clicked", () => {
    const api = installNotification("granted");
    const focus = vi.spyOn(window, "focus").mockImplementation(() => undefined);
    expect(sendBrowserNotification({ title: "完成", body: "测试" })).toBe(true);
    expect(api.created).toHaveLength(1);
    api.created[0].onclick?.();
    expect(focus).toHaveBeenCalledTimes(1);
    expect(api.created[0].close).toHaveBeenCalledTimes(1);
  });

  it("fails safely when the constructor throws", () => {
    installNotification("granted", "granted", true);
    expect(sendBrowserNotification({ title: "完成", body: "测试" })).toBe(false);
  });
});

describe("completion notification copy", () => {
  it("creates named and unnamed free focus messages", () => {
    expect(createCompletionNotification({ mode: "free", completedPhase: "focus", completedRound: 1, totalSeconds: 2700, taskName: "第一型曲面积分课程", eventToken: "free" })).toMatchObject({
      title: "专注完成",
      body: "你已完成“第一型曲面积分课程”，本次专注 45 分钟。",
      tag: "aprivity-focus:free-complete:free",
    });
    expect(createCompletionNotification({ mode: "free", completedPhase: "focus", completedRound: 1, totalSeconds: 2700, taskName: "  ", eventToken: "empty" }).body).toBe("你已完成一次 45 分钟专注。");
  });

  it("creates normal and final pomodoro focus messages", () => {
    const normal = createCompletionNotification({ mode: "pomodoro", completedPhase: "focus", completedRound: 2, totalSeconds: 1500, taskName: "数学", eventToken: "p2", nextState: { phase: "short-break", currentRound: 2, cycleId: "cycle" }, pomodoro: DEFAULT_POMODORO_SETTINGS });
    expect(normal).toMatchObject({ title: "第 2 轮专注完成", body: "本轮专注 25 分钟，接下来是短休息 5 分钟。" });
    const final = createCompletionNotification({ mode: "pomodoro", completedPhase: "focus", completedRound: 4, totalSeconds: 1500, taskName: "数学", eventToken: "p4", nextState: { phase: "long-break", currentRound: 4, cycleId: "cycle" }, pomodoro: DEFAULT_POMODORO_SETTINGS });
    expect(final).toMatchObject({ title: "本轮番茄循环完成", body: "你已完成 4 轮专注，接下来是长休息 15 分钟。" });
  });

  it("creates short and long break messages and reflects auto start", () => {
    const shortBreak = createCompletionNotification({ mode: "pomodoro", completedPhase: "short-break", completedRound: 2, totalSeconds: 300, taskName: "第一型曲面积分课程", eventToken: "short", nextState: { phase: "focus", currentRound: 3, cycleId: "cycle" }, pomodoro: DEFAULT_POMODORO_SETTINGS });
    expect(shortBreak).toMatchObject({ title: "短休息结束", body: "准备开始第 3 轮专注。 继续任务：“第一型曲面积分课程”。" });
    const longBreak = createCompletionNotification({ mode: "pomodoro", completedPhase: "long-break", completedRound: 4, totalSeconds: 900, taskName: "数学", eventToken: "long", nextState: { phase: "focus", currentRound: 1, cycleId: null }, pomodoro: DEFAULT_POMODORO_SETTINGS, autoStarted: true });
    expect(longBreak).toMatchObject({ title: "长休息结束", body: "新一轮番茄专注已开始。" });
  });
});
