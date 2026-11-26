import React, { useState, useEffect } from "react";
import {
  X,
  UploadCloud,
  FileText,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  Copy,
  Clock,
  Sparkles
} from "lucide-react";
import {
  computeSHA256Hex,
  generateRSAKeyPair,
  signDocumentContent,
  getSavedKeyForUser,
  saveKeyForUser,
  downloadPrivateKeyFile
} from "../utils/crypto";
import { API_BASE } from "../config";

export default function AssignmentSubmissionModal({
  isOpen,
  assignment,
  currentUser,
  onClose,
  onSubmissionSuccess
}) {
  if (!isOpen || !assignment) return null;

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileHash, setFileHash] = useState("");
  const [hashing, setHashing] = useState(false);
  const [userKey, setUserKey] = useState(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copiedHash, setCopiedHash] = useState(false);

  // Check if user already has an RSA key in local storage
  useEffect(() => {
    if (currentUser?.email) {
      const saved = getSavedKeyForUser(currentUser.email);
      if (saved) {
        setUserKey(saved);
      }
    }
  }, [currentUser]);

  // Compute SHA-256 hash immediately upon file selection
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError("");
    setHashing(true);

    try {
      const hash = await computeSHA256Hex(file);
      setFileHash(hash);
    } catch (err) {
      console.error("Hashing error:", err);
      setError("Failed to compute SHA-256 hash from file bytes.");
    } finally {
      setHashing(false);
    }
  };

  // Generate and register a 3072-bit RSA Key Pair
  const handleGenerateKey = async () => {
    setGeneratingKey(true);
    setError("");
    try {
      const keyData = await generateRSAKeyPair(3072);

      // Register public key with backend
      const res = await fetch(`${API_BASE}/keys/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: currentUser.email,
          public_key_pem: keyData.publicKeyPem,
          key_id: keyData.keyId,
          algorithm: keyData.algorithm
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Failed to register public key with server.");
      }

      // Save locally
      saveKeyForUser(currentUser.email, keyData);
      setUserKey(keyData);
    } catch (err) {
      console.error("Key gen error:", err);
      setError(err.message || "Failed to generate RSA key pair.");
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleCopyHash = () => {
    if (fileHash) {
      navigator.clipboard.writeText(fileHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a document to submit.");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      let signatureB64 = "";
      let keyId = "";

      // Cryptographically sign using user's private key
      if (userKey) {
        signatureB64 = await signDocumentContent(selectedFile, userKey.privateKeyPem);
        keyId = userKey.keyId;
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("student_email", currentUser.email);
      formData.append("student_name", currentUser.name || "Student");
      formData.append("client_sha256", fileHash);
      if (signatureB64) {
        formData.append("digital_signature", signatureB64);
        formData.append("public_key_id", keyId);
        formData.append("signature_algorithm", "RSA-PSS-SHA256");
      }

      const res = await fetch(`${API_BASE}/assignments/${assignment.id}/submissions`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Submission failed.");
      }

      onSubmissionSuccess(data.submission);
      onClose();
    } catch (err) {
      setError(err.message || "An error occurred during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="campus-modal-backdrop">
      <div className="campus-modal-card" style={{ maxWidth: "640px" }}>
        <div className="campus-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "#ecfdf5", color: "#059669", padding: "8px", borderRadius: "8px" }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Submit Assignment & Digital Signature</h3>
              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                {assignment.title} • {assignment.subject_name}
              </span>
            </div>
          </div>
          <button type="button" className="campus-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && (
            <div className="auth-alert error" style={{ padding: "10px 14px", fontSize: "0.88rem" }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Assignment Summary Bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", background: "#f8fafc", padding: "12px", borderRadius: "8px", fontSize: "0.84rem" }}>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Max Marks</span>
              <strong style={{ color: "#0f172a" }}>{assignment.max_marks} pts</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Deadline</span>
              <strong style={{ color: "#0f172a" }}>{new Date(assignment.deadline).toLocaleDateString()}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Allowed Formats</span>
              <strong style={{ color: "#0f172a" }}>{assignment.allowed_formats?.join(", ") || ".pdf"}</strong>
            </div>
          </div>

          {/* File Picker */}
          <div>
            <label className="auth-label">Select Document File *</label>
            <div
              style={{
                border: "2px dashed #cbd5e1",
                borderRadius: "10px",
                padding: "24px",
                textAlign: "center",
                background: selectedFile ? "#f0fdf4" : "#f8fafc",
                borderColor: selectedFile ? "#22c55e" : "#cbd5e1",
                cursor: "pointer",
                position: "relative"
              }}
            >
              <input
                type="file"
                onChange={handleFileChange}
                accept={assignment.allowed_formats?.join(",")}
                style={{
                  opacity: 0,
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  cursor: "pointer"
                }}
              />
              <UploadCloud size={32} color={selectedFile ? "#16a34a" : "#64748b"} style={{ margin: "0 auto 8px" }} />
              {selectedFile ? (
                <div>
                  <strong style={{ color: "#166534", fontSize: "0.95rem" }}>{selectedFile.name}</strong>
                  <p style={{ margin: "4px 0 0", color: "#15803d", fontSize: "0.8rem" }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB • Click or drop to replace
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ margin: 0, fontWeight: "600", color: "#334155", fontSize: "0.9rem" }}>
                    Drop your assignment document here or click to browse
                  </p>
                  <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                    Permitted: {assignment.allowed_formats?.join(", ") || ".pdf, .docx, .txt"} (Up to 25 MB)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Computed SHA-256 Fingerprint */}
          {selectedFile && (
            <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#475569" }}>
                  Binary SHA-256 Fingerprint (Content-Based)
                </span>
                <button
                  type="button"
                  onClick={handleCopyHash}
                  style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <Copy size={12} />
                  <span>{copiedHash ? "Copied!" : "Copy"}</span>
                </button>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: "0.76rem", color: "#0f172a", wordBreak: "break-all" }}>
                {hashing ? "Computing binary hash..." : fileHash}
              </div>
            </div>
          )}

          {/* RSA Digital Signing Identity */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", background: userKey ? "#f0fdf4" : "#fefce8" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <KeyRound size={18} color={userKey ? "#16a34a" : "#ca8a04"} />
                <div>
                  <span style={{ fontSize: "0.88rem", fontWeight: "700", color: userKey ? "#166534" : "#854d0e" }}>
                    {userKey ? "RSA Digital Signing Identity Ready" : "No RSA Signing Key Found"}
                  </span>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: userKey ? "#15803d" : "#a16207" }}>
                    {userKey
                      ? `Key ID: ${userKey.keyId} (3072-bit RSA-PSS)`
                      : "Generate an institutional 3072-bit RSA key pair on your device to sign this submission."}
                  </p>
                </div>
              </div>

              {userKey ? (
                <button
                  type="button"
                  onClick={() => downloadPrivateKeyFile(userKey, currentUser.email)}
                  style={{
                    padding: "6px 10px",
                    background: "#ffffff",
                    border: "1px solid #86efac",
                    borderRadius: "6px",
                    fontSize: "0.78rem",
                    color: "#166534",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                  title="Download and backup your private key securely"
                >
                  <Download size={12} />
                  <span>Backup Key</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateKey}
                  disabled={generatingKey}
                  style={{
                    padding: "7px 12px",
                    background: "#2563eb",
                    border: "none",
                    borderRadius: "6px",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Sparkles size={14} />
                  <span>{generatingKey ? "Generating..." : "Generate 3072-bit Key"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || hashing || !selectedFile}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              {submitting ? (
                "Signing & Submitting..."
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Sign & Submit Assignment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
