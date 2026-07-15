"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Focus, Leaf } from "lucide-react";
import { useCountdown } from "@/hooks/useCountdown";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { DEFAULT_SETTINGS, parseSessions, parseSettings, parseTimer, STORAGE_KEYS } from "@/lib/storage";
import { focusedSeconds } from "@/lib/timer";
import { addSessionUnique } from "@/lib/sessions";
import type { FocusSession } from "@/types/focus-session";
import type { PersistedTimer } from "@/types/timer";
import { CompleteDialog } from "@/components/dialogs/CompleteDialog";
import { ConfirmEndDialog } from "@/components/dialogs/ConfirmEndDialog";
import { TodaySummary } from "@/components/stats/TodaySummary";
import { FlipClock } from "./FlipClock";
import { ProgressRing } from "./ProgressRing";
import { TaskInput } from "./TaskInput";
import { TimePresets } from "./TimePresets";
import { TimerControls } from "./TimerControls";

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function playCompleteTone() {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    oscillator.type = "sine"; oscillator.frequency.setValueAtTime(523.25, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(659.25, context.currentTime + .55);
    gain.gain.setValueAtTime(.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.09, context.currentTime + .04);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .8);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + .82);
    oscillator.addEventListener("ended", () => void context.close());
  } catch { /* Audio is optional and may be blocked. */ }
}

export function FocusTimer() {
  const router = useRouter();
  const timerParser = useCallback((raw: string | null) => parseTimer(raw), []);
  const [persistedTimer, setPersistedTimer, timerHydrated] = useLocalStorage(STORAGE_KEYS.timer, timerParser);
  const [sessions, setSessions] = useLocalStorage<FocusSession[]>(STORAGE_KEYS.sessions, parseSessions);
  const [settings] = useLocalStorage(STORAGE_KEYS.settings, parseSettings);
  const timer = useCountdown(DEFAULT_SETTINGS.defaultDurationMinutes * 60);
  const [taskName, setTaskName] = useState("");
  const [category, setCategory] = useState("数学");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [savedSessionToken, setSavedSessionToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const resumeAfterDialog = useRef(false);

  useEffect(() => {
    if (!timerHydrated || ready) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (persistedTimer) {
        timer.restore(persistedTimer);
        setTaskName(persistedTimer.taskName);
        setCategory(persistedTimer.category);
        setStartedAt(persistedTimer.startedAt);
        setSessionToken(persistedTimer.sessionToken);
        setSavedSessionToken(persistedTimer.savedSessionToken);
      }
      setReady(true);
    });
    return () => { active = false; };
  }, [persistedTimer, ready, timer, timerHydrated]);

  useEffect(() => {
    if (!ready) return;
    const snapshot: PersistedTimer = {
      version: 1, status: timer.status, totalSeconds: timer.totalSeconds,
      remainingSeconds: timer.remainingSeconds, endAt: timer.endAt, startedAt,
      taskName, category, sessionToken, savedSessionToken,
    };
    setPersistedTimer(snapshot);
  }, [category, ready, savedSessionToken, sessionToken, setPersistedTimer, startedAt, taskName, timer.endAt, timer.remainingSeconds, timer.status, timer.totalSeconds]);

  useEffect(() => {
    if (!ready || timer.status !== "completed" || timer.remainingSeconds !== 0 || !sessionToken || !startedAt || savedSessionToken === sessionToken) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const record: FocusSession = {
        id: sessionToken, taskName: taskName.trim() || "未命名专注", category,
        plannedSeconds: timer.totalSeconds, focusedSeconds: timer.totalSeconds,
        startedAt, endedAt: Date.now(), status: "completed",
      };
      setSessions((current) => addSessionUnique(current, record));
      setSavedSessionToken(sessionToken);
      setCompleteDialogOpen(true);
      if (settings.soundEnabled) playCompleteTone();
    });
    return () => { active = false; };
  }, [category, ready, savedSessionToken, sessionToken, setSessions, settings.soundEnabled, startedAt, taskName, timer.remainingSeconds, timer.status, timer.totalSeconds]);

  useEffect(() => {
    const cleanTask = taskName.trim() || "未命名专注";
    if (timer.status === "running") document.title = `${Math.floor(timer.remainingSeconds / 60).toString().padStart(2, "0")}:${String(timer.remainingSeconds % 60).padStart(2, "0")} · ${cleanTask}`;
    else if (timer.status === "paused") document.title = "已暂停 · Aprivity Focus";
    else if (timer.status === "completed" && completeDialogOpen) document.title = "专注完成 · Aprivity Focus";
    else document.title = "Aprivity Focus";
    return () => { document.title = "Aprivity Focus"; };
  }, [completeDialogOpen, taskName, timer.remainingSeconds, timer.status]);

  const begin = () => {
    setStartedAt(Date.now()); setSessionToken(createId()); setSavedSessionToken(null);
    setCompleteDialogOpen(false); timer.start();
  };
  const requestEnd = () => {
    resumeAfterDialog.current = timer.status === "running";
    if (timer.status === "running") timer.pause();
    setEndDialogOpen(true);
  };
  const continueFocus = () => {
    setEndDialogOpen(false);
    if (resumeAfterDialog.current) timer.resume();
    resumeAfterDialog.current = false;
  };
  const finishEarly = (save: boolean) => {
    if (save && sessionToken && startedAt) {
      const record: FocusSession = {
        id: sessionToken, taskName: taskName.trim() || "未命名专注", category,
        plannedSeconds: timer.totalSeconds, focusedSeconds: focusedSeconds(timer.totalSeconds, timer.remainingSeconds),
        startedAt, endedAt: Date.now(), status: "stopped",
      };
      if (record.focusedSeconds > 0) setSessions((current) => addSessionUnique(current, record));
    }
    setSavedSessionToken(sessionToken); setEndDialogOpen(false); resumeAfterDialog.current = false; timer.stop();
  };
  const reset = () => {
    timer.reset(); setStartedAt(null); setSessionToken(null); setSavedSessionToken(null); setCompleteDialogOpen(false);
  };

  const locked = timer.status === "running" || timer.status === "paused";
  const statusText = timer.status === "idle" ? "准备开始一次专注" : timer.status === "running" ? "当前专注" : timer.status === "paused" ? "专注已暂停" : "本次专注已结束";
  const progress = timer.totalSeconds > 0 ? timer.remainingSeconds / timer.totalSeconds : 0;

  if (!ready) return <div className="timer-loading"><Leaf className="loading-leaf" /><span>正在恢复专注状态…</span></div>;
  return <>
    <section className="focus-shell">
      <div className="focus-heading"><p className="focus-status"><Focus size={14} />{statusText}</p><h1>{locked || timer.status === "completed" ? (taskName.trim() || "未命名专注") : "把注意力留给当下"}</h1></div>
      {!locked && timer.status === "idle" && <TaskInput taskName={taskName} category={category} disabled={false} onTaskChange={setTaskName} onCategoryChange={setCategory} />}
      <ProgressRing progress={progress} status={timer.status}><FlipClock seconds={timer.remainingSeconds} animate={timer.status === "running"} /><p className="ring-caption">{timer.status === "running" ? "保持呼吸，继续向前" : timer.status === "paused" ? "时间已经为你停下" : timer.status === "completed" ? "专注已被记录" : `${Math.round(timer.totalSeconds / 60)} 分钟专注`}</p></ProgressRing>
      <TimerControls status={timer.status} onStart={begin} onPause={timer.pause} onResume={timer.resume} onEnd={requestEnd} onReset={reset} onHistory={() => router.push("/history")} />
      {timer.status === "idle" && <TimePresets selectedMinutes={Math.round(timer.totalSeconds / 60)} disabled={locked} onSelect={(minutes) => timer.setDuration(minutes * 60)} />}
      <TodaySummary sessions={sessions} />
    </section>
    <ConfirmEndDialog open={endDialogOpen} onSave={() => finishEarly(true)} onDiscard={() => finishEarly(false)} onContinue={continueFocus} />
    <CompleteDialog open={completeDialogOpen} taskName={taskName.trim() || "未命名专注"} onClose={() => setCompleteDialogOpen(false)} onHistory={() => router.push("/history")} />
  </>;
}
