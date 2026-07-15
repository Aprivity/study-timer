"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { calculateRemainingSeconds, clampDuration } from "@/lib/timer";
import type { PersistedTimer, TimerStatus } from "@/types/timer";

interface CountdownOptions { onComplete?: () => void; }

export function useCountdown(initialSeconds = 2700, options: CountdownOptions = {}) {
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [totalSeconds, setTotalSeconds] = useState(clampDuration(initialSeconds));
  const [remainingSeconds, setRemainingSeconds] = useState(clampDuration(initialSeconds));
  const [endAt, setEndAt] = useState<number | null>(null);
  const onCompleteRef = useRef(options.onComplete);
  const completionFiredRef = useRef(false);

  useEffect(() => { onCompleteRef.current = options.onComplete; }, [options.onComplete]);

  const complete = useCallback(() => {
    setRemainingSeconds(0);
    setEndAt(null);
    setStatus("completed");
    if (!completionFiredRef.current) {
      completionFiredRef.current = true;
      onCompleteRef.current?.();
    }
  }, []);

  const sync = useCallback(() => {
    if (status !== "running" || endAt === null) return;
    const next = calculateRemainingSeconds(endAt);
    if (next <= 0) complete(); else setRemainingSeconds(next);
  }, [complete, endAt, status]);

  useEffect(() => {
    if (status !== "running" || endAt === null) return;
    const interval = window.setInterval(sync, 250);
    const handleVisibility = () => { if (document.visibilityState === "visible") sync(); };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [endAt, status, sync]);

  const start = useCallback(() => {
    completionFiredRef.current = false;
    setRemainingSeconds(totalSeconds);
    setEndAt(Date.now() + totalSeconds * 1000);
    setStatus("running");
  }, [totalSeconds]);

  const pause = useCallback(() => {
    if (status !== "running" || endAt === null) return;
    const next = calculateRemainingSeconds(endAt);
    if (next === 0) {
      complete();
      return;
    }
    setRemainingSeconds(next);
    setEndAt(null);
    setStatus("paused");
  }, [complete, endAt, status]);

  const resume = useCallback(() => {
    if (status !== "paused" || remainingSeconds <= 0) return;
    setEndAt(Date.now() + remainingSeconds * 1000);
    setStatus("running");
  }, [remainingSeconds, status]);

  const stop = useCallback(() => {
    setEndAt(null);
    setStatus("completed");
  }, []);

  const reset = useCallback((seconds = totalSeconds) => {
    const next = clampDuration(seconds);
    completionFiredRef.current = false;
    setEndAt(null);
    setTotalSeconds(next);
    setRemainingSeconds(next);
    setStatus("idle");
  }, [totalSeconds]);

  const setDuration = useCallback((seconds: number) => {
    if (status === "running" || status === "paused") return;
    const next = clampDuration(seconds);
    setTotalSeconds(next);
    setRemainingSeconds(next);
    setEndAt(null);
    setStatus("idle");
    completionFiredRef.current = false;
  }, [status]);

  const restore = useCallback((timer: PersistedTimer) => {
    setTotalSeconds(timer.totalSeconds);
    if (timer.status === "running" && timer.endAt) {
      const next = calculateRemainingSeconds(timer.endAt);
      setRemainingSeconds(next);
      setEndAt(next > 0 ? timer.endAt : null);
      setStatus(next > 0 ? "running" : "completed");
      completionFiredRef.current = next === 0;
    } else {
      setRemainingSeconds(timer.remainingSeconds);
      setEndAt(null);
      setStatus(timer.status);
      completionFiredRef.current = timer.status === "completed";
    }
  }, []);

  return { status, totalSeconds, remainingSeconds, endAt, start, pause, resume, stop, reset, setDuration, restore };
}
