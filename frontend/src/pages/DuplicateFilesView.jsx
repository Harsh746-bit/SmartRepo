import React, { useState, useEffect } from "react";
import {
  Copy,
  ShieldAlert,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Hash
} from "lucide-react";
import { API_BASE } from "../config";

export default function DuplicateFilesView() {
  const [duplicateData, setDuplicateData] = useState({
    duplicate_groups: [],
    blocked_attempts: []
  });
  const [loading, setLoading] = useState(true);

  const API_URL = API_BASE;

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const fetchDuplicates = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/admin/duplicate-files`);
      if (res.ok) {
        const data = await res.json();
        setDuplicateData(data);
      }
    } catch (err) {
      console.error("Failed to load duplicate files:", err);
    } finally {
      setLoading(false);
    }
  };

  const blockedCount = duplicateData.blocked_attempts?.length || 0;
  const groupsCount = duplicateData.duplicate_groups?.length || 0;

  return (
    <div className="campus-repository-view">
      <div className="repo-header-panel">
        <div className="repo-title-group">
          <h2>Cryptographic Duplicate Detection Vault</h2>
          <p>
            Automated SHA-256 checksum verification. Displays blocked duplicate upload attempts and storage conservation metrics.
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="duplicate-info-banner">
        <ShieldAlert size={24} className="banner-icon purple" />
        <div className="banner-details">
          <h4>Zero-Duplicate Storage Architecture</h4>
          <p>
            Whenever a student or faculty member uploads course materials, CampusConnect calculates a 256-bit SHA checksum.
            If an identical binary already exists for that user, the upload is intercepted with a 409 Conflict status to prevent repository clutter and save cloud storage.
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="dashboard-stats-grid two-cols">
        <div className="campus-stat-card stat-purple">
          <div className="stat-card-header">
            <span className="stat-card-title">Blocked Duplicate Attempts</span>
            <div className="stat-icon-wrapper icon-bg-purple">
              <ShieldAlert size={20} />
            </div>
          </div>
          <div className="stat-card-main">
            <h3 className="stat-card-value">{blockedCount}</h3>
            <span className="stat-card-badge badge-purple">Conserved</span>
          </div>
          <p className="stat-card-subtitle">Redundant uploads prevented at the gateway</p>
        </div>

        <div className="campus-stat-card stat-blue">
          <div className="stat-card-header">
            <span className="stat-card-title">SHA-256 Collision Sets</span>
            <div className="stat-icon-wrapper icon-bg-blue">
              <Hash size={20} />
            </div>
          </div>
          <div className="stat-card-main">
            <h3 className="stat-card-value">{groupsCount}</h3>
          </div>
          <p className="stat-card-subtitle">Active multi-uploader identical binaries</p>
        </div>
      </div>

      {/* Blocked Attempts Log */}
      <div className="repo-section-card">
        <div className="section-header-row">
          <div className="section-title-wrapper">
            <Clock size={18} className="section-icon purple" />
            <h3>Recent Intercepted Duplicate Uploads</h3>
          </div>
        </div>

        {duplicateData.blocked_attempts && duplicateData.blocked_attempts.length > 0 ? (
          <div className="campus-table-container">
            <table className="campus-data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Attempted Filename</th>
                  <th>Uploader</th>
                  <th>Role</th>
                  <th>Security Action Details</th>
                </tr>
              </thead>
              <tbody>
                {duplicateData.blocked_attempts.map((log, idx) => (
                  <tr key={log.id || idx}>
                    <td className="text-muted">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="font-medium">{log.document_name}</td>
                    <td>{log.user_name || log.user_email}</td>
                    <td><span className="text-muted">{log.user_role}</span></td>
                    <td className="text-muted text-sm">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="repo-empty-card">
            <CheckCircle2 size={40} className="empty-icon emerald" />
            <h3>No Duplicate Intercepts Recorded</h3>
            <p>Duplicate upload attempts will appear here when users submit identical file binaries.</p>
          </div>
        )}
      </div>
    </div>
  );
}
