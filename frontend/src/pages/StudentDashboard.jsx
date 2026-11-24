import React, { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle2,
  Clock3,
  XCircle,
  UploadCloud,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  AlertCircle
} from "lucide-react";
import StatsCard from "../components/StatsCard";
import DocumentCard from "../components/DocumentCard";
import { API_BASE } from "../config";

export default function StudentDashboard({
  user,
  stats,
  recentDocs = [],
  onNavigate,
  onPreview,
  onDownload,
  onToggleFavorite,
  onDelete
}) {
  const studentName = user?.name || "Student";
  const studentEmail = user?.email || "";

  const [enrolledSubjects, setEnrolledSubjects] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [enrollActionId, setEnrollActionId] = useState(null);
  const [enrollMessage, setEnrollMessage] = useState(null);

  const fetchStudentData = async () => {
    if (!studentEmail) return;
    setLoadingEnrollments(true);
    try {
      // 1. Fetch Enrolled Subjects
      const enrollRes = await fetch(`${API_BASE}/students/my-enrollments?user_email=${encodeURIComponent(studentEmail)}`);
      if (enrollRes.ok) {
        const enrollData = await enrollRes.json();
        setEnrolledSubjects(Array.isArray(enrollData) ? enrollData : []);
      }

      // 2. Fetch Available Subjects
      const subRes = await fetch(`${API_BASE}/subjects?user_email=${encodeURIComponent(studentEmail)}&user_role=Student`);
      if (subRes.ok) {
        const subData = await subRes.json();
        setAvailableSubjects(Array.isArray(subData) ? subData : []);
      }
    } catch (err) {
      console.error("Error loading student enrollments:", err);
    } finally {
      setLoadingEnrollments(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [studentEmail]);

  const handleEnroll = async (subjectId, subjectName) => {
    setEnrollActionId(subjectId);
    setEnrollMessage(null);
    try {
      const response = await fetch(`${API_BASE}/subjects/${subjectId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: studentEmail,
          user_role: "Student"
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Enrollment failed.");
      }
      setEnrollMessage({ type: "success", text: data.message || `Enrolled in ${subjectName} successfully!` });
      await fetchStudentData();
    } catch (err) {
      setEnrollMessage({ type: "error", text: err.message });
    } finally {
      setEnrollActionId(null);
    }
  };

  // Student upload counts
  const totalUploaded = stats?.my_total_count ?? recentDocs.length;
  const approvedCount = stats?.my_approved_count ?? recentDocs.filter(d => d.approval_status === "Approved").length;
  const pendingCount = stats?.my_pending_count ?? recentDocs.filter(d => d.approval_status === "Pending").length;
  const rejectedCount = stats?.my_rejected_count ?? recentDocs.filter(d => d.approval_status === "Rejected").length;

  return (
    <div className="campus-dashboard-layout">
      {/* Welcome Banner */}
      <div className="dashboard-welcome-banner student-banner">
        <div className="welcome-banner-text">
          <h2>Welcome back, {studentName}! 👋</h2>
          <p>
            Your student academic vault is ready. Enroll in your course subjects, submit assignments, and track your document moderation status.
          </p>
          <div className="welcome-banner-cta-group">
            <button
              type="button"
              className="banner-cta-btn primary"
              onClick={() => onNavigate("upload")}
            >
              <UploadCloud size={16} /> Submit Course Document
            </button>
            <button
              type="button"
              className="banner-cta-btn secondary"
              onClick={() => onNavigate("my_documents")}
            >
              <FileText size={16} /> My Submission History
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="dashboard-stats-grid four-cols">
        <StatsCard
          title="My Submissions"
          value={totalUploaded}
          subtitle="Total uploaded documents"
          icon={FileText}
          colorScheme="blue"
          onClick={() => onNavigate("my_documents")}
        />
        <StatsCard
          title="Enrolled Subjects"
          value={enrolledSubjects.length}
          subtitle="Active course repositories"
          icon={BookOpen}
          colorScheme="indigo"
        />
        <StatsCard
          title="Approved Materials"
          value={approvedCount}
          subtitle="Accepted submissions"
          icon={CheckCircle2}
          colorScheme="emerald"
          onClick={() => onNavigate("my_documents")}
        />
        <StatsCard
          title="Pending Moderation"
          value={pendingCount}
          subtitle="Under faculty review"
          icon={Clock3}
          colorScheme="amber"
          badge={pendingCount > 0 ? "In Review" : null}
          onClick={() => onNavigate("my_documents")}
        />
      </div>

      {/* Enrollment Message Alert */}
      {enrollMessage && (
        <div
          className={`auth-alert ${enrollMessage.type}`}
          style={{
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 18px",
            borderRadius: "8px",
            background: enrollMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
            color: enrollMessage.type === "success" ? "#065f46" : "#991b1b",
            border: `1px solid ${enrollMessage.type === "success" ? "#a7f3d0" : "#fecaca"}`
          }}
        >
          {enrollMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{enrollMessage.text}</span>
        </div>
      )}

      {/* SECTION 1: My Enrolled Subjects */}
      <div className="dashboard-full-section" style={{ marginBottom: "28px" }}>
        <div className="section-header-row">
          <div className="section-title-wrapper">
            <BookOpen size={18} className="section-icon indigo" />
            <h3>My Enrolled Subjects</h3>
          </div>
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
            {enrolledSubjects.length} {enrolledSubjects.length === 1 ? "Subject" : "Subjects"} Enrolled
          </span>
        </div>

        {enrolledSubjects.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {enrolledSubjects.map((sub) => (
              <div
                key={sub.subject_id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "18px",
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
                    <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle2 size={13} /> Enrolled
                    </span>
                  </div>
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "1.05rem", color: "#1e293b", fontWeight: "600" }}>
                    {sub.subject_name}
                  </h4>
                  <p style={{ margin: "0 0 10px 0", fontSize: "0.82rem", color: "#64748b", lineHeight: "1.4" }}>
                    {sub.description || "Course repository for lecture notes and assignments."}
                  </p>
                  <div style={{ fontSize: "0.8rem", color: "#475569", marginBottom: "14px" }}>
                    Instructor: <strong>{sub.teacher_name || "Faculty Member"}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    My Submissions: <strong>{sub.my_submissions_count || 0}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate("upload", { subject_id: sub.subject_id })}
                    style={{
                      background: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    Submit <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-sub-card">
            <BookOpen size={28} className="empty-icon" />
            <p>You haven't enrolled in any subjects yet. Enroll in courses below to start submitting assignments.</p>
          </div>
        )}
      </div>

      {/* SECTION 2: Course Repositories Catalog & Enrollment */}
      <div className="dashboard-full-section" style={{ marginBottom: "28px" }}>
        <div className="section-header-row">
          <div className="section-title-wrapper">
            <GraduationCap size={18} className="section-icon blue" />
            <h3>Available Campus Course Repositories</h3>
          </div>
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
            Enroll in subjects to unlock document submission
          </span>
        </div>

        {availableSubjects.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {availableSubjects.map((sub) => {
              const isEnrolled = sub.is_enrolled || enrolledSubjects.some(e => e.subject_id === sub.id);
              const isEnrolling = enrollActionId === sub.id;

              return (
                <div
                  key={sub.id}
                  style={{
                    background: "#ffffff",
                    border: isEnrolled ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "18px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: "700", background: "#f1f5f9", color: "#334155", padding: "3px 8px", borderRadius: "4px" }}>
                        {sub.subject_code}
                      </span>
                      {sub.allow_duplicate_submissions ? (
                        <span style={{ fontSize: "0.7rem", color: "#d97706", background: "#fef3c7", padding: "2px 6px", borderRadius: "4px" }}>
                          Duplicates Allowed
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.7rem", color: "#059669", background: "#d1fae5", padding: "2px 6px", borderRadius: "4px" }}>
                          Deduplication Active
                        </span>
                      )}
                    </div>
                    <h4 style={{ margin: "0 0 6px 0", fontSize: "1.02rem", color: "#1e293b", fontWeight: "600" }}>
                      {sub.subject_name}
                    </h4>
                    <p style={{ margin: "0 0 10px 0", fontSize: "0.82rem", color: "#64748b", lineHeight: "1.4" }}>
                      {sub.description || "Official course document repository."}
                    </p>
                    <div style={{ fontSize: "0.8rem", color: "#475569", marginBottom: "12px" }}>
                      Faculty: <strong>{sub.teacher_name || "Faculty Member"}</strong>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                    {isEnrolled ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "0.82rem", color: "#10b981", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle2 size={15} /> Currently Enrolled
                        </span>
                        <button
                          type="button"
                          onClick={() => onNavigate("upload", { subject_id: sub.id })}
                          style={{
                            background: "#f1f5f9",
                            color: "#1e293b",
                            border: "1px solid #cbd5e1",
                            padding: "5px 10px",
                            borderRadius: "6px",
                            fontSize: "0.78rem",
                            fontWeight: "600",
                            cursor: "pointer"
                          }}
                        >
                          Submit File
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEnroll(sub.id, sub.subject_name)}
                        disabled={isEnrolling}
                        style={{
                          width: "100%",
                          background: "#2563eb",
                          color: "#ffffff",
                          border: "none",
                          padding: "8px 14px",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          cursor: isEnrolling ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px"
                        }}
                      >
                        {isEnrolling ? "Enrolling..." : (
                          <>
                            <BookOpen size={15} /> Enroll in Subject
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-sub-card">
            <GraduationCap size={28} className="empty-icon" />
            <p>No course repositories found on campus at this time.</p>
          </div>
        )}
      </div>

      {/* SECTION 3: My Uploaded Documents (Strict Privacy - Only Student's Own Submissions) */}
      <div className="dashboard-full-section">
        <div className="section-header-row">
          <div className="section-title-wrapper">
            <FileText size={18} className="section-icon blue" />
            <h3>My Submission History</h3>
          </div>
          <button
            type="button"
            className="section-link-btn"
            onClick={() => onNavigate("my_documents")}
          >
            View All ({recentDocs.length}) <ArrowRight size={14} />
          </button>
        </div>

        {recentDocs && recentDocs.length > 0 ? (
          <div className="dashboard-cards-grid">
            {recentDocs.slice(0, 6).map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onPreview={onPreview}
                onDownload={onDownload}
                onToggleFavorite={onToggleFavorite}
                onDelete={onDelete}
                currentUser={user}
              />
            ))}
          </div>
        ) : (
          <div className="empty-sub-card">
            <FileText size={28} className="empty-icon" />
            <p>You haven't submitted any documents yet. Enroll in a course above and submit your first document.</p>
            <button
              type="button"
              className="btn-sub-action"
              onClick={() => onNavigate("upload")}
            >
              Upload Document
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
