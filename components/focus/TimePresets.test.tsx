import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TimePresets } from "./TimePresets";

describe("TimePresets", () => {
  it("prevents all duration changes while a timer is locked", () => {
    const onSelect = vi.fn();
    render(<TimePresets selectedMinutes={45} disabled onSelect={onSelect} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.every((button) => button.hasAttribute("disabled"))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "25 分钟" }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
