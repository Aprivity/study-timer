import { describe, expect, it } from "vitest";
import { BACKGROUND_PRESETS, DEFAULT_BACKGROUND_SETTINGS, getBackgroundPreset } from "./background-presets";

describe("background presets", () => {
  it("uses forest night by default", () => {
    expect(DEFAULT_BACKGROUND_SETTINGS.type).toBe("preset");
    expect(DEFAULT_BACKGROUND_SETTINGS.presetId).toBe("forest-night");
  });

  it("contains all six readable presets", () => {
    expect(BACKGROUND_PRESETS).toHaveLength(6);
    expect(BACKGROUND_PRESETS.map((preset) => preset.id)).toEqual([
      "forest-night", "moss-mist", "paper-study", "morning-fog", "ink-black", "clay-evening",
    ]);
    for (const preset of BACKGROUND_PRESETS) expect(getBackgroundPreset(preset.id)).toEqual(preset);
  });
});
