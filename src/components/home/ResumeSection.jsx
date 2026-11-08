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
        className="flex items-center gap-3 p-2.5 sm:p-3 rounded-[14px] border transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        style={{
          backgroundColor: "var(--bg)",
          borderColor: "var(--border)",
        }}
      >
        {/* Cover or icon */}
        <div
          className="w-12 h-[64px] rounded-[8px] flex-shrink-0 overflow-hidden flex items-center justify-center"
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
          <p className="text-sm sm:text-base font-bold truncate" style={{ color: "var(--text-primary)" }}>
            {work.title}
          </p>
          {(work.creator || work.creator_name) && (
            <p className="text-[11.5px] truncate" style={{ color: "var(--text-muted)" }}>{work.creator || work.creator_name}</p>
          )}
          {signal && (
            <p className="text-[11px] mt-0.5 font-medium" style={{ color: "var(--text-secondary)" }}>{signal}</p>
          )}
        </div>

        <span className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold"
          style={{ backgroundColor: "var(--accent)", color: "#23150e" }}>
          Continuer <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </Link>
    </motion.div>
  );
}

export default function ResumeSection({ works }) {
  // Sort: started_at présent en premier, puis updated_date pour les autres
  const withDate = [...works.filter(w => w.started_at)].sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
  const withoutDate = [...works.filter(w => !w.started_at)].sort((a, b) => new Date(b.updated_date || 0) - new Date(a.updated_date || 0));
  const sorted = [...withDate, ...withoutDate];

  return (
    <div
      className="p-3 sm:p-5"
      style={{
        background: "linear-gradient(135deg, var(--accent-soft), var(--card-bg) 55%)",
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#D4AF37" }} />
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Reprendre
          </h2>
        </div>
        {sorted.length > 0 && (
          <Link
            to="/AllWorks?status=En+cours"
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
            Choisis une œuvre à voir ou à lire.
          </p>
          <Link
            to="/AllWorks?status=%C3%80+voir&status=Envie+de+lire"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12px] font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "rgba(212,175,55,0.1)", color: "#B8942E", border: "1px solid rgba(212,175,55,0.25)" }}
          >
            <Play className="w-3.5 h-3.5" /> Voir les œuvres à découvrir
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.slice(0, 3).map((w, i) => (
            <ResumeCard key={w.id} work={w} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
