export type BackgroundType = "preset" | "solid" | "gradient" | "image";

export type BackgroundPresetId =
  | "forest-night"
  | "moss-mist"
  | "paper-study"
  | "morning-fog"
  | "ink-black"
  | "clay-evening";

export type BackgroundColorMode = "dark" | "light";
export type GradientDirection = "vertical" | "horizontal" | "diagonal" | "radial";
export type BackgroundImageFit = "cover" | "contain";
export type BackgroundImagePosition = "center" | "top" | "bottom";

export interface BackgroundGradientSettings {
  startColor: string;
  endColor: string;
  direction: GradientDirection;
}

export interface BackgroundImageSettings {
  storageKey: string | null;
  fit: BackgroundImageFit;
  position: BackgroundImagePosition;
  scale: number;
}

export interface BackgroundSettings {
  version: 1;
  type: BackgroundType;
  presetId: BackgroundPresetId;
  solidColor: string;
  gradient: BackgroundGradientSettings;
  image: BackgroundImageSettings;
  overlayOpacity: number;
  blur: number;
  brightness: number;
  colorMode: BackgroundColorMode;
}

export interface BackgroundPreset {
  id: BackgroundPresetId;
  name: string;
  description: string;
  background: string;
  colorMode: BackgroundColorMode;
  recommendedOverlay: number;
  previewBackground: string;
}
