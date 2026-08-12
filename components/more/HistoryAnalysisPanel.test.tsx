import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "@/lib/storage";
import type { HistoryAnalyzeResponse } from "@/types/history-analysis";
import type { HistoryAnalyzer } from "./HistoryAnalysisPanel";
import { HistoryAnalysisPanel } from "./HistoryAnalysisPanel";

const today = new Date(2026, 7, 12, 12);
const storedSession = {
  id: "math",
  taskName: "高数",
  category: "数学",
  plannedSeconds: 2_700,
  focusedSeconds: 2_700,
  startedAt: new Date(2026, 7, 12, 9).getTime(),
  endedAt: new Date(2026, 7, 12, 9, 45).getTime(),
  status: "completed",
};

const response = {
  stats: {
    period_days: 7 as const,
    start_date: "2026-08-06",
    end_date: "2026-08-12",
    total_focused_seconds: 2_700,
    focus_count: 1,
    average_focus_seconds: 2_700,
    main_tasks: [{ task_name: "高数", focused_seconds: 2_700 }],
  },
  analysis: {
    summary: "最近一周的专注主题清晰。",
    patterns: ["主要投入集中在高数。"],
    suggestions: ["继续保持清晰的单次专注目标。"],
  },
};

describe("HistoryAnalysisPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(today);
    localStorage.removeItem(STORAGE_KEYS.sessions);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.removeItem(STORAGE_KEYS.sessions);
  });

  it("shows deterministic statistics before the AI response, then one compact analysis card", async () => {
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify([storedSession]));
    let resolve!: (value: HistoryAnalyzeResponse) => void;
    const analyzer: HistoryAnalyzer = vi.fn(() => new Promise<HistoryAnalyzeResponse>((done) => { resolve = done; }));
    render(<HistoryAnalysisPanel analyzer={analyzer} />);

    expect((await screen.findAllByText("45 分钟")).length).toBe(3);
    expect(screen.getByText("1 次")).toBeInTheDocument();
    await waitFor(() => expect(analyzer).toHaveBeenCalledTimes(1));
    expect((await screen.findByText("正在整理你的专注规律…")).closest("[role='status']")).not.toBeNull();
    expect(screen.getByText("高数")).toBeInTheDocument();

    resolve(response);
    const card = await screen.findByRole("article", { name: "简短分析" });
    expect(within(card).getByText(response.analysis.summary)).toBeInTheDocument();
    expect(within(card).getByText(response.analysis.patterns[0])).toBeInTheDocument();
    expect(within(card).getByText(response.analysis.suggestions[0])).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("does not call AI when the recent period is empty", async () => {
    const analyzer: HistoryAnalyzer = vi.fn();
    render(<HistoryAnalysisPanel analyzer={analyzer} />);

    expect(await screen.findByText("最近 7 天还没有可分析的专注记录。")).toBeInTheDocument();
    expect(screen.getByText("完成一次专注后，这里会根据最近 7 天的统计给出简短规律和建议。")).toBeInTheDocument();
    expect(analyzer).not.toHaveBeenCalled();
  });

  it("keeps statistics visible and offers a single retry after an AI failure", async () => {
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify([storedSession]));
    const analyzer: HistoryAnalyzer = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response);
    render(<HistoryAnalysisPanel analyzer={analyzer} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("关键统计仍可正常查看");
    expect(screen.getAllByText("45 分钟")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "重试" }));

    await waitFor(() => expect(analyzer).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(response.analysis.summary)).toBeInTheDocument();
  });

  it("does not duplicate the analysis request during a Strict Mode effect replay", async () => {
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify([storedSession]));
    const analyzer: HistoryAnalyzer = vi.fn().mockResolvedValue(response);

    render(<StrictMode><HistoryAnalysisPanel analyzer={analyzer} /></StrictMode>);

    expect(await screen.findByText(response.analysis.summary)).toBeInTheDocument();
    expect(analyzer).toHaveBeenCalledTimes(1);
  });

  it("treats an empty AI result as unavailable without hiding local statistics", async () => {
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify([storedSession]));
    const analyzer: HistoryAnalyzer = vi.fn().mockResolvedValue({
      ...response,
      analysis: null,
    });

    render(<HistoryAnalysisPanel analyzer={analyzer} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("关键统计仍可正常查看");
    expect(screen.getAllByText("45 分钟")).toHaveLength(3);
  });
});
