"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { isHexColor } from "@/lib/background-utils";
import { useBackgroundSettings } from "@/hooks/useBackgroundSettings";
import { ColorModeControl } from "./ColorModeControl";

const RECOMMENDED_SOLID = "#18211b";

export function CustomSolidEditor() {
  const { settings, updateSettings } = useBackgroundSettings();
  const [value, setValue] = useState(settings.solidColor);
  const apply = (next: string) => {
    setValue(next);
    if (isHexColor(next)) updateSettings((current) => ({ ...current, type: "solid", solidColor: next }));
  };
  return <section className="background-editor" aria-labelledby="solid-title">
    <div className="editor-heading"><div><h3 id="solid-title">自定义纯色</h3><p>选择一种克制的颜色作为完整页面背景。</p></div><button type="button" className="text-button" onClick={() => apply(RECOMMENDED_SOLID)}><RotateCcw />推荐值</button></div>
    <div className="color-input-row">
      <label>颜色<input aria-label="纯色颜色选择器" type="color" value={isHexColor(value) && value.length === 7 ? value : RECOMMENDED_SOLID} onChange={(event) => apply(event.target.value)} /></label>
      <label>十六进制<input aria-describedby="solid-color-error" value={value} onChange={(event) => apply(event.target.value)} maxLength={7} spellCheck={false} /></label>
    </div>
    {!isHexColor(value) && <p className="field-error" id="solid-color-error" role="alert">请输入 #RGB 或 #RRGGBB 格式的颜色。</p>}
    <ColorModeControl value={settings.colorMode} onChange={(colorMode) => updateSettings((current) => ({ ...current, type: "solid", colorMode }))} />
  </section>;
}
