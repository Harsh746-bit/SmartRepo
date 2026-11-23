import React, { useState, useMemo } from "react";
import {
  Clock,
  User,
  Calendar,
  Eye,
  Download,
  Bookmark,
  FileText,
  Search,
  Filter,
  GraduationCap,
  BookOpen,
  Shield,
  HardDrive
} from "lucide-react";
import DocumentCard from "../components/DocumentCard";

export default function RecentlyViewedView({
  currentUser,
  userRecentDocs = [],
  adminAccessLogs = [],
  onPreview,
  onDownload,
  onToggleFavorite,
  onDelete
}) {
  const isAdmin = currentUser?.role === "Admin";
  const [adminSearch, setAdminSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  // Admin filtered logs
  const filteredAdminLogs = useMemo(() => {
    if (!isAdmin) return [];
    let list = [...adminAccessLogs];

    if (roleFilter !== "All") {
      list = list.filter((item) => item.user_role === roleFilter);
    }

    if (adminSearch.trim()) {
      const q = adminSearch.toLowerCase();
      list = list.filter(
        (item) =>
          item.document_title?.toLowerCase().includes(q) ||
          item.user_email?.toLowerCase().includes(q) ||
          item.user_name?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [isAdmin, adminAccessLogs, roleFilter, adminSearch]);

  if (!isAdmin) {
    // Student & Teacher Personal History View
    return (
      <div className="campus-repository-view">
        <div className="repo-header-panel">
          <div className="repo-title-group">
            <h2>My Recently Viewed Documents</h2>
            <p>
              Your personal reading and preview history. Track materials you accessed recently for fast revision.
            </p>
          </div>
        </div>

        {userRecentDocs && userRecentDocs.length > 0 ? (
          <div className="repo-grid-layout">
            {userRecentDocs.map((doc) => (
              <div key={doc.id} className="recent-card-wrapper">
                <DocumentCard
                  doc={doc}
                  onPreview={onPreview}
                  onDownload={onDownload}
                  onToggleFavorite={onToggleFavorite}
                  onDelete={onDelete}
                  currentUser={currentUser}
                />
                {doc.viewed_at && (
                  <div className="card-access-timestamp">
                    <Clock size={12} /> Last accessed: {new Date(doc.viewed_at).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="repo-empty-card">
            <Clock size={48} className="empty-icon" />
            <h3>No Access History Yet</h3>
            <p>Documents you open in the document previewer or download will automatically appear here.</p>
          </div>
        )}
      </div>
    );
  }

  // Admin Repository-Wide Access Monitor View
  return (
    <div className="campus-repository-view">
      <div className="repo-header-panel">
        <div className="repo-title-group">
          <h2>Campus-Wide Access & Reader Monitor</h2>
          <p>
            Administrative audit of document access. Inspect which student or faculty member accessed which academic document and when.
          </p>
        </div>
      </div>

      {/* Admin Filters Strip */}
      <div className="repo-controls-strip">
        <div className="repo-search-box">
          <Search size={16} className="search-field-icon" />
          <input
            type="text"
            className="repo-search-input"
            placeholder="Filter by document title, student name, or email..."
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
          />
        </div>

        <div className="repo-tools-group">
          <div className="select-wrapper">
            <select
              className="repo-select-control"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="All">All User Roles</option>
              <option value="Student">Students Only</option>
              <option value="Teacher">Faculty Only</option>
              <option value="Admin">Administrators Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Access Activity Table */}
      {filteredAdminLogs && filteredAdminLogs.length > 0 ? (
        <div className="campus-table-container">
          <table className="campus-data-table">
            <thead>
              <tr>
                <th>Access Time</th>
                <th>Academic Document</th>
                <th>Category</th>
                <th>Reader / Member</th>
                <th>User Role</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdminLogs.map((log, idx) => (
                <tr key={log.id || idx}>
                  <td className="text-muted">
                    <div className="time-cell">
                      <Clock size={13} className="text-muted" />
                      <span>{new Date(log.viewed_at).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="font-medium">
                    <span className="table-filename">{log.document_title || "Document"}</span>
                  </td>
                  <td>
                    <span className="table-category-badge">{log.category || "Documents"}</span>
                  </td>
                  <td>
                    <div className="uploader-cell">
                      <span className="uploader-fullname">{log.user_name || "Campus Member"}</span>
                      <span className="uploader-role-sub">{log.user_email}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`role-pill role-${(log.user_role || "Student").toLowerCase()}`}>
                      {log.user_role === "Admin" ? (
                        <><Shield size={11} /> Admin</>
                      ) : log.user_role === "Teacher" ? (
                        <><BookOpen size={11} /> Faculty</>
                      ) : (
                        <><GraduationCap size={11} /> Student</>
                      )}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="table-action-icon-btn"
                      onClick={() => onPreview({ id: log.document_id, original_filename: log.document_title, category: log.category })}
                      title="Inspect Document"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="repo-empty-card">
          <Clock size={48} className="empty-icon" />
          <h3>No Access Activity Found</h3>
          <p>No document reading activity matches your current filter criteria.</p>
        </div>
      )}
    </div>
  );
}
