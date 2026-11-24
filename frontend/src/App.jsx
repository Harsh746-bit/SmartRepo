import React, { useState, useEffect, useCallback } from "react";
import "./App.css";

// Layout Components
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

// Shared Modals
import DocumentViewerModal from "./components/DocumentViewerModal";
import RejectionModal from "./components/RejectionModal";
import ConfirmModal from "./components/ConfirmModal";

// Views / Pages
import AuthView from "./pages/AuthView";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import RepositoryView from "./pages/RepositoryView";
import UploadView from "./pages/UploadView";
import RecentlyViewedView from "./pages/RecentlyViewedView";
import DuplicateFilesView from "./pages/DuplicateFilesView";
import UserManagementView from "./pages/UserManagementView";
import CategoryManagementView from "./pages/CategoryManagementView";
import AnalyticsView from "./pages/AnalyticsView";
import ActivityLogsView from "./pages/ActivityLogsView";
import StorageManagementView from "./pages/StorageManagementView";
import NotificationsView from "./pages/NotificationsView";
import ProfileView from "./pages/ProfileView";
import { API_BASE } from "./config";

export default function App() {
  // Authentication & Persistent User Session
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("smartrepo_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [page, setPage] = useState(() => {
    return localStorage.getItem("smartrepo_user") ? "portal" : "login";
  });

  // Active Tab state
  const [currentTab, setCurrentTab] = useState(() => {
    try {
      const savedUser = localStorage.getItem("smartrepo_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        return parsed.role === "Admin" ? "admin_dashboard" : "dashboard";
      }
    } catch {}
    return "dashboard";
  });

  // Global search input state
  const [globalSearch, setGlobalSearch] = useState("");
  const [uploadInitialSubjectId, setUploadInitialSubjectId] = useState(null);

  const handleNavigateWithParams = useCallback((tab, params = {}) => {
    if (params?.subject_id) {
      setUploadInitialSubjectId(params.subject_id);
    } else {
      setUploadInitialSubjectId(null);
    }
    setCurrentTab(tab);
  }, []);

  // Responsive UI states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Primary Data Collections
  const [browseDocs, setBrowseDocs] = useState([]);
  const [myDocs, setMyDocs] = useState([]);
  const [allDocs, setAllDocs] = useState([]);
  const [favoriteDocs, setFavoriteDocs] = useState([]);
  const [recentDocs, setRecentDocs] = useState([]);
  const [frequentDocs, setFrequentDocs] = useState([]);
  const [recycleDocs, setRecycleDocs] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [adminAccessLogs, setAdminAccessLogs] = useState([]);
  const [analytics, setAnalytics] = useState({});

  // Modals state
  const [previewDoc, setPreviewDoc] = useState(null);
  const [rejectionModalDoc, setRejectionModalDoc] = useState(null);
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    variant: "danger",
    action: null
  });

  // Fetch all data for current user role
  const refreshData = useCallback(async (activeUser = user) => {
    if (!activeUser) return;

    const email = activeUser.email || "";
    const role = activeUser.role || "Student";
    const isAdmin = role === "Admin";

    try {
      if (isAdmin) {
        // Fetch Admin datasets in parallel
        const [
          allDocsRes,
          pendingRes,
          usersRes,
          analyticsRes,
          activityRes,
          accessRes,
          favRes,
          recycleRes
        ] = await Promise.all([
          fetch(`${API_BASE}/documents?scope=all&user_role=Admin`),
          fetch(`${API_BASE}/documents?scope=pending&user_role=Admin`),
          fetch(`${API_BASE}/admin/users`),
          fetch(`${API_BASE}/admin/analytics`),
          fetch(`${API_BASE}/admin/activity`),
          fetch(`${API_BASE}/admin/access-activity`),
          fetch(`${API_BASE}/documents/favorites?user_email=${encodeURIComponent(email)}`),
          fetch(`${API_BASE}/documents/recycle-bin?user_email=${encodeURIComponent(email)}&user_role=Admin`)
        ]);

        if (allDocsRes.ok) setAllDocs(await allDocsRes.json());
        if (usersRes.ok) setAdminUsers(await usersRes.json());
        if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
        if (activityRes.ok) setActivityLogs(await activityRes.json());
        if (accessRes.ok) setAdminAccessLogs(await accessRes.json());
        if (favRes.ok) setFavoriteDocs(await favRes.json());
        if (recycleRes.ok) setRecycleDocs(await recycleRes.json());
      } else {
        // Fetch Student & Teacher datasets in parallel
        const [
          browseRes,
          myRes,
          favRes,
          recentRes,
          frequentRes,
          recycleRes
        ] = await Promise.all([
          fetch(`${API_BASE}/documents?scope=browse&user_email=${encodeURIComponent(email)}&user_role=${role}`),
          fetch(`${API_BASE}/documents?scope=my&user_email=${encodeURIComponent(email)}&user_role=${role}`),
          fetch(`${API_BASE}/documents/favorites?user_email=${encodeURIComponent(email)}`),
          fetch(`${API_BASE}/documents/recent?user_email=${encodeURIComponent(email)}`),
          fetch(`${API_BASE}/documents/frequently-used?user_email=${encodeURIComponent(email)}`),
          fetch(`${API_BASE}/documents/recycle-bin?user_email=${encodeURIComponent(email)}&user_role=${role}`)
        ]);

        if (browseRes.ok) setBrowseDocs(await browseRes.json());
        if (myRes.ok) setMyDocs(await myRes.json());
        if (favRes.ok) setFavoriteDocs(await favRes.json());
        if (recentRes.ok) setRecentDocs(await recentRes.json());
        if (frequentRes.ok) setFrequentDocs(await frequentRes.json());
        if (recycleRes.ok) setRecycleDocs(await recycleRes.json());
      }
    } catch (err) {
      console.error("Error refreshing repository data:", err);
    }
  }, [user]);

  // Initial data load when logged in
  useEffect(() => {
    if (page === "portal" && user) {
      refreshData(user);
    }
  }, [page, user, refreshData]);

  // Login handler
  const handleLoginSuccess = (userPayload, token) => {
    setUser(userPayload);
    setPage("portal");
    setCurrentTab(userPayload.role === "Admin" ? "admin_dashboard" : "dashboard");
    showToast(`Welcome back, ${userPayload.name}!`, "success");
    refreshData(userPayload);
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("smartrepo_user");
    localStorage.removeItem("smartrepo_token");
    setUser(null);
    setPage("login");
    showToast("Signed out successfully.", "info");
  };

  // Document Preview handler - Instant modal opening with background enrichment
  const handlePreview = (doc) => {
    if (!doc) return;
    // 1. Immediately open modal with existing doc metadata (0ms latency)
    setPreviewDoc(doc);

    // 2. Fetch detailed extracted text in background
    fetch(`${API_BASE}/documents/${doc.id}/info?user_email=${encodeURIComponent(user?.email || "")}&user_role=${encodeURIComponent(user?.role || "")}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((fullDoc) => {
        if (fullDoc) {
          setPreviewDoc((prev) => (prev && prev.id === doc.id ? { ...prev, ...fullDoc } : prev));
        }
      })
      .catch(() => {});

    // 3. Refresh recently viewed in background (fire-and-forget)
    if (user?.role !== "Admin") {
      fetch(`${API_BASE}/documents/recent?user_email=${encodeURIComponent(user?.email || "")}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setRecentDocs(data);
        })
        .catch(() => {});
    }
  };

  // Document Download handler
  const handleDownload = async (doc) => {
    if (!doc) return;
    try {
      const downloadUrl = `${API_BASE}/documents/${doc.id}/download?user_email=${encodeURIComponent(user?.email || "")}&user_name=${encodeURIComponent(user?.name || "")}&user_role=${encodeURIComponent(user?.role || "")}`;
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", doc.original_filename || "document");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Downloading "${doc.original_filename}"...`, "success");

      // Update counters
      setTimeout(() => refreshData(), 1200);
    } catch {
      showToast("Download failed. Please check network connection.", "error");
    }
  };

  // Toggle Favorite / Bookmark handler (Optimistic Instant Response)
  const handleToggleFavorite = async (docId) => {
    if (!user) return;
    const updateFav = (list) =>
      list.map((d) => (d.id === docId ? { ...d, is_favorite: !d.is_favorite } : d));

    setBrowseDocs(updateFav);
    setMyDocs(updateFav);
    setAllDocs(updateFav);
    setRecentDocs(updateFav);
    setFrequentDocs(updateFav);

    if (previewDoc && previewDoc.id === docId) {
      setPreviewDoc((prev) => ({ ...prev, is_favorite: !prev.is_favorite }));
    }

    try {
      const res = await fetch(`${API_BASE}/documents/${docId}/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_email: user.email })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
      }
    } catch {
      showToast("Failed to update favorite status.", "error");
      refreshData();
    }
  };

  // Soft Delete handler (Optimistic Instant Removal)
  const handleDeleteDocument = (doc) => {
    setConfirmModalState({
      isOpen: true,
      title: "Move to Recycle Bin?",
      message: `Are you sure you want to delete "${doc.original_filename}"? It will be moved to the Recycle Bin and can be restored later.`,
      confirmText: "Move to Recycle Bin",
      variant: "danger",
      action: async () => {
        const removeDoc = (list) => list.filter((d) => d.id !== doc.id);
        setBrowseDocs(removeDoc);
        setMyDocs(removeDoc);
        setAllDocs(removeDoc);
        setRecentDocs(removeDoc);
        setFrequentDocs(removeDoc);
        setRecycleDocs((prev) => [{ ...doc, is_deleted: true }, ...prev]);
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        showToast(data => "Document moved to Recycle Bin.", "success");

        try {
          const res = await fetch(
            `${API_BASE}/documents/${doc.id}?user_email=${encodeURIComponent(user?.email || "")}&user_name=${encodeURIComponent(user?.name || "")}&user_role=${encodeURIComponent(user?.role || "")}`,
            { method: "DELETE" }
          );
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.detail || "Delete operation failed.");
          }
        } catch (err) {
          showToast(err.message, "error");
          refreshData();
        }
      }
    });
  };

  // Restore document from Recycle Bin (Optimistic)
  const handleRestoreDocument = async (doc) => {
    setRecycleDocs((prev) => prev.filter((d) => d.id !== doc.id));
    setMyDocs((prev) => [{ ...doc, is_deleted: false }, ...prev]);
    showToast(`"${doc.original_filename}" restored successfully!`, "success");

    try {
      const res = await fetch(
        `${API_BASE}/documents/${doc.id}/restore?user_email=${encodeURIComponent(user?.email || "")}&user_name=${encodeURIComponent(user?.name || "")}&user_role=${encodeURIComponent(user?.role || "")}`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to restore document.");
      }
    } catch (err) {
      showToast(err.message, "error");
      refreshData();
    }
  };

  // Permanently purge document from storage and database
  const handlePermanentDeleteDocument = (doc) => {
    setConfirmModalState({
      isOpen: true,
      title: "Permanently Delete Document?",
      message: `Are you sure you want to permanently purge "${doc.original_filename}"? This action CANNOT be undone and will permanently erase the file from physical storage and the database.`,
      confirmText: "Permanently Purge",
      variant: "danger",
      action: async () => {
        setRecycleDocs((prev) => prev.filter((d) => d.id !== doc.id));
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        showToast("Document permanently purged from vault.", "success");

        try {
          const res = await fetch(
            `${API_BASE}/documents/${doc.id}/permanent?user_email=${encodeURIComponent(user?.email || "")}&user_name=${encodeURIComponent(user?.name || "")}&user_role=${encodeURIComponent(user?.role || "")}`,
            { method: "DELETE" }
          );
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.detail || "Permanent delete failed.");
          }
        } catch (err) {
          showToast(err.message, "error");
          refreshData();
        }
      }
    });
  };

  // Approve Document (Optimistic)
  const handleApproveDocument = async (doc) => {
    const markApproved = (list) =>
      list.map((d) => (d.id === doc.id ? { ...d, approval_status: "Approved" } : d));
    setAllDocs(markApproved);
    setBrowseDocs(markApproved);
    setMyDocs(markApproved);
    showToast(`"${doc.original_filename}" approved & published!`, "success");

    try {
      const res = await fetch(`${API_BASE}/admin/documents/${doc.id}/approval`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Approved",
          admin_email: user?.email,
          admin_name: user?.name
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Approval failed.");
      }
    } catch (err) {
      showToast(err.message, "error");
      refreshData();
    }
  };

  // Confirm Rejection with Reason (Optimistic)
  const handleConfirmReject = async (docId, reason) => {
    const markRejected = (list) =>
      list.map((d) => (d.id === docId ? { ...d, approval_status: "Rejected", rejection_reason: reason } : d));
    setAllDocs(markRejected);
    setMyDocs(markRejected);
    setRejectionModalDoc(null);
    showToast("Document rejected. Feedback sent to student/faculty.", "info");

    try {
      const res = await fetch(`${API_BASE}/admin/documents/${docId}/approval`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Rejected",
          reason: reason,
          admin_email: user?.email,
          admin_name: user?.name
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Rejection failed.");
      }
    } catch (err) {
      showToast(err.message, "error");
      refreshData();
    }
  };

  // Calculate pending review count for badge
  const pendingCount = user?.role === "Admin"
    ? allDocs.filter((d) => d.approval_status === "Pending").length
    : 0;

  // Render Authentication View if not logged in
  if (page === "login" || !user) {
    return <AuthView onLoginSuccess={handleLoginSuccess} />;
  }

  // Compute student/teacher personalized stats
  const studentStats = {
    my_total_count: myDocs.length,
    my_approved_count: myDocs.filter((d) => d.approval_status === "Approved").length,
    my_pending_count: myDocs.filter((d) => d.approval_status === "Pending").length,
    my_rejected_count: myDocs.filter((d) => d.approval_status === "Rejected").length,
    my_total_downloads: myDocs.reduce((acc, d) => acc + (d.download_count || 0), 0)
  };

  // Main View Router based on currentTab
  const renderCurrentView = () => {
    switch (currentTab) {
      // 1. DASHBOARDS
      case "dashboard":
        return user.role === "Teacher" ? (
          <TeacherDashboard
            user={user}
            stats={studentStats}
            recentDocs={myDocs}
            favoriteDocs={favoriteDocs}
            frequentDocs={frequentDocs}
            onNavigate={handleNavigateWithParams}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeleteDocument}
          />
        ) : (
          <StudentDashboard
            user={user}
            stats={studentStats}
            recentDocs={myDocs}
            favoriteDocs={favoriteDocs}
            frequentDocs={frequentDocs}
            onNavigate={handleNavigateWithParams}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeleteDocument}
          />
        );

      case "admin_dashboard":
        return (
          <AdminDashboard
            analytics={{
              ...analytics,
              total_documents: allDocs.length,
              pending_approvals: pendingCount,
              approved_documents: allDocs.filter((d) => d.approval_status === "Approved").length,
              rejected_documents: allDocs.filter((d) => d.approval_status === "Rejected").length,
              total_students: adminUsers.filter((u) => u.role === "Student").length,
              total_teachers: adminUsers.filter((u) => u.role === "Teacher").length
            }}
            recentUploads={allDocs.filter((d) => d.approval_status === "Pending")}
            activityLogs={activityLogs}
            onNavigate={handleNavigateWithParams}
            onPreview={handlePreview}
            onApprove={handleApproveDocument}
            onReject={(doc) => setRejectionModalDoc(doc)}
          />
        );

      // 2. REPOSITORY VIEWS (ROLE-RESTRICTED)
      case "browse":
        return (
          <RepositoryView
            title="Browse Campus Repository"
            subtitle="Verified academic materials and syllabi accessible across campus"
            documents={browseDocs}
            currentUser={user}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeleteDocument}
            onUploadClick={() => setCurrentTab("upload")}
            forcedStatusFilter="Approved"
          />
        );

      case "my_documents":
        return (
          <RepositoryView
            title="My Uploaded Documents"
            subtitle="Academic submissions, lecture slides, and notes uploaded by you"
            documents={myDocs}
            currentUser={user}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeleteDocument}
            onUploadClick={() => setCurrentTab("upload")}
          />
        );

      case "favorites":
        return (
          <RepositoryView
            title="My Bookmarked Resources"
            subtitle="Starred documents for instant study access"
            documents={favoriteDocs}
            currentUser={user}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeleteDocument}
          />
        );

      case "recent":
        return (
          <RecentlyViewedView
            currentUser={user}
            userRecentDocs={recentDocs}
            adminAccessLogs={adminAccessLogs}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeleteDocument}
          />
        );

      case "upload":
        return (
          <UploadView
            currentUser={user}
            initialSubjectId={uploadInitialSubjectId}
            onUploadSuccess={(msg) => {
              showToast(msg, "success");
              refreshData();
              setCurrentTab("my_documents");
            }}
            onUploadError={(errMsg) => {
              showToast(errMsg, "error");
            }}
            onCancel={() => setCurrentTab(user.role === "Admin" ? "admin_dashboard" : "dashboard")}
            onNavigate={handleNavigateWithParams}
          />
        );

      case "notifications":
        return (
          <NotificationsView
            currentUser={user}
            myDocuments={myDocs}
            onNavigate={setCurrentTab}
            onPreview={handlePreview}
          />
        );

      // 3. ADMIN-EXCLUSIVE VIEWS
      case "all_documents":
        return (
          <RepositoryView
            title="All Campus Documents"
            subtitle="Master inventory of all collegiate files across all statuses"
            documents={allDocs}
            currentUser={user}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeleteDocument}
            onApprove={handleApproveDocument}
            onReject={(doc) => setRejectionModalDoc(doc)}
          />
        );

      case "pending_approvals":
        return (
          <RepositoryView
            title="Pending Approvals Queue"
            subtitle="Student submissions awaiting administrator or faculty moderation"
            documents={allDocs.filter((d) => d.approval_status === "Pending")}
            currentUser={user}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeleteDocument}
            onApprove={handleApproveDocument}
            onReject={(doc) => setRejectionModalDoc(doc)}
            forcedStatusFilter="Pending"
          />
        );

      case "approved_documents":
        return (
          <RepositoryView
            title="Approved Campus Resources"
            subtitle="Verified publications accessible to faculty and students"
            documents={allDocs.filter((d) => d.approval_status === "Approved")}
            currentUser={user}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeleteDocument}
            forcedStatusFilter="Approved"
          />
        );

      case "rejected_documents":
        return (
          <RepositoryView
            title="Rejected Submissions"
            subtitle="Documents returned to uploaders with revision feedback"
            documents={allDocs.filter((d) => d.approval_status === "Rejected")}
            currentUser={user}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeleteDocument}
            forcedStatusFilter="Rejected"
          />
        );

      case "duplicate_files":
        return <DuplicateFilesView />;

      case "user_management":
        return (
          <UserManagementView
            users={adminUsers}
            onRefresh={refreshData}
            onShowToast={showToast}
          />
        );

      case "category_management":
        return (
          <CategoryManagementView
            documents={allDocs}
            onSelectCategory={(catName) => {
              setCurrentTab("all_documents");
            }}
          />
        );

      case "analytics":
        return <AnalyticsView analytics={analytics} />;

      case "activity_logs":
        return <ActivityLogsView activityLogs={activityLogs} />;

      case "storage_management":
        return <StorageManagementView />;

      case "recycle_bin":
        return (
          <RepositoryView
            title="Recycle Bin"
            subtitle={
              user.role === "Admin"
                ? "Institution-wide deleted files awaiting restoration or permanent purge"
                : "Your deleted files. Restore them to active repository or permanently purge them."
            }
            documents={recycleDocs}
            currentUser={user}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onRestore={handleRestoreDocument}
            onPermanentDelete={handlePermanentDeleteDocument}
            isRecycleBin={true}
          />
        );

      case "profile":
        return (
          <ProfileView
            currentUser={user}
            stats={studentStats}
            onLogout={handleLogout}
          />
        );

      default:
        return (
          <StudentDashboard
            user={user}
            stats={studentStats}
            recentDocs={recentDocs}
            favoriteDocs={favoriteDocs}
            frequentDocs={frequentDocs}
            onNavigate={setCurrentTab}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeleteDocument}
          />
        );
    }
  };

  return (
    <div className="campus-app-shell">
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`campus-floating-toast toast-${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Role-Specific Left Sidebar */}
      <Sidebar
        user={user}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        pendingCount={pendingCount}
        unreadNotifications={myDocs.filter((d) => d.approval_status === "Rejected").length}
        recycleCount={recycleDocs.length}
      />

      {/* Main Content Workspace */}
      <div className={`campus-main-viewport ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        {/* Top Navbar */}
        <Navbar
          user={user}
          currentTab={currentTab}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onNavigate={setCurrentTab}
          onQuickSearch={(query) => {
            if (query.trim()) {
              setCurrentTab(user.role === "Admin" ? "all_documents" : "browse");
            }
          }}
          searchValue={globalSearch}
          setSearchValue={setGlobalSearch}
          pendingCount={pendingCount}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Dynamic Page Content */}
        <main className="campus-main-content">
          {renderCurrentView()}
        </main>
      </div>

      {/* Large Responsive Document Preview Modal */}
      <DocumentViewerModal
        isOpen={Boolean(previewDoc)}
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onToggleFavorite={handleToggleFavorite}
        onDownload={handleDownload}
        apiBaseUrl={API_BASE}
      />

      {/* Admin Rejection Feedback Modal */}
      <RejectionModal
        isOpen={Boolean(rejectionModalDoc)}
        doc={rejectionModalDoc}
        onConfirmReject={handleConfirmReject}
        onCancel={() => setRejectionModalDoc(null)}
      />

      {/* Confirmation Dialog Modal */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText={confirmModalState.confirmText}
        variant={confirmModalState.variant}
        onConfirm={confirmModalState.action}
        onCancel={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
