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
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(result.current.remainingSeconds).toBe(50);
    act(() => result.current.resume());
    act(() => { vi.advanceTimersByTime(50_000); });
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.status).toBe("completed");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
