import { Check, History, X } from "lucide-react";

export function CompleteDialog({ open, taskName, onClose, onHistory }: { open: boolean; taskName: string; onClose: () => void; onHistory: () => void }) {
  if (!open) return null;
  return <div className="dialog-backdrop" role="presentation">
    <div className="dialog complete-dialog" role="dialog" aria-modal="true" aria-labelledby="complete-title">
      <button className="dialog-close" onClick={onClose} aria-label="关闭完成提示"><X size={18} /></button>
      <span className="complete-icon"><Check size={25} /></span><p className="eyebrow">Focus complete</p>
      <h2 id="complete-title">这次专注完成了</h2><p>“{taskName || "未命名专注"}” 已保存到今日记录。</p>
      <div className="dialog-actions"><button className="primary-button" onClick={onClose}>完成</button><button className="secondary-button" onClick={onHistory}><History size={17} />查看记录</button></div>
    </div>
  </div>;
}
