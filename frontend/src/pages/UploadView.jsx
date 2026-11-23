import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Presentation,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  HardDrive,
  ShieldCheck,
  ArrowRight
} from "lucide-react";
import { API_BASE } from "../config";

export default function UploadView({
  currentUser,
  onUploadSuccess,
  onUploadError,
  onCancel
}) {
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const fileInputRef = useRef(null);

  const API_URL = API_BASE;
  const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

  const allowedExtensions = [
    ".pdf", ".docx", ".doc",
    ".pptx", ".ppt", ".txt",
    ".xlsx", ".xls", ".csv",
    ".jpg", ".jpeg", ".png"
  ];

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

    setUploading(true);
    setErrorMsg("");
    setDuplicateWarning(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploaded_by_email", currentUser?.email || "");
    formData.append("uploaded_by_name", currentUser?.name || "Campus Member");
    formData.append("uploaded_by_role", currentUser?.role || "Student");

    try {
      const response = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          const detail = typeof data.detail === "object" ? data.detail : { message: data.detail };
          const warningObj = {
            message: detail.message || "Duplicate file detected in repository!",
            existing: detail.existing_filename || "existing file",
            uploader: detail.uploader
          };
          setDuplicateWarning(warningObj);
          if (onUploadError) {
            onUploadError(warningObj.message);
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

  return (
    <div className="campus-upload-view">
      <div className="upload-view-header">
        <h2>Upload Academic Course Material</h2>
        <p>
          Submit course syllabi, lecture slides, assignments, or research notes.
          {currentUser?.role === "Teacher"
            ? " Materials uploaded by faculty are auto-approved and immediately published."
            : " Student submissions enter the moderation queue for administrator or faculty approval."}
        </p>
      </div>

      {/* Duplicate Intercept Alert */}
      {duplicateWarning && (
        <div className="upload-alert warning">
          <AlertCircle size={20} className="alert-icon" />
          <div className="alert-text">
            <strong>Cryptographic Deduplication Active:</strong> {duplicateWarning.message}
            <p>
              An identical file with matching SHA-256 hash already exists in your vault:{" "}
              <strong>"{duplicateWarning.existing}"</strong>. To prevent campus storage duplication, the upload was cancelled.
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

      {/* Main Upload Zone */}
      <div className="upload-card-container">
        <form onSubmit={handleUploadSubmit}>
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
              disabled={!file || uploading}
            >
              {uploading ? (
                "Encrypting & Uploading..."
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
            <p>Every file is cryptographically hashed during ingestion to prevent identical duplicate uploads.</p>
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
            <h4>Isolated Cloud Storage</h4>
            <p>Stored safely with UUID isolation in MongoDB Atlas and secure physical directory vaults.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
