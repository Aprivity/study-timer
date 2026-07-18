import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_BACKGROUND_SETTINGS } from "@/lib/background-presets";
import { DEFAULT_SETTINGS } from "@/lib/storage";
import { parseBackupText } from "@/lib/backup/backup-validation";
import type { ImportResult } from "@/types/backup";
import { BackupImportDialog } from "./BackupImportDialog";
import { DataConfirmDialog } from "./DataConfirmDialog";
import { ImportResultDialog } from "./ImportResultDialog";

function plan() {
  return parseBackupText(JSON.stringify({
    format: "aprivity-focus-backup",
    version: 1,
    exportedAt: "2026-07-18T12:00:00.000Z",
    app: { name: "Aprivity Focus", version: "1.3.0" },
    summary: {},
    data: {
      sessions: [{ id: "one", taskName: "阅读", category: "阅读", plannedSeconds: 1500, focusedSeconds: 1200, startedAt: 100, endedAt: 200, status: "completed", mode: "free" }],
      settings: DEFAULT_SETTINGS,
      backgroundSettings: DEFAULT_BACKGROUND_SETTINGS,
    },
    assets: { backgroundImage: { included: false, exists: false, storageKey: null, mimeType: null, size: null } },
    exclusions: [],
  }));
}

describe("backup dialogs", () => {
  it("shows validated backup information before any import action", () => {
    render(<BackupImportDialog open plan={plan()} fileName="backup.json" busy={false} onClose={vi.fn()} onMerge={vi.fn()} onReplace={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "备份文件预览" })).toBeInTheDocument();
    expect(screen.getByText("backup.json")).toBeInTheDocument();
    expect(screen.getAllByText("1 条")).toHaveLength(2);
  });

  it("merges with current settings retained by default", () => {
    const onMerge = vi.fn();
    render(<BackupImportDialog open plan={plan()} fileName="backup.json" busy={false} onClose={vi.fn()} onMerge={onMerge} onReplace={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /合并现有数据/ }));
    expect(onMerge).toHaveBeenCalledWith({ applySettings: false, applyBackground: false });
  });

  it("passes explicitly selected settings and background choices", () => {
    const onMerge = vi.fn();
    render(<BackupImportDialog open plan={plan()} fileName="backup.json" busy={false} onClose={vi.fn()} onMerge={onMerge} onReplace={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/同时应用备份中的用户/));
    fireEvent.click(screen.getByLabelText(/同时应用备份中的背景/));
    fireEvent.click(screen.getByRole("button", { name: /合并现有数据/ }));
    expect(onMerge).toHaveBeenCalledWith({ applySettings: true, applyBackground: true });
  });

  it("routes replace and cancel through separate actions", () => {
    const onReplace = vi.fn();
    const onClose = vi.fn();
    render(<BackupImportDialog open plan={plan()} fileName="backup.json" busy={false} onClose={onClose} onMerge={vi.fn()} onReplace={onReplace} />);
    fireEvent.click(screen.getByRole("button", { name: "覆盖当前数据" }));
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(onReplace).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("requires an explicit second confirmation for destructive replacement", () => {
    const onConfirm = vi.fn();
    render(<DataConfirmDialog open title="覆盖当前本地数据？" description="数据会被替换" confirmLabel="确认覆盖" busy={false} onCancel={vi.fn()} onConfirm={onConfirm} />);
    expect(screen.getByRole("alertdialog", { name: "覆盖当前本地数据？" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "确认覆盖" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("disables confirmation actions while a transaction is busy", () => {
    render(<DataConfirmDialog open title="撤销最近一次导入？" description="恢复数据" confirmLabel="确认撤销" busy onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole("button", { name: "确认撤销" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "取消" })).toBeDisabled();
  });

  it("reports counts, setting state, and missing image recovery", () => {
    const result: ImportResult = {
      strategy: "merge", addedCount: 2, replacedCount: 0, duplicateCount: 1, conflictCount: 1, invalidCount: 3,
      settingsApplied: false, backgroundApplied: true, backgroundImageResult: "needs-upload", recoveryPointCreated: true, warnings: ["请重新上传图片。"],
    };
    render(<ImportResultDialog open result={result} onClose={vi.fn()} onReload={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "数据导入完成" })).toBeInTheDocument();
    expect(screen.getByText("需要重新上传")).toBeInTheDocument();
    expect(screen.getByText("请重新上传图片。")).toBeInTheDocument();
    expect(screen.getByText("3 条")).toBeInTheDocument();
  });

  it("supports postponing reload after a successful import", () => {
    const onClose = vi.fn();
    const result: ImportResult = {
      strategy: "replace", addedCount: 1, replacedCount: 2, duplicateCount: 0, conflictCount: 0, invalidCount: 0,
      settingsApplied: true, backgroundApplied: true, backgroundImageResult: "available", recoveryPointCreated: true, warnings: [],
    };
    render(<ImportResultDialog open result={result} onClose={onClose} onReload={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "稍后" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
