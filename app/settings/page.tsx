"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Accessibility, ArrowLeft, BellRing, Clock3, Maximize2, ShieldAlert, ShieldCheck } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { BackgroundSettingsPanel } from "@/components/background/BackgroundSettingsPanel";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { parseSettings, STORAGE_KEYS } from "@/lib/storage";
import type { FocusSettings } from "@/types/settings";

function ToggleSetting({ icon, title, description, checked, onChange }: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return <div className="setting-row">
    <span className="setting-icon" aria-hidden="true">{icon}</span>
    <div><h2>{title}</h2><p>{description}</p></div>
    <button type="button" role="switch" aria-label={title} aria-checked={checked} className={`switch ${checked ? "on" : ""}`} onClick={onChange}><span /></button>
  </div>;
}

export default function SettingsPage() {
  const [settings, setSettings, hydrated] = useLocalStorage(STORAGE_KEYS.settings, parseSettings);
  const update = <Key extends keyof FocusSettings,>(key: Key, value: FocusSettings[Key]) => setSettings({ ...settings, [key]: value });
  return <PageContainer><Link href="/" className="back-link"><ArrowLeft size={17} />返回计时器</Link><div className="page-heading"><p className="eyebrow">Preferences</p><h1 className="page-title">设置</h1><p className="page-copy">保留必要的控制，把复杂留在视线之外。</p></div>
    <section className="settings-list" aria-busy={!hydrated}>
      <div className="setting-row"><span className="setting-icon" aria-hidden="true"><Clock3 /></span><div><h2>默认专注时长</h2><p>完成或放弃一次计时后，新专注默认使用的时长。</p></div><select aria-label="默认专注时长" value={settings.defaultDurationMinutes} onChange={(e) => update("defaultDurationMinutes", Number(e.target.value))}><option value={25}>25 分钟</option><option value={45}>45 分钟</option><option value={60}>60 分钟</option><option value={80}>80 分钟</option></select></div>
      <ToggleSetting icon={<BellRing />} title="完成提示音" description="专注结束时播放一段轻柔提示音；播放受限时不会影响计时。" checked={settings.soundEnabled} onChange={() => update("soundEnabled", !settings.soundEnabled)} />
      <ToggleSetting icon={<ShieldAlert />} title="提前结束确认" description="结束未完成的专注前，询问保存、放弃或继续。" checked={settings.confirmEndEnabled} onChange={() => update("confirmEndEnabled", !settings.confirmEndEnabled)} />
      <ToggleSetting icon={<Maximize2 />} title="开始时自动全屏" description="开始专注时尝试进入浏览器全屏；被拒绝时保持正常模式。" checked={settings.autoFullscreen} onChange={() => update("autoFullscreen", !settings.autoFullscreen)} />
      <ToggleSetting icon={<Accessibility />} title="减少翻页动画" description="直接替换数字，不播放 3D 翻页动画。" checked={settings.reduceMotion} onChange={() => update("reduceMotion", !settings.reduceMotion)} />
      <div className="privacy-note"><ShieldCheck /><div><h2>你的数据留在本地</h2><p>计时状态、设置和历史保存在 localStorage；自定义背景图片保存在 IndexedDB。所有数据都不会上传。</p></div></div>
    </section>
    <BackgroundSettingsPanel />
  </PageContainer>;
}
