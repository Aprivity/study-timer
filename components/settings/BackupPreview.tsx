import { getBackgroundPreset } from "@/lib/background-presets";
import type { ImportPlan } from "@/types/backup";

function dateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function dateRange(value: number | null): string {
  return value === null ? "暂无" : new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(value));
}

function backgroundLabel(plan: ImportPlan): string {
  const settings = plan.backup.data.backgroundSettings;
  if (settings.type === "preset") return getBackgroundPreset(settings.presetId).name;
  return settings.type === "solid" ? "自定义纯色" : settings.type === "gradient" ? "自定义渐变" : "自定义图片";
}

export function BackupPreview({ plan, fileName }: { plan: ImportPlan; fileName: string }) {
  const summary = plan.summary;
  return <div className="backup-preview">
    <dl className="backup-preview-grid">
      <div><dt>文件名</dt><dd>{fileName}</dd></div>
      <div><dt>导出时间</dt><dd>{dateTime(plan.backup.exportedAt)}</dd></div>
      <div><dt>应用版本</dt><dd>{plan.backup.app.version}</dd></div>
      <div><dt>备份格式</dt><dd>v{plan.backup.version}</dd></div>
      <div><dt>专注记录</dt><dd>{summary.originalSessionCount} 条</dd></div>
      <div><dt>有效 / 无效</dt><dd>{summary.validSessionCount} / {summary.invalidSessionCount}</dd></div>
      <div><dt>正常完成</dt><dd>{summary.completedCount} 条</dd></div>
      <div><dt>提前结束</dt><dd>{summary.stoppedCount} 条</dd></div>
      <div><dt>涉及分类</dt><dd>{summary.categoryCount} 个</dd></div>
      <div><dt>日期范围</dt><dd>{dateRange(summary.firstSessionAt)}—{dateRange(summary.lastSessionAt)}</dd></div>
      <div><dt>用户 / 番茄设置</dt><dd>{summary.settingsPresent ? "存在" : "缺失"} / {summary.pomodoroSettingsPresent ? "存在" : "缺失"}</dd></div>
      <div><dt>背景配置</dt><dd>{summary.backgroundSettingsPresent ? backgroundLabel(plan) : "缺失"}</dd></div>
      <div><dt>自定义背景图片</dt><dd>{plan.backup.assets.backgroundImage.exists === true ? "原设备存在，但未包含" : plan.backup.assets.backgroundImage.exists === false ? "原设备无图片" : "状态未知"}</dd></div>
    </dl>
    {(plan.warnings.length > 0 || plan.unknownFields.length > 0) && <div className="backup-warning" role="status" aria-label="兼容性警告">
      <strong>兼容性提示</strong>
      <ul>{plan.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul>
    </div>}
  </div>;
}
