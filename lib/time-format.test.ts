import { describe, expect, it } from "vitest";
import { formatDuration, formatHumanDuration } from "./time-format";

describe("time formatting", () => {
  it.each([
    [0, "00:00"],
    [60, "01:00"],
    [9 * 60 + 9, "09:09"],
    [45 * 60, "45:00"],
    [3599, "59:59"],
    [3600, "01:00:00"],
    [4800, "01:20:00"],
    [12 * 3600, "12:00:00"],
  ])("formats %i seconds as %s", (seconds, expected) => expect(formatDuration(seconds)).toBe(expected));
  it("never renders negative time", () => expect(formatDuration(-8)).toBe("00:00"));
  it("formats human-readable hours", () => expect(formatHumanDuration(90 * 60)).toBe("1 小时 30 分钟"));
});
