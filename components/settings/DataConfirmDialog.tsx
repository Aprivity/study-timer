"use client";

import { AlertTriangle } from "lucide-react";
import { useDialogFocus } from "@/hooks/useDialogFocus";

export function DataConfirmDialog({ open, title, description, confirmLabel, busy, onCancel, onConfirm }: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useDialogFocus(open, onCancel);
  if (!open) return null;
  return <div className="dialog-backdrop" role="presentation">
    <div ref={dialogRef} className="dialog data-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="data-confirm-title" aria-describedby="data-confirm-description">
      <AlertTriangle className="confirm-warning-icon" aria-hidden="true" />
      <h2 id="data-confirm-title">{title}</h2>
      <p id="data-confirm-description">{description}</p>
      <div className="dialog-actions"><button type="button" className="danger-button" disabled={busy} onClick={onConfirm}>{confirmLabel}</button><button type="button" className="secondary-button" disabled={busy} onClick={onCancel}>取消</button></div>
    </div>
  </div>;
}
