import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBackgroundImage } from "./useBackgroundImage";

vi.mock("@/lib/indexed-db", () => ({ getBackgroundImage: vi.fn(async () => new Blob(["image"], { type: "image/png" })) }));

describe("useBackgroundImage", () => {
  const createObjectURL = vi.fn(() => "blob:background");
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
  });
  afterEach(() => { createObjectURL.mockClear(); revokeObjectURL.mockClear(); });

  it("releases Object URLs when replaced or unmounted", async () => {
    const onFailure = vi.fn();
    const { result, rerender, unmount } = renderHook(({ keyValue }) => useBackgroundImage(keyValue, onFailure), { initialProps: { keyValue: "custom-background:1" as string | null } });
    await waitFor(() => expect(result.current).toBe("blob:background"));
    rerender({ keyValue: "custom-background:2" });
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(2));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:background");
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });
});
