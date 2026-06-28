import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import WorksGrid from "../components/works/WorksGrid";
import { useWorks, WORKS_KEY } from "@/hooks/useWorks";
import { worksApi } from "@/api/works";
import { StatusButton, TypeButton } from "../components/works/FilterButtons";
import { X, ChevronDown, ChevronUp, CheckSquare, Square } from "lucide-react";
import BulkActionBar from "../components/works/BulkActionBar";
import { useToast } from "@/components/ui/use-toast";
import { STATUS_CONFIG, TYPE_COLORS, effectiveStatus } from "@/lib/statusActions";

const STATUS_COLORS = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.color])
);
const ALL_STATUSES = ["À voir", "En cours", "Visionné", "Pas sorti", "Envie de lire"];
const ALL_TYPES = ["film", "série", "livre", "documentaire", "podcast", "vidéo", "article"];
const QUICK_PLATFORMS = ["Netflix", "Prime Video", "Disney+", "Canal+", "HBO", "Apple TV+", "Arte"];

const GENRE_COLORS_MAP = {
  "juifs": "#8B5CF6", "polar": "#0B2545", "procès": "#D4AF37",
  "cinéma": "#2AA6A0", "biopic": "#EC4899", "histoire": "#6366F1",
  "true crime": "#EF4444", "BD": "#F59E0B",
};

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {[...Array(18)].map((_, i) => (
        <div key={i} className="rounded-[16px] overflow-hidden border" style={{ borderColor: "var(--border)" }}>
          <div className="skeleton" style={{ aspectRatio: "2/3" }} />
          <div className="p-3 space-y-2" style={{ backgroundColor: "var(--card-bg)" }}>
            <div className="skeleton h-3 w-4/5" />
            <div className="skeleton h-2.5 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

const TYPE_TABS = [
  { key: "", label: "Tout", emoji: "✦" },
  { key: "film-série", label: "Films & Séries", emoji: "🎬", color: "#0B2545", types: ["film", "série"] },
  { key: "livre", label: "Livres", emoji: "📚", color: "#6366F1", types: ["livre"] },
];

export default function AllWorks({ searchQuery = "", filters = {}, onFiltersChange, onEditWork }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("");
  const [renderKey] = useState(() => Math.random());

  // Sélection multiple
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleSelectMode = () => {
    setSelectMode(v => !v);
    setSelectedIds(new Set());
  };

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = () => {
    setSelectedIds(new Set(filteredWorks.map(w => w.id)));
  };

  // Consume URL params whenever location.search changes (sidebar nav, redirects from InProgress/Watched/etc.)
  const routerLocation = useLocation();
  React.useEffect(() => {
    const params = new URLSearchParams(routerLocation.search);
    const urlStatus   = params.get("status");
    const urlGenre    = params.get("genre");
    const urlPlatform = params.get("platform");
    const urlType     = params.get("type");
    const urlTag      = params.get("tag");
    const urlPriority = params.get("priority");
    if ((urlStatus || urlGenre || urlPlatform || urlType || urlTag || urlPriority) && onFiltersChange) {
      const base = { type: "", status: [], genre: [], platform: [], tags: [], year_min: "", year_max: "", favorite: false, min_rating: "", priority: "", sort: "-created_date" };
      // Normalise les statuts legacy (ex. "En veille" → "À voir") pour éviter les listes vides.
      const STATUS_ALIASES = { "En veille": "À voir", "terminé": "Visionné", "à découvrir": "À voir", "abandonné": "À voir" };
      if (urlStatus)   base.status   = [STATUS_ALIASES[urlStatus] || urlStatus];
      if (urlGenre)    base.genre    = [urlGenre];
      if (urlPlatform) base.platform = [urlPlatform];
      if (urlType)     base.type     = urlType;
      if (urlTag)      base.tags     = [urlTag];
      if (urlPriority) base.priority = urlPriority;
      onFiltersChange(base);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [routerLocation.search]);

  const toggleStatus = (s) => {
    if (!onFiltersChange) return;
    const arr = filters.status || [];
    onFiltersChange({ ...filters, status: arr.includes(s) ? arr.filter(x => x !== s) : [...arr, s] });
  };
  const toggleType = (t) => {
    if (!onFiltersChange) return;
    onFiltersChange({ ...filters, type: filters.type === t ? "" : t });
  };
  const togglePlatform = (p) => {
    if (!onFiltersChange) return;
    const arr = filters.platform || [];
    onFiltersChange({ ...filters, platform: arr.includes(p) ? arr.filter(x => x !== p) : [...arr, p] });
  };
  const removeFilter = (key, val) => {
    if (!onFiltersChange) return;
    if (key === "status")   onFiltersChange({ ...filters, status:   (filters.status   || []).filter(x => x !== val) });
    else if (key === "type")     onFiltersChange({ ...filters, type: "" });
    else if (key === "genre")    onFiltersChange({ ...filters, genre:    (filters.genre    || []).filter(x => x !== val) });
    else if (key === "platform") onFiltersChange({ ...filters, platform: (filters.platform || []).filter(x => x !== val) });
    else if (key === "tags")     onFiltersChange({ ...filters, tags:     (filters.tags     || []).filter(x => x !== val) });
    else if (key === "favorite") onFiltersChange({ ...filters, favorite: false });
    else if (key === "min_rating") onFiltersChange({ ...filters, min_rating: "" });
    else if (key === "year")     onFiltersChange({ ...filters, year_min: "", year_max: "" });
    else if (key === "priority") onFiltersChange({ ...filters, priority: "" });
  };
  const clearAll = () => {
    if (!onFiltersChange) return;
    onFiltersChange({ type: "", status: [], genre: [], platform: [], tags: [], year_min: "", year_max: "", favorite: false, min_rating: "", priority: "", sort: "-created_date" });
  };

  // Build active filter badges
  const activeFilters = useMemo(() => {
    const list = [];
    (filters.status || []).forEach(s => list.push({ key: "status", val: s, label: s, color: STATUS_COLORS[s] }));
    if (filters.type) list.push({ key: "type", val: filters.type, label: filters.type, color: TYPE_COLORS[filters.type] });
    (filters.genre || []).forEach(g => list.push({ key: "genre", val: g, label: g, color: "#D4AF37" }));
    (filters.platform || []).forEach(p => list.push({ key: "platform", val: p, label: p, color: "#2AA6A0" }));
    (filters.tags || []).forEach(t => list.push({ key: "tags", val: t, label: `#${t}`, color: "#8B5CF6" }));
    if (filters.favorite) list.push({ key: "favorite", val: true, label: "Favoris", color: "#EC4899" });
    if (filters.min_rating) list.push({ key: "min_rating", val: filters.min_rating, label: `≥ ${filters.min_rating}★`, color: "#D4AF37" });
    if (filters.year_min || filters.year_max) list.push({ key: "year", val: "year", label: `${filters.year_min || "…"} → ${filters.year_max || "…"}`, color: "#94A3B8" });
    if (filters.priority) {
      const pl = { urgent: "🔥 Urgent", normal: "Normal", "plus tard": "🕐 Plus tard" }[filters.priority] || filters.priority;
      list.push({ key: "priority", val: filters.priority, label: pl, color: "#EF4444" });
    }
    return list;
  }, [filters]);

  const { data: works = [], isLoading } = useWorks();

  // Counts for tabs
  const tabCounts = useMemo(() => ({
    "film-série": works.filter(w => w.type === "film" || w.type === "série").length,
    "livre": works.filter(w => w.type === "livre").length,
  }), [works]);

  // Apply tab filter on top of existing filters
  const filteredWorks = useMemo(() => {
    let result = [...works];

    // Tab filter (type override from onglets)
    if (activeTab) {
      const tabTypes = activeTab === "film-série" ? ["film", "série"] : [activeTab];
      result = result.filter(w => tabTypes.includes(w.type));
    } else if (filters.type) {
      // No active tab → use type from filters panel
      result = result.filter(w => w.type === filters.type);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(w =>
        w.title?.toLowerCase().includes(q) ||
        w.creator?.toLowerCase().includes(q) ||
        w.creator_name?.toLowerCase().includes(q) ||
        w.genre?.some(g => g.toLowerCase().includes(q))
      );
    }

    // Status: support array (new) or string (legacy).
    // Livres : un "À voir" legacy compte comme "Envie de lire", et "Visionné" comme "Lu".
    if (filters.status?.length > 0) {
      result = result.filter(w => {
        let s = w.status;
        if (w.type === "livre") {
          if (s === "À voir") s = "Envie de lire";
          if (s === "Visionné") s = "Lu";
        }
        return filters.status.includes(s);
      });
    }

    // Priorité (urgent / normal / plus tard) — on exclut les œuvres déjà
    // terminées : une priorité de visionnage ne concerne que ce qui reste à consommer.
    if (filters.priority) {
      result = result.filter(w => {
        if ((w.priority || "normal") !== filters.priority) return false;
        const s = effectiveStatus(w);
        return s !== "Visionné" && s !== "Lu";
      });
    }

    // Genre: multi-select (OR logic within genre, AND between sections)
    if (filters.genre?.length > 0) {
      result = result.filter(w => filters.genre.some(g => (w.genre || []).includes(g)));
    }

    // Platform: multi-select
    if (filters.platform?.length > 0) {
      result = result.filter(w => {
        const wPlat = Array.isArray(w.platform) ? w.platform : (w.platform ? [w.platform] : []);
        return filters.platform.some(p => wPlat.includes(p));
      });
    }

    // Tags: multi-select
    if (filters.tags?.length > 0) {
      result = result.filter(w => filters.tags.some(t => (w.tags || []).includes(t)));
    }

    // Year range
    if (filters.year_min) result = result.filter(w => (w.year || w.released_year || 0) >= Number(filters.year_min));
    if (filters.year_max) result = result.filter(w => (w.year || w.released_year || 9999) <= Number(filters.year_max));

    if (filters.favorite) result = result.filter(w => w.favorite);
    if (filters.min_rating) result = result.filter(w => (w.rating || 0) >= filters.min_rating);

    const sort = filters.sort || "-created_date";
    if (sort === "-rating") result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === "-year") result.sort((a, b) => (b.year || b.released_year || 0) - (a.year || a.released_year || 0));
    else if (sort === "year") result.sort((a, b) => (a.year || a.released_year || 9999) - (b.year || b.released_year || 9999));
    else if (sort === "title") result.sort((a, b) => a.title?.localeCompare(b.title, "fr"));

    return result;
  }, [works, searchQuery, filters, activeTab]);

  const handleDelete = async (work) => {
    queryClient.setQueryData(WORKS_KEY, (old = []) => old.filter(w => w.id !== work.id));
    await worksApi.remove(work.id);
    queryClient.invalidateQueries({ queryKey: WORKS_KEY });
  };

  const handleStatusChange = async (work, newStatus) => {
    queryClient.setQueryData(WORKS_KEY, (old = []) =>
      old.map(w => w.id === work.id ? { ...w, status: newStatus } : w)
    );
    await worksApi.update(work.id, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: WORKS_KEY });
  };

  const handleToggleFavorite = async (work) => {
    const newFav = !work.favorite;
    queryClient.setQueryData(WORKS_KEY, (old = []) =>
      old.map(w => w.id === work.id ? { ...w, favorite: newFav } : w)
    );
    await worksApi.update(work.id, { favorite: newFav });
    queryClient.invalidateQueries({ queryKey: WORKS_KEY });
  };

  const handleBulkApply = async ({ tags, genres, type, status }) => {
    const ids = [...selectedIds];
    const allWorksData = queryClient.getQueryData(WORKS_KEY) || [];

    // Traiter par lots de 25
    for (let i = 0; i < ids.length; i += 25) {
      const batch = ids.slice(i, i + 25);
      await Promise.all(batch.map(id => {
        const work = allWorksData.find(w => w.id === id);
        if (!work) return Promise.resolve();
        const patch = {};
        if (tags.length > 0) patch.tags = [...new Set([...(work.tags || []), ...tags])];
        if (genres.length > 0) patch.genre = [...new Set([...(work.genre || []), ...genres])];
        if (type) patch.type = type;
        if (status) patch.status = status;
        return Object.keys(patch).length > 0 ? worksApi.update(id, patch) : Promise.resolve();
      }));
    }

    queryClient.invalidateQueries({ queryKey: WORKS_KEY });
    toast({ title: `${ids.length} œuvre${ids.length > 1 ? "s" : ""} mise${ids.length > 1 ? "s" : ""} à jour` });
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  return (
    <div key={renderKey} className="max-w-7xl mx-auto">
      {/* Bandeau genre actif */}
      {(filters.genre || []).length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          {(filters.genre || []).map(g => {
            const gc = GENRE_COLORS_MAP[g] || "#C9A84C";
            return (
              <div key={g} className="flex items-center gap-2 px-4 py-2 rounded-[12px] text-[13px] font-bold"
                style={{ backgroundColor: gc, color: "#fff", boxShadow: `0 4px 14px ${gc}50` }}>
                🏷️ Genre : {g}
                <button type="button" onClick={() => removeFilter("genre", g)}
                  className="ml-1 hover:opacity-70 transition-opacity">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.16em]" style={{ color: "#C9A84C" }}>
          ✦ Bibliothèque
        </span>
        <div className="flex items-end justify-between mt-0.5 gap-3 flex-wrap">
          <h2 className="text-[20px] sm:text-[26px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
            Toutes les œuvres
          </h2>
          <div className="flex items-center gap-2 mb-1">
            {selectMode && (
              <button
                type="button"
                onClick={selectAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all"
                style={{ backgroundColor: "rgba(229,107,58,0.1)", color: "#E56B3A", border: "1px solid rgba(229,107,58,0.3)" }}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Tout sélectionner ({filteredWorks.length})
              </button>
            )}
            <button
              type="button"
              onClick={toggleSelectMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all"
              style={{
                backgroundColor: selectMode ? "rgba(229,107,58,0.12)" : "var(--card-bg)",
                color: selectMode ? "#E56B3A" : "var(--text-secondary)",
                border: `1px solid ${selectMode ? "rgba(229,107,58,0.4)" : "var(--border)"}`,
              }}
            >
              {selectMode ? <><X className="w-3.5 h-3.5" /> Annuler</> : <><Square className="w-3.5 h-3.5" /> Sélectionner</>}
            </button>
            {!selectMode && (
              <span className="text-[12.5px] font-semibold" style={{ color: "var(--text-muted)" }}>
                {isLoading ? "Chargement…" : `${filteredWorks.length} œuvre${filteredWorks.length !== 1 ? "s" : ""}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Onglets principaux Films / Livres / Tout */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto flex-nowrap no-scrollbar" style={{ scrollbarWidth: "none" }}>
        {TYPE_TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const count = tab.key === "" ? works.length : tabCounts[tab.key] || 0;
          const color = tab.color || "#C9A84C";
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[13.5px] font-semibold transition-all"
              style={{
                backgroundColor: isActive ? (tab.key === "" ? "rgba(201,168,76,0.12)" : `${color}15`) : "var(--card-bg)",
                color: isActive ? (tab.key === "" ? "#C9A84C" : color) : "var(--text-secondary)",
                border: `1.5px solid ${isActive ? (tab.key === "" ? "rgba(201,168,76,0.4)" : `${color}55`) : "var(--border)"}`,
                boxShadow: isActive ? `0 2px 10px ${tab.key === "" ? "rgba(201,168,76,0.15)" : `${color}20`}` : "none",
              }}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
              <span
                className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: isActive ? (tab.key === "" ? "rgba(201,168,76,0.2)" : `${color}22`) : "var(--border-subtle)",
                  color: isActive ? (tab.key === "" ? "#C9A84C" : color) : "var(--text-muted)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Barre de filtres rapides */}
      <div
        className="-mx-3 px-3 lg:-mx-8 lg:px-8 pb-2 pt-2 mb-3 sticky top-[52px] lg:top-[64px] z-10"
        style={{
          backgroundColor: "var(--bg)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Statuts — scroll horizontal sur mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar" style={{ scrollbarWidth: "none" }}>
          {(activeTab === "livre"
            ? ["Envie de lire", "En cours", "Lu"]
            : activeTab === "film-série"
            ? ["À voir", "En cours", "Visionné", "Pas sorti"]
            : ALL_STATUSES
          ).map(s => {
            const active = (filters.status || []).includes(s);
            // Côté livres, "Envie de lire" s'affiche "À lire".
            const label = s === "Envie de lire" ? "À lire" : s;
            return (
              <StatusButton
                key={`status-${s}`}
                status={s}
                label={label}
                active={active}
                onClick={() => toggleStatus(s)}
              />
            );
          })}
        </div>

        {/* Types — scroll horizontal sur mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar" style={{ scrollbarWidth: "none" }}>
          {ALL_TYPES.map(t => {
            const active = filters.type === t;
            return (
              <TypeButton
                key={`type-${t}`}
                type={t}
                active={active}
                onClick={() => toggleType(t)}
              />
            );
          })}
          {/* Bouton Plateformes inline */}
          <button
            onClick={() => setShowMoreFilters(v => !v)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-[11px] font-semibold border transition-all"
            style={{
              borderColor: showMoreFilters ? "#8B5CF6" : "var(--border)",
              backgroundColor: showMoreFilters ? "rgba(139,92,246,0.1)" : "var(--card-bg)",
              color: showMoreFilters ? "#8B5CF6" : "var(--text-secondary)",
            }}>
            {showMoreFilters ? "−" : "+"} Plateformes
          </button>
        </div>

        {/* Plateformes (expandable) — scroll horizontal */}
        {showMoreFilters && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar" style={{ scrollbarWidth: "none" }}>
            {QUICK_PLATFORMS.map(p => {
              const active = (filters.platform || []).includes(p);
              return (
                <button key={p} onClick={() => togglePlatform(p)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-[10px] text-[11px] font-semibold border transition-all"
                  style={{
                    borderColor: active ? "#2AA6A0" : "var(--border)",
                    backgroundColor: active ? "rgba(42,166,160,0.15)" : "var(--card-bg)",
                    color: active ? "#2AA6A0" : "var(--text-secondary)",
                  }}>
                  {p}
                </button>
              );
            })}
          </div>
        )}

        {/* Filtres actifs — scroll horizontal sur mobile */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t no-scrollbar" style={{ borderColor: "var(--border-subtle)", scrollbarWidth: "none" }}>
            {activeFilters.map((f, i) => (
              <span key={i}
                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: `${f.color}15`, color: f.color, border: `1px solid ${f.color}35` }}>
                {f.label}
                <button onClick={() => removeFilter(f.key, f.val)} className="hover:opacity-70 transition-opacity ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button onClick={clearAll}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all"
              style={{ borderColor: "rgba(239,68,68,0.3)", color: "#EF4444", backgroundColor: "rgba(239,68,68,0.06)" }}>
              <X className="w-3 h-3" /> Tout effacer
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <SkeletonGrid />
      ) : filteredWorks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
            style={{ background: "linear-gradient(135deg, var(--border-subtle), var(--border))" }}
          >
            <span className="text-4xl">🔍</span>
          </div>
          <p className="text-[16px] font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            Aucun résultat
          </p>
          <p className="text-[13px] mb-5 max-w-xs" style={{ color: "var(--text-muted)" }}>
            Aucune œuvre ne correspond à vos filtres actuels. Essayez d'élargir votre recherche.
          </p>
          <button
            onClick={clearAll}
            className="px-4 py-2.5 rounded-[12px] text-[13px] font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "rgba(229,107,58,0.1)", color: "#E56B3A", border: "1.5px solid rgba(229,107,58,0.3)" }}
          >
            Effacer tous les filtres
          </button>
        </div>
      ) : (
        <WorksGrid
          works={filteredWorks}
          onEdit={onEditWork}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onToggleFavorite={handleToggleFavorite}
          onFilter={(key, val) => {
            if (!onFiltersChange) return;
            if (key === "genre") onFiltersChange({ ...filters, genre: [...(filters.genre || []), val].filter((v, i, a) => a.indexOf(v) === i) });
            else if (key === "platform") onFiltersChange({ ...filters, platform: [...(filters.platform || []), val].filter((v, i, a) => a.indexOf(v) === i) });
            else if (key === "tag") onFiltersChange({ ...filters, tags: [...(filters.tags || []), val].filter((v, i, a) => a.indexOf(v) === i) });
          }}
          activeTab={activeTab}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      )}

      {selectMode && selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onApply={handleBulkApply}
          onCancel={() => { setSelectMode(false); setSelectedIds(new Set()); }}
        />
      )}
    </div>
  );
}