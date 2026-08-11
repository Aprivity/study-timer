export interface PlanImageResult {
  src: string;
  alt: string;
  downloadName: string;
}

export interface PlanImageGenerator {
  generate(plan: string): Promise<PlanImageResult>;
}

const MOCK_GENERATION_DELAY_MS = 700;

export const mockPlanImageGenerator: PlanImageGenerator = {
  async generate(plan) {
    if (!plan.trim()) {
      throw new Error("Plan text is required");
    }

    await new Promise((resolve) => window.setTimeout(resolve, MOCK_GENERATION_DELAY_MS));
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

    return {
      src: `${basePath}/mock-plan-image.svg`,
      alt: "Aprivity Focus 计划图 Mock 预览",
      downloadName: "aprivity-focus-plan.svg",
    };
  },
};
