"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { validateBackgroundFile } from "@/lib/background-utils";
import { BACKGROUND_IMAGE_KEY, deleteBackgroundImage, saveBackgroundImage } from "@/lib/indexed-db";
import { useBackgroundSettings } from "@/hooks/useBackgroundSettings";
import type { BackgroundImageFit, BackgroundImagePosition } from "@/types/background";
import { ColorModeControl } from "./ColorModeControl";

export function CustomImageEditor() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { settings, updateSettings, restoreDefault } = useBackgroundSettings();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const upload = async (file: File | undefined) => {
    if (!file) return;
    const validationError = validateBackgroundFile(file);
    if (validationError) { setError(validationError); return; }
    setBusy(true); setError(null);
    try {
      await saveBackgroundImage(file);
      updateSettings((current) => ({ ...current, type: "image", colorMode: "dark", overlayOpacity: Math.max(52, current.overlayOpacity), image: { ...current.image, storageKey: `${BACKGROUND_IMAGE_KEY}:${Date.now()}` } }));
    } catch { setError("无法保存图片。你仍可继续使用内置、纯色和渐变背景。"); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  };
  const remove = async () => {
    if (!window.confirm("删除本地背景图片并恢复森林深夜背景？")) return;
    try { await deleteBackgroundImage(); } catch { /* A missing database is equivalent to an empty image store. */ }
    restoreDefault(); setError(null);
  };
  const updateImage = (patch: Partial<typeof settings.image>) => updateSettings((current) => ({ ...current, type: current.image.storageKey ? "image" : current.type, image: { ...current.image, ...patch } }));
  return <section className="background-editor" aria-labelledby="image-title">
    <div className="editor-heading"><div><h3 id="image-title">本地图片</h3><p>图片只保存在当前浏览器，不会上传到服务器。</p></div></div>
    <label className={`image-upload${busy ? " busy" : ""}`}><ImagePlus aria-hidden="true" /><span><strong>{settings.image.storageKey ? "更换背景图片" : "选择背景图片"}</strong><small>JPEG、PNG、WebP 或 AVIF，最大 5MB</small></span><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={(event) => void upload(event.target.files?.[0])} /></label>
    {error && <p className="field-error" role="alert">{error}</p>}
    {settings.image.storageKey && <>
      <div className="image-option-grid">
        <label>显示方式<select value={settings.image.fit} onChange={(event) => updateImage({ fit: event.target.value as BackgroundImageFit })}><option value="cover">覆盖视口</option><option value="contain">完整显示</option></select></label>
        <label>图片位置<select value={settings.image.position} onChange={(event) => updateImage({ position: event.target.value as BackgroundImagePosition })}><option value="center">居中</option><option value="top">顶部</option><option value="bottom">底部</option></select></label>
        <label className="range-field">缩放比例 <output>{settings.image.scale}%</output><input type="range" min={100} max={150} value={settings.image.scale} onChange={(event) => updateImage({ scale: Number(event.target.value) })} /></label>
      </div>
      <ColorModeControl value={settings.colorMode} onChange={(colorMode) => updateSettings((current) => ({ ...current, type: "image", colorMode }))} />
      <button type="button" className="delete-background-button" onClick={() => void remove()}><Trash2 />删除自定义图片</button>
    </>}
  </section>;
}
