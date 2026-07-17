import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "./useCountdown";

describe("useCountdown", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-07-15T10:00:00Z")); });
  afterEach(() => vi.useRealTimers());
  it("pauses, resumes and reaches zero", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCountdown(60, { onComplete }));
    act(() => result.current.start());
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(result.current.remainingSeconds).toBe(50);
    act(() => result.current.pause());
    const pausedAt = Date.now();
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(result.current.remainingSeconds).toBe(50);
    act(() => result.current.resume());
    expect(result.current.endAt).toBe(pausedAt + 10_000 + 50_000);
    act(() => { vi.advanceTimersByTime(50_000); });
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.status).toBe("completed");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("restores an expired running timer at zero", () => {
    const { result } = renderHook(() => useCountdown(60));
    act(() => result.current.restore({
      version: 1, status: "running", totalSeconds: 60, remainingSeconds: 40,
      endAt: Date.now() - 1000, startedAt: Date.now() - 61_000,
      taskName: "恢复测试", category: "项目", sessionToken: "one", savedSessionToken: null,
    }));
    expect(result.current.status).toBe("completed");
    expect(result.current.remainingSeconds).toBe(0);
  });

  it("starts a new stage with its own duration without stale state", () => {
    const { result } = renderHook(() => useCountdown(1500));
    act(() => result.current.start(300));
    expect(result.current.totalSeconds).toBe(300);
    expect(result.current.remainingSeconds).toBe(300);
    expect(result.current.endAt).toBe(Date.now() + 300_000);
  });
});
