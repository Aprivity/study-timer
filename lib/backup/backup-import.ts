import type { ImportPlan } from "@/types/backup";
import { MAX_BACKUP_FILE_BYTES } from "./backup-schema";
import { parseBackupText } from "./backup-validation";

export async function readBackupFile(file: File): Promise<ImportPlan> {
  if (file.size > MAX_BACKUP_FILE_BYTES) throw new Error("该备份文件过大，无法导入。最大支持 10MB。");
  if (file.size === 0) throw new Error("备份文件为空。");
  let text: string;
  try { text = await file.text(); }
  catch { throw new Error("无法读取所选文件，请重新选择。"); }
  return parseBackupText(text);
}
