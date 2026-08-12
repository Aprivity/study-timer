import type { HistoryAnalyzeRequest } from "./history-analysis";

export interface HistoryPlanDraftRequest extends HistoryAnalyzeRequest {
  actions: string[];
}

export interface HistoryPlanDraftItem {
  task_name: string;
  action: string;
}

export interface HistoryPlanDraft {
  title: "下一阶段计划";
  items: HistoryPlanDraftItem[];
}

export interface HistoryPlanDraftResponse {
  plan: HistoryPlanDraft;
}
