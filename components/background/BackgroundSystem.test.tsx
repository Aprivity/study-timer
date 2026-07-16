import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundProvider } from "./BackgroundProvider";
import { BackgroundPicker } from "./BackgroundPicker";
import { BackgroundLayer } from "./BackgroundLayer";
import { CustomImageEditor } from "./CustomImageEditor";
import { BACKGROUND_STORAGE_KEY } from "@/lib/background-storage";

describe("background system interactions", () => {
  beforeEach(() => window.localStorage.clear());

  it("selects a preset and applies its light color mode", async () => {
    const { container } = render(<BackgroundProvider><BackgroundPicker /></BackgroundProvider>);
    const paper = await screen.findByRole("button", { name: /暖纸书桌/ });
    fireEvent.click(paper);
    expect(paper).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector(".app-root")).toHaveAttribute("data-color-mode", "light");
  });

  it("restores a persisted background after hydration", async () => {
    window.localStorage.setItem(BACKGROUND_STORAGE_KEY, JSON.stringify({ type: "preset", presetId: "morning-fog" }));
    const { container } = render(<BackgroundProvider><span>content</span></BackgroundProvider>);
    await waitFor(() => expect(container.querySelector(".app-root")).toHaveAttribute("data-color-mode", "light"));
  });

  it("turns off background transitions for the reduce-motion setting", async () => {
    window.localStorage.setItem("aprivity-focus:settings", JSON.stringify({ reduceMotion: true }));
    const { container } = render(<BackgroundProvider><BackgroundLayer /></BackgroundProvider>);
    await waitFor(() => expect(container.querySelector(".background-layer")).toHaveClass("no-motion"));
  });

  it("shows a friendly error when IndexedDB is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);
    render(<BackgroundProvider><CustomImageEditor /></BackgroundProvider>);
    const input = screen.getByLabelText(/选择背景图片/);
    fireEvent.change(input, { target: { files: [new File(["image"], "study.png", { type: "image/png" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("无法保存图片");
    vi.unstubAllGlobals();
  });
});
