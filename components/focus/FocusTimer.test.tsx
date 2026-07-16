import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FocusTimer } from "./FocusTimer";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("FocusTimer core controls", () => {
  beforeEach(() => window.localStorage.clear());
  it("starts and pauses a focus session", async () => {
    render(<FocusTimer />);
    expect(await screen.findByRole("timer", { name: "剩余时间 45:00" })).toBeInTheDocument();
    expect(screen.getByLabelText("本次学习任务")).toHaveValue("");
    const start = await screen.findByRole("button", { name: /开始专注/ });
    fireEvent.click(start);
    expect(await screen.findByRole("button", { name: "暂停" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "25 分钟" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "暂停" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /继续专注/ })).toBeInTheDocument());
  });

  it("discards an early stop without creating history and resets to idle", async () => {
    render(<FocusTimer />);
    fireEvent.click(await screen.findByRole("button", { name: /开始专注/ }));
    fireEvent.click(await screen.findByRole("button", { name: "提前结束" }));
    fireEvent.click(await screen.findByRole("button", { name: "放弃本次记录" }));
    expect(await screen.findByRole("button", { name: /开始专注/ })).toBeInTheDocument();
    expect(window.localStorage.getItem("aprivity-focus:sessions")).toBeNull();
  });

  it("applies the persisted default duration to a fresh timer", async () => {
    window.localStorage.setItem("aprivity-focus:settings", JSON.stringify({ defaultDurationMinutes: 25 }));
    render(<FocusTimer />);
    expect(await screen.findByRole("timer", { name: "剩余时间 25:00" })).toBeInTheDocument();
  });

  it("continues safely when automatic fullscreen is rejected", async () => {
    window.localStorage.setItem("aprivity-focus:settings", JSON.stringify({ autoFullscreen: true }));
    const requestFullscreen = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(document.documentElement, "requestFullscreen", { configurable: true, value: requestFullscreen });
    render(<FocusTimer />);
    fireEvent.click(await screen.findByRole("button", { name: /开始专注/ }));
    expect(await screen.findByRole("button", { name: "暂停" })).toBeInTheDocument();
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    Reflect.deleteProperty(document.documentElement, "requestFullscreen");
  });
});
