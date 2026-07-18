import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BACKGROUND_SETTINGS } from "@/lib/background-presets";
import * as imageStorage from "@/lib/indexed-db";
import { DEFAULT_SETTINGS, STORAGE_KEYS } from "@/lib/storage";
import type { FocusSession } from "@/types/focus-session";
import { createBackup, getBackupFileName, readLocalBackupSource } from "./backup-export";

const sessions: FocusSession[] = [
  { id: "a", taskName: "数学", category: "数学", plannedSeconds: 1500, focusedSeconds: 1500, startedAt: 100, endedAt: 200, status: "completed", mode: "free" },
  { id: "b", taskName: "阅读", category: "阅读", plannedSeconds: 2700, focusedSeconds: 600, startedAt: 300, endedAt: 400, status: "stopped", mode: "pomodoro", pomodoroRound: 1, pomodoroRoundsTotal: 4 },
];

function source() {
  return {
    sessions,
    settings: structuredClone(DEFAULT_SETTINGS),
    backgroundSettings: structuredClone(DEFAULT_BACKGROUND_SETTINGS),
    backgroundImage: { included: false as const, exists: true, storageKey: "custom-background", mimeType: "image/webp", size: 1234 },
  };
}

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe("backup export", () => {
  it("uses the fixed backup format", () => expect(createBackup(source()).format).toBe("aprivity-focus-backup"));
  it("uses backup version 1", () => expect(createBackup(source()).version).toBe(1));
  it("writes a valid ISO exportedAt value", () => expect(createBackup(source(), new Date("2026-07-18T12:00:00Z")).exportedAt).toBe("2026-07-18T12:00:00.000Z"));
  it("includes the current application version", () => expect(createBackup(source()).app).toEqual({ name: "Aprivity Focus", version: "1.3.0" }));
  it("exports sessions", () => expect(createBackup(source()).data.sessions).toEqual(sessions));
  it("exports focus settings", () => expect(createBackup(source()).data.settings).toEqual(DEFAULT_SETTINGS));
  it("exports background settings", () => expect(createBackup(source()).data.backgroundSettings).toEqual(DEFAULT_BACKGROUND_SETTINGS));
  it("builds the session summary", () => expect(createBackup(source()).summary).toEqual({ sessionCount: 2, categoryCount: 2, completedCount: 1, stoppedCount: 1, firstSessionAt: 100, lastSessionAt: 400 }));
  it("uses the browser local date in the filename", () => expect(getBackupFileName(new Date(2026, 6, 18, 23, 59))).toBe("aprivity-focus-backup-2026-07-18.json"));
  it("does not include a timer data field", () => expect("timer" in createBackup(source()).data).toBe(false));
  it("does not serialize Blob data", () => expect(JSON.stringify(createBackup(source()))).not.toContain("data:image"));
  it("marks the image as metadata only", () => expect(createBackup(source()).assets.backgroundImage).toEqual({ included: false, exists: true, storageKey: "custom-background", mimeType: "image/webp", size: 1234 }));
  it("lists runtime and binary exclusions", () => expect(createBackup(source()).exclusions.join(" ")).toMatch(/计时状态.*背景图片/));
  it("still reads JSON data when IndexedDB metadata fails", async () => {
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(DEFAULT_SETTINGS));
    vi.spyOn(imageStorage, "getBackgroundImage").mockRejectedValue(new Error("blocked"));
    const result = await readLocalBackupSource();
    expect(result.sessions).toHaveLength(2);
    expect(result.backgroundImage.exists).toBeNull();
    expect(result.warnings).toHaveLength(1);
  });
});
