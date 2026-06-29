import React from 'react';

export default function StatCard({ label, value, sub, icon, iconBg, iconColor }) {
  return (
    <div className="stat-card">
      {icon && (
        <div className="stat-icon" style={{ background: iconBg || 'var(--surface-2)', color: iconColor || 'var(--green)' }}>
          {icon}
        </div>
      )}
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
