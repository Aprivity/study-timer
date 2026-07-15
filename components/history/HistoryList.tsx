"use client";

import { useMemo, useState } from "react";
import { BookOpen, Filter, Sprout, Trash2 } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { parseSessions, STORAGE_KEYS } from "@/lib/storage";
import { CATEGORIES } from "@/components/focus/TaskInput";
import { HistoryItem } from "./HistoryItem";

function dateKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateLabel(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (dateKey(date.getTime()) === dateKey(today.getTime())) return "今天";
  if (dateKey(date.getTime()) === dateKey(yesterday.getTime())) return "昨天";
  return date.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" });
}

export function HistoryList() {
  const [sessions, setSessions, hydrated] = useLocalStorage(STORAGE_KEYS.sessions, parseSessions);
  const [category, setCategory] = useState("全部");
  const [confirmClear, setConfirmClear] = useState(false);
  const grouped = useMemo(() => {
    const filtered = category === "全部" ? sessions : sessions.filter((item) => item.category === category);
    return filtered.sort((a, b) => b.endedAt - a.endedAt).reduce<Record<string, typeof sessions>>((groups, item) => {
      const key = dateKey(item.endedAt); (groups[key] ??= []).push(item); return groups;
    }, {});
  }, [category, sessions]);
  const hasVisible = Object.keys(grouped).length > 0;

  return <>
    <div className="history-toolbar">
      <label><Filter size={16} /><span>分类</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option>全部</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
      {sessions.length > 0 && <button className="clear-button" type="button" onClick={() => setConfirmClear(true)}><Trash2 size={16} />清空全部</button>}
    </div>
    {!hydrated ? <div className="empty-history"><Sprout /><p>正在读取本地记录…</p></div> : !hasVisible ? <div className="empty-history"><BookOpen /><h2>{sessions.length ? "这个分类还没有记录" : "还没有专注记录"}</h2><p>完成一次专注后，它会安静地出现在这里。</p></div> :
      <div className="history-groups">{Object.entries(grouped).map(([key, items]) => <section key={key}><h2>{dateLabel(key)}<span>{items.length} 次</span></h2><div>{items.map((item) => <HistoryItem key={item.id} session={item} onDelete={(id) => setSessions((current) => current.filter((record) => record.id !== id))} />)}</div></section>)}</div>}
    {confirmClear && <div className="dialog-backdrop"><div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="clear-title"><p className="eyebrow">不可撤销</p><h2 id="clear-title">清空全部记录？</h2><p>这会永久删除保存在当前浏览器中的所有专注记录。</p><div className="dialog-actions"><button className="danger-button" onClick={() => { setSessions([]); setConfirmClear(false); }}>确认清空</button><button className="secondary-button" onClick={() => setConfirmClear(false)}>取消</button></div></div></div>}
  </>;
}
