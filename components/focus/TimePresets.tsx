"use client";

import { useState } from "react";

const PRESETS = [25, 45, 60, 80];

export function TimePresets({ selectedMinutes, disabled, onSelect }: { selectedMinutes: number; disabled: boolean; onSelect: (minutes: number) => void }) {
  const [customOpen, setCustomOpen] = useState(!PRESETS.includes(selectedMinutes));
  const [custom, setCustom] = useState(String(selectedMinutes));
  const [error, setError] = useState("");
  const applyCustom = () => {
    const minutes = Number(custom);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 720) {
      setError("请输入 1–720 之间的整数分钟数"); return;
    }
    setError(""); onSelect(minutes);
  };
  return (
    <section className="preset-section" aria-labelledby="duration-label">
      <p id="duration-label">专注时长</p>
      <div className="preset-row">
        {PRESETS.map((minutes) => <button key={minutes} type="button" disabled={disabled}
          className={selectedMinutes === minutes && !customOpen ? "active" : ""}
          onClick={() => { setCustomOpen(false); setError(""); onSelect(minutes); }}>{minutes} 分钟</button>)}
        <button type="button" disabled={disabled} className={customOpen ? "active" : ""} onClick={() => setCustomOpen(true)}>自定义</button>
      </div>
      {customOpen && <div className="custom-duration">
        <label htmlFor="custom-minutes">分钟</label>
        <input id="custom-minutes" type="number" min="1" max="720" step="1" value={custom} disabled={disabled}
          onChange={(event) => setCustom(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") applyCustom(); }} />
        <button type="button" onClick={applyCustom} disabled={disabled}>应用</button>
        {error && <span role="alert">{error}</span>}
      </div>}
    </section>
  );
}
