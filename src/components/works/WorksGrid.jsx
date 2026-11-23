import { paletteText } from "@/lib/palette";
import React, { useEffect, useState } from "react";
import WorkCard from "./WorkCard";
import { LayoutGrid, List, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { typeIcons, typeColors, statusConfig } from "./WorkCard";
import { effectiveStatus } from "@/lib/statusActions";

const PAGE_SIZE = 48;

function WorkRow({ work, onEdit, onDelete, onToggleFavorite }) {
  const TypeIcon = typeIcons[work.type] || (() => null);
  const tColor   = typeColors[work.type] || "#C9A84C";
  const sConfig  = statusConfig[effectiveStatus(work)] || statusConfig["À voir"];
  const displayYear = work.year || work.released_year;

  return (
    <div
      className="flex items-center gap-2 px-2 py-3 sm:gap-4 sm:px-4 rounded-[12px] group transition-all"
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

      <Link to={`/WorkDetail?id=${work.id}`} className="flex-shrink-0">
        <div className="overflow-hidden rounded-[8px]" style={{ width: 38, height: 54 }}>
          {work.cover_image ? (
            <img src={work.cover_image} alt={work.title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: `linear-gradient(145deg, ${tColor}22, ${tColor}44)` }}>
              <TypeIcon className="w-4 h-4" style={{ color: paletteText(tColor) }} />
            </div>
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link to={`/WorkDetail?id=${work.id}`}>
            <span className="break-words text-[13.5px] font-semibold hover:opacity-70 transition-opacity" style={{ color: "var(--text-primary)" }}>
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
        style={{ backgroundColor: `${tColor}18`, color: paletteText(tColor) }}>
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
        style={{ backgroundColor: sConfig.bg, color: paletteText(sConfig.color) }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sConfig.dot }} />
        <span className="hidden sm:inline">{sConfig.label}</span>
      </span>

      <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-opacity flex-shrink-0">
        <button type="button" aria-label={work.favorite ? "Retirer des favoris" : "Ajouter aux favoris"} aria-pressed={Boolean(work.favorite)} onClick={() => onToggleFavorite?.(work)}
          className="w-9 h-10 lg:w-7 lg:h-7 rounded-lg flex items-center justify-center"
          style={{ color: work.favorite ? paletteText("#EC4899") : "var(--text-muted)" }}>
          <span className="text-[13px]">{work.favorite ? "♥" : "♡"}</span>
        </button>
        <button type="button" aria-label="Modifier" onClick={() => onEdit?.(work)}
          className="w-9 h-10 lg:w-7 lg:h-7 rounded-lg flex items-center justify-center hover:opacity-70"
          style={{ color: "var(--text-secondary)" }}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button type="button" aria-label="Supprimer" onClick={() => onDelete?.(work)}
          className="w-9 h-10 lg:w-7 lg:h-7 rounded-lg flex items-center justify-center hover:text-red-400 transition-colors"
          style={{ color: "var(--text-muted)" }}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function WorksGrid({ works, onEdit, onDelete, onStatusChange, onToggleFavorite, onFilter, emptyMessage, emptySubtext, resultScope, selectMode = false, selectedIds = new Set(), onToggleSelect }) {
  const [viewMode, setViewMode] = useState("grid");

  // Le tri est piloté par le panneau de filtres (filters.sort) en amont dans AllWorks.
  // WorksGrid respecte l'ordre reçu — pas de second tri concurrent ici.
  const [limit, setLimit] = useState(PAGE_SIZE);
  useEffect(() => setLimit(PAGE_SIZE), [resultScope]);
  const visibleWorks = works.slice(0, limit);

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
              type="button"
              aria-label={mode === "grid" ? "Vue grille" : "Vue liste"}
              aria-pressed={(selectMode ? "grid" : viewMode) === mode}
              disabled={selectMode}
              onClick={() => setViewMode(mode)}
              className="min-h-11 min-w-11 px-3 py-2 transition-all disabled:opacity-50"
              style={{
                backgroundColor: (selectMode ? "grid" : viewMode) === mode ? "rgba(229,107,58,0.12)" : "transparent",
                color: (selectMode ? "grid" : viewMode) === mode ? "#E56B3A" : "var(--text-muted)",
              }}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>

      {(selectMode || viewMode === "grid") ? (
        <div
          className="relative z-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4"
        >
          {visibleWorks.map((work) => (
            <WorkCard
              key={work.id}
              work={work}
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
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleWorks.map((work) => (
            <WorkRow
              key={work.id}
              work={work}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
      {works.length > PAGE_SIZE && (
        <div className="mt-5 flex flex-col items-center gap-2">
          <p role="status" className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {visibleWorks.length} sur {works.length} œuvres affichées
          </p>
          {visibleWorks.length < works.length && (
            <Button type="button" variant="outline" onClick={() => setLimit(current => current + PAGE_SIZE)}>
              Afficher plus
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
