"use client";

import { useCallback, useMemo } from "react";
import { DEFAULT_BACKGROUND_SETTINGS } from "@/lib/background-presets";
import { backgroundCss } from "@/lib/background-utils";
import { useBackgroundImage } from "@/hooks/useBackgroundImage";
import { useBackgroundSettings } from "@/hooks/useBackgroundSettings";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { parseSettings, STORAGE_KEYS } from "@/lib/storage";

export function BackgroundLayer() {
  const { settings, updateSettings } = useBackgroundSettings();
  const settingsParser = useCallback((raw: string | null) => parseSettings(raw), []);
  const [focusSettings] = useLocalStorage(STORAGE_KEYS.settings, settingsParser);
  const fallback = useCallback(() => updateSettings(structuredClone(DEFAULT_BACKGROUND_SETTINGS)), [updateSettings]);
  const imageUrl = useBackgroundImage(settings.type === "image" ? settings.image.storageKey : null, fallback);
  const layerStyle = useMemo(() => ({
    background: backgroundCss(settings, imageUrl),
    backgroundSize: settings.type === "image" ? settings.image.fit : "cover",
    backgroundPosition: settings.type === "image" ? settings.image.position : "center",
    filter: `brightness(${settings.brightness}%) blur(${settings.blur}px)`,
    transform: `scale(${settings.type === "image" ? settings.image.scale / 100 + settings.blur / 500 : 1 + settings.blur / 500})`,
  }), [imageUrl, settings]);
  return <div className={`background-layer${focusSettings.reduceMotion ? " no-motion" : ""}`} aria-hidden="true">
    <div className="background-base" />
    <div className="background-visual" style={layerStyle} />
    <div className="background-overlay" style={{ opacity: settings.overlayOpacity / 100 }} />
    <div className="background-glow" />
  </div>;
}
