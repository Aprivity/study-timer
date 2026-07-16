import type { FocusSession } from "@/types/focus-session";

function localDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function getTodaySessions(sessions: FocusSession[], now = new Date()): FocusSession[] {
  const key = localDayKey(now.getTime());
  return sessions.filter((session) => localDayKey(session.endedAt) === key);
}

export function getTodayFocusedSeconds(sessions: FocusSession[], now = new Date()): number {
  return getTodaySessions(sessions, now).reduce((sum, item) => sum + Math.max(0, item.focusedSeconds), 0);
}

export function getTodayCompletedCount(sessions: FocusSession[], now = new Date()): number {
  return getTodaySessions(sessions, now).filter((item) => item.status === "completed").length;
}

export function getFocusStreak(sessions: FocusSession[], now = new Date()): number {
  const days = new Set(sessions.filter((s) => s.focusedSeconds > 0).map((s) => localDayKey(s.endedAt)));
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Keep an active streak visible during the current day: if today has no saved
  // session yet, count backwards from yesterday instead of resetting to zero.
  if (!days.has(localDayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
