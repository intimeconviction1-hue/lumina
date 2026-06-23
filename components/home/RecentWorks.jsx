import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Film, Tv, BookOpen, Mic, Video, FileText, Radio } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const TYPE_ICONS = {
  film: Film, série: Tv, livre: BookOpen,
  documentaire: Radio, podcast: Mic, vidéo: Video, article: FileText,
};
const TYPE_COLORS = {
  film: "#0B2545", série: "#D4AF37", livre: "#6366F1",
  documentaire: "#2AA6A0", podcast: "#475569", vidéo: "#E56B3A", article: "#475569",
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: fr });
  } catch {
    return "";
  }
}

export default function RecentWorks({ works }) {
  const recent = [...works]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 8);

  if (recent.length === 0) return null;

  return (
    <div
      className="p-5"
      style={{
        backgroundColor: "var(--card-bg)",
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
          Derniers ajouts
        </span>
        <Link
          to="/AllWorks"
          className="text-[11.5px] font-medium transition-opacity hover:opacity-70"
          style={{ color: "#E56B3A" }}
        >
          Tout voir
        </Link>
      </div>

      {/* Scroll horizontal sur mobile, grille sur desktop */}
      <div className="flex gap-3 overflow-x-auto pb-1 sm:hidden" style={{ scrollbarWidth: "none" }}>
        {recent.map(work => <MiniCard key={work.id} work={work} />)}
      </div>

      <div className="hidden sm:grid sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {recent.map(work => <MiniCard key={work.id} work={work} />)}
      </div>
    </div>
  );
}

function MiniCard({ work }) {
  const TypeIcon = TYPE_ICONS[work.type] || FileText;
  const color = TYPE_COLORS[work.type] || "#C9A84C";

  return (
    <Link
      to={`/WorkDetail?id=${work.id}`}
      className="flex-shrink-0 group"
      style={{ width: 88 }}
    >
      {/* Miniature */}
      <div
        className="overflow-hidden rounded-[10px] mb-2 transition-transform group-hover:scale-[1.04] relative"
        style={{ width: 88, height: 120, backgroundColor: `${color}18` }}
      >
        {work.cover_image ? (
          <img src={work.cover_image} alt={work.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon className="w-7 h-7" style={{ color }} />
          </div>
        )}
        {/* Badge type */}
        <div
          className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full text-white"
          style={{ backgroundColor: `${color}dd`, fontSize: 8, fontWeight: 700, letterSpacing: "0.04em", backdropFilter: "blur(4px)" }}
        >
          {work.type}
        </div>
      </div>

      {/* Titre */}
      <p className="text-[11px] font-semibold leading-tight line-clamp-2 mb-0.5" style={{ color: "var(--text-primary)" }}>
        {work.title}
      </p>

      {/* Date d'ajout */}
      <p className="text-[9.5px] font-medium" style={{ color: "var(--text-muted)" }}>
        {timeAgo(work.created_date)}
      </p>
    </Link>
  );
}