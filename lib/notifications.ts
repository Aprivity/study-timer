import type { PomodoroCycleState, PomodoroPhase, PomodoroSettings, TimerMode } from "@/types/pomodoro";

export type BrowserNotificationPermission = "default" | "granted" | "denied";

export interface BrowserNotificationOptions {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  silent?: boolean;
}

export interface DesktopNotificationPolicy {
  enabled: boolean;
  permission: BrowserNotificationPermission;
  visibilityState: DocumentVisibilityState;
  supported: boolean;
}

export interface CompletionNotificationInput {
  mode: TimerMode;
  completedPhase: PomodoroPhase;
  completedRound: number;
  totalSeconds: number;
  taskName: string;
  eventToken: string;
  nextState?: PomodoroCycleState;
  pomodoro?: PomodoroSettings;
  autoStarted?: boolean;
}

function notificationApi(): typeof Notification | null {
  return typeof window !== "undefined" && "Notification" in window ? window.Notification : null;
}

function minutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

function phaseName(phase: PomodoroPhase): string {
  return phase === "short-break" ? "短休息" : phase === "long-break" ? "长休息" : "专注";
}

export function isNotificationSupported(): boolean {
  return notificationApi() !== null;
}

export function getNotificationPermission(): BrowserNotificationPermission {
  const api = notificationApi();
  return api?.permission === "granted" || api?.permission === "denied" ? api.permission : "default";
}

export async function requestNotificationPermission(): Promise<BrowserNotificationPermission> {
  const api = notificationApi();
  if (!api) return "denied";
  const current = getNotificationPermission();
  if (current !== "default") return current;
  try {
    const result = await api.requestPermission();
    return result === "granted" || result === "denied" ? result : "default";
  } catch {
    return "default";
  }
}

export function canSendNotification(enabled: boolean): boolean {
  return enabled && isNotificationSupported() && getNotificationPermission() === "granted";
}

export function shouldSendDesktopNotification(policy: DesktopNotificationPolicy): boolean {
  return policy.enabled && policy.supported && policy.permission === "granted" && policy.visibilityState === "hidden";
}

export function getNotificationIconPath(production = process.env.NODE_ENV === "production"): string {
  return `${production ? "/study-timer" : ""}/icon.svg`;
}

export function sendBrowserNotification(options: BrowserNotificationOptions): boolean {
  const api = notificationApi();
  if (!api || getNotificationPermission() !== "granted") return false;
  try {
    const notification = new api(options.title, {
      body: options.body,
      tag: options.tag,
      icon: options.icon ?? getNotificationIconPath(),
      silent: options.silent,
    });
    notification.onclick = () => {
      try { window.focus(); } catch { /* Focusing is best effort. */ }
      try { notification.close(); } catch { /* Closing is best effort. */ }
    };
    return true;
  } catch {
    return false;
  }
}

export function createCompletionNotification(input: CompletionNotificationInput): BrowserNotificationOptions {
  const cleanTask = input.taskName.trim();
  const icon = getNotificationIconPath();
  if (input.mode === "free") {
    return {
      title: "专注完成",
      body: cleanTask
        ? `你已完成“${cleanTask}”，本次专注 ${minutes(input.totalSeconds)} 分钟。`
        : `你已完成一次 ${minutes(input.totalSeconds)} 分钟专注。`,
      tag: `aprivity-focus:free-complete:${input.eventToken}`,
      icon,
    };
  }

  const settings = input.pomodoro;
  const nextState = input.nextState;
  if (!settings || !nextState) {
    return { title: "专注完成", body: "番茄阶段已结束。", tag: `aprivity-focus:pomodoro:${input.eventToken}`, icon };
  }

  if (input.completedPhase === "focus") {
    const finalRound = input.completedRound >= settings.roundsBeforeLongBreak;
    const nextMinutes = nextState.phase === "long-break" ? settings.longBreakMinutes : settings.shortBreakMinutes;
    const nextLabel = phaseName(nextState.phase);
    const transition = input.autoStarted
      ? `${nextLabel}已开始，剩余 ${nextMinutes} 分钟。`
      : `接下来是${nextLabel} ${nextMinutes} 分钟。`;
    return {
      title: finalRound ? "本轮番茄循环完成" : `第 ${input.completedRound} 轮专注完成`,
      body: finalRound
        ? `你已完成 ${settings.roundsBeforeLongBreak} 轮专注，${transition}`
        : `本轮专注 ${minutes(input.totalSeconds)} 分钟，${transition}`,
      tag: `aprivity-focus:pomodoro-focus:${input.eventToken}`,
      icon,
    };
  }

  const isLongBreak = input.completedPhase === "long-break";
  const lead = input.autoStarted
    ? isLongBreak ? "新一轮番茄专注已开始。" : `第 ${nextState.currentRound} 轮专注已开始。`
    : isLongBreak ? "准备开始新一轮番茄专注。" : `准备开始第 ${nextState.currentRound} 轮专注。`;
  const task = cleanTask && !isLongBreak ? ` 继续任务：“${cleanTask}”。` : "";
  return {
    title: isLongBreak ? "长休息结束" : "短休息结束",
    body: `${lead}${task}`,
    tag: `aprivity-focus:${input.completedPhase}:${input.eventToken}`,
    icon,
  };
}
