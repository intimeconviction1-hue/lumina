import React, { useState } from "react";
import WorkCard from "./WorkCard";
import { LayoutGrid, List, Star, Calendar, Type, SortDesc } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { typeIcons, typeColors, statusConfig } from "./WorkCard";

function WorkRow({ work, onEdit, onDelete, onStatusChange, onToggleFavorite, index }) {
  const TypeIcon = typeIcons[work.type] || (() => null);
  const tColor   = typeColors[work.type] || "#C9A84C";
  const sConfig  = statusConfig[work.status] || statusConfig["À voir"];
  const displayYear = work.year || work.released_year;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.02, 0.25) }}
      className="flex items-center gap-4 px-4 py-3 rounded-[12px] group transition-all"
      style={{
        backgroundColor: "var(--card-bg)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(229,107,58,0.3)"; e.currentTarget.style.boxShadow = "var(--shadow-card)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
    >
      {/* Type indicator — large emoji */}
      <div className="flex-shrink-0 w-8 flex items-center justify-center">
        <span className="text-[20px] leading-none" title={work.type}>
          {work.type === "livre" ? "📚" : work.type === "film" ? "🎬" : work.type === "série" ? "📺" : work.type === "documentaire" ? "🎙️" : work.type === "podcast" ? "🎧" : work.type === "vidéo" ? "▶️" : "📄"}
        </span>
      </div>

      <Link to={`/WorkDetail?id=${work.id}`} className="flex-shrink-0">
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
          <Link to={`/WorkDetail?id=${work.id}`}>
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
        <span className="hidden sm:inline">{work.status}</span>
      </span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={() => onToggleFavorite?.(work)}
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ color: work.favorite ? "#EC4899" : "var(--text-muted)" }}>
          <span className="text-[13px]">{work.favorite ? "♥" : "♡"}</span>
        </button>
        <button onClick={() => onEdit?.(work)}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70"
          style={{ color: "var(--text-secondary)" }}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button onClick={() => onDelete?.(work)}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-red-400 transition-colors"
          style={{ color: "var(--text-muted)" }}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

const SORT_OPTIONS = [
  { key: "-created_date", label: "Récents",     icon: Calendar },
  { key: "-rating",       label: "Mieux notés", icon: Star },
  { key: "title",         label: "A → Z",       icon: Type },
  { key: "-year",         label: "Année ↓",     icon: SortDesc },
];

export default function WorksGrid({ works, onEdit, onDelete, onStatusChange, onToggleFavorite, onFilter, emptyMessage, emptySubtext, activeTab, selectMode = false, selectedIds = new Set(), onToggleSelect }) {
  const [viewMode, setViewMode] = useState("grid");
  const [sortKey, setSortKey]   = useState("-created_date");

  const sorted = [...works].sort((a, b) => {
    if (sortKey === "-rating")  return (b.rating || 0) - (a.rating || 0);
    if (sortKey === "title")    return (a.title || "").localeCompare(b.title || "", "fr");
    if (sortKey === "-year")    return (b.year || b.released_year || 0) - (a.year || a.released_year || 0);
    return 0;
  });

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
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium transition-all"
              style={{
                backgroundColor: sortKey === key ? "rgba(229,107,58,0.1)" : "var(--card-bg)",
                color: sortKey === key ? "#E56B3A" : "var(--text-secondary)",
                border: `1px solid ${sortKey === key ? "rgba(229,107,58,0.4)" : "var(--border)"}`,
              }}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center rounded-[10px] overflow-hidden"
          style={{ border: "1px solid var(--border)", backgroundColor: "var(--card-bg)" }}>
          {[
            { mode: "grid", Icon: LayoutGrid },
            { mode: "list", Icon: List },
          ].map(({ mode, Icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
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