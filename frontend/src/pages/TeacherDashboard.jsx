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
  Edit2,
  X,
  Search,
  ShieldCheck,
  Award,
  Layers,
  FolderOpen
} from "lucide-react";
import StatsCard from "../components/StatsCard";
import DocumentCard from "../components/DocumentCard";
import AssignmentCreationModal from "../components/AssignmentCreationModal";
import SignatureDetailsModal from "../components/SignatureDetailsModal";
import EvaluationModal from "../components/EvaluationModal";
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
  const [activeTab, setActiveTab] = useState("subjects"); // 'subjects' | 'assignments' | 'materials' | 'submissions'

  // Assignments & Submissions
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedSubmissionsRoster, setSelectedSubmissionsRoster] = useState([]);
  const [assignmentResults, setAssignmentResults] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubDesc, setNewSubDesc] = useState("");
  const [newSubDept, setNewSubDept] = useState("Computer Science & Engineering");
  const [newSubAllowDup, setNewSubAllowDup] = useState(false);
  const [createSubLoading, setCreateSubLoading] = useState(false);
  const [createSubError, setCreateSubError] = useState("");

  // Edit Subject Modal
  const [editSubjectModal, setEditSubjectModal] = useState(null);
  const [editSubName, setEditSubName] = useState("");
  const [editSubDesc, setEditSubDesc] = useState("");
  const [editSubDept, setEditSubDept] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Assignment Modal
  const [createAssignmentSub, setCreateAssignmentSub] = useState(null);

  // Evaluation & Verification Modals
  const [evaluatingSubmission, setEvaluatingSubmission] = useState(null);
  const [verifyingSubmission, setVerifyingSubmission] = useState(null);

  // Enrolled Students Modal
  const [rosterModalSub, setRosterModalSub] = useState(null);
  const [rosterStudents, setRosterStudents] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // Learning Materials
  const [materials, setMaterials] = useState([]);
  const [uploadSubjectId, setUploadSubjectId] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

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

        // Also fetch all assignments for all owned subjects
        const assignPromises = list.map((s) =>
          fetch(`${API_BASE}/subjects/${s.id}/assignments?user_email=${encodeURIComponent(teacherEmail)}&user_role=Teacher`)
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => [])
        );
        const assignResults = await Promise.all(assignPromises);
        setAssignments(assignResults.flat());
      }
    } catch (err) {
      console.error("Error fetching teacher subjects:", err);
    }
  };

  const fetchFacultyMaterials = async () => {
    if (!teacherEmail) return;
    try {
      const res = await fetch(`${API_BASE}/documents?user_email=${encodeURIComponent(teacherEmail)}&user_role=Teacher&scope=my`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching materials:", err);
    }
  };

  useEffect(() => {
    fetchTeacherSubjects();
    fetchFacultyMaterials();
  }, [teacherEmail]);

  // Toggle Duplicate Setting
  const handleToggleDuplicate = async (subjectId, currentSetting, subjectName) => {
    const newSetting = !currentSetting;
    setSubjects((prev) =>
      prev.map((s) => (s.id === subjectId ? { ...s, allow_duplicate_submissions: newSetting } : s))
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
          department: newSubDept.trim(),
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

  // Edit Subject
  const handleEditSubject = async (e) => {
    e.preventDefault();
    if (!editSubjectModal) return;
    setEditLoading(true);
    try {
      const res = await fetch(`${API_BASE}/subjects/${editSubjectModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_name: editSubName.trim(),
          description: editSubDesc.trim(),
          department: editSubDept.trim(),
          user_email: teacherEmail,
          user_role: "Teacher"
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to edit subject.");
      }
      setToastMessage({ type: "success", text: `Subject updated successfully.` });
      setEditSubjectModal(null);
      fetchTeacherSubjects();
    } catch (err) {
      setToastMessage({ type: "error", text: err.message });
    } finally {
      setEditLoading(false);
    }
  };

  // Delete Subject
  const handleDeleteSubject = async (sub) => {
    if (!window.confirm(`Are you sure you want to delete course repository '${sub.subject_name}' (${sub.subject_code})? This will safely remove associated enrollments and assignments.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/subjects/${sub.id}?user_email=${encodeURIComponent(teacherEmail)}&user_role=Teacher`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to delete subject.");
      }
      setToastMessage({ type: "success", text: `Subject '${sub.subject_name}' deleted.` });
      fetchTeacherSubjects();
    } catch (err) {
      setToastMessage({ type: "error", text: err.message });
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

  // View Submissions Roster for an Assignment
  const handleViewAssignmentSubmissions = async (assign) => {
    setSelectedAssignment(assign);
    try {
      const [subsRes, resultsRes] = await Promise.all([
        fetch(`${API_BASE}/assignments/${assign.id}/submissions?user_email=${encodeURIComponent(teacherEmail)}&user_role=Teacher`),
        fetch(`${API_BASE}/assignments/${assign.id}/results?user_email=${encodeURIComponent(teacherEmail)}&user_role=Teacher`)
      ]);
      if (subsRes.ok) {
        const subsData = await subsRes.json();
        setSelectedSubmissionsRoster(subsData);
      }
      if (resultsRes.ok) {
        const resData = await resultsRes.json();
        setAssignmentResults(resData);
      }
    } catch (err) {
      console.error("Error fetching assignment submissions:", err);
    }
  };

  // Upload Faculty Resource directly
  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadSubjectId) {
      setToastMessage({ type: "error", text: "Please select a file and subject repository." });
      return;
    }
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("uploaded_by_email", teacherEmail);
      formData.append("uploaded_by_name", teacherName);
      formData.append("uploaded_by_role", "Teacher");
      formData.append("subject_id", uploadSubjectId);

      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Upload failed.");
      }

      setToastMessage({ type: "success", text: "Faculty learning material published successfully!" });
      setUploadFile(null);
      fetchFacultyMaterials();
    } catch (err) {
      setToastMessage({ type: "error", text: err.message });
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="campus-dashboard-layout">
      {/* Faculty Welcome Banner */}
      <div className="dashboard-welcome-banner faculty-banner">
        <div className="welcome-banner-text">
          <h2>Welcome, Professor {teacherName} 🎓</h2>
          <p>
            Manage your courses, create assignments, evaluate student submissions, verify RSA-PSS digital signatures, and upload faculty learning materials.
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
              onClick={() => setActiveTab("assignments")}
            >
              <FileText size={16} /> Course Assignments
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="dashboard-stats-grid four-cols">
        <StatsCard
          title="My Courses"
          value={subjects.length}
          subtitle="Active course repos owned"
          icon={BookOpen}
          colorScheme="blue"
          onClick={() => setActiveTab("subjects")}
        />
        <StatsCard
          title="Active Assignments"
          value={assignments.length}
          subtitle="Course assignments published"
          icon={FileText}
          colorScheme="indigo"
          onClick={() => setActiveTab("assignments")}
        />
        <StatsCard
          title="Enrolled Students"
          value={subjects.reduce((acc, s) => acc + (s.enrolled_students_count || 0), 0)}
          subtitle="Across all courses"
          icon={Users}
          colorScheme="emerald"
        />
        <StatsCard
          title="Faculty Materials"
          value={materials.length}
          subtitle="Published lecture resources"
          icon={FolderOpen}
          colorScheme="purple"
          onClick={() => setActiveTab("materials")}
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

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "12px", borderBottom: "2px solid #e2e8f0", marginBottom: "24px" }}>
        {[
          { key: "subjects", label: `📚 Course Repositories (${subjects.length})` },
          { key: "assignments", label: `📝 Assignment Management (${assignments.length})` },
          { key: "materials", label: `📁 Learning Materials (${materials.length})` },
          { key: "submissions", label: `🎓 Student Submissions (${recentDocs.length})` }
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key);
              setSelectedAssignment(null);
            }}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.key ? "3px solid #2563eb" : "3px solid transparent",
              padding: "10px 18px",
              fontSize: "0.95rem",
              fontWeight: "600",
              color: activeTab === tab.key ? "#2563eb" : "#64748b",
              cursor: "pointer",
              marginBottom: "-2px"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: SUBJECT REPOSITORIES */}
      {activeTab === "subjects" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1e293b" }}>Your Course Repositories</h3>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Plus size={16} /> Create Subject
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "18px" }}>
            {subjects.map((sub) => (
              <div
                key={sub.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "20px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: "700", background: "#eff6ff", color: "#2563eb", padding: "3px 8px", borderRadius: "4px" }}>
                      {sub.subject_code}
                    </span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditSubjectModal(sub);
                          setEditSubName(sub.subject_name);
                          setEditSubDesc(sub.description);
                          setEditSubDept(sub.department || "Computer Science");
                        }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "2px" }}
                        title="Edit course information"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubject(sub)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "2px" }}
                        title="Delete course"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <h4 style={{ margin: "0 0 6px 0", fontSize: "1.1rem", color: "#0f172a" }}>
                    {sub.subject_name}
                  </h4>
                  <p style={{ margin: "0 0 10px 0", fontSize: "0.82rem", color: "#64748b", lineHeight: "1.4" }}>
                    {sub.description || "Active academic repository."}
                  </p>

                  <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "6px", fontSize: "0.82rem", color: "#475569", marginBottom: "12px" }}>
                    <div>Department: <strong>{sub.department || "Computer Science"}</strong></div>
                    <div style={{ marginTop: "4px" }}>Enrolled Students: <strong>{sub.enrolled_students_count || 0}</strong></div>
                  </div>

                  {/* Duplicate Submission Toggle */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "8px 12px", borderRadius: "6px", marginBottom: "14px" }}>
                    <div>
                      <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#334155" }}>Allow Duplicate Files:</span>
                      <span style={{ fontSize: "0.78rem", color: sub.allow_duplicate_submissions ? "#16a34a" : "#dc2626", fontWeight: "700", marginLeft: "6px" }}>
                        {sub.allow_duplicate_submissions ? "ON" : "OFF (Guarded)"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDuplicate(sub.id, sub.allow_duplicate_submissions, sub.subject_name)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: sub.allow_duplicate_submissions ? "#2563eb" : "#94a3b8" }}
                    >
                      {sub.allow_duplicate_submissions ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                    </button>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px", display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setCreateAssignmentSub(sub)}
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: "0.8rem", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                  >
                    <Plus size={14} /> New Assignment
                  </button>

                  <button
                    type="button"
                    onClick={() => handleViewRoster(sub)}
                    className="btn btn-secondary"
                    style={{ fontSize: "0.8rem", padding: "6px 12px", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Users size={14} /> Roster
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ASSIGNMENT MANAGEMENT */}
      {activeTab === "assignments" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {!selectedAssignment ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1e293b" }}>Course Assignments</h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                    Create assignments, inspect student submission rates, verify digital signatures, and enter marks.
                  </p>
                </div>
                {subjects.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setCreateAssignmentSub(subjects[0])}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <Plus size={16} /> Create Assignment
                  </button>
                )}
              </div>

              {assignments.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                  {assignments.map((assign) => (
                    <div
                      key={assign.id}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        padding: "18px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: "700", background: "#eff6ff", color: "#2563eb", padding: "2px 8px", borderRadius: "4px" }}>
                            {assign.subject_code}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            Deadline: {new Date(assign.deadline).toLocaleDateString()}
                          </span>
                        </div>

                        <h4 style={{ margin: "4px 0", fontSize: "1.05rem", color: "#0f172a" }}>
                          {assign.title}
                        </h4>
                        <p style={{ margin: "0 0 10px", fontSize: "0.82rem", color: "#64748b" }}>
                          {assign.description || "Course assignment."}
                        </p>
                        <div style={{ fontSize: "0.8rem", color: "#475569", marginBottom: "12px" }}>
                          Max Marks: <strong>{assign.max_marks} pts</strong> • Formats: <strong>{assign.allowed_formats?.join(", ")}</strong>
                        </div>
                      </div>

                      <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                        <button
                          type="button"
                          onClick={() => handleViewAssignmentSubmissions(assign)}
                          className="btn btn-primary"
                          style={{ width: "100%", fontSize: "0.82rem", padding: "7px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                        >
                          <Users size={14} />
                          <span>View Submissions & Evaluate</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-sub-card">
                  <FileText size={32} className="empty-icon" />
                  <p>No assignments created yet. Click "Create Assignment" to publish your first assignment.</p>
                </div>
              )}
            </>
          ) : (
            /* Submissions Roster for Selected Assignment */
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <button
                    type="button"
                    onClick={() => setSelectedAssignment(null)}
                    style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px", marginBottom: "6px" }}
                  >
                    ← Back to All Assignments
                  </button>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a" }}>
                    {selectedAssignment.title} ({selectedAssignment.subject_code})
                  </h3>
                </div>

                {assignmentResults && (
                  <div style={{ display: "flex", gap: "12px", background: "#f8fafc", padding: "8px 16px", borderRadius: "8px", fontSize: "0.85rem" }}>
                    <div>Submitted: <strong style={{ color: "#2563eb" }}>{assignmentResults.total_submitted}</strong> / {assignmentResults.total_enrolled}</div>
                    <div>Graded: <strong style={{ color: "#16a34a" }}>{assignmentResults.total_graded}</strong></div>
                    <div>Avg: <strong>{assignmentResults.average_marks} pts</strong></div>
                  </div>
                )}
              </div>

              {/* Submissions Table */}
              <div style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                {selectedSubmissionsRoster.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                        <th style={{ padding: "12px 16px" }}>Student</th>
                        <th style={{ padding: "12px 16px" }}>Submitted File</th>
                        <th style={{ padding: "12px 16px" }}>Digital Signature</th>
                        <th style={{ padding: "12px 16px" }}>Score & Feedback</th>
                        <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSubmissionsRoster.map((sub) => (
                        <tr key={sub.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 16px" }}>
                            <strong style={{ color: "#0f172a", display: "block" }}>{sub.student_name}</strong>
                            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>{sub.student_email}</span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontWeight: "600", color: "#1e293b", display: "block" }}>{sub.original_filename}</span>
                            <span style={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "monospace" }}>{sub.sha256_hash?.substring(0, 16)}...</span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                padding: "4px 8px",
                                borderRadius: "12px",
                                fontSize: "0.75rem",
                                fontWeight: "700",
                                background: sub.verification_status === "VALID" ? "#d1fae5" : "#fee2e2",
                                color: sub.verification_status === "VALID" ? "#065f46" : "#991b1b"
                              }}
                            >
                              {sub.verification_status === "VALID" ? "✓ Verified" : sub.verification_status}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {sub.marks !== null ? (
                              <div>
                                <strong style={{ color: "#16a34a" }}>{sub.marks} / {sub.max_marks} pts</strong>
                                {sub.feedback && <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#64748b" }}>"{sub.feedback}"</p>}
                              </div>
                            ) : (
                              <span style={{ color: "#d97706", fontSize: "0.8rem", fontWeight: "600" }}>Ungraded</span>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={() => setEvaluatingSubmission(sub)}
                                className="btn btn-primary"
                                style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                              >
                                Grade
                              </button>
                              <button
                                type="button"
                                onClick={() => setVerifyingSubmission(sub)}
                                className="btn btn-secondary"
                                style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                                title="Inspect Signature"
                              >
                                <ShieldCheck size={14} color="#2563eb" />
                              </button>
                              <a
                                href={`${API_BASE}/submissions/${sub.id}/download`}
                                className="btn btn-secondary"
                                style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                                title="Download File"
                              >
                                <Download size={14} />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                    No students have submitted this assignment yet.
                  </div>
                )}
              </div>

              {/* Unsubmitted Students List */}
              {assignmentResults?.unsubmitted_students?.length > 0 && (
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "14px 18px", borderRadius: "8px" }}>
                  <strong style={{ fontSize: "0.88rem", color: "#92400e" }}>
                    Students Pending Submission ({assignmentResults.unsubmitted_students.length}):
                  </strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                    {assignmentResults.unsubmitted_students.map((st, i) => (
                      <span key={i} style={{ background: "#ffffff", padding: "3px 8px", borderRadius: "4px", fontSize: "0.78rem", border: "1px solid #fef08a", color: "#854d0e" }}>
                        {st.student_name} ({st.student_email})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LEARNING MATERIALS (Section 5 requirement) */}
      {activeTab === "materials" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "18px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "1.05rem", color: "#1e293b" }}>Publish New Faculty Learning Material</h3>
            <form onSubmit={handleUploadMaterial} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "12px", alignItems: "flex-end" }}>
              <div>
                <label className="auth-label">Select Course Repository *</label>
                <select
                  className="auth-input"
                  value={uploadSubjectId}
                  onChange={(e) => setUploadSubjectId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Subject Course --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.subject_code} - {s.subject_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="auth-label">Document / Slide File *</label>
                <input
                  type="file"
                  className="auth-input"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={uploadLoading}
                style={{ padding: "10px 18px", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <UploadCloud size={16} />
                <span>{uploadLoading ? "Uploading..." : "Publish Material"}</span>
              </button>
            </form>
          </div>

          <div>
            <h3 style={{ margin: "0 0 12px", fontSize: "1.05rem", color: "#1e293b" }}>Published Learning Resources</h3>
            {materials.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                {materials.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onPreview={() => onPreview(doc)}
                    onDownload={() => onDownload(doc)}
                    onDelete={() => onDelete(doc.id)}
                    showDelete={true}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-sub-card">
                <FolderOpen size={32} className="empty-icon" />
                <p>No learning materials published yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: STUDENT SUBMISSIONS STREAM */}
      {activeTab === "submissions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1e293b" }}>All Student Submissions In Your Courses</h3>
          </div>

          {recentDocs.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
              {recentDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onPreview={() => onPreview(doc)}
                  onDownload={() => onDownload(doc)}
                  onToggleFavorite={() => onToggleFavorite(doc.id)}
                  showDelete={false}
                />
              ))}
            </div>
          ) : (
            <div className="empty-sub-card">
              <FileText size={32} className="empty-icon" />
              <p>No student submissions received yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Create Subject Modal */}
      {showCreateModal && (
        <div className="campus-modal-backdrop">
          <div className="campus-modal-card" style={{ maxWidth: "520px" }}>
            <div className="campus-modal-header">
              <h3 style={{ margin: 0 }}>Create New Course Repository</h3>
              <button type="button" className="campus-modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {createSubError && (
                <div className="auth-alert error" style={{ padding: "8px 12px", fontSize: "0.85rem" }}>
                  <AlertCircle size={15} />
                  <span>{createSubError}</span>
                </div>
              )}

              <div>
                <label className="auth-label">Course / Subject Name *</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Distributed Cloud Computing"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="auth-label">Subject Code *</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. CS-501"
                  value={newSubCode}
                  onChange={(e) => setNewSubCode(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="auth-label">Academic Department *</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="e.g. Computer Science & Engineering"
                  value={newSubDept}
                  onChange={(e) => setNewSubDept(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="auth-label">Course Description</label>
                <textarea
                  className="auth-input"
                  rows={3}
                  placeholder="Syllabus outline and expected learning outcomes..."
                  value={newSubDesc}
                  onChange={(e) => setNewSubDesc(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "10px", borderRadius: "6px" }}>
                <div>
                  <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#1e293b" }}>Allow Duplicate File Submissions</span>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>Reject identical SHA-256 hashes when OFF.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewSubAllowDup(!newSubAllowDup)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: newSubAllowDup ? "#2563eb" : "#94a3b8" }}
                >
                  {newSubAllowDup ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createSubLoading}>
                  {createSubLoading ? "Creating..." : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {editSubjectModal && (
        <div className="campus-modal-backdrop">
          <div className="campus-modal-card" style={{ maxWidth: "500px" }}>
            <div className="campus-modal-header">
              <h3 style={{ margin: 0 }}>Edit Course: {editSubjectModal.subject_code}</h3>
              <button type="button" className="campus-modal-close" onClick={() => setEditSubjectModal(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSubject} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label className="auth-label">Course Name</label>
                <input
                  type="text"
                  className="auth-input"
                  value={editSubName}
                  onChange={(e) => setEditSubName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="auth-label">Department</label>
                <input
                  type="text"
                  className="auth-input"
                  value={editSubDept}
                  onChange={(e) => setEditSubDept(e.target.value)}
                />
              </div>
              <div>
                <label className="auth-label">Description</label>
                <textarea
                  className="auth-input"
                  rows={3}
                  value={editSubDesc}
                  onChange={(e) => setEditSubDesc(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditSubjectModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={editLoading}>
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roster Modal */}
      {rosterModalSub && (
        <div className="campus-modal-backdrop">
          <div className="campus-modal-card" style={{ maxWidth: "540px" }}>
            <div className="campus-modal-header">
              <h3 style={{ margin: 0 }}>Enrolled Students: {rosterModalSub.subject_name}</h3>
              <button type="button" className="campus-modal-close" onClick={() => setRosterModalSub(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "20px" }}>
              {loadingRoster ? (
                <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>Loading roster...</div>
              ) : rosterStudents.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto" }}>
                  {rosterStudents.map((st, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#f8fafc", borderRadius: "6px" }}>
                      <div>
                        <strong style={{ fontSize: "0.88rem", color: "#0f172a" }}>{st.student_name}</strong>
                        <span style={{ display: "block", fontSize: "0.78rem", color: "#64748b" }}>{st.student_email}</span>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{st.enrolled_at ? new Date(st.enrolled_at).toLocaleDateString() : "Enrolled"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: "center", color: "#64748b", margin: "20px 0" }}>No students enrolled yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {createAssignmentSub && (
        <AssignmentCreationModal
          isOpen={Boolean(createAssignmentSub)}
          subject={createAssignmentSub}
          currentUser={user}
          onClose={() => setCreateAssignmentSub(null)}
          onAssignmentCreated={(newAssign) => {
            setAssignments((prev) => [newAssign, ...prev]);
            setActiveTab("assignments");
            setToastMessage({ type: "success", text: `Assignment '${newAssign.title}' published successfully!` });
          }}
        />
      )}

      {/* Evaluation Modal */}
      {evaluatingSubmission && (
        <EvaluationModal
          isOpen={Boolean(evaluatingSubmission)}
          submission={evaluatingSubmission}
          currentUser={user}
          onClose={() => setEvaluatingSubmission(null)}
          onEvaluated={(updatedSub) => {
            setSelectedSubmissionsRoster((prev) =>
              prev.map((s) => (s.id === updatedSub.id ? updatedSub : s))
            );
            setToastMessage({ type: "success", text: "Evaluation saved successfully!" });
          }}
        />
      )}

      {/* Verification / Signature Details Modal */}
      {verifyingSubmission && (
        <SignatureDetailsModal
          isOpen={Boolean(verifyingSubmission)}
          submission={verifyingSubmission}
          currentUser={user}
          onClose={() => setVerifyingSubmission(null)}
          onReverified={(updatedData) => {
            setSelectedSubmissionsRoster((prev) =>
              prev.map((s) => (s.id === updatedData.submission_id ? { ...s, ...updatedData } : s))
            );
          }}
        />
      )}
    </div>
  );
}
