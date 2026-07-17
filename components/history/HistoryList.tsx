"use client";

import { useMemo, useState } from "react";
import { BookOpen, Trash2 } from "lucide-react";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { addLocalDays, getLocalDateKey, parseLocalDateKey, startOfLocalDay } from "@/lib/local-date";
import type { FocusSession } from "@/types/focus-session";
import { HistoryItem } from "./HistoryItem";

function dateLabel(key: string) {
  const date = parseLocalDateKey(key);
  const today = new Date();
  const yesterday = addLocalDays(startOfLocalDay(today), -1);
  if (getLocalDateKey(date) === getLocalDateKey(today)) return "今天";
  if (getLocalDateKey(date) === getLocalDateKey(yesterday)) return "昨天";
  return date.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" });
}

export function HistoryList({ sessions, totalSessionCount, category, onDelete, onClear }: {
  sessions: FocusSession[];
  totalSessionCount: number;
  category: string;
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FocusSession | null>(null);
  const clearDialogRef = useDialogFocus(confirmClear, () => setConfirmClear(false));
  const deleteDialogRef = useDialogFocus(Boolean(pendingDelete), () => setPendingDelete(null));
  const grouped = useMemo(() => {
    return [...sessions].sort((a, b) => b.endedAt - a.endedAt).reduce<Record<string, FocusSession[]>>((groups, item) => {
      const key = getLocalDateKey(item.endedAt);
      (groups[key] ??= []).push(item);
      return groups;
    }, {});
  }, [sessions]);
  const hasVisible = Object.keys(grouped).length > 0;

  return (
    <section className="history-records" aria-labelledby="history-records-title">
      <div className="history-toolbar">
        <div><p className="eyebrow">All sessions</p><h2 id="history-records-title">历史记录列表</h2></div>
        {totalSessionCount > 0 && <button className="clear-button" type="button" onClick={() => setConfirmClear(true)}><Trash2 size={16} />清空全部</button>}
      </div>
      {!hasVisible ? (
        <div className="empty-history">
          <BookOpen />
          <h3>{totalSessionCount ? `“${category}”分类还没有专注记录` : "还没有专注记录"}</h3>
          <p>完成一次专注后，它会安静地出现在这里。</p>
        </div>
      ) : (
        <div className="history-groups">
          {Object.entries(grouped).map(([key, items]) => (
            <section key={key}>
              <h3>{dateLabel(key)}<span>{items.length} 次</span></h3>
              <div>{items.map((item) => <HistoryItem key={item.id} session={item} onDelete={() => setPendingDelete(item)} />)}</div>
            </section>
          ))}
        </div>
      )}
      {confirmClear && (
        <div className="dialog-backdrop">
          <div ref={clearDialogRef} className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="clear-title" aria-describedby="clear-description">
            <p className="eyebrow">不可撤销</p>
            <h2 id="clear-title">清空全部记录？</h2>
            <p id="clear-description">这会永久删除保存在当前浏览器中的所有专注记录。</p>
            <div className="dialog-actions">
              <button className="danger-button" onClick={() => { onClear(); setConfirmClear(false); }}>确认清空</button>
              <button className="secondary-button" onClick={() => setConfirmClear(false)}>取消</button>
            </div>
          </div>
        </div>
      )}
      {pendingDelete && (
        <div className="dialog-backdrop">
          <div ref={deleteDialogRef} className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
            <p className="eyebrow">删除记录</p>
            <h2 id="delete-title">确认删除“{pendingDelete.taskName}”？</h2>
            <p id="delete-description">删除后，热力图、历史概览和当天详情会立即更新，且无法撤销。</p>
            <div className="dialog-actions">
              <button className="danger-button" onClick={() => { onDelete(pendingDelete.id); setPendingDelete(null); }}>确认删除</button>
              <button className="secondary-button" onClick={() => setPendingDelete(null)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
