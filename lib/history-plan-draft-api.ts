import { getAiApiBaseUrl } from "./ai-api";
import type {
  HistoryPlanDraftItem,
  HistoryPlanDraftRequest,
  HistoryPlanDraftResponse,
} from "@/types/history-plan-draft";

export type HistoryPlanDraftApiErrorKind = "network" | "backend" | "invalid-response";

export class HistoryPlanDraftApiError extends Error {
  constructor(
    public readonly kind: HistoryPlanDraftApiErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "HistoryPlanDraftApiError";
  }
}

export function getHistoryPlanDraftUrl(): string {
  return `${getAiApiBaseUrl()}/v1/history/plan-draft`;
}

function exactRecord(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HistoryPlanDraftApiError("invalid-response", "计划草稿服务返回了无法识别的数据");
  }
  const record = value as Record<string, unknown>;
  const actualKeys = Object.keys(record);
  if (keys.some((key) => !(key in record))
    || actualKeys.some((key) => !keys.includes(key))) {
    throw new HistoryPlanDraftApiError("invalid-response", "计划草稿服务返回的数据不完整");
  }
  return record;
}

function parseItem(
  value: unknown,
  allowedTaskNames: ReadonlySet<string>,
): HistoryPlanDraftItem {
  const record = exactRecord(value, ["task_name", "action"]);
  if (typeof record.task_name !== "string"
    || !record.task_name.trim()
    || record.task_name.trim().length > 120
    || !allowedTaskNames.has(record.task_name.trim())
    || typeof record.action !== "string"
    || !record.action.trim()
    || record.action.trim().length > 80) {
    throw new HistoryPlanDraftApiError("invalid-response", "计划草稿包含无效任务或行动");
  }
  return {
    task_name: record.task_name.trim(),
    action: record.action.trim(),
  };
}

function parseResponse(
  payload: unknown,
  request: HistoryPlanDraftRequest,
): HistoryPlanDraftResponse {
  const response = exactRecord(payload, ["plan"]);
  const plan = exactRecord(response.plan, ["title", "items"]);
  if (plan.title !== "下一阶段计划"
    || !Array.isArray(plan.items)
    || plan.items.length < 1
    || plan.items.length > 3) {
    throw new HistoryPlanDraftApiError("invalid-response", "计划草稿结构无效");
  }
  const allowedTaskNames = new Set([
    ...request.tasks.map((item) => item.task_name),
    ...(request.previous_period?.tasks.map((item) => item.task_name) ?? []),
  ]);
  const items = plan.items.map((item) => parseItem(item, allowedTaskNames));
  if (new Set(items.map((item) => item.task_name)).size !== items.length) {
    throw new HistoryPlanDraftApiError("invalid-response", "计划草稿包含重复任务");
  }
  return {
    plan: {
      title: "下一阶段计划",
      items,
    },
  };
}

export async function generateHistoryPlanDraft(
  request: HistoryPlanDraftRequest,
  signal?: AbortSignal,
): Promise<HistoryPlanDraftResponse> {
  let response: Response;
  try {
    response = await fetch(getHistoryPlanDraftUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new HistoryPlanDraftApiError("network", "无法连接计划草稿服务");
  }

  if (!response.ok) {
    throw new HistoryPlanDraftApiError(
      "backend",
      "计划草稿暂时无法生成",
      response.status,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new HistoryPlanDraftApiError("invalid-response", "计划草稿服务返回了无效数据");
  }
  return parseResponse(payload, request);
}
