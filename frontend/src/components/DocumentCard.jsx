import React from "react";
import {
  FileText,
  Presentation,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Download,
  Eye,
  Bookmark,
  Trash2,
  CheckCircle2,
  Clock3,
  XCircle,
  Calendar,
  User,
  HardDrive,
  RotateCcw
} from "lucide-react";

export default function DocumentCard({
  doc,
  onPreview,
  onDownload,
  onToggleFavorite,
  onDelete,
  onRestore,
  onPermanentDelete,
  onApprove,
  onReject,
  currentUser,
  isRecycleBin = false
}) {
  const isOwner = currentUser?.email?.toLowerCase() === doc.uploaded_by_email?.toLowerCase();
  const isAdmin = currentUser?.role === "Admin";
  const canDelete = isOwner || isAdmin;

  const getCategoryIcon = () => {
    switch (doc.category) {
      case "Documents":
        return <FileText size={22} className="cat-icon-doc" />;
      case "Presentations":
        return <Presentation size={22} className="cat-icon-pres" />;
      case "Spreadsheets":
        return <FileSpreadsheet size={22} className="cat-icon-sheet" />;
      case "Images":
        return <ImageIcon size={22} className="cat-icon-img" />;
      default:
        return <FileCode size={22} className="cat-icon-code" />;
    }
  };

  const getStatusBadge = () => {
    switch (doc.approval_status) {
      case "Approved":
        return (
          <span className="badge-status status-approved" title="Approved for campus access">
            <CheckCircle2 size={12} /> Approved
          </span>
        );
      case "Pending":
        return (
          <span className="badge-status status-pending" title="Awaiting administrator moderation">
            <Clock3 size={12} /> Pending Review
          </span>
        );
      case "Rejected":
        return (
          <span className="badge-status status-rejected" title={doc.rejection_reason || "Document rejected"}>
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="campus-doc-card">
      {/* Card Header */}
      <div className="card-top-bar">
        <div className="card-icon-container">
          {getCategoryIcon()}
        </div>

        <div className="card-status-favorite">
          {getStatusBadge()}
          <button
            type="button"
            className={`card-fav-btn ${doc.is_favorite ? "active" : ""}`}
            onClick={() => onToggleFavorite(doc.id)}
            title={doc.is_favorite ? "Remove bookmark" : "Add to Favorites"}
            aria-label="Toggle Bookmark"
          >
            <Bookmark size={15} fill={doc.is_favorite ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {/* Card Content */}
      <div className="card-body-section" onClick={() => onPreview(doc)}>
        <h3 className="card-title-text" title={doc.original_filename}>
          {doc.original_filename}
        </h3>

        <div className="card-uploader-info">
          <User size={13} className="meta-icon" />
          <span className="uploader-name">{doc.uploaded_by_name}</span>
          <span className="uploader-role-tag">({doc.uploaded_by_role})</span>
        </div>

        <div className="card-metadata-pills">
          <span className="meta-pill">
            <HardDrive size={12} /> {doc.file_size_formatted || "Document"}
          </span>
          <span className="meta-pill">
            <Calendar size={12} /> {new Date(doc.uploaded_at).toLocaleDateString()}
          </span>
          <span className="meta-pill category">{doc.category}</span>
        </div>

        {doc.approval_status === "Rejected" && doc.rejection_reason && (
          <div className="card-rejection-note" title={doc.rejection_reason}>
            <strong>Note:</strong> {doc.rejection_reason}
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="card-actions-bar">
        <div className="card-stats-info">
          <span>{doc.download_count || 0} downloads</span>
        </div>

        <div className="card-btn-cluster">
          {isRecycleBin ? (
            <>
              <button
                type="button"
                className="btn-quick-approve"
                style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 10px", fontSize: "0.78rem" }}
                onClick={() => onRestore && onRestore(doc)}
                title="Restore Document"
              >
                <RotateCcw size={13} /> Restore
              </button>
              <button
                type="button"
                className="btn-quick-reject"
                style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 10px", fontSize: "0.78rem" }}
                onClick={() => onPermanentDelete && onPermanentDelete(doc)}
                title="Permanently Purge"
              >
                <Trash2 size={13} /> Purge
              </button>
            </>
          ) : (
            <>
              {/* Admin Approval / Rejection buttons if pending */}
              {isAdmin && doc.approval_status === "Pending" && (
                <>
                  <button
                    type="button"
                    className="btn-quick-approve"
                    onClick={() => onApprove(doc)}
                    title="Approve Document"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn-quick-reject"
                    onClick={() => onReject(doc)}
                    title="Reject Document"
                  >
                    Reject
                  </button>
                </>
              )}

              <button
                type="button"
                className="card-action-icon-btn preview"
                onClick={() => onPreview(doc)}
                title="Preview Document"
                aria-label="Preview"
              >
                <Eye size={15} />
              </button>

              <button
                type="button"
                className="card-action-icon-btn download"
                onClick={() => onDownload(doc)}
                title="Download Document"
                aria-label="Download"
              >
                <Download size={15} />
              </button>

              {canDelete && (
                <button
                  type="button"
                  className="card-action-icon-btn delete"
                  onClick={() => onDelete(doc)}
                  title="Delete Document"
                  aria-label="Delete"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
