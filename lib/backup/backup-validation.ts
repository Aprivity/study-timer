import { DEFAULT_BACKGROUND_SETTINGS } from "@/lib/background-presets";
import { validateBackgroundSettings } from "@/lib/background-storage";
import { DEFAULT_SETTINGS, validateSessions, validateSettings } from "@/lib/storage";
import type { AprivityFocusBackup, BackupAssetMetadata, ImportPlan } from "@/types/backup";
import type { BackgroundSettings } from "@/types/background";
import type { FocusSettings } from "@/types/settings";
import { BACKUP_EXCLUSIONS, BACKUP_FORMAT, createBackupSummary, CURRENT_BACKUP_VERSION, MAX_BACKUP_SESSIONS } from "./backup-schema";

const TOP_LEVEL_FIELDS = new Set(["format", "version", "exportedAt", "app", "summary", "data", "assets", "exclusions", "warnings"]);
const DATA_FIELDS = new Set(["sessions", "settings", "backgroundSettings", "customCategories", "customTimePresets", "customThemes"]);
const BACKGROUND_TYPES = new Set(["preset", "solid", "gradient", "image"]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function own(value: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined;
}

function safeStrings(value: unknown, maxItems = 20, maxLength = 240): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).filter((item): item is string => typeof item === "string").map((item) => item.slice(0, maxLength));
}

function settingsInputIsComplete(value: unknown): boolean {
  if (!record(value) || !record(own(value, "pomodoro"))) return false;
  return typeof own(value, "soundEnabled") === "boolean" &&
    typeof own(value, "notificationsEnabled") === "boolean" &&
    typeof own(value, "defaultDurationMinutes") === "number" &&
    typeof own(value, "confirmEndEnabled") === "boolean" &&
    typeof own(value, "autoFullscreen") === "boolean" &&
    typeof own(value, "reduceMotion") === "boolean" &&
    (own(value, "timerMode") === "free" || own(value, "timerMode") === "pomodoro");
}

function backgroundInputIsRecognized(value: unknown): boolean {
  if (!record(value)) return false;
  return own(value, "version") === 1 && typeof own(value, "type") === "string" && BACKGROUND_TYPES.has(own(value, "type") as string);
}

function parseAssetMetadata(value: unknown): BackupAssetMetadata {
  if (!record(value)) return { included: false, exists: null, storageKey: null, mimeType: null, size: null };
  const exists = typeof own(value, "exists") === "boolean" ? own(value, "exists") as boolean : null;
  const storageKey = typeof own(value, "storageKey") === "string" ? (own(value, "storageKey") as string).slice(0, 80) : null;
  const mimeType = typeof own(value, "mimeType") === "string" ? (own(value, "mimeType") as string).slice(0, 100) : null;
  const sizeValue = own(value, "size");
  const size = typeof sizeValue === "number" && Number.isFinite(sizeValue) && sizeValue >= 0 ? Math.round(sizeValue) : null;
  return { included: false, exists, storageKey, mimeType, size };
}

function unknownFields(value: Record<string, unknown>, allowed: Set<string>, prefix: string): string[] {
  return Object.keys(value).filter((key) => !allowed.has(key)).slice(0, 30).map((key) => `${prefix}${key}`);
}

export function migrateBackup(value: unknown): ImportPlan {
  if (!record(value)) throw new Error("备份文件的顶层结构无效。");
  if (own(value, "format") !== BACKUP_FORMAT) throw new Error("这不是 Aprivity Focus 备份文件。");
  const version = own(value, "version");
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) throw new Error("备份格式版本无效。");
  if (version > CURRENT_BACKUP_VERSION) throw new Error(`该备份使用 v${version} 格式，当前版本最高支持 v${CURRENT_BACKUP_VERSION}。`);
  if (version !== CURRENT_BACKUP_VERSION) throw new Error(`当前暂不支持 v${version} 备份格式。`);

  const data = own(value, "data");
  if (!record(data)) throw new Error("备份文件缺少数据主体。");
  const sessionInput = own(data, "sessions");
  if (!Array.isArray(sessionInput)) throw new Error("备份中的专注记录不是有效数组。");
  if (sessionInput.length > MAX_BACKUP_SESSIONS) throw new Error(`备份记录超过 ${MAX_BACKUP_SESSIONS.toLocaleString("zh-CN")} 条，无法安全导入。`);

  const validated = validateSessions(sessionInput);
  const uniqueSessions = [] as typeof validated.sessions;
  const seen = new Set<string>();
  let duplicateInFile = 0;
  for (const session of validated.sessions) {
    if (seen.has(session.id)) { duplicateInFile += 1; continue; }
    seen.add(session.id);
    uniqueSessions.push(session);
  }

  const warnings = safeStrings(own(value, "warnings"));
  const unknown = [...unknownFields(value, TOP_LEVEL_FIELDS, "顶层字段："), ...unknownFields(data, DATA_FIELDS, "数据字段：")];
  if (unknown.length) warnings.push(`发现 ${unknown.length} 个未知字段，已安全忽略。`);
  if (duplicateInFile) warnings.push(`备份内有 ${duplicateInFile} 条重复 ID 记录，已保留第一条。`);

  const settingsInput = own(data, "settings");
  const settingsPresent = record(settingsInput);
  const settingsValid = settingsInputIsComplete(settingsInput);
  const settings: FocusSettings = settingsValid ? validateSettings(settingsInput) : structuredClone(DEFAULT_SETTINGS);
  if (!settingsValid) warnings.push("用户设置缺失或不完整，将使用安全默认值。");

  const backgroundInput = own(data, "backgroundSettings");
  const backgroundSettingsPresent = record(backgroundInput);
  const backgroundValid = backgroundInputIsRecognized(backgroundInput);
  const backgroundSettings: BackgroundSettings = backgroundValid
    ? validateBackgroundSettings(backgroundInput)
    : structuredClone(DEFAULT_BACKGROUND_SETTINGS);
  if (!backgroundValid) warnings.push("背景配置缺失或无效，将使用森林深夜默认背景。");

  const exportedAtInput = own(value, "exportedAt");
  if (typeof exportedAtInput !== "string" || !Number.isFinite(Date.parse(exportedAtInput))) throw new Error("备份导出时间无效。");
  const appInput = own(value, "app");
  const appVersion = record(appInput) && typeof own(appInput, "version") === "string"
    ? (own(appInput, "version") as string).slice(0, 40)
    : "未知";
  if (appVersion === "未知") warnings.push("备份未提供可识别的应用版本。");

  const assetsInput = own(value, "assets");
  const backgroundAsset = record(assetsInput) ? parseAssetMetadata(own(assetsInput, "backgroundImage")) : parseAssetMetadata(null);
  const summary = createBackupSummary(uniqueSessions);
  const invalidSessionCount = validated.invalidCount + duplicateInFile;
  const backup: AprivityFocusBackup = {
    format: BACKUP_FORMAT,
    version: CURRENT_BACKUP_VERSION,
    exportedAt: new Date(exportedAtInput).toISOString(),
    app: { name: "Aprivity Focus", version: appVersion },
    summary,
    data: {
      sessions: uniqueSessions,
      settings,
      backgroundSettings,
      customCategories: safeStrings(own(data, "customCategories"), 100, 60),
      customTimePresets: [],
    },
    assets: { backgroundImage: backgroundAsset },
    exclusions: safeStrings(own(value, "exclusions")).length ? safeStrings(own(value, "exclusions")) : [...BACKUP_EXCLUSIONS],
    warnings: warnings.length ? warnings : undefined,
  };

  return {
    backup,
    validSessions: uniqueSessions,
    invalidSessionCount,
    warnings,
    unknownFields: unknown,
    summary: {
      ...summary,
      originalSessionCount: sessionInput.length,
      validSessionCount: uniqueSessions.length,
      invalidSessionCount,
      settingsPresent,
      pomodoroSettingsPresent: record(settingsInput) && record(own(settingsInput, "pomodoro")),
      backgroundSettingsPresent,
      backgroundType: backgroundSettings.type,
    },
  };
}

export function parseBackupText(text: string): ImportPlan {
  if (!text.trim()) throw new Error("备份文件为空。");
  let value: unknown;
  try { value = JSON.parse(text) as unknown; }
  catch { throw new Error("JSON 内容无法解析，请确认文件没有损坏。"); }
  return migrateBackup(value);
}
