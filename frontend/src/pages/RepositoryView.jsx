import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Grid,
  List,
  SortAsc,
  X,
  FileText,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CheckCircle2,
  XCircle,
  FolderOpen
} from "lucide-react";
import DocumentCard from "../components/DocumentCard";
import DocumentTable from "../components/DocumentTable";

export default function RepositoryView({
  title = "Document Repository",
  subtitle = "Browse verified academic materials",
  documents = [],
  currentUser,
  onPreview,
  onDownload,
  onToggleFavorite,
  onDelete,
  onRestore,
  onPermanentDelete,
  onApprove,
  onReject,
  onUploadClick,
  isRecycleBin = false,
  forcedStatusFilter = null
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState(forcedStatusFilter || "All");
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'oldest' | 'downloads' | 'size'
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const categories = ["All", "Documents", "Presentations", "Spreadsheets", "Notes", "Images"];

  // Filter and sort pipeline
  const filteredAndSortedDocs = useMemo(() => {
    let result = [...documents];

    // Status filter
    if (forcedStatusFilter) {
      result = result.filter((d) => d.approval_status === forcedStatusFilter);
    } else if (statusFilter !== "All") {
      result = result.filter((d) => d.approval_status === statusFilter);
    }

    // Category filter
    if (selectedCategory !== "All") {
      result = result.filter((d) => d.category === selectedCategory);
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (d) =>
          d.original_filename?.toLowerCase().includes(q) ||
          d.uploaded_by_name?.toLowerCase().includes(q) ||
          d.category?.toLowerCase().includes(q) ||
          d.uploaded_by_role?.toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.uploaded_at) - new Date(a.uploaded_at);
      }
      if (sortBy === "oldest") {
        return new Date(a.uploaded_at) - new Date(b.uploaded_at);
      }
      if (sortBy === "downloads") {
        return (b.download_count || 0) - (a.download_count || 0);
      }
      if (sortBy === "size") {
        return (b.file_size || 0) - (a.file_size || 0);
      }
      return 0;
    });

    return result;
  }, [documents, searchTerm, selectedCategory, statusFilter, forcedStatusFilter, sortBy]);

  // Pagination calculation
  const totalItems = filteredAndSortedDocs.length;
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedDocs.slice(start, start + pageSize);
  }, [filteredAndSortedDocs, currentPage, pageSize]);

  const hasActiveFilters = searchTerm !== "" || selectedCategory !== "All" || (!forcedStatusFilter && statusFilter !== "All");

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    if (!forcedStatusFilter) setStatusFilter("All");
    setCurrentPage(1);
  };

  return (
    <div className="campus-repository-view">
      {/* Top Header & Context */}
      <div className="repo-header-panel">
        <div className="repo-title-group">
          <h2>{title}</h2>
          <p>{subtitle} • Showing {totalItems} {totalItems === 1 ? "resource" : "resources"}</p>
        </div>

        {currentUser?.role !== "Admin" && onUploadClick && (
          <button
            type="button"
            className="repo-primary-cta"
            onClick={onUploadClick}
          >
            <UploadCloud size={16} /> Upload New Material
          </button>
        )}
      </div>

      {/* Control Strip: Search, Categories, Sort, View Toggle */}
      <div className="repo-controls-strip">
        {/* Search Input */}
        <div className="repo-search-box">
          <Search size={16} className="search-field-icon" />
          <input
            type="text"
            className="repo-search-input"
            placeholder="Search by title, author, or keyword..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchTerm("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="repo-category-pills">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`category-pill-btn ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => {
                setSelectedCategory(cat);
                setCurrentPage(1);
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Right Tools: Sort, Status, Grid/Table */}
        <div className="repo-tools-group">
          {/* Status Filter (if not forced) */}
          {!forcedStatusFilter && !isRecycleBin && (
            <div className="select-wrapper">
              <select
                className="repo-select-control"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending Review</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          )}

          {/* Sort Dropdown */}
          <div className="select-wrapper">
            <select
              className="repo-select-control"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="downloads">Most Downloaded</option>
              <option value="size">File Size</option>
            </select>
          </div>

          {/* Grid / Table Toggle */}
          <div className="view-mode-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid Card View"
            >
              <Grid size={16} />
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
              title="List Table View"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {hasActiveFilters && (
        <div className="active-filters-bar">
          <span className="filters-label">Active filters:</span>
          {searchTerm && (
            <span className="filter-chip">
              Search: "{searchTerm}"
              <X size={12} onClick={() => setSearchTerm("")} />
            </span>
          )}
          {selectedCategory !== "All" && (
            <span className="filter-chip">
              Category: {selectedCategory}
              <X size={12} onClick={() => setSelectedCategory("All")} />
            </span>
          )}
          {statusFilter !== "All" && !forcedStatusFilter && (
            <span className="filter-chip">
              Status: {statusFilter}
              <X size={12} onClick={() => setStatusFilter("All")} />
            </span>
          )}
          <button type="button" className="clear-all-filters-btn" onClick={clearFilters}>
            Clear all filters
          </button>
        </div>
      )}

      {/* Document Content Display */}
      {paginatedDocs.length > 0 ? (
        viewMode === "grid" ? (
          <div className="repo-grid-layout">
            {paginatedDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onPreview={onPreview}
                onDownload={onDownload}
                onToggleFavorite={onToggleFavorite}
                onDelete={onDelete}
                onRestore={onRestore}
                onPermanentDelete={onPermanentDelete}
                onApprove={onApprove}
                onReject={onReject}
                currentUser={currentUser}
                isRecycleBin={isRecycleBin}
              />
            ))}
          </div>
        ) : (
          <DocumentTable
            documents={paginatedDocs}
            onPreview={onPreview}
            onDownload={onDownload}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDelete}
            onRestore={onRestore}
            onPermanentDelete={onPermanentDelete}
            onApprove={onApprove}
            onReject={onReject}
            currentUser={currentUser}
            isRecycleBin={isRecycleBin}
          />
        )
      ) : (
        <div className="repo-empty-card">
          <FolderOpen size={48} className="empty-icon" />
          <h3>{isRecycleBin ? "Recycle Bin is Empty" : "No Academic Documents Found"}</h3>
          <p>
            {hasActiveFilters
              ? "No course materials match your search filters. Try adjusting your query or resetting filters."
              : isRecycleBin
              ? "There are currently no deleted files in the Recycle Bin. Deleted items will appear here."
              : "There are currently no documents in this collection."}
          </p>
          {hasActiveFilters ? (
            <button type="button" className="empty-action-btn" onClick={clearFilters}>
              Reset Search Filters
            </button>
          ) : !isRecycleBin && currentUser?.role !== "Admin" && onUploadClick ? (
            <button type="button" className="empty-action-btn primary" onClick={onUploadClick}>
              <UploadCloud size={16} /> Upload First Document
            </button>
          ) : null}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="repo-pagination-strip">
          <div className="pagination-info">
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
          </div>

          <div className="pagination-buttons-cluster">
            <button
              type="button"
              className="pagination-nav-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              <ChevronLeft size={16} /> Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                className={`pagination-num-btn ${currentPage === page ? "active" : ""}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              className="pagination-nav-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
