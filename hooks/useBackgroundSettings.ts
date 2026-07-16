"use client";

import { createContext, useContext } from "react";
import type { BackgroundPresetId, BackgroundSettings } from "@/types/background";

export interface BackgroundSettingsContextValue {
  settings: BackgroundSettings;
  hydrated: boolean;
  resetVersion: number;
  updateSettings: (next: BackgroundSettings | ((current: BackgroundSettings) => BackgroundSettings)) => void;
  selectPreset: (id: BackgroundPresetId) => void;
  restoreDefault: () => void;
}

export const BackgroundSettingsContext = createContext<BackgroundSettingsContextValue | null>(null);

export function useBackgroundSettings(): BackgroundSettingsContextValue {
  const context = useContext(BackgroundSettingsContext);
  if (!context) throw new Error("useBackgroundSettings must be used inside BackgroundProvider");
  return context;
}
