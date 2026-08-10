import type { FocusParseResult } from "@/types/focus-ai";
import { getAiApiBaseUrl } from "./ai-api";

export type FocusApiErrorKind = "invalid-request" | "network" | "backend" | "invalid-response";

export class FocusApiError extends Error {
  constructor(
    public readonly kind: FocusApiErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "FocusApiError";
  }
}

export function getFocusParseUrl(): string {
  return `${getAiApiBaseUrl()}/v1/focus/parse`;
}

function parseResponse(payload: unknown): FocusParseResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new FocusApiError("invalid-response", "AI 服务返回了无法识别的数据");
  }

  const record = payload as Record<string, unknown>;
  if (!("task_name" in record) || !("duration_minutes" in record)) {
    throw new FocusApiError("invalid-response", "AI 服务返回的数据不完整");
  }

  const taskName = record.task_name;
  const durationMinutes = record.duration_minutes;
  if (taskName !== null && (typeof taskName !== "string" || taskName.trim().length === 0 || taskName.trim().length > 120)) {
    throw new FocusApiError("invalid-response", "AI 服务返回了无效的任务名称");
  }
  if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || (durationMinutes as number) < 1 || (durationMinutes as number) > 720)) {
    throw new FocusApiError("invalid-response", "AI 服务返回了无效的专注时长");
  }

  return {
    task_name: typeof taskName === "string" ? taskName.trim() : null,
    duration_minutes: durationMinutes as number | null,
  };
}

export async function parseFocusText(text: string): Promise<FocusParseResult> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new FocusApiError("invalid-request", "请输入想做的事情和时间");
  }

  let response: Response;
  try {
    response = await fetch(getFocusParseUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmedText }),
    });
  } catch {
    throw new FocusApiError("network", "无法连接 AI 服务，请检查网络后重试");
  }

  if (!response.ok) {
    throw new FocusApiError("backend", "AI 服务暂时无法完成解析，请稍后再试", response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new FocusApiError("invalid-response", "AI 服务返回了无法识别的数据");
  }
  return parseResponse(payload);
}
