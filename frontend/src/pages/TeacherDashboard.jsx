import React, { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle2,
  Clock3,
  UploadCloud,
  ArrowRight,
  BookOpen,
  Plus,
  Users,
  Shield,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Eye,
  Download,
  Trash2,
  X,
  Search
} from "lucide-react";
import StatsCard from "../components/StatsCard";
import DocumentCard from "../components/DocumentCard";
import { API_BASE } from "../config";

export default function TeacherDashboard({
  user,
  stats,
  recentDocs = [],
  onNavigate,
  onPreview,
  onDownload,
  onToggleFavorite,
  onDelete
}) {
  const teacherName = user?.name || "Professor";
  const teacherEmail = user?.email || "";

  const [subjects, setSubjects] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`teacher_subjects_${teacherEmail}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [activeTab, setActiveTab] = useState("subjects"); // 'subjects' | 'submissions'

  // Create Subject Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubDesc, setNewSubDesc] = useState("");
  const [newSubAllowDup, setNewSubAllowDup] = useState(false);
  const [createSubLoading, setCreateSubLoading] = useState(false);
  const [createSubError, setCreateSubError] = useState("");

  // Enrolled Students Modal
  const [rosterModalSub, setRosterModalSub] = useState(null);
  const [rosterStudents, setRosterStudents] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // Filter student submissions by subject
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("All");
  const [toastMessage, setToastMessage] = useState(null);

  const fetchTeacherSubjects = async () => {
    if (!teacherEmail) return;
    try {
      const res = await fetch(`${API_BASE}/subjects?user_email=${encodeURIComponent(teacherEmail)}&user_role=Teacher`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setSubjects(list);
        sessionStorage.setItem(`teacher_subjects_${teacherEmail}`, JSON.stringify(list));
      }
    } catch (err) {
      console.error("Error fetching teacher subjects:", err);
    }
  };

  useEffect(() => {
    fetchTeacherSubjects();
  }, [teacherEmail]);

  // Toggle Duplicate Setting (Instant Optimistic Feedback)
  const handleToggleDuplicate = async (subjectId, currentSetting, subjectName) => {
    const newSetting = !currentSetting;

    // Optimistically update toggle immediately (0ms latency)
    setSubjects(prev =>
      prev.map(s => s.id === subjectId ? { ...s, allow_duplicate_submissions: newSetting } : s)
    );

    setToastMessage({
      type: "success",
      text: `Duplicate file submissions for ${subjectName} are now ${newSetting ? "ALLOWED (ON)" : "RESTRICTED (OFF)"}.`
    });

    try {
      const res = await fetch(`${API_BASE}/subjects/${subjectId}/duplicate-setting`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: teacherEmail,
          user_role: "Teacher",
          allow_duplicate_submissions: newSetting
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to update duplicate setting.");
      }
    } catch (err) {
      setToastMessage({ type: "error", text: err.message });
      fetchTeacherSubjects();
    }
  };

  // Create Subject
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setCreateSubError("");
    setCreateSubLoading(true);

    try {
      const res = await fetch(`${API_BASE}/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_name: newSubName.trim(),
          subject_code: newSubCode.trim().toUpperCase(),
          description: newSubDesc.trim(),
          teacher_email: teacherEmail,
          teacher_name: teacherName,
          user_role: "Teacher",
          allow_duplicate_submissions: newSubAllowDup
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to create subject repository.");
      }

      setToastMessage({
        type: "success",
        text: `Subject repository "${newSubName}" (${newSubCode.toUpperCase()}) created successfully!`
      });

      setShowCreateModal(false);
      setNewSubName("");
      setNewSubCode("");
      setNewSubDesc("");
      setNewSubAllowDup(false);

      await fetchTeacherSubjects();
    } catch (err) {
      setCreateSubError(err.message);
    } finally {
      setCreateSubLoading(false);
    }
  };

  // View Roster
  const handleViewRoster = async (sub) => {
    setRosterModalSub(sub);
    setLoadingRoster(true);
    setRosterStudents([]);
    try {
      const res = await fetch(`${API_BASE}/subjects/${sub.id}/students?user_email=${encodeURIComponent(teacherEmail)}&user_role=Teacher`);
      if (res.ok) {
        const data = await res.json();
        setRosterStudents(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error loading roster:", err);
    } finally {
      setLoadingRoster(false);
    }
  };

  // Filter documents by subject if selected
  const filteredDocs = recentDocs.filter((d) => {
    if (selectedSubjectFilter === "All") return true;
    return d.subject_id === selectedSubjectFilter;
  });

  return (
    <div className="campus-dashboard-layout">
      {/* Faculty Welcome Banner */}
      <div className="dashboard-welcome-banner faculty-banner">
        <div className="welcome-banner-text">
          <h2>Welcome, Professor {teacherName} 🎓</h2>
          <p>
            Manage your subject repositories, student course enrollments, and student submissions. Configure subject-specific cryptographic duplicate detection rules to fit your grading policy.
          </p>
          <div className="welcome-banner-cta-group">
            <button
              type="button"
              className="banner-cta-btn primary"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} /> Create Subject Repository
            </button>
            <button
              type="button"
              className="banner-cta-btn secondary"
              onClick={() => onNavigate("upload")}
            >
              <UploadCloud size={16} /> Upload Faculty Resource
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="dashboard-stats-grid four-cols">
        <StatsCard
          title="My Subject Repositories"
          value={subjects.length}
          subtitle="Active course repos owned"
          icon={BookOpen}
          colorScheme="blue"
        />
        <StatsCard
          title="Student Submissions"
          value={recentDocs.length}
          subtitle="Total documents submitted"
          icon={FileText}
          colorScheme="indigo"
          onClick={() => setActiveTab("submissions")}
        />
        <StatsCard
          title="Enrolled Students"
          value={subjects.reduce((acc, s) => acc + (s.enrolled_students_count || 0), 0)}
          subtitle="Across all courses"
          icon={Users}
          colorScheme="emerald"
        />
        <StatsCard
          title="Deduplication Guard"
          value={subjects.filter(s => !s.allow_duplicate_submissions).length}
          subtitle="Subjects with SHA-256 active"
          icon={Shield}
          colorScheme="purple"
        />
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
            borderRadius: "8px",
            background: toastMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
            color: toastMessage.type === "success" ? "#065f46" : "#991b1b",
            border: `1px solid ${toastMessage.type === "success" ? "#a7f3d0" : "#fecaca"}`
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {toastMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span style={{ fontSize: "0.9rem", fontWeight: "500" }}>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Dashboard Sub-Tabs: Subject Repositories vs Submissions */}
      <div style={{ display: "flex", gap: "12px", borderBottom: "2px solid #e2e8f0", marginBottom: "24px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("subjects")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "subjects" ? "3px solid #2563eb" : "3px solid transparent",
            padding: "10px 18px",
            fontSize: "0.95rem",
            fontWeight: "600",
            color: activeTab === "subjects" ? "#2563eb" : "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "-2px"
          }}
        >
          <BookOpen size={18} />
          <span>My Subject Repositories ({subjects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("submissions")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "submissions" ? "3px solid #2563eb" : "3px solid transparent",
            padding: "10px 18px",
            fontSize: "0.95rem",
            fontWeight: "600",
            color: activeTab === "submissions" ? "#2563eb" : "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "-2px"
          }}
        >
          <FileText size={18} />
          <span>Student Submissions ({recentDocs.length})</span>
        </button>
      </div>

      {/* TAB 1: SUBJECT REPOSITORIES */}
      {activeTab === "subjects" && (
        <div className="dashboard-full-section">
          <div className="section-header-row">
            <div className="section-title-wrapper">
              <BookOpen size={18} className="section-icon blue" />
              <h3>Managed Subject Repositories</h3>
            </div>
            <button
              type="button"
              className="banner-cta-btn primary"
              onClick={() => setShowCreateModal(true)}
              style={{ padding: "6px 14px", fontSize: "0.85rem" }}
            >
              <Plus size={15} /> Add New Subject
            </button>
          </div>

          {subjects.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
              {subjects.map((sub) => {
                const allowDup = Boolean(sub.allow_duplicate_submissions);

                return (
                  <div
                    key={sub.id}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "20px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: "700", background: "#e0e7ff", color: "#3730a3", padding: "4px 10px", borderRadius: "6px" }}>
                          {sub.subject_code}
                        </span>
                        <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                          Owner: <strong>{teacherName}</strong>
                        </span>
                      </div>

                      <h4 style={{ margin: "0 0 8px 0", fontSize: "1.15rem", color: "#0f172a", fontWeight: "600" }}>
                        {sub.subject_name}
                      </h4>
                      <p style={{ margin: "0 0 16px 0", fontSize: "0.86rem", color: "#64748b", lineHeight: "1.4" }}>
                        {sub.description || "Course document repository for lecture notes and assignments."}
                      </p>

                      {/* Roster & Submissions Stats */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", background: "#f8fafc", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
                        <div>
                          <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Enrolled Students</span>
                          <strong style={{ fontSize: "1.1rem", color: "#1e293b" }}>{sub.enrolled_students_count || 0}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Submissions</span>
                          <strong style={{ fontSize: "1.1rem", color: "#1e293b" }}>{sub.documents_count || 0}</strong>
                        </div>
                      </div>

                      {/* Configurable SHA-256 Duplicate Detection Toggle */}
                      <div
                        style={{
                          background: allowDup ? "#fffbeb" : "#ecfdf5",
                          border: `1px solid ${allowDup ? "#fde68a" : "#a7f3d0"}`,
                          borderRadius: "8px",
                          padding: "12px 14px",
                          marginBottom: "16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between"
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: "600", color: allowDup ? "#92400e" : "#065f46" }}>
                            Allow Duplicate Submissions
                          </div>
                          <span style={{ fontSize: "0.75rem", color: allowDup ? "#b45309" : "#047857" }}>
                            {allowDup
                              ? "Duplicates Allowed (Toggle is ON)"
                              : "SHA-256 Deduplication Active (Toggle is OFF)"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleDuplicate(sub.id, allowDup, sub.subject_name)}
                          style={{
                            background: allowDup ? "#d97706" : "#059669",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "20px",
                            padding: "6px 14px",
                            fontSize: "0.78rem",
                            fontWeight: "700",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                          title="Click to toggle duplicate submission policy"
                        >
                          {allowDup ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          <span>{allowDup ? "ON" : "OFF"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Repository Actions */}
                    <div style={{ display: "flex", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                      <button
                        type="button"
                        onClick={() => handleViewRoster(sub)}
                        style={{
                          flex: 1,
                          background: "#f1f5f9",
                          color: "#334155",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          padding: "8px",
                          fontSize: "0.8rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px"
                        }}
                      >
                        <Users size={14} /> Student Roster
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubjectFilter(sub.id);
                          setActiveTab("submissions");
                        }}
                        style={{
                          flex: 1,
                          background: "#2563eb",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "8px",
                          fontSize: "0.8rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px"
                        }}
                      >
                        <FileText size={14} /> View Submissions
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-sub-card">
              <BookOpen size={32} className="empty-icon" />
              <p>You haven't created any subject repositories yet. Create your first subject repository to receive student submissions.</p>
              <button
                type="button"
                className="btn-sub-action"
                onClick={() => setShowCreateModal(true)}
              >
                Create Subject Repository
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STUDENT SUBMISSIONS */}
      {activeTab === "submissions" && (
        <div className="dashboard-full-section">
          <div className="section-header-row">
            <div className="section-title-wrapper">
              <FileText size={18} className="section-icon indigo" />
              <h3>Student Submissions Across Your Subjects</h3>
            </div>

            {/* Filter by Subject */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Filter by Subject:</span>
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  color: "#1e293b",
                  outline: "none"
                }}
              >
                <option value="All">All Owned Subjects ({recentDocs.length})</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.subject_code}] {s.subject_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredDocs.length > 0 ? (
            <div className="dashboard-cards-grid">
              {filteredDocs.map((doc) => (
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
              <FileText size={32} className="empty-icon" />
              <p>No student submissions found matching the selected subject filter.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE SUBJECT REPOSITORY */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "#ffffff", borderRadius: "12px", width: "100%", maxWidth: "520px", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                <BookOpen size={20} color="#2563eb" /> Create Subject Repository
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={20} />
              </button>
            </div>

            {createSubError && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 14px", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "16px" }}>
                {createSubError}
              </div>
            )}

            <form onSubmit={handleCreateSubject}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                  Subject Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Data Structures and Algorithms"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                  Subject Code <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CS201"
                  value={newSubCode}
                  onChange={(e) => setNewSubCode(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Course overview, syllabus details, and document guidelines..."
                  value={newSubDesc}
                  onChange={(e) => setNewSubDesc(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", resize: "vertical" }}
                />
              </div>

              {/* Deduplication setting default OFF */}
              <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={newSubAllowDup}
                    onChange={(e) => setNewSubAllowDup(e.target.checked)}
                    style={{ width: "16px", height: "16px" }}
                  />
                  <div>
                    <span style={{ fontSize: "0.88rem", fontWeight: "600", color: "#1e293b", display: "block" }}>
                      Allow Duplicate File Submissions
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      Default is OFF (Cryptographic SHA-256 duplicate detection enforced).
                    </span>
                  </div>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#475569", fontWeight: "600", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubLoading}
                  style={{ padding: "8px 18px", borderRadius: "6px", border: "none", background: "#2563eb", color: "#ffffff", fontWeight: "600", cursor: createSubLoading ? "not-allowed" : "pointer" }}
                >
                  {createSubLoading ? "Creating..." : "Create Repository"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ENROLLED STUDENTS ROSTER */}
      {rosterModalSub && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
          <div style={{ background: "#ffffff", borderRadius: "12px", width: "100%", maxWidth: "650px", maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "1.2rem", color: "#0f172a" }}>
                  Enrolled Students Roster
                </h3>
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                  Course: <strong>{rosterModalSub.subject_name}</strong> ({rosterModalSub.subject_code})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setRosterModalSub(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
              {loadingRoster ? (
                <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                  Loading enrolled student roster...
                </div>
              ) : rosterStudents.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#475569", textAlign: "left" }}>
                      <th style={{ padding: "8px 12px" }}>Student Name</th>
                      <th style={{ padding: "8px 12px" }}>Email</th>
                      <th style={{ padding: "8px 12px" }}>Submissions</th>
                      <th style={{ padding: "8px 12px" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterStudents.map((st) => (
                      <tr key={st.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 12px", fontWeight: "600", color: "#1e293b" }}>
                          {st.student_name}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#64748b" }}>
                          {st.student_email}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: "600" }}>
                          {st.submissions_count} files
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600" }}>
                            {st.status || "Enrolled"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                  <Users size={32} style={{ margin: "0 auto 8px auto", display: "block", color: "#94a3b8" }} />
                  No students are enrolled in this subject yet.
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
              <button
                type="button"
                onClick={() => setRosterModalSub(null)}
                style={{ padding: "8px 16px", borderRadius: "6px", background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", fontWeight: "600", cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
