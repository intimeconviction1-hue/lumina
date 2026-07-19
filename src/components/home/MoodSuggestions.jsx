import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Film, Tv, BookOpen, FileText, Mic, Video, Radio, Plus, ArrowRight } from "lucide-react";
import { effectiveStatus, isFinished } from "@/lib/statusActions";

const TYPE_ICONS = {
  film: Film, série: Tv, livre: BookOpen,
  documentaire: FileText, podcast: Mic, vidéo: Video, article: Radio,
};
const TYPE_COLORS = {
  film: "#6366F1", série: "#2AA6A0", livre: "#D4AF37",
  documentaire: "#8B5CF6", podcast: "#F59E0B", vidéo: "#EF4444", article: "#14B8A6",
};

// Types favorisés selon l'heure
function getTimeSlotTypes() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12)  return ["livre", "podcast", "article", "documentaire"];
  if (h >= 12 && h < 18) return ["film", "série", "documentaire", "vidéo"];
  if (h >= 18 && h < 23) return ["film", "série", "documentaire"];
  return ["film", "podcast", "livre"]; // nuit
}

function getTimeSlotLabel() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12)  return "ce matin";
  if (h >= 12 && h < 18) return "cet après-midi";
  if (h >= 18 && h < 23) return "ce soir";
  return "cette nuit";
}

function scoreWork(work, recentGenres, recentTypes, preferredTypes) {
  let score = 0;
  const reasons = [];

  // Bonus type adapté au moment
  if (preferredTypes.includes(work.type)) {
    score += 2;
    reasons.push(`Format adapté ${getTimeSlotLabel()}`);
  }

  // Bonus genre non vu récemment (pondération réduite)
  const genres = work.genre || [];
  const freshGenre = genres.find(g => !recentGenres.has(g));
  if (freshGenre) {
    score += 1;
    reasons.push(`Genre que tu n'as pas vu récemment`);
  }

  // Bonus plateforme renseignée (= accessible concrètement)
  const platforms = Array.isArray(work.platform) ? work.platform : (work.platform ? [work.platform] : []);
  if (platforms.length > 0) {
    score += 1;
    reasons.push(`Disponible sur ${platforms[0]}`);
  }

  // Petit bonus favori non commencé (pour ne pas l'oublier)
  if (work.favorite) {
    score += 0.5;
    // pas de raison affichée pour ça, trop subjectif
  }

  // Légère randomisation pour ne pas toujours avoir les mêmes
  score += Math.random() * 0.8;

  return { score, reason: reasons[0] || null };
}

function SuggestionCard({ work, reason, index }) {
  const Icon = TYPE_ICONS[work.type] || FileText;
  const color = TYPE_COLORS[work.type] || "#667085";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Link
        to={`/WorkDetail?id=${work.id}`}
        className="flex items-center gap-3.5 p-3.5 rounded-[14px] border group transition-all hover:shadow-sm"
        style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
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
          {reason && (
            <p className="text-[11px] mt-0.5 font-medium" style={{ color: "#8B5CF6" }}>
              ✦ {reason}
            </p>
          )}
        </div>

        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" style={{ color: "var(--text-muted)" }} />
      </Link>
    </motion.div>
  );
}

export default function MoodSuggestions({ works, enVeille, onAddWork }) {
  const preferredTypes = getTimeSlotTypes();

  // 3 dernières œuvres Visionné pour anti-répétition
  const recentlyWatched = useMemo(() =>
    works
      .filter(isFinished)
      .sort((a, b) => new Date(b.finished_at || b.updated_date || 0) - new Date(a.finished_at || a.updated_date || 0))
      .slice(0, 3),
    [works]
  );

  const recentGenres = useMemo(() => {
    const s = new Set();
    recentlyWatched.forEach(w => (w.genre || []).forEach(g => s.add(g)));
    return s;
  }, [recentlyWatched]);

  const recentTypes = useMemo(() => {
    const s = new Set();
    recentlyWatched.forEach(w => s.add(w.type));
    return s;
  }, [recentlyWatched]);

  // Pool = En veille uniquement, exclure ce qui est En cours
  const inProgressIds = useMemo(() =>
    new Set(works.filter(w => effectiveStatus(w) === "En cours").map(w => w.id)),
    [works]
  );

  const suggestions = useMemo(() => {
    const pool = enVeille.filter(w => !inProgressIds.has(w.id));

    return pool
      .map(w => ({ work: w, ...scoreWork(w, recentGenres, recentTypes, preferredTypes) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [enVeille, recentGenres, recentTypes, preferredTypes, inProgressIds]);

  const slotLabel = getTimeSlotLabel();

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
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#8B5CF6" }} />
          <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
            Selon ton humeur
          </span>
        </div>
        <span className="text-[11px] capitalize px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(139,92,246,0.08)", color: "#8B5CF6" }}>
          {slotLabel}
        </span>
      </div>

      {suggestions.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-[13px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
            Pas assez d'œuvres en veille.
          </p>
          <p className="text-[12px] mb-3" style={{ color: "var(--text-muted)" }}>
            Ajoute des œuvres en veille pour des suggestions personnalisées.
          </p>
          <button
            onClick={onAddWork}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12px] font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "rgba(139,92,246,0.1)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.25)" }}
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter une œuvre
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {suggestions.map(({ work, reason }, i) => (
              <SuggestionCard key={work.id} work={work} reason={reason} index={i} />
            ))}
          </div>
          {enVeille.length < 3 && (
            <p className="text-[11px] mt-3 text-center" style={{ color: "var(--text-muted)" }}>
              Ajoute d'autres œuvres en veille pour affiner les suggestions.
            </p>
          )}
        </>
      )}
    </div>
  );
}