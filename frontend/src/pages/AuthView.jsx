import React, { useState } from "react";
import {
  GraduationCap,
  BookOpen,
  Shield,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  User as UserIcon,
  AlertCircle
} from "lucide-react";
import { API_BASE } from "../config";

export default function AuthView({ onLoginSuccess }) {
  const [role, setRole] = useState("Student"); // 'Student' | 'Teacher' | 'Admin'
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const API_URL = API_BASE;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const endpoint = isRegister ? `${API_URL}/auth/register` : `${API_URL}/auth/login`;
      const payload = isRegister
        ? {
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            password: password,
            role: role
          }
        : {
            email: email.trim().toLowerCase(),
            password: password
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed. Please verify your credentials.");
      }

      if (isRegister) {
        setSuccessMessage("Account created successfully! Signing you in...");
      }

      // Save token and user object
      const userPayload = {
        name: data.user?.full_name || data.full_name || fullName || "Campus Member",
        email: data.user?.email || data.email || email.toLowerCase(),
        role: data.user?.role || data.role || role
      };

      localStorage.setItem("smartrepo_token", data.access_token);
      localStorage.setItem("smartrepo_user", JSON.stringify(userPayload));

      setTimeout(() => {
        onLoginSuccess(userPayload, data.access_token);
      }, 400);
    } catch (err) {
      setErrorMessage(err.message || "An unexpected connection error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="campus-auth-canvas">
      <div className="campus-auth-container">
        {/* Left Collegiate Brand Banner */}
        <div className="auth-brand-panel">
          <div className="auth-brand-top">
            <div className="auth-crest-row">
              <div className="auth-crest-box">
                <GraduationCap size={28} className="crest-svg" />
              </div>
              <div className="auth-crest-titles">
                <h2 className="crest-brand-name">CampusConnect</h2>
                <span className="crest-brand-sub">Academic Repository System</span>
              </div>
            </div>

            <div className="auth-brand-pitch">
              <h3>Empowering Higher Education With Smart Repositories</h3>
              <p>
                A secure, centralized digital cloud for lecture presentations, research assignments, course syllabi, and academic resources.
              </p>
            </div>
          </div>

          <div className="auth-highlights-list">
            <div className="auth-highlight-item">
              <CheckCircle2 size={18} className="highlight-check" />
              <span>Cryptographic SHA-256 deduplication</span>
            </div>
            <div className="auth-highlight-item">
              <CheckCircle2 size={18} className="highlight-check" />
              <span>Deep full-text search across PDFs and slides</span>
            </div>
            <div className="auth-highlight-item">
              <CheckCircle2 size={18} className="highlight-check" />
              <span>PBKDF2 security with strict role-based access</span>
            </div>
          </div>

          <div className="auth-brand-footer">
            <span>© 2026 CampusConnect Institutional Digital Archive</span>
          </div>
        </div>

        {/* Right Authentication Form Card */}
        <div className="auth-form-panel">
          <div className="auth-form-header">
            <h2>{isRegister ? "Create Campus Account" : "Welcome Back"}</h2>
            <p>
              {isRegister
                ? "Enroll with your collegiate credentials to access course materials"
                : "Sign in with your institutional email and password to proceed"}
            </p>
          </div>

          {/* Role Selection Tabs */}
          <div className="auth-role-tabs">
            <button
              type="button"
              className={`auth-role-tab ${role === "Student" ? "active" : ""}`}
              onClick={() => { setRole("Student"); setErrorMessage(""); }}
            >
              <GraduationCap size={16} />
              <span>Student</span>
            </button>

            <button
              type="button"
              className={`auth-role-tab ${role === "Teacher" ? "active" : ""}`}
              onClick={() => { setRole("Teacher"); setErrorMessage(""); }}
            >
              <BookOpen size={16} />
              <span>Faculty</span>
            </button>

            <button
              type="button"
              className={`auth-role-tab ${role === "Admin" ? "active" : ""}`}
              onClick={() => {
                setRole("Admin");
                setIsRegister(false);
                setErrorMessage("");
              }}
            >
              <Shield size={16} />
              <span>Admin</span>
            </button>
          </div>

          {/* Alerts */}
          {errorMessage && (
            <div className="auth-alert error">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="auth-alert success">
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="campus-auth-form">
            {isRegister && (
              <div className="auth-input-group">
                <label className="auth-label" htmlFor="auth-fullname">Full Name</label>
                <div className="auth-field-wrapper">
                  <UserIcon size={16} className="auth-field-icon" />
                  <input
                    id="auth-fullname"
                    type="text"
                    className="auth-input"
                    placeholder="e.g. Dr. Jane Doe or Alex Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={isRegister}
                  />
                </div>
              </div>
            )}

            <div className="auth-input-group">
              <label className="auth-label" htmlFor="auth-email">Institutional Email</label>
              <div className="auth-field-wrapper">
                <Mail size={16} className="auth-field-icon" />
                <input
                  id="auth-email"
                  type="email"
                  className="auth-input"
                  placeholder={role === "Admin" ? "admin@smartrepo.edu" : "name@college.edu"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label className="auth-label" htmlFor="auth-password">Password</label>
              <div className="auth-field-wrapper">
                <Lock size={16} className="auth-field-icon" />
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  className="auth-input"
                  placeholder="Enter your security password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                "Verifying credentials..."
              ) : isRegister ? (
                <>Register {role} Account <ArrowRight size={16} /></>
              ) : (
                <>Sign In as {role === "Teacher" ? "Faculty" : role} <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          {/* Toggle between Login and Registration (not for Admin) */}
          {role !== "Admin" && (
            <div className="auth-toggle-footer">
              <span>
                {isRegister
                  ? "Already enrolled with CampusConnect?"
                  : "First time accessing the repository?"}
              </span>
              <button
                type="button"
                className="auth-toggle-link"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
              >
                {isRegister ? "Sign in here" : "Create your account"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
