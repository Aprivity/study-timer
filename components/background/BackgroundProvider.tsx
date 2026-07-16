"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_BACKGROUND_SETTINGS, getBackgroundPreset } from "@/lib/background-presets";
import { loadBackgroundSettings, saveBackgroundSettings } from "@/lib/background-storage";
import { BackgroundSettingsContext } from "@/hooks/useBackgroundSettings";
import type { BackgroundPresetId, BackgroundSettings } from "@/types/background";

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<BackgroundSettings>(() => structuredClone(DEFAULT_BACKGROUND_SETTINGS));
  const [hydrated, setHydrated] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) { setSettings(loadBackgroundSettings()); setHydrated(true); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const timeout = window.setTimeout(() => saveBackgroundSettings(settings), 80);
    return () => window.clearTimeout(timeout);
  }, [hydrated, settings]);

  const updateSettings = useCallback((next: BackgroundSettings | ((current: BackgroundSettings) => BackgroundSettings)) => {
    setSettings((current) => typeof next === "function" ? next(current) : next);
  }, []);
  const selectPreset = useCallback((id: BackgroundPresetId) => {
    const preset = getBackgroundPreset(id);
    setSettings((current) => ({ ...current, type: "preset", presetId: id, colorMode: preset.colorMode, overlayOpacity: preset.recommendedOverlay }));
  }, []);
  const restoreDefault = useCallback(() => { setSettings(structuredClone(DEFAULT_BACKGROUND_SETTINGS)); setResetVersion((version) => version + 1); }, []);
  const value = useMemo(() => ({ settings, hydrated, resetVersion, updateSettings, selectPreset, restoreDefault }), [hydrated, resetVersion, restoreDefault, selectPreset, settings, updateSettings]);

  return <BackgroundSettingsContext.Provider value={value}>
    <div className="app-root" data-color-mode={settings.colorMode}>
      {children}
    </div>
  </BackgroundSettingsContext.Provider>;
}
