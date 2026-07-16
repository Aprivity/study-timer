"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Focus, Leaf } from "lucide-react";
import { useCountdown } from "@/hooks/useCountdown";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePomodoroCycle } from "@/hooks/usePomodoroCycle";
import { DEFAULT_SETTINGS, parseSessions, parseSettings, parseTimer, STORAGE_KEYS } from "@/lib/storage";
import { getNextPomodoroState, getPhaseDurationSeconds, getPomodoroPhaseLabel, INITIAL_POMODORO_STATE, shouldAutoStartNextPhase, shouldRecordPhase } from "@/lib/pomodoro";
import { calculateRemainingSeconds } from "@/lib/timer";
import { addSessionUnique, createStoppedSession } from "@/lib/sessions";
import { formatDuration } from "@/lib/time-format";
import type { FocusSession } from "@/types/focus-session";
import type { PomodoroCycleState, PomodoroPhase, TimerMode } from "@/types/pomodoro";
import type { PersistedTimer } from "@/types/timer";
import { CompleteDialog } from "@/components/dialogs/CompleteDialog";
import { ConfirmEndDialog } from "@/components/dialogs/ConfirmEndDialog";
import { PomodoroPhaseHeader } from "@/components/pomodoro/PomodoroPhaseHeader";
import { PomodoroTimerControls } from "@/components/pomodoro/PomodoroTimerControls";
import { PomodoroTransitionDialog } from "@/components/pomodoro/PomodoroTransitionDialog";
import { TimerModeSelector } from "@/components/pomodoro/TimerModeSelector";
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
    const context = new AudioContextClass(); const gain = context.createGain(); const oscillator = context.createOscillator();
    oscillator.type = "sine"; oscillator.frequency.setValueAtTime(523.25, context.currentTime); oscillator.frequency.exponentialRampToValueAtTime(659.25, context.currentTime + .55);
    gain.gain.setValueAtTime(.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(.09, context.currentTime + .04); gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .8);
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .82);
    oscillator.addEventListener("ended", () => void context.close());
  } catch { /* Audio is optional and may be blocked. */ }
}

interface TransitionState { completedPhase: PomodoroPhase; completedRound: number; nextState: PomodoroCycleState; }

export function FocusTimer() {
  const router = useRouter();
  const timerParser = useCallback((raw: string | null) => parseTimer(raw), []);
  const [persistedTimer, setPersistedTimer, timerHydrated] = useLocalStorage(STORAGE_KEYS.timer, timerParser);
  const [sessions, setSessions] = useLocalStorage<FocusSession[]>(STORAGE_KEYS.sessions, parseSessions);
  const [settings, setSettings, settingsHydrated] = useLocalStorage(STORAGE_KEYS.settings, parseSettings);
  const timer = useCountdown(DEFAULT_SETTINGS.defaultDurationMinutes * 60);
  const cycle = usePomodoroCycle();
  const restoreTimer = timer.restore; const setTimerDuration = timer.setDuration; const restoreCycle = cycle.restore;
  const [mode, setMode] = useState<TimerMode>("free");
  const [taskName, setTaskName] = useState(""); const [category, setCategory] = useState("数学");
  const [startedAt, setStartedAt] = useState<number | null>(null); const [sessionToken, setSessionToken] = useState<string | null>(null); const [savedSessionToken, setSavedSessionToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false); const [endDialogOpen, setEndDialogOpen] = useState(false); const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [transition, setTransition] = useState<TransitionState | null>(null);
  const resumeAfterDialog = useRef(false);

  useEffect(() => {
    if (!timerHydrated || !settingsHydrated || ready) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (persistedTimer) {
        restoreTimer(persistedTimer); setMode(persistedTimer.mode); restoreCycle(persistedTimer.pomodoro);
        setTaskName(persistedTimer.taskName); setCategory(persistedTimer.category); setStartedAt(persistedTimer.startedAt);
        setSessionToken(persistedTimer.sessionToken); setSavedSessionToken(persistedTimer.savedSessionToken);
      } else {
        const initialMode = settings.timerMode; setMode(initialMode); restoreCycle(null);
        setTimerDuration(initialMode === "pomodoro" ? settings.pomodoro.focusMinutes * 60 : settings.defaultDurationMinutes * 60);
      }
      setReady(true);
    });
    return () => { active = false; };
  }, [persistedTimer, ready, restoreCycle, restoreTimer, setTimerDuration, settings.defaultDurationMinutes, settings.pomodoro.focusMinutes, settings.timerMode, settingsHydrated, timerHydrated]);

  useEffect(() => {
    if (!ready) return;
    const snapshot: PersistedTimer = {
      version: 2, status: timer.status, mode, totalSeconds: timer.totalSeconds, remainingSeconds: timer.remainingSeconds,
      endAt: timer.endAt, startedAt, taskName, category, sessionToken, savedSessionToken,
      pomodoro: mode === "pomodoro" ? cycle.state : null,
    };
    setPersistedTimer(snapshot);
  }, [category, cycle.state, mode, ready, savedSessionToken, sessionToken, setPersistedTimer, startedAt, taskName, timer.endAt, timer.remainingSeconds, timer.status, timer.totalSeconds]);

  const enterPomodoroStage = useCallback((nextState: PomodoroCycleState, completedPhase: PomodoroPhase | null, completedRound: number, showDialog: boolean) => {
    const autoStart = shouldAutoStartNextPhase(nextState.phase, settings.pomodoro);
    const actualNext = autoStart && nextState.phase === "focus" && !nextState.cycleId ? { ...nextState, cycleId: createId() } : nextState;
    const duration = getPhaseDurationSeconds(actualNext.phase, settings.pomodoro);
    restoreCycle(actualNext); setSavedSessionToken(null); setCompleteDialogOpen(false);
    if (autoStart) {
      setTransition(null); setStartedAt(Date.now()); setSessionToken(createId()); timer.start(duration);
    } else {
      setStartedAt(null); setSessionToken(null); timer.reset(duration);
      setTransition(showDialog && completedPhase ? { completedPhase, completedRound, nextState: actualNext } : null);
    }
  }, [restoreCycle, settings.pomodoro, timer]);

  useEffect(() => {
    if (!ready || timer.status !== "completed" || timer.remainingSeconds !== 0 || !sessionToken || !startedAt || savedSessionToken === sessionToken) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const completedPhase = mode === "pomodoro" ? cycle.state.phase : "focus";
      if (shouldRecordPhase(mode, completedPhase)) {
        const record: FocusSession = {
          id: sessionToken, taskName: taskName.trim() || "未命名专注", category,
          plannedSeconds: timer.totalSeconds, focusedSeconds: timer.totalSeconds, startedAt, endedAt: Date.now(), status: "completed",
          mode, cycleId: mode === "pomodoro" ? cycle.state.cycleId ?? undefined : undefined,
          pomodoroRound: mode === "pomodoro" ? cycle.state.currentRound : undefined,
          pomodoroRoundsTotal: mode === "pomodoro" ? settings.pomodoro.roundsBeforeLongBreak : undefined,
        };
        setSessions((current) => addSessionUnique(current, record));
      }
      setSavedSessionToken(sessionToken);
      if (settings.soundEnabled) playCompleteTone();
      if (settings.autoFullscreen && document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      if (mode === "free") setCompleteDialogOpen(true);
      else {
        const completedRound = cycle.state.currentRound;
        const next = getNextPomodoroState(cycle.state, settings.pomodoro);
        enterPomodoroStage(next, completedPhase, completedRound, true);
      }
    });
    return () => { active = false; };
  }, [category, cycle.state, enterPomodoroStage, mode, ready, savedSessionToken, sessionToken, setSessions, settings.autoFullscreen, settings.pomodoro, settings.soundEnabled, startedAt, taskName, timer.remainingSeconds, timer.status, timer.totalSeconds]);

  useEffect(() => {
    const cleanTask = taskName.trim() || "未命名专注";
    if (timer.status === "running") {
      if (mode === "pomodoro") document.title = `${formatDuration(timer.remainingSeconds)} · ${cycle.state.phase === "focus" ? `第 ${cycle.state.currentRound}/${settings.pomodoro.roundsBeforeLongBreak} 轮专注` : getPomodoroPhaseLabel(cycle.state.phase)}`;
      else document.title = `${formatDuration(timer.remainingSeconds)} · ${cleanTask}`;
    } else if (timer.status === "paused") document.title = "已暂停 · Aprivity Focus";
    else if (transition) document.title = transition.completedPhase === "focus" ? "专注完成 · Aprivity Focus" : "休息结束 · Aprivity Focus";
    else if (timer.status === "completed") document.title = mode === "pomodoro" && cycle.state.phase !== "focus" ? "休息结束 · Aprivity Focus" : "专注完成 · Aprivity Focus";
    else document.title = "Aprivity Focus";
    return () => { document.title = "Aprivity Focus"; };
  }, [cycle.state.currentRound, cycle.state.phase, mode, settings.pomodoro.roundsBeforeLongBreak, taskName, timer.remainingSeconds, timer.status, transition]);

  const changeMode = (nextMode: TimerMode) => {
    if (timer.status !== "idle" || nextMode === mode) return;
    setMode(nextMode); setSettings({ ...settings, timerMode: nextMode }); setTransition(null); setCompleteDialogOpen(false);
    if (nextMode === "pomodoro") { restoreCycle(null); timer.reset(settings.pomodoro.focusMinutes * 60); }
    else { restoreCycle(null); timer.reset(settings.defaultDurationMinutes * 60); }
    setStartedAt(null); setSessionToken(null); setSavedSessionToken(null);
  };

  const begin = () => {
    if (timer.status !== "idle") return;
    if (mode === "pomodoro" && cycle.state.phase === "focus" && !cycle.state.cycleId) restoreCycle({ ...cycle.state, cycleId: createId() });
    if (settings.autoFullscreen && (mode === "free" || cycle.state.phase === "focus") && !document.fullscreenElement && document.documentElement.requestFullscreen) void document.documentElement.requestFullscreen().catch(() => undefined);
    setStartedAt(Date.now()); setSessionToken(createId()); setSavedSessionToken(null); setCompleteDialogOpen(false); setTransition(null);
    timer.start(mode === "pomodoro" ? getPhaseDurationSeconds(cycle.state.phase, settings.pomodoro) : timer.totalSeconds);
  };

  const resetPomodoroCycle = () => {
    cycle.reset(); timer.reset(settings.pomodoro.focusMinutes * 60); setStartedAt(null); setSessionToken(null); setSavedSessionToken(null); setTransition(null); setCompleteDialogOpen(false); setEndDialogOpen(false);
  };
  const requestEnd = () => {
    if (!settings.confirmEndEnabled) {
      const currentRemaining = timer.status === "running" && timer.endAt ? calculateRemainingSeconds(timer.endAt) : timer.remainingSeconds;
      finishEarly(true, currentRemaining); return;
    }
    resumeAfterDialog.current = timer.status === "running"; if (timer.status === "running") timer.pause(); setEndDialogOpen(true);
  };
  const continueFocus = () => { setEndDialogOpen(false); if (resumeAfterDialog.current) timer.resume(); resumeAfterDialog.current = false; };
  const finishEarly = (save: boolean, remainingOverride = timer.remainingSeconds) => {
    if (save && sessionToken && startedAt) {
      const record = createStoppedSession({
        id: sessionToken, taskName, category, plannedSeconds: timer.totalSeconds, remainingSeconds: remainingOverride, startedAt, endedAt: Date.now(), mode,
        cycleId: mode === "pomodoro" ? cycle.state.cycleId ?? undefined : undefined,
        pomodoroRound: mode === "pomodoro" ? cycle.state.currentRound : undefined,
        pomodoroRoundsTotal: mode === "pomodoro" ? settings.pomodoro.roundsBeforeLongBreak : undefined,
      });
      if (record.focusedSeconds > 0) setSessions((current) => addSessionUnique(current, record));
    }
    resumeAfterDialog.current = false;
    if (mode === "pomodoro") resetPomodoroCycle();
    else {
      setSavedSessionToken(save ? sessionToken : null); setEndDialogOpen(false); setStartedAt(save ? startedAt : null); setSessionToken(save ? sessionToken : null);
      if (save) timer.stop(); else timer.reset(settings.defaultDurationMinutes * 60);
    }
    if (settings.autoFullscreen && document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  };
  const startNewFocus = () => { timer.reset(settings.defaultDurationMinutes * 60); setStartedAt(null); setSessionToken(null); setSavedSessionToken(null); setCompleteDialogOpen(false); };
  const skipBreak = () => {
    if (mode !== "pomodoro" || cycle.state.phase === "focus") return;
    const next = getNextPomodoroState(cycle.state, settings.pomodoro); enterPomodoroStage(next, null, cycle.state.currentRound, false);
  };
  const requestCycleReset = () => {
    if (cycle.state.phase === "focus" && (timer.status === "running" || timer.status === "paused")) { requestEnd(); return; }
    if (window.confirm("结束当前番茄循环？已保存的专注记录会保留。")) resetPomodoroCycle();
  };

  const locked = timer.status === "running" || timer.status === "paused";
  const canEditTask = timer.status === "idle" && (mode === "free" || (cycle.state.phase === "focus" && cycle.state.currentRound === 1 && !cycle.state.cycleId));
  const statusText = mode === "free"
    ? timer.status === "idle" ? "准备开始一次专注" : timer.status === "running" ? "当前专注" : timer.status === "paused" ? "专注已暂停" : "本次专注已结束"
    : timer.status === "paused" ? `${getPomodoroPhaseLabel(cycle.state.phase)}已暂停` : cycle.state.phase === "focus" ? (timer.status === "idle" ? "准备开始番茄专注" : "当前番茄专注") : cycle.state.phase === "short-break" ? "短暂休息" : "完成一轮循环";
  const progress = timer.totalSeconds > 0 ? timer.remainingSeconds / timer.totalSeconds : 0;

  if (!ready) return <div className="timer-loading"><Leaf className="loading-leaf" /><span>正在恢复专注状态…</span></div>;
  return <>
    <section className={`focus-shell${mode === "pomodoro" ? ` pomodoro-mode phase-${cycle.state.phase}` : ""}`}>
      <TimerModeSelector mode={mode} disabled={timer.status !== "idle"} onChange={changeMode} />
      <div className="focus-heading"><p className="focus-status"><Focus size={14} />{statusText}</p><h1>{locked || timer.status === "completed" || (mode === "pomodoro" && cycle.state.cycleId) ? (taskName.trim() || "未命名专注") : "把注意力留给当下"}</h1></div>
      {canEditTask && <TaskInput taskName={taskName} category={category} disabled={false} onTaskChange={setTaskName} onCategoryChange={setCategory} />}
      {mode === "pomodoro" && <PomodoroPhaseHeader state={cycle.state} settings={settings.pomodoro} />}
      <ProgressRing progress={progress} status={timer.status} phase={mode === "pomodoro" ? cycle.state.phase : undefined}><FlipClock seconds={timer.remainingSeconds} animate={timer.status === "running" && !settings.reduceMotion} /><p className="ring-caption">{timer.status === "paused" ? "时间已经为你停下" : mode === "pomodoro" ? `${getPomodoroPhaseLabel(cycle.state.phase)} · ${Math.round(timer.totalSeconds / 60)} 分钟` : timer.status === "running" ? "保持呼吸，继续向前" : timer.status === "completed" ? (timer.remainingSeconds === 0 ? "专注已完成并记录" : "实际专注时长已保存") : `${Math.round(timer.totalSeconds / 60)} 分钟专注`}</p></ProgressRing>
      {mode === "free" ? <TimerControls status={timer.status} onStart={begin} onPause={timer.pause} onResume={timer.resume} onEnd={requestEnd} onReset={startNewFocus} onHistory={() => router.push("/history")} /> : <PomodoroTimerControls status={timer.status} phase={cycle.state.phase} onStart={begin} onPause={timer.pause} onResume={timer.resume} onEndFocus={requestEnd} onSkipBreak={skipBreak} onResetCycle={resetPomodoroCycle} />}
      {mode === "pomodoro" && (cycle.state.cycleId || cycle.state.phase !== "focus" || cycle.state.currentRound > 1) && <button type="button" className="end-cycle-button" onClick={requestCycleReset}>结束番茄循环</button>}
      {mode === "free" && timer.status === "idle" && <TimePresets selectedMinutes={Math.round(timer.totalSeconds / 60)} disabled={locked} onSelect={(minutes) => timer.setDuration(minutes * 60)} />}
      <TodaySummary sessions={sessions} />
    </section>
    <ConfirmEndDialog open={endDialogOpen} onSave={() => finishEarly(true)} onDiscard={() => finishEarly(false)} onContinue={continueFocus} />
    <CompleteDialog open={completeDialogOpen} taskName={taskName.trim() || "未命名专注"} onClose={() => setCompleteDialogOpen(false)} onHistory={() => router.push("/history")} />
    <PomodoroTransitionDialog open={Boolean(transition)} completedPhase={transition?.completedPhase ?? null} completedRound={transition?.completedRound ?? 1} nextState={transition?.nextState ?? INITIAL_POMODORO_STATE} settings={settings.pomodoro} taskName={taskName.trim() || "未命名专注"} onStart={() => { setTransition(null); begin(); }} onLater={() => setTransition(null)} />
  </>;
}
