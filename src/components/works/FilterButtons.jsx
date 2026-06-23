import React from "react";

const STATUS_COLORS = {
  "À voir":        "#94A3B8",
  "En cours":      "#D4AF37",
  "Visionné":      "#2AA6A0",
  "Pas sorti":     "#6366F1",
  "Envie de lire": "#8B5CF6",
};

const TYPE_COLORS = {
  film:         "#2F6690",
  série:        "#7E9A73",
  livre:        "#9B6A6C",
  documentaire: "#6D6875",
  podcast:      "#B5838D",
  vidéo:        "#9FA3AD",
  article:      "#9FA3AD",
};

export function StatusButton({ status, active, onClick }) {
  const color = STATUS_COLORS[status] || "#94A3B8";
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[11px] font-semibold transition-all whitespace-nowrap"
      style={{
        borderColor: active ? color : "var(--border)",
        border: `1.5px solid ${active ? color : "var(--border)"}`,
        backgroundColor: active ? `${color}18` : "var(--card-bg)",
        color: active ? color : "var(--text-secondary)",
        boxShadow: active ? `0 2px 8px ${color}25` : "none",
      }}>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      {status}
    </button>
  );
}

export function TypeButton({ type, active, onClick }) {
  const color = TYPE_COLORS[type] || "#9FA3AD";
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 px-3 py-1.5 rounded-[10px] text-[11px] font-semibold transition-all capitalize whitespace-nowrap"
      style={{
        border: `1.5px solid ${active ? color : "var(--border)"}`,
        backgroundColor: active ? `${color}18` : "var(--card-bg)",
        color: active ? color : "var(--text-secondary)",
        boxShadow: active ? `0 2px 8px ${color}25` : "none",
      }}>
      {type}
    </button>
  );
}