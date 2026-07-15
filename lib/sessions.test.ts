import { describe, expect, it } from "vitest";
import { addSessionUnique, createStoppedSession } from "./sessions";
import type { FocusSession } from "@/types/focus-session";

const record: FocusSession = { id: "same-token", taskName: "数学", category: "数学", plannedSeconds: 60, focusedSeconds: 60, startedAt: 1, endedAt: 2, status: "completed" };

describe("session de-duplication", () => {
  it("does not save the same completed session twice", () => expect(addSessionUnique([record], { ...record })).toHaveLength(1));
  it("stores only the actual elapsed time for an early stop", () => {
    const stopped = createStoppedSession({
      id: "stopped", taskName: "", category: "英语", plannedSeconds: 2700,
      remainingSeconds: 2100, startedAt: 1000, endedAt: 601_000,
    });
    expect(stopped.focusedSeconds).toBe(600);
    expect(stopped.status).toBe("stopped");
    expect(stopped.taskName).toBe("未命名专注");
  });
});
