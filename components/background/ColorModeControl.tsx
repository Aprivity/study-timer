import type { BackgroundColorMode } from "@/types/background";

export function ColorModeControl({ value, onChange }: { value: BackgroundColorMode; onChange: (mode: BackgroundColorMode) => void }) {
  return <fieldset className="color-mode-control"><legend>界面文字模式</legend><div>
    <button type="button" aria-pressed={value === "dark"} className={value === "dark" ? "selected" : ""} onClick={() => onChange("dark")}>浅色文字</button>
    <button type="button" aria-pressed={value === "light"} className={value === "light" ? "selected" : ""} onClick={() => onChange("light")}>深色文字</button>
  </div></fieldset>;
}
