import React from "react";
import {
  FileText,
  CheckCircle2,
  Clock3,
  XCircle,
  UploadCloud,
  Bookmark,
  History,
  TrendingUp,
  Compass,
  ArrowRight
} from "lucide-react";
import StatsCard from "../components/StatsCard";
import DocumentCard from "../components/DocumentCard";

export default function StudentDashboard({
  user,
  stats,
  recentDocs = [],
  favoriteDocs = [],
  frequentDocs = [],
  onNavigate,
  onPreview,
  onDownload,
  onToggleFavorite,
  onDelete
}) {
  const studentName = user?.name || "Student";

  // Calculations for student stats
  const totalUploaded = stats?.my_total_count ?? 0;
  const approvedCount = stats?.my_approved_count ?? 0;
  const pendingCount = stats?.my_pending_count ?? 0;
  const rejectedCount = stats?.my_rejected_count ?? 0;

  return (
    <div className="campus-dashboard-layout">
      {/* Welcome Banner */}
      <div className="dashboard-welcome-banner student-banner">
        <div className="welcome-banner-text">
          <h2>Welcome back, {studentName}! 👋</h2>
          <p>
            Your student academic vault is ready. Track your lecture notes, assignments, and browse verified college study materials.
          </p>
          <div className="welcome-banner-cta-group">
            <button
              type="button"
              className="banner-cta-btn primary"
              onClick={() => onNavigate("upload")}
            >
              <UploadCloud size={16} /> Quick Upload Material
            </button>
            <button
              type="button"
              className="banner-cta-btn secondary"
              onClick={() => onNavigate("browse")}
            >
              <Compass size={16} /> Browse Campus Repository
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="dashboard-stats-grid four-cols">
        <StatsCard
          title="My Uploaded Materials"
          value={totalUploaded}
          subtitle="Course assignments & notes"
          icon={FileText}
          colorScheme="blue"
          onClick={() => onNavigate("my_documents")}
        />
        <StatsCard
          title="Approved Documents"
          value={approvedCount}
          subtitle="Published & accessible across campus"
          icon={CheckCircle2}
          colorScheme="emerald"
          onClick={() => onNavigate("my_documents")}
        />
        <StatsCard
          title="Pending Moderation"
          value={pendingCount}
          subtitle="Awaiting faculty/admin approval"
          icon={Clock3}
          colorScheme="amber"
          badge={pendingCount > 0 ? "Reviewing" : null}
          onClick={() => onNavigate("my_documents")}
        />
        <StatsCard
          title="Needs Revision"
          value={rejectedCount}
          subtitle="Submissions requiring updates"
          icon={XCircle}
          colorScheme="rose"
          badge={rejectedCount > 0 ? "Action Required" : null}
          onClick={() => onNavigate("my_documents")}
        />
      </div>

      {/* Two Column Section: Recently Viewed & Favorites */}
      <div className="dashboard-double-columns">
        {/* Recently Viewed */}
        <div className="dashboard-card-section">
          <div className="section-header-row">
            <div className="section-title-wrapper">
              <History size={18} className="section-icon blue" />
              <h3>Recently Viewed Documents</h3>
            </div>
            <button
              type="button"
              className="section-link-btn"
              onClick={() => onNavigate("recent")}
            >
              View All <ArrowRight size={14} />
            </button>
          </div>

          {recentDocs && recentDocs.length > 0 ? (
            <div className="dashboard-cards-grid">
              {recentDocs.slice(0, 3).map((doc) => (
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
              <History size={28} className="empty-icon" />
              <p>You haven't previewed any documents recently.</p>
              <button
                type="button"
                className="btn-sub-action"
                onClick={() => onNavigate("browse")}
              >
                Browse Study Materials
              </button>
            </div>
          )}
        </div>

        {/* Favorite Bookmarks */}
        <div className="dashboard-card-section">
          <div className="section-header-row">
            <div className="section-title-wrapper">
              <Bookmark size={18} className="section-icon gold" />
              <h3>My Bookmarks & Favorites</h3>
            </div>
            <button
              type="button"
              className="section-link-btn"
              onClick={() => onNavigate("favorites")}
            >
              View All <ArrowRight size={14} />
            </button>
          </div>

          {favoriteDocs && favoriteDocs.length > 0 ? (
            <div className="dashboard-cards-grid">
              {favoriteDocs.slice(0, 3).map((doc) => (
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
              <Bookmark size={28} className="empty-icon" />
              <p>No documents starred yet. Click the bookmark icon on any document to pin it here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Popular Campus Resources */}
      <div className="dashboard-full-section">
        <div className="section-header-row">
          <div className="section-title-wrapper">
            <TrendingUp size={18} className="section-icon emerald" />
            <h3>Popular Campus Resources</h3>
          </div>
          <button
            type="button"
            className="section-link-btn"
            onClick={() => onNavigate("browse")}
          >
            Explore Library <ArrowRight size={14} />
          </button>
        </div>

        {frequentDocs && frequentDocs.length > 0 ? (
          <div className="dashboard-cards-grid four-cols">
            {frequentDocs.slice(0, 4).map((doc) => (
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
            <TrendingUp size={28} className="empty-icon" />
            <p>Popular documents will appear here as students access materials.</p>
          </div>
        )}
      </div>
    </div>
  );
}
