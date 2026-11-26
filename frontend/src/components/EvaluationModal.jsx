import React, { useState } from "react";
import {
  X,
  Award,
  MessageSquare,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { API_BASE } from "../config";

export default function EvaluationModal({
  isOpen,
  submission,
  currentUser,
  onClose,
  onEvaluated
}) {
  if (!isOpen || !submission) return null;

  const maxMarks = submission.max_marks || 100;
  const [marks, setMarks] = useState(submission.marks ?? "");
  const [feedback, setFeedback] = useState(submission.feedback || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const marksNum = parseFloat(marks);
    if (isNaN(marksNum) || marksNum < 0 || marksNum > maxMarks) {
      setError(`Please enter a valid mark between 0 and ${maxMarks}.`);
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/submissions/${submission.id}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marks: marksNum,
          feedback: feedback.trim(),
          teacher_email: currentUser.email,
          teacher_role: currentUser.role
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to save evaluation.");
      }

      onEvaluated(data.submission);
      onClose();
    } catch (err) {
      setError(err.message || "An error occurred while evaluating.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="campus-modal-backdrop">
      <div className="campus-modal-card" style={{ maxWidth: "520px" }}>
        <div className="campus-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "#fef3c7", color: "#d97706", padding: "8px", borderRadius: "8px" }}>
              <Award size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Evaluate Student Submission</h3>
              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                {submission.student_name} • {submission.assignment_title}
              </span>
            </div>
          </div>
          <button type="button" className="campus-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && (
            <div className="auth-alert error" style={{ padding: "10px 14px", fontSize: "0.88rem" }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", fontSize: "0.85rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>Document:</span>
              <strong style={{ color: "#0f172a" }}>{submission.original_filename}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
              <span style={{ color: "#64748b" }}>Digital Signature Status:</span>
              <strong style={{ color: submission.verification_status === "VALID" ? "#059669" : "#d97706" }}>
                {submission.verification_status}
              </strong>
            </div>
          </div>

          <div>
            <label className="auth-label">Award Marks (Out of {maxMarks}) *</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max={maxMarks}
              className="auth-input"
              placeholder={`Enter score (0 - ${maxMarks})`}
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="auth-label">Instructor Feedback & Grading Comments</label>
            <textarea
              className="auth-input"
              rows={4}
              placeholder="Provide constructive feedback, areas for improvement, or praise for student work..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <CheckCircle2 size={16} />
              <span>{loading ? "Saving..." : "Save Evaluation"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
