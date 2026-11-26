import React, { useState, useEffect } from "react";
import {
  Files,
  GraduationCap,
  BookOpen,
  Clock3,
  CheckCircle2,
  XCircle,
  Copy,
  HardDrive,
  TrendingUp,
  ScrollText,
  ArrowRight,
  ShieldAlert,
  BarChart2,
  Check,
  X,
  AlertCircle,
  ShieldCheck,
  KeyRound,
  Download
} from "lucide-react";
import StatsCard from "../components/StatsCard";
import { API_BASE } from "../config";

export default function AdminDashboard({
  analytics,
  recentUploads = [],
  activityLogs = [],
  onNavigate,
  onPreview,
  onApprove,
  onReject
}) {
  const [teacherRequests, setTeacherRequests] = useState(() => {
    try {
      const cached = sessionStorage.getItem("admin_teacher_requests");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [requestActionId, setRequestActionId] = useState(null);
  const [allSubjects, setAllSubjects] = useState(() => {
    try {
      const cached = sessionStorage.getItem("admin_all_subjects");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [verificationStats, setVerificationStats] = useState({
    total_submissions: 0,
    valid_verified: 0,
    tampered: 0,
    invalid: 0,
    revoked: 0
  });
  const [actionNotice, setActionNotice] = useState(null);

  const fetchAdminData = async () => {
    try {
      const [reqRes, subRes, verRes] = await Promise.all([
        fetch(`${API_BASE}/admin/teacher-requests`),
        fetch(`${API_BASE}/subjects?user_role=Admin`),
        fetch(`${API_BASE}/verification/dashboard?user_role=Admin`)
      ]);

      if (reqRes.ok) {
        const reqData = await reqRes.json();
        const list = Array.isArray(reqData) ? reqData : [];
        setTeacherRequests(list);
        sessionStorage.setItem("admin_teacher_requests", JSON.stringify(list));
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        const list = Array.isArray(subData) ? subData : [];
        setAllSubjects(list);
        sessionStorage.setItem("admin_all_subjects", JSON.stringify(list));
      }

      if (verRes.ok) {
        const verData = await verRes.json();
        setVerificationStats(verData.metrics || {});
      }
    } catch (err) {
      console.error("Error fetching admin dashboard data:", err);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleApproveTeacher = async (teacherId, teacherName) => {
    setTeacherRequests((prev) => prev.filter((r) => r.id !== teacherId));
    setActionNotice({ type: "success", text: `Teacher account for ${teacherName} approved & activated!` });

    try {
      const res = await fetch(`${API_BASE}/admin/teacher-requests/${teacherId}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_email: "admin@smartrepo.edu",
          admin_name: "Administrator"
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to approve teacher request.");
      }
    } catch (err) {
      setActionNotice({ type: "error", text: err.message });
      fetchAdminData();
    }
  };

  const handleRejectTeacher = async (teacherId, teacherName) => {
    setTeacherRequests((prev) => prev.filter((r) => r.id !== teacherId));
    setActionNotice({ type: "info", text: `Teacher account for ${teacherName} rejected.` });

    try {
      const res = await fetch(`${API_BASE}/admin/teacher-requests/${teacherId}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_email: "admin@smartrepo.edu",
          admin_name: "Administrator"
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to reject teacher request.");
      }
    } catch (err) {
      setActionNotice({ type: "error", text: err.message });
      fetchAdminData();
    }
  };

  const totalDocs = analytics?.total_documents ?? 0;
  const totalStudents = analytics?.total_students ?? 0;
  const totalTeachers = analytics?.total_teachers ?? 0;
  const pendingApprovals = analytics?.pending_approvals ?? 0;
  const duplicateFiles = analytics?.duplicate_files_detected ?? 0;

  return (
    <div className="campus-dashboard-layout">
      {/* Admin Control Banner */}
      <div className="dashboard-welcome-banner admin-banner">
        <div className="welcome-banner-text">
          <h2>Campus Repository Administration Console 🛡️</h2>
          <p>
            Institution-wide governance overview. Authorize faculty registrations, oversee RSA digital signatures, inspect cryptographic tampering audits, and monitor course repositories.
          </p>
          <div className="welcome-banner-cta-group">
            <button
              type="button"
              className="banner-cta-btn primary"
              onClick={() => onNavigate("verification_center")}
            >
              <ShieldCheck size={16} /> Document Verification Center
            </button>
            <button
              type="button"
              className="banner-cta-btn secondary"
              onClick={() => onNavigate("user_management")}
            >
              <GraduationCap size={16} /> User Directory ({totalStudents + totalTeachers})
            </button>
          </div>
        </div>
      </div>

      {/* 8 Metric Cards Grid */}
      <div className="dashboard-stats-grid four-cols">
        <StatsCard
          title="Total Documents"
          value={totalDocs}
          subtitle="All campus files in vault"
          icon={Files}
          colorScheme="blue"
          onClick={() => onNavigate("all_documents")}
        />
        <StatsCard
          title="Teacher Approval Requests"
          value={teacherRequests.length}
          subtitle="Pending faculty accounts"
          icon={BookOpen}
          colorScheme="indigo"
          badge={teacherRequests.length > 0 ? "Action Required" : null}
        />
        <StatsCard
          title="Cryptographically Verified"
          value={verificationStats.valid_verified || 0}
          subtitle="Authentic RSA signatures"
          icon={ShieldCheck}
          colorScheme="emerald"
          onClick={() => onNavigate("verification_center")}
        />
        <StatsCard
          title="Tampering Detected"
          value={verificationStats.tampered || 0}
          subtitle="File hash mismatches"
          icon={ShieldAlert}
          colorScheme="rose"
          badge={verificationStats.tampered > 0 ? "Alert" : null}
          onClick={() => onNavigate("verification_center")}
        />
      </div>

      {actionNotice && (
        <div
          className={`auth-alert ${actionNotice.type}`}
          style={{
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 14px",
            borderRadius: "6px"
          }}
        >
          <CheckCircle2 size={16} />
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* TEACHER APPROVAL QUEUE */}
      <div className="dashboard-full-section" style={{ marginBottom: "28px" }}>
        <div className="section-header-row">
          <div className="section-title-wrapper">
            <BookOpen size={18} className="section-icon indigo" />
            <h3>Teacher Verification & Approval Queue</h3>
          </div>
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
            {teacherRequests.length} Pending {teacherRequests.length === 1 ? "Request" : "Requests"}
          </span>
        </div>

        {teacherRequests.length > 0 ? (
          <div style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "12px 16px" }}>Faculty Member</th>
                  <th style={{ padding: "12px 16px" }}>Department</th>
                  <th style={{ padding: "12px 16px" }}>Employee ID</th>
                  <th style={{ padding: "12px 16px" }}>Requested At</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Moderation Actions</th>
                </tr>
              </thead>
              <tbody>
                {teacherRequests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <strong style={{ color: "#0f172a", display: "block" }}>{req.full_name}</strong>
                      <span style={{ fontSize: "0.78rem", color: "#64748b" }}>{req.email}</span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>
                      {req.department || "Computer Science"}
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#475569" }}>
                      {req.employee_id || "N/A"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "0.8rem" }}>
                      {req.requested_at ? new Date(req.requested_at).toLocaleDateString() : "Recent"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => handleApproveTeacher(req.id, req.full_name)}
                          className="btn btn-primary"
                          style={{ padding: "5px 12px", fontSize: "0.78rem", background: "#16a34a" }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectTeacher(req.id, req.full_name)}
                          className="btn btn-secondary"
                          style={{ padding: "5px 10px", fontSize: "0.78rem", color: "#dc2626" }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-sub-card">
            <CheckCircle2 size={28} className="empty-icon" color="#16a34a" />
            <p>All faculty registration requests have been reviewed and approved!</p>
          </div>
        )}
      </div>

      {/* ALL SUBJECT REPOSITORIES OVERVIEW */}
      <div className="dashboard-full-section">
        <div className="section-header-row">
          <div className="section-title-wrapper">
            <GraduationCap size={18} className="section-icon blue" />
            <h3>Campus Course Repositories</h3>
          </div>
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
            {allSubjects.length} Courses Active
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {allSubjects.map((sub) => (
            <div
              key={sub.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "16px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
              }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: "700", background: "#eff6ff", color: "#2563eb", padding: "2px 8px", borderRadius: "4px" }}>
                {sub.subject_code}
              </span>
              <h4 style={{ margin: "6px 0 2px", fontSize: "1rem", color: "#0f172a" }}>{sub.subject_name}</h4>
              <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "#64748b" }}>{sub.description}</p>
              <div style={{ fontSize: "0.78rem", color: "#475569" }}>
                Instructor: <strong>{sub.teacher_name}</strong>
              </div>
              <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
                Enrolled: <strong>{sub.enrolled_students_count || 0}</strong> students
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
