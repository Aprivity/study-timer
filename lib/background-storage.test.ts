import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_BACKGROUND_SETTINGS } from "./background-presets";
import { BACKGROUND_STORAGE_KEY, loadBackgroundSettings, settingsAfterImageDeletion, validateBackgroundSettings } from "./background-storage";

describe("background storage validation", () => {
  beforeEach(() => window.localStorage.clear());

  it("falls back for invalid JSON", () => {
    window.localStorage.setItem(BACKGROUND_STORAGE_KEY, "{broken");
    expect(loadBackgroundSettings()).toEqual(DEFAULT_BACKGROUND_SETTINGS);
  });

  it("fills missing fields", () => {
    const settings = validateBackgroundSettings({ type: "solid", solidColor: "#123456" });
    expect(settings.gradient).toEqual(DEFAULT_BACKGROUND_SETTINGS.gradient);
    expect(settings.image).toEqual(DEFAULT_BACKGROUND_SETTINGS.image);
    expect(settings.solidColor).toBe("#123456");
  });

  it("rejects invalid presets and colors", () => {
    const settings = validateBackgroundSettings({ type: "preset", presetId: "neon", solidColor: "red", gradient: { startColor: "bad", endColor: "also-bad" } });
    expect(settings.presetId).toBe("forest-night");
    expect(settings.colorMode).toBe("dark");
    expect(settings.solidColor).toBe(DEFAULT_BACKGROUND_SETTINGS.solidColor);
    expect(settings.gradient).toEqual(DEFAULT_BACKGROUND_SETTINGS.gradient);
  });

  it("uses the selected preset color mode", () => {
    expect(validateBackgroundSettings({ type: "preset", presetId: "paper-study", colorMode: "dark" }).colorMode).toBe("light");
  });

  it("clamps overlay, blur, brightness and image scale", () => {
    const settings = validateBackgroundSettings({ overlayOpacity: 120, blur: -4, brightness: 20, image: { scale: 999 } });
    expect(settings.overlayOpacity).toBe(80);
    expect(settings.blur).toBe(0);
    expect(settings.brightness).toBe(50);
    expect(settings.image.scale).toBe(150);
  });

  it("falls back from an image setting without a storage key", () => {
    expect(validateBackgroundSettings({ type: "image", image: { storageKey: null } }).type).toBe("preset");
  });

  it("returns the default after image deletion", () => {
    expect(settingsAfterImageDeletion()).toEqual(DEFAULT_BACKGROUND_SETTINGS);
  });
});
