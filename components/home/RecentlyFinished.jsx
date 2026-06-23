import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Film, Tv, BookOpen, FileText, Mic, Video, Radio, Star, ArrowRight } from "lucide-react";
import { parseISO, isValid, subDays, isAfter } from "date-fns";

const TYPE_ICONS = {
  film: Film, série: Tv, livre: BookOpen,
  documentaire: FileText, podcast: Mic, vidéo: Video, article: Radio,
};
const TYPE_COLORS = {
  film: "#6366F1", série: "#2AA6A0", livre: "#D4AF37",
  documentaire: "#8B5CF6", podcast: "#F59E0B", vidéo: "#EF4444", article: "#14B8A6",
};

function finishedSignal(finished_at) {
  const date = typeof finished_at === "string" ? parseISO(finished_at) : new Date(finished_at);
  if (!isValid(date)) return null;
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diffDays === 0) return "terminé aujourd'hui";
  if (diffDays === 1) return "terminé hier";
  if (diffDays < 7) return `terminé il y a ${diffDays} jours`;
  if (diffDays < 14) return "terminé il y a 1 semaine";
  return `terminé il y a ${Math.floor(diffDays / 7)} semaines`;
}

function FinishedCard({ work, index }) {
  const Icon = TYPE_ICONS[work.type] || FileText;
  const color = TYPE_COLORS[work.type] || "#667085";
  const signal = work.finished_at ? finishedSignal(work.finished_at) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Link
        to={`/WorkDetail?id=${work.id}`}
        className="flex items-center gap-3.5 p-3.5 rounded-[14px] border group transition-all hover:shadow-sm"
        style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
      >
        {/* Cover or icon */}
        <div
          className="w-12 h-16 rounded-[10px] flex-shrink-0 overflow-hidden flex items-center justify-center"
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
          {signal && (
            <p className="text-[11px] font-medium mt-0.5" style={{ color: "#2AA6A0" }}>{signal}</p>
          )}
          {/* Rating */}
          {work.rating > 0 && (
            <div className="flex items-center gap-0.5 mt-1">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className="w-3 h-3" fill={s <= work.rating ? "#D4AF37" : "transparent"} stroke={s <= work.rating ? "#D4AF37" : "var(--text-muted)"} strokeWidth={1.5} />
              ))}
            </div>
          )}
          {/* Short review — very compact */}
          {work.short_review && (
            <p className="text-[11px] mt-1 italic line-clamp-1" style={{ color: "var(--text-muted)" }}>
              «&nbsp;{work.short_review}&nbsp;»
            </p>
          )}
        </div>

        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" style={{ color: "var(--text-muted)" }} />
      </Link>
    </motion.div>
  );
}

export default function RecentlyFinished({ works }) {
  const cutoff = subDays(new Date(), 30);

  const recent = works
    .filter(w => {
      if (!w.finished_at) return false;
      const d = typeof w.finished_at === "string" ? parseISO(w.finished_at) : new Date(w.finished_at);
      return isValid(d) && isAfter(d, cutoff);
    })
    .sort((a, b) => {
      return new Date(b.finished_at) - new Date(a.finished_at);
    })
    .slice(0, 10);

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
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#2AA6A0" }} />
          <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
            Terminé récemment
          </span>
        </div>
        {recent.length > 0 && (
          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "rgba(42,166,160,0.1)", color: "#2AA6A0" }}>
            {recent.length} ce mois
          </span>
        )}
      </div>

      {recent.length === 0 ? (
        <div className="py-2 flex items-center justify-between">
          <p className="text-[12.5px]" style={{ color: "var(--text-muted)" }}>
            Rien de terminé ces 30 derniers jours.
          </p>
          <Link
            to="/AllWorks"
            onClick={() => window.dispatchEvent(new CustomEvent("sidebar-filter", { detail: { status: "En cours" } }))}
            className="text-[11.5px] font-semibold shrink-0 ml-3 transition-opacity hover:opacity-70"
            style={{ color: "#2AA6A0" }}
          >
            Voir En cours →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {recent.map((w, i) => (
            <FinishedCard key={w.id} work={w} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}