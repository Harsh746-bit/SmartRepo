import React, { useState, useEffect } from "react";
import {
  HardDrive,
  Database,
  FolderTree,
  ShieldCheck,
  CheckCircle2,
  HardDriveDownload,
  Server
} from "lucide-react";
import StatsCard from "../components/StatsCard";
import { API_BASE } from "../config";

export default function StorageManagementView() {
  const [storageData, setStorageData] = useState({
    total_storage_bytes: 0,
    total_storage_formatted: "0 B",
    total_documents: 0,
    categories: []
  });
  const [loading, setLoading] = useState(true);

  const API_URL = API_BASE;

  useEffect(() => {
    fetchStorageOverview();
  }, []);

  const fetchStorageOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/admin/storage-overview`);
      if (res.ok) {
        const data = await res.json();
        setStorageData(data);
      }
    } catch (err) {
      console.error("Failed to load storage overview:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalFormatted = storageData.total_storage_formatted || "0 B";
  const totalDocs = storageData.total_documents || 0;
  const categories = storageData.categories || [];

  return (
    <div className="campus-repository-view">
      <div className="repo-header-panel">
        <div className="repo-title-group">
          <h2>Storage & Vault Capacity Management</h2>
          <p>
            Physical file storage footprint and database utilization across institutional categories.
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="dashboard-stats-grid three-cols">
        <StatsCard
          title="Total Storage Utilized"
          value={totalFormatted}
          subtitle="Physical disk & cloud payload"
          icon={HardDrive}
          colorScheme="blue"
        />
        <StatsCard
          title="Active Vault Files"
          value={totalDocs}
          subtitle="Indexed document assets"
          icon={Database}
          colorScheme="emerald"
        />
        <StatsCard
          title="Storage Health"
          value="Optimal"
          subtitle="Deduplication active (SHA-256)"
          icon={ShieldCheck}
          colorScheme="purple"
          badge="100% Healthy"
        />
      </div>

      {/* Category breakdown table */}
      <div className="repo-section-card">
        <div className="section-header-row">
          <div className="section-title-wrapper">
            <FolderTree size={18} className="section-icon blue" />
            <h3>Storage Consumption by Academic Category</h3>
          </div>
        </div>

        {categories.length > 0 ? (
          <div className="campus-table-container">
            <table className="campus-data-table">
              <thead>
                <tr>
                  <th>Academic Category</th>
                  <th>Files Count</th>
                  <th>Total Storage Allocated</th>
                  <th>Distribution Share</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, idx) => {
                  const share =
                    storageData.total_storage_bytes > 0
                      ? Math.round((cat.bytes / storageData.total_storage_bytes) * 100)
                      : 0;

                  return (
                    <tr key={idx}>
                      <td className="font-medium">
                        <span className="table-category-badge">{cat.category}</span>
                      </td>
                      <td>{cat.count} files</td>
                      <td className="font-bold">{cat.formatted_size}</td>
                      <td>
                        <div className="storage-progress-wrapper">
                          <div
                            className="storage-progress-bar"
                            style={{ width: `${Math.max(share, 5)}%` }}
                          />
                          <span className="storage-percent-label">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="repo-empty-card">
            <Server size={36} className="empty-icon" />
            <p>Storage category distribution will update as files are uploaded.</p>
          </div>
        )}
      </div>
    </div>
  );
}
