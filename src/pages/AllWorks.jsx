import React, { useMemo, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import WorksGrid from "../components/works/WorksGrid";
import WorksLoadError from "@/components/works/WorksLoadError";
import { useWorks, WORKS_KEY } from "@/hooks/useWorks";
import { worksApi } from "@/api/works";
import { useWorkMutations } from "@/hooks/useWorkMutations";
import { StatusButton, TypeButton } from "../components/works/FilterButtons";
import { X, CheckSquare, Square, Users, SlidersHorizontal, Flame } from "lucide-react";
import BulkActionBar from "../components/works/BulkActionBar";
import { useToast } from "@/components/ui/use-toast";
import { STATUS_CONFIG, TYPE_COLORS, statusPatch } from "@/lib/statusActions";

import { EMPTY_FILTERS, SORT_OPTIONS, defaultSort, hasPriority } from "@/lib/catalogue";

const STATUS_COLORS = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.color])
);
const ALL_STATUSES = ["À voir", "En cours", "Visionné", "Pas sorti", "Envie de lire", "Lu"];
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
  { key: "film", label: "Films", emoji: "🎬", color: "#0B2545" },
  { key: "série", label: "Séries", emoji: "📺", color: "#2AA6A0" },
  { key: "livre", label: "Livres", emoji: "📚", color: "#6366F1" },
];

export default function AllWorks({ searchQuery = "", matchingWorks = [], filters = {}, onFiltersChange, onEditWork, onDeleteWork, onClearSearch, onOpenFilters }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { updateWork } = useWorkMutations();
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const activeTab = TYPE_TABS.some(tab => tab.key === filters.type) ? filters.type : "";

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
  const clearAll = () => onFiltersChange?.({ ...EMPTY_FILTERS, sort: defaultSort(searchQuery) });

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

  const { data: works = [], isLoading, isError, isFetching, refetch } = useWorks();

  // Counts for tabs
  const tabCounts = useMemo(() => ({
    film: works.filter(w => w.type === "film").length,
    "série": works.filter(w => w.type === "série").length,
    livre: works.filter(w => w.type === "livre").length,
  }), [works]);

  const filteredWorks = useMemo(() => {
    const result = [...matchingWorks];
    const sort = filters.sort || "-created_date";
    if (sort === "-created_date") result.sort((a, b) => String(b.created_date || "").localeCompare(String(a.created_date || "")));
    else if (sort === "urgent") result.sort((a, b) => Number(hasPriority(b, "urgent")) - Number(hasPriority(a, "urgent")));
    else if (sort === "-rating") result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === "-year") result.sort((a, b) => (b.year || b.released_year || 0) - (a.year || a.released_year || 0));
    else if (sort === "year") result.sort((a, b) => (a.year || a.released_year || 9999) - (b.year || b.released_year || 9999));
    else if (sort === "title") result.sort((a, b) => a.title?.localeCompare(b.title, "fr"));

    return result;
  }, [matchingWorks, filters.sort]);

  // Optimistic + rollback + toast d'erreur sont gérés par le hook useWorkMutations.
  const handleStatusChange = (work, newStatus) => updateWork(work.id, statusPatch(work, newStatus));
  const handleToggleFavorite = (work) => updateWork(work.id, { favorite: !work.favorite });

  const handleBulkApply = async ({ tags, genres, type, status }) => {
    const ids = [...selectedIds];
    const allWorksData = queryClient.getQueryData(WORKS_KEY) || [];

    // Construit les patchs et applique une mise à jour optimiste de tout le lot.
    const patches = ids
      .map(id => {
        const work = allWorksData.find(w => w.id === id);
        if (!work) return null;
        const patch = {};
        if (tags.length > 0) patch.tags = [...new Set([...(work.tags || []), ...tags])];
        if (genres.length > 0) patch.genre = [...new Set([...(work.genre || []), ...genres])];
        if (type) patch.type = type;
        if (status) patch.status = status;
        return Object.keys(patch).length > 0 ? { id, patch } : null;
      })
      .filter(Boolean);

    const prevList = queryClient.getQueryData(WORKS_KEY);
    const byId = new Map(patches.map(p => [p.id, p.patch]));
    queryClient.setQueryData(WORKS_KEY, (old = []) =>
      old.map(w => (byId.has(w.id) ? { ...w, ...byId.get(w.id) } : w))
    );

    try {
      // Traiter par lots de 25 pour ne pas saturer le backend serverless.
      for (let i = 0; i < patches.length; i += 25) {
        const batch = patches.slice(i, i + 25);
        await Promise.all(batch.map(({ id, patch }) => worksApi.update(id, patch)));
      }
    } catch (e) {
      // Rollback global si un lot échoue.
      if (prevList !== undefined) queryClient.setQueryData(WORKS_KEY, prevList);
      toast({ title: "Échec de la mise à jour groupée", description: String(e?.message || e) });
      return;
    } finally {
      queryClient.invalidateQueries({ queryKey: WORKS_KEY });
    }

    toast({ title: `${ids.length} œuvre${ids.length > 1 ? "s" : ""} mise${ids.length > 1 ? "s" : ""} à jour` });
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  if (isError) {
    return <WorksLoadError retry={refetch} retrying={isFetching} />;
  }

  return (
    <div className="max-w-7xl mx-auto">
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
              <Link to="/PersonStudies" className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold"
                style={{ borderColor: "var(--border)", color: "var(--text-primary)", backgroundColor: "var(--card-bg)" }}>
                <Users className="h-3.5 w-3.5" aria-hidden="true" /> Études de personnes
              </Link>
            )}
            {!selectMode && (
              <span className="text-[12.5px] font-semibold" style={{ color: "var(--text-muted)" }}>
                {isLoading ? "Chargement…" : `${filteredWorks.length} œuvre${filteredWorks.length !== 1 ? "s" : ""}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Onglets principaux Films / Livres / Tout */}
      <div className="flex items-center gap-2 mb-4 flex-wrap" style={{ scrollbarWidth: "none" }}>
        {TYPE_TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const count = tab.key === "" ? works.length : tabCounts[tab.key] || 0;
          const color = tab.color || "#C9A84C";
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => {
                onFiltersChange?.({ ...filters, type: tab.key });
              }}
              className="flex min-h-11 items-center gap-2 px-3 py-2.5 rounded-[12px] text-[13.5px] font-semibold transition-all"
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
        className="-mx-3 px-3 lg:-mx-8 lg:px-8 pb-2 pt-2 mb-3"
        style={{
          backgroundColor: "var(--bg)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button type="button" aria-pressed={filters.priority === "urgent"}
            onClick={() => onFiltersChange?.({ ...filters, priority: filters.priority === "urgent" ? "" : "urgent" })}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-semibold"
            style={{
              borderColor: filters.priority === "urgent" ? "#ef4444" : "var(--border)",
              background: filters.priority === "urgent" ? "#ef444420" : "var(--card-bg)",
            }}>
            <Flame className="h-4 w-4 text-red-500" /> Urgent
          </button>
          <button type="button" onClick={onOpenFilters}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-semibold"
            style={{ borderColor: "var(--border)", background: "var(--card-bg)" }}>
            <SlidersHorizontal className="h-4 w-4" /> Filtres{activeFilters.length ? ` (${activeFilters.length})` : ""}
          </button>
          <label className="flex min-h-11 min-w-0 items-center gap-2 text-sm">
            Trier
            <select aria-label="Trier" value={filters.sort || EMPTY_FILTERS.sort}
              onChange={event => onFiltersChange?.({ ...filters, sort: event.target.value })}
              className="min-h-11 min-w-0 max-w-full rounded-lg border px-2 text-base sm:text-sm"
              style={{ borderColor: "var(--border)", background: "var(--card-bg)" }}>
              {SORT_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        {/* Statuts */}
        <div className="flex flex-wrap items-center gap-1.5 pb-1.5" style={{ scrollbarWidth: "none" }}>
          {(activeTab === "livre"
            ? ["Envie de lire", "En cours", "Lu"]
            : (activeTab === "film" || activeTab === "série")
            ? ["À voir", "En cours", "Visionné", "Pas sorti"]
            : ALL_STATUSES
          ).map(s => {
            const active = (filters.status || []).includes(s);
            // Côté livres : "Envie de lire" → "À lire" (le reste garde son libellé).
            const label = activeTab === "livre"
              ? (s === "Envie de lire" ? "À lire" : s)
              : s;
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

        {/* Types */}
        <div className="flex flex-wrap items-center gap-1.5 pb-1.5" style={{ scrollbarWidth: "none" }}>
          {(activeTab === "" ? ALL_TYPES : []).map(t => {
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
            type="button"
            aria-expanded={showMoreFilters}
            onClick={() => setShowMoreFilters(v => !v)}
            className="flex-shrink-0 flex items-center gap-1 min-h-10 px-3 py-1.5 rounded-[10px] text-[11px] font-semibold border transition-all"
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
          <div className="flex flex-wrap items-center gap-1.5 pb-1.5" style={{ scrollbarWidth: "none" }}>
            {QUICK_PLATFORMS.map(p => {
              const active = (filters.platform || []).includes(p);
              return (
                <button key={p} type="button" aria-pressed={active} onClick={() => togglePlatform(p)}
                  className="flex-shrink-0 min-h-10 px-3 py-1.5 rounded-[10px] text-[11px] font-semibold border transition-all"
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

        {searchQuery.trim() && (
          <p className="mt-2 text-sm break-words" role="status" style={{ color: "var(--text-secondary)" }}>
            {isLoading ? "Recherche…" : `${filteredWorks.length} résultat${filteredWorks.length !== 1 ? "s" : ""}`} pour « {searchQuery.trim()} »
          </p>
        )}

        {/* Filtres actifs */}
        {activeFilters.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 pb-1">
            {activeFilters.map(f => (
              <button key={`${f.key}:${f.val}`} type="button" onClick={() => removeFilter(f.key, f.val)}
                aria-label={`Retirer le filtre ${f.label}`}
                className="inline-flex min-h-10 max-w-full items-center gap-1.5 break-all rounded-full px-3 py-1 text-[12px] font-semibold"
                style={{ backgroundColor: `${f.color}15`, color: f.color, border: `1px solid ${f.color}35` }}>
                {f.label}<X className="h-3.5 w-3.5 shrink-0" />
              </button>
            ))}
            <button onClick={clearAll}
              className="flex min-h-10 items-center gap-1 px-3 rounded-full text-[11px] font-semibold border transition-all"
              style={{ borderColor: "rgba(239,68,68,0.3)", color: "#EF4444", backgroundColor: "rgba(239,68,68,0.06)" }}>
              <X className="w-3 h-3" /> Effacer les filtres
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
            {activeFilters.length ? "Retirez un filtre pour élargir les résultats." : searchQuery.trim()
              ? "Essayez un autre titre, un nom ou un mot-clé." : "Les œuvres ajoutées apparaîtront ici."}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {activeFilters.length > 0 && (
              <button type="button" onClick={clearAll} className="min-h-11 rounded-xl border px-4 text-sm font-semibold">
                Effacer les filtres
              </button>
            )}
            {searchQuery.trim() && (
              <button type="button" onClick={onClearSearch} className="min-h-11 rounded-xl border px-4 text-sm font-semibold">
                Effacer la recherche
              </button>
            )}
          </div>
        </div>
      ) : (
        <WorksGrid
          works={filteredWorks}
          onEdit={onEditWork}
          onDelete={onDeleteWork}
          onStatusChange={handleStatusChange}
          onToggleFavorite={handleToggleFavorite}
          onFilter={(key, val) => {
            if (!onFiltersChange) return;
            if (key === "genre") onFiltersChange({ ...filters, genre: [...(filters.genre || []), val].filter((v, i, a) => a.indexOf(v) === i) });
            else if (key === "platform") onFiltersChange({ ...filters, platform: [...(filters.platform || []), val].filter((v, i, a) => a.indexOf(v) === i) });
            else if (key === "tag") onFiltersChange({ ...filters, tags: [...(filters.tags || []), val].filter((v, i, a) => a.indexOf(v) === i) });
          }}
          resultScope={JSON.stringify([searchQuery, filters])}
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
