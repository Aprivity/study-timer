import { Check } from "lucide-react";
import type { BackgroundPreset } from "@/types/background";

export function BackgroundPreview({ preset, selected, onSelect }: { preset: BackgroundPreset; selected: boolean; onSelect: () => void }) {
  return <button type="button" className={`background-preview${selected ? " selected" : ""}`} aria-pressed={selected} onClick={onSelect} title={preset.description}>
    <span className="background-thumbnail" style={{ background: preset.previewBackground }}><span className="preview-check" aria-hidden="true"><Check /></span></span>
    <span className="background-preview-copy"><strong>{preset.name}</strong><small>{preset.description}</small></span>
  </button>;
}
