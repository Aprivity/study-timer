import { describe, expect, it } from "vitest";
import { parseSessions, parseSettings, parseTimer } from "./storage";

describe("storage validation", () => {
  it("falls back when JSON is invalid", () => {
    expect(parseSessions("{broken")).toEqual([]);
    expect(parseTimer("{broken")).toBeNull();
    expect(parseSettings("{broken").defaultDurationMinutes).toBe(45);
  });
  it("rejects malformed session entries", () => expect(parseSessions(JSON.stringify([{ id: "x" }]))).toEqual([]));
  it("clamps corrupt timer remaining time", () => {
    const timer = parseTimer(JSON.stringify({ status: "paused", totalSeconds: 1500, remainingSeconds: 9999 }));
    expect(timer?.remainingSeconds).toBe(1500);
  });
});
