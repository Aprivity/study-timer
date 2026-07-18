import { beforeEach, describe, expect, it, vi } from "vitest";
import { BACKGROUND_STORAGE_KEY } from "@/lib/background-storage";
import { DEFAULT_BACKGROUND_SETTINGS } from "@/lib/background-presets";
import { DEFAULT_SETTINGS, parseSessions, parseSettings, STORAGE_KEYS } from "@/lib/storage";
import type { BackgroundSettings } from "@/types/background";
import type { FocusSession } from "@/types/focus-session";
import type { FocusSettings } from "@/types/settings";
import { PRE_IMPORT_BACKUP_KEY } from "./backup-schema";
import { executeImportPlan, hasActiveTimer, hasImportRecoveryPoint, undoLastImport } from "./backup-storage";
import { parseBackupText } from "./backup-validation";

function session(id: string, overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id,
    taskName: `任务 ${id}`,
    category: "其他",
    plannedSeconds: 1500,
    focusedSeconds: 900,
    startedAt: 100,
    endedAt: 200,
    status: "completed",
    mode: "free",
    ...overrides,
  };
}

const importedSettings: FocusSettings = {
  ...structuredClone(DEFAULT_SETTINGS),
  soundEnabled: false,
  defaultDurationMinutes: 60,
  timerMode: "pomodoro",
};

const importedBackground: BackgroundSettings = {
  ...structuredClone(DEFAULT_BACKGROUND_SETTINGS),
  presetId: "moss-mist",
};

function plan(sessions: FocusSession[] = [session("imported")], settings = importedSettings, backgroundSettings = importedBackground) {
  return parseBackupText(JSON.stringify({
    format: "aprivity-focus-backup",
    version: 1,
    exportedAt: "2026-07-18T12:00:00.000Z",
    app: { name: "Aprivity Focus", version: "1.3.0" },
    summary: {},
    data: { sessions, settings, backgroundSettings },
    assets: { backgroundImage: { included: false, exists: false, storageKey: null, mimeType: null, size: null } },
    exclusions: [],
  }));
}

function seed(sessions = [session("local")], settings: FocusSettings = DEFAULT_SETTINGS, background: BackgroundSettings = DEFAULT_BACKGROUND_SETTINGS) {
  localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  localStorage.setItem(BACKGROUND_STORAGE_KEY, JSON.stringify(background));
}

function options(overrides: Partial<Parameters<typeof executeImportPlan>[1]> = {}) {
  return { strategy: "merge" as const, applySettings: false, applyBackground: false, backgroundImageExists: false, ...overrides };
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  seed();
});

describe("backup import storage transaction", () => {
  it("merges new sessions while retaining current settings by default", () => {
    executeImportPlan(plan(), options());
    expect(parseSessions(localStorage.getItem(STORAGE_KEYS.sessions))).toHaveLength(2);
    expect(parseSettings(localStorage.getItem(STORAGE_KEYS.settings))).toEqual(DEFAULT_SETTINGS);
  });

  it("applies imported settings when explicitly selected", () => {
    executeImportPlan(plan(), options({ applySettings: true }));
    expect(parseSettings(localStorage.getItem(STORAGE_KEYS.settings))).toEqual(importedSettings);
  });

  it("applies imported background settings when explicitly selected", () => {
    executeImportPlan(plan(), options({ applyBackground: true }));
    expect(JSON.parse(localStorage.getItem(BACKGROUND_STORAGE_KEY) ?? "null")).toMatchObject({ presetId: "moss-mist" });
  });

  it("replace removes existing sessions and applies all imported settings", () => {
    const result = executeImportPlan(plan([session("replacement")]), options({ strategy: "replace" }));
    expect(parseSessions(localStorage.getItem(STORAGE_KEYS.sessions)).map(({ id }) => id)).toEqual(["replacement"]);
    expect(parseSettings(localStorage.getItem(STORAGE_KEYS.settings))).toEqual(importedSettings);
    expect(JSON.parse(localStorage.getItem(BACKGROUND_STORAGE_KEY) ?? "null")).toMatchObject({ presetId: "moss-mist" });
    expect(result).toMatchObject({ replacedCount: 1, addedCount: 1 });
  });

  it("creates exactly one recoverable pre-import snapshot", () => {
    expect(hasImportRecoveryPoint()).toBe(false);
    executeImportPlan(plan(), options());
    expect(hasImportRecoveryPoint()).toBe(true);
    expect(JSON.parse(localStorage.getItem(PRE_IMPORT_BACKUP_KEY) ?? "null")).toMatchObject({ format: "aprivity-focus-pre-import", version: 1 });
  });

  it("undo restores sessions, settings, and background", () => {
    executeImportPlan(plan(), options({ strategy: "replace" }));
    undoLastImport();
    expect(parseSessions(localStorage.getItem(STORAGE_KEYS.sessions)).map(({ id }) => id)).toEqual(["local"]);
    expect(parseSettings(localStorage.getItem(STORAGE_KEYS.settings))).toEqual(DEFAULT_SETTINGS);
    expect(JSON.parse(localStorage.getItem(BACKGROUND_STORAGE_KEY) ?? "null")).toEqual(DEFAULT_BACKGROUND_SETTINGS);
    expect(hasImportRecoveryPoint()).toBe(false);
  });

  it("reports a clear error when no recovery point exists", () => {
    expect(() => undoLastImport()).toThrow("没有可用的导入恢复点");
  });

  it("blocks importing while a running timer exists", () => {
    localStorage.setItem(STORAGE_KEYS.timer, JSON.stringify({ status: "running", totalSeconds: 60, remainingSeconds: 45 }));
    expect(hasActiveTimer()).toBe(true);
    expect(() => executeImportPlan(plan(), options())).toThrow("进行中的专注");
    expect(parseSessions(localStorage.getItem(STORAGE_KEYS.sessions))).toHaveLength(1);
  });

  it("blocks importing while a paused timer exists", () => {
    localStorage.setItem(STORAGE_KEYS.timer, JSON.stringify({ status: "paused", totalSeconds: 60, remainingSeconds: 45 }));
    expect(hasActiveTimer()).toBe(true);
  });

  it("does not treat completed or invalid timer data as active", () => {
    localStorage.setItem(STORAGE_KEYS.timer, JSON.stringify({ status: "completed", totalSeconds: 60, remainingSeconds: 0 }));
    expect(hasActiveTimer()).toBe(false);
    localStorage.setItem(STORAGE_KEYS.timer, "not-json");
    expect(hasActiveTimer()).toBe(false);
  });

  it("never changes the current timer key during import", () => {
    const timer = JSON.stringify({ status: "completed", totalSeconds: 60, remainingSeconds: 0 });
    localStorage.setItem(STORAGE_KEYS.timer, timer);
    executeImportPlan(plan(), options());
    expect(localStorage.getItem(STORAGE_KEYS.timer)).toBe(timer);
  });

  it("keeps current data for an ID conflict", () => {
    const result = executeImportPlan(plan([session("local", { taskName: "备份冲突" })]), options());
    expect(parseSessions(localStorage.getItem(STORAGE_KEYS.sessions))[0].taskName).toBe("任务 local");
    expect(result.conflictCount).toBe(1);
  });

  it("falls back from an imported image configuration without a local blob", () => {
    const image = { ...structuredClone(DEFAULT_BACKGROUND_SETTINGS), type: "image" as const, image: { ...DEFAULT_BACKGROUND_SETTINGS.image, storageKey: "custom-background" } };
    const result = executeImportPlan(plan([session("new")], importedSettings, image), options({ applyBackground: true, backgroundImageExists: false }));
    expect(JSON.parse(localStorage.getItem(BACKGROUND_STORAGE_KEY) ?? "null")).toEqual(DEFAULT_BACKGROUND_SETTINGS);
    expect(result.backgroundImageResult).toBe("needs-upload");
  });

  it("keeps an imported image configuration when the blob exists", () => {
    const image = { ...structuredClone(DEFAULT_BACKGROUND_SETTINGS), type: "image" as const, image: { ...DEFAULT_BACKGROUND_SETTINGS.image, storageKey: "custom-background" } };
    const result = executeImportPlan(plan([session("new")], importedSettings, image), options({ applyBackground: true, backgroundImageExists: true }));
    expect(JSON.parse(localStorage.getItem(BACKGROUND_STORAGE_KEY) ?? "null")).toMatchObject({ type: "image" });
    expect(result.backgroundImageResult).toBe("available");
  });

  it("overwrites the older recovery point before a later import", () => {
    executeImportPlan(plan([session("first")]), options());
    executeImportPlan(plan([session("second")]), options());
    undoLastImport();
    expect(parseSessions(localStorage.getItem(STORAGE_KEYS.sessions)).map(({ id }) => id).sort()).toEqual(["first", "local"]);
  });

  it("rolls back earlier writes when a later write fails", () => {
    const original = Storage.prototype.setItem;
    let failed = false;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (key: string, value: string) {
      if (key === STORAGE_KEYS.settings && !failed) {
        failed = true;
        throw new Error("quota");
      }
      return original.call(this, key, value);
    });
    expect(() => executeImportPlan(plan(), options({ applySettings: true }))).toThrow("已尝试恢复");
    expect(parseSessions(localStorage.getItem(STORAGE_KEYS.sessions)).map(({ id }) => id)).toEqual(["local"]);
    expect(parseSettings(localStorage.getItem(STORAGE_KEYS.settings))).toEqual(DEFAULT_SETTINGS);
  });
});
