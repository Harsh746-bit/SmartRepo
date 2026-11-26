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
  AlertCircle,
  KeyRound,
  Download,
  Eye,
  Calendar,
  Award,
  Layers,
  FolderOpen,
  Trash2
} from "lucide-react";
import StatsCard from "../components/StatsCard";
import DocumentCard from "../components/DocumentCard";
import AssignmentSubmissionModal from "../components/AssignmentSubmissionModal";
import SignatureDetailsModal from "../components/SignatureDetailsModal";
import {
  getSavedKeyForUser,
  generateRSAKeyPair,
  saveKeyForUser,
  downloadPrivateKeyFile
} from "../utils/crypto";
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

  const [enrolledSubjects, setEnrolledSubjects] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`enrolled_${studentEmail}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [availableSubjects, setAvailableSubjects] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`available_subjects_${studentEmail}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // Assignments & Submissions
  const [courseAssignments, setCourseAssignments] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [facultyMaterials, setFacultyMaterials] = useState([]);
  const [activeSection, setActiveSection] = useState("assignments"); // 'assignments' | 'materials' | 'submissions' | 'subjects'

  // Modals
  const [submissionModalAssignment, setSubmissionModalAssignment] = useState(null);
  const [signatureModalSubmission, setSignatureModalSubmission] = useState(null);

  // RSA Key State
  const [userKey, setUserKey] = useState(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [keyNotice, setKeyNotice] = useState(null);

  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [enrollActionId, setEnrollActionId] = useState(null);
  const [enrollMessage, setEnrollMessage] = useState(null);

  useEffect(() => {
    if (studentEmail) {
      const saved = getSavedKeyForUser(studentEmail);
      if (saved) setUserKey(saved);
    }
  }, [studentEmail]);

  const fetchStudentData = async () => {
    if (!studentEmail) return;
    try {
      // 1. Fetch Enrolled Subjects & Available Subjects in parallel
      const [enrollRes, subRes] = await Promise.all([
        fetch(`${API_BASE}/students/my-enrollments?user_email=${encodeURIComponent(studentEmail)}`),
        fetch(`${API_BASE}/subjects?user_email=${encodeURIComponent(studentEmail)}&user_role=Student`)
      ]);

      let enrolledList = [];
      if (enrollRes.ok) {
        const enrollData = await enrollRes.json();
        enrolledList = Array.isArray(enrollData) ? enrollData : [];
        setEnrolledSubjects(enrolledList);
        sessionStorage.setItem(`enrolled_${studentEmail}`, JSON.stringify(enrolledList));
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        const list = Array.isArray(subData) ? subData : [];
        setAvailableSubjects(list);
        sessionStorage.setItem(`available_subjects_${studentEmail}`, JSON.stringify(list));
      }

      // 2. Fetch Assignments for all enrolled subjects
      if (enrolledList.length > 0) {
        const assignPromises = enrolledList.map((s) =>
          fetch(`${API_BASE}/subjects/${s.subject_id}/assignments?user_email=${encodeURIComponent(studentEmail)}&user_role=Student`)
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => [])
        );
        const assignResults = await Promise.all(assignPromises);
        const allAssignments = assignResults.flat();
        setCourseAssignments(allAssignments);

        // Fetch my submissions for each assignment
        const subPromises = allAssignments.map((a) =>
          fetch(`${API_BASE}/assignments/${a.id}/submissions?user_email=${encodeURIComponent(studentEmail)}&user_role=Student`)
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => [])
        );
        const subResults = await Promise.all(subPromises);
        setMySubmissions(subResults.flat());
      }

      // 3. Fetch Faculty Learning Materials (Section 5 requirement)
      const docRes = await fetch(`${API_BASE}/documents?user_email=${encodeURIComponent(studentEmail)}&user_role=Student`);
      if (docRes.ok) {
        const docs = await docRes.json();
        // Separate faculty materials from own uploads
        const facultyDocs = docs.filter(
          (d) => d.uploaded_by_role === "Teacher" || d.uploaded_by_role === "Faculty" || d.is_faculty_material
        );
        setFacultyMaterials(facultyDocs);
      }
    } catch (err) {
      console.error("Error loading student data:", err);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [studentEmail]);

  const handleEnroll = async (subjectId, subjectName) => {
    setEnrollActionId(subjectId);
    setEnrollMessage(null);

    // Optimistically mark as enrolled immediately
    setAvailableSubjects((prev) =>
      prev.map((s) => (s.id === subjectId ? { ...s, is_enrolled: true } : s))
    );
    const targetSub = availableSubjects.find((s) => s.id === subjectId);
    if (targetSub) {
      setEnrolledSubjects((prev) => [
        {
          enrollment_id: `temp_${Date.now()}`,
          subject_id: subjectId,
          subject_name: targetSub.subject_name,
          subject_code: targetSub.subject_code,
          description: targetSub.description,
          teacher_name: targetSub.teacher_name,
          my_submissions_count: 0
        },
        ...prev
      ]);
    }

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
      fetchStudentData();
    } catch (err) {
      setEnrollMessage({ type: "error", text: err.message });
      fetchStudentData();
    } finally {
      setEnrollActionId(null);
    }
  };

  const handleGenerateRSAKey = async () => {
    setGeneratingKey(true);
    setKeyNotice(null);
    try {
      const keyData = await generateRSAKeyPair(3072);
      const res = await fetch(`${API_BASE}/keys/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: studentEmail,
          public_key_pem: keyData.publicKeyPem,
          key_id: keyData.keyId,
          algorithm: keyData.algorithm
        })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to register public key.");
      }
      saveKeyForUser(studentEmail, keyData);
      setUserKey(keyData);
      setKeyNotice({ type: "success", text: `3072-bit RSA Key Pair generated and registered (Key ID: ${keyData.keyId})!` });
    } catch (err) {
      setKeyNotice({ type: "error", text: err.message || "Key generation failed." });
    } finally {
      setGeneratingKey(false);
    }
  };

  const navigateToSection = (sectionKey) => {
    setActiveSection(sectionKey);
    setTimeout(() => {
      const el = document.getElementById("student-main-content");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 60);
  };

  const handleRetractSubmission = async (submissionId, assignmentTitle) => {
    if (!window.confirm(`Are you sure you want to retract and delete your submission for "${assignmentTitle || 'this assignment'}"? You will be able to submit a fresh document.`)) {
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE}/submissions/${submissionId}?user_email=${encodeURIComponent(studentEmail)}&user_name=${encodeURIComponent(studentName)}&user_role=Student`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to retract submission.");
      }
      setMySubmissions((prev) => prev.filter((s) => s.id !== submissionId));
      fetchStudentData();
      alert("Submission retracted successfully! You can now submit a new document.");
    } catch (err) {
      alert("Error retracting submission: " + err.message);
    }
  };

  return (
    <div className="campus-dashboard-layout">
      {/* Welcome Banner */}
      <div className="dashboard-welcome-banner student-banner">
        <div className="welcome-banner-text">
          <h2>Welcome back, {studentName}! 👋</h2>
          <p>
            Your student academic vault is ready. Access faculty learning materials, submit course assignments with RSA digital signatures, and track cryptographic verification.
          </p>
          <div className="welcome-banner-cta-group" style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "16px" }}>
            <button
              type="button"
              className="banner-cta-btn primary"
              onClick={() => navigateToSection("assignments")}
            >
              <FileText size={16} /> View Course Assignments
            </button>
            <button
              type="button"
              className="banner-cta-btn secondary"
              onClick={() => navigateToSection("materials")}
            >
              <FolderOpen size={16} /> Faculty Learning Materials
            </button>
            <button
              type="button"
              className="banner-cta-btn secondary"
              style={{ background: "rgba(255, 255, 255, 0.22)", border: "1px solid rgba(255, 255, 255, 0.45)", color: "#ffffff" }}
              onClick={() => navigateToSection("subjects")}
            >
              <GraduationCap size={16} /> Browse & Enroll in Courses
            </button>
          </div>
        </div>
      </div>

      {/* RSA Cryptographic Identity Card */}
      <div
        style={{
          background: userKey ? "#f0fdf4" : "#fefce8",
          border: `1px solid ${userKey ? "#86efac" : "#fef08a"}`,
          borderRadius: "10px",
          padding: "16px 20px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ background: userKey ? "#dcfce7" : "#fef9c3", padding: "10px", borderRadius: "8px" }}>
            <KeyRound size={22} color={userKey ? "#16a34a" : "#ca8a04"} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <strong style={{ fontSize: "0.95rem", color: userKey ? "#166534" : "#854d0e" }}>
                {userKey ? "RSA Digital Signing Identity (3072-bit)" : "No RSA Signing Key Registered"}
              </strong>
              {userKey && (
                <span style={{ background: "#22c55e", color: "#ffffff", fontSize: "0.7rem", fontWeight: "700", padding: "2px 7px", borderRadius: "10px" }}>
                  ACTIVE
                </span>
              )}
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: userKey ? "#15803d" : "#a16207" }}>
              {userKey
                ? `Key ID: ${userKey.keyId} • Public key registered in MongoDB Atlas. Private key stored safely in your browser.`
                : "Generate a 3072-bit RSA key pair on your device to cryptographically sign your assignments."}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {userKey ? (
            <button
              type="button"
              onClick={() => downloadPrivateKeyFile(userKey, studentEmail)}
              className="btn btn-secondary"
              style={{ fontSize: "0.8rem", padding: "6px 12px", display: "flex", alignItems: "center", gap: "6px", background: "#ffffff" }}
              title="Download private key PEM backup"
            >
              <Download size={14} /> Backup Private Key
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerateRSAKey}
              disabled={generatingKey}
              className="btn btn-primary"
              style={{ fontSize: "0.8rem", padding: "7px 14px", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Sparkles size={14} /> {generatingKey ? "Generating 3072-bit Key..." : "Generate & Register Key"}
            </button>
          )}
        </div>
      </div>

      {keyNotice && (
        <div className={`auth-alert ${keyNotice.type}`} style={{ marginBottom: "16px" }}>
          {keyNotice.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{keyNotice.text}</span>
        </div>
      )}

      {/* 4 Stats Grid */}
      <div className="dashboard-stats-grid four-cols">
        <StatsCard
          title="Course Assignments"
          value={courseAssignments.length}
          subtitle="Assignments across enrolled subjects"
          icon={FileText}
          colorScheme="blue"
          onClick={() => navigateToSection("assignments")}
        />
        <StatsCard
          title="My Signed Submissions"
          value={mySubmissions.length}
          subtitle="Submissions with cryptographic receipts"
          icon={ShieldCheck}
          colorScheme="emerald"
          onClick={() => navigateToSection("submissions")}
        />
        <StatsCard
          title="Faculty Materials"
          value={facultyMaterials.length}
          subtitle="Lecture slides & course resources"
          icon={BookOpen}
          colorScheme="indigo"
          onClick={() => navigateToSection("materials")}
        />
        <StatsCard
          title="Enrolled Subjects"
          value={enrolledSubjects.length}
          subtitle="Active academic repositories"
          icon={GraduationCap}
          colorScheme="teal"
          onClick={() => navigateToSection("subjects")}
        />
      </div>

      {/* Main Tab Switcher */}
      <div
        id="student-main-content"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          borderBottom: "1px solid #e2e8f0",
          margin: "24px 0 20px"
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {[
            { key: "assignments", label: `📝 Course Assignments (${courseAssignments.length})` },
            { key: "materials", label: `📚 Faculty Learning Materials (${facultyMaterials.length})` },
            { key: "submissions", label: `✅ My Submissions (${mySubmissions.length})` },
            { key: "subjects", label: `🎓 My Enrolled Subjects (${enrolledSubjects.length})` }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSection(tab.key)}
              style={{
                padding: "10px 18px",
                background: "none",
                border: "none",
                borderBottom: activeSection === tab.key ? "2.5px solid #2563eb" : "2.5px solid transparent",
                color: activeSection === tab.key ? "#2563eb" : "#64748b",
                fontWeight: activeSection === tab.key ? "700" : "500",
                fontSize: "0.92rem",
                cursor: "pointer"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeSection !== "subjects" && (
          <button
            type="button"
            onClick={() => navigateToSection("subjects")}
            className="btn btn-secondary btn-sm"
            style={{ marginBottom: "6px" }}
          >
            <GraduationCap size={14} color="#2563eb" />
            <span>+ Enroll in New Subject</span>
          </button>
        )}
      </div>

      {/* SECTION A: Course Assignments */}
      {activeSection === "assignments" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1e293b" }}>Assignments in Your Enrolled Courses</h3>
            <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
              Only enrolled students can submit assignments
            </span>
          </div>

          {courseAssignments.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
              {courseAssignments.map((assign) => {
                const submission = mySubmissions.find((s) => s.assignment_id === assign.id);
                const isOverdue = new Date() > new Date(assign.deadline);
                return (
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
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ background: "#eff6ff", color: "#2563eb", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "700" }}>
                          {assign.subject_code}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Clock3 size={12} /> Deadline: {new Date(assign.deadline).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 style={{ margin: "0 0 6px", fontSize: "1.05rem", color: "#0f172a" }}>
                        {assign.title}
                      </h4>
                      <p style={{ margin: "0 0 10px", fontSize: "0.82rem", color: "#64748b", lineHeight: "1.4" }}>
                        {assign.description || assign.instructions?.substring(0, 100) + "..." || "Course assignment."}
                      </p>

                      <div style={{ fontSize: "0.8rem", color: "#475569", marginBottom: "14px" }}>
                        Instructor: <strong>{assign.teacher_name}</strong> • Max: <strong>{assign.max_marks} marks</strong>
                      </div>
                    </div>

                    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      {submission ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <CheckCircle2 size={16} color="#16a34a" />
                          <span style={{ fontSize: "0.82rem", color: "#166534", fontWeight: "600" }}>
                            Submitted {submission.marks !== null ? `(${submission.marks}/${assign.max_marks} pts)` : ""}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: isOverdue ? "#dc2626" : "#d97706", fontWeight: "600" }}>
                          {isOverdue ? "Deadline Passed" : "Pending Submission"}
                        </span>
                      )}

                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {submission && (
                          <button
                            type="button"
                            onClick={() => handleRetractSubmission(submission.id, assign.title)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: "#ef4444", borderColor: "#fca5a5" }}
                            title="Retract and delete this submission"
                          >
                            <Trash2 size={13} />
                            <span>Retract</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (submission) {
                              setSignatureModalSubmission(submission);
                            } else {
                              setSubmissionModalAssignment(assign);
                            }
                          }}
                          className={`btn ${submission ? "btn-secondary" : "btn-primary"} btn-sm`}
                        >
                          {submission ? (
                            <>
                              <ShieldCheck size={14} color="#059669" />
                              <span>View Receipt</span>
                            </>
                          ) : (
                            <>
                              <UploadCloud size={14} />
                              <span>Submit & Sign</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-sub-card" style={{ padding: "36px 20px", textAlign: "center" }}>
              <FileText size={36} className="empty-icon" style={{ margin: "0 auto 10px", color: "#94a3b8" }} />
              <h4 style={{ margin: "0 0 6px", color: "#1e293b", fontSize: "16px" }}>No Active Course Assignments</h4>
              <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: "13.5px" }}>
                There are no published assignments in your enrolled courses yet, or you may need to enroll in other courses.
              </p>
              <button
                type="button"
                onClick={() => navigateToSection("subjects")}
                className="btn btn-primary btn-sm"
              >
                <GraduationCap size={15} />
                <span>Browse Course Catalog & Enroll</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SECTION B: Faculty Learning Materials (Section 5 requirement) */}
      {activeSection === "materials" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1e293b" }}>Faculty Learning Materials & Lecture Slides</h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Official course presentations, syllabi, and reference resources uploaded by your course instructors
              </p>
            </div>
          </div>

          {facultyMaterials.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
              {facultyMaterials.map((doc) => (
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
            <div className="empty-sub-card" style={{ padding: "36px 20px", textAlign: "center" }}>
              <BookOpen size={36} className="empty-icon" style={{ margin: "0 auto 10px", color: "#94a3b8" }} />
              <h4 style={{ margin: "0 0 6px", color: "#1e293b", fontSize: "16px" }}>No Faculty Learning Materials</h4>
              <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: "13.5px" }}>
                Instructors haven't uploaded learning materials for your enrolled courses yet, or you may need to enroll in other courses.
              </p>
              <button
                type="button"
                onClick={() => navigateToSection("subjects")}
                className="btn btn-primary btn-sm"
              >
                <GraduationCap size={15} />
                <span>Browse Course Catalog & Enroll</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SECTION C: My Signed Submissions */}
      {activeSection === "submissions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1e293b" }}>My Signed Submissions & Cryptographic Proofs</h3>
            <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
              Every submission contains a verifiable 3072-bit RSA digital signature
            </span>
          </div>

          {mySubmissions.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {mySubmissions.map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <strong style={{ fontSize: "1rem", color: "#0f172a" }}>{sub.assignment_title}</strong>
                      <span style={{ fontSize: "0.75rem", background: "#f1f5f9", color: "#475569", padding: "2px 6px", borderRadius: "4px" }}>
                        {sub.subject_code}
                      </span>
                      {sub.is_late && (
                        <span style={{ fontSize: "0.72rem", background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>
                          LATE
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                      File: <strong>{sub.original_filename}</strong> ({sub.file_size_formatted}) • Submitted: {new Date(sub.submitted_at).toLocaleDateString()}
                    </span>
                    {sub.marks !== null && (
                      <div style={{ marginTop: "4px", fontSize: "0.84rem", color: "#059669", fontWeight: "600" }}>
                        Score: {sub.marks} / {sub.max_marks} marks {sub.feedback ? `— Feedback: "${sub.feedback}"` : ""}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "14px",
                        fontSize: "0.76rem",
                        fontWeight: "700",
                        background: sub.verification_status === "VALID" ? "#d1fae5" : "#f1f5f9",
                        color: sub.verification_status === "VALID" ? "#065f46" : "#475569"
                      }}
                    >
                      {sub.verification_status === "VALID" ? "✓ Signature Verified" : sub.verification_status}
                    </span>

                    <button
                      type="button"
                      onClick={() => setSignatureModalSubmission(sub)}
                      className="btn btn-secondary"
                      style={{ fontSize: "0.8rem", padding: "5px 10px", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      <ShieldCheck size={14} color="#2563eb" />
                      <span>Verify & Receipt</span>
                    </button>

                    <a
                      href={`${API_BASE}/submissions/${sub.id}/receipt?format=pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: "0.8rem", padding: "5px 10px", display: "flex", alignItems: "center", gap: "4px", color: "#059669" }}
                      title="Download Official Verification Certificate"
                    >
                      <Download size={14} />
                      <span>PDF</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleRetractSubmission(sub.id, sub.assignment_title)}
                      className="btn btn-secondary"
                      style={{ fontSize: "0.8rem", padding: "5px 10px", display: "flex", alignItems: "center", gap: "4px", color: "#ef4444", borderColor: "#fca5a5" }}
                      title="Retract / Delete this submission"
                    >
                      <Trash2 size={14} />
                      <span>Retract</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-sub-card">
              <ShieldCheck size={32} className="empty-icon" />
              <p>You haven't submitted any signed assignments yet.</p>
            </div>
          )}
        </div>
      )}

      {/* SECTION D: My Enrolled Subjects & Course Catalog */}
      {activeSection === "subjects" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {enrollMessage && (
            <div className={`auth-alert ${enrollMessage.type}`} style={{ padding: "12px 16px", fontSize: "14px" }}>
              {enrollMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{enrollMessage.text}</span>
            </div>
          )}

          {/* Enrolled Subjects */}
          <div>
            <h3 style={{ margin: "0 0 14px", fontSize: "1.1rem", color: "#1e293b" }}>My Enrolled Courses</h3>
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
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "0.75rem", fontWeight: "700", background: "#e0e7ff", color: "#3730a3", padding: "3px 8px", borderRadius: "4px" }}>
                        {sub.subject_code}
                      </span>
                      <h4 style={{ margin: "8px 0 4px", fontSize: "1.05rem", color: "#1e293b" }}>{sub.subject_name}</h4>
                      <p style={{ margin: "0 0 8px", fontSize: "0.82rem", color: "#64748b" }}>{sub.description}</p>
                      <span style={{ fontSize: "0.8rem", color: "#475569" }}>Instructor: {sub.teacher_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-sub-card">
                <BookOpen size={28} className="empty-icon" />
                <p>You haven't enrolled in any subjects yet. Enroll below to access learning materials and assignments.</p>
              </div>
            )}
          </div>

          {/* Available Courses Catalog */}
          <div>
            <h3 style={{ margin: "0 0 14px", fontSize: "1.1rem", color: "#1e293b" }}>Available Course Catalog</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
              {availableSubjects.map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.75rem", fontWeight: "700", background: "#f1f5f9", color: "#475569", padding: "3px 8px", borderRadius: "4px" }}>
                      {sub.subject_code}
                    </span>
                    <h4 style={{ margin: "8px 0 4px", fontSize: "1.05rem", color: "#1e293b" }}>{sub.subject_name}</h4>
                    <p style={{ margin: "0 0 8px", fontSize: "0.82rem", color: "#64748b" }}>{sub.description}</p>
                    <span style={{ fontSize: "0.8rem", color: "#475569" }}>Instructor: {sub.teacher_name}</span>
                  </div>

                  <div style={{ marginTop: "14px", borderTop: "1px solid #f1f5f9", paddingTop: "10px" }}>
                    {sub.is_enrolled ? (
                      <span style={{ fontSize: "0.82rem", color: "#16a34a", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                        <CheckCircle2 size={14} /> Already Enrolled
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEnroll(sub.id, sub.subject_name)}
                        disabled={enrollActionId === sub.id}
                        className="btn btn-primary"
                        style={{ width: "100%", fontSize: "0.82rem", padding: "6px" }}
                      >
                        {enrollActionId === sub.id ? "Enrolling..." : "Enroll in Course"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assignment Submission Modal */}
      {submissionModalAssignment && (
        <AssignmentSubmissionModal
          isOpen={Boolean(submissionModalAssignment)}
          assignment={submissionModalAssignment}
          currentUser={user}
          onClose={() => setSubmissionModalAssignment(null)}
          onSubmissionSuccess={(newSub) => {
            setMySubmissions((prev) => [newSub, ...prev]);
            setActiveSection("submissions");
          }}
        />
      )}

      {/* Signature Details Modal */}
      {signatureModalSubmission && (
        <SignatureDetailsModal
          isOpen={Boolean(signatureModalSubmission)}
          submission={signatureModalSubmission}
          currentUser={user}
          onClose={() => setSignatureModalSubmission(null)}
          onReverified={(data) => {
            setMySubmissions((prev) =>
              prev.map((s) => (s.id === data.submission_id ? { ...s, ...data } : s))
            );
          }}
        />
      )}
    </div>
  );
}
