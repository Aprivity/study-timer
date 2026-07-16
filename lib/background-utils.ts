import { getBackgroundPreset } from "@/lib/background-presets";
import type { BackgroundSettings, GradientDirection } from "@/types/background";

export const MAX_BACKGROUND_IMAGE_BYTES = 5 * 1024 * 1024;
export const SUPPORTED_BACKGROUND_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

export function isHexColor(value: string): boolean {
  return /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value.trim());
}

export function gradientBackground(startColor: string, endColor: string, direction: GradientDirection): string {
  if (!isHexColor(startColor) || !isHexColor(endColor)) return "";
  if (direction === "radial") return `radial-gradient(circle at center, ${startColor}, ${endColor})`;
  const directions: Record<Exclude<GradientDirection, "radial">, string> = {
    vertical: "180deg", horizontal: "90deg", diagonal: "145deg",
  };
  return `linear-gradient(${directions[direction]}, ${startColor}, ${endColor})`;
}

export function backgroundCss(settings: BackgroundSettings, imageUrl: string | null): string {
  if (settings.type === "solid") return settings.solidColor;
  if (settings.type === "gradient") return gradientBackground(settings.gradient.startColor, settings.gradient.endColor, settings.gradient.direction);
  if (settings.type === "image" && imageUrl) return `url("${imageUrl}")`;
  return getBackgroundPreset(settings.presetId).background;
}

export function validateBackgroundFile(file: Pick<File, "type" | "size">): string | null {
  if (!SUPPORTED_BACKGROUND_IMAGE_TYPES.includes(file.type as (typeof SUPPORTED_BACKGROUND_IMAGE_TYPES)[number])) {
    return "请选择 JPEG、PNG、WebP 或 AVIF 图片。";
  }
  if (file.size > MAX_BACKGROUND_IMAGE_BYTES) return "图片不能超过 5MB。";
  if (file.size <= 0) return "图片文件为空，请重新选择。";
  return null;
}
