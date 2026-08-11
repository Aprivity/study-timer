"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { Download, ImageIcon, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import {
  mockPlanImageGenerator,
  type PlanImageGenerator,
  type PlanImageResult,
} from "@/lib/plan-image";

type GenerationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: PlanImageResult }
  | { status: "error" };

const INPUT_EXAMPLE = "明天上午学习两小时高数，下午背一小时四级单词，晚上看45分钟美股视频。";

export function PlanImageStudio({ generator = mockPlanImageGenerator }: { generator?: PlanImageGenerator }) {
  const [plan, setPlan] = useState("");
  const [generation, setGeneration] = useState<GenerationState>({ status: "idle" });
  const canGenerate = plan.trim().length > 0 && generation.status !== "loading";

  const updatePlan = (value: string) => {
    setPlan(value);
    if (generation.status !== "loading") {
      setGeneration({ status: "idle" });
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canGenerate) return;

    setGeneration({ status: "loading" });
    try {
      const result = await generator.generate(plan.trim());
      setGeneration({ status: "success", result });
    } catch {
      setGeneration({ status: "error" });
    }
  };

  const isRetry = generation.status === "success" || generation.status === "error";

  return (
    <section className="plan-image-studio" aria-label="计划图生成器">
      <form className="plan-image-form" onSubmit={submit}>
        <label htmlFor="plan-image-input">你的计划</label>
        <textarea
          id="plan-image-input"
          value={plan}
          maxLength={1200}
          rows={7}
          disabled={generation.status === "loading"}
          onChange={(event) => updatePlan(event.target.value)}
          placeholder={INPUT_EXAMPLE}
        />
        <p className="plan-input-hint">按自然语言写下时间、任务和顺序即可。</p>
        <button className="primary-button plan-generate-button" type="submit" disabled={!canGenerate}>
          {generation.status === "loading" ? (
            <><LoaderCircle className="ai-loading-icon" size={18} aria-hidden="true" />生成中</>
          ) : isRetry ? (
            <><RefreshCw size={17} aria-hidden="true" />重新生成</>
          ) : (
            <><Sparkles size={17} aria-hidden="true" />生成计划图</>
          )}
        </button>
      </form>

      <div className={`plan-result plan-result-${generation.status}`} aria-live="polite">
        {generation.status === "idle" && (
          <div className="plan-result-message">
            <ImageIcon aria-hidden="true" />
            <strong>计划图将在这里显示</strong>
            <p>填写计划并生成后，可预览和下载图片。</p>
          </div>
        )}

        {generation.status === "loading" && (
          <div className="plan-result-message" role="status">
            <LoaderCircle className="ai-loading-icon" aria-hidden="true" />
            <strong>正在整理你的计划</strong>
            <p>正在生成清晰的执行图，请稍候。</p>
          </div>
        )}

        {generation.status === "error" && (
          <div className="plan-result-message plan-result-error" role="alert">
            <ImageIcon aria-hidden="true" />
            <strong>计划图生成失败，请稍后重试。</strong>
            <p>你的原始输入仍然保留，可以直接重新生成。</p>
          </div>
        )}

        {generation.status === "success" && (
          <div className="plan-result-success">
            <div className="plan-image-preview">
              <Image
                src={generation.result.src}
                alt={generation.result.alt}
                width={1200}
                height={1500}
                priority={false}
              />
            </div>
            <p className="mock-result-note">当前为本地 Mock 结果，用于验证页面与下载流程。</p>
            <a className="secondary-button plan-download-button" href={generation.result.src} download={generation.result.downloadName}>
              <Download size={17} aria-hidden="true" />下载图片
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
