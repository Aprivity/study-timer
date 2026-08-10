import type { PomodoroParseResult } from "@/types/pomodoro-ai";
import { getAiApiBaseUrl } from "./ai-api";

export type PomodoroApiErrorKind = "invalid-request" | "network" | "backend" | "invalid-response";

export class PomodoroApiError extends Error {
  constructor(
    public readonly kind: PomodoroApiErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "PomodoroApiError";
  }
}

export function getPomodoroParseUrl(): string {
  return `${getAiApiBaseUrl()}/v1/pomodoro/parse`;
}

function nullableIntegerIn(value: unknown, min: number, max: number, field: string): number | null {
  if (value === null) return null;
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new PomodoroApiError("invalid-response", `AI 服务返回了无效的${field}`);
  }
  return value as number;
}

function parseResponse(payload: unknown): PomodoroParseResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new PomodoroApiError("invalid-response", "AI 服务返回了无法识别的数据");
  }

  const record = payload as Record<string, unknown>;
  const requiredFields = ["task_name", "focus_minutes", "short_break_minutes", "rounds", "long_break_minutes"];
  if (requiredFields.some((field) => !(field in record))) {
    throw new PomodoroApiError("invalid-response", "AI 服务返回的数据不完整");
  }

  const taskName = record.task_name;
  if (taskName !== null && (typeof taskName !== "string" || taskName.trim().length === 0 || taskName.trim().length > 120)) {
    throw new PomodoroApiError("invalid-response", "AI 服务返回了无效的任务名称");
  }

  return {
    task_name: typeof taskName === "string" ? taskName.trim() : null,
    focus_minutes: nullableIntegerIn(record.focus_minutes, 1, 180, "专注时长"),
    short_break_minutes: nullableIntegerIn(record.short_break_minutes, 1, 60, "短休息时长"),
    rounds: nullableIntegerIn(record.rounds, 2, 12, "循环轮数"),
    long_break_minutes: nullableIntegerIn(record.long_break_minutes, 1, 120, "长休息时长"),
  };
}

export async function parsePomodoroText(text: string): Promise<PomodoroParseResult> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new PomodoroApiError("invalid-request", "请输入任务和番茄循环设置");
  }

  let response: Response;
  try {
    response = await fetch(getPomodoroParseUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmedText }),
    });
  } catch {
    throw new PomodoroApiError("network", "无法连接 AI 服务，请检查网络后重试");
  }

  if (!response.ok) {
    throw new PomodoroApiError("backend", "AI 服务暂时无法完成解析，请稍后再试", response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new PomodoroApiError("invalid-response", "AI 服务返回了无法识别的数据");
  }
  return parseResponse(payload);
}
