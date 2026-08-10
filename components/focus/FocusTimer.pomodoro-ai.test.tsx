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

async function enterPomodoroMode() {
  fireEvent.click(await screen.findByRole("button", { name: "番茄循环" }));
  return screen.findByLabelText("用自然语言设置番茄循环");
}

async function submitAiPomodoro(text: string) {
  const input = await screen.findByLabelText("用自然语言设置番茄循环");
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "AI 填写" }));
}

function storedPomodoro() {
  const settings = JSON.parse(window.localStorage.getItem("aprivity-focus:settings") ?? "{}") as {
    pomodoro?: Record<string, number>;
  };
  return settings.pomodoro;
}

describe("FocusTimer AI Pomodoro setup", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("fills a complete configuration and remains idle until the user starts", async () => {
    queueResponse({
      task_name: "物理笔记",
      focus_minutes: 50,
      short_break_minutes: 10,
      rounds: 4,
      long_break_minutes: 20,
    });
    render(<FocusTimer />);
    await enterPomodoroMode();

    await submitAiPomodoro("物理笔记50分钟，休息10分钟，4轮，最后休息20分钟");

    await waitFor(() => expect(screen.getByLabelText("本次学习任务")).toHaveValue("物理笔记"));
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

  it("updates only task and rounds while null fields preserve existing settings", async () => {
    window.localStorage.setItem("aprivity-focus:settings", JSON.stringify({
      timerMode: "pomodoro",
      pomodoro: {
        focusMinutes: 40,
        shortBreakMinutes: 7,
        longBreakMinutes: 18,
        roundsBeforeLongBreak: 6,
      },
    }));
    queueResponse({
      task_name: "算法刷题",
      focus_minutes: null,
      short_break_minutes: null,
      rounds: 3,
      long_break_minutes: null,
    });
    render(<FocusTimer />);

    await submitAiPomodoro("算法刷题，3轮");

    await waitFor(() => expect(screen.getByLabelText("本次学习任务")).toHaveValue("算法刷题"));
    expect(screen.getByRole("timer", { name: "剩余时间 40:00" })).toBeInTheDocument();
    expect(screen.getByText("第 1 / 3 轮")).toBeInTheDocument();
    expect(storedPomodoro()).toMatchObject({
      focusMinutes: 40,
      shortBreakMinutes: 7,
      roundsBeforeLongBreak: 3,
      longBreakMinutes: 18,
    });
  });

  it("keeps AI-filled settings editable in the existing settings page", async () => {
    queueResponse({
      task_name: "高数网课",
      focus_minutes: 45,
      short_break_minutes: 8,
      rounds: 4,
      long_break_minutes: 20,
    });
    const timerView = render(<FocusTimer />);
    await enterPomodoroMode();
    await submitAiPomodoro("高数网课45分钟，休息8分钟，4轮，长休息20分钟");
    await waitFor(() => expect(storedPomodoro()).toMatchObject({ focusMinutes: 45, roundsBeforeLongBreak: 4 }));
    timerView.unmount();

    render(<BackgroundProvider><SettingsPage /></BackgroundProvider>);
    const focusInput = await screen.findByRole("spinbutton", { name: /番茄专注时长/ });
    const roundsInput = screen.getByRole("spinbutton", { name: /长休息前轮数/ });
    expect(focusInput).toHaveValue(45);
    expect(roundsInput).toHaveValue(4);
    fireEvent.change(focusInput, { target: { value: "37" } });
    fireEvent.change(roundsInput, { target: { value: "5" } });

    expect(focusInput).toHaveValue(37);
    expect(roundsInput).toHaveValue(5);
    expect(storedPomodoro()).toMatchObject({ focusMinutes: 37, roundsBeforeLongBreak: 5 });
  });

  it("disables AI changes while the Pomodoro timer is running or paused", async () => {
    render(<FocusTimer />);
    await enterPomodoroMode();
    fireEvent.click(screen.getByRole("button", { name: "开始专注" }));

    expect(await screen.findByLabelText("用自然语言设置番茄循环")).toBeDisabled();
    expect(screen.getByRole("button", { name: "AI 填写" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "暂停" }));
    await screen.findByRole("button", { name: "继续专注" });
    expect(screen.getByLabelText("用自然语言设置番茄循环")).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a late AI result when the user starts while parsing", async () => {
    let resolveResponse!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValueOnce(new Promise<Response>((resolve) => { resolveResponse = resolve; }));
    render(<FocusTimer />);
    await enterPomodoroMode();
    await submitAiPomodoro("物理笔记50分钟，休息10分钟，4轮");
    await screen.findByRole("button", { name: "解析中" });

    fireEvent.click(screen.getByRole("button", { name: "开始专注" }));
    resolveResponse({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        task_name: "物理笔记",
        focus_minutes: 50,
        short_break_minutes: 10,
        rounds: 4,
        long_break_minutes: 20,
      }),
    } as unknown as Response);

    expect(await screen.findByRole("alert")).toHaveTextContent("番茄状态已改变");
    expect(screen.getByRole("button", { name: "暂停" })).toBeInTheDocument();
    expect(storedPomodoro()).toMatchObject({ focusMinutes: 25, shortBreakMinutes: 5, roundsBeforeLongBreak: 4, longBreakMinutes: 15 });
  });

  it("shows an API error without changing the current Pomodoro settings", async () => {
    queueResponse({}, { ok: false, status: 503 });
    render(<FocusTimer />);
    await enterPomodoroMode();

    await submitAiPomodoro("物理笔记50分钟，4轮");

    expect(await screen.findByRole("alert")).toHaveTextContent("AI 服务暂时无法完成解析，请稍后再试");
    expect(screen.getByRole("timer", { name: "剩余时间 25:00" })).toBeInTheDocument();
    expect(screen.getByText("第 1 / 4 轮")).toBeInTheDocument();
  });
});
