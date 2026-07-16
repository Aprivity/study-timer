"use client";

import { useBackgroundSettings } from "@/hooks/useBackgroundSettings";

function RangeControl({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (value: number) => void }) {
  return <label className="range-field"><span>{label}</span><output>{value}{unit}</output><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

export function BackgroundControls() {
  const { settings, updateSettings } = useBackgroundSettings();
  const update = (patch: Partial<typeof settings>) => updateSettings((current) => ({ ...current, ...patch }));
  return <section className="background-controls" aria-labelledby="background-controls-title"><div className="editor-heading"><div><h3 id="background-controls-title">画面调节</h3><p>只处理背景图层，不会模糊计时器和页面内容。</p></div></div><div className="range-grid">
    <RangeControl label="背景亮度" value={settings.brightness} min={50} max={130} unit="%" onChange={(brightness) => update({ brightness })} />
    <RangeControl label="背景模糊" value={settings.blur} min={0} max={20} unit="px" onChange={(blur) => update({ blur })} />
    <RangeControl label="遮罩强度" value={settings.overlayOpacity} min={0} max={80} unit="%" onChange={(overlayOpacity) => update({ overlayOpacity })} />
  </div></section>;
}
