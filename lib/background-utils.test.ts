import { describe, expect, it } from "vitest";
import { gradientBackground, isHexColor, MAX_BACKGROUND_IMAGE_BYTES, validateBackgroundFile } from "./background-utils";

describe("background utilities", () => {
  it("accepts controlled hex formats only", () => {
    expect(isHexColor("#abc")).toBe(true);
    expect(isHexColor("#A1B2C3")).toBe(true);
    expect(isHexColor("red")).toBe(false);
    expect(isHexColor("#abcd")).toBe(false);
  });

  it("builds controlled linear and radial gradients", () => {
    expect(gradientBackground("#112233", "#445566", "horizontal")).toBe("linear-gradient(90deg, #112233, #445566)");
    expect(gradientBackground("#112233", "#445566", "radial")).toBe("radial-gradient(circle at center, #112233, #445566)");
    expect(gradientBackground("red", "#445566", "vertical")).toBe("");
  });

  it("rejects unsupported or oversized image files", () => {
    expect(validateBackgroundFile({ type: "image/gif", size: 100 })).toMatch(/JPEG/);
    expect(validateBackgroundFile({ type: "image/svg+xml", size: 100 })).toMatch(/JPEG/);
    expect(validateBackgroundFile({ type: "image/png", size: MAX_BACKGROUND_IMAGE_BYTES + 1 })).toMatch(/5MB/);
    expect(validateBackgroundFile({ type: "image/webp", size: 1024 })).toBeNull();
  });
});
