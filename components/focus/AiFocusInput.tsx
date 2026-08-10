"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { FocusApiError, parseFocusText } from "@/lib/focus-api";
import type { FocusParseResult } from "@/types/focus-ai";

interface AiFocusInputProps {
  disabled: boolean;
  onParsed: (result: FocusParseResult) => boolean;
}

export function AiFocusInput({ disabled, onParsed }: AiFocusInputProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || loading) return;
    if (!text.trim()) {
      setMessage({ kind: "error", text: "请输入想做的事情和时间" });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await parseFocusText(text);
      if (result.task_name === null && result.duration_minutes === null) {
        setMessage({ kind: "error", text: "没有识别出任务或时长，请换一种说法" });
        return;
      }
      if (!onParsed(result)) {
        setMessage({ kind: "error", text: "计时状态已改变，请结束当前计时后再设置" });
        return;
      }

      const successText = result.task_name !== null && result.duration_minutes !== null
        ? `已填写任务和 ${result.duration_minutes} 分钟，请确认后点击开始`
        : result.task_name !== null
          ? "已填写任务名称，当前时长保持不变"
          : `已设置为 ${result.duration_minutes} 分钟，当前任务名称保持不变`;
      setMessage({ kind: "success", text: successText });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof FocusApiError ? error.message : "AI 解析失败，请稍后重试",
      });
    } finally {
      setLoading(false);
    }
  };

  const controlsDisabled = disabled || loading;
  return (
    <div className="ai-focus-input">
      <form onSubmit={submit}>
        <Sparkles size={17} aria-hidden="true" />
        <label className="sr-only" htmlFor="ai-focus-text">用自然语言设置自由专注</label>
        <input
          id="ai-focus-text"
          value={text}
          disabled={controlsDisabled}
          maxLength={300}
          onChange={(event) => setText(event.target.value)}
          placeholder="例如：学习高数45分钟"
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
