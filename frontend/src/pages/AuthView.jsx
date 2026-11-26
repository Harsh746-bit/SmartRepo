import React, { useState } from "react";
import {
  GraduationCap,
  BookOpen,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  User as UserIcon,
  AlertCircle,
  Clock,
  Building,
  BadgeCheck,
  ShieldCheck
} from "lucide-react";
import { API_BASE } from "../config";

export default function AuthView({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [registerRole, setRegisterRole] = useState("Student"); // 'Student' | 'Teacher'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("Computer Science & Engineering");
  const [employeeId, setEmployeeId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [teacherPendingNotice, setTeacherPendingNotice] = useState(null);

  const API_URL = API_BASE;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setTeacherPendingNotice(null);
    setLoading(true);

    try {
      const endpoint = isRegister ? `${API_URL}/auth/register` : `${API_URL}/auth/login`;
      const payload = isRegister
        ? {
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            password: password,
            role: registerRole,
            department: registerRole === "Teacher" ? department.trim() : "Student",
            employee_id: registerRole === "Teacher" ? employeeId.trim() : ""
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

      // If registered as Teacher, they must wait for admin approval
      if (isRegister && (data.pending_approval || registerRole === "Teacher")) {
        setTeacherPendingNotice({
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          message: data.message || "Your teacher registration request has been submitted and is awaiting administrator approval."
        });
        setIsRegister(false);
        setPassword("");
        return;
      }

      const token = data.access_token || data.token;
      if (!token) {
        throw new Error("No authentication token received from server.");
      }

      if (isRegister) {
        setSuccessMessage("Account created successfully! Signing you in...");
      }

      // Save token and user object
      const userPayload = {
        name: data.user?.full_name || data.full_name || fullName || "Campus Member",
        email: data.user?.email || data.email || email.toLowerCase(),
        role: data.user?.role || data.role || "Student",
        status: data.user?.status || "Active",
        department: data.user?.department || department,
        employee_id: data.user?.employee_id || employeeId
      };

      localStorage.setItem("smartrepo_token", token);
      localStorage.setItem("smartrepo_user", JSON.stringify(userPayload));

      setTimeout(() => {
        onLoginSuccess(userPayload, token);
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
                <h2 className="crest-brand-name">CampusConnect 2.0</h2>
                <span className="crest-brand-sub">Academic Repository & LMS</span>
              </div>
            </div>

            <div className="auth-brand-pitch">
              <h3>Secure Academic Learning Management & Document Vault</h3>
              <p>
                An enterprise-grade collegiate platform with RSA Digital Signatures, verifiable student assignments, teacher moderation, and SHA-256 integrity assurance.
              </p>
            </div>
          </div>

          <div className="auth-highlights-list">
            <div className="auth-highlight-item">
              <ShieldCheck size={18} className="highlight-check" />
              <span>RSA-PSS 3072-bit Cryptographic Digital Signatures</span>
            </div>
            <div className="auth-highlight-item">
              <CheckCircle2 size={18} className="highlight-check" />
              <span>Moodle-inspired Assignment & Evaluation System</span>
            </div>
            <div className="auth-highlight-item">
              <CheckCircle2 size={18} className="highlight-check" />
              <span>Strict Teacher Verification & Approval Workflow</span>
            </div>
            <div className="auth-highlight-item">
              <CheckCircle2 size={18} className="highlight-check" />
              <span>Binary SHA-256 Duplicate Detection Engine</span>
            </div>
          </div>

          <div className="auth-brand-footer">
            <span>© 2026 CampusConnect Institutional Digital Archive</span>
          </div>
        </div>

        {/* Right Authentication Form Card */}
        <div className="auth-form-panel">
          <div className="auth-form-header">
            <h2>{isRegister ? "Create Academic Profile" : "Institutional Single Sign-On"}</h2>
            <p>
              {isRegister
                ? "Select your campus role and register your academic profile"
                : "Sign in with your institutional email and password to access your dashboard"}
            </p>
          </div>

          {/* Pending Teacher Approval Notice Card */}
          {teacherPendingNotice && (
            <div className="auth-alert" style={{ background: "#eff6ff", borderColor: "#93c5fd", color: "#1e40af", display: "flex", flexDirection: "column", gap: "8px", padding: "16px", borderRadius: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontSize: "0.95rem" }}>
                <Clock size={20} color="#2563eb" />
                <span>Teacher Registration Submitted</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: "1.4" }}>
                Welcome, <strong>{teacherPendingNotice.name}</strong>! Your faculty account request (<em>{teacherPendingNotice.email}</em>) has been registered and is currently <strong>Pending Administrator Review</strong>.
              </p>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#3b82f6" }}>
                An administrator will review and activate your teacher privileges shortly. Once approved, you can sign in below.
              </p>
            </div>
          )}

          {/* Role Selection Tabs ONLY in Register Mode */}
          {isRegister && (
            <div className="auth-role-tabs" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
              <button
                type="button"
                className={`auth-role-tab ${registerRole === "Student" ? "active" : ""}`}
                onClick={() => { setRegisterRole("Student"); setErrorMessage(""); }}
              >
                <GraduationCap size={16} />
                <span>Student</span>
              </button>

              <button
                type="button"
                className={`auth-role-tab ${registerRole === "Teacher" ? "active" : ""}`}
                onClick={() => { setRegisterRole("Teacher"); setErrorMessage(""); }}
              >
                <BookOpen size={16} />
                <span>Faculty / Teacher</span>
              </button>
            </div>
          )}

          {/* Error & Success Alerts */}
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
                    placeholder={registerRole === "Teacher" ? "e.g. Dr. Alan Turing" : "e.g. Alex Smith"}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={isRegister}
                  />
                </div>
              </div>
            )}

            {isRegister && registerRole === "Teacher" && (
              <>
                <div className="auth-input-group">
                  <label className="auth-label" htmlFor="auth-dept">Academic Department</label>
                  <div className="auth-field-wrapper">
                    <Building size={16} className="auth-field-icon" />
                    <input
                      id="auth-dept"
                      type="text"
                      className="auth-input"
                      placeholder="e.g. Computer Science & Engineering"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label className="auth-label" htmlFor="auth-empid">Faculty Employee ID</label>
                  <div className="auth-field-wrapper">
                    <BadgeCheck size={16} className="auth-field-icon" />
                    <input
                      id="auth-empid"
                      type="text"
                      className="auth-input"
                      placeholder="e.g. FAC-2026-CS88"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div className="auth-input-group">
              <label className="auth-label" htmlFor="auth-email">Institutional Email</label>
              <div className="auth-field-wrapper">
                <Mail size={16} className="auth-field-icon" />
                <input
                  id="auth-email"
                  type="email"
                  className="auth-input"
                  placeholder="name@smartrepo.edu"
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
                  placeholder="Enter your password"
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
                <>
                  Register as {registerRole === "Teacher" ? "Teacher (Faculty)" : "Student"} <ArrowRight size={16} />
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Toggle between Login and Registration */}
          <div className="auth-toggle-footer">
            <span>
              {isRegister
                ? "Already registered with CampusConnect?"
                : "First time accessing the repository?"}
            </span>
            <button
              type="button"
              className="auth-toggle-link"
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMessage("");
                setSuccessMessage("");
                setTeacherPendingNotice(null);
              }}
            >
              {isRegister ? "Sign In to your account" : "Create your account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
