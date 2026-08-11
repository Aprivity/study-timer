import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTimerParseUrl, parseTimerText } from "./timer-api";

function responseWith(payload: unknown, options: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

const freeResult = {
  mode: "free",
  task_name: "美股视频",
  duration_minutes: 50,
  focus_minutes: null,
  short_break_minutes: null,
  rounds: null,
  long_break_minutes: null,
};

const pomodoroResult = {
  mode: "pomodoro",
  task_name: "物理笔记",
  duration_minutes: null,
  focus_minutes: 50,
  short_break_minutes: 10,
  rounds: 4,
  long_break_minutes: 20,
};

describe("unified timer API client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    delete process.env.NEXT_PUBLIC_AI_API_BASE_URL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_AI_API_BASE_URL;
  });

  it("posts trimmed text to the same-origin unified endpoint", async () => {
    vi.mocked(fetch).mockResolvedValue(responseWith(freeResult));

    await expect(parseTimerText("  看50分钟美股视频  ")).resolves.toEqual(freeResult);
    expect(fetch).toHaveBeenCalledWith("/api/v1/timer/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "看50分钟美股视频" }),
    });
  });

  it("uses the shared configured API base URL", () => {
    process.env.NEXT_PUBLIC_AI_API_BASE_URL = "https://ai.example.com/api/";
    expect(getTimerParseUrl()).toBe("https://ai.example.com/api/v1/timer/parse");
  });

  it("accepts valid free and Pomodoro responses", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(responseWith(freeResult));
    await expect(parseTimerText("看50分钟美股视频")).resolves.toEqual(freeResult);

    vi.mocked(fetch).mockResolvedValueOnce(responseWith(pomodoroResult));
    await expect(parseTimerText("物理笔记50分钟，休息10分钟，4轮")).resolves.toEqual(pomodoroResult);
  });

  it("rejects missing, out-of-range, cross-mode, and action fields", async () => {
    const invalidPayloads = [
      { mode: "free", task_name: "美股视频" },
      { ...freeResult, duration_minutes: 721 },
      { ...freeResult, rounds: 4 },
      { ...pomodoroResult, duration_minutes: 50 },
      { ...freeResult, action: "start" },
    ];

    for (const payload of invalidPayloads) {
      vi.mocked(fetch).mockResolvedValueOnce(responseWith(payload));
      await expect(parseTimerText("设置计时器")).rejects.toMatchObject({ kind: "invalid-response" });
    }
  });

  it("distinguishes backend and network failures", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(responseWith({}, { ok: false, status: 503 }));
    await expect(parseTimerText("学习50分钟")).rejects.toMatchObject({ kind: "backend", status: 503 });

    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("offline"));
    await expect(parseTimerText("学习50分钟")).rejects.toMatchObject({ kind: "network" });
  });
});
