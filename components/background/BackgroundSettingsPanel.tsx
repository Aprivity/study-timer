"use client";

import { RotateCcw, ShieldCheck } from "lucide-react";
import { useBackgroundSettings } from "@/hooks/useBackgroundSettings";
import { deleteBackgroundImage } from "@/lib/indexed-db";
import { BackgroundPicker } from "./BackgroundPicker";
import { BackgroundControls } from "./BackgroundControls";
import { CustomGradientEditor } from "./CustomGradientEditor";
import { CustomImageEditor } from "./CustomImageEditor";
import { CustomSolidEditor } from "./CustomSolidEditor";

export function BackgroundSettingsPanel() {
  const { restoreDefault, hydrated, resetVersion } = useBackgroundSettings();
  const reset = async () => {
    if (!window.confirm("恢复默认的森林深夜背景？自定义图片也会从当前浏览器删除。")) return;
    try { await deleteBackgroundImage(); } catch { /* Background settings can still reset without IndexedDB. */ }
    restoreDefault();
  };
  return <section className="background-settings" aria-labelledby="background-settings-title" aria-busy={!hydrated}>
    <div className="section-title-row"><div><p className="eyebrow">Background</p><h2 id="background-settings-title">背景设置</h2><p>选择安静的学习氛围，所有变化都会即时预览并自动保存。</p></div><button type="button" className="secondary-button reset-background" onClick={() => void reset()}><RotateCcw />恢复默认</button></div>
    <div className="background-section"><h3>内置背景</h3><BackgroundPicker /></div>
    <div className="custom-background-grid"><CustomSolidEditor key={`solid-${resetVersion}`} /><CustomGradientEditor key={`gradient-${resetVersion}`} /></div>
    <CustomImageEditor key={`image-${resetVersion}`} />
    <BackgroundControls />
    <div className="background-privacy"><ShieldCheck aria-hidden="true" /><p>所有背景设置仅保存在当前浏览器。自定义图片使用 IndexedDB 本地保存，不会上传到服务器或 GitHub。</p></div>
  </section>;
}
