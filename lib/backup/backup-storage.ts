import { BACKGROUND_STORAGE_KEY, loadBackgroundSettings, validateBackgroundSettings } from "@/lib/background-storage";
import { parseSessions, parseSettings, parseTimer, STORAGE_KEYS, validateSessions, validateSettings } from "@/lib/storage";
import type { ImportOptions, ImportPlan, ImportResult, PreImportRecoveryPoint } from "@/types/backup";
import type { BackgroundSettings } from "@/types/background";
import type { FocusSession } from "@/types/focus-session";
import type { FocusSettings } from "@/types/settings";
import { PRE_IMPORT_BACKUP_KEY } from "./backup-schema";
import { mergeSessions, resolveImportedBackground } from "./backup-merge";

interface LocalSnapshot {
  sessions: FocusSession[];
  settings: FocusSettings;
  backgroundSettings: BackgroundSettings;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readSnapshot(): LocalSnapshot {
  return {
    sessions: parseSessions(window.localStorage.getItem(STORAGE_KEYS.sessions)),
    settings: parseSettings(window.localStorage.getItem(STORAGE_KEYS.settings)),
    backgroundSettings: loadBackgroundSettings(),
  };
}

function createRecoveryPoint(snapshot: LocalSnapshot): PreImportRecoveryPoint {
  return {
    format: "aprivity-focus-pre-import",
    version: 1,
    createdAt: new Date().toISOString(),
    data: snapshot,
  };
}

function writeAndVerify(key: string, value: unknown, verify: (raw: string | null) => boolean): void {
  window.localStorage.setItem(key, JSON.stringify(value));
  if (!verify(window.localStorage.getItem(key))) throw new Error("本地数据写入后校验失败。");
}

function writeSnapshot(snapshot: LocalSnapshot): void {
  writeAndVerify(STORAGE_KEYS.sessions, snapshot.sessions, (raw) => validateSessions(JSON.parse(raw ?? "null") as unknown).sessions.length === snapshot.sessions.length);
  writeAndVerify(STORAGE_KEYS.settings, snapshot.settings, (raw) => JSON.stringify(parseSettings(raw)) === JSON.stringify(snapshot.settings));
  writeAndVerify(BACKGROUND_STORAGE_KEY, snapshot.backgroundSettings, (raw) => {
    try { return JSON.stringify(validateBackgroundSettings(JSON.parse(raw ?? "null") as unknown)) === JSON.stringify(snapshot.backgroundSettings); }
    catch { return false; }
  });
}

function parseRecoveryPoint(raw: string | null): PreImportRecoveryPoint | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!record(value) || value.format !== "aprivity-focus-pre-import" || value.version !== 1 || !record(value.data)) return null;
    const sessionsValue = value.data.sessions;
    if (!Array.isArray(sessionsValue)) return null;
    const sessions = validateSessions(sessionsValue);
    if (sessions.invalidCount > 0 || sessions.sessions.length !== sessionsValue.length) return null;
    return {
      format: "aprivity-focus-pre-import",
      version: 1,
      createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date(0).toISOString(),
      data: {
        sessions: sessions.sessions,
        settings: validateSettings(value.data.settings),
        backgroundSettings: validateBackgroundSettings(value.data.backgroundSettings),
      },
    };
  } catch { return null; }
}

export function hasActiveTimer(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const timer = parseTimer(window.localStorage.getItem(STORAGE_KEYS.timer));
    return timer?.status === "running" || timer?.status === "paused";
  } catch { return false; }
}

export function hasImportRecoveryPoint(): boolean {
  if (typeof window === "undefined") return false;
  try { return parseRecoveryPoint(window.localStorage.getItem(PRE_IMPORT_BACKUP_KEY)) !== null; }
  catch { return false; }
}

export function executeImportPlan(plan: ImportPlan, options: ImportOptions): ImportResult {
  if (typeof window === "undefined") throw new Error("只能在浏览器中导入本地数据。");
  if (hasActiveTimer()) throw new Error("当前仍有进行中的专注，请先结束本次计时后再导入备份。");

  let current: LocalSnapshot;
  try { current = readSnapshot(); }
  catch { throw new Error("无法读取当前本地数据，导入已取消。"); }
  const recovery = createRecoveryPoint(current);
  try { window.localStorage.setItem(PRE_IMPORT_BACKUP_KEY, JSON.stringify(recovery)); }
  catch { throw new Error("无法创建导入前恢复点，现有数据未被修改。"); }

  const replacing = options.strategy === "replace";
  const merged = replacing
    ? { sessions: [...plan.validSessions].sort((a, b) => b.endedAt - a.endedAt), addedCount: 0, duplicateCount: 0, conflictCount: 0 }
    : mergeSessions(current.sessions, plan.validSessions);
  const shouldApplySettings = replacing || options.applySettings;
  const shouldApplyBackground = replacing || options.applyBackground;
  const resolvedBackground = shouldApplyBackground
    ? resolveImportedBackground(plan.backup.data.backgroundSettings, options.backgroundImageExists)
    : { settings: current.backgroundSettings, imageResult: "available" as const };
  const finalSnapshot: LocalSnapshot = {
    sessions: merged.sessions,
    settings: shouldApplySettings ? plan.backup.data.settings : current.settings,
    backgroundSettings: resolvedBackground.settings,
  };

  try {
    writeSnapshot(finalSnapshot);
  } catch {
    try { writeSnapshot(current); window.localStorage.removeItem(PRE_IMPORT_BACKUP_KEY); }
    catch { /* Keep the original error; recovery data remains available if rollback also fails. */ }
    throw new Error("导入写入失败，已尝试恢复原有数据。请检查浏览器存储空间。");
  }

  const warnings = [...plan.warnings];
  if (resolvedBackground.imageResult === "needs-upload") warnings.push("备份使用自定义图片背景，但当前浏览器没有图片，已回退到森林深夜；请重新上传图片。");
  window.dispatchEvent(new CustomEvent("aprivity-focus:data-imported"));
  return {
    strategy: options.strategy,
    addedCount: replacing ? plan.validSessions.length : merged.addedCount,
    replacedCount: replacing ? current.sessions.length : 0,
    duplicateCount: merged.duplicateCount,
    conflictCount: merged.conflictCount,
    invalidCount: plan.invalidSessionCount,
    settingsApplied: shouldApplySettings,
    backgroundApplied: shouldApplyBackground,
    backgroundImageResult: shouldApplyBackground ? resolvedBackground.imageResult : "unchanged",
    recoveryPointCreated: true,
    warnings,
  };
}

export function undoLastImport(): void {
  if (typeof window === "undefined") throw new Error("只能在浏览器中撤销导入。");
  let recovery: PreImportRecoveryPoint | null;
  try { recovery = parseRecoveryPoint(window.localStorage.getItem(PRE_IMPORT_BACKUP_KEY)); }
  catch { recovery = null; }
  if (!recovery) throw new Error("没有可用的导入恢复点。");
  try {
    writeSnapshot(recovery.data);
    window.localStorage.removeItem(PRE_IMPORT_BACKUP_KEY);
    window.dispatchEvent(new CustomEvent("aprivity-focus:data-imported"));
  } catch {
    throw new Error("撤销导入失败，恢复点仍然保留，请检查浏览器存储权限。");
  }
}
