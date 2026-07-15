import { describe, expect, it } from "vitest";
import { formatDuration, formatHumanDuration } from "./time-format";

describe("time formatting", () => {
  it("formats minutes and seconds", () => expect(formatDuration(45 * 60 + 7)).toBe("45:07"));
  it("formats durations across an hour", () => expect(formatDuration(80 * 60)).toBe("01:20:00"));
  it("never renders negative time", () => expect(formatDuration(-8)).toBe("00:00"));
  it("formats human-readable hours", () => expect(formatHumanDuration(90 * 60)).toBe("1 小时 30 分钟"));
});
