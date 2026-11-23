import React, { useState, useMemo } from "react";
import {
  Users,
  Search,
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Lock,
  X,
  FileText
} from "lucide-react";
import { API_BASE } from "../config";

export default function UserManagementView({
  users = [],
  onRefresh,
  onShowToast
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "Student",
    status: "Active"
  });

  const [editModal, setEditModal] = useState({
    isOpen: false,
    user: null,
    full_name: "",
    role: "Student",
    status: "Active",
    password: ""
  });

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    user: null
  });

  const API_URL = API_BASE;

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm.trim() ||
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q);
      const matchesRole = roleFilter === "All" || u.role === roleFilter;
      const matchesStatus = statusFilter === "All" || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Create new user
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to enroll member.");

      onShowToast(data.message || "Member enrolled successfully!", "success");
      setShowAddModal(false);
      setNewMember({ full_name: "", email: "", password: "", role: "Student", status: "Active" });
      onRefresh();
    } catch (err) {
      onShowToast(err.message, "error");
    }
  };

  // Edit user
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editModal.user) return;
    try {
      const payload = {
        full_name: editModal.full_name,
        role: editModal.role,
        status: editModal.status
      };
      if (editModal.password.trim()) {
        payload.password = editModal.password.trim();
      }

      const res = await fetch(`${API_URL}/admin/users/${editModal.user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update member.");

      onShowToast(data.message || "Member details updated.", "success");
      setEditModal({ isOpen: false, user: null, full_name: "", role: "Student", status: "Active", password: "" });
      onRefresh();
    } catch (err) {
      onShowToast(err.message, "error");
    }
  };

  // Delete user
  const handleConfirmDelete = async () => {
    if (!deleteModal.user) return;
    try {
      const res = await fetch(`${API_URL}/admin/users/${deleteModal.user.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to delete user account.");

      onShowToast(data.message || "Member account removed.", "success");
      setDeleteModal({ isOpen: false, user: null });
      onRefresh();
    } catch (err) {
      onShowToast(err.message, "error");
    }
  };

  return (
    <div className="campus-repository-view">
      {/* Header */}
      <div className="repo-header-panel">
        <div className="repo-title-group">
          <h2>Student & Faculty Directory</h2>
          <p>
            Institutional access governance. Enroll, manage roles, adjust account statuses, and inspect document counts.
          </p>
        </div>

        <button
          type="button"
          className="repo-primary-cta"
          onClick={() => setShowAddModal(true)}
        >
          <UserPlus size={16} /> Enroll New Member
        </button>
      </div>

      {/* Filter strip */}
      <div className="repo-controls-strip">
        <div className="repo-search-box">
          <Search size={16} className="search-field-icon" />
          <input
            type="text"
            className="repo-search-input"
            placeholder="Search students or faculty by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="repo-tools-group">
          <div className="select-wrapper">
            <select
              className="repo-select-control"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="All">All Roles</option>
              <option value="Student">Students Only</option>
              <option value="Teacher">Faculty Only</option>
              <option value="Admin">Administrators Only</option>
            </select>
          </div>

          <div className="select-wrapper">
            <select
              className="repo-select-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Accounts</option>
              <option value="Suspended">Suspended</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="campus-table-container">
        <table className="campus-data-table">
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Email Address</th>
              <th>Institutional Role</th>
              <th>Status</th>
              <th>Vault Documents</th>
              <th>Enrollment Date</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => {
              const isRootAdmin = u.email === "admin@smartrepo.edu";

              return (
                <tr key={u.id}>
                  <td className="font-medium">
                    <div className="user-name-cell">
                      <div className="user-avatar-small">
                        {(u.full_name || "U").charAt(0).toUpperCase()}
                      </div>
                      <span>{u.full_name}</span>
                    </div>
                  </td>
                  <td className="text-muted">{u.email}</td>
                  <td>
                    <span className={`role-pill role-${(u.role || "Student").toLowerCase()}`}>
                      {u.role === "Admin" ? (
                        <><Shield size={11} /> Administrator</>
                      ) : u.role === "Teacher" ? (
                        <><BookOpen size={11} /> Faculty</>
                      ) : (
                        <><GraduationCap size={11} /> Student</>
                      )}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill pill-${(u.status || "Active").toLowerCase()}`}>
                      {u.status || "Active"}
                    </span>
                  </td>
                  <td className="text-center font-medium">
                    <span className="doc-count-badge">{u.documents_count || 0}</span>
                  </td>
                  <td className="text-muted">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="text-right">
                    <div className="table-actions-cluster">
                      <button
                        type="button"
                        className="table-action-icon-btn"
                        onClick={() =>
                          setEditModal({
                            isOpen: true,
                            user: u,
                            full_name: u.full_name || "",
                            role: u.role || "Student",
                            status: u.status || "Active",
                            password: ""
                          })
                        }
                        title="Edit Member Details"
                      >
                        <Edit2 size={14} />
                      </button>

                      {!isRootAdmin && (
                        <button
                          type="button"
                          className="table-action-icon-btn delete"
                          onClick={() => setDeleteModal({ isOpen: true, user: u })}
                          title="Remove Member Account"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="campus-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="campus-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-dialog-header">
              <div className="modal-icon-badge badge-primary">
                <UserPlus size={22} />
              </div>
              <button
                type="button"
                className="modal-dialog-close"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-dialog-body">
              <h3 className="modal-dialog-title">Enroll New Campus Member</h3>
              <p className="modal-dialog-message">
                Create a new institutional student or teacher account in MongoDB Atlas.
              </p>

              <form id="add-member-form" onSubmit={handleAddSubmit} className="modal-form-vertical">
                <div className="form-group-item">
                  <label>Full Name</label>
                  <input
                    type="text"
                    className="campus-text-input"
                    placeholder="e.g. Dr. Rajesh Kumar"
                    value={newMember.full_name}
                    onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group-item">
                  <label>Institutional Email</label>
                  <input
                    type="email"
                    className="campus-text-input"
                    placeholder="e.g. rajesh@smartrepo.edu"
                    value={newMember.email}
                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group-item">
                  <label>Security Password</label>
                  <input
                    type="password"
                    className="campus-text-input"
                    placeholder="Temporary login password"
                    value={newMember.password}
                    onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row-two-col">
                  <div className="form-group-item">
                    <label>Role</label>
                    <select
                      className="campus-select-input"
                      value={newMember.role}
                      onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                    >
                      <option value="Student">Student</option>
                      <option value="Teacher">Faculty / Teacher</option>
                      <option value="Admin">Administrator</option>
                    </select>
                  </div>

                  <div className="form-group-item">
                    <label>Status</label>
                    <select
                      className="campus-select-input"
                      value={newMember.status}
                      onChange={(e) => setNewMember({ ...newMember, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>

            <div className="modal-dialog-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-member-form"
                className="btn-modal-confirm confirm-primary"
              >
                Enroll Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editModal.isOpen && (
        <div className="campus-modal-backdrop" onClick={() => setEditModal({ isOpen: false, user: null, full_name: "", role: "Student", status: "Active", password: "" })}>
          <div className="campus-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-dialog-header">
              <div className="modal-icon-badge badge-primary">
                <Edit2 size={20} />
              </div>
              <button
                type="button"
                className="modal-dialog-close"
                onClick={() => setEditModal({ isOpen: false, user: null, full_name: "", role: "Student", status: "Active", password: "" })}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-dialog-body">
              <h3 className="modal-dialog-title">Modify Member Account</h3>
              <p className="modal-dialog-message">
                Updating profile for <strong>{editModal.user?.email}</strong>
              </p>

              <form id="edit-member-form" onSubmit={handleEditSubmit} className="modal-form-vertical">
                <div className="form-group-item">
                  <label>Full Name</label>
                  <input
                    type="text"
                    className="campus-text-input"
                    value={editModal.full_name}
                    onChange={(e) => setEditModal({ ...editModal, full_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row-two-col">
                  <div className="form-group-item">
                    <label>Role</label>
                    <select
                      className="campus-select-input"
                      value={editModal.role}
                      disabled={editModal.user?.email === "admin@smartrepo.edu"}
                      onChange={(e) => setEditModal({ ...editModal, role: e.target.value })}
                    >
                      <option value="Student">Student</option>
                      <option value="Teacher">Faculty / Teacher</option>
                      <option value="Admin">Administrator</option>
                    </select>
                  </div>

                  <div className="form-group-item">
                    <label>Account Status</label>
                    <select
                      className="campus-select-input"
                      value={editModal.status}
                      disabled={editModal.user?.email === "admin@smartrepo.edu"}
                      onChange={(e) => setEditModal({ ...editModal, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div className="form-group-item">
                  <label>Reset Password (Optional)</label>
                  <input
                    type="password"
                    className="campus-text-input"
                    placeholder="Leave blank to preserve current password"
                    value={editModal.password}
                    onChange={(e) => setEditModal({ ...editModal, password: e.target.value })}
                  />
                </div>
              </form>
            </div>

            <div className="modal-dialog-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setEditModal({ isOpen: false, user: null, full_name: "", role: "Student", status: "Active", password: "" })}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-member-form"
                className="btn-modal-confirm confirm-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteModal.isOpen && (
        <div className="campus-modal-backdrop" onClick={() => setDeleteModal({ isOpen: false, user: null })}>
          <div className="campus-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-dialog-header">
              <div className="modal-icon-badge badge-danger">
                <Trash2 size={22} />
              </div>
              <button
                type="button"
                className="modal-dialog-close"
                onClick={() => setDeleteModal({ isOpen: false, user: null })}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-dialog-body">
              <h3 className="modal-dialog-title">Remove Member Account</h3>
              <p className="modal-dialog-message">
                Are you sure you want to permanently delete <strong>"{deleteModal.user?.full_name}"</strong> ({deleteModal.user?.email})? This will revoke their portal access immediately.
              </p>
            </div>

            <div className="modal-dialog-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setDeleteModal({ isOpen: false, user: null })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-modal-confirm confirm-danger"
                onClick={handleConfirmDelete}
              >
                Remove Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
