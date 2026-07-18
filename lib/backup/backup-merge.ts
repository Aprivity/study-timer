import { DEFAULT_BACKGROUND_SETTINGS } from "@/lib/background-presets";
import type { BackgroundSettings } from "@/types/background";
import type { FocusSession } from "@/types/focus-session";

export interface SessionMergeResult {
  sessions: FocusSession[];
  addedCount: number;
  duplicateCount: number;
  conflictCount: number;
}

function sessionSignature(session: FocusSession): string {
  return JSON.stringify([
    session.id, session.taskName, session.category, session.plannedSeconds, session.focusedSeconds,
    session.startedAt, session.endedAt, session.status, session.mode ?? null, session.cycleId ?? null,
    session.pomodoroRound ?? null, session.pomodoroRoundsTotal ?? null,
  ]);
}

export function mergeSessions(current: FocusSession[], incoming: FocusSession[]): SessionMergeResult {
  const byId = new Map(current.map((session) => [session.id, session]));
  let addedCount = 0;
  let duplicateCount = 0;
  let conflictCount = 0;
  for (const session of incoming) {
    const existing = byId.get(session.id);
    if (!existing) {
      byId.set(session.id, session);
      addedCount += 1;
    } else if (sessionSignature(existing) === sessionSignature(session)) duplicateCount += 1;
    else conflictCount += 1;
  }
  return {
    sessions: [...byId.values()].sort((left, right) => right.endedAt - left.endedAt),
    addedCount,
    duplicateCount,
    conflictCount,
  };
}

export function resolveImportedBackground(settings: BackgroundSettings, imageExists: boolean): {
  settings: BackgroundSettings;
  imageResult: "available" | "needs-upload";
} {
  if (settings.type !== "image") return { settings, imageResult: "available" };
  if (imageExists) return { settings, imageResult: "available" };
  return { settings: structuredClone(DEFAULT_BACKGROUND_SETTINGS), imageResult: "needs-upload" };
}
