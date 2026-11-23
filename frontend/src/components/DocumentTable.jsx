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
  RotateCcw
} from "lucide-react";

export default function DocumentTable({
  documents,
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
  const isAdmin = currentUser?.role === "Admin";

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Documents":
        return <FileText size={16} className="cat-icon-doc" />;
      case "Presentations":
        return <Presentation size={16} className="cat-icon-pres" />;
      case "Spreadsheets":
        return <FileSpreadsheet size={16} className="cat-icon-sheet" />;
      case "Images":
        return <ImageIcon size={16} className="cat-icon-img" />;
      default:
        return <FileCode size={16} className="cat-icon-code" />;
    }
  };

  const getStatusBadge = (status, reason) => {
    switch (status) {
      case "Approved":
        return (
          <span className="badge-status status-approved">
            <CheckCircle2 size={12} /> Approved
          </span>
        );
      case "Pending":
        return (
          <span className="badge-status status-pending">
            <Clock3 size={12} /> Pending Review
          </span>
        );
      case "Rejected":
        return (
          <span className="badge-status status-rejected" title={reason || "Submission rejected"}>
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return <span className="badge-status status-unknown">{status || "Unknown"}</span>;
    }
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="table-empty-state">
        <FileText size={36} className="empty-icon" />
        <h4>No Documents Found</h4>
        <p>No academic resources match your current criteria or filter selections.</p>
      </div>
    );
  }

  return (
    <div className="campus-table-container">
      <table className="campus-data-table">
        <thead>
          <tr>
            <th>Document Name</th>
            <th>Category</th>
            <th>Uploaded By</th>
            <th>File Size</th>
            <th>Upload Date</th>
            {!isRecycleBin && <th>Status</th>}
            {!isRecycleBin && <th>Downloads</th>}
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const isOwner = currentUser?.email?.toLowerCase() === doc.uploaded_by_email?.toLowerCase();
            const canDelete = isOwner || isAdmin;

            return (
              <tr key={doc.id}>
                {/* Document Name */}
                <td className="table-cell-title" onClick={() => !isRecycleBin && onPreview(doc)}>
                  <div className="title-with-icon">
                    <span className="cell-doc-icon">{getCategoryIcon(doc.category)}</span>
                    <div className="title-text-group">
                      <span className="table-filename" title={doc.original_filename}>
                        {doc.original_filename}
                      </span>
                      {doc.rejection_reason && doc.approval_status === "Rejected" && (
                        <span className="table-rejection-tip" title={doc.rejection_reason}>
                          Reason: {doc.rejection_reason}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Category */}
                <td>
                  <span className="table-category-badge">{doc.category}</span>
                </td>

                {/* Uploaded By */}
                <td>
                  <div className="uploader-cell">
                    <span className="uploader-fullname">{doc.uploaded_by_name}</span>
                    <span className="uploader-role-sub">({doc.uploaded_by_role})</span>
                  </div>
                </td>

                {/* File Size */}
                <td className="text-muted">{doc.file_size_formatted || "Document"}</td>

                {/* Upload Date */}
                <td className="text-muted">
                  {new Date(doc.uploaded_at).toLocaleDateString()}
                </td>

                {/* Status */}
                {!isRecycleBin && (
                  <td>{getStatusBadge(doc.approval_status, doc.rejection_reason)}</td>
                )}

                {/* Downloads */}
                {!isRecycleBin && (
                  <td className="text-center font-medium">
                    {doc.download_count || 0}
                  </td>
                )}

                {/* Actions */}
                <td className="text-right">
                  <div className="table-actions-cluster">
                    {isRecycleBin ? (
                      <>
                        <button
                          type="button"
                          className="table-action-btn restore"
                          onClick={() => onRestore(doc.id)}
                          title="Restore document"
                        >
                          <RotateCcw size={14} /> Restore
                        </button>
                        <button
                          type="button"
                          className="table-action-btn danger"
                          onClick={() => onPermanentDelete(doc)}
                          title="Permanently purge"
                        >
                          <Trash2 size={14} /> Purge
                        </button>
                      </>
                    ) : (
                      <>
                        {isAdmin && doc.approval_status === "Pending" && (
                          <>
                            <button
                              type="button"
                              className="btn-table-approve"
                              onClick={() => onApprove(doc)}
                              title="Approve"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn-table-reject"
                              onClick={() => onReject(doc)}
                              title="Reject"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          className={`table-action-icon-btn ${doc.is_favorite ? "favorite-active" : ""}`}
                          onClick={() => onToggleFavorite(doc.id)}
                          title={doc.is_favorite ? "Remove from Favorites" : "Add to Favorites"}
                        >
                          <Bookmark size={15} fill={doc.is_favorite ? "currentColor" : "none"} />
                        </button>

                        <button
                          type="button"
                          className="table-action-icon-btn"
                          onClick={() => onPreview(doc)}
                          title="Preview document"
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          type="button"
                          className="table-action-icon-btn"
                          onClick={() => onDownload(doc)}
                          title="Download document"
                        >
                          <Download size={15} />
                        </button>

                        {canDelete && (
                          <button
                            type="button"
                            className="table-action-icon-btn delete"
                            onClick={() => onDelete(doc)}
                            title="Move to Recycle Bin"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
