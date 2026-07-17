"use client";

import { useCallback, useState } from "react";
import { getNextPomodoroState, INITIAL_POMODORO_STATE } from "@/lib/pomodoro";
import type { PomodoroCycleState, PomodoroSettings } from "@/types/pomodoro";

export function usePomodoroCycle(initial: PomodoroCycleState = INITIAL_POMODORO_STATE) {
  const [state, setState] = useState<PomodoroCycleState>({ ...initial });
  const restore = useCallback((next: PomodoroCycleState | null) => setState(next ? { ...next } : { ...INITIAL_POMODORO_STATE }), []);
  const beginCycle = useCallback((cycleId: string) => setState((current) => current.cycleId ? current : { ...current, cycleId }), []);
  const advance = useCallback((settings: PomodoroSettings) => setState((current) => getNextPomodoroState(current, settings)), []);
  const reset = useCallback(() => setState({ ...INITIAL_POMODORO_STATE }), []);
  return { state, restore, beginCycle, advance, reset };
}
