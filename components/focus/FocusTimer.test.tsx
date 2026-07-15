import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FocusTimer } from "./FocusTimer";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("FocusTimer core controls", () => {
  beforeEach(() => window.localStorage.clear());
  it("starts and pauses a focus session", async () => {
    render(<FocusTimer />);
    const start = await screen.findByRole("button", { name: /开始专注/ });
    fireEvent.click(start);
    expect(await screen.findByRole("button", { name: "暂停" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "暂停" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /继续专注/ })).toBeInTheDocument());
  });
});
