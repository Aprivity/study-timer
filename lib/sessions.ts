import type { FocusSession } from "@/types/focus-session";
import { focusedSeconds } from "./timer";

export function addSessionUnique(sessions: FocusSession[], session: FocusSession): FocusSession[] {
  return sessions.some((item) => item.id === session.id) ? sessions : [session, ...sessions];
}

interface StoppedSessionInput {
  id: string;
  taskName: string;
  category: string;
  plannedSeconds: number;
  remainingSeconds: number;
  startedAt: number;
  endedAt: number;
  mode?: FocusSession["mode"];
  cycleId?: string;
  pomodoroRound?: number;
  pomodoroRoundsTotal?: number;
}

export function createStoppedSession(input: StoppedSessionInput): FocusSession {
  return {
    id: input.id,
    taskName: input.taskName.trim() || "未命名专注",
    category: input.category,
    plannedSeconds: input.plannedSeconds,
    focusedSeconds: focusedSeconds(input.plannedSeconds, input.remainingSeconds),
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    status: "stopped",
    mode: input.mode,
    cycleId: input.cycleId,
    pomodoroRound: input.pomodoroRound,
    pomodoroRoundsTotal: input.pomodoroRoundsTotal,
  };
}
