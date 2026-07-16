"use client";

import { BACKGROUND_PRESETS } from "@/lib/background-presets";
import { useBackgroundSettings } from "@/hooks/useBackgroundSettings";
import { BackgroundPreview } from "./BackgroundPreview";

export function BackgroundPicker() {
  const { settings, selectPreset } = useBackgroundSettings();
  return <div className="background-preset-grid">
    {BACKGROUND_PRESETS.map((preset) => <BackgroundPreview key={preset.id} preset={preset} selected={settings.type === "preset" && settings.presetId === preset.id} onSelect={() => selectPreset(preset.id)} />)}
  </div>;
}
