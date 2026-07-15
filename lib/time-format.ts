export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${String(hours).padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatHumanDuration(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${minutes} 分钟`;
  return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
}
