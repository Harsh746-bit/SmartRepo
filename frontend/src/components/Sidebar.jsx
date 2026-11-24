import React from "react";
import {
  LayoutDashboard,
  Compass,
  FileText,
  Bookmark,
  Clock,
  UploadCloud,
  Bell,
  User,
  Files,
  Clock3,
  CheckCircle2,
  XCircle,
  Copy,
  Users,
  FolderTree,
  BarChart3,
  ScrollText,
  HardDrive,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Shield,
  BookOpen,
  Trash2
} from "lucide-react";

export default function Sidebar({
  user,
  currentTab,
  onSelectTab,
  onLogout,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  pendingCount = 0,
  unreadNotifications = 0,
  recycleCount = 0
}) {
  const role = user?.role || "Student";

  // Build role-specific navigation menu
  const getNavItems = () => {
    if (role === "Admin") {
      return [
        { id: "admin_dashboard", label: "Admin Dashboard", icon: LayoutDashboard },
        { id: "all_documents", label: "All Documents", icon: Files },
        { id: "pending_approvals", label: "Pending Approvals", icon: Clock3, badge: pendingCount > 0 ? pendingCount : null, badgeColor: "amber" },
        { id: "approved_documents", label: "Approved Documents", icon: CheckCircle2 },
        { id: "rejected_documents", label: "Rejected Documents", icon: XCircle },
        { id: "duplicate_files", label: "Duplicate Files", icon: Copy },
        { id: "user_management", label: "User Management", icon: Users },
        { id: "category_management", label: "Category Management", icon: FolderTree },
        { id: "analytics", label: "Repository Analytics", icon: BarChart3 },
        { id: "activity_logs", label: "Activity Logs", icon: ScrollText },
        { id: "storage_management", label: "Storage Management", icon: HardDrive },
        { id: "recycle_bin", label: "Recycle Bin", icon: Trash2, badge: recycleCount > 0 ? recycleCount : null, badgeColor: "rose" },
        { id: "profile", label: "My Profile", icon: User }
      ];
    }

    // Student & Teacher Nav Items
    return [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "browse", label: "Browse Repository", icon: Compass },
      { id: "my_documents", label: "My Uploaded Documents", icon: FileText },
      { id: "favorites", label: "My Favorites / Bookmarks", icon: Bookmark },
      { id: "recent", label: "Recently Viewed", icon: Clock },
      { id: "upload", label: "Upload Document", icon: UploadCloud },
      { id: "notifications", label: "My Notifications", icon: Bell, badge: unreadNotifications > 0 ? unreadNotifications : null, badgeColor: "blue" },
      { id: "recycle_bin", label: "Recycle Bin", icon: Trash2, badge: recycleCount > 0 ? recycleCount : null, badgeColor: "rose" },
      { id: "profile", label: "My Profile", icon: User }
    ];
  };

  const navItems = getNavItems();

  const handleItemClick = (id) => {
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`campus-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
      >
        {/* Brand Header */}
        <div className="sidebar-header">
          <div
            className="brand-badge-container"
            onClick={collapsed ? onToggleCollapse : undefined}
            title={collapsed ? "Click to expand sidebar" : "CampusConnect"}
            style={collapsed ? { cursor: "pointer" } : undefined}
          >
            <div className="brand-icon-wrapper">
              {role === "Admin" ? (
                <Shield className="brand-logo-icon" size={24} />
              ) : role === "Teacher" ? (
                <BookOpen className="brand-logo-icon" size={24} />
              ) : (
                <GraduationCap className="brand-logo-icon" size={24} />
              )}
            </div>
            {!collapsed && (
              <div className="brand-text">
                <span className="brand-name">CampusConnect</span>
                <span className="brand-subtitle">Smart Repository</span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Role Tag Ribbon */}
        {!collapsed && (
          <div className="sidebar-role-indicator">
            <span className={`role-pill role-${role.toLowerCase()}`}>
              {role === "Admin" ? "Administrator" : role === "Teacher" ? "Faculty / Teacher" : "Enrolled Student"}
            </span>
          </div>
        )}

        {/* Navigation Section */}
        <nav className="sidebar-nav">
          <ul className="sidebar-menu-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <li key={item.id} className="sidebar-menu-item">
                  <button
                    type="button"
                    className={`sidebar-nav-btn ${isActive ? "active" : ""}`}
                    onClick={() => handleItemClick(item.id)}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="sidebar-btn-icon">
                      <Icon size={19} />
                    </span>

                    {!collapsed && (
                      <span className="sidebar-btn-label">{item.label}</span>
                    )}

                    {item.badge && !collapsed && (
                      <span className={`sidebar-badge badge-${item.badgeColor || "blue"}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom User Profile Section */}
        <div className="sidebar-footer">
          {collapsed && (
            <button
              type="button"
              className="sidebar-expand-bottom-btn"
              onClick={onToggleCollapse}
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={16} />
            </button>
          )}

          <div className="user-profile-widget">
            <div className="user-avatar-circle" title={user?.name || "Campus Member"}>
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>

            {!collapsed && (
              <div className="user-info-text">
                <span className="user-display-name">{user?.name || "Member"}</span>
                <span className="user-display-email" title={user?.email}>
                  {user?.email || "user@smartrepo.edu"}
                </span>
              </div>
            )}

            <button
              type="button"
              className="sidebar-logout-btn"
              onClick={onLogout}
              title="Sign Out of CampusConnect"
              aria-label="Sign Out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
