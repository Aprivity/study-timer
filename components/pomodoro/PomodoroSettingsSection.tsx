"use client";

import { Coffee, Focus, RotateCcw, TimerReset } from "lucide-react";
import { DEFAULT_POMODORO_SETTINGS } from "@/lib/pomodoro";
import type { PomodoroSettings } from "@/types/pomodoro";

function NumberSetting({ label, description, value, min, max, unit, onChange }: { label: string; description: string; value: number; min: number; max: number; unit: string; onChange: (value: number) => void }) {
  return <label className="pomodoro-setting-row"><span><strong>{label}</strong><small>{description}</small></span><span className="number-setting"><input type="number" value={value} min={min} max={max} onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value) || min)))} /><em>{unit}</em></span></label>;
}

function AutoStartSetting({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: () => void }) {
  return <div className="pomodoro-setting-row"><span><strong>{label}</strong><small>{description}</small></span><button type="button" role="switch" aria-label={label} aria-checked={checked} className={`switch ${checked ? "on" : ""}`} onClick={onChange}><span /></button></div>;
}

export function PomodoroSettingsSection({ settings, onChange }: { settings: PomodoroSettings; onChange: (settings: PomodoroSettings) => void }) {
  const update = <Key extends keyof PomodoroSettings>(key: Key, value: PomodoroSettings[Key]) => onChange({ ...settings, [key]: value });
  return <section className="pomodoro-settings-section" aria-labelledby="pomodoro-settings-title">
    <div className="section-title-row"><div><p className="eyebrow">Pomodoro</p><h2 id="pomodoro-settings-title">番茄循环</h2><p>设置会从下一阶段或新循环开始生效，不会改变正在运行的倒计时。</p></div><button type="button" className="secondary-button reset-background" onClick={() => onChange({ ...DEFAULT_POMODORO_SETTINGS })}><RotateCcw />恢复番茄默认值</button></div>
    <div className="pomodoro-settings-card">
      <div className="pomodoro-settings-icon"><Focus /><Coffee /><TimerReset /></div>
      <div>
        <NumberSetting label="番茄专注时长" description="每一轮完整专注的计划时间。" value={settings.focusMinutes} min={1} max={180} unit="分钟" onChange={(value) => update("focusMinutes", value)} />
        <NumberSetting label="短休息时长" description="非最后一轮专注后的恢复时间。" value={settings.shortBreakMinutes} min={1} max={60} unit="分钟" onChange={(value) => update("shortBreakMinutes", value)} />
        <NumberSetting label="长休息时长" description="完成整轮循环后的休息时间。" value={settings.longBreakMinutes} min={1} max={120} unit="分钟" onChange={(value) => update("longBreakMinutes", value)} />
        <NumberSetting label="长休息前轮数" description="完成多少次专注后进入长休息。" value={settings.roundsBeforeLongBreak} min={2} max={12} unit="轮" onChange={(value) => update("roundsBeforeLongBreak", value)} />
        <AutoStartSetting label="自动开始休息" description="专注完成后立即开始对应的短休息或长休息。" checked={settings.autoStartBreaks} onChange={() => update("autoStartBreaks", !settings.autoStartBreaks)} />
        <AutoStartSetting label="自动开始下一轮专注" description="休息结束或跳过后立即开始下一次专注。" checked={settings.autoStartFocus} onChange={() => update("autoStartFocus", !settings.autoStartFocus)} />
      </div>
    </div>
  </section>;
}
