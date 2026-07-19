import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

const TAG_COLORS = [
  "#8B5CF6", "#0B2545", "#D4AF37", "#2AA6A0", "#EC4899",
  "#6366F1", "#E56B3A", "#7E9A73", "#9B6A6C", "#B5838D",
];

export default function TagCloud({ works, activeTags, onTagToggle, onReset }) {
  const navigate = useNavigate();

  const topTags = useMemo(() => {
    const counts = {};
    works.forEach(w => (w.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag, count]) => ({ tag, count }));
  }, [works]);

  if (topTags.length === 0) return null;

  return (
    <div
      className="p-4"
      style={{
        backgroundColor: "var(--card-bg)",
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
          Tags
        </span>
        {activeTags.length > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full transition-all hover:opacity-80"
            style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <X className="w-3 h-3" />
            Réinitialiser
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {topTags.map(({ tag, count }, i) => {
          const color = TAG_COLORS[i % TAG_COLORS.length];
          const active = activeTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => onTagToggle(tag)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-medium transition-all hover:opacity-80 active:scale-95"
              style={{
                backgroundColor: active ? color : `${color}12`,
                color: active ? "#fff" : color,
                border: `1px solid ${active ? color : `${color}35`}`,
                fontWeight: active ? "600" : "500",
              }}
            >
              #{tag}
              <span
                className="text-[10px] font-bold ml-0.5"
                style={{ opacity: active ? 0.8 : 0.6 }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
      {activeTags.length > 0 && (
        <p className="text-[11px] mt-2.5" style={{ color: "var(--text-muted)" }}>
          Filtre actif : {activeTags.map(t => `#${t}`).join(", ")} —{" "}
          <span style={{ color: "var(--text-secondary)" }}>
            {works.filter(w => activeTags.every(t => (w.tags || []).includes(t))).length} œuvre(s) correspondante(s)
          </span>
        </p>
      )}
    </div>
  );
}