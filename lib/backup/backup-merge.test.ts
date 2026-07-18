import { describe, expect, it } from "vitest";
import { DEFAULT_BACKGROUND_SETTINGS } from "@/lib/background-presets";
import type { BackgroundSettings } from "@/types/background";
import type { FocusSession } from "@/types/focus-session";
import { mergeSessions, resolveImportedBackground } from "./backup-merge";

function session(id: string, overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id,
    taskName: `任务 ${id}`,
    category: "其他",
    plannedSeconds: 1500,
    focusedSeconds: 1200,
    startedAt: 100,
    endedAt: 200,
    status: "completed",
    mode: "free",
    ...overrides,
  };
}

function imageBackground(): BackgroundSettings {
  return {
    ...structuredClone(DEFAULT_BACKGROUND_SETTINGS),
    type: "image",
    image: { ...DEFAULT_BACKGROUND_SETTINGS.image, storageKey: "custom-background" },
  };
}

describe("backup session merge", () => {
  it("adds a session with a new ID", () => {
    const result = mergeSessions([session("local")], [session("imported")]);
    expect(result.addedCount).toBe(1);
    expect(result.sessions.map(({ id }) => id)).toEqual(["local", "imported"]);
  });

  it("skips an identical session", () => {
    const item = session("same");
    const result = mergeSessions([item], [structuredClone(item)]);
    expect(result).toMatchObject({ addedCount: 0, duplicateCount: 1, conflictCount: 0 });
  });

  it("keeps the local session when the same ID conflicts", () => {
    const local = session("same", { taskName: "本地任务" });
    const result = mergeSessions([local], [session("same", { taskName: "备份任务" })]);
    expect(result.conflictCount).toBe(1);
    expect(result.sessions[0].taskName).toBe("本地任务");
  });

  it("reports duplicate, conflict, and new counts independently", () => {
    const same = session("same");
    const result = mergeSessions([same, session("conflict")], [same, session("conflict", { focusedSeconds: 10 }), session("new")]);
    expect(result).toMatchObject({ addedCount: 1, duplicateCount: 1, conflictCount: 1 });
  });

  it("sorts the merged records by newest end time", () => {
    const result = mergeSessions([session("old", { endedAt: 200 })], [session("new", { endedAt: 500 })]);
    expect(result.sessions.map(({ id }) => id)).toEqual(["new", "old"]);
  });

  it("does not mutate either input array", () => {
    const current = [session("current")];
    const incoming = [session("incoming")];
    mergeSessions(current, incoming);
    expect(current.map(({ id }) => id)).toEqual(["current"]);
    expect(incoming.map(({ id }) => id)).toEqual(["incoming"]);
  });

  it("preserves an unknown but valid category label", () => {
    const result = mergeSessions([], [session("custom", { category: "生物化学" })]);
    expect(result.sessions[0].category).toBe("生物化学");
  });

  it("handles an empty import without changing records", () => {
    expect(mergeSessions([session("local")], [])).toMatchObject({ addedCount: 0, duplicateCount: 0, conflictCount: 0 });
  });
});

describe("imported background resolution", () => {
  it("keeps a custom image configuration when its IndexedDB blob exists", () => {
    expect(resolveImportedBackground(imageBackground(), true)).toMatchObject({ imageResult: "available", settings: { type: "image" } });
  });

  it("falls back when a custom image blob is absent", () => {
    expect(resolveImportedBackground(imageBackground(), false)).toEqual({ settings: DEFAULT_BACKGROUND_SETTINGS, imageResult: "needs-upload" });
  });

  it("keeps non-image settings without requiring a blob", () => {
    expect(resolveImportedBackground(DEFAULT_BACKGROUND_SETTINGS, false)).toEqual({ settings: DEFAULT_BACKGROUND_SETTINGS, imageResult: "available" });
  });

  it("returns a cloned fallback that cannot mutate defaults", () => {
    const resolved = resolveImportedBackground(imageBackground(), false);
    resolved.settings.gradient.startColor = "#ffffff";
    expect(DEFAULT_BACKGROUND_SETTINGS.gradient.startColor).not.toBe("#ffffff");
  });
});
