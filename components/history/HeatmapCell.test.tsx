import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeatmapCell } from "./HeatmapCell";
import type { DailyFocusSummary } from "@/types/history-analytics";

const summary: DailyFocusSummary = {
  dateKey: "2026-07-17",
  date: new Date(2026, 6, 17),
  focusedSeconds: 7500,
  sessionCount: 3,
  completedCount: 2,
  stoppedCount: 1,
  categorySeconds: { 数学: 4800, 项目: 2700 },
  level: 4,
};

describe("HeatmapCell", () => {
  it("exposes the date, duration, record count, level and selected state", () => {
    render(<HeatmapCell summary={summary} selected today onSelect={vi.fn()} />);
    const button = screen.getByRole("button", { name: /2026年7月17日.*专注2 小时 5 分钟.*共 3 次记录.*强度等级 4.*今天/ });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("data-level", "4");
    expect(button).toHaveClass("selected", "today", "level-4");
    expect(button).toHaveAttribute("tabindex", "0");
  });

  it("selects with a native button interaction and keeps empty dates out of the tab order", () => {
    const onSelect = vi.fn();
    const empty = { ...summary, focusedSeconds: 0, sessionCount: 0, completedCount: 0, stoppedCount: 0, categorySeconds: {}, level: 0 as const };
    render(<HeatmapCell summary={empty} selected={false} today={false} onSelect={onSelect} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("tabindex", "-1");
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith("2026-07-17");
  });
});
