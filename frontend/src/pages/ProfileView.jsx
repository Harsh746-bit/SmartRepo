import React from "react";
import {
  User,
  Mail,
  Shield,
  BookOpen,
  GraduationCap,
  Calendar,
  Lock,
  LogOut,
  CheckCircle2,
  HardDrive
} from "lucide-react";

export default function ProfileView({
  currentUser,
  stats,
  onLogout
}) {
  const role = currentUser?.role || "Student";
  const name = currentUser?.name || "Campus Member";
  const email = currentUser?.email || "user@smartrepo.edu";

  return (
    <div className="campus-repository-view">
      <div className="repo-header-panel">
        <div className="repo-title-group">
          <h2>My Institutional Profile</h2>
          <p>
            Account credentials, security details, and repository participation metrics.
          </p>
        </div>
      </div>

      <div className="profile-layout-grid">
        {/* Profile Card */}
        <div className="profile-main-card">
          <div className="profile-avatar-banner">
            <div className="profile-large-avatar">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="profile-banner-info">
              <h3>{name}</h3>
              <span className="profile-email-tag">{email}</span>
              <span className={`role-pill role-${role.toLowerCase()}`}>
                {role === "Admin" ? (
                  <><Shield size={12} /> Institutional Administrator</>
                ) : role === "Teacher" ? (
                  <><BookOpen size={12} /> Faculty Member</>
                ) : (
                  <><GraduationCap size={12} /> Enrolled Student</>
                )}
              </span>
            </div>
          </div>

          <div className="profile-details-grid">
            <div className="profile-info-row">
              <span className="info-label">Full Name</span>
              <span className="info-value">{name}</span>
            </div>
            <div className="profile-info-row">
              <span className="info-label">Email Address</span>
              <span className="info-value">{email}</span>
            </div>
            <div className="profile-info-row">
              <span className="info-label">Institutional Role</span>
              <span className="info-value">{role}</span>
            </div>
            <div className="profile-info-row">
              <span className="info-label">Account Status</span>
              <span className="info-value status-active">Active</span>
            </div>
            <div className="profile-info-row">
              <span className="info-label">Database Provider</span>
              <span className="info-value">MongoDB Atlas Cloud</span>
            </div>
          </div>

          <div className="profile-actions-strip">
            <button
              type="button"
              className="profile-logout-btn"
              onClick={onLogout}
            >
              <LogOut size={16} /> Sign Out of CampusConnect
            </button>
          </div>
        </div>

        {/* Security & Cryptographic Details Card */}
        <div className="profile-side-card">
          <div className="card-header-simple">
            <Lock size={18} className="header-icon blue" />
            <h4>Security & Encryption Architecture</h4>
          </div>

          <div className="security-features-list">
            <div className="sec-feature-item">
              <CheckCircle2 size={16} className="feature-check" />
              <div>
                <strong>PBKDF2 Password Hashing</strong>
                <p>600,000 iterations of SHA-256 with 16-byte random salt.</p>
              </div>
            </div>

            <div className="sec-feature-item">
              <CheckCircle2 size={16} className="feature-check" />
              <div>
                <strong>SHA-256 Cryptographic Deduplication</strong>
                <p>Every file is checksummed at the API gateway to prevent redundant storage.</p>
              </div>
            </div>

            <div className="sec-feature-item">
              <CheckCircle2 size={16} className="feature-check" />
              <div>
                <strong>HS256 Bearer JWT Authentication</strong>
                <p>Encrypted session tokens with 7-day expiration lifespans.</p>
              </div>
            </div>

            <div className="sec-feature-item">
              <CheckCircle2 size={16} className="feature-check" />
              <div>
                <strong>Role-Based Access Control (RBAC)</strong>
                <p>Strict access boundaries enforced at both API routes and database queries.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
