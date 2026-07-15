import type { FocusSession } from "@/types/focus-session";

export function addSessionUnique(sessions: FocusSession[], session: FocusSession): FocusSession[] {
  return sessions.some((item) => item.id === session.id) ? sessions : [session, ...sessions];
}
