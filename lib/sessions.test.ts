import { describe, expect, it } from "vitest";
import { addSessionUnique } from "./sessions";
import type { FocusSession } from "@/types/focus-session";

const record: FocusSession = { id: "same-token", taskName: "数学", category: "数学", plannedSeconds: 60, focusedSeconds: 60, startedAt: 1, endedAt: 2, status: "completed" };

describe("session de-duplication", () => {
  it("does not save the same completed session twice", () => expect(addSessionUnique([record], { ...record })).toHaveLength(1));
});
