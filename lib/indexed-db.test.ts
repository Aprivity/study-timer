import { describe, expect, it, vi } from "vitest";
import { saveBackgroundImage } from "./indexed-db";

describe("background IndexedDB", () => {
  it("rejects safely when IndexedDB is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);
    await expect(saveBackgroundImage(new Blob(["image"]))).rejects.toThrow(/IndexedDB/);
    vi.unstubAllGlobals();
  });
});
