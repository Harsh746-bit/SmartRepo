import React from "react";
import {
  Menu,
  Search,
  UploadCloud,
  Bell,
  Shield,
  BookOpen,
  GraduationCap
} from "lucide-react";

export default function Navbar({
  user,
  currentTab,
  onOpenMobileSidebar,
  onNavigate,
  onQuickSearch,
  searchValue,
  setSearchValue,
  pendingCount = 0
}) {
  const role = user?.role || "Student";

  // Title mappings based on active tab
  const getTabMeta = () => {
    switch (currentTab) {
      case "dashboard":
      case "admin_dashboard":
        return { title: role === "Admin" ? "Administrative Dashboard" : "Academic Dashboard", subtitle: "Overview & Metrics" };
      case "browse":
        return { title: "Browse Repository", subtitle: "Verified Campus Resources & Syllabi" };
      case "my_documents":
        return { title: "My Uploaded Documents", subtitle: "Personal Course Submissions & Assets" };
      case "favorites":
        return { title: "My Favorites & Bookmarks", subtitle: "Starred Resources for Quick Access" };
      case "recent":
        return { title: "Recently Viewed", subtitle: role === "Admin" ? "Campus Access Monitor" : "Recently Accessed Materials" };
      case "upload":
        return { title: "Upload Course Material", subtitle: "Submit Syllabus, Slides, or Notes" };
      case "notifications":
        return { title: "Institutional Notifications", subtitle: "System Updates & Approval Alerts" };
      case "all_documents":
        return { title: "All Campus Documents", subtitle: "Master Document Repository & Moderation" };
      case "pending_approvals":
        return { title: "Pending Approvals", subtitle: "Submissions Awaiting Administrative Review" };
      case "approved_documents":
        return { title: "Approved Documents", subtitle: "Verified Active Campus Publications" };
      case "rejected_documents":
        return { title: "Rejected Submissions", subtitle: "Documents Requiring Revision" };
      case "duplicate_files":
        return { title: "Duplicate Detection Vault", subtitle: "SHA-256 Checksum Interceptions" };
      case "user_management":
        return { title: "User & Role Directory", subtitle: "Manage Students, Faculty, & Permissions" };
      case "category_management":
        return { title: "Category Management", subtitle: "Academic Document Distribution" };
      case "analytics":
        return { title: "Repository Analytics", subtitle: "Campus Usage Trends & Activity Insights" };
      case "activity_logs":
        return { title: "Activity Audit Trail", subtitle: "Cryptographic Event Log & Security History" };
      case "storage_management":
        return { title: "Storage & Capacity Management", subtitle: "Disk & Database Health Metrics" };
      case "recycle_bin":
        return { title: "Recycle Bin", subtitle: "Restoration & Permanent Deletion Vault" };
      case "profile":
        return { title: "My Account Profile", subtitle: "Institutional Credentials & Security" };
      default:
        return { title: "Campus Repository", subtitle: "Smart Academic Storage" };
    }
  };

  const { title, subtitle } = getTabMeta();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onQuickSearch) {
      onQuickSearch(searchValue);
    }
  };

  return (
    <header className="campus-navbar">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="navbar-left">
        <button
          type="button"
          className="mobile-hamburger-btn"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        <div className="navbar-heading-group">
          <h1 className="navbar-page-title">{title}</h1>
          <span className="navbar-breadcrumb">{subtitle}</span>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="navbar-center">
        <form onSubmit={handleSearchSubmit} className="navbar-search-form">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="navbar-search-input"
            placeholder="Search documents, topics, or faculty..."
            value={searchValue || ""}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          {searchValue && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchValue("")}
            >
              ×
            </button>
          )}
        </form>
      </div>

      {/* Right: Quick Action & Profile Status */}
      <div className="navbar-right">
        {/* Quick Upload CTA (Students and Teachers only) */}
        {role !== "Admin" && (
          <button
            type="button"
            className="navbar-action-btn"
            onClick={() => onNavigate("upload")}
          >
            <UploadCloud size={16} />
            <span className="btn-text">Upload</span>
          </button>
        )}

        {/* Notifications Icon */}
        <button
          type="button"
          className="navbar-icon-btn"
          onClick={() => onNavigate("notifications")}
          title="View Notifications"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {role === "Admin" && pendingCount > 0 ? (
            <span className="navbar-badge-dot amber" />
          ) : null}
        </button>

        {/* User Role Profile Badge */}
        <div
          className="navbar-user-chip"
          onClick={() => onNavigate("profile")}
          role="button"
          tabIndex={0}
          title="View Account Profile"
        >
          <div className="user-chip-avatar">
            {(user?.name || "U").charAt(0).toUpperCase()}
          </div>
          <div className="user-chip-meta">
            <span className="user-chip-name">{user?.name || "Campus Member"}</span>
            <span className="user-chip-role">
              {role === "Admin" ? (
                <><Shield size={11} /> Admin</>
              ) : role === "Teacher" ? (
                <><BookOpen size={11} /> Faculty</>
              ) : (
                <><GraduationCap size={11} /> Student</>
              )}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
