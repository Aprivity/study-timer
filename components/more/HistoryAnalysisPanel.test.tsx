import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "@/lib/storage";
import type { HistoryAnalyzeResponse } from "@/types/history-analysis";
import type { HistoryPlanDraftResponse } from "@/types/history-plan-draft";
import type {
  HistoryAnalyzer,
  HistoryPlanDraftGenerator,
} from "./HistoryAnalysisPanel";
import { HistoryAnalysisPanel } from "./HistoryAnalysisPanel";

const today = new Date(2026, 7, 12, 12);
const storedSession = {
  id: "math-current",
  taskName: "高数",
  category: "数学",
  plannedSeconds: 2_700,
  focusedSeconds: 2_700,
  startedAt: new Date(2026, 7, 12, 9).getTime(),
  endedAt: new Date(2026, 7, 12, 9, 45).getTime(),
  status: "completed",
};
const previousStoredSession = {
  ...storedSession,
  id: "math-previous",
  plannedSeconds: 1_800,
  focusedSeconds: 1_800,
  startedAt: new Date(2026, 7, 5, 9).getTime(),
  endedAt: new Date(2026, 7, 5, 9, 30).getTime(),
};

const response: HistoryAnalyzeResponse = {
  stats: {
    period_days: 7,
    start_date: "2026-08-06",
    end_date: "2026-08-12",
    total_focused_seconds: 2_700,
    focus_count: 1,
    average_focus_seconds: 2_700,
    main_tasks: [{ task_name: "高数", focused_seconds: 2_700 }],
  },
  previous_stats: {
    period_days: 7,
    start_date: "2026-07-30",
    end_date: "2026-08-05",
    total_focused_seconds: 1_800,
    focus_count: 1,
    average_focus_seconds: 1_800,
    main_tasks: [{ task_name: "高数", focused_seconds: 1_800 }],
  },
  trend: {
    direction: "up",
    total_focused_seconds_change: 900,
    total_focused_seconds_change_percent: 50,
    focus_count_change: 0,
    average_focus_seconds_change: 900,
    task_changes: [{
      task_name: "高数",
      current_focused_seconds: 2_700,
      previous_focused_seconds: 1_800,
      change_seconds: 900,
    }],
  },
  analysis: {
    summary: "最近 7 天的专注投入有所增加。",
    patterns: ["高数投入比前一周期更集中。"],
    suggestions: ["保持当前单次专注节奏，下一阶段继续采用相近的单次时长。"],
  },
};

const planResponse: HistoryPlanDraftResponse = {
  plan: {
    title: "下一阶段计划",
    items: [{ task_name: "高数", action: "继续保持当前投入" }],
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

  it("shows the local trend before AI, then one compact analysis card", async () => {
    localStorage.setItem(
      STORAGE_KEYS.sessions,
      JSON.stringify([storedSession, previousStoredSession]),
    );
    let resolve!: (value: HistoryAnalyzeResponse) => void;
    const analyzer: HistoryAnalyzer = vi.fn(
      () => new Promise<HistoryAnalyzeResponse>((done) => { resolve = done; }),
    );
    render(<HistoryAnalysisPanel analyzer={analyzer} />);

    expect(await screen.findByText("↑ 50%")).toBeInTheDocument();
    expect(screen.getByText("前 7 天 30 分钟")).toBeInTheDocument();
    expect(screen.getByText("次数 持平")).toBeInTheDocument();
    expect(screen.getByText("平均单次 +15 分钟")).toBeInTheDocument();
    await waitFor(() => expect(analyzer).toHaveBeenCalledTimes(1));
    expect(screen.getByText("正在整理你的专注趋势…").closest("[role='status']")).not.toBeNull();
    const packet = JSON.stringify(vi.mocked(analyzer).mock.calls[0][0]);
    expect(packet).not.toContain("startedAt");
    expect(packet).not.toContain("endedAt");

    resolve(response);
    const card = await screen.findByRole("article", { name: "简短趋势" });
    expect(within(card).getByText(response.analysis?.summary ?? "")).toBeInTheDocument();
    expect(within(card).getByText(response.analysis?.patterns[0] ?? "")).toBeInTheDocument();
    expect(within(card).getByRole("heading", { name: "下一步建议" })).toBeInTheDocument();
    expect(within(card).getByText(response.analysis?.suggestions[0] ?? "")).toBeInTheDocument();
    expect(within(card).getByRole("heading", { name: "下一步建议" }).parentElement)
      .toHaveClass("analysis-actions");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("does not call AI when both periods are empty", async () => {
    const analyzer: HistoryAnalyzer = vi.fn();
    render(<HistoryAnalysisPanel analyzer={analyzer} />);

    expect(await screen.findByText("最近 7 天还没有可分析的专注记录。")).toBeInTheDocument();
    expect(screen.getByText(
      "完成一次专注后，这里会根据两个 7 天周期的统计给出简短趋势和建议。",
    )).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "生成下一阶段计划" }))
      .not.toBeInTheDocument();
    expect(analyzer).not.toHaveBeenCalled();
  });

  it("still analyzes a decline when only the previous period has history", async () => {
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify([previousStoredSession]));
    const analyzer: HistoryAnalyzer = vi.fn().mockResolvedValue({
      ...response,
      stats: {
        ...response.stats,
        total_focused_seconds: 0,
        focus_count: 0,
        average_focus_seconds: 0,
        main_tasks: [],
      },
      trend: {
        direction: "down",
        total_focused_seconds_change: -1_800,
        total_focused_seconds_change_percent: -100,
        focus_count_change: -1,
        average_focus_seconds_change: -1_800,
        task_changes: [{
          task_name: "高数",
          current_focused_seconds: 0,
          previous_focused_seconds: 1_800,
          change_seconds: -1_800,
        }],
      },
    });
    render(<HistoryAnalysisPanel analyzer={analyzer} />);

    expect(await screen.findByText("↓ 100%")).toBeInTheDocument();
    expect(await screen.findByText(response.analysis?.summary ?? "")).toBeInTheDocument();
    expect(analyzer).toHaveBeenCalledTimes(1);
  });

  it("keeps statistics and trends visible and offers one retry after AI failure", async () => {
    localStorage.setItem(
      STORAGE_KEYS.sessions,
      JSON.stringify([storedSession, previousStoredSession]),
    );
    const analyzer: HistoryAnalyzer = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response);
    render(<HistoryAnalysisPanel analyzer={analyzer} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("关键统计仍可正常查看");
    expect(screen.getByText("↑ 50%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重试" }));

    await waitFor(() => expect(analyzer).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(response.analysis?.summary ?? "")).toBeInTheDocument();
  });

  it("does not duplicate the analysis request during a Strict Mode effect replay", async () => {
    localStorage.setItem(
      STORAGE_KEYS.sessions,
      JSON.stringify([storedSession, previousStoredSession]),
    );
    const analyzer: HistoryAnalyzer = vi.fn().mockResolvedValue(response);

    render(<StrictMode><HistoryAnalysisPanel analyzer={analyzer} /></StrictMode>);

    expect(await screen.findByText(response.analysis?.summary ?? "")).toBeInTheDocument();
    expect(analyzer).toHaveBeenCalledTimes(1);
  });

  it("treats an empty AI result as unavailable without hiding the local trend", async () => {
    localStorage.setItem(
      STORAGE_KEYS.sessions,
      JSON.stringify([storedSession, previousStoredSession]),
    );
    const analyzer: HistoryAnalyzer = vi.fn().mockResolvedValue({
      ...response,
      analysis: null,
    });

    render(<HistoryAnalysisPanel analyzer={analyzer} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("关键统计仍可正常查看");
    expect(screen.getByText("↑ 50%")).toBeInTheDocument();
  });

  it("generates one editable temporary plan from aggregates and current actions", async () => {
    localStorage.setItem(
      STORAGE_KEYS.sessions,
      JSON.stringify([storedSession, previousStoredSession]),
    );
    const analyzer: HistoryAnalyzer = vi.fn().mockResolvedValue(response);
    let resolvePlan!: (value: HistoryPlanDraftResponse) => void;
    const planDraftGenerator: HistoryPlanDraftGenerator = vi.fn(
      () => new Promise<HistoryPlanDraftResponse>((resolve) => { resolvePlan = resolve; }),
    );
    render(
      <HistoryAnalysisPanel
        analyzer={analyzer}
        planDraftGenerator={planDraftGenerator}
      />,
    );

    const generateButton = await screen.findByRole(
      "button",
      { name: "生成下一阶段计划" },
    );
    fireEvent.click(generateButton);

    expect(await screen.findByText("正在把趋势和建议整理成简短草稿…"))
      .toBeInTheDocument();
    expect(planDraftGenerator).toHaveBeenCalledTimes(1);
    const packet = JSON.stringify(vi.mocked(planDraftGenerator).mock.calls[0][0]);
    expect(packet).toContain(response.analysis?.suggestions[0] ?? "");
    expect(packet).not.toContain("startedAt");
    expect(packet).not.toContain("endedAt");

    resolvePlan(planResponse);
    expect(await screen.findByRole("heading", { name: "下一阶段计划" }))
      .toBeInTheDocument();
    const actionInput = screen.getByRole("textbox", { name: "计划行动 1" });
    expect(actionInput).toHaveValue("继续保持当前投入");
    fireEvent.change(actionInput, { target: { value: "保持两次完整练习" } });
    expect(actionInput).toHaveValue("保持两次完整练习");
    expect(screen.getByText("草稿可直接修改，仅供你确认；不会保存或自动执行。"))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "关闭草稿" }));
    expect(screen.queryByRole("heading", { name: "下一阶段计划" }))
      .not.toBeInTheDocument();
  });

  it("prevents duplicate concurrent plan requests and allows regeneration", async () => {
    localStorage.setItem(
      STORAGE_KEYS.sessions,
      JSON.stringify([storedSession, previousStoredSession]),
    );
    const analyzer: HistoryAnalyzer = vi.fn().mockResolvedValue(response);
    let resolvePlan!: (value: HistoryPlanDraftResponse) => void;
    const planDraftGenerator: HistoryPlanDraftGenerator = vi.fn(
      () => new Promise<HistoryPlanDraftResponse>((resolve) => { resolvePlan = resolve; }),
    );
    render(
      <HistoryAnalysisPanel
        analyzer={analyzer}
        planDraftGenerator={planDraftGenerator}
      />,
    );

    const button = await screen.findByRole("button", { name: "生成下一阶段计划" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(planDraftGenerator).toHaveBeenCalledTimes(1);

    resolvePlan(planResponse);
    expect(await screen.findByRole("heading", { name: "下一阶段计划" }))
      .toBeInTheDocument();
    vi.mocked(planDraftGenerator).mockResolvedValue(planResponse);
    fireEvent.click(screen.getByRole("button", { name: "重新生成" }));
    await waitFor(() => expect(planDraftGenerator).toHaveBeenCalledTimes(2));
  });

  it("keeps the completed analysis visible when plan generation fails", async () => {
    localStorage.setItem(
      STORAGE_KEYS.sessions,
      JSON.stringify([storedSession, previousStoredSession]),
    );
    const analyzer: HistoryAnalyzer = vi.fn().mockResolvedValue(response);
    const planDraftGenerator: HistoryPlanDraftGenerator = vi.fn()
      .mockRejectedValue(new Error("offline"));
    render(
      <HistoryAnalysisPanel
        analyzer={analyzer}
        planDraftGenerator={planDraftGenerator}
      />,
    );

    fireEvent.click(await screen.findByRole(
      "button",
      { name: "生成下一阶段计划" },
    ));

    expect(await screen.findByRole("alert"))
      .toHaveTextContent("现有统计、趋势和建议不受影响");
    expect(screen.getByText(response.analysis?.summary ?? "")).toBeInTheDocument();
    expect(screen.getByText("↑ 50%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新生成计划" }))
      .toBeInTheDocument();
  });

  it("renders at most three draft rows with mobile stacking hooks", async () => {
    localStorage.setItem(
      STORAGE_KEYS.sessions,
      JSON.stringify([storedSession, previousStoredSession]),
    );
    const analyzer: HistoryAnalyzer = vi.fn().mockResolvedValue(response);
    const planDraftGenerator: HistoryPlanDraftGenerator = vi.fn().mockResolvedValue({
      plan: {
        title: "下一阶段计划",
        items: [
          { task_name: "高数", action: "保持投入" },
          { task_name: "英语", action: "恢复投入" },
          { task_name: "项目", action: "维持节奏" },
        ],
      },
    });
    render(
      <HistoryAnalysisPanel
        analyzer={analyzer}
        planDraftGenerator={planDraftGenerator}
      />,
    );

    fireEvent.click(await screen.findByRole(
      "button",
      { name: "生成下一阶段计划" },
    ));

    expect(await screen.findAllByRole("textbox")).toHaveLength(6);
    expect(document.querySelectorAll(".plan-draft-item")).toHaveLength(3);
    expect(document.querySelector(".plan-draft-heading")).not.toBeNull();
  });
});
