import React from "react";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Shield,
  ArrowRight
} from "lucide-react";

export default function NotificationsView({
  currentUser,
  myDocuments = [],
  onNavigate,
  onPreview
}) {
  const role = currentUser?.role || "Student";

  // Build notifications from user's documents
  const notifications = [];

  // Rejection notifications
  myDocuments
    .filter((d) => d.approval_status === "Rejected")
    .forEach((doc) => {
      notifications.push({
        id: `rej-${doc.id}`,
        type: "rejected",
        title: `Revision Guidance: "${doc.original_filename}"`,
        message: doc.rejection_reason || "Document was rejected. Please review faculty/admin feedback and re-upload.",
        timestamp: doc.uploaded_at,
        doc: doc,
        icon: XCircle,
        color: "rose"
      });
    });

  // Approved notifications
  myDocuments
    .filter((d) => d.approval_status === "Approved")
    .forEach((doc) => {
      notifications.push({
        id: `app-${doc.id}`,
        type: "approved",
        title: `Document Published: "${doc.original_filename}"`,
        message: "Your submission has been verified and published to the campus repository.",
        timestamp: doc.uploaded_at,
        doc: doc,
        icon: CheckCircle2,
        color: "emerald"
      });
    });

  // Pending notifications
  myDocuments
    .filter((d) => d.approval_status === "Pending")
    .forEach((doc) => {
      notifications.push({
        id: `pen-${doc.id}`,
        type: "pending",
        title: `Under Review: "${doc.original_filename}"`,
        message: "Your upload has been safely queued and is awaiting moderation.",
        timestamp: doc.uploaded_at,
        doc: doc,
        icon: Clock,
        color: "amber"
      });
    });

  return (
    <div className="campus-repository-view">
      <div className="repo-header-panel">
        <div className="repo-title-group">
          <h2>Institutional Notifications</h2>
          <p>
            Real-time status updates on your course material submissions and moderation feedback.
          </p>
        </div>
      </div>

      {notifications.length > 0 ? (
        <div className="notifications-list-container">
          {notifications.map((notif) => {
            const Icon = notif.icon;

            return (
              <div key={notif.id} className={`notification-card notif-${notif.color}`}>
                <div className={`notif-icon-box icon-bg-${notif.color}`}>
                  <Icon size={20} />
                </div>

                <div className="notif-content-column">
                  <div className="notif-header-row">
                    <h4 className="notif-title">{notif.title}</h4>
                    <span className="notif-time">
                      {new Date(notif.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="notif-message-text">{notif.message}</p>

                  <div className="notif-actions-row">
                    <button
                      type="button"
                      className="notif-link-btn"
                      onClick={() => onPreview(notif.doc)}
                    >
                      Inspect Document <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="repo-empty-card">
          <Bell size={48} className="empty-icon" />
          <h3>No Active Notifications</h3>
          <p>Notifications about document approvals and feedback will appear here.</p>
        </div>
      )}
    </div>
  );
}
