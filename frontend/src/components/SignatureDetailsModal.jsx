import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  KeyRound,
  Download,
  RefreshCw,
  Copy,
  CheckCircle2,
  FileCheck,
  ExternalLink,
  Award
} from "lucide-react";
import { API_BASE } from "../config";

export default function SignatureDetailsModal({
  isOpen,
  submission,
  currentUser,
  onClose,
  onReverified
}) {
  if (!isOpen || !submission) return null;

  const [verifying, setVerifying] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedSig, setCopiedSig] = useState(false);
  const [currentSub, setCurrentSub] = useState(submission);
  const [verifyNotice, setVerifyNotice] = useState(null);

  const status = currentSub.verification_status || "UNVERIFIED";

  const getStatusBadge = () => {
    switch (status) {
      case "VALID":
        return {
          bg: "#d1fae5",
          border: "#10b981",
          color: "#065f46",
          icon: <ShieldCheck size={20} color="#059669" />,
          title: "Cryptographically Verified (Authentic & Intact)"
        };
      case "TAMPERED":
        return {
          bg: "#fee2e2",
          border: "#ef4444",
          color: "#991b1b",
          icon: <ShieldAlert size={20} color="#dc2626" />,
          title: "TAMPERING DETECTED — File Content Modified"
        };
      case "KEY_REVOKED":
        return {
          bg: "#fef3c7",
          border: "#f59e0b",
          color: "#92400e",
          icon: <ShieldAlert size={20} color="#d97706" />,
          title: "Signing Key Revoked by Student"
        };
      case "INVALID":
        return {
          bg: "#fee2e2",
          border: "#f87171",
          color: "#991b1b",
          icon: <ShieldX size={20} color="#e11d48" />,
          title: "Digital Signature Failed Verification"
        };
      default:
        return {
          bg: "#f1f5f9",
          border: "#cbd5e1",
          color: "#475569",
          icon: <KeyRound size={20} color="#64748b" />,
          title: "Unsigned / Verification Pending"
        };
    }
  };

  const badge = getStatusBadge();

  // Trigger live cryptographic re-verification
  const handleVerifyNow = async () => {
    setVerifying(true);
    setVerifyNotice(null);
    try {
      const res = await fetch(`${API_BASE}/submissions/${currentSub.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verifier_email: currentUser?.email || "verifier@smartrepo.edu",
          verifier_role: currentUser?.role || "Teacher"
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentSub((prev) => ({
          ...prev,
          verification_status: data.verification_status,
          verification_reason: data.verification_reason,
          last_verified_at: data.verified_at
        }));
        setVerifyNotice({
          type: data.verification_status === "VALID" ? "success" : "error",
          text: data.verification_reason || `Verification complete: ${data.verification_status}`
        });
        if (onReverified) onReverified(data);
      }
    } catch (err) {
      console.error("Verification error:", err);
      setVerifyNotice({ type: "error", text: "Verification network request failed." });
    } finally {
      setVerifying(false);
    }
  };

  // Download PDF certificate
  const handleDownloadPDF = () => {
    window.open(`${API_BASE}/submissions/${currentSub.id}/receipt?format=pdf`, "_blank");
  };

  return (
    <div className="campus-modal-backdrop">
      <div className="campus-modal-card" style={{ maxWidth: "680px" }}>
        <div className="campus-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: badge.bg, padding: "8px", borderRadius: "8px" }}>
              {badge.icon}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem" }}>Cryptographic Submission Audit</h3>
              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                Submission ID: {currentSub.id}
              </span>
            </div>
          </div>
          <button type="button" className="campus-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Status Banner */}
          <div
            style={{
              background: badge.bg,
              border: `1px solid ${badge.border}`,
              color: badge.color,
              padding: "12px 16px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div>
              <strong style={{ fontSize: "0.95rem", display: "block" }}>{badge.title}</strong>
              <span style={{ fontSize: "0.82rem", opacity: 0.9 }}>
                {currentSub.verification_reason || "RSA-PSS with SHA-256 (3072-bit Key)"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleVerifyNow}
              disabled={verifying}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: "600",
                color: "#1e293b",
                cursor: "pointer"
              }}
            >
              <RefreshCw size={14} className={verifying ? "spin-animate" : ""} />
              <span>{verifying ? "Checking..." : "Re-Verify Now"}</span>
            </button>
          </div>

          {verifyNotice && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: "0.84rem",
                background: verifyNotice.type === "success" ? "#ecfdf5" : "#fef2f2",
                color: verifyNotice.type === "success" ? "#065f46" : "#991b1b",
                border: `1px solid ${verifyNotice.type === "success" ? "#a7f3d0" : "#fecaca"}`
              }}
            >
              {verifyNotice.text}
            </div>
          )}

          {/* Metadata Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "#f8fafc", padding: "14px", borderRadius: "8px", fontSize: "0.85rem" }}>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Student Author</span>
              <strong style={{ color: "#0f172a" }}>{currentSub.student_name}</strong>
              <span style={{ display: "block", color: "#64748b", fontSize: "0.78rem" }}>{currentSub.student_email}</span>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Course & Assignment</span>
              <strong style={{ color: "#0f172a" }}>{currentSub.assignment_title}</strong>
              <span style={{ display: "block", color: "#64748b", fontSize: "0.78rem" }}>{currentSub.subject_name} ({currentSub.subject_code})</span>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Submitted File</span>
              <strong style={{ color: "#0f172a" }}>{currentSub.original_filename}</strong>
              <span style={{ display: "block", color: "#64748b", fontSize: "0.78rem" }}>{currentSub.file_size_formatted}</span>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block" }}>Server Submission Time</span>
              <strong style={{ color: "#0f172a" }}>{new Date(currentSub.submitted_at).toLocaleString()}</strong>
              {currentSub.is_late && (
                <span style={{ display: "inline-block", background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: "700", marginLeft: "4px" }}>
                  LATE
                </span>
              )}
            </div>
          </div>

          {/* Cryptographic Hash Details */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontSize: "0.84rem", fontWeight: "600", color: "#334155" }}>
                Cryptographic SHA-256 Checksum
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(currentSub.sha256_hash);
                  setCopiedHash(true);
                  setTimeout(() => setCopiedHash(false), 2000);
                }}
                style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Copy size={12} />
                <span>{copiedHash ? "Copied!" : "Copy Hash"}</span>
              </button>
            </div>
            <div style={{ background: "#0a192f", color: "#38bdf8", padding: "10px 12px", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.78rem", wordBreak: "break-all" }}>
              {currentSub.sha256_hash}
            </div>
          </div>

          {/* Digital Signature Details */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontSize: "0.84rem", fontWeight: "600", color: "#334155" }}>
                RSA-PSS Digital Signature (Key ID: {currentSub.public_key_id || "N/A"})
              </span>
              {currentSub.digital_signature && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(currentSub.digital_signature);
                    setCopiedSig(true);
                    setTimeout(() => setCopiedSig(false), 2000);
                  }}
                  style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <Copy size={12} />
                  <span>{copiedSig ? "Copied!" : "Copy Signature"}</span>
                </button>
              )}
            </div>
            <div style={{ background: "#f1f5f9", color: "#475569", padding: "10px 12px", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.75rem", maxHeight: "80px", overflowY: "auto", wordBreak: "break-all" }}>
              {currentSub.digital_signature || "No digital signature attached."}
            </div>
          </div>

          {/* Institutional Receipt Signature */}
          {currentSub.receipt_signature && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px 14px", borderRadius: "8px", fontSize: "0.8rem", color: "#1e40af" }}>
              <strong>Institutional Non-Repudiation Attestation:</strong>
              <p style={{ margin: "2px 0 0", fontSize: "0.76rem", opacity: 0.85 }}>
                Receipt cryptographically attested and signed by the CampusConnect 2.0 Institutional Authority.
              </p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDownloadPDF}
              style={{ display: "flex", alignItems: "center", gap: "6px", color: "#2563eb" }}
            >
              <Download size={16} />
              <span>Download Official PDF Certificate</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
