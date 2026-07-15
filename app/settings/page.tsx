"use client";

import Link from "next/link";
import { ArrowLeft, BellRing, Clock3, ShieldCheck } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { parseSettings, STORAGE_KEYS } from "@/lib/storage";

export default function SettingsPage() {
  const [settings, setSettings, hydrated] = useLocalStorage(STORAGE_KEYS.settings, parseSettings);
  return <PageContainer><Link href="/" className="back-link"><ArrowLeft size={17} />返回计时器</Link><div className="page-heading"><p className="eyebrow">Preferences</p><h1 className="page-title">设置</h1><p className="page-copy">保留必要的控制，把复杂留在视线之外。</p></div>
    <section className="settings-list" aria-busy={!hydrated}>
      <div className="setting-row"><span className="setting-icon"><BellRing /></span><div><h2>完成提示音</h2><p>专注结束时播放一段轻柔提示音。</p></div><button role="switch" aria-checked={settings.soundEnabled} className={`switch ${settings.soundEnabled ? "on" : ""}`} onClick={() => setSettings({ ...settings, soundEnabled: !settings.soundEnabled })}><span /></button></div>
      <div className="setting-row"><span className="setting-icon"><Clock3 /></span><div><h2>默认专注时长</h2><p>新计时器首次打开时使用的时长。</p></div><select aria-label="默认专注时长" value={settings.defaultDurationMinutes} onChange={(e) => setSettings({ ...settings, defaultDurationMinutes: Number(e.target.value) })}><option value={25}>25 分钟</option><option value={45}>45 分钟</option><option value={60}>60 分钟</option><option value={80}>80 分钟</option></select></div>
      <div className="privacy-note"><ShieldCheck /><div><h2>你的数据留在本地</h2><p>Aprivity Focus V1 不使用账号、后端或数据库。计时状态、设置和历史仅保存在当前浏览器的 localStorage 中。</p></div></div>
    </section>
  </PageContainer>;
}
