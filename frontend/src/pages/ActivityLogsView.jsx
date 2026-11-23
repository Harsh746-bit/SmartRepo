import React, { useState, useMemo } from "react";
import {
  ScrollText,
  Search,
  Filter,
  ShieldCheck,
  Clock,
  User,
  FileText
} from "lucide-react";

export default function ActivityLogsView({
  activityLogs = []
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("All");

  const actions = [
    "All",
    "UPLOAD",
    "DOWNLOAD",
    "PREVIEW",
    "APPROVE",
    "REJECT",
    "DELETE",
    "RESTORE",
    "PERMANENT_DELETE",
    "DUPLICATE_BLOCKED"
  ];

  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm.trim() ||
        log.document_name?.toLowerCase().includes(q) ||
        log.user_email?.toLowerCase().includes(q) ||
        log.user_name?.toLowerCase().includes(q) ||
        log.details?.toLowerCase().includes(q);
      const matchesAction = actionFilter === "All" || log.action === actionFilter;
      return matchesSearch && matchesAction;
    });
  }, [activityLogs, searchTerm, actionFilter]);

  const getActionBadgeClass = (action) => {
    switch (action) {
      case "UPLOAD":
        return "badge-upload";
      case "DOWNLOAD":
        return "badge-download";
      case "PREVIEW":
        return "badge-preview";
      case "APPROVE":
        return "badge-approve";
      case "REJECT":
        return "badge-reject";
      case "DELETE":
      case "PERMANENT_DELETE":
        return "badge-delete";
      case "RESTORE":
        return "badge-restore";
      case "DUPLICATE_BLOCKED":
        return "badge-duplicate";
      default:
        return "badge-default";
    }
  };

  return (
    <div className="campus-repository-view">
      <div className="repo-header-panel">
        <div className="repo-title-group">
          <h2>Cryptographic Activity Audit Trail</h2>
          <p>
            Immutable institutional log of repository events, security interceptions, moderation decisions, and access history.
          </p>
        </div>
      </div>

      {/* Filter strip */}
      <div className="repo-controls-strip">
        <div className="repo-search-box">
          <Search size={16} className="search-field-icon" />
          <input
            type="text"
            className="repo-search-input"
            placeholder="Search audit trail by actor, document, or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="repo-tools-group">
          <div className="select-wrapper">
            <select
              className="repo-select-control"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              {actions.map((act) => (
                <option key={act} value={act}>
                  {act === "All" ? "All Event Actions" : `Action: ${act}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Activity logs table */}
      {filteredLogs.length > 0 ? (
        <div className="campus-table-container">
          <table className="campus-data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action Event</th>
                <th>Actor / User</th>
                <th>Role</th>
                <th>Document Name</th>
                <th>Security Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => (
                <tr key={log.id || idx}>
                  <td className="text-muted">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <span className={`audit-badge ${getActionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="font-medium">
                    <div className="uploader-cell">
                      <span className="uploader-fullname">{log.user_name || "Campus Member"}</span>
                      <span className="uploader-role-sub">{log.user_email}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-muted">({log.user_role || "User"})</span>
                  </td>
                  <td className="font-medium">
                    {log.document_name || "—"}
                  </td>
                  <td className="text-muted text-sm">
                    {log.details || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="repo-empty-card">
          <ScrollText size={48} className="empty-icon" />
          <h3>No Audit Records Found</h3>
          <p>No logged events match your filter selections.</p>
        </div>
      )}
    </div>
  );
}
