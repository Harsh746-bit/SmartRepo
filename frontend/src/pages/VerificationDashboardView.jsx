import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  KeyRound,
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  Copy,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck
} from "lucide-react";
import StatsCard from "../components/StatsCard";
import SignatureDetailsModal from "../components/SignatureDetailsModal";
import { API_BASE } from "../config";

export default function VerificationDashboardView({ currentUser }) {
  const [submissions, setSubmissions] = useState([]);
  const [metrics, setMetrics] = useState({
    total_submissions: 0,
    valid_verified: 0,
    tampered: 0,
    invalid: 0,
    revoked: 0,
    unverified: 0
  });
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const email = currentUser?.email || "";
      const role = currentUser?.role || "Student";
      const res = await fetch(
        `${API_BASE}/verification/dashboard?user_email=${encodeURIComponent(email)}&user_role=${encodeURIComponent(role)}&status_filter=${statusFilter}`
      );
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics || {});
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error("Error fetching verification dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [statusFilter, currentUser]);

  const filteredSubmissions = submissions.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.student_name?.toLowerCase().includes(q) ||
      s.student_email?.toLowerCase().includes(q) ||
      s.assignment_title?.toLowerCase().includes(q) ||
      s.subject_name?.toLowerCase().includes(q) ||
      s.sha256_hash?.toLowerCase().includes(q) ||
      s.original_filename?.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "VALID":
        return {
          bg: "#d1fae5",
          color: "#065f46",
          icon: <ShieldCheck size={14} />,
          text: "Signature Verified"
        };
      case "TAMPERED":
        return {
          bg: "#fee2e2",
          color: "#991b1b",
          icon: <ShieldAlert size={14} />,
          text: "File Tampered"
        };
      case "KEY_REVOKED":
        return {
          bg: "#fef3c7",
          color: "#92400e",
          icon: <AlertTriangle size={14} />,
          text: "Key Revoked"
        };
      case "INVALID":
        return {
          bg: "#fee2e2",
          color: "#991b1b",
          icon: <ShieldX size={14} />,
          text: "Verification Failed"
        };
      default:
        return {
          bg: "#f1f5f9",
          color: "#475569",
          icon: <Clock size={14} />,
          text: "Pending Signature"
        };
    }
  };

  const handleCopyHash = (hash, id) => {
    navigator.clipboard.writeText(hash);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="campus-view-container">
      {/* Page Header */}
      <div className="campus-page-header">
        <div>
          <h1 className="campus-page-title">Document Verification Center</h1>
          <p className="campus-page-subtitle">
            Cryptographic integrity, RSA digital signature validation, and non-repudiation audit records
          </p>
        </div>
        <button
          type="button"
          onClick={fetchDashboardData}
          className="btn btn-secondary"
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <RefreshCw size={14} className={loading ? "spin-animate" : ""} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="campus-stats-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <StatsCard
          title="Total Submissions"
          value={metrics.total_submissions || 0}
          icon={FileCheck}
          variant="primary"
        />
        <StatsCard
          title="Verified Authentic"
          value={metrics.valid_verified || 0}
          icon={ShieldCheck}
          variant="success"
        />
        <StatsCard
          title="Tampering Detected"
          value={metrics.tampered || 0}
          icon={ShieldAlert}
          variant="danger"
        />
        <StatsCard
          title="Revoked Keys"
          value={metrics.revoked || 0}
          icon={AlertTriangle}
          variant="warning"
        />
        <StatsCard
          title="Pending / Unverified"
          value={metrics.unverified || 0}
          icon={KeyRound}
          variant="default"
        />
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "14px",
          background: "#ffffff",
          padding: "16px",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          margin: "20px 0 16px"
        }}
      >
        <div style={{ position: "relative", flex: 1, maxWidth: "420px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "11px", color: "#94a3b8" }} />
          <input
            type="text"
            className="auth-input"
            style={{ paddingLeft: "36px" }}
            placeholder="Search by student, course, file name, or SHA-256 hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {["All", "VALID", "TAMPERED", "KEY_REVOKED", "INVALID", "UNVERIFIED"].map((st) => (
            <button
              type="button"
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: "600",
                cursor: "pointer",
                border: statusFilter === st ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                background: statusFilter === st ? "#eff6ff" : "#ffffff",
                color: statusFilter === st ? "#2563eb" : "#64748b"
              }}
            >
              {st === "All" ? "All Statuses" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions Verification Table */}
      <div style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            <RefreshCw size={24} className="spin-animate" style={{ margin: "0 auto 8px" }} />
            <p style={{ margin: 0 }}>Verifying cryptographic records...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            <ShieldCheck size={36} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
            <h4 style={{ margin: "0 0 4px", color: "#1e293b" }}>No Verification Records Found</h4>
            <p style={{ margin: 0, fontSize: "0.85rem" }}>
              {statusFilter !== "All"
                ? `No submissions found with status '${statusFilter}'.`
                : "Student submissions with RSA signatures and SHA-256 hashes will appear here."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "12px 16px" }}>Student & Course</th>
                  <th style={{ padding: "12px 16px" }}>Document & SHA-256 Fingerprint</th>
                  <th style={{ padding: "12px 16px" }}>Digital Signature Status</th>
                  <th style={{ padding: "12px 16px" }}>Submission Time</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((sub) => {
                  const badge = getStatusBadge(sub.verification_status);
                  return (
                    <tr
                      key={sub.id}
                      style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <strong style={{ color: "#0f172a", display: "block" }}>{sub.student_name}</strong>
                        <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                          {sub.subject_name} • {sub.assignment_title}
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px", maxWidth: "260px" }}>
                        <span style={{ fontWeight: "600", color: "#1e293b", display: "block" }}>
                          {sub.original_filename}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                          <span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#64748b" }}>
                            {sub.sha256_hash?.substring(0, 16)}...
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyHash(sub.sha256_hash, sub.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", padding: "2px" }}
                            title="Copy full SHA-256 hash"
                          >
                            <Copy size={11} />
                          </button>
                          {copiedId === sub.id && (
                            <span style={{ fontSize: "0.68rem", color: "#16a34a", fontWeight: "600" }}>Copied</span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "4px 10px",
                            borderRadius: "14px",
                            fontSize: "0.76rem",
                            fontWeight: "700",
                            background: badge.bg,
                            color: badge.color
                          }}
                        >
                          {badge.icon}
                          <span>{badge.text}</span>
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "0.8rem" }}>
                        {new Date(sub.submitted_at).toLocaleDateString()} {new Date(sub.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {sub.is_late && (
                          <span style={{ display: "inline-block", background: "#fef3c7", color: "#92400e", padding: "1px 5px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: "700", marginLeft: "4px" }}>
                            Late
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedSubmission(sub)}
                            className="btn btn-secondary"
                            style={{ padding: "5px 10px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            <ShieldCheck size={14} color="#2563eb" />
                            <span>Verify Details</span>
                          </button>

                          <a
                            href={`${API_BASE}/submissions/${sub.id}/receipt?format=pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ padding: "5px 10px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "4px", color: "#059669" }}
                            title="Download Official Verification Certificate"
                          >
                            <Download size={14} />
                            <span>PDF Certificate</span>
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Signature Details & Re-Verification Modal */}
      {selectedSubmission && (
        <SignatureDetailsModal
          isOpen={Boolean(selectedSubmission)}
          submission={selectedSubmission}
          currentUser={currentUser}
          onClose={() => setSelectedSubmission(null)}
          onReverified={(updatedData) => {
            setSubmissions((prev) =>
              prev.map((s) => (s.id === updatedData.submission_id ? { ...s, ...updatedData } : s))
            );
          }}
        />
      )}
    </div>
  );
}
