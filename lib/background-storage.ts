import { DEFAULT_BACKGROUND_SETTINGS, getBackgroundPreset } from "@/lib/background-presets";
import { isHexColor } from "@/lib/background-utils";
import type { BackgroundColorMode, BackgroundImageFit, BackgroundImagePosition, BackgroundPresetId, BackgroundSettings, BackgroundType, GradientDirection } from "@/types/background";

export const BACKGROUND_STORAGE_KEY = "aprivity-focus:background-settings";

const types: BackgroundType[] = ["preset", "solid", "gradient", "image"];
const presetIds: BackgroundPresetId[] = ["forest-night", "moss-mist", "paper-study", "morning-fog", "ink-black", "clay-evening"];
const directions: GradientDirection[] = ["vertical", "horizontal", "diagonal", "radial"];
const fits: BackgroundImageFit[] = ["cover", "contain"];
const positions: BackgroundImagePosition[] = ["center", "top", "bottom"];
const modes: BackgroundColorMode[] = ["dark", "light"];

function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function member<T extends string>(value: unknown, values: readonly T[], fallback: T): T { return typeof value === "string" && values.includes(value as T) ? value as T : fallback; }
function numberIn(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
}

export function validateBackgroundSettings(value: unknown): BackgroundSettings {
  if (!record(value)) return structuredClone(DEFAULT_BACKGROUND_SETTINGS);
  const gradient = record(value.gradient) ? value.gradient : {};
  const image = record(value.image) ? value.image : {};
  const presetId = member(value.presetId, presetIds, DEFAULT_BACKGROUND_SETTINGS.presetId);
  const requestedType = member(value.type, types, DEFAULT_BACKGROUND_SETTINGS.type);
  const imageStorageKey = typeof image.storageKey === "string" && image.storageKey.length <= 80 ? image.storageKey : null;
  const type = requestedType === "image" && !imageStorageKey ? "preset" : requestedType;
  const preset = getBackgroundPreset(presetId);
  const requestedMode = member(value.colorMode, modes, DEFAULT_BACKGROUND_SETTINGS.colorMode);
  return {
    version: 1,
    type,
    presetId,
    solidColor: typeof value.solidColor === "string" && isHexColor(value.solidColor) ? value.solidColor : DEFAULT_BACKGROUND_SETTINGS.solidColor,
    gradient: {
      startColor: typeof gradient.startColor === "string" && isHexColor(gradient.startColor) ? gradient.startColor : DEFAULT_BACKGROUND_SETTINGS.gradient.startColor,
      endColor: typeof gradient.endColor === "string" && isHexColor(gradient.endColor) ? gradient.endColor : DEFAULT_BACKGROUND_SETTINGS.gradient.endColor,
      direction: member(gradient.direction, directions, DEFAULT_BACKGROUND_SETTINGS.gradient.direction),
    },
    image: {
      storageKey: imageStorageKey,
      fit: member(image.fit, fits, DEFAULT_BACKGROUND_SETTINGS.image.fit),
      position: member(image.position, positions, DEFAULT_BACKGROUND_SETTINGS.image.position),
      scale: numberIn(image.scale, 100, 150, DEFAULT_BACKGROUND_SETTINGS.image.scale),
    },
    overlayOpacity: numberIn(value.overlayOpacity, 0, 80, DEFAULT_BACKGROUND_SETTINGS.overlayOpacity),
    blur: numberIn(value.blur, 0, 20, DEFAULT_BACKGROUND_SETTINGS.blur),
    brightness: numberIn(value.brightness, 50, 130, DEFAULT_BACKGROUND_SETTINGS.brightness),
    colorMode: type === "preset" ? preset.colorMode : requestedMode,
  };
}

export function loadBackgroundSettings(): BackgroundSettings {
  if (typeof window === "undefined") return structuredClone(DEFAULT_BACKGROUND_SETTINGS);
  try { return validateBackgroundSettings(JSON.parse(window.localStorage.getItem(BACKGROUND_STORAGE_KEY) ?? "null") as unknown); }
  catch { return structuredClone(DEFAULT_BACKGROUND_SETTINGS); }
}

export function saveBackgroundSettings(settings: BackgroundSettings): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(BACKGROUND_STORAGE_KEY, JSON.stringify(validateBackgroundSettings(settings))); } catch { /* Storage may be unavailable. */ }
}

export function resetBackgroundSettings(): BackgroundSettings {
  const settings = structuredClone(DEFAULT_BACKGROUND_SETTINGS);
  saveBackgroundSettings(settings);
  return settings;
}

export function settingsAfterImageDeletion(): BackgroundSettings {
  return structuredClone(DEFAULT_BACKGROUND_SETTINGS);
}
