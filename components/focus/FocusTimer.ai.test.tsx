import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FocusTimer } from "./FocusTimer";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function queueResponse(payload: unknown, options: { ok?: boolean; status?: number } = {}) {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response);
}

async function submitAiText(text: string) {
  const input = await screen.findByLabelText("用自然语言设置自由专注");
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "AI 填写" }));
}

describe("FocusTimer AI focus input", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => vi.unstubAllGlobals());

  it("applies a normal parse result but remains idle until the user starts", async () => {
    queueResponse({ task_name: "学习高数", duration_minutes: 45 });
    render(<FocusTimer />);

    await submitAiText("学习高数45分钟");

    await waitFor(() => expect(screen.getByLabelText("本次学习任务")).toHaveValue("学习高数"));
    expect(screen.getByRole("timer", { name: "剩余时间 45:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始专注" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "暂停" })).not.toBeInTheDocument();
  });

  it("updates only the task name when duration is null", async () => {
    queueResponse({ task_name: "学习英语", duration_minutes: null });
    render(<FocusTimer />);

    await submitAiText("学习英语");

    await waitFor(() => expect(screen.getByLabelText("本次学习任务")).toHaveValue("学习英语"));
    expect(screen.getByRole("timer", { name: "剩余时间 45:00" })).toBeInTheDocument();
  });

  it("updates only the duration when task name is null", async () => {
    queueResponse({ task_name: null, duration_minutes: 60 });
    render(<FocusTimer />);
    const taskInput = await screen.findByLabelText("本次学习任务");
    fireEvent.change(taskInput, { target: { value: "保留这个任务" } });

    await submitAiText("专注60分钟");

    expect(await screen.findByRole("timer", { name: "剩余时间 01:00:00" })).toBeInTheDocument();
    expect(screen.getByLabelText("本次学习任务")).toHaveValue("保留这个任务");
  });

  it("synchronizes a non-preset 37-minute result to the custom duration UI", async () => {
    queueResponse({ task_name: "写代码", duration_minutes: 37 });
    render(<FocusTimer />);

    await submitAiText("写代码37分钟");

    expect(await screen.findByRole("timer", { name: "剩余时间 37:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "自定义" })).toHaveClass("active");
    expect(screen.getByLabelText("分钟")).toHaveValue(37);
    expect(screen.getByRole("button", { name: "开始专注" })).toBeInTheDocument();
  });

  it("shows a backend error without changing the existing settings", async () => {
    queueResponse({}, { ok: false, status: 503 });
    render(<FocusTimer />);

    await submitAiText("学习高数45分钟");

    expect(await screen.findByRole("alert")).toHaveTextContent("AI 服务暂时无法完成解析，请稍后再试");
    expect(screen.getByLabelText("本次学习任务")).toHaveValue("");
    expect(screen.getByRole("timer", { name: "剩余时间 45:00" })).toBeInTheDocument();
  });

  it("reports when the backend found no effective fields", async () => {
    queueResponse({ task_name: null, duration_minutes: null });
    render(<FocusTimer />);

    await submitAiText("随便专注一下");

    expect(await screen.findByRole("alert")).toHaveTextContent("没有识别出任务或时长");
  });

  it("disables AI changes while the free-focus timer is running or paused", async () => {
    render(<FocusTimer />);
    fireEvent.click(await screen.findByRole("button", { name: "开始专注" }));

    expect(await screen.findByLabelText("用自然语言设置自由专注")).toBeDisabled();
    expect(screen.getByRole("button", { name: "AI 填写" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "暂停" }));
    await screen.findByRole("button", { name: "继续专注" });
    expect(screen.getByLabelText("用自然语言设置自由专注")).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
