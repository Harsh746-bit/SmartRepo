import React from "react";
import { AlertTriangle, Trash2, RotateCcw, X } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger", // 'danger' | 'warning' | 'primary'
  onConfirm,
  onCancel
}) {
  if (!isOpen) return null;

  return (
    <div className="campus-modal-backdrop" onClick={onCancel}>
      <div className="campus-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-dialog-header">
          <div className={`modal-icon-badge badge-${variant}`}>
            {variant === "danger" ? (
              <Trash2 size={22} />
            ) : (
              <AlertTriangle size={22} />
            )}
          </div>
          <button
            type="button"
            className="modal-dialog-close"
            onClick={onCancel}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-dialog-body">
          <h3 className="modal-dialog-title">{title}</h3>
          <p className="modal-dialog-message">{message}</p>
        </div>

        <div className="modal-dialog-footer">
          <button
            type="button"
            className="btn-modal-cancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn-modal-confirm confirm-${variant}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
