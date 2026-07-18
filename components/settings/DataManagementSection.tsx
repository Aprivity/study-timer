"use client";

import { Download, FileJson, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { exportLocalBackup } from "@/lib/backup/backup-export";
import { readBackupFile } from "@/lib/backup/backup-import";
import { executeImportPlan, hasActiveTimer, hasImportRecoveryPoint, undoLastImport } from "@/lib/backup/backup-storage";
import { getBackgroundImage } from "@/lib/indexed-db";
import type { ImportPlan, ImportResult } from "@/types/backup";
import { BackupImportDialog, type ImportSelection } from "./BackupImportDialog";
import { DataConfirmDialog } from "./DataConfirmDialog";
import { ImportResultDialog } from "./ImportResultDialog";

type ConfirmMode = "replace" | "undo" | null;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "操作未完成，请稍后重试。";
}

export function DataManagementSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null);
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) setRecoveryAvailable(hasImportRecoveryPoint()); });
    return () => { active = false; };
  }, []);

  const clearFeedback = () => { setError(null); setStatus(null); };

  const exportData = async () => {
    clearFeedback(); setBusy(true);
    try {
      const exported = await exportLocalBackup();
      setLastExport(exported.fileName);
      setStatus(`备份已生成：${exported.fileName}${hasActiveTimer() ? "。当前活动计时未包含在备份中。" : "。"}`);
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  };

  const chooseFile = async (file: File | undefined) => {
    clearFeedback(); setPlan(null); setResult(null);
    if (!file) return;
    if (hasActiveTimer()) {
      setError("当前仍有进行中的专注，请先结束本次计时后再导入备份。");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setBusy(true);
    try {
      const nextPlan = await readBackupFile(file);
      setFileName(file.name.slice(0, 180));
      setPlan(nextPlan);
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const runImport = async (strategy: "merge" | "replace", selection: ImportSelection = { applySettings: false, applyBackground: false }) => {
    if (!plan) return;
    clearFeedback(); setBusy(true);
    try {
      let backgroundImageExists = false;
      try { backgroundImageExists = Boolean(await getBackgroundImage()); } catch { /* Missing IndexedDB must not delete or block JSON import. */ }
      const nextResult = executeImportPlan(plan, { strategy, ...selection, backgroundImageExists });
      setResult(nextResult);
      setPlan(null);
      setConfirmMode(null);
      setRecoveryAvailable(true);
      setStatus("数据已写入浏览器本地存储。可重新加载应用，或使用恢复点撤销本次导入。");
    } catch (error) { setError(errorMessage(error)); setConfirmMode(null); }
    finally { setBusy(false); }
  };

  const undoImport = () => {
    clearFeedback(); setBusy(true);
    try {
      undoLastImport();
      setRecoveryAvailable(false);
      setConfirmMode(null);
      setStatus("已恢复导入前的数据。重新加载后即可看到恢复结果。");
    } catch (error) { setError(errorMessage(error)); setConfirmMode(null); }
    finally { setBusy(false); }
  };

  return <section className="data-management-section" aria-labelledby="data-management-title" aria-busy={busy}>
    <div className="section-title-row"><div><p className="eyebrow">Data portability</p><h2 id="data-management-title">数据备份与迁移</h2><p>你的数据目前只保存在此浏览器中。建议定期导出 JSON 备份，避免清理站点数据后丢失。</p></div></div>
    <div className="data-management-grid">
      <article className="data-management-card">
        <span className="data-card-icon" aria-hidden="true"><Download /></span>
        <div><h3>导出本地数据</h3><p>将专注历史、用户与番茄设置、通知应用内开关和背景配置导出为 JSON。</p></div>
        <button type="button" className="primary-button" disabled={busy} onClick={() => void exportData()}><Download />导出数据</button>
        <small>运行中的计时、浏览器通知权限、自定义图片和音频二进制不会导出。</small>
      </article>
      <article className="data-management-card">
        <span className="data-card-icon" aria-hidden="true"><Upload /></span>
        <div><h3>导入已有备份</h3><p>先检查文件和数据预览，再选择安全合并或覆盖当前本地数据。</p></div>
        <label className={`secondary-button file-select-button${busy ? " disabled" : ""}`}>
          <FileJson />选择 JSON 文件
          <input ref={fileInputRef} type="file" accept=".json,application/json" disabled={busy} onChange={(event) => void chooseFile(event.target.files?.[0])} />
        </label>
        <small>最大 10MB。文件仅由当前浏览器读取，不会上传到 GitHub Pages 或服务器。</small>
      </article>
    </div>
    <div className="backup-local-info">
      <ShieldCheck aria-hidden="true" />
      <div><strong>请妥善保管备份文件</strong><p>JSON 可能包含任务名称和学习历史，不建议公开分享。第一版不包含自定义背景图片；迁移后可能需要重新上传。</p>{lastExport && <small>本页面最近导出：{lastExport}</small>}</div>
    </div>
    {recoveryAvailable && <div className="recovery-row"><div><strong>最近一次导入可以撤销</strong><p>仅恢复历史、设置和背景配置，不修改 IndexedDB 中的自定义图片。</p></div><button type="button" className="secondary-button" disabled={busy} onClick={() => setConfirmMode("undo")}><RotateCcw />撤销上次导入</button></div>}
    {error && <p className="data-feedback error" role="alert">{error}</p>}
    {status && <p className="data-feedback success" role="status">{status}</p>}
    <BackupImportDialog key={fileName} open={Boolean(plan)} plan={plan} fileName={fileName} busy={busy} onClose={() => setPlan(null)} onMerge={(selection) => void runImport("merge", selection)} onReplace={() => setConfirmMode("replace")} />
    <DataConfirmDialog
      open={confirmMode === "replace"}
      title="覆盖当前本地数据？"
      description="覆盖后，当前专注历史、用户设置和背景配置将被备份内容替换。自定义背景图片不会被删除，也不会自动恢复；执行前会创建恢复点。"
      confirmLabel="确认覆盖"
      busy={busy}
      onCancel={() => setConfirmMode(null)}
      onConfirm={() => void runImport("replace")}
    />
    <DataConfirmDialog
      open={confirmMode === "undo"}
      title="撤销最近一次导入？"
      description="将恢复导入前的专注历史、设置和背景配置，并删除这一个恢复点。IndexedDB 图片不会改变。"
      confirmLabel="确认撤销"
      busy={busy}
      onCancel={() => setConfirmMode(null)}
      onConfirm={undoImport}
    />
    <ImportResultDialog open={Boolean(result)} result={result} onClose={() => setResult(null)} onReload={() => window.location.reload()} />
  </section>;
}
