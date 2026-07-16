import type { BackgroundPreset, BackgroundPresetId, BackgroundSettings } from "@/types/background";

export const BACKGROUND_PRESETS: readonly BackgroundPreset[] = [
  {
    id: "forest-night", name: "森林深夜", colorMode: "dark", recommendedOverlay: 12,
    description: "深墨绿与柔和鼠尾草光晕，适合夜间沉浸学习。",
    background: "radial-gradient(circle at 50% 35%, rgba(126, 155, 134, 0.12), transparent 42%), linear-gradient(180deg, #0d1510 0%, #080c09 100%)",
    previewBackground: "radial-gradient(circle at 50% 35%, rgba(126, 155, 134, 0.22), transparent 42%), linear-gradient(180deg, #0d1510, #080c09)",
  },
  {
    id: "moss-mist", name: "苔藓薄雾", colorMode: "dark", recommendedOverlay: 18,
    description: "低饱和灰绿色与柔和雾感，适合白天学习。",
    background: "radial-gradient(circle at 25% 20%, rgba(173, 194, 174, 0.2), transparent 42%), linear-gradient(145deg, #26332b 0%, #111a15 60%, #0b100d 100%)",
    previewBackground: "radial-gradient(circle at 25% 20%, rgba(173, 194, 174, 0.28), transparent 42%), linear-gradient(145deg, #26332b, #111a15 60%, #0b100d)",
  },
  {
    id: "paper-study", name: "暖纸书桌", colorMode: "light", recommendedOverlay: 8,
    description: "米白纸张与暖棕光感，呈现安静的书桌氛围。",
    background: "radial-gradient(circle at 70% 15%, rgba(190, 150, 105, 0.14), transparent 38%), linear-gradient(180deg, #f4efe5 0%, #e8dfd1 100%)",
    previewBackground: "radial-gradient(circle at 70% 15%, rgba(190, 150, 105, 0.22), transparent 38%), linear-gradient(180deg, #f4efe5, #e8dfd1)",
  },
  {
    id: "morning-fog", name: "清晨薄雾", colorMode: "light", recommendedOverlay: 8,
    description: "柔和灰绿与清晨雾感，适合早晨和自然光环境。",
    background: "linear-gradient(145deg, #d7ded7 0%, #bfcabf 48%, #9eada2 100%)",
    previewBackground: "linear-gradient(145deg, #d7ded7, #bfcabf 48%, #9eada2)",
  },
  {
    id: "ink-black", name: "深色墨影", colorMode: "dark", recommendedOverlay: 10,
    description: "更纯粹、更低干扰的深色背景，适合全屏专注。",
    background: "radial-gradient(circle at 50% 40%, rgba(143, 170, 150, 0.07), transparent 38%), linear-gradient(180deg, #111412 0%, #070807 100%)",
    previewBackground: "radial-gradient(circle at 50% 40%, rgba(143, 170, 150, 0.14), transparent 38%), linear-gradient(180deg, #111412, #070807)",
  },
  {
    id: "clay-evening", name: "陶土暮色", colorMode: "dark", recommendedOverlay: 16,
    description: "陶土暖色与深棕暮色结合，适合傍晚使用。",
    background: "radial-gradient(circle at 75% 20%, rgba(202, 151, 111, 0.17), transparent 42%), linear-gradient(145deg, #30251f 0%, #171412 58%, #0d0e0c 100%)",
    previewBackground: "radial-gradient(circle at 75% 20%, rgba(202, 151, 111, 0.28), transparent 42%), linear-gradient(145deg, #30251f, #171412 58%, #0d0e0c)",
  },
] as const;

export const DEFAULT_BACKGROUND_SETTINGS: BackgroundSettings = {
  version: 1,
  type: "preset",
  presetId: "forest-night",
  solidColor: "#0b100d",
  gradient: { startColor: "#26332b", endColor: "#0b100d", direction: "diagonal" },
  image: { storageKey: null, fit: "cover", position: "center", scale: 100 },
  overlayOpacity: 52,
  blur: 0,
  brightness: 100,
  colorMode: "dark",
};

export function getBackgroundPreset(id: BackgroundPresetId): BackgroundPreset {
  return BACKGROUND_PRESETS.find((preset) => preset.id === id) ?? BACKGROUND_PRESETS[0];
}
