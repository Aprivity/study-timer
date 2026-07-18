"use client";

import { CheckCircle2, RotateCw, X } from "lucide-react";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import type { ImportResult } from "@/types/backup";

export function ImportResultDialog({ open, result, onClose, onReload }: { open: boolean; result: ImportResult | null; onClose: () => void; onReload: () => void }) {
  const dialogRef = useDialogFocus(open, onClose);
  if (!open || !result) return null;
  return <div className="dialog-backdrop" role="presentation">
    <div ref={dialogRef} className="dialog import-result-dialog" role="dialog" aria-modal="true" aria-labelledby="import-result-title" aria-describedby="import-result-description">
      <button type="button" className="dialog-close" onClick={onClose} aria-label="关闭导入结果"><X /></button>
      <CheckCircle2 className="result-icon" aria-hidden="true" />
      <p className="eyebrow">Import complete</p>
      <h2 id="import-result-title">数据导入完成</h2>
      <p id="import-result-description">恢复点已创建。重新加载后，首页、历史统计和设置将使用新数据。</p>
      <dl className="import-result-grid">
        <div><dt>新增记录</dt><dd>{result.addedCount} 条</dd></div>
        <div><dt>替换记录</dt><dd>{result.replacedCount} 条</dd></div>
        <div><dt>跳过重复</dt><dd>{result.duplicateCount} 条</dd></div>
        <div><dt>冲突记录</dt><dd>{result.conflictCount} 条</dd></div>
        <div><dt>无效记录</dt><dd>{result.invalidCount} 条</dd></div>
        <div><dt>用户设置</dt><dd>{result.settingsApplied ? "已应用" : "保持当前"}</dd></div>
        <div><dt>背景配置</dt><dd>{result.backgroundApplied ? "已应用" : "保持当前"}</dd></div>
        <div><dt>图片资源</dt><dd>{result.backgroundImageResult === "needs-upload" ? "需要重新上传" : result.backgroundImageResult === "available" ? "可继续使用" : "保持当前"}</dd></div>
      </dl>
      {result.warnings.length > 0 && <div className="backup-warning" role="status"><ul>{result.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></div>}
      <div className="dialog-actions"><button type="button" className="primary-button" onClick={onReload}><RotateCw />重新加载并应用</button><button type="button" className="secondary-button" onClick={onClose}>稍后</button></div>
    </div>
  </div>;
}
