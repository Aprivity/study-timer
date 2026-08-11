"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { parseTimerText, TimerApiError } from "@/lib/timer-api";
import type { TimerParseResult } from "@/types/timer-ai";

interface AiTimerInputProps {
  disabled: boolean;
  onParsed: (result: TimerParseResult) => boolean;
}

function hasEffectiveSettings(result: TimerParseResult): boolean {
  if (result.mode === "free") {
    return result.task_name !== null || result.duration_minutes !== null;
  }
  return [
    result.task_name,
    result.focus_minutes,
    result.short_break_minutes,
    result.rounds,
    result.long_break_minutes,
  ].some((value) => value !== null);
}

export function AiTimerInput({ disabled, onParsed }: AiTimerInputProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || loading) return;
    if (!text.trim()) {
      setMessage({ kind: "error", text: "请输入任务和时间设置" });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await parseTimerText(text);
      if (!hasEffectiveSettings(result)) {
        setMessage({ kind: "error", text: "没有识别出可填写的任务或时间设置，请换一种说法" });
        return;
      }
      if (!onParsed(result)) {
        setMessage({ kind: "error", text: "计时状态已改变，请结束当前计时或循环后再设置" });
        return;
      }
      setMessage({
        kind: "success",
        text: result.mode === "free"
          ? "已切换到自由专注并填写设置，请确认后点击开始"
          : "已切换到番茄循环并填写设置，可继续手动调整后点击开始",
      });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof TimerApiError ? error.message : "AI 解析失败，请稍后重试",
      });
    } finally {
      setLoading(false);
    }
  };

  const controlsDisabled = disabled || loading;
  return (
    <div className="ai-focus-input ai-timer-input">
      <form onSubmit={submit}>
        <Sparkles size={17} aria-hidden="true" />
        <label className="sr-only" htmlFor="ai-timer-text">用自然语言设置计时器</label>
        <input
          id="ai-timer-text"
          value={text}
          disabled={controlsDisabled}
          maxLength={300}
          onChange={(event) => setText(event.target.value)}
          placeholder="例如：看50分钟美股视频，或物理笔记50分钟、休息10分钟、4轮"
        />
        <button type="submit" disabled={controlsDisabled}>
          {loading ? <LoaderCircle className="ai-loading-icon" size={16} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
          {loading ? "解析中" : "AI 填写"}
        </button>
      </form>
      {disabled && <p className="ai-focus-hint">当前计时状态下，AI 设置暂不可修改</p>}
      {message && <p className={`ai-focus-message ${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p>}
    </div>
  );
}
