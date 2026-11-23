import React from "react";
import {
  FolderTree,
  FileText,
  Presentation,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  ArrowRight
} from "lucide-react";

export default function CategoryManagementView({
  documents = [],
  onSelectCategory
}) {
  const categoryDefs = [
    {
      name: "Documents",
      icon: FileText,
      color: "blue",
      extensions: [".pdf", ".docx", ".doc"],
      desc: "Course syllabi, academic research papers, lecture notes, and assignments."
    },
    {
      name: "Presentations",
      icon: Presentation,
      color: "purple",
      extensions: [".pptx", ".ppt"],
      desc: "Classroom slide decks, seminar presentations, and conference materials."
    },
    {
      name: "Spreadsheets",
      icon: FileSpreadsheet,
      color: "emerald",
      extensions: [".xlsx", ".xls", ".csv"],
      desc: "Lab experimental data, student gradebooks, statistics, and matrices."
    },
    {
      name: "Notes",
      icon: FileCode,
      color: "amber",
      extensions: [".txt"],
      desc: "Quick revision snippets, code outlines, and plain-text references."
    },
    {
      name: "Images",
      icon: ImageIcon,
      color: "indigo",
      extensions: [".jpg", ".jpeg", ".png"],
      desc: "Scientific diagrams, lab apparatus captures, and campus project graphics."
    }
  ];

  return (
    <div className="campus-repository-view">
      <div className="repo-header-panel">
        <div className="repo-title-group">
          <h2>Academic Category Management</h2>
          <p>
            Automated extension categorization rules and repository resource distribution.
          </p>
        </div>
      </div>

      <div className="category-cards-grid">
        {categoryDefs.map((cat) => {
          const Icon = cat.icon;
          const matchingDocs = documents.filter((d) => d.category === cat.name);
          const count = matchingDocs.length;
          const totalBytes = matchingDocs.reduce((acc, d) => acc + (d.file_size || 0), 0);

          const formatBytes = (bytes) => {
            if (bytes === 0) return "0 B";
            const k = 1024;
            const sizes = ["B", "KB", "MB", "GB"];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
          };

          return (
            <div key={cat.name} className={`category-detail-card card-border-${cat.color}`}>
              <div className="cat-card-top">
                <div className={`cat-icon-container bg-${cat.color}`}>
                  <Icon size={24} />
                </div>
                <div className="cat-metric-badge">
                  <span className="count-num">{count}</span>
                  <span className="count-label">files</span>
                </div>
              </div>

              <div className="cat-card-info">
                <h3>{cat.name}</h3>
                <p>{cat.desc}</p>
              </div>

              <div className="cat-extensions-strip">
                <span className="ext-label">Supported extensions:</span>
                <div className="ext-pills-row">
                  {cat.extensions.map((ext) => (
                    <span key={ext} className="ext-pill">{ext}</span>
                  ))}
                </div>
              </div>

              <div className="cat-card-footer">
                <span className="storage-used-tag">Storage: {formatBytes(totalBytes)}</span>
                <button
                  type="button"
                  className="cat-view-docs-btn"
                  onClick={() => onSelectCategory(cat.name)}
                >
                  View Files <ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
