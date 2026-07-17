import type { FocusSession } from "@/types/focus-session";
import { addLocalDays, getLocalDateKey, startOfLocalDay } from "./local-date";

export function getTodaySessions(sessions: FocusSession[], now = new Date()): FocusSession[] {
  const key = getLocalDateKey(now);
  return sessions.filter((session) => getLocalDateKey(session.endedAt) === key);
}

export function getTodayFocusedSeconds(sessions: FocusSession[], now = new Date()): number {
  return getTodaySessions(sessions, now).reduce((sum, item) => sum + Math.max(0, item.focusedSeconds), 0);
}

export function getTodayCompletedCount(sessions: FocusSession[], now = new Date()): number {
  return getTodaySessions(sessions, now).filter((item) => item.status === "completed").length;
}

export function getFocusStreak(sessions: FocusSession[], now = new Date()): number {
  const days = new Set(sessions.filter((s) => s.focusedSeconds > 0).map((s) => getLocalDateKey(s.endedAt)));
  let cursor = startOfLocalDay(now);
  // Keep an active streak visible during the current day: if today has no saved
  // session yet, count backwards from yesterday instead of resetting to zero.
  if (!days.has(getLocalDateKey(cursor))) cursor = addLocalDays(cursor, -1);
  let streak = 0;
  while (days.has(getLocalDateKey(cursor))) {
    streak += 1;
    cursor = addLocalDays(cursor, -1);
  }
  return streak;
}
