import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "./Header";

const usePathname = vi.fn();

vi.mock("next/navigation", () => ({ usePathname: () => usePathname() }));
vi.mock("@/hooks/useFullscreen", () => ({
  useFullscreen: () => ({ isFullscreen: false, toggleFullscreen: vi.fn() }),
}));

describe("Header navigation", () => {
  beforeEach(() => usePathname.mockReturnValue("/"));

  it("places More between History and Settings before fullscreen", () => {
    render(<Header />);

    const navigation = screen.getByRole("navigation", { name: "主导航" });
    expect(within(navigation).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "历史记录",
      "更多",
      "设置",
    ]);
    expect(within(navigation).getByRole("button", { name: "进入全屏" })).toBeInTheDocument();
  });

  it("keeps More active on its nested plan-image route", () => {
    usePathname.mockReturnValue("/more/plan-image");
    render(<Header />);

    expect(screen.getByRole("link", { name: "更多" })).toHaveClass("active");
    expect(screen.getByRole("link", { name: "更多" })).toHaveAttribute("aria-current", "page");
  });
});
