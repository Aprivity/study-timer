"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { parsePomodoroText, PomodoroApiError } from "@/lib/pomodoro-api";
import type { PomodoroParseResult } from "@/types/pomodoro-ai";

interface AiPomodoroInputProps {
  disabled: boolean;
  onParsed: (result: PomodoroParseResult) => boolean;
}

export function AiPomodoroInput({ disabled, onParsed }: AiPomodoroInputProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || loading) return;
    if (!text.trim()) {
      setMessage({ kind: "error", text: "请输入任务和番茄循环设置" });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await parsePomodoroText(text);
      const hasResult = Object.values(result).some((value) => value !== null);
      if (!hasResult) {
        setMessage({ kind: "error", text: "没有识别出任务或番茄设置，请换一种说法" });
        return;
      }
      if (!onParsed(result)) {
        setMessage({ kind: "error", text: "番茄状态已改变，请结束当前循环后再设置" });
        return;
      }
      setMessage({ kind: "success", text: "已填入番茄设置，可继续手动调整后点击开始" });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof PomodoroApiError ? error.message : "AI 解析失败，请稍后重试",
      });
    } finally {
      setLoading(false);
    }
  };

  const controlsDisabled = disabled || loading;
  return (
    <div className="ai-focus-input ai-pomodoro-input">
      <form onSubmit={submit}>
        <Sparkles size={17} aria-hidden="true" />
        <label className="sr-only" htmlFor="ai-pomodoro-text">用自然语言设置番茄循环</label>
        <input
          id="ai-pomodoro-text"
          value={text}
          disabled={controlsDisabled}
          maxLength={300}
          onChange={(event) => setText(event.target.value)}
          placeholder="例如：物理笔记50分钟，休息10分钟，4轮"
        />
        <button type="submit" disabled={controlsDisabled}>
          {loading ? <LoaderCircle className="ai-loading-icon" size={16} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
          {loading ? "解析中" : "AI 填写"}
        </button>
      </form>
      {disabled && <p className="ai-focus-hint">当前番茄状态下，AI 设置暂不可修改</p>}
      {message && <p className={`ai-focus-message ${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p>}
    </div>
  );
}
