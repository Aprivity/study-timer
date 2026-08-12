import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHistoryAnalyzeRequest } from "./history-analysis";
import {
  generateHistoryPlanDraft,
  getHistoryPlanDraftUrl,
  type HistoryPlanDraftApiError,
} from "./history-plan-draft-api";
import type { HistoryPlanDraftRequest } from "@/types/history-plan-draft";

function responseWith(payload: unknown, options: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

const aggregate = createHistoryAnalyzeRequest([], new Date(2026, 7, 12, 12));
aggregate.tasks = [{ task_name: "高数", focused_seconds: 2_700, focus_count: 1 }];
aggregate.days[6] = {
  ...aggregate.days[6],
  focused_seconds: 2_700,
  focus_count: 1,
};
const request: HistoryPlanDraftRequest = {
  ...aggregate,
  actions: ["保持当前单次专注节奏，下一阶段继续采用相近的单次时长。"],
};
const validResponse = {
  plan: {
    title: "下一阶段计划",
    items: [{ task_name: "高数", action: "继续保持当前投入" }],
  },
};

describe("history plan draft API client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    delete process.env.NEXT_PUBLIC_AI_API_BASE_URL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_AI_API_BASE_URL;
  });

  it("posts only aggregate history and selected actions", async () => {
    vi.mocked(fetch).mockResolvedValue(responseWith(validResponse));

    await expect(generateHistoryPlanDraft(request)).resolves.toEqual(validResponse);
    expect(fetch).toHaveBeenCalledWith("/api/v1/history/plan-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: undefined,
    });
    const packet = JSON.stringify(request);
    expect(packet).not.toContain("startedAt");
    expect(packet).not.toContain("endedAt");
  });

  it("uses the shared configured API base URL", () => {
    process.env.NEXT_PUBLIC_AI_API_BASE_URL = "https://ai.example.com/api/";
    expect(getHistoryPlanDraftUrl()).toBe(
      "https://ai.example.com/api/v1/history/plan-draft",
    );
  });

  it.each([
    {
      plan: {
        title: "下一阶段计划",
        items: [{ task_name: "量子物理", action: "开始学习" }],
      },
    },
    {
      plan: {
        title: "下一阶段计划",
        items: [
          { task_name: "高数", action: "保持投入" },
          { task_name: "高数", action: "恢复投入" },
        ],
      },
    },
    {
      plan: {
        title: "下一阶段计划",
        items: [
          { task_name: "高数", action: "一" },
          { task_name: "高数二", action: "二" },
          { task_name: "高数三", action: "三" },
          { task_name: "高数四", action: "四" },
        ],
      },
    },
  ])("rejects illegal, duplicate, or oversized plans", async (payload) => {
    vi.mocked(fetch).mockResolvedValue(responseWith(payload));

    await expect(generateHistoryPlanDraft(request)).rejects.toMatchObject({
      kind: "invalid-response",
    } satisfies Partial<HistoryPlanDraftApiError>);
  });

  it("distinguishes backend and network failures", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(responseWith({}, { ok: false, status: 503 }));
    await expect(generateHistoryPlanDraft(request)).rejects.toMatchObject({
      kind: "backend",
      status: 503,
    });

    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("offline"));
    await expect(generateHistoryPlanDraft(request)).rejects.toMatchObject({
      kind: "network",
    });
  });
});
