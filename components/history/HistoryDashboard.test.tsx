import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "@/lib/storage";
import type { FocusSession } from "@/types/focus-session";
import { HistoryDashboard } from "./HistoryDashboard";

function session(
  id: string,
  taskName: string,
  date: Date,
  options: Partial<FocusSession> = {},
): FocusSession {
  return {
    id,
    taskName,
    category: "数学",
    plannedSeconds: 1500,
    focusedSeconds: 1500,
    startedAt: date.getTime() - 1_500_000,
    endedAt: date.getTime(),
    status: "completed",
    ...options,
  };
}

describe("HistoryDashboard", () => {
  const today = new Date(2026, 6, 17, 12);
  const records = [
    session("today-math", "今天的数学", new Date(2026, 6, 17, 10)),
    session("project", "昨日项目", new Date(2026, 6, 16, 18), {
      category: "项目",
      focusedSeconds: 600,
      status: "stopped",
      mode: "pomodoro",
      pomodoroRound: 2,
      pomodoroRoundsTotal: 4,
    }),
  ];

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(today);
    localStorage.removeItem(STORAGE_KEYS.sessions);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.removeItem(STORAGE_KEYS.sessions);
  });

  it("selects today by default and renders legacy free-focus records", async () => {
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(records));
    render(<HistoryDashboard />);

    await screen.findAllByText("今天的数学");
    const todayCell = screen.getByRole("button", { name: /2026年7月17日.*专注25 分钟/ });
    await waitFor(() => expect(todayCell).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByRole("heading", { name: /7月17日.*星期五/ })).toBeInTheDocument();
    expect(screen.getAllByText("自由专注").length).toBeGreaterThan(0);
    expect(screen.getByTestId("heatmap-scroll-container")).toBeInTheDocument();
  });

  it("shares category filtering across overview, heatmap, details and list", async () => {
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(records));
    render(<HistoryDashboard />);
    await screen.findAllByText("今天的数学");

    fireEvent.change(screen.getByLabelText("历史分类"), { target: { value: "项目" } });

    const projectCell = screen.getByRole("button", { name: /2026年7月16日.*专注10 分钟/ });
    expect(projectCell).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: /7月16日.*星期四/ })).toBeInTheDocument();
    expect(screen.queryByText("今天的数学")).not.toBeInTheDocument();
    expect(screen.getAllByText("昨日项目").length).toBeGreaterThan(0);

    const overview = screen.getByRole("region", { name: "历史概览" });
    expect(within(overview).getByText("10 分钟")).toBeInTheDocument();
    expect(within(overview).getByText("0 次")).toBeInTheDocument();
  });

  it("shows the selected day's tasks after clicking a heatmap date", async () => {
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(records));
    render(<HistoryDashboard />);
    await screen.findAllByText("今天的数学");

    fireEvent.click(screen.getByRole("button", { name: /2026年7月16日.*专注10 分钟/ }));

    expect(await screen.findByRole("heading", { name: /7月16日.*星期四/ })).toBeInTheDocument();
    expect(screen.getAllByText("昨日项目").length).toBeGreaterThan(0);
    expect(screen.getAllByText("番茄 · 第 2/4 轮").length).toBeGreaterThan(0);
  });

  it("updates the heatmap and selection immediately after deleting the final selected record", async () => {
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(records));
    render(<HistoryDashboard />);
    await screen.findAllByText("今天的数学");

    fireEvent.click(screen.getByRole("button", { name: "删除记录：今天的数学" }));
    expect(screen.getByRole("alertdialog", { name: "确认删除“今天的数学”？" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));

    await waitFor(() => expect(screen.queryByText("今天的数学")).not.toBeInTheDocument());
    const fallbackCell = screen.getByRole("button", { name: /2026年7月16日.*专注10 分钟/ });
    await waitFor(() => expect(fallbackCell).toHaveAttribute("aria-pressed", "true"));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions) ?? "[]")).toHaveLength(1);
  });

  it("requires confirmation before clearing and then keeps a complete empty heatmap", async () => {
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(records));
    render(<HistoryDashboard />);
    await screen.findAllByText("今天的数学");

    fireEvent.click(screen.getByRole("button", { name: "清空全部" }));
    expect(screen.getByRole("alertdialog", { name: "清空全部记录？" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "确认清空" }));

    await screen.findByText(/这里会逐渐长出属于你的学习轨迹/);
    expect(screen.getAllByRole("button", { name: /强度等级 0/ }).length).toBeGreaterThanOrEqual(365);
    expect(localStorage.getItem(STORAGE_KEYS.sessions)).toBe("[]");
  });
});
