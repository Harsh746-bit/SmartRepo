import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  KeyRound,
  Search,
  Download,
  RefreshCw,
  Copy,
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
    <div className="campus-dashboard-layout" style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
          paddingBottom: "18px",
          borderBottom: "1px solid #e2e8f0"
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-heading, inherit)",
              fontSize: "24px",
              fontWeight: "700",
              color: "#0f172a",
              margin: "0 0 6px 0",
              letterSpacing: "-0.02em"
            }}
          >
            Document Verification Center
          </h1>
          <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
            Cryptographic integrity, RSA digital signature validation, and non-repudiation audit records
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDashboardData}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 18px",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            color: "#1e293b",
            fontSize: "13.5px",
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
            transition: "all 0.15s ease"
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = "#f8fafc";
              e.currentTarget.style.borderColor = "#94a3b8";
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.borderColor = "#cbd5e1";
            }
          }}
        >
          <RefreshCw size={15} className={loading ? "spin-animate" : ""} color="#2563eb" />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Metrics Row in Responsive Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px"
        }}
      >
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
          flexWrap: "wrap",
          gap: "14px",
          background: "#ffffff",
          padding: "16px",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          marginBottom: "20px",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)"
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: "260px", maxWidth: "440px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "11px", color: "#94a3b8" }} />
          <input
            type="text"
            className="auth-input"
            style={{
              paddingLeft: "36px",
              width: "100%",
              height: "38px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13.5px",
              outline: "none"
            }}
            placeholder="Search by student, course, file name, or SHA-256 hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {["All", "VALID", "TAMPERED", "KEY_REVOKED", "INVALID", "UNVERIFIED"].map((st) => (
            <button
              type="button"
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                border: statusFilter === st ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                background: statusFilter === st ? "#eff6ff" : "#ffffff",
                color: statusFilter === st ? "#2563eb" : "#64748b",
                transition: "all 0.15s ease"
              }}
            >
              {st === "All" ? "All Statuses" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions Verification Table */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
        }}
      >
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#64748b" }}>
            <RefreshCw size={26} className="spin-animate" style={{ margin: "0 auto 10px", color: "#2563eb" }} />
            <p style={{ margin: 0, fontWeight: "500", fontSize: "14px" }}>Verifying cryptographic records...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#64748b" }}>
            <ShieldCheck size={40} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
            <h4 style={{ margin: "0 0 6px", color: "#1e293b", fontSize: "16px" }}>No Verification Records Found</h4>
            <p style={{ margin: 0, fontSize: "13.5px" }}>
              {statusFilter !== "All"
                ? `No submissions found with status '${statusFilter}'.`
                : "Student submissions with RSA signatures and SHA-256 hashes will appear here."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "12px 18px", fontWeight: "600" }}>Student & Course</th>
                  <th style={{ padding: "12px 18px", fontWeight: "600" }}>Document & SHA-256 Fingerprint</th>
                  <th style={{ padding: "12px 18px", fontWeight: "600" }}>Digital Signature Status</th>
                  <th style={{ padding: "12px 18px", fontWeight: "600" }}>Submission Time</th>
                  <th style={{ padding: "12px 18px", fontWeight: "600", textAlign: "right" }}>Actions</th>
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
                      <td style={{ padding: "14px 18px" }}>
                        <strong style={{ color: "#0f172a", display: "block", fontSize: "14px" }}>{sub.student_name}</strong>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          {sub.subject_name} • {sub.assignment_title}
                        </span>
                      </td>

                      <td style={{ padding: "14px 18px", maxWidth: "260px" }}>
                        <span style={{ fontWeight: "600", color: "#1e293b", display: "block" }}>
                          {sub.original_filename}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                          <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#64748b" }}>
                            {sub.sha256_hash?.substring(0, 16)}...
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyHash(sub.sha256_hash, sub.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", padding: "2px" }}
                            title="Copy full SHA-256 hash"
                          >
                            <Copy size={12} />
                          </button>
                          {copiedId === sub.id && (
                            <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "600" }}>Copied</span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "4px 10px",
                            borderRadius: "14px",
                            fontSize: "12px",
                            fontWeight: "700",
                            background: badge.bg,
                            color: badge.color
                          }}
                        >
                          {badge.icon}
                          <span>{badge.text}</span>
                        </span>
                      </td>

                      <td style={{ padding: "14px 18px", color: "#64748b", fontSize: "12.5px" }}>
                        {new Date(sub.submitted_at).toLocaleDateString()} {new Date(sub.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {sub.is_late && (
                          <span style={{ display: "inline-block", background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: "700", marginLeft: "6px" }}>
                            Late
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "14px 18px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedSubmission(sub)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "6px 12px",
                              background: "#eff6ff",
                              border: "1px solid #bfdbfe",
                              borderRadius: "6px",
                              color: "#1d4ed8",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                              transition: "all 0.15s ease"
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#dbeafe")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "#eff6ff")}
                          >
                            <ShieldCheck size={14} color="#2563eb" />
                            <span>Verify Details</span>
                          </button>

                          <a
                            href={`${API_BASE}/submissions/${sub.id}/receipt?format=pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "6px 12px",
                              background: "#ecfdf5",
                              border: "1px solid #a7f3d0",
                              borderRadius: "6px",
                              color: "#047857",
                              fontSize: "12px",
                              fontWeight: "600",
                              textDecoration: "none",
                              transition: "all 0.15s ease"
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#d1fae5")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "#ecfdf5")}
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
