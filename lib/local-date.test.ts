import { describe, expect, it } from "vitest";
import {
  addLocalDays,
  endOfLocalWeek,
  getLocalDateKey,
  isSameLocalDay,
  parseLocalDateKey,
  startOfLocalWeek,
} from "./local-date";

describe("local date utilities", () => {
  it("formats a padded local date key", () => {
    expect(getLocalDateKey(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });

  it("adds a day across month and year boundaries", () => {
    expect(getLocalDateKey(addLocalDays(new Date(2026, 0, 31), 1))).toBe("2026-02-01");
    expect(getLocalDateKey(addLocalDays(new Date(2025, 11, 31), 1))).toBe("2026-01-01");
  });

  it("uses Monday as the first day of the local week", () => {
    const friday = new Date(2026, 6, 17);
    expect(getLocalDateKey(startOfLocalWeek(friday))).toBe("2026-07-13");
    expect(getLocalDateKey(endOfLocalWeek(friday))).toBe("2026-07-19");
  });

  it("parses strict local keys and compares local days", () => {
    const date = parseLocalDateKey("2026-07-17");
    expect(getLocalDateKey(date)).toBe("2026-07-17");
    expect(isSameLocalDay(date, new Date(2026, 6, 17, 23, 59))).toBe(true);
    expect(Number.isNaN(parseLocalDateKey("2026-02-31").getTime())).toBe(true);
  });

  it("uses local calendar fields rather than the UTC date", () => {
    const previousTimezone = process.env.TZ;
    try {
      process.env.TZ = "America/Los_Angeles";
      const timestamp = Date.parse("2026-01-01T00:30:00Z");
      expect(getLocalDateKey(timestamp)).toBe("2025-12-31");
    } finally {
      if (previousTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimezone;
    }
  });
});
