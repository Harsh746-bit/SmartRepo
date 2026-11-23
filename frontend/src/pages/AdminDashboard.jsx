import React from "react";
import {
  Files,
  GraduationCap,
  BookOpen,
  Clock3,
  CheckCircle2,
  XCircle,
  Copy,
  HardDrive,
  TrendingUp,
  ScrollText,
  ArrowRight,
  ShieldAlert,
  BarChart2
} from "lucide-react";
import StatsCard from "../components/StatsCard";

export default function AdminDashboard({
  analytics,
  recentUploads = [],
  activityLogs = [],
  onNavigate,
  onPreview,
  onApprove,
  onReject
}) {
  const totalDocs = analytics?.total_documents ?? 0;
  const totalStudents = analytics?.total_students ?? 0;
  const totalTeachers = analytics?.total_teachers ?? 0;
  const pendingApprovals = analytics?.pending_approvals ?? 0;
  const approvedDocs = analytics?.approved_documents ?? 0;
  const rejectedDocs = analytics?.rejected_documents ?? 0;
  const duplicateFiles = analytics?.duplicate_files_detected ?? 0;
  const storageFormatted = analytics?.storage_used_formatted || "0 B";
  const mostDownloaded = analytics?.most_downloaded_documents || [];
  const monthlyStats = analytics?.monthly_upload_statistics || [];

  return (
    <div className="campus-dashboard-layout">
      {/* Admin Control Banner */}
      <div className="dashboard-welcome-banner admin-banner">
        <div className="welcome-banner-text">
          <h2>Campus Repository Administration Console 🛡️</h2>
          <p>
            Institution-wide governance overview. Monitor student and faculty uploads, review pending submissions, track SHA-256 duplicate intercepts, and review security audit logs.
          </p>
          <div className="welcome-banner-cta-group">
            <button
              type="button"
              className="banner-cta-btn primary"
              onClick={() => onNavigate("pending_approvals")}
            >
              <Clock3 size={16} /> Review Pending Submissions ({pendingApprovals})
            </button>
            <button
              type="button"
              className="banner-cta-btn secondary"
              onClick={() => onNavigate("user_management")}
            >
              <GraduationCap size={16} /> Student & Faculty Directory
            </button>
          </div>
        </div>
      </div>

      {/* 8 Metric Cards Grid */}
      <div className="dashboard-stats-grid four-cols">
        <StatsCard
          title="Total Documents"
          value={totalDocs}
          subtitle="All campus files in vault"
          icon={Files}
          colorScheme="blue"
          onClick={() => onNavigate("all_documents")}
        />
        <StatsCard
          title="Pending Approvals"
          value={pendingApprovals}
          subtitle="Student uploads awaiting review"
          icon={Clock3}
          colorScheme="amber"
          badge={pendingApprovals > 0 ? "Action Required" : "Up to Date"}
          onClick={() => onNavigate("pending_approvals")}
        />
        <StatsCard
          title="Approved Documents"
          value={approvedDocs}
          subtitle="Live published resources"
          icon={CheckCircle2}
          colorScheme="emerald"
          onClick={() => onNavigate("approved_documents")}
        />
        <StatsCard
          title="Rejected Submissions"
          value={rejectedDocs}
          subtitle="Sent back for revision"
          icon={XCircle}
          colorScheme="rose"
          onClick={() => onNavigate("rejected_documents")}
        />
        <StatsCard
          title="Enrolled Students"
          value={totalStudents}
          subtitle="Registered student accounts"
          icon={GraduationCap}
          colorScheme="blue"
          onClick={() => onNavigate("user_management")}
        />
        <StatsCard
          title="Faculty Members"
          value={totalTeachers}
          subtitle="Academic instructors"
          icon={BookOpen}
          colorScheme="indigo"
          onClick={() => onNavigate("user_management")}
        />
        <StatsCard
          title="Duplicate Intercepts"
          value={duplicateFiles}
          subtitle="SHA-256 blocks"
          icon={Copy}
          colorScheme="purple"
          badge={duplicateFiles > 0 ? "Saved Storage" : null}
          onClick={() => onNavigate("duplicate_files")}
        />
        <StatsCard
          title="Vault Storage Used"
          value={storageFormatted}
          subtitle="Cloud & disk physical allocation"
          icon={HardDrive}
          colorScheme="teal"
          onClick={() => onNavigate("storage_management")}
        />
      </div>

      {/* Middle Grid: Pending Approvals & Leaderboard */}
      <div className="dashboard-double-columns">
        {/* Pending Submissions Queue */}
        <div className="dashboard-card-section">
          <div className="section-header-row">
            <div className="section-title-wrapper">
              <Clock3 size={18} className="section-icon amber" />
              <h3>Submissions Requiring Review ({pendingApprovals})</h3>
            </div>
            <button
              type="button"
              className="section-link-btn"
              onClick={() => onNavigate("pending_approvals")}
            >
              Queue <ArrowRight size={14} />
            </button>
          </div>

          {recentUploads && recentUploads.length > 0 ? (
            <div className="pending-submissions-list">
              {recentUploads.slice(0, 4).map((doc) => (
                <div key={doc.id} className="pending-queue-item">
                  <div className="queue-item-meta">
                    <span className="queue-filename" title={doc.original_filename}>
                      {doc.original_filename}
                    </span>
                    <span className="queue-uploader">
                      by <strong>{doc.uploaded_by_name}</strong> ({doc.uploaded_by_role}) • {doc.category}
                    </span>
                  </div>
                  <div className="queue-item-actions">
                    <button
                      type="button"
                      className="btn-item-preview"
                      onClick={() => onPreview(doc)}
                    >
                      Inspect
                    </button>
                    <button
                      type="button"
                      className="btn-quick-approve"
                      onClick={() => onApprove(doc)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn-quick-reject"
                      onClick={() => onReject(doc)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-sub-card">
              <CheckCircle2 size={28} className="empty-icon emerald" />
              <p>All student submissions have been moderated. Moderation queue is clear!</p>
            </div>
          )}
        </div>

        {/* Most Downloaded Documents Leaderboard */}
        <div className="dashboard-card-section">
          <div className="section-header-row">
            <div className="section-title-wrapper">
              <TrendingUp size={18} className="section-icon emerald" />
              <h3>Most Downloaded Resources Leaderboard</h3>
            </div>
            <button
              type="button"
              className="section-link-btn"
              onClick={() => onNavigate("analytics")}
            >
              Full Analytics <ArrowRight size={14} />
            </button>
          </div>

          {mostDownloaded && mostDownloaded.length > 0 ? (
            <div className="leaderboard-table-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Document</th>
                    <th>Uploader</th>
                    <th className="text-right">Downloads</th>
                  </tr>
                </thead>
                <tbody>
                  {mostDownloaded.slice(0, 5).map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="rank-badge">#{idx + 1}</td>
                      <td className="font-medium" title={item.filename}>
                        {item.filename}
                      </td>
                      <td className="text-muted">{item.uploaded_by}</td>
                      <td className="text-right font-bold count-blue">{item.downloads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-sub-card">
              <TrendingUp size={28} className="empty-icon" />
              <p>Download metrics will be tracked as users retrieve materials.</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Upload Activity Trends Bar Chart */}
      <div className="dashboard-full-section">
        <div className="section-header-row">
          <div className="section-title-wrapper">
            <BarChart2 size={18} className="section-icon blue" />
            <h3>Monthly Upload Trends (Institutional Activity)</h3>
          </div>
        </div>

        {monthlyStats && monthlyStats.length > 0 ? (
          <div className="monthly-chart-container">
            <div className="chart-bars-row">
              {monthlyStats.map((stat, idx) => {
                const maxCount = Math.max(...monthlyStats.map((s) => s.count || 0), 1);
                const heightPercent = Math.max(Math.round(((stat.count || 0) / maxCount) * 100), 12);

                return (
                  <div key={idx} className="chart-bar-column">
                    <div className="chart-bar-fill-wrapper">
                      <div
                        className="chart-bar-fill"
                        style={{ height: `${heightPercent}%` }}
                        title={`${stat.month}: ${stat.count} uploads`}
                      />
                    </div>
                    <span className="chart-bar-count">{stat.count}</span>
                    <span className="chart-bar-month">{stat.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="empty-sub-card">
            <BarChart2 size={28} className="empty-icon" />
            <p>Upload statistics will accumulate month-over-month.</p>
          </div>
        )}
      </div>

      {/* Recent Security & Activity Audit Log */}
      <div className="dashboard-full-section">
        <div className="section-header-row">
          <div className="section-title-wrapper">
            <ScrollText size={18} className="section-icon indigo" />
            <h3>Recent Repository Audit Trail</h3>
          </div>
          <button
            type="button"
            className="section-link-btn"
            onClick={() => onNavigate("activity_logs")}
          >
            Audit History <ArrowRight size={14} />
          </button>
        </div>

        {activityLogs && activityLogs.length > 0 ? (
          <div className="audit-table-container">
            <table className="campus-data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Document / Resource</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {activityLogs.slice(0, 5).map((log, idx) => (
                  <tr key={log.id || idx}>
                    <td className="text-muted">{new Date(log.timestamp).toLocaleString()}</td>
                    <td>
                      <span className={`audit-badge badge-${log.action?.toLowerCase()}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="font-medium">{log.user_name || log.user_email}</td>
                    <td><span className="text-muted">({log.user_role})</span></td>
                    <td className="font-medium">{log.document_name || "—"}</td>
                    <td className="text-muted text-sm">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-sub-card">
            <ScrollText size={28} className="empty-icon" />
            <p>Cryptographic audit logs will be recorded as repository events occur.</p>
          </div>
        )}
      </div>
    </div>
  );
}
