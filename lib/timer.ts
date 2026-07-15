export const MIN_DURATION_SECONDS = 60;
export const MAX_DURATION_SECONDS = 12 * 60 * 60;

export function calculateRemainingSeconds(endAt: number, now = Date.now()): number {
  if (!Number.isFinite(endAt) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

export function clampDuration(seconds: number): number {
  if (!Number.isFinite(seconds)) return 45 * 60;
  return Math.min(MAX_DURATION_SECONDS, Math.max(MIN_DURATION_SECONDS, Math.round(seconds)));
}

export function focusedSeconds(planned: number, remaining: number): number {
  return Math.max(0, Math.min(planned, planned - remaining));
}
