import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PomodoroApiError, getPomodoroParseUrl, parsePomodoroText } from "./pomodoro-api";

function responseWith(payload: unknown, options: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

const completeResult = {
  task_name: "物理笔记",
  focus_minutes: 50,
  short_break_minutes: 10,
  rounds: 4,
  long_break_minutes: 20,
};

describe("Pomodoro API client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    delete process.env.NEXT_PUBLIC_AI_API_BASE_URL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_AI_API_BASE_URL;
  });

  it("posts trimmed text to the same-origin Pomodoro endpoint", async () => {
    vi.mocked(fetch).mockResolvedValue(responseWith(completeResult));

    await expect(parsePomodoroText("  物理笔记50分钟，休息10分钟，4轮  ")).resolves.toEqual(completeResult);
    expect(fetch).toHaveBeenCalledWith("/api/v1/pomodoro/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "物理笔记50分钟，休息10分钟，4轮" }),
    });
  });

  it("uses the shared configured API base URL", () => {
    process.env.NEXT_PUBLIC_AI_API_BASE_URL = "https://ai.example.com/api/";
    expect(getPomodoroParseUrl()).toBe("https://ai.example.com/api/v1/pomodoro/parse");
  });

  it("accepts null fields but rejects missing or out-of-range fields", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(responseWith({
      task_name: "美股视频",
      focus_minutes: 45,
      short_break_minutes: null,
      rounds: 2,
      long_break_minutes: null,
    }));
    await expect(parsePomodoroText("美股视频45分钟，两轮")).resolves.toMatchObject({ rounds: 2, short_break_minutes: null });

    vi.mocked(fetch).mockResolvedValueOnce(responseWith({ ...completeResult, rounds: 1 }));
    await expect(parsePomodoroText("一轮")).rejects.toMatchObject({ kind: "invalid-response" } satisfies Partial<PomodoroApiError>);

    vi.mocked(fetch).mockResolvedValueOnce(responseWith({ task_name: "物理笔记" }));
    await expect(parsePomodoroText("物理笔记")).rejects.toMatchObject({ kind: "invalid-response" } satisfies Partial<PomodoroApiError>);
  });

  it("distinguishes backend and network failures", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(responseWith({}, { ok: false, status: 503 }));
    await expect(parsePomodoroText("4轮")).rejects.toMatchObject({ kind: "backend", status: 503 } satisfies Partial<PomodoroApiError>);

    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("offline"));
    await expect(parsePomodoroText("4轮")).rejects.toMatchObject({ kind: "network" } satisfies Partial<PomodoroApiError>);
  });
});
