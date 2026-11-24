import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  HardDrive,
  ShieldCheck,
  BookOpen,
  ArrowRight
} from "lucide-react";
import { API_BASE } from "../config";

export default function UploadView({
  currentUser,
  initialSubjectId = null,
  onUploadSuccess,
  onUploadError,
  onCancel,
  onNavigate
}) {
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId || "");
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const fileInputRef = useRef(null);

  const API_URL = API_BASE;
  const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

  const allowedExtensions = [
    ".pdf", ".docx", ".doc",
    ".pptx", ".ppt", ".txt",
    ".xlsx", ".xls", ".csv",
    ".jpg", ".jpeg", ".png"
  ];

  // Fetch subjects available for upload
  useEffect(() => {
    const fetchUploadSubjects = async () => {
      if (!currentUser?.email) return;
      setLoadingSubjects(true);
      try {
        if (currentUser.role === "Student") {
          // Students can only upload to subjects they are actively enrolled in
          const res = await fetch(`${API_URL}/students/my-enrollments?user_email=${encodeURIComponent(currentUser.email)}`);
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            setSubjects(list);
            if (!selectedSubjectId && list.length > 0) {
              setSelectedSubjectId(list[0].subject_id);
            }
          }
        } else if (currentUser.role === "Teacher") {
          // Teachers can upload to subjects they own
          const res = await fetch(`${API_URL}/subjects?user_email=${encodeURIComponent(currentUser.email)}&user_role=Teacher`);
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            setSubjects(list);
            if (!selectedSubjectId && list.length > 0) {
              setSelectedSubjectId(list[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Error loading subjects for upload:", err);
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchUploadSubjects();
  }, [currentUser, API_URL]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const validateAndSetFile = (selectedFile) => {
    setErrorMsg("");
    setDuplicateWarning(null);

    if (!selectedFile) return;

    const extension = "." + selectedFile.name.split(".").pop().toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      setErrorMsg(`File extension "${extension}" is not supported. Supported formats: ${allowedExtensions.join(", ")}`);
      return;
    }

    if (selectedFile.size > MAX_SIZE) {
      setErrorMsg("File size exceeds the 25 MB institutional limit.");
      return;
    }

    setFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg("Please select a file to upload.");
      return;
    }

    if (currentUser?.role === "Student" && !selectedSubjectId) {
      setErrorMsg("Please select an enrolled subject repository to submit your document.");
      return;
    }

    setUploading(true);
    setErrorMsg("");
    setDuplicateWarning(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploaded_by_email", currentUser?.email || "");
    formData.append("uploaded_by_name", currentUser?.name || "Campus Member");
    formData.append("uploaded_by_role", currentUser?.role || "Student");
    if (selectedSubjectId) {
      formData.append("subject_id", selectedSubjectId);
    }

    try {
      const response = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          const detailMsg = typeof data.detail === "string" ? data.detail : data.detail?.message || "Duplicate file detected! This document has already been submitted to this subject.";
          const warningObj = {
            message: detailMsg
          };
          setDuplicateWarning(warningObj);
          if (onUploadError) {
            onUploadError(detailMsg);
          }
          return;
        }
        const errorDetail = typeof data.detail === "string" ? data.detail : data.detail?.message || "Upload failed. Please try again.";
        throw new Error(errorDetail);
      }

      setFile(null);
      if (onUploadSuccess) {
        onUploadSuccess(data.message || "Document uploaded successfully!");
      }
    } catch (err) {
      setErrorMsg(err.message || "Connection error during upload.");
    } finally {
      setUploading(false);
    }
  };

  const getCategoryFromFilename = (filename) => {
    const ext = "." + filename.split(".").pop().toLowerCase();
    if ([".pdf", ".docx", ".doc"].includes(ext)) return "Documents";
    if ([".pptx", ".ppt"].includes(ext)) return "Presentations";
    if ([".xlsx", ".xls", ".csv"].includes(ext)) return "Spreadsheets";
    if ([".txt"].includes(ext)) return "Notes";
    if ([".jpg", ".jpeg", ".png"].includes(ext)) return "Images";
    return "Course Material";
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isStudentWithoutEnrollments = currentUser?.role === "Student" && subjects.length === 0 && !loadingSubjects;

  return (
    <div className="campus-upload-view">
      <div className="upload-view-header">
        <h2>Submit Document to Course Repository</h2>
        <p>
          Upload course assignments, lecture notes, or reference materials.
          {currentUser?.role === "Teacher"
            ? " Materials uploaded by faculty to their repositories are auto-approved."
            : " Student submissions require prior enrollment in the target subject and are directly submitted to the course repository."}
        </p>
      </div>

      {/* Duplicate Intercept Alert */}
      {duplicateWarning && (
        <div className="upload-alert warning" style={{ display: "flex", gap: "12px", alignItems: "flex-start", background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
          <AlertCircle size={22} color="#d97706" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div className="alert-text">
            <strong style={{ fontSize: "0.95rem", display: "block", marginBottom: "4px" }}>
              {duplicateWarning.message}
            </strong>
            <p style={{ margin: 0, fontSize: "0.86rem", color: "#b45309" }}>
              The subject instructor has configured strict cryptographic deduplication. Identical files with matching SHA-256 hashes cannot be submitted twice to this subject repository.
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="upload-alert error">
          <AlertCircle size={18} className="alert-icon" />
          <div className="alert-text">{errorMsg}</div>
        </div>
      )}

      {/* No Enrollments Warning for Students */}
      {isStudentWithoutEnrollments && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "18px", borderRadius: "10px", marginBottom: "24px", color: "#991b1b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontSize: "1rem", marginBottom: "6px" }}>
            <AlertCircle size={20} />
            <span>Enrollment Required to Submit Documents</span>
          </div>
          <p style={{ margin: "0 0 12px 0", fontSize: "0.88rem" }}>
            You are not currently enrolled in any course subjects. Campus policy requires students to enroll in a subject repository before uploading documents.
          </p>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("dashboard")}
              style={{
                background: "#dc2626",
                color: "#ffffff",
                border: "none",
                padding: "8px 14px",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: "600",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <BookOpen size={15} /> Go to Dashboard & Enroll in a Subject
            </button>
          )}
        </div>
      )}

      {/* Main Upload Zone */}
      <div className="upload-card-container">
        <form onSubmit={handleUploadSubmit}>
          {/* Subject Repository Selector */}
          <div style={{ marginBottom: "22px", background: "#f8fafc", padding: "16px 20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <label htmlFor="upload-subject-select" style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", color: "#1e293b", marginBottom: "8px" }}>
              Select Target Subject Repository <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <select
                id="upload-subject-select"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={loadingSubjects || subjects.length === 0}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                  color: "#0f172a",
                  background: "#ffffff",
                  outline: "none"
                }}
                required
              >
                {subjects.length === 0 ? (
                  <option value="">{loadingSubjects ? "Loading available subjects..." : "No subjects available"}</option>
                ) : (
                  subjects.map((s) => {
                    const id = s.subject_id || s.id;
                    const code = s.subject_code || "";
                    const name = s.subject_name || "";
                    return (
                      <option key={id} value={id}>
                        {code ? `[${code}] ` : ""}{name}
                      </option>
                    );
                  })
                )}
              </select>
            </div>
            <span style={{ display: "block", marginTop: "6px", fontSize: "0.78rem", color: "#64748b" }}>
              {currentUser?.role === "Student"
                ? "Showing subjects you are currently enrolled in."
                : "Showing subjects assigned to your faculty profile."}
            </span>
          </div>

          <div
            className={`dropzone-area ${isDragOver ? "drag-active" : ""} ${file ? "has-file" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              style={{ display: "none" }}
              accept={allowedExtensions.join(",")}
            />

            {!file ? (
              <div className="dropzone-empty-state">
                <div className="dropzone-icon-circle">
                  <UploadCloud size={36} className="upload-icon" />
                </div>
                <h3>Drag & Drop Course Materials Here</h3>
                <p>or click to browse your local device files</p>

                <div className="supported-formats-pills">
                  <span className="fmt-pill">PDF</span>
                  <span className="fmt-pill">Word (.docx)</span>
                  <span className="fmt-pill">PowerPoint (.pptx)</span>
                  <span className="fmt-pill">Excel (.xlsx, .csv)</span>
                  <span className="fmt-pill">Notes (.txt)</span>
                  <span className="fmt-pill">Images (.png, .jpg)</span>
                </div>

                <span className="max-size-hint">Maximum upload limit: 25 MB per document</span>
              </div>
            ) : (
              <div className="dropzone-file-selected" onClick={(e) => e.stopPropagation()}>
                <div className="selected-file-card">
                  <div className="file-icon-badge">
                    <FileText size={28} />
                  </div>
                  <div className="file-meta-col">
                    <span className="file-name-text">{file.name}</span>
                    <div className="file-stats-row">
                      <span className="meta-pill">{formatBytes(file.size)}</span>
                      <span className="meta-pill category">{getCategoryFromFilename(file.name)}</span>
                      <span className="meta-pill role">
                        Uploader: {currentUser?.name} ({currentUser?.role})
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="file-remove-btn"
                    onClick={() => setFile(null)}
                    title="Remove file"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="upload-actions-row">
            {onCancel && (
              <button
                type="button"
                className="upload-cancel-btn"
                onClick={onCancel}
                disabled={uploading}
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="upload-submit-btn"
              disabled={!file || uploading || (currentUser?.role === "Student" && !selectedSubjectId)}
            >
              {uploading ? (
                "Calculating SHA-256 & Uploading..."
              ) : (
                <>
                  <UploadCloud size={16} /> Submit to Repository
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Security & Feature Highlights */}
      <div className="upload-features-grid">
        <div className="feature-box">
          <ShieldCheck size={20} className="feature-icon blue" />
          <div className="feature-text">
            <h4>SHA-256 Checksum Verification</h4>
            <p>Every file is cryptographically hashed during ingestion to detect and prevent duplicates within the subject repository.</p>
          </div>
        </div>

        <div className="feature-box">
          <FileText size={20} className="feature-icon emerald" />
          <div className="feature-text">
            <h4>Deep Content Search Extraction</h4>
            <p>PDFs, Word docs, and slides are parsed automatically so topics and keywords are searchable inside content.</p>
          </div>
        </div>

        <div className="feature-box">
          <HardDrive size={20} className="feature-icon indigo" />
          <div className="feature-text">
            <h4>Isolated Subject Repositories</h4>
            <p>Documents belong strictly to their course repository with full student isolation and teacher ownership.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
