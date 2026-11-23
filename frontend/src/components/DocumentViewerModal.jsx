import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Download,
  Bookmark,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  FileText,
  Presentation,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  CheckCircle2,
  Clock3,
  XCircle,
  Copy,
  Check,
  User,
  Calendar,
  HardDrive
} from "lucide-react";
import { API_BASE } from "../config";

export default function DocumentViewerModal({
  isOpen,
  doc,
  onClose,
  onToggleFavorite,
  onDownload,
  apiBaseUrl = API_BASE
}) {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const modalContainerRef = useRef(null);

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        setZoom((prev) => Math.min(prev + 15, 200));
      } else if (e.key === "-") {
        setZoom((prev) => Math.max(prev - 15, 60));
      } else if (e.key === "0") {
        setZoom(100);
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFullscreen]);

  if (!isOpen || !doc) return null;

  const isPdf = doc.category === "Documents" && doc.original_filename?.toLowerCase().endsWith(".pdf");
  const isImage = doc.category === "Images" || /\.(png|jpe?g|webp|gif)$/i.test(doc.original_filename || "");
  const previewUrl = `${apiBaseUrl}/documents/${doc.id}/preview`;

  const toggleFullscreen = () => {
    if (!modalContainerRef.current) return;
    if (!document.fullscreenElement) {
      modalContainerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleCopyText = () => {
    const textToCopy = doc.full_extracted_text || doc.extracted_text_preview || "";
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const getCategoryIcon = () => {
    switch (doc.category) {
      case "Documents":
        return <FileText size={20} className="cat-icon-doc" />;
      case "Presentations":
        return <Presentation size={20} className="cat-icon-pres" />;
      case "Spreadsheets":
        return <FileSpreadsheet size={20} className="cat-icon-sheet" />;
      case "Images":
        return <ImageIcon size={20} className="cat-icon-img" />;
      default:
        return <FileCode size={20} className="cat-icon-code" />;
    }
  };

  const getStatusBadge = () => {
    switch (doc.approval_status) {
      case "Approved":
        return (
          <span className="viewer-status-badge status-approved">
            <CheckCircle2 size={13} /> Approved
          </span>
        );
      case "Pending":
        return (
          <span className="viewer-status-badge status-pending">
            <Clock3 size={13} /> Pending Review
          </span>
        );
      case "Rejected":
        return (
          <span className="viewer-status-badge status-rejected">
            <XCircle size={13} /> Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="doc-viewer-backdrop" onClick={onClose}>
      <div
        ref={modalContainerRef}
        className={`doc-viewer-modal ${isFullscreen ? "fullscreen-active" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Metadata Ribbon */}
        <div className="doc-viewer-header">
          <div className="doc-header-left">
            <div className="doc-category-badge">{getCategoryIcon()}</div>

            <div className="doc-titles-container">
              <div className="doc-main-title-row">
                <h2 className="doc-title-text" title={doc.original_filename}>
                  {doc.original_filename}
                </h2>
                {getStatusBadge()}
              </div>

              <div className="doc-meta-strip">
                <span className="doc-meta-item">
                  <User size={13} /> {doc.uploaded_by_name} ({doc.uploaded_by_role})
                </span>
                <span className="doc-meta-item">
                  <Calendar size={13} /> {new Date(doc.uploaded_at).toLocaleDateString()}
                </span>
                <span className="doc-meta-item">
                  <HardDrive size={13} /> {doc.file_size_formatted || "Document"}
                </span>
                <span className="doc-meta-item category-tag">
                  {doc.category}
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="doc-viewer-toolbar">
            {/* Zoom Controls */}
            <div className="viewer-btn-group">
              <button
                type="button"
                className="viewer-tool-btn"
                onClick={() => setZoom((prev) => Math.max(prev - 15, 60))}
                title="Zoom Out (-)"
              >
                <ZoomOut size={16} />
              </button>

              <button
                type="button"
                className="viewer-tool-btn zoom-indicator"
                onClick={() => setZoom(100)}
                title="Reset Zoom to 100%"
              >
                {zoom}%
              </button>

              <button
                type="button"
                className="viewer-tool-btn"
                onClick={() => setZoom((prev) => Math.min(prev + 15, 200))}
                title="Zoom In (+)"
              >
                <ZoomIn size={16} />
              </button>
            </div>

            {/* Favorite Button */}
            <button
              type="button"
              className={`viewer-action-btn ${doc.is_favorite ? "favorite-active" : ""}`}
              onClick={() => onToggleFavorite(doc.id)}
              title={doc.is_favorite ? "Remove from Favorites" : "Bookmark Document"}
            >
              <Bookmark size={16} fill={doc.is_favorite ? "currentColor" : "none"} />
              <span className="btn-label">{doc.is_favorite ? "Bookmarked" : "Favorite"}</span>
            </button>

            {/* Download Button */}
            <button
              type="button"
              className="viewer-action-btn primary"
              onClick={() => onDownload(doc)}
              title="Download Document"
            >
              <Download size={16} />
              <span className="btn-label">Download</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              className="viewer-tool-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              className="viewer-close-btn"
              onClick={onClose}
              title="Close Preview (Esc)"
              aria-label="Close Preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Rejection Guidance Warning (if rejected) */}
        {doc.approval_status === "Rejected" && doc.rejection_reason && (
          <div className="viewer-rejection-banner">
            <XCircle size={16} />
            <div className="banner-text">
              <strong>Revision Guidance from Administrator:</strong> {doc.rejection_reason}
            </div>
          </div>
        )}

        {/* Viewer Viewport Container */}
        <div className="doc-viewer-body">
          {isPdf ? (
            <div className="pdf-embed-wrapper">
              <iframe
                src={`${previewUrl}#zoom=${zoom}&navpanes=0`}
                className="pdf-viewport-frame"
                title={doc.original_filename}
              />
            </div>
          ) : isImage ? (
            <div className="image-viewport-wrapper">
              <img
                src={previewUrl}
                alt={doc.original_filename}
                className="image-viewport-content"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center top" }}
              />
            </div>
          ) : (
            <div className="text-viewport-card" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center top" }}>
              <div className="text-viewport-header">
                <div className="text-meta-info">
                  <FileText size={16} />
                  <span>Extracted Document Content ({doc.category})</span>
                </div>
                <button
                  type="button"
                  className="copy-text-btn"
                  onClick={handleCopyText}
                >
                  {copiedText ? (
                    <><Check size={14} /> Copied</>
                  ) : (
                    <><Copy size={14} /> Copy Text</>
                  )}
                </button>
              </div>

              <div className="text-viewport-content">
                {doc.full_extracted_text || doc.extracted_text_preview ? (
                  <p className="formatted-text-display">
                    {doc.full_extracted_text || doc.extracted_text_preview}
                  </p>
                ) : (
                  <div className="empty-text-state">
                    <FileText size={32} />
                    <p>No readable text could be extracted from this file format.</p>
                    <button
                      type="button"
                      className="viewer-action-btn primary"
                      onClick={() => onDownload(doc)}
                    >
                      <Download size={15} /> Download to View
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation & Shortcut Guidance */}
        <div className="doc-viewer-footer">
          <div className="footer-shortcuts">
            <span>Shortcut Guide: <b>+/-</b> Zoom • <b>0</b> Reset • <b>F</b> Fullscreen • <b>Esc</b> Close</span>
          </div>
          <div className="footer-metrics">
            <span>Views: <b>{doc.preview_count || 1}</b></span>
            <span className="dot-divider">•</span>
            <span>Downloads: <b>{doc.download_count || 0}</b></span>
          </div>
        </div>
      </div>
    </div>
  );
}
