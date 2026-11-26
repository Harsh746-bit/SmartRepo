import React, { useState } from "react";
import {
  X,
  FileText,
  Calendar,
  Award,
  Clock,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  AlertCircle
} from "lucide-react";
import { API_BASE } from "../config";

export default function AssignmentCreationModal({
  isOpen,
  subject,
  currentUser,
  onClose,
  onAssignmentCreated
}) {
  if (!isOpen || !subject) return null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [maxMarks, setMaxMarks] = useState(100);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [allowedFormats, setAllowedFormats] = useState([".pdf", ".docx", ".txt"]);
  const [allowLate, setAllowLate] = useState(true);
  const [allowDup, setAllowDup] = useState(false);
  const [status, setStatus] = useState("Published");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleFormat = (fmt) => {
    if (allowedFormats.includes(fmt)) {
      if (allowedFormats.length > 1) {
        setAllowedFormats(allowedFormats.filter((f) => f !== fmt));
      }
    } else {
      setAllowedFormats([...allowedFormats, fmt]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide an assignment title.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        max_marks: Number(maxMarks),
        deadline: new Date(deadline).toISOString(),
        allowed_formats: allowedFormats,
        allow_late_submissions: allowLate,
        allow_duplicate_submissions: allowDup,
        status: status,
        teacher_email: currentUser.email,
        user_email: currentUser.email,
        user_role: currentUser.role
      };

      const res = await fetch(`${API_BASE}/subjects/${subject.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to create assignment.");
      }

      onAssignmentCreated(data.assignment);
      onClose();
    } catch (err) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="campus-modal-backdrop">
      <div className="campus-modal-card" style={{ maxWidth: "620px" }}>
        <div className="campus-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "#eff6ff", color: "#2563eb", padding: "8px", borderRadius: "8px" }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Create New Assignment</h3>
              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                Course: {subject.subject_name} ({subject.subject_code})
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

          <div>
            <label className="auth-label">Assignment Title *</label>
            <input
              type="text"
              className="auth-input"
              placeholder="e.g. Lab Assignment 1: CPU Scheduling Simulation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="auth-label">Short Description</label>
            <input
              type="text"
              className="auth-input"
              placeholder="Brief summary of assignment goals and criteria"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="auth-label">Detailed Instructions</label>
            <textarea
              className="auth-input"
              rows={4}
              placeholder="Provide complete guidelines, expected deliverables, and formatting guidelines for students..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label className="auth-label">Maximum Marks</label>
              <input
                type="number"
                min="1"
                max="1000"
                className="auth-input"
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="auth-label">Submission Deadline *</label>
              <input
                type="datetime-local"
                className="auth-input"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="auth-label">Permitted File Formats</label>
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              {[".pdf", ".docx", ".txt", ".pptx", ".zip"].map((fmt) => (
                <button
                  type="button"
                  key={fmt}
                  onClick={() => toggleFormat(fmt)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                    fontWeight: "600",
                    border: allowedFormats.includes(fmt) ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                    background: allowedFormats.includes(fmt) ? "#eff6ff" : "#ffffff",
                    color: allowedFormats.includes(fmt) ? "#2563eb" : "#64748b",
                    cursor: "pointer"
                  }}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: "0.88rem", fontWeight: "600", color: "#1e293b" }}>Allow Late Submissions</span>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>Late uploads will be flagged as 'Late' but accepted.</p>
              </div>
              <button
                type="button"
                onClick={() => setAllowLate(!allowLate)}
                style={{ background: "none", border: "none", cursor: "pointer", color: allowLate ? "#2563eb" : "#94a3b8" }}
              >
                {allowLate ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: "0.88rem", fontWeight: "600", color: "#1e293b" }}>Allow Duplicate File Submissions</span>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>If disabled, identical binary SHA-256 hashes will be rejected.</p>
              </div>
              <button
                type="button"
                onClick={() => setAllowDup(!allowDup)}
                style={{ background: "none", border: "none", cursor: "pointer", color: allowDup ? "#2563eb" : "#94a3b8" }}
              >
                {allowDup ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>
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
              {loading ? "Publishing..." : "Publish Assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
