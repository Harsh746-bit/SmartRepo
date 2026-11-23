import React from "react";
import {
  BarChart3,
  TrendingUp,
  Download,
  HardDrive,
  CheckCircle2,
  Clock3,
  XCircle,
  Copy,
  Calendar
} from "lucide-react";
import StatsCard from "../components/StatsCard";

export default function AnalyticsView({
  analytics = {}
}) {
  const totalDocs = analytics.total_documents || 0;
  const approvedDocs = analytics.approved_documents || 0;
  const pendingDocs = analytics.pending_approvals || 0;
  const rejectedDocs = analytics.rejected_documents || 0;
  const duplicateBlocks = analytics.duplicate_files_detected || 0;
  const storageFormatted = analytics.storage_used_formatted || "0 B";
  const mostDownloaded = analytics.most_downloaded_documents || [];
  const monthlyStats = analytics.monthly_upload_statistics || [];

  return (
    <div className="campus-repository-view">
      <div className="repo-header-panel">
        <div className="repo-title-group">
          <h2>Repository Analytics & Usage Intelligence</h2>
          <p>
            Real-time telemetry on document throughput, student engagement, and storage growth.
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="dashboard-stats-grid four-cols">
        <StatsCard
          title="Total Documents"
          value={totalDocs}
          subtitle="Vault active inventory"
          icon={BarChart3}
          colorScheme="blue"
        />
        <StatsCard
          title="Approval Rate"
          value={totalDocs > 0 ? `${Math.round((approvedDocs / totalDocs) * 100)}%` : "100%"}
          subtitle={`${approvedDocs} approved out of ${totalDocs}`}
          icon={CheckCircle2}
          colorScheme="emerald"
        />
        <StatsCard
          title="Duplicate Intercepts"
          value={duplicateBlocks}
          subtitle="Redundant uploads prevented"
          icon={Copy}
          colorScheme="purple"
        />
        <StatsCard
          title="Vault Storage Used"
          value={storageFormatted}
          subtitle="Aggregated binary size"
          icon={HardDrive}
          colorScheme="teal"
        />
      </div>

      {/* Monthly Upload Statistics Bar Chart */}
      <div className="repo-section-card">
        <div className="section-header-row">
          <div className="section-title-wrapper">
            <Calendar size={18} className="section-icon blue" />
            <h3>Monthly Upload Trends</h3>
          </div>
        </div>

        {monthlyStats.length > 0 ? (
          <div className="monthly-chart-container">
            <div className="chart-bars-row">
              {monthlyStats.map((stat, idx) => {
                const maxCount = Math.max(...monthlyStats.map((s) => s.count || 0), 1);
                const heightPercent = Math.max(Math.round(((stat.count || 0) / maxCount) * 100), 14);

                return (
                  <div key={idx} className="chart-bar-column">
                    <div className="chart-bar-fill-wrapper">
                      <div
                        className="chart-bar-fill"
                        style={{ height: `${heightPercent}%` }}
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
          <div className="repo-empty-card">
            <BarChart3 size={36} className="empty-icon" />
            <p>Upload metrics will accumulate month-over-month.</p>
          </div>
        )}
      </div>

      {/* Most Downloaded Leaderboard */}
      <div className="repo-section-card">
        <div className="section-header-row">
          <div className="section-title-wrapper">
            <TrendingUp size={18} className="section-icon emerald" />
            <h3>Most Downloaded Course Materials Leaderboard</h3>
          </div>
        </div>

        {mostDownloaded.length > 0 ? (
          <div className="campus-table-container">
            <table className="campus-data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Document Title</th>
                  <th>Author / Uploader</th>
                  <th className="text-right">Total Downloads</th>
                </tr>
              </thead>
              <tbody>
                {mostDownloaded.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="rank-badge">#{idx + 1}</td>
                    <td className="font-medium">{item.filename}</td>
                    <td className="text-muted">{item.uploaded_by}</td>
                    <td className="text-right font-bold count-blue">{item.downloads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="repo-empty-card">
            <TrendingUp size={36} className="empty-icon" />
            <p>Download records will appear as students and faculty access materials.</p>
          </div>
        )}
      </div>
    </div>
  );
}
