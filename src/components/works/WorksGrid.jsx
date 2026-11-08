import React, { useState } from "react";
import WorkCard from "./WorkCard";
import WorkCardActions from "./WorkCardActions";
import { LayoutGrid, List, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { typeIcons, typeColors, statusConfig } from "./WorkCard";
import { effectiveStatus } from "@/lib/statusActions";

function WorkRow({ work, onEdit, onDelete, onStatusChange, onToggleFavorite, onOpenWork, index }) {
  const TypeIcon = typeIcons[work.type] || (() => null);
  const tColor   = typeColors[work.type] || "#C9A84C";
  const sConfig  = statusConfig[effectiveStatus(work)] || statusConfig["À voir"];
  const displayYear = work.year || work.released_year;
  const open = event => {
    if (!onOpenWork || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onOpenWork(work);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.02, 0.25) }}
      className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4 px-3 py-2 rounded-[12px] group transition-all"
      style={{
        backgroundColor: "var(--card-bg)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(229,107,58,0.3)"; e.currentTarget.style.boxShadow = "var(--shadow-card)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
    >
      {/* Type indicator — large emoji */}
      <div className="hidden sm:flex flex-shrink-0 w-8 items-center justify-center">
        <span className="text-[20px] leading-none" title={work.type}>
          {work.type === "livre" ? "📚" : work.type === "film" ? "🎬" : work.type === "série" ? "📺" : work.type === "documentaire" ? "🎙️" : work.type === "podcast" ? "🎧" : work.type === "vidéo" ? "▶️" : "📄"}
        </span>
      </div>

      <Link to={`/WorkDetail?id=${work.id}`} onClick={open} className="flex-shrink-0">
        <div className="overflow-hidden rounded-[8px]" style={{ width: 38, height: 54 }}>
          {work.cover_image ? (
            <img src={work.cover_image} alt={work.title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: `linear-gradient(145deg, ${tColor}22, ${tColor}44)` }}>
              <TypeIcon className="w-4 h-4" style={{ color: tColor }} />
            </div>
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link to={`/WorkDetail?id=${work.id}`} onClick={open}>
            <span className="text-[13.5px] font-semibold hover:opacity-70 transition-opacity" style={{ color: "var(--text-primary)" }}>
              {work.title}
            </span>
          </Link>
          {work.favorite && <span className="text-[#EC4899]">♥</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {(work.creator || work.creator_name) && (
            <span className="text-[11.5px]" style={{ color: "var(--text-muted)" }}>
              {work.creator || work.creator_name}
            </span>
          )}
          {displayYear && (
            <>
              <span style={{ color: "var(--border)" }}>·</span>
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{displayYear}</span>
            </>
          )}
          {work.genre?.[0] && (
            <>
              <span style={{ color: "var(--border)" }}>·</span>
              <span className="text-[11px] capitalize" style={{ color: "var(--text-muted)" }}>{work.genre[0]}</span>
            </>
          )}
        </div>
      </div>

      <span className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-[12px] font-semibold capitalize flex-shrink-0"
        style={{ backgroundColor: `${tColor}18`, color: tColor }}>
        <TypeIcon className="w-2.5 h-2.5" />
        {work.type}
      </span>

      <div className="hidden md:flex gap-0.5 flex-shrink-0">
        {work.rating > 0 ? (
          [1,2,3,4,5].map(s => (
            <Star key={s} className="w-3 h-3"
              fill={s <= work.rating ? "#E56B3A" : "transparent"}
              stroke={s <= work.rating ? "#E56B3A" : "var(--text-muted)"} />
          ))
        ) : (
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>—</span>
        )}
      </div>

      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[12px] font-semibold flex-shrink-0"
        style={{ backgroundColor: sConfig.bg, color: sConfig.color }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sConfig.dot }} />
        <span>{sConfig.label}</span>
      </span>

      <div className="w-full sm:w-auto">
        <WorkCardActions work={work} onEdit={onEdit} onDelete={onDelete}
          onStatusChange={onStatusChange} onToggleFavorite={onToggleFavorite} />
      </div>
    </motion.div>
  );
}

export default function WorksGrid({ works, onEdit, onDelete, onStatusChange, onToggleFavorite, onFilter, emptyMessage, emptySubtext, activeTab, selectMode = false, selectedIds = new Set(), onToggleSelect, onOpenWork }) {
  const [preferredView, setViewMode] = useState(() =>
    onOpenWork && localStorage.getItem("lumina-library-view") === "list" ? "list" : "grid"
  );
  const viewMode = selectMode ? "grid" : preferredView;

  // Le tri est piloté par le panneau de filtres (filters.sort) en amont dans AllWorks.
  // WorksGrid respecte l'ordre reçu — pas de second tri concurrent ici.
  const sorted = works;

  if (works.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
          style={{ background: "linear-gradient(135deg, var(--border-subtle), var(--border))" }}>
          <LayoutGrid className="w-9 h-9" style={{ color: "var(--text-muted)" }} />
        </div>
        <p className="text-[15px] font-semibold" style={{ color: "var(--text-secondary)" }}>
          {emptyMessage || "Aucune œuvre trouvée"}
        </p>
        <p className="text-[13px] mt-1.5" style={{ color: "var(--text-muted)" }}>
          {emptySubtext || "Commencez par ajouter une œuvre à votre bibliothèque"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-5 gap-3 flex-wrap">
        <div className="flex items-center rounded-[10px] overflow-hidden"
          style={{ border: "1px solid var(--border)", backgroundColor: "var(--card-bg)" }}>
          {[
            { mode: "grid", Icon: LayoutGrid },
            { mode: "list", Icon: List },
          ].map(({ mode, Icon }) => (
            <button
              key={mode}
              disabled={selectMode}
              aria-label={mode === "grid" ? "Afficher en grille" : "Afficher en liste"}
              aria-pressed={viewMode === mode}
              onClick={() => {
                setViewMode(mode);
                if (onOpenWork) localStorage.setItem("lumina-library-view", mode);
              }}
              className="px-3 py-2 transition-all"
              style={{
                backgroundColor: viewMode === mode ? "rgba(229,107,58,0.12)" : "transparent",
                color: viewMode === mode ? "#E56B3A" : "var(--text-muted)",
              }}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === "grid" ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative z-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4"
          >
            {sorted.map((work, i) => (
              <WorkCard
                key={work.id}
                work={work}
                index={i}
                onOpenWork={onOpenWork}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
                onToggleFavorite={onToggleFavorite}
                onFilter={onFilter}
                selectMode={selectMode}
                selected={selectedIds.has(work.id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-2"
          >
            {sorted.map((work, i) => (
              <WorkRow
                key={work.id}
                work={work}
                index={i}
                onOpenWork={onOpenWork}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}