import { describe, expect, it } from "vitest";
import { calculateRemainingSeconds, focusedSeconds } from "./timer";

describe("timer calculations", () => {
  it("uses the end timestamp and rounds up partial seconds", () => expect(calculateRemainingSeconds(10_001, 5_000)).toBe(6));
  it("clamps an elapsed countdown to zero", () => expect(calculateRemainingSeconds(4_000, 5_000)).toBe(0));
  it("calculates focused time safely", () => expect(focusedSeconds(2700, 1200)).toBe(1500));
});
