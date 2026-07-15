import { X } from "lucide-react";

export function ConfirmEndDialog({ open, onSave, onDiscard, onContinue }: { open: boolean; onSave: () => void; onDiscard: () => void; onContinue: () => void }) {
  if (!open) return null;
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(e) => { if (e.currentTarget === e.target) onContinue(); }}>
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="end-title">
      <button className="dialog-close" onClick={onContinue} aria-label="关闭对话框"><X size={18} /></button>
      <p className="eyebrow">结束确认</p><h2 id="end-title">要结束本次专注吗？</h2>
      <p>你可以保留已经投入的时间，也可以放弃本次记录。</p>
      <div className="dialog-actions"><button className="primary-button" onClick={onSave}>保存当前专注时长</button><button className="danger-button" onClick={onDiscard}>放弃本次记录</button><button className="secondary-button" onClick={onContinue}>继续专注</button></div>
    </div>
  </div>;
}
