import { EMPTY_FILTERS, SORT_OPTIONS, defaultSort, filterCatalogue, normalizeCatalogueText, searchCatalogue } from "@/lib/catalogue";
import React, { useMemo, useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { RotateCcw, Heart, Check, SlidersHorizontal } from "lucide-react";
import { TYPE_COLORS } from "@/lib/statusActions";

const STATUSES = ["À voir", "En cours", "Visionné", "Pas sorti", "Envie de lire", "Lu"];
const TYPES = ["film", "série", "livre", "documentaire", "podcast", "vidéo", "article"];
const STATUS_COLORS = {
  "À voir":        "#94A3B8",
  "En cours":      "#D4AF37",
  "Visionné":      "#2AA6A0",
  "Pas sorti":     "#6366F1",
  "Envie de lire": "#8B5CF6",
  "Lu":            "#22C55E",
};

const Section = ({ label, children }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2.5" style={{ color: "#7A8FA6" }}>{label}</p>
    {children}
  </div>
);

const Chip = ({ label, active, color, onClick, count }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className="flex items-center gap-1 min-h-10 max-w-full break-all px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all capitalize"
    style={{
      borderColor: active ? (color || "#D4AF37") : "rgba(255,255,255,0.12)",
      backgroundColor: active ? `${color || "#D4AF37"}22` : "rgba(255,255,255,0.05)",
      color: active ? (color || "#D4AF37") : "rgba(255,255,255,0.6)",
      boxShadow: active ? `0 0 0 1px ${color || "#D4AF37"}55` : "none",
    }}
  >
    {active && <span className="w-1.5 h-1.5 rounded-full mr-0.5" style={{ backgroundColor: color || "#D4AF37" }} />}
    {label}
    {count !== undefined && (
      <span className="text-[10px] ml-0.5 opacity-60">{count}</span>
    )}
  </button>
);

function FacetChoices({ label, choices, selected, onToggle, color, prefix = "" }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const term = normalizeCatalogueText(query);
  const matching = choices.filter(([name]) => normalizeCatalogueText(name).includes(term));
  const visible = expanded ? matching : matching.slice(0, 12);
  const displayed = [...selected.filter(name => !visible.some(([choice]) => choice === name))
    .map(name => [name, choices.find(([choice]) => choice === name)?.[1] || 0]), ...visible];
  if (!displayed.length && !choices.length) return null;

  return (
    <Section label={label}>
      {choices.length > 12 && (
        <input type="search" value={query} onChange={event => setQuery(event.target.value)}
          aria-label={`Rechercher dans ${label.toLowerCase()}`} placeholder="Rechercher…"
          className="mb-2 min-h-11 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-base" />
      )}
      <div className="flex flex-wrap gap-1.5">
        {displayed.map(([name, count]) => (
          <Chip key={name} label={prefix + name} count={count} color={color}
            active={selected.includes(name)} onClick={() => onToggle(name)} />
        ))}
      </div>
      {term && !matching.length && <p className="text-xs text-white/60">Aucun choix correspondant.</p>}
      {matching.length > 12 && (
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}
          className="mt-1 min-h-10 rounded px-2 text-sm text-white underline underline-offset-4">
          {expanded ? "Voir moins" : `Voir les ${matching.length} choix`}
        </button>
      )}
    </Section>
  );
}

const PRIORITIES = [
  { value: "urgent",    label: "🔥 Urgent",    color: "#EF4444" },
  { value: "normal",    label: "⭐ Normal",    color: "#D4AF37" },
  { value: "plus tard", label: "🕐 Plus tard", color: "#6366F1" },
];

export default function FiltersPanel({ open, onClose, filters, onFiltersChange, works = [], searchQuery = "", showResultCount }) {
  // Local staging state — changes here don't propagate until "Appliquer"
  const [local, setLocal] = useState(filters);

  // Sync local when panel opens (picks up external filter changes)
  useEffect(() => {
    if (open) setLocal(filters);
  }, [open]);

  const upd = (k, v) => setLocal(prev => ({ ...prev, [k]: v }));
  const toggleArr = (k, v) => setLocal(prev => {
    const arr = prev[k] || [];
    return { ...prev, [k]: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] };
  });

  const applyFilters = () => {
    onFiltersChange({ ...local });
    onClose();
  };

  const resetFilters = () => {
    setLocal({ ...EMPTY_FILTERS, sort: defaultSort(searchQuery) });
  };

  const isDirty = JSON.stringify(local) !== JSON.stringify(filters);
  const resultCount = useMemo(() => open && showResultCount
    ? searchCatalogue(filterCatalogue(works, local), searchQuery).length
    : null, [open, showResultCount, works, local, searchQuery]);

  const facets = useMemo(() => {
    const counts = { genre: new Map(), tags: new Map(), platform: new Map() };
    for (const work of works) {
      for (const [key, count] of Object.entries(counts)) {
        for (const value of new Set([work[key]].flat().filter(Boolean))) {
          count.set(value, (count.get(value) || 0) + 1);
        }
      }
    }
    return Object.fromEntries(Object.entries(counts).map(([key, count]) =>
      [key, [...count].sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b, "fr"))]));
  }, [works]);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        aria-describedby={undefined}
        className="lumina-filter-sheet w-[min(100vw,360px)] h-dvh flex flex-col p-0 overflow-hidden"
        style={{ backgroundColor: "#0B2040", borderLeft: "1px solid rgba(255,255,255,0.08)", color: "#EEF2F8" }}
      >
        {/* Header */}
        <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between gap-2 pr-7">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" style={{ color: "#D4AF37" }} />
              <SheetTitle className="text-[15px] font-bold text-white">Filtres</SheetTitle>
            </div>
            <button onClick={resetFilters}
              className="flex items-center gap-1.5 min-h-10 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{ color: "#94A3B8", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <RotateCcw className="w-3 h-3" /> Réinitialiser
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-6" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>

          {/* Sort */}
          <Section label="Trier par">
            <div className="flex flex-col gap-0.5">
              {SORT_OPTIONS.map(o => {
                const isActive = (local.sort || "-created_date") === o.value;
                return (
                  <button key={o.value} onClick={() => upd("sort", o.value)}
                    className="text-left px-3 py-2 rounded-[8px] text-[12.5px] font-medium transition-all flex items-center justify-between"
                    style={{
                      backgroundColor: isActive ? "rgba(212,175,55,0.12)" : "transparent",
                      color: isActive ? "#D4AF37" : "rgba(255,255,255,0.55)",
                    }}>
                    {o.label}
                    {isActive && <Check className="w-3.5 h-3.5" style={{ color: "#D4AF37" }} />}
                  </button>
                );
              })}
            </div>
          </Section>

          <div className="h-px" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />

          {/* Status */}
          <Section label="Statut">
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map(s => (
                <Chip key={s} label={s} color={STATUS_COLORS[s]}
                  active={(local.status || []).includes(s)}
                  onClick={() => toggleArr("status", s)} />
              ))}
            </div>
          </Section>

          {/* Priorité */}
          <Section label="Priorité">
            <div className="flex flex-wrap gap-1.5">
              {PRIORITIES.map(p => (
                <Chip key={p.value} label={p.label} color={p.color}
                  active={local.priority === p.value}
                  onClick={() => upd("priority", local.priority === p.value ? "" : p.value)} />
              ))}
            </div>
          </Section>

          {/* Type */}
          <Section label="Type">
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map(t => (
                <Chip key={t} label={t} color={TYPE_COLORS[t] || "#6366F1"}
                  active={local.type === t}
                  onClick={() => upd("type", local.type === t ? "" : t)} />
              ))}
            </div>
          </Section>

          <FacetChoices label="Genres" choices={facets.genre} selected={local.genre}
            onToggle={value => toggleArr("genre", value)} />
          <FacetChoices label="Plateformes" choices={facets.platform} selected={local.platform}
            onToggle={value => toggleArr("platform", value)} color="#2AA6A0" />
          <FacetChoices label="Tags" choices={facets.tags} selected={local.tags}
            onToggle={value => toggleArr("tags", value)} color="#8B5CF6" prefix="#" />

          {/* Year range */}
          <Section label="Période">
            <div className="flex items-center gap-2">
              <input type="number" aria-label="Année minimale" value={local.year_min || ""}
                onChange={e => upd("year_min", e.target.value)}
                placeholder="1930"
                className="min-w-0 flex-1 px-3 py-2 text-[13px] rounded-xl focus:outline-none"
                style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#EEF2F8" }}
              />
              <span className="text-sm" style={{ color: "#4A6080" }}>→</span>
              <input type="number" aria-label="Année maximale" value={local.year_max || ""}
                onChange={e => upd("year_max", e.target.value)}
                placeholder="2030"
                className="min-w-0 flex-1 px-3 py-2 text-[13px] rounded-xl focus:outline-none"
                style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#EEF2F8" }}
              />
            </div>
          </Section>

          {/* Rating */}
          <Section label="Note minimum">
            <div className="flex gap-1 flex-wrap">
              {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(n => (
                <button key={n} onClick={() => upd("min_rating", local.min_rating === n ? "" : n)}
                  className="px-2 py-1.5 rounded-lg text-[11.5px] font-medium border transition-all"
                  style={{
                    borderColor: local.min_rating >= n ? "#D4AF37" : "rgba(255,255,255,0.1)",
                    backgroundColor: local.min_rating >= n ? "rgba(212,175,55,0.15)" : "transparent",
                    color: local.min_rating >= n ? "#D4AF37" : "rgba(255,255,255,0.4)",
                  }}>
                  {Number.isInteger(n) ? `${n}★` : `${n}☆`}
                </button>
              ))}
            </div>
          </Section>

          {/* Favorites */}
          <button onClick={() => upd("favorite", !local.favorite)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] border w-full text-[13px] font-medium transition-all"
            style={{
              borderColor: local.favorite ? "#EC4899" : "rgba(255,255,255,0.1)",
              color: local.favorite ? "#EC4899" : "rgba(255,255,255,0.5)",
              backgroundColor: local.favorite ? "rgba(236,72,153,0.1)" : "transparent",
            }}>
            <Heart className={`w-4 h-4 ${local.favorite ? "fill-[#EC4899]" : ""}`} />
            {local.favorite ? "Favoris uniquement ✓" : "Favoris seulement"}
          </button>
        </div>

        {/* Sticky footer — Apply button */}
        <div className="px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#071830" }}>
          <button
            type="button"
            onClick={applyFilters}
            className="w-full py-3 rounded-[12px] text-[14px] font-bold transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor: isDirty ? "#E56B3A" : "#2AA6A0",
              color: "#ffffff",
              boxShadow: isDirty ? "0 4px 16px rgba(229,107,58,0.4)" : "0 4px 16px rgba(42,166,160,0.3)",
            }}
          >
            <Check className="w-4 h-4" />
            {resultCount === null ? (isDirty ? "Appliquer les filtres" : "Voir les résultats")
              : `Afficher ${resultCount} résultat${resultCount !== 1 ? "s" : ""}`}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}