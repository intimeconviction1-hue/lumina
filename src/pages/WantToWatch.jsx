import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useWorks } from "@/hooks/useWorks";
import { useWorkMutations } from "@/hooks/useWorkMutations";
import { effectiveStatus } from "@/lib/statusActions";
import { Flame, Clock, AlarmClock, BookOpen, Film, Tv, Mic, Video, FileText, Radio, Play, Heart, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PRIORITY_CONFIG = {
  urgent:      { label: "Urgent",     color: "#EF4444", bg: "rgba(239,68,68,0.08)",    icon: Flame,      dot: "#EF4444", order: 0 },
  normal:      { label: "Normal",     color: "#D4AF37", bg: "rgba(212,175,55,0.08)",   icon: Clock,      dot: "#D4AF37", order: 1 },
  "plus tard": { label: "Plus tard",  color: "#6366F1", bg: "rgba(99,102,241,0.08)",   icon: AlarmClock, dot: "#6366F1", order: 2 },
};

const TYPE_ICONS = {
  film: Film, série: Tv, livre: BookOpen,
  documentaire: Video, podcast: Mic, vidéo: Video, article: FileText, radio: Radio,
};
const TYPE_COLORS = {
  film: "#0B2545", série: "#D4AF37", livre: "#6366F1",
  documentaire: "#2AA6A0", podcast: "#475569", vidéo: "#475569", article: "#475569",
};

const PRIORITY_ORDER = ["urgent", "normal", "plus tard"];

function PriorityBadge({ priority, onClick, small }) {
  const conf = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
  const Icon = conf.icon;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full font-semibold transition-all border ${small ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[11.5px]"}`}
      style={{ backgroundColor: conf.bg, color: conf.color, borderColor: `${conf.color}30` }}
      title="Changer la priorité"
    >
      <Icon className={small ? "w-2.5 h-2.5" : "w-3 h-3"} />
      {conf.label}
    </button>
  );
}

function WantCard({ work, onEdit, onDelete, onPriorityChange, onToggleFavorite }) {
  const TypeIcon = TYPE_ICONS[work.type] || FileText;
  const tColor = TYPE_COLORS[work.type] || "#667085";
  const [menuOpen, setMenuOpen] = useState(false);

  const cyclePriority = () => {
    const priorities = PRIORITY_ORDER;
    const current = priorities.indexOf(work.priority || "normal");
    const next = priorities[(current + 1) % priorities.length];
    onPriorityChange(work, next);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="rounded-[16px] overflow-hidden border cinema-card group relative"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--card-bg)", boxShadow: "var(--shadow-card)" }}
    >
      {/* Cover */}
      <Link to={`/WorkDetail?id=${work.id}`} className="block relative" style={{ aspectRatio: "2/3" }}>
        {work.cover_image ? (
          <img src={work.cover_image} alt={work.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2"
            style={{ background: `linear-gradient(145deg, ${tColor}18 0%, ${tColor}30 100%)` }}>
            <TypeIcon className="w-8 h-8" style={{ color: tColor }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: tColor }}>{work.type}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* Priority badge top-left */}
        <div className="absolute top-2 left-2">
          <PriorityBadge priority={work.priority || "normal"} onClick={(e) => { e.preventDefault(); cyclePriority(); }} small />
        </div>
        {/* Favorite */}
        <button
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{ backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { e.preventDefault(); onToggleFavorite(work); }}
        >
          <Heart className={`w-3.5 h-3.5 ${work.favorite ? "fill-[#EC4899] text-[#EC4899]" : "text-white"}`} />
        </button>
      </Link>

      {/* Info */}
      <div className="p-3">
        <p className="text-[12.5px] font-semibold leading-tight line-clamp-2" style={{ color: "var(--text-primary)" }}>{work.title}</p>
        {(work.creator || work.creator_name) && (
          <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{work.creator || work.creator_name}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10.5px] font-medium capitalize" style={{ color: tColor }}>{work.type}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(work)}
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
              style={{ backgroundColor: "var(--bg)" }}>
              <Pencil className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
            </button>
            <button onClick={() => onDelete(work)}
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-red-50"
              style={{ backgroundColor: "var(--bg)" }}>
              <Trash2 className="w-3 h-3 text-red-400" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function WantToWatch({ onEditWork, onAddWork }) {
  const { updateWork, removeWork } = useWorkMutations();
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedType, setSelectedType] = useState("");

  const { data: works = [], isLoading } = useWorks();

  const wantToWatch = useMemo(() =>
    works.filter(w => effectiveStatus(w) === "À voir"),
    [works]
  );

  const filtered = useMemo(() => {
    let r = [...wantToWatch];
    if (selectedPriority !== "all") r = r.filter(w => (w.priority || "normal") === selectedPriority);
    if (selectedType) r = r.filter(w => w.type === selectedType);
    return r;
  }, [wantToWatch, selectedPriority, selectedType]);

  // Group by priority
  const grouped = useMemo(() => {
    const groups = {};
    PRIORITY_ORDER.forEach(p => { groups[p] = []; });
    filtered.forEach(w => {
      const p = w.priority || "normal";
      if (groups[p]) groups[p].push(w);
    });
    return groups;
  }, [filtered]);

  // Optimistic + rollback + toast + invalidation gérés par useWorkMutations.
  const handlePriorityChange = (work, newPriority) => updateWork(work.id, { priority: newPriority });
  const handleDelete = (work) => removeWork(work.id);
  const handleToggleFavorite = (work) => updateWork(work.id, { favorite: !work.favorite });

  const urgentCount = wantToWatch.filter(w => (w.priority || "normal") === "urgent").length;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.16em]" style={{ color: "#C9A84C" }}>✦ Liste de souhaits</span>
        <div className="flex items-end justify-between mt-0.5 flex-wrap gap-3">
          <div>
            <h2 className="text-[26px] font-bold" style={{ color: "var(--text-primary)" }}>Envie de voir</h2>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              {wantToWatch.length} œuvre{wantToWatch.length !== 1 ? "s" : ""} à découvrir
              {urgentCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
                  <Flame className="w-3 h-3" /> {urgentCount} urgent{urgentCount > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onAddWork}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "#D4AF37", color: "#0B2545", boxShadow: "0 2px 10px rgba(212,175,55,0.3)" }}
          >
            + Ajouter une œuvre
          </button>
        </div>
      </div>

      {/* Filtres rapides */}
      <div className="sticky top-[60px] z-20 -mx-1 px-1 pb-3 pt-1 mb-1" style={{ backgroundColor: "var(--bg)" }}>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Priorité */}
          <button onClick={() => setSelectedPriority("all")}
            className="px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all"
            style={{
              borderColor: selectedPriority === "all" ? "#D4AF37" : "var(--border)",
              backgroundColor: selectedPriority === "all" ? "rgba(212,175,55,0.1)" : "var(--card-bg)",
              color: selectedPriority === "all" ? "#B8942E" : "var(--text-secondary)",
            }}>
            Toutes
          </button>
          {PRIORITY_ORDER.map(p => {
            const conf = PRIORITY_CONFIG[p];
            const count = wantToWatch.filter(w => (w.priority || "normal") === p).length;
            return (
              <button key={p} onClick={() => setSelectedPriority(p === selectedPriority ? "all" : p)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all"
                style={{
                  borderColor: selectedPriority === p ? conf.color : "var(--border)",
                  backgroundColor: selectedPriority === p ? conf.bg : "var(--card-bg)",
                  color: selectedPriority === p ? conf.color : "var(--text-secondary)",
                }}>
                <conf.icon className="w-3 h-3" />
                {conf.label}
                <span className="text-[10px] font-bold opacity-70">({count})</span>
              </button>
            );
          })}
          <span className="w-px h-4" style={{ backgroundColor: "var(--border)" }} />
          {/* Types */}
          {["film", "série", "livre", "documentaire"].map(t => {
            const count = wantToWatch.filter(w => w.type === t).length;
            if (!count) return null;
            return (
              <button key={t} onClick={() => setSelectedType(selectedType === t ? "" : t)}
                className="px-2.5 py-1.5 rounded-full text-[11.5px] font-medium border transition-all capitalize"
                style={{
                  borderColor: selectedType === t ? (TYPE_COLORS[t] || "#667085") : "var(--border)",
                  backgroundColor: selectedType === t ? `${TYPE_COLORS[t] || "#667085"}18` : "var(--card-bg)",
                  color: selectedType === t ? (TYPE_COLORS[t] || "#667085") : "var(--text-secondary)",
                }}>
                {t} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="rounded-[16px] overflow-hidden border" style={{ borderColor: "var(--border)" }}>
              <div className="skeleton" style={{ aspectRatio: "2/3" }} />
              <div className="p-3 space-y-2" style={{ backgroundColor: "var(--card-bg)" }}>
                <div className="skeleton h-3 w-4/5" />
                <div className="skeleton h-2.5 w-3/5" />
              </div>
            </div>
          ))}
        </div>
      ) : wantToWatch.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)" }}>
            <Play className="w-7 h-7" style={{ color: "#D4AF37" }} />
          </div>
          <p className="text-[16px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Votre liste est vide</p>
          <p className="text-[13px] mb-5" style={{ color: "var(--text-muted)" }}>Ajoutez des œuvres à regarder plus tard</p>
          <button onClick={onAddWork}
            className="px-5 py-2.5 rounded-[12px] text-[13px] font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "#D4AF37", color: "#0B2545" }}>
            + Ajouter une œuvre
          </button>
        </div>
      ) : selectedPriority !== "all" ? (
        /* Vue filtrée plate */
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map(w => (
              <WantCard key={w.id} work={w} onEdit={onEditWork} onDelete={handleDelete}
                onPriorityChange={handlePriorityChange} onToggleFavorite={handleToggleFavorite} />
            ))}
          </div>
        </AnimatePresence>
      ) : (
        /* Vue groupée par priorité */
        <div className="space-y-8">
          {PRIORITY_ORDER.map(p => {
            const group = grouped[p];
            if (!group.length) return null;
            const conf = PRIORITY_CONFIG[p];
            const Icon = conf.icon;
            return (
              <div key={p}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 rounded-[9px] flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: conf.bg }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: conf.color }} />
                  </div>
                  <h3 className="text-[14px] font-bold" style={{ color: conf.color }}>{conf.label}</h3>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: conf.bg, color: conf.color }}>
                    {group.length}
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: `${conf.color}20` }} />
                </div>
                <AnimatePresence mode="popLayout">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {group.map(w => (
                      <WantCard key={w.id} work={w} onEdit={onEditWork} onDelete={handleDelete}
                        onPriorityChange={handlePriorityChange} onToggleFavorite={handleToggleFavorite} />
                    ))}
                  </div>
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}