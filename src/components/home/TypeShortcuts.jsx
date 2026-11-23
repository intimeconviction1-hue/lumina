import { paletteText } from "@/lib/palette";
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
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
      {TYPES.map(({ key, label, emoji, color, bg }) => {
        const count = works.filter(w => w.type === key).length;
        const film = key === "film";
        const ink = paletteText(color);
        return (
          <button
            key={key}
            onClick={() => navigate(`/AllWorks?type=${encodeURIComponent(key)}`)}
            type="button"
            className="home-type-shortcut flex flex-col items-center justify-center gap-1 rounded-[14px] border-[1.5px] py-3 transition-colors motion-safe:transition-[transform,background-color,border-color] motion-safe:hover:-translate-y-0.5 sm:gap-2 sm:py-4"
            style={{
              "--shortcut-border": film ? `var(--film-button-border, ${color}22)` : `${color}22`,
              "--shortcut-ink": ink,
              backgroundColor: film ? `var(--film-button-bg, ${bg})` : bg,
              color: ink,
            }}
          >
            <span className="text-[22px] sm:text-[28px] leading-none">{emoji}</span>
            <span className="text-[11px] sm:text-[12.5px] font-bold">{label}</span>
            <span
              className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: film ? `var(--film-button-active-bg, ${color}18)` : `${color}18` }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
