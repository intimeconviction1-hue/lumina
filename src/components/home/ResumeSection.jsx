import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Film, Tv, BookOpen, FileText, Mic, Video, Radio, Play, ArrowRight } from "lucide-react";
import { parseISO, isValid } from "date-fns";

const TYPE_ICONS = {
  film: Film, série: Tv, livre: BookOpen,
  documentaire: FileText, podcast: Mic, vidéo: Video, article: Radio,
};
const TYPE_COLORS = {
  film: "#6366F1", série: "#2AA6A0", livre: "#D4AF37",
  documentaire: "#8B5CF6", podcast: "#F59E0B", vidéo: "#EF4444", article: "#14B8A6",
};

function timeSignal(started_at) {
  if (!started_at) return null;
  const date = typeof started_at === "string" ? parseISO(started_at) : new Date(started_at);
  if (!isValid(date)) return null;
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diffDays === 0) return "commencé aujourd'hui";
  if (diffDays === 1) return "commencé hier";
  if (diffDays < 7) return `commencé il y a ${diffDays} jours`;
  if (diffDays < 14) return "commencé il y a 1 semaine";
  return `commencé le ${date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;
}

function ResumeCard({ work, index }) {
  const Icon = TYPE_ICONS[work.type] || FileText;
  const color = TYPE_COLORS[work.type] || "#667085";
  const signal = timeSignal(work.started_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Link
        to={`/WorkDetail?id=${work.id}`}
        className="flex items-center gap-3.5 p-3.5 rounded-[14px] border group transition-all hover:shadow-sm"
        style={{
          backgroundColor: "var(--bg)",
          borderColor: "var(--border)",
        }}
      >
        {/* Cover or icon */}
        <div
          className="w-12 h-12 rounded-[10px] flex-shrink-0 overflow-hidden flex items-center justify-center"
          style={{ backgroundColor: `${color}18` }}
        >
          {work.cover_image ? (
            <img src={work.cover_image} alt="" className="w-full h-full object-cover" />
          ) : (
            <Icon className="w-5 h-5" style={{ color }} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {work.title}
          </p>
          {work.creator && (
            <p className="text-[11.5px] truncate" style={{ color: "var(--text-muted)" }}>{work.creator}</p>
          )}
          {signal && (
            <p className="text-[11px] mt-0.5 font-medium" style={{ color: "#D4AF37" }}>{signal}</p>
          )}
        </div>

        {/* Arrow */}
        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" style={{ color: "var(--text-muted)" }} />
      </Link>
    </motion.div>
  );
}

export default function ResumeSection({ works, onAddWork }) {
  // Sort: started_at présent en premier, puis updated_date pour les autres
  const withDate = [...works.filter(w => w.started_at)].sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
  const withoutDate = [...works.filter(w => !w.started_at)].sort((a, b) => new Date(b.updated_date || 0) - new Date(a.updated_date || 0));
  const sorted = [...withDate, ...withoutDate];

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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#D4AF37" }} />
          <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
            Reprendre
          </span>
        </div>
        {sorted.length > 0 && (
          <Link
            to="/AllWorks"
            onClick={() => window.dispatchEvent(new CustomEvent("sidebar-filter", { detail: { status: "En cours" } }))}
            className="text-[11.5px] font-medium transition-opacity hover:opacity-70"
            style={{ color: "#D4AF37" }}
          >
            Tout voir
          </Link>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-[13px] font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            Rien en cours pour l'instant.
          </p>
          <p className="text-[12px] mb-3" style={{ color: "var(--text-muted)" }}>
            Piocher dans ta liste <strong>En veille</strong> ?
          </p>
          <Link
            to="/AllWorks"
            onClick={() => window.dispatchEvent(new CustomEvent("sidebar-filter", { detail: { status: "En veille" } }))}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12px] font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "rgba(212,175,55,0.1)", color: "#B8942E", border: "1px solid rgba(212,175,55,0.25)" }}
          >
            <Play className="w-3.5 h-3.5" /> Voir En veille
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.slice(0, 5).map((w, i) => (
            <ResumeCard key={w.id} work={w} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}