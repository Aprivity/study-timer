import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "@/app/settings/page";
import { BackgroundProvider } from "@/components/background/BackgroundProvider";
import { FocusTimer } from "./FocusTimer";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function queueResponse(payload: unknown, options: { ok?: boolean; status?: number } = {}) {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response);
}

function freeResult(overrides: Record<string, unknown> = {}) {
  return {
    mode: "free",
    task_name: "美股视频",
    duration_minutes: 50,
    focus_minutes: null,
    short_break_minutes: null,
    rounds: null,
    long_break_minutes: null,
    ...overrides,
  };
}

function pomodoroResult(overrides: Record<string, unknown> = {}) {
  return {
    mode: "pomodoro",
    task_name: "物理笔记",
    duration_minutes: null,
    focus_minutes: 50,
    short_break_minutes: 10,
    rounds: 4,
    long_break_minutes: 20,
    ...overrides,
  };
}

async function submitAiText(text: string) {
  const input = await screen.findByLabelText("用自然语言设置计时器");
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "AI 填写" }));
}

function storedPomodoro() {
  const settings = JSON.parse(window.localStorage.getItem("aprivity-focus:settings") ?? "{}") as {
    pomodoro?: Record<string, number>;
  };
  return settings.pomodoro;
}

describe("FocusTimer unified AI input", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("fills free-focus settings and remains idle until the user starts", async () => {
    queueResponse(freeResult());
    render(<FocusTimer />);

    await submitAiText("看50分钟美股视频");

    await waitFor(() => expect(screen.getByLabelText("本次学习任务")).toHaveValue("美股视频"));
    expect(screen.getByRole("button", { name: "自由专注" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("timer", { name: "剩余时间 50:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始专注" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "暂停" })).not.toBeInTheDocument();
  });

  it("switches to Pomodoro, fills all existing settings, and does not start", async () => {
    queueResponse(pomodoroResult());
    render(<FocusTimer />);

    await submitAiText("物理笔记50分钟，休息10分钟，做4轮，最后休息20分钟");

    await waitFor(() => expect(screen.getByRole("button", { name: "番茄循环" })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByLabelText("本次学习任务")).toHaveValue("物理笔记");
    expect(screen.getByRole("timer", { name: "剩余时间 50:00" })).toBeInTheDocument();
    expect(screen.getByText("第 1 / 4 轮")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始专注" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "暂停" })).not.toBeInTheDocument();
    await waitFor(() => expect(storedPomodoro()).toMatchObject({
      focusMinutes: 50,
      shortBreakMinutes: 10,
      roundsBeforeLongBreak: 4,
      longBreakMinutes: 20,
    }));
  });

  it("keeps null Pomodoro fields unchanged while switching modes", async () => {
    window.localStorage.setItem("aprivity-focus:settings", JSON.stringify({
      timerMode: "free",
      pomodoro: {
        focusMinutes: 40,
        shortBreakMinutes: 7,
        longBreakMinutes: 18,
        roundsBeforeLongBreak: 6,
      },
    }));
    queueResponse(pomodoroResult({
      task_name: "算法刷题",
      focus_minutes: null,
      short_break_minutes: null,
      rounds: 3,
      long_break_minutes: null,
    }));
    render(<FocusTimer />);

    await submitAiText("算法刷题，3轮");

    await waitFor(() => expect(screen.getByRole("button", { name: "番茄循环" })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByLabelText("本次学习任务")).toHaveValue("算法刷题");
    expect(screen.getByRole("timer", { name: "剩余时间 40:00" })).toBeInTheDocument();
    expect(storedPomodoro()).toMatchObject({
      focusMinutes: 40,
      shortBreakMinutes: 7,
      roundsBeforeLongBreak: 3,
      longBreakMinutes: 18,
    });
  });

  it("keeps a null free-focus task and duration from clearing current values", async () => {
    queueResponse(freeResult({ task_name: "英语", duration_minutes: null }));
    render(<FocusTimer />);

    await submitAiText("学习英语");

    await waitFor(() => expect(screen.getByLabelText("本次学习任务")).toHaveValue("英语"));
    expect(screen.getByRole("timer", { name: "剩余时间 45:00" })).toBeInTheDocument();
  });

  it("synchronizes a 37-minute free result to the custom duration UI", async () => {
    queueResponse(freeResult({ task_name: "写代码", duration_minutes: 37 }));
    render(<FocusTimer />);

    await submitAiText("写代码37分钟");

    expect(await screen.findByRole("timer", { name: "剩余时间 37:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "自定义" })).toHaveClass("active");
    expect(screen.getByLabelText("分钟")).toHaveValue(37);
  });

  it("keeps AI-filled Pomodoro values editable in the existing settings page", async () => {
    queueResponse(pomodoroResult({ focus_minutes: 45, short_break_minutes: 8 }));
    const timerView = render(<FocusTimer />);
    await submitAiText("高数网课45分钟，休息8分钟，4轮");
    await waitFor(() => expect(storedPomodoro()).toMatchObject({ focusMinutes: 45, roundsBeforeLongBreak: 4 }));
    timerView.unmount();

    render(<BackgroundProvider><SettingsPage /></BackgroundProvider>);
    const focusInput = await screen.findByRole("spinbutton", { name: /番茄专注时长/ });
    const roundsInput = screen.getByRole("spinbutton", { name: /长休息前轮数/ });
    fireEvent.change(focusInput, { target: { value: "37" } });
    fireEvent.change(roundsInput, { target: { value: "5" } });

    expect(focusInput).toHaveValue(37);
    expect(roundsInput).toHaveValue(5);
    expect(storedPomodoro()).toMatchObject({ focusMinutes: 37, roundsBeforeLongBreak: 5 });
  });

  it("shows one unified input in both modes and disables it while running or paused", async () => {
    render(<FocusTimer />);
    expect(await screen.findAllByLabelText("用自然语言设置计时器")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "番茄循环" }));
    expect(screen.getAllByLabelText("用自然语言设置计时器")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "开始专注" }));

    expect(screen.getByLabelText("用自然语言设置计时器")).toBeDisabled();
    expect(screen.getByRole("button", { name: "AI 填写" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "暂停" }));
    await screen.findByRole("button", { name: "继续专注" });
    expect(screen.getByLabelText("用自然语言设置计时器")).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a late AI result if the user starts while parsing", async () => {
    let resolveResponse!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValueOnce(new Promise<Response>((resolve) => { resolveResponse = resolve; }));
    render(<FocusTimer />);
    await submitAiText("物理笔记50分钟，休息10分钟，4轮");
    await screen.findByRole("button", { name: "解析中" });

    fireEvent.click(screen.getByRole("button", { name: "开始专注" }));
    resolveResponse({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(pomodoroResult()),
    } as unknown as Response);

    expect(await screen.findByRole("alert")).toHaveTextContent("计时状态已改变");
    expect(screen.getByRole("button", { name: "自由专注" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "暂停" })).toBeInTheDocument();
    expect(storedPomodoro()).toBeUndefined();
  });

  it("shows backend and empty-result errors without changing settings", async () => {
    queueResponse({}, { ok: false, status: 503 });
    render(<FocusTimer />);
    await submitAiText("看50分钟美股视频");
    expect(await screen.findByRole("alert")).toHaveTextContent("AI 服务暂时无法完成解析，请稍后再试");
    expect(screen.getByRole("timer", { name: "剩余时间 45:00" })).toBeInTheDocument();

    queueResponse(freeResult({ task_name: null, duration_minutes: null }));
    await submitAiText("随便专注一下");
    expect(await screen.findByRole("alert")).toHaveTextContent("没有识别出可填写的任务或时间设置");
    expect(screen.getByRole("timer", { name: "剩余时间 45:00" })).toBeInTheDocument();
  });
});
