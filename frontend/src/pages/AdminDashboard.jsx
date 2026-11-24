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
  AlertCircle
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
  const [teacherRequests, setTeacherRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestActionId, setRequestActionId] = useState(null);
  const [allSubjects, setAllSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  const fetchAdminData = async () => {
    setLoadingRequests(true);
    setLoadingSubjects(true);
    try {
      // 1. Fetch pending teacher requests
      const reqRes = await fetch(`${API_BASE}/admin/teacher-requests`);
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setTeacherRequests(Array.isArray(reqData) ? reqData : []);
      }

      // 2. Fetch all subjects
      const subRes = await fetch(`${API_BASE}/subjects?user_role=Admin`);
      if (subRes.ok) {
        const subData = await subRes.json();
        setAllSubjects(Array.isArray(subData) ? subData : []);
      }
    } catch (err) {
      console.error("Error fetching admin dashboard data:", err);
    } finally {
      setLoadingRequests(false);
      setLoadingSubjects(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleApproveTeacher = async (teacherId, teacherName) => {
    setRequestActionId(teacherId);
    setActionNotice(null);
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
      setActionNotice({ type: "success", text: data.message || `Teacher account for ${teacherName} approved!` });
      await fetchAdminData();
    } catch (err) {
      setActionNotice({ type: "error", text: err.message });
    } finally {
      setRequestActionId(null);
    }
  };

  const handleRejectTeacher = async (teacherId, teacherName) => {
    setRequestActionId(teacherId);
    setActionNotice(null);
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
      setActionNotice({ type: "success", text: data.message || `Teacher account for ${teacherName} rejected.` });
      await fetchAdminData();
    } catch (err) {
      setActionNotice({ type: "error", text: err.message });
    } finally {
      setRequestActionId(null);
    }
  };

  const totalDocs = analytics?.total_documents ?? 0;
  const totalStudents = analytics?.total_students ?? 0;
  const totalTeachers = analytics?.total_teachers ?? 0;
  const pendingApprovals = analytics?.pending_approvals ?? 0;
  const approvedDocs = analytics?.approved_documents ?? 0;
  const rejectedDocs = analytics?.rejected_documents ?? 0;
  const duplicateFiles = analytics?.duplicate_files_detected ?? 0;
  const storageFormatted = analytics?.storage_used_formatted || "0 B";
  const mostDownloaded = analytics?.most_downloaded_documents || [];
  const monthlyStats = analytics?.monthly_upload_statistics || [];

  return (
    <div className="campus-dashboard-layout">
      {/* Admin Control Banner */}
      <div className="dashboard-welcome-banner admin-banner">
        <div className="welcome-banner-text">
          <h2>Campus Repository Administration Console 🛡️</h2>
          <p>
            Institution-wide governance overview. Authorize faculty registration requests, review student submissions across courses, monitor SHA-256 duplicate intercepts, and oversee subject repositories.
          </p>
          <div className="welcome-banner-cta-group">
            <button
              type="button"
              className="banner-cta-btn primary"
              onClick={() => onNavigate("pending_approvals")}
            >
              <Clock3 size={16} /> Moderation Queue ({pendingApprovals})
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
          title="Pending Moderation"
          value={pendingApprovals}
          subtitle="Documents awaiting review"
          icon={Clock3}
          colorScheme="amber"
          badge={pendingApprovals > 0 ? "Action Required" : "Up to Date"}
          onClick={() => onNavigate("pending_approvals")}
        />
        <StatsCard
          title="Teacher Approval Requests"
          value={teacherRequests.length}
          subtitle="Pending faculty accounts"
          icon={BookOpen}
          colorScheme="indigo"
          badge={teacherRequests.length > 0 ? "Needs Review" : null}
        />
        <StatsCard
          title="Subject Repositories"
          value={allSubjects.length}
          subtitle="Active campus courses"
          icon={GraduationCap}
          colorScheme="teal"
        />
        <StatsCard
          title="Approved Documents"
          value={approvedDocs}
          subtitle="Live published resources"
          icon={CheckCircle2}
          colorScheme="emerald"
          onClick={() => onNavigate("approved_documents")}
        />
        <StatsCard
          title="Rejected Submissions"
          value={rejectedDocs}
          subtitle="Sent back for revision"
          icon={XCircle}
          colorScheme="rose"
          onClick={() => onNavigate("rejected_documents")}
        />
        <StatsCard
          title="Enrolled Students"
          value={totalStudents}
          subtitle="Registered student accounts"
          icon={GraduationCap}
          colorScheme="blue"
          onClick={() => onNavigate("user_management")}
        />
        <StatsCard
          title="Duplicate Intercepts"
          value={duplicateFiles}
          subtitle="SHA-256 blocks"
          icon={Copy}
          colorScheme="purple"
          badge={duplicateFiles > 0 ? "Saved Storage" : null}
          onClick={() => onNavigate("duplicate_files")}
        />
      </div>

      {/* Action Notice */}
      {actionNotice && (
        <div
          style={{
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
            borderRadius: "8px",
            background: actionNotice.type === "success" ? "#ecfdf5" : "#fef2f2",
            color: actionNotice.type === "success" ? "#065f46" : "#991b1b",
            border: `1px solid ${actionNotice.type === "success" ? "#a7f3d0" : "#fecaca"}`
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {actionNotice.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span style={{ fontSize: "0.9rem", fontWeight: "500" }}>{actionNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* SECTION: PENDING TEACHER REGISTRATION APPROVAL REQUESTS */}
      <div className="dashboard-full-section" style={{ marginBottom: "28px" }}>
        <div className="section-header-row">
          <div className="section-title-wrapper">
            <BookOpen size={18} className="section-icon indigo" />
            <h3>Pending Faculty Approval Requests ({teacherRequests.length})</h3>
          </div>
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
            Review and activate faculty accounts before they can manage repositories
          </span>
        </div>

        {teacherRequests.length > 0 ? (
          <div style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", color: "#475569", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px" }}>Faculty Name</th>
                  <th style={{ padding: "12px 16px" }}>Email</th>
                  <th style={{ padding: "12px 16px" }}>Department</th>
                  <th style={{ padding: "12px 16px" }}>Requested At</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teacherRequests.map((req) => {
                  const isProcessing = requestActionId === req.id;
                  return (
                    <tr key={req.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px", fontWeight: "600", color: "#0f172a" }}>
                        {req.full_name}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>
                        {req.email}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#334155" }}>
                        {req.department || "Computer Science"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "0.8rem" }}>
                        {req.requested_at ? new Date(req.requested_at).toLocaleDateString() : "Recent"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ background: "#fef3c7", color: "#92400e", padding: "3px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600" }}>
                          Pending Approval
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => handleApproveTeacher(req.id, req.full_name)}
                            disabled={isProcessing}
                            style={{
                              background: "#059669",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              padding: "6px 12px",
                              fontSize: "0.78rem",
                              fontWeight: "600",
                              cursor: isProcessing ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectTeacher(req.id, req.full_name)}
                            disabled={isProcessing}
                            style={{
                              background: "#dc2626",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "6px",
                              padding: "6px 12px",
                              fontSize: "0.78rem",
                              fontWeight: "600",
                              cursor: isProcessing ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-sub-card">
            <CheckCircle2 size={32} className="empty-icon emerald" />
            <p>No pending teacher registration requests. All faculty accounts are reviewed!</p>
          </div>
        )}
      </div>

      {/* SECTION: ALL CAMPUS SUBJECT REPOSITORIES */}
      <div className="dashboard-full-section" style={{ marginBottom: "28px" }}>
        <div className="section-header-row">
          <div className="section-title-wrapper">
            <GraduationCap size={18} className="section-icon blue" />
            <h3>Campus Subject Repositories ({allSubjects.length})</h3>
          </div>
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
            System-wide course repositories, instructor assignments, and deduplication rules
          </span>
        </div>

        {allSubjects.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {allSubjects.map((sub) => (
              <div
                key={sub.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "16px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: "700", background: "#e0e7ff", color: "#3730a3", padding: "3px 8px", borderRadius: "4px" }}>
                      {sub.subject_code}
                    </span>
                    {sub.allow_duplicate_submissions ? (
                      <span style={{ fontSize: "0.7rem", color: "#d97706", background: "#fef3c7", padding: "2px 6px", borderRadius: "4px" }}>
                        Duplicates Allowed
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.7rem", color: "#059669", background: "#d1fae5", padding: "2px 6px", borderRadius: "4px" }}>
                        SHA-256 Guard Active
                      </span>
                    )}
                  </div>
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "1rem", color: "#1e293b", fontWeight: "600" }}>
                    {sub.subject_name}
                  </h4>
                  <p style={{ margin: "0 0 10px 0", fontSize: "0.82rem", color: "#64748b" }}>
                    Faculty: <strong>{sub.teacher_name || sub.teacher_email || "Faculty"}</strong>
                  </p>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: "10px", fontSize: "0.8rem", color: "#64748b" }}>
                  <span>Enrolled: <strong>{sub.enrolled_students_count || 0} students</strong></span>
                  <span>Submissions: <strong>{sub.documents_count || 0}</strong></span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-sub-card">
            <BookOpen size={28} className="empty-icon" />
            <p>No subject repositories configured yet.</p>
          </div>
        )}
      </div>

      {/* Middle Grid: Pending Document Approvals & Leaderboard */}
      <div className="dashboard-double-columns">
        {/* Pending Submissions Queue */}
        <div className="dashboard-card-section">
          <div className="section-header-row">
            <div className="section-title-wrapper">
              <Clock3 size={18} className="section-icon amber" />
              <h3>Submissions Requiring Review ({pendingApprovals})</h3>
            </div>
            <button
              type="button"
              className="section-link-btn"
              onClick={() => onNavigate("pending_approvals")}
            >
              Queue <ArrowRight size={14} />
            </button>
          </div>

          {recentUploads && recentUploads.length > 0 ? (
            <div className="pending-submissions-list">
              {recentUploads.slice(0, 4).map((doc) => (
                <div key={doc.id} className="pending-queue-item">
                  <div className="queue-item-meta">
                    <span className="queue-filename" title={doc.original_filename}>
                      {doc.original_filename}
                    </span>
                    <span className="queue-uploader">
                      by <strong>{doc.uploaded_by_name}</strong> ({doc.uploaded_by_role}) • {doc.category}
                    </span>
                  </div>
                  <div className="queue-item-actions">
                    <button
                      type="button"
                      className="btn-item-preview"
                      onClick={() => onPreview(doc)}
                    >
                      Inspect
                    </button>
                    <button
                      type="button"
                      className="btn-quick-approve"
                      onClick={() => onApprove(doc)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn-quick-reject"
                      onClick={() => onReject(doc)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-sub-card">
              <CheckCircle2 size={28} className="empty-icon emerald" />
              <p>All student submissions have been moderated. Moderation queue is clear!</p>
            </div>
          )}
        </div>

        {/* Most Downloaded Documents Leaderboard */}
        <div className="dashboard-card-section">
          <div className="section-header-row">
            <div className="section-title-wrapper">
              <TrendingUp size={18} className="section-icon emerald" />
              <h3>Most Downloaded Resources Leaderboard</h3>
            </div>
            <button
              type="button"
              className="section-link-btn"
              onClick={() => onNavigate("analytics")}
            >
              Full Analytics <ArrowRight size={14} />
            </button>
          </div>

          {mostDownloaded && mostDownloaded.length > 0 ? (
            <div className="leaderboard-table-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Document</th>
                    <th>Uploader</th>
                    <th className="text-right">Downloads</th>
                  </tr>
                </thead>
                <tbody>
                  {mostDownloaded.slice(0, 5).map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="rank-badge">#{idx + 1}</td>
                      <td className="font-medium" title={item.filename}>
                        {item.filename}
                      </td>
                      <td className="text-muted">{item.uploaded_by}</td>
                      <td className="text-right font-bold count-blue">{item.downloads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-sub-card">
              <TrendingUp size={28} className="empty-icon" />
              <p>Download metrics will be tracked as users retrieve materials.</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Upload Activity Trends Bar Chart */}
      <div className="dashboard-full-section">
        <div className="section-header-row">
          <div className="section-title-wrapper">
            <BarChart2 size={18} className="section-icon blue" />
            <h3>Monthly Upload Trends (Institutional Activity)</h3>
          </div>
        </div>

        {monthlyStats && monthlyStats.length > 0 ? (
          <div className="monthly-chart-container">
            <div className="chart-bars-row">
              {monthlyStats.map((stat, idx) => {
                const maxCount = Math.max(...monthlyStats.map((s) => s.count || 0), 1);
                const heightPercent = Math.max(Math.round(((stat.count || 0) / maxCount) * 100), 12);

                return (
                  <div key={idx} className="chart-bar-column">
                    <div className="chart-bar-fill-wrapper">
                      <div
                        className="chart-bar-fill"
                        style={{ height: `${heightPercent}%` }}
                        title={`${stat.month}: ${stat.count} uploads`}
                      />
                    </div>
                    <span className="chart-bar-count">{stat.count}</span>
                    <span className="chart-bar-month">{stat.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="empty-sub-card">
            <BarChart2 size={28} className="empty-icon" />
            <p>Upload statistics will accumulate month-over-month.</p>
          </div>
        )}
      </div>

      {/* Recent Security & Activity Audit Log */}
      <div className="dashboard-full-section">
        <div className="section-header-row">
          <div className="section-title-wrapper">
            <ScrollText size={18} className="section-icon indigo" />
            <h3>Recent Repository Audit Trail</h3>
          </div>
          <button
            type="button"
            className="section-link-btn"
            onClick={() => onNavigate("audit_logs")}
          >
            Audit Log <ArrowRight size={14} />
          </button>
        </div>

        {activityLogs && activityLogs.length > 0 ? (
          <div className="audit-log-stream">
            {activityLogs.slice(0, 5).map((log, idx) => (
              <div key={log.id || idx} className="audit-stream-row">
                <span className="audit-time">
                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                </span>
                <span className={`audit-badge action-${(log.action || "").toLowerCase()}`}>
                  {log.action}
                </span>
                <span className="audit-desc">
                  <strong>{log.user_name || log.user_email}</strong>: {log.details}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-sub-card">
            <ScrollText size={28} className="empty-icon" />
            <p>Security audit entries will record as users interact with the vault.</p>
          </div>
        )}
      </div>
    </div>
  );
}
