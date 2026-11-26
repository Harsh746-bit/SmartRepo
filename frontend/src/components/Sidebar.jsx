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
  ShieldCheck,
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
        { id: "verification_center", label: "Verification Center", icon: ShieldCheck },
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
      { id: "verification_center", label: "Verification Center", icon: ShieldCheck },
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
        {/* Brand Crest Header */}
        <div className="sidebar-header">
          <div
            className="sidebar-brand-wrapper"
            onClick={() => onSelectTab(role === "Admin" ? "admin_dashboard" : "dashboard")}
            style={{ cursor: "pointer" }}
            title="CampusConnect Academic Repository"
          >
            <div className="sidebar-crest-icon">
              <GraduationCap size={22} />
            </div>
            {!collapsed && (
              <div className="sidebar-brand-text">
                <span className="brand-title">CampusConnect 2.0</span>
                <span className="brand-subtitle">Academic Vault & LMS</span>
              </div>
            )}
          </div>

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

        {/* User Identity Chip */}
        <div className="sidebar-user-chip">
          <div className="sidebar-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          {!collapsed && (
            <div className="sidebar-user-meta">
              <span className="user-name">{user?.name || "Campus Member"}</span>
              <span className={`user-role-badge role-${(user?.role || "Student").toLowerCase()}`}>
                {user?.role || "Student"}
              </span>
            </div>
          )}
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav-container">
          <ul className="sidebar-nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <li key={item.id} className="sidebar-nav-item">
                  <button
                    type="button"
                    className={`sidebar-nav-link ${isActive ? "active" : ""}`}
                    onClick={() => handleItemClick(item.id)}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={18} className="nav-icon" />
                    {!collapsed && <span className="nav-label">{item.label}</span>}
                    {item.badge && !collapsed && (
                      <span className={`nav-badge badge-${item.badgeColor || "blue"}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Footer Actions */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={onLogout}
            title={collapsed ? "Sign Out" : undefined}
          >
            <LogOut size={18} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
