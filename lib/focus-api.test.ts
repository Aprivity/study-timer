import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FocusApiError, getFocusParseUrl, parseFocusText } from "./focus-api";

function responseWith(payload: unknown, options: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

describe("focus API client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    delete process.env.NEXT_PUBLIC_AI_API_BASE_URL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_AI_API_BASE_URL;
  });

  it("posts trimmed text to the same-origin API by default", async () => {
    vi.mocked(fetch).mockResolvedValue(responseWith({ task_name: "学习高数", duration_minutes: 45 }));

    await expect(parseFocusText("  学习高数45分钟  ")).resolves.toEqual({ task_name: "学习高数", duration_minutes: 45 });
    expect(fetch).toHaveBeenCalledWith("/api/v1/focus/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "学习高数45分钟" }),
    });
  });

  it("uses a configured API base URL without duplicating slashes", () => {
    process.env.NEXT_PUBLIC_AI_API_BASE_URL = "https://ai.example.com/api/";
    expect(getFocusParseUrl()).toBe("https://ai.example.com/api/v1/focus/parse");
  });

  it("distinguishes backend and network failures", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(responseWith({}, { ok: false, status: 503 }));
    await expect(parseFocusText("学习")).rejects.toMatchObject({ kind: "backend", status: 503 } satisfies Partial<FocusApiError>);

    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("offline"));
    await expect(parseFocusText("学习")).rejects.toMatchObject({ kind: "network" } satisfies Partial<FocusApiError>);
  });

  it("rejects malformed focus results before they reach the timer", async () => {
    vi.mocked(fetch).mockResolvedValue(responseWith({ task_name: "学习", duration_minutes: 721 }));
    await expect(parseFocusText("学习很久")).rejects.toMatchObject({ kind: "invalid-response" } satisfies Partial<FocusApiError>);
  });
});
