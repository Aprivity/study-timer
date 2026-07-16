"use client";

import { useState } from "react";
import { isHexColor } from "@/lib/background-utils";
import { useBackgroundSettings } from "@/hooks/useBackgroundSettings";
import type { GradientDirection } from "@/types/background";
import { ColorModeControl } from "./ColorModeControl";

export function CustomGradientEditor() {
  const { settings, updateSettings } = useBackgroundSettings();
  const [start, setStart] = useState(settings.gradient.startColor);
  const [end, setEnd] = useState(settings.gradient.endColor);
  const updateColor = (key: "startColor" | "endColor", value: string) => {
    if (key === "startColor") setStart(value); else setEnd(value);
    if (isHexColor(value)) updateSettings((current) => ({ ...current, type: "gradient", gradient: { ...current.gradient, [key]: value } }));
  };
  const updateDirection = (direction: GradientDirection) => updateSettings((current) => ({ ...current, type: "gradient", gradient: { ...current.gradient, direction } }));
  return <section className="background-editor" aria-labelledby="gradient-title">
    <div className="editor-heading"><div><h3 id="gradient-title">自定义渐变</h3><p>组合两种颜色，并选择自然的过渡方向。</p></div></div>
    <div className="gradient-input-grid">
      <label>起始颜色<span><input aria-label="渐变起始颜色选择器" type="color" value={isHexColor(start) && start.length === 7 ? start : "#26332b"} onChange={(event) => updateColor("startColor", event.target.value)} /><input value={start} onChange={(event) => updateColor("startColor", event.target.value)} maxLength={7} spellCheck={false} /></span></label>
      <label>结束颜色<span><input aria-label="渐变结束颜色选择器" type="color" value={isHexColor(end) && end.length === 7 ? end : "#0b100d"} onChange={(event) => updateColor("endColor", event.target.value)} /><input value={end} onChange={(event) => updateColor("endColor", event.target.value)} maxLength={7} spellCheck={false} /></span></label>
      <label>渐变方向<select value={settings.gradient.direction} onChange={(event) => updateDirection(event.target.value as GradientDirection)}><option value="vertical">从上到下</option><option value="horizontal">从左到右</option><option value="diagonal">左上到右下</option><option value="radial">径向渐变</option></select></label>
    </div>
    {(!isHexColor(start) || !isHexColor(end)) && <p className="field-error" role="alert">颜色必须使用 #RGB 或 #RRGGBB 格式；非法值不会应用。</p>}
    <ColorModeControl value={settings.colorMode} onChange={(colorMode) => updateSettings((current) => ({ ...current, type: "gradient", colorMode }))} />
  </section>;
}
