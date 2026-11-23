import React from "react";
import {
  FileText,
  CheckCircle2,
  Clock3,
  UploadCloud,
  Bookmark,
  History,
  TrendingUp,
  Compass,
  ArrowRight,
  BookOpen
} from "lucide-react";
import StatsCard from "../components/StatsCard";
import DocumentCard from "../components/DocumentCard";

export default function TeacherDashboard({
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
  const teacherName = user?.name || "Professor";

  const totalUploaded = stats?.my_total_count ?? 0;
  const approvedCount = stats?.my_approved_count ?? 0;
  const pendingCount = stats?.my_pending_count ?? 0;
  const totalDownloads = stats?.my_total_downloads ?? 0;

  return (
    <div className="campus-dashboard-layout">
      {/* Faculty Welcome Banner */}
      <div className="dashboard-welcome-banner faculty-banner">
        <div className="welcome-banner-text">
          <h2>Welcome, Professor {teacherName} 🎓</h2>
          <p>
            Manage course syllabi, lecture decks, and lab manuals. Resources uploaded by faculty are automatically approved and published to the collegiate repository.
          </p>
          <div className="welcome-banner-cta-group">
            <button
              type="button"
              className="banner-cta-btn primary"
              onClick={() => onNavigate("upload")}
            >
              <UploadCloud size={16} /> Upload Lecture Material
            </button>
            <button
              type="button"
              className="banner-cta-btn secondary"
              onClick={() => onNavigate("browse")}
            >
              <Compass size={16} /> Explore Repository
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="dashboard-stats-grid four-cols">
        <StatsCard
          title="Published Materials"
          value={totalUploaded}
          subtitle="Course syllabi & presentations"
          icon={BookOpen}
          colorScheme="blue"
          onClick={() => onNavigate("my_documents")}
        />
        <StatsCard
          title="Approved Resources"
          value={approvedCount}
          subtitle="Active campus publications"
          icon={CheckCircle2}
          colorScheme="emerald"
          onClick={() => onNavigate("my_documents")}
        />
        <StatsCard
          title="Pending Review"
          value={pendingCount}
          subtitle="Awaiting moderation queue"
          icon={Clock3}
          colorScheme="amber"
          badge={pendingCount > 0 ? "Under Review" : null}
          onClick={() => onNavigate("my_documents")}
        />
        <StatsCard
          title="Student Engagements"
          value={totalDownloads}
          subtitle="Total document downloads"
          icon={TrendingUp}
          colorScheme="indigo"
          onClick={() => onNavigate("my_documents")}
        />
      </div>

      {/* Two Column: Recently Viewed & Favorites */}
      <div className="dashboard-double-columns">
        {/* Recently Viewed */}
        <div className="dashboard-card-section">
          <div className="section-header-row">
            <div className="section-title-wrapper">
              <History size={18} className="section-icon blue" />
              <h3>Recently Viewed Academic Documents</h3>
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
              <p>No recently viewed documents recorded yet.</p>
            </div>
          )}
        </div>

        {/* Bookmarked Resources */}
        <div className="dashboard-card-section">
          <div className="section-header-row">
            <div className="section-title-wrapper">
              <Bookmark size={18} className="section-icon gold" />
              <h3>Starred Course Resources</h3>
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
              <p>Star lecture presentations or lab sheets to pin them here for quick access.</p>
            </div>
          )}
        </div>
      </div>

      {/* Frequently Accessed Resources */}
      <div className="dashboard-full-section">
        <div className="section-header-row">
          <div className="section-title-wrapper">
            <TrendingUp size={18} className="section-icon emerald" />
            <h3>Frequently Accessed Campus Resources</h3>
          </div>
          <button
            type="button"
            className="section-link-btn"
            onClick={() => onNavigate("browse")}
          >
            Browse Repository <ArrowRight size={14} />
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
            <p>Documents with high student engagement will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
