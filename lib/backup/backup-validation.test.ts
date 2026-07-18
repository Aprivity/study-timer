import { describe, expect, it } from "vitest";
import { DEFAULT_BACKGROUND_SETTINGS } from "@/lib/background-presets";
import { DEFAULT_SETTINGS } from "@/lib/storage";
import { MAX_BACKUP_FILE_BYTES, MAX_BACKUP_SESSIONS } from "./backup-schema";
import { readBackupFile } from "./backup-import";
import { parseBackupText } from "./backup-validation";

function session(overrides: Record<string, unknown> = {}) {
  return { id: "session-1", taskName: "数学", category: "数学", plannedSeconds: 1500, focusedSeconds: 1500, startedAt: 100, endedAt: 200, status: "completed", mode: "free", ...overrides };
}

function backup(overrides: Record<string, unknown> = {}) {
  return {
    format: "aprivity-focus-backup", version: 1, exportedAt: "2026-07-18T12:00:00.000Z",
    app: { name: "Aprivity Focus", version: "1.3.0" }, summary: {},
    data: { sessions: [session()], settings: DEFAULT_SETTINGS, backgroundSettings: DEFAULT_BACKGROUND_SETTINGS },
    assets: { backgroundImage: { included: false, exists: false, storageKey: null, mimeType: null, size: null } }, exclusions: [], ...overrides,
  };
}

describe("backup validation", () => {
  it("accepts a valid v1 backup", () => expect(parseBackupText(JSON.stringify(backup())).validSessions).toHaveLength(1));
  it("rejects non JSON text", () => expect(() => parseBackupText("not json")).toThrow("JSON 内容无法解析"));
  it("rejects an empty file", () => expect(() => parseBackupText("  ")).toThrow("备份文件为空"));
  it("rejects the wrong format", () => expect(() => parseBackupText(JSON.stringify(backup({ format: "other" })))).toThrow("不是 Aprivity Focus"));
  it("rejects a higher backup version", () => expect(() => parseBackupText(JSON.stringify(backup({ version: 2 })))).toThrow("最高支持 v1"));
  it("rejects versions below one", () => expect(() => parseBackupText(JSON.stringify(backup({ version: 0 })))).toThrow("版本无效"));
  it("rejects sessions that are not an array", () => expect(() => parseBackupText(JSON.stringify(backup({ data: { sessions: {}, settings: DEFAULT_SETTINGS, backgroundSettings: DEFAULT_BACKGROUND_SETTINGS } })))).toThrow("不是有效数组"));
  it("skips invalid sessions", () => {
    const value = backup({ data: { sessions: [session(), { broken: true }], settings: DEFAULT_SETTINGS, backgroundSettings: DEFAULT_BACKGROUND_SETTINGS } });
    expect(parseBackupText(JSON.stringify(value)).summary).toMatchObject({ validSessionCount: 1, invalidSessionCount: 1 });
  });
  it("keeps valid session fields", () => expect(parseBackupText(JSON.stringify(backup())).validSessions[0]).toMatchObject({ id: "session-1", category: "数学" }));
  it("rejects negative focused seconds", () => {
    const value = backup({ data: { sessions: [session({ focusedSeconds: -1 })], settings: DEFAULT_SETTINGS, backgroundSettings: DEFAULT_BACKGROUND_SETTINGS } });
    expect(parseBackupText(JSON.stringify(value)).summary.invalidSessionCount).toBe(1);
  });
  it("falls back when settings are incomplete", () => {
    const value = backup({ data: { sessions: [session()], settings: { soundEnabled: false }, backgroundSettings: DEFAULT_BACKGROUND_SETTINGS } });
    expect(parseBackupText(JSON.stringify(value)).backup.data.settings).toEqual(DEFAULT_SETTINGS);
  });
  it("falls back when background settings are invalid", () => {
    const value = backup({ data: { sessions: [session()], settings: DEFAULT_SETTINGS, backgroundSettings: { type: "video" } } });
    expect(parseBackupText(JSON.stringify(value)).backup.data.backgroundSettings).toEqual(DEFAULT_BACKGROUND_SETTINGS);
  });
  it("ignores and reports unknown fields", () => {
    const plan = parseBackupText(JSON.stringify(backup({ dangerous: true })));
    expect(plan.unknownFields).toContain("顶层字段：dangerous");
    expect("dangerous" in plan.backup).toBe(false);
  });
  it("does not apply prototype pollution fields", () => {
    const text = JSON.stringify(backup()).replace('"format"', '"__proto__":{"polluted":true},"format"');
    parseBackupText(text);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });
  it("deduplicates IDs inside one backup", () => {
    const value = backup({ data: { sessions: [session(), session()], settings: DEFAULT_SETTINGS, backgroundSettings: DEFAULT_BACKGROUND_SETTINGS } });
    expect(parseBackupText(JSON.stringify(value)).summary).toMatchObject({ validSessionCount: 1, invalidSessionCount: 1 });
  });
  it("rejects more than the allowed session count", () => {
    const sessions = Array.from({ length: MAX_BACKUP_SESSIONS + 1 }, (_, index) => session({ id: `s-${index}` }));
    const value = backup({ data: { sessions, settings: DEFAULT_SETTINGS, backgroundSettings: DEFAULT_BACKGROUND_SETTINGS } });
    expect(() => parseBackupText(JSON.stringify(value))).toThrow("记录超过");
  });
  it("rejects invalid export timestamps", () => expect(() => parseBackupText(JSON.stringify(backup({ exportedAt: "never" })))).toThrow("导出时间无效"));
  it("warns when the application version is missing", () => expect(parseBackupText(JSON.stringify(backup({ app: {} }))).warnings.join(" ")).toContain("应用版本"));
  it("rejects files larger than 10MB before parsing", async () => {
    const file = new File(["{}"], "large.json", { type: "application/json" });
    Object.defineProperty(file, "size", { value: MAX_BACKUP_FILE_BYTES + 1 });
    await expect(readBackupFile(file)).rejects.toThrow("文件过大");
  });
  it("does not trust a non-json MIME type when content is valid", async () => {
    const content = JSON.stringify(backup());
    const file = new File([content], "backup.txt", { type: "text/plain" });
    Object.defineProperty(file, "text", { value: async () => content });
    await expect(readBackupFile(file)).resolves.toMatchObject({ summary: { validSessionCount: 1 } });
  });
});
