"use client";

import { Database, FileJson, X } from "lucide-react";
import { useState } from "react";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import type { ImportPlan } from "@/types/backup";
import { BackupPreview } from "./BackupPreview";

export interface ImportSelection {
  applySettings: boolean;
  applyBackground: boolean;
}

export function BackupImportDialog({ open, plan, fileName, busy, onClose, onMerge, onReplace }: {
  open: boolean;
  plan: ImportPlan | null;
  fileName: string;
  busy: boolean;
  onClose: () => void;
  onMerge: (selection: ImportSelection) => void;
  onReplace: () => void;
}) {
  const [applySettings, setApplySettings] = useState(false);
  const [applyBackground, setApplyBackground] = useState(false);
  const dialogRef = useDialogFocus(open, onClose);
  if (!open || !plan) return null;
  return <div className="dialog-backdrop" role="presentation">
    <div ref={dialogRef} className="dialog backup-import-dialog" role="dialog" aria-modal="true" aria-labelledby="backup-preview-title" aria-describedby="backup-preview-description">
      <button type="button" className="dialog-close" onClick={onClose} disabled={busy} aria-label="关闭备份预览"><X /></button>
      <p className="eyebrow"><FileJson />Backup preview</p>
      <h2 id="backup-preview-title">备份文件预览</h2>
      <p id="backup-preview-description">文件已经完成校验；确认操作前不会修改任何本地数据。</p>
      <BackupPreview plan={plan} fileName={fileName} />
      <fieldset className="backup-merge-options">
        <legend>合并时的可选设置</legend>
        <label><input type="checkbox" checked={applySettings} onChange={(event) => setApplySettings(event.target.checked)} />同时应用备份中的用户和番茄设置</label>
        <label><input type="checkbox" checked={applyBackground} onChange={(event) => setApplyBackground(event.target.checked)} />同时应用备份中的背景配置</label>
      </fieldset>
      <div className="backup-strategy-copy">
        <p><strong>合并（推荐）</strong> 保留现有记录，通过 ID 加入新记录；默认保留当前设备设置。</p>
        <p><strong>覆盖</strong> 用备份替换历史、设置与背景，需要再次确认。</p>
      </div>
      <div className="dialog-actions backup-dialog-actions">
        <button type="button" className="primary-button" disabled={busy} onClick={() => onMerge({ applySettings, applyBackground })}><Database />合并现有数据</button>
        <button type="button" className="danger-button" disabled={busy} onClick={onReplace}>覆盖当前数据</button>
        <button type="button" className="secondary-button" disabled={busy} onClick={onClose}>取消</button>
      </div>
    </div>
  </div>;
}
