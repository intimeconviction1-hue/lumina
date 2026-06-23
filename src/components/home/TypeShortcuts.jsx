import React from "react";
import { useNavigate } from "react-router-dom";

const TYPES = [
  { key: "film",        label: "Films",   emoji: "🎬", color: "#0B2545", bg: "rgba(11,37,69,0.08)" },
  { key: "série",       label: "Séries",  emoji: "📺", color: "#D4AF37", bg: "rgba(212,175,55,0.08)" },
  { key: "livre",       label: "Livres",  emoji: "📚", color: "#6366F1", bg: "rgba(99,102,241,0.08)" },
  { key: "documentaire",label: "Docs",    emoji: "🎙️", color: "#2AA6A0", bg: "rgba(42,166,160,0.08)" },
  { key: "vidéo",       label: "Vidéos",  emoji: "▶️", color: "#E56B3A", bg: "rgba(229,107,58,0.08)" },
];

export default function TypeShortcuts({ works = [] }) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-5 gap-2 sm:gap-3">
      {TYPES.map(({ key, label, emoji, color, bg }) => {
        const count = works.filter(w => w.type === key).length;
        return (
          <button
            key={key}
            onClick={() => navigate(`/AllWorks?type=${encodeURIComponent(key)}`)}
            className="flex flex-col items-center justify-center gap-1 sm:gap-2 py-3 sm:py-4 rounded-[14px] transition-all group"
            style={{
              backgroundColor: bg,
              border: `1.5px solid ${color}22`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = `0 6px 20px ${color}25`;
              e.currentTarget.style.borderColor = `${color}55`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = `${color}22`;
            }}
          >
            <span className="text-[22px] sm:text-[28px] leading-none">{emoji}</span>
            <span className="text-[11px] sm:text-[12.5px] font-bold" style={{ color }}>{label}</span>
            <span
              className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${color}18`, color }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}