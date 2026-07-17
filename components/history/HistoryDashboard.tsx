"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sprout } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  aggregateSessionsByDay,
  createHeatmapDateRange,
  getDefaultSelectedDateKey,
  getHistoryOverview,
  getSessionsForDate,
} from "@/lib/history-analytics";
import { parseSessions, parseSettings, STORAGE_KEYS } from "@/lib/storage";
import { DayFocusDetails } from "./DayFocusDetails";
import { FocusHeatmap } from "./FocusHeatmap";
import { HistoryList } from "./HistoryList";
import { HistoryOverview } from "./HistoryOverview";

export function HistoryDashboard() {
  const [sessions, setSessions, hydrated] = useLocalStorage(STORAGE_KEYS.sessions, parseSessions);
  const [settings, , settingsHydrated] = useLocalStorage(STORAGE_KEYS.settings, parseSettings);
  const [category, setCategory] = useState("全部");
  const [today, setToday] = useState<Date | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectionReady, setSelectionReady] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) setToday(new Date()); });
    return () => { active = false; };
  }, []);

  const dates = useMemo(() => today ? createHeatmapDateRange(today) : [], [today]);
  const summaries = useMemo(
    () => aggregateSessionsByDay(sessions, dates, category),
    [category, dates, sessions],
  );
  const overview = useMemo(() => getHistoryOverview(summaries), [summaries]);
  const visibleSessions = useMemo(
    () => (category === "全部" ? sessions : sessions.filter((session) => session.category === category)),
    [category, sessions],
  );
  const selectedSummary = useMemo(
    () => summaries.find((summary) => summary.dateKey === selectedDateKey) ?? null,
    [selectedDateKey, summaries],
  );
  const selectedSessions = useMemo(
    () => selectedDateKey ? getSessionsForDate(sessions, selectedDateKey, category) : [],
    [category, selectedDateKey, sessions],
  );

  useEffect(() => {
    if (!hydrated || !today || selectionReady) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setSelectedDateKey(getDefaultSelectedDateKey(summaries, today));
      setSelectionReady(true);
    });
    return () => { active = false; };
  }, [hydrated, selectionReady, summaries, today]);

  const handleCategoryChange = useCallback((nextCategory: string) => {
    setCategory(nextCategory);
    if (!today) {
      setSelectedDateKey(null);
      return;
    }
    const nextSummaries = aggregateSessionsByDay(sessions, dates, nextCategory);
    setSelectedDateKey(getDefaultSelectedDateKey(nextSummaries, today));
  }, [dates, sessions, today]);

  const handleDelete = useCallback((id: string) => {
    const nextSessions = sessions.filter((session) => session.id !== id);
    setSessions(nextSessions);
    if (!today) return;
    const selectedStillHasRecords = selectedDateKey !== null &&
      getSessionsForDate(nextSessions, selectedDateKey, category).length > 0;
    if (!selectedStillHasRecords) {
      setSelectedDateKey(getDefaultSelectedDateKey(aggregateSessionsByDay(nextSessions, dates, category), today));
    }
  }, [category, dates, selectedDateKey, sessions, setSessions, today]);

  const handleClear = useCallback(() => {
    setSessions([]);
    setSelectedDateKey(null);
  }, [setSessions]);

  if (!hydrated || !settingsHydrated || !today) {
    return (
      <div className="history-loading surface" role="status">
        <Sprout aria-hidden="true" />
        <p>正在整理你的本地学习轨迹…</p>
      </div>
    );
  }

  return (
    <div className={`history-dashboard${settings.reduceMotion ? " reduce-motion" : ""}`}>
      <HistoryOverview data={overview} category={category} />
      <FocusHeatmap
        summaries={summaries}
        selectedDateKey={selectedDateKey}
        today={today}
        category={category}
        hasSessions={sessions.length > 0}
        onSelectDate={setSelectedDateKey}
        onCategoryChange={handleCategoryChange}
      />
      <DayFocusDetails summary={selectedSummary} sessions={selectedSessions} />
      <HistoryList
        sessions={visibleSessions}
        totalSessionCount={sessions.length}
        category={category}
        onDelete={handleDelete}
        onClear={handleClear}
      />
    </div>
  );
}
