import type { TimerParseResult } from "@/types/timer-ai";
import { getAiApiBaseUrl } from "./ai-api";

export type TimerApiErrorKind = "invalid-request" | "network" | "backend" | "invalid-response";

export class TimerApiError extends Error {
  constructor(
    public readonly kind: TimerApiErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "TimerApiError";
  }
}

const REQUIRED_FIELDS = [
  "mode",
  "task_name",
  "duration_minutes",
  "focus_minutes",
  "short_break_minutes",
  "rounds",
  "long_break_minutes",
] as const;

export function getTimerParseUrl(): string {
  return `${getAiApiBaseUrl()}/v1/timer/parse`;
}

function nullableIntegerIn(value: unknown, min: number, max: number, field: string): number | null {
  if (value === null) return null;
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new TimerApiError("invalid-response", `AI 服务返回了无效的${field}`);
  }
  return value as number;
}

function parseResponse(payload: unknown): TimerParseResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TimerApiError("invalid-response", "AI 服务返回了无法识别的数据");
  }

  const record = payload as Record<string, unknown>;
  const keys = Object.keys(record);
  if (REQUIRED_FIELDS.some((field) => !(field in record)) || keys.some((key) => !REQUIRED_FIELDS.includes(key as typeof REQUIRED_FIELDS[number]))) {
    throw new TimerApiError("invalid-response", "AI 服务返回的数据不完整或包含未知字段");
  }

  if (record.mode !== "free" && record.mode !== "pomodoro") {
    throw new TimerApiError("invalid-response", "AI 服务返回了无效的计时模式");
  }
  const taskName = record.task_name;
  if (taskName !== null && (typeof taskName !== "string" || taskName.trim().length === 0 || taskName.trim().length > 120)) {
    throw new TimerApiError("invalid-response", "AI 服务返回了无效的任务名称");
  }

  const durationMinutes = nullableIntegerIn(record.duration_minutes, 1, 720, "自由专注时长");
  const focusMinutes = nullableIntegerIn(record.focus_minutes, 1, 180, "番茄专注时长");
  const shortBreakMinutes = nullableIntegerIn(record.short_break_minutes, 1, 60, "短休息时长");
  const rounds = nullableIntegerIn(record.rounds, 2, 12, "循环轮数");
  const longBreakMinutes = nullableIntegerIn(record.long_break_minutes, 1, 120, "长休息时长");

  if (record.mode === "free" && [focusMinutes, shortBreakMinutes, rounds, longBreakMinutes].some((value) => value !== null)) {
    throw new TimerApiError("invalid-response", "自由专注结果包含了番茄设置");
  }
  if (record.mode === "pomodoro" && durationMinutes !== null) {
    throw new TimerApiError("invalid-response", "番茄结果包含了自由专注时长");
  }

  return {
    mode: record.mode,
    task_name: typeof taskName === "string" ? taskName.trim() : null,
    duration_minutes: durationMinutes,
    focus_minutes: focusMinutes,
    short_break_minutes: shortBreakMinutes,
    rounds,
    long_break_minutes: longBreakMinutes,
  };
}

export async function parseTimerText(text: string): Promise<TimerParseResult> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new TimerApiError("invalid-request", "请输入任务和时间设置");
  }

  let response: Response;
  try {
    response = await fetch(getTimerParseUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmedText }),
    });
  } catch {
    throw new TimerApiError("network", "无法连接 AI 服务，请检查网络后重试");
  }

  if (!response.ok) {
    throw new TimerApiError("backend", "AI 服务暂时无法完成解析，请稍后再试", response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new TimerApiError("invalid-response", "AI 服务返回了无法识别的数据");
  }
  return parseResponse(payload);
}
