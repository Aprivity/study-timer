import { getAiApiBaseUrl } from "./ai-api";

export interface PlanImageResult {
  src: string;
  alt: string;
  downloadName: string;
  blob: Blob;
}

export interface PlanImageGenerator {
  generate(plan: string): Promise<PlanImageResult>;
}

export type PlanImageErrorKind = "invalid-request" | "network" | "backend" | "invalid-response";

export class PlanImageError extends Error {
  constructor(
    public readonly kind: PlanImageErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "PlanImageError";
  }
}

export function getPlanImageGenerateUrl(): string {
  return `${getAiApiBaseUrl()}/v1/plan-image/generate`;
}

function isPngMediaType(mediaType: string): boolean {
  return mediaType.toLowerCase().split(";", 1)[0].trim() === "image/png";
}

export const planImageGenerator: PlanImageGenerator = {
  async generate(plan) {
    const text = plan.trim();
    if (!text || text.length > 2000) {
      throw new PlanImageError("invalid-request", "请输入不超过 2000 字符的计划内容");
    }

    let response: Response;
    try {
      response = await fetch(getPlanImageGenerateUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    } catch {
      throw new PlanImageError("network", "无法连接计划图服务");
    }

    if (!response.ok) {
      throw new PlanImageError("backend", "计划图服务暂时不可用", response.status);
    }

    const responseMediaType = response.headers.get("Content-Type") ?? "";
    if (!isPngMediaType(responseMediaType)) {
      throw new PlanImageError("invalid-response", "计划图服务返回了非 PNG 图片内容");
    }

    let blob: Blob;
    try {
      blob = await response.blob();
    } catch {
      throw new PlanImageError("invalid-response", "计划图服务返回了无法读取的图片");
    }

    if (blob.size === 0 || (blob.type && !isPngMediaType(blob.type))) {
      throw new PlanImageError("invalid-response", "计划图服务返回了无效图片");
    }

    let src: string;
    try {
      src = URL.createObjectURL(blob);
    } catch {
      throw new PlanImageError("invalid-response", "浏览器无法显示生成的图片");
    }

    return {
      src,
      blob,
      alt: "Aprivity Focus AI 计划图",
      downloadName: "aprivity-focus-plan.png",
    };
  },
};
