import React, { useState } from "react";
import { XCircle, X } from "lucide-react";

export default function RejectionModal({
  isOpen,
  doc,
  onConfirmReject,
  onCancel
}) {
  const [reason, setReason] = useState("");

  if (!isOpen || !doc) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirmReject(doc.id, reason.trim());
    setReason("");
  };

  return (
    <div className="campus-modal-backdrop" onClick={onCancel}>
      <div className="campus-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-dialog-header">
          <div className="modal-icon-badge badge-danger">
            <XCircle size={22} />
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
          <h3 className="modal-dialog-title">Reject Document Submission</h3>
          <p className="modal-dialog-message">
            Provide feedback for <strong>"{doc.original_filename}"</strong>. The student or faculty member will see this guidance.
          </p>

          <form id="rejection-form" onSubmit={handleSubmit} className="rejection-form-container">
            <label className="form-input-label" htmlFor="rejection-reason">
              Guidance / Reason for Revision
            </label>
            <textarea
              id="rejection-reason"
              className="campus-textarea"
              rows={4}
              placeholder="e.g. Please update references according to APA/IEEE standards and ensure all diagrams are legible."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </form>
        </div>

        <div className="modal-dialog-footer">
          <button
            type="button"
            className="btn-modal-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="rejection-form"
            className="btn-modal-confirm confirm-danger"
          >
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
}
