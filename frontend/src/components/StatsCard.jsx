import React from "react";

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorScheme = "blue",
  onClick,
  badge
}) {
  return (
    <div
      className={`campus-stat-card stat-${colorScheme} ${onClick ? "clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {Icon && (
          <div className={`stat-icon-wrapper icon-bg-${colorScheme}`}>
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="stat-card-main">
        <h3 className="stat-card-value">{value}</h3>
        {badge && <span className={`stat-card-badge badge-${colorScheme}`}>{badge}</span>}
      </div>

      {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
    </div>
  );
}
