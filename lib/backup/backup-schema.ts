import type { BackupSummary } from "@/types/backup";
import type { FocusSession } from "@/types/focus-session";

export const BACKUP_FORMAT = "aprivity-focus-backup" as const;
export const CURRENT_BACKUP_VERSION = 1 as const;
export const MAX_BACKUP_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_BACKUP_SESSIONS = 50_000;
export const PRE_IMPORT_BACKUP_KEY = "aprivity-focus:pre-import-backup";

export const BACKUP_EXCLUSIONS = [
  "当前运行或暂停中的计时状态",
  "自定义背景图片二进制内容",
  "自定义音频二进制内容",
  "浏览器通知权限",
  "Object URL 与浏览器全屏状态",
] as const;

export function createBackupSummary(sessions: FocusSession[]): BackupSummary {
  let completedCount = 0;
  let stoppedCount = 0;
  let firstSessionAt: number | null = null;
  let lastSessionAt: number | null = null;
  const categories = new Set<string>();
  for (const session of sessions) {
    categories.add(session.category);
    if (session.status === "completed") completedCount += 1;
    else stoppedCount += 1;
    firstSessionAt = firstSessionAt === null ? session.startedAt : Math.min(firstSessionAt, session.startedAt);
    lastSessionAt = lastSessionAt === null ? session.endedAt : Math.max(lastSessionAt, session.endedAt);
  }
  return {
    sessionCount: sessions.length,
    categoryCount: categories.size,
    completedCount,
    stoppedCount,
    firstSessionAt,
    lastSessionAt,
  };
}
