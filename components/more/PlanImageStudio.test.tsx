import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanImageGenerator, PlanImageResult } from "@/lib/plan-image";
import { PlanImageStudio } from "./PlanImageStudio";

const imageBlob = new Blob(["png"], { type: "image/png" });
const result = {
  src: "blob:plan-image",
  blob: imageBlob,
  alt: "测试计划图",
  downloadName: "test-plan.png",
};

describe("PlanImageStudio", () => {
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    revokeObjectURL.mockClear();
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
  });

  it("moves from empty to ready when the user enters a plan", () => {
    render(<PlanImageStudio />);

    const input = screen.getByLabelText("你的计划");
    const button = screen.getByRole("button", { name: "生成计划图" });
    expect(button).toBeDisabled();
    expect(screen.queryByRole("link", { name: "下载图片" })).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "明天学习两小时高数" } });
    expect(button).toBeEnabled();
  });

  it("preserves the input while loading, then shows preview and download", async () => {
    let resolveGeneration!: (value: PlanImageResult) => void;
    const generator: PlanImageGenerator = {
      generate: vi.fn(() => new Promise<PlanImageResult>((resolve) => { resolveGeneration = resolve; })),
    };
    render(<PlanImageStudio generator={generator} />);

    const input = screen.getByLabelText("你的计划");
    fireEvent.change(input, { target: { value: "上午学习高数，下午背单词" } });
    fireEvent.click(screen.getByRole("button", { name: "生成计划图" }));

    expect(screen.getByRole("button", { name: "生成中" })).toBeDisabled();
    expect(input).toHaveValue("上午学习高数，下午背单词");
    expect(input).toBeDisabled();
    expect(screen.queryByRole("link", { name: "下载图片" })).not.toBeInTheDocument();

    resolveGeneration(result);
    const preview = await screen.findByRole("img", { name: "测试计划图" });
    const download = screen.getByRole("link", { name: "下载图片" });
    expect(preview).toBeInTheDocument();
    expect(download).toHaveAttribute("href", "blob:plan-image");
    expect(download).toHaveAttribute("download", "test-plan.png");
    expect(screen.getByRole("button", { name: "重新生成" })).toBeEnabled();
  });

  it("shows the reserved error state and allows retrying", async () => {
    const generator: PlanImageGenerator = {
      generate: vi.fn().mockRejectedValue(new Error("mock failure")),
    };
    render(<PlanImageStudio generator={generator} />);

    fireEvent.change(screen.getByLabelText("你的计划"), { target: { value: "晚上复习英语" } });
    fireEvent.click(screen.getByRole("button", { name: "生成计划图" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("计划图生成失败，请稍后重试。");
    expect(screen.getByRole("button", { name: "重新生成" })).toBeEnabled();
    expect(screen.queryByRole("link", { name: "下载图片" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重新生成" }));
    await waitFor(() => expect(generator.generate).toHaveBeenCalledTimes(2));
  });

  it("releases the previous Object URL when regenerating and the current URL on unmount", async () => {
    const secondResult: PlanImageResult = { ...result, src: "blob:second-plan-image" };
    const generator: PlanImageGenerator = {
      generate: vi.fn()
        .mockResolvedValueOnce(result)
        .mockResolvedValueOnce(secondResult),
    };
    const { unmount } = render(<PlanImageStudio generator={generator} />);

    fireEvent.change(screen.getByLabelText("你的计划"), { target: { value: "明天学习高数" } });
    fireEvent.click(screen.getByRole("button", { name: "生成计划图" }));
    await screen.findByRole("img", { name: "测试计划图" });

    fireEvent.click(screen.getByRole("button", { name: "重新生成" }));
    await waitFor(() => expect(screen.getByRole("link", { name: "下载图片" })).toHaveAttribute("href", "blob:second-plan-image"));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:plan-image");

    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:second-plan-image");
  });

  it("releases a generated Object URL that resolves after unmount", async () => {
    let resolveGeneration!: (value: PlanImageResult) => void;
    const generator: PlanImageGenerator = {
      generate: vi.fn(() => new Promise<PlanImageResult>((resolve) => { resolveGeneration = resolve; })),
    };
    const { unmount } = render(<PlanImageStudio generator={generator} />);

    fireEvent.change(screen.getByLabelText("你的计划"), { target: { value: "晚上复习英语" } });
    fireEvent.click(screen.getByRole("button", { name: "生成计划图" }));
    unmount();
    resolveGeneration(result);

    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith("blob:plan-image"));
  });
});
