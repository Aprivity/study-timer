import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPlanImageGenerateUrl,
  planImageGenerator,
  type PlanImageError,
} from "./plan-image";

function imageResponse(
  blob: Blob,
  options: { ok?: boolean; status?: number; contentType?: string } = {},
): Response {
  const contentType = options.contentType ?? "image/png";
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    headers: { get: vi.fn(() => contentType) },
    blob: vi.fn().mockResolvedValue(blob),
  } as unknown as Response;
}

describe("plan image generator", () => {
  const createObjectURL = vi.fn(() => "blob:generated-plan");

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    createObjectURL.mockClear();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    delete process.env.NEXT_PUBLIC_AI_API_BASE_URL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_AI_API_BASE_URL;
  });

  it("posts trimmed plan text and creates an Object URL for a PNG response", async () => {
    const blob = new Blob(["png bytes"], { type: "image/png" });
    vi.mocked(fetch).mockResolvedValue(imageResponse(blob));

    await expect(planImageGenerator.generate("  明天上午学习两小时高数  ")).resolves.toEqual({
      src: "blob:generated-plan",
      blob,
      alt: "Aprivity Focus AI 计划图",
      downloadName: "aprivity-focus-plan.png",
    });
    expect(fetch).toHaveBeenCalledWith("/api/v1/plan-image/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "明天上午学习两小时高数" }),
    });
    expect(createObjectURL).toHaveBeenCalledWith(blob);
  });

  it("uses the shared configured AI API base URL", () => {
    process.env.NEXT_PUBLIC_AI_API_BASE_URL = "https://ai.example.com/api/";
    expect(getPlanImageGenerateUrl()).toBe("https://ai.example.com/api/v1/plan-image/generate");
  });

  it("rejects empty input without calling the API", async () => {
    await expect(planImageGenerator.generate("   ")).rejects.toMatchObject({
      kind: "invalid-request",
    } satisfies Partial<PlanImageError>);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects input longer than the backend request limit", async () => {
    await expect(planImageGenerator.generate("a".repeat(2001))).rejects.toMatchObject({
      kind: "invalid-request",
    } satisfies Partial<PlanImageError>);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps network failures to a typed error", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("offline"));
    await expect(planImageGenerator.generate("学习高数")).rejects.toMatchObject({
      kind: "network",
    } satisfies Partial<PlanImageError>);
  });

  it.each([422, 502, 503, 504])("maps HTTP %s without reading or exposing its response body", async (status) => {
    const response = imageResponse(new Blob(["sensitive"]), { ok: false, status });
    vi.mocked(fetch).mockResolvedValue(response);

    await expect(planImageGenerator.generate("学习高数")).rejects.toMatchObject({
      kind: "backend",
      status,
    } satisfies Partial<PlanImageError>);
    expect(response.blob).not.toHaveBeenCalled();
  });

  it("rejects a non-image response", async () => {
    const response = imageResponse(new Blob(["{}"], { type: "application/json" }), {
      contentType: "application/json",
    });
    vi.mocked(fetch).mockResolvedValue(response);

    await expect(planImageGenerator.generate("学习高数")).rejects.toMatchObject({
      kind: "invalid-response",
    } satisfies Partial<PlanImageError>);
    expect(response.blob).not.toHaveBeenCalled();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("rejects an image format outside the PNG API contract", async () => {
    const response = imageResponse(new Blob(["jpeg"], { type: "image/jpeg" }), {
      contentType: "image/jpeg",
    });
    vi.mocked(fetch).mockResolvedValue(response);

    await expect(planImageGenerator.generate("学习高数")).rejects.toMatchObject({
      kind: "invalid-response",
    } satisfies Partial<PlanImageError>);
    expect(response.blob).not.toHaveBeenCalled();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("rejects an empty image Blob", async () => {
    vi.mocked(fetch).mockResolvedValue(imageResponse(new Blob([], { type: "image/png" })));

    await expect(planImageGenerator.generate("学习高数")).rejects.toMatchObject({
      kind: "invalid-response",
    } satisfies Partial<PlanImageError>);
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
