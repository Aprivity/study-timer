import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HistoryAnalyzeRequest } from "@/types/history-analysis";
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
const currentStats = {
  period_days: 7 as const,
  start_date: "2026-08-06",
  end_date: "2026-08-12",
  total_focused_seconds: 0,
  focus_count: 0,
  average_focus_seconds: 0,
  main_tasks: [],
};
const previousStats = {
  ...currentStats,
  start_date: "2026-07-30",
  end_date: "2026-08-05",
};
const stableTrend = {
  direction: "stable" as const,
  total_focused_seconds_change: 0,
  total_focused_seconds_change_percent: 0,
  focus_count_change: 0,
  average_focus_seconds_change: 0,
  task_changes: [],
};
const emptyResponse = {
  stats: currentStats,
  previous_stats: previousStats,
  trend: stableTrend,
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

  it("posts only two seven-day aggregate packets", async () => {
    vi.mocked(fetch).mockResolvedValue(responseWith(emptyResponse));

    await expect(analyzeHistory(request)).resolves.toEqual(emptyResponse);
    expect(fetch).toHaveBeenCalledWith("/api/v1/history/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: undefined,
    });
    expect(request.days).toHaveLength(7);
    expect(request.previous_period?.days).toHaveLength(7);
    expect(JSON.stringify(request)).not.toContain("startedAt");
    expect(JSON.stringify(request)).not.toContain("endedAt");
  });

  it("still accepts the original Phase 1 response for a legacy request", async () => {
    const legacyRequest: HistoryAnalyzeRequest = {
      start_date: request.start_date,
      end_date: request.end_date,
      days: request.days,
      tasks: request.tasks,
    };
    const legacyResponse = { stats: currentStats, analysis: null };
    vi.mocked(fetch).mockResolvedValue(responseWith(legacyResponse));

    await expect(analyzeHistory(legacyRequest)).resolves.toEqual(legacyResponse);
  });

  it("uses the shared configured API base URL", () => {
    process.env.NEXT_PUBLIC_AI_API_BASE_URL = "https://ai.example.com/api/";
    expect(getHistoryAnalyzeUrl()).toBe("https://ai.example.com/api/v1/history/analyze");
  });

  it("rejects statistics or trends that disagree with local calculations", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(responseWith({
      ...emptyResponse,
      stats: { ...currentStats, total_focused_seconds: 1 },
    }));
    await expect(analyzeHistory(request)).rejects.toMatchObject({
      kind: "invalid-response",
    } satisfies Partial<HistoryAnalysisApiError>);

    vi.mocked(fetch).mockResolvedValueOnce(responseWith({
      ...emptyResponse,
      trend: { ...stableTrend, focus_count_change: 1 },
    }));
    await expect(analyzeHistory(request)).rejects.toMatchObject({
      kind: "invalid-response",
    });
  });

  it("rejects unknown fields and malformed AI content", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(responseWith({ ...emptyResponse, action: "start" }));
    await expect(analyzeHistory(request)).rejects.toMatchObject({ kind: "invalid-response" });

    vi.mocked(fetch).mockResolvedValueOnce(responseWith({
      ...emptyResponse,
      analysis: { summary: "总结", patterns: [], suggestions: ["建议"] },
    }));
    await expect(analyzeHistory(request)).rejects.toMatchObject({ kind: "invalid-response" });
  });

  it("distinguishes backend and network failures", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(responseWith({}, { ok: false, status: 503 }));
    await expect(analyzeHistory(request)).rejects.toMatchObject({ kind: "backend", status: 503 });

    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("offline"));
    await expect(analyzeHistory(request)).rejects.toMatchObject({ kind: "network" });
  });
});
