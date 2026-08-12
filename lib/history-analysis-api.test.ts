import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHistoryAnalyzeRequest } from "./history-analysis";
import {
  analyzeHistory,
  getHistoryAnalyzeUrl,
  type HistoryAnalysisApiError,
} from "./history-analysis-api";

function responseWith(payload: unknown, options: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

const request = createHistoryAnalyzeRequest([], new Date(2026, 7, 12, 12));
const emptyResponse = {
  stats: {
    period_days: 7,
    start_date: "2026-08-06",
    end_date: "2026-08-12",
    total_focused_seconds: 0,
    focus_count: 0,
    average_focus_seconds: 0,
    main_tasks: [],
  },
  analysis: null,
};

describe("history analysis API client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    delete process.env.NEXT_PUBLIC_AI_API_BASE_URL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_AI_API_BASE_URL;
  });

  it("posts only the seven-day aggregate packet", async () => {
    vi.mocked(fetch).mockResolvedValue(responseWith(emptyResponse));

    await expect(analyzeHistory(request)).resolves.toEqual(emptyResponse);
    expect(fetch).toHaveBeenCalledWith("/api/v1/history/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: undefined,
    });
    expect(JSON.stringify(request)).not.toContain("startedAt");
    expect(JSON.stringify(request)).not.toContain("endedAt");
  });

  it("uses the shared configured API base URL", () => {
    process.env.NEXT_PUBLIC_AI_API_BASE_URL = "https://ai.example.com/api/";
    expect(getHistoryAnalyzeUrl()).toBe("https://ai.example.com/api/v1/history/analyze");
  });

  it("rejects statistics that disagree with the local program calculation", async () => {
    vi.mocked(fetch).mockResolvedValue(responseWith({
      ...emptyResponse,
      stats: { ...emptyResponse.stats, total_focused_seconds: 1 },
    }));

    await expect(analyzeHistory(request)).rejects.toMatchObject({
      kind: "invalid-response",
    } satisfies Partial<HistoryAnalysisApiError>);
  });

  it("rejects unknown fields and malformed AI content", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(responseWith({ ...emptyResponse, action: "start" }));
    await expect(analyzeHistory(request)).rejects.toMatchObject({ kind: "invalid-response" });

    const withHistory = {
      ...emptyResponse,
      stats: { ...emptyResponse.stats, focus_count: 1 },
      analysis: { summary: "总结", patterns: [], suggestions: ["建议"] },
    };
    vi.mocked(fetch).mockResolvedValueOnce(responseWith(withHistory));
    await expect(analyzeHistory(request)).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("distinguishes backend and network failures", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(responseWith({}, { ok: false, status: 503 }));
    await expect(analyzeHistory(request)).rejects.toMatchObject({ kind: "backend", status: 503 });

    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("offline"));
    await expect(analyzeHistory(request)).rejects.toMatchObject({ kind: "network" });
  });
});
