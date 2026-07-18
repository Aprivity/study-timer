import packageJson from "@/package.json";
import { loadBackgroundSettings } from "@/lib/background-storage";
import { getBackgroundImage, BACKGROUND_IMAGE_KEY } from "@/lib/indexed-db";
import { getLocalDateKey } from "@/lib/local-date";
import { parseSessions, parseSettings, STORAGE_KEYS } from "@/lib/storage";
import type { AprivityFocusBackup, BackupAssetMetadata } from "@/types/backup";
import type { BackgroundSettings } from "@/types/background";
import type { FocusSession } from "@/types/focus-session";
import type { FocusSettings } from "@/types/settings";
import { BACKUP_EXCLUSIONS, BACKUP_FORMAT, createBackupSummary, CURRENT_BACKUP_VERSION } from "./backup-schema";

export interface BackupSourceData {
  sessions: FocusSession[];
  settings: FocusSettings;
  backgroundSettings: BackgroundSettings;
  backgroundImage: BackupAssetMetadata;
  warnings?: string[];
}

export function createBackup(source: BackupSourceData, exportedAt = new Date()): AprivityFocusBackup {
  return {
    format: BACKUP_FORMAT,
    version: CURRENT_BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    app: { name: "Aprivity Focus", version: packageJson.version },
    summary: createBackupSummary(source.sessions),
    data: {
      sessions: source.sessions,
      settings: source.settings,
      backgroundSettings: source.backgroundSettings,
      customCategories: [],
      customTimePresets: [],
    },
    assets: { backgroundImage: source.backgroundImage },
    exclusions: [...BACKUP_EXCLUSIONS],
    warnings: source.warnings?.length ? source.warnings : undefined,
  };
}

export function getBackupFileName(date = new Date()): string {
  return `aprivity-focus-backup-${getLocalDateKey(date)}.json`;
}

export async function readLocalBackupSource(): Promise<BackupSourceData> {
  if (typeof window === "undefined") throw new Error("只能在浏览器中导出本地数据。");
  let sessions: FocusSession[];
  let settings: FocusSettings;
  let backgroundSettings: BackgroundSettings;
  try {
    sessions = parseSessions(window.localStorage.getItem(STORAGE_KEYS.sessions));
    settings = parseSettings(window.localStorage.getItem(STORAGE_KEYS.settings));
    backgroundSettings = loadBackgroundSettings();
  } catch {
    throw new Error("无法读取浏览器本地数据，请检查网站存储权限。");
  }

  let backgroundImage: BackupAssetMetadata;
  const warnings: string[] = [];
  try {
    const blob = await getBackgroundImage();
    backgroundImage = {
      included: false,
      exists: Boolean(blob),
      storageKey: blob ? BACKGROUND_IMAGE_KEY : null,
      mimeType: blob?.type || null,
      size: blob?.size ?? null,
    };
  } catch {
    backgroundImage = { included: false, exists: null, storageKey: null, mimeType: null, size: null };
    warnings.push("无法读取自定义背景图片元数据；其余 JSON 数据仍已正常导出。");
  }
  return { sessions, settings, backgroundSettings, backgroundImage, warnings };
}

export async function exportLocalBackup(now = new Date()): Promise<{ backup: AprivityFocusBackup; fileName: string }> {
  const backup = createBackup(await readLocalBackupSource(), now);
  const fileName = getBackupFileName(now);
  let url: string | null = null;
  try {
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
    url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch {
    throw new Error("浏览器未能创建备份下载，请检查下载权限后重试。");
  } finally {
    const downloadUrl = url;
    if (downloadUrl) window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
  }
  return { backup, fileName };
}
