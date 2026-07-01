import React, { useMemo, useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RotateCcw, Heart, Check, SlidersHorizontal } from "lucide-react";
import { TYPE_COLORS } from "@/lib/statusActions";

const STATUSES = ["À voir", "En cours", "Visionné", "Pas sorti", "Envie de lire"];
const PLATFORMS = ["Netflix", "Prime Video", "Disney+", "Canal+", "HBO", "Apple TV+", "Arte", "FranceTV", "Ciné", "OneDrive", "Yggtorrent", "Khan Israël", "IKROMI", "Lenny", "OKRU"];
const TYPES = ["film", "série", "livre", "documentaire", "podcast", "vidéo", "article"];
const SORT_OPTIONS = [
  { value: "-created_date", label: "Plus récents" },
  { value: "-year", label: "Année (récent → ancien)" },
  { value: "year", label: "Année (ancien → récent)" },
  { value: "-rating", label: "Mieux notés" },
  { value: "title", label: "Alphabétique" },
];

const STATUS_COLORS = {
  "À voir":        "#94A3B8",
  "En cours":      "#D4AF37",
  "Visionné":      "#2AA6A0",
  "Pas sorti":     "#6366F1",
  "Envie de lire": "#8B5CF6",
};

const EMPTY_FILTERS = {
  type: "", status: [], genre: [], platform: [], tags: [],
  year_min: "", year_max: "", favorite: false, min_rating: "", priority: "", sort: "-created_date",
};

const Section = ({ label, children }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2.5" style={{ color: "#7A8FA6" }}>{label}</p>
    {children}
  </div>
);

const Chip = ({ label, active, color, onClick, count }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all capitalize"
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

function countFilters(f) {
  return [
    ...(f.status || []),
    f.type ? [f.type] : [],
    ...(f.genre || []),
    ...(f.platform || []),
    ...(f.tags || []),
    f.priority ? ["priority"] : [],
    f.favorite ? ["fav"] : [],
    f.min_rating ? ["rating"] : [],
    (f.year_min || f.year_max) ? ["year"] : [],
  ].flat().length;
}

const PRIORITIES = [
  { value: "urgent",    label: "🔥 Urgent",    color: "#EF4444" },
  { value: "normal",    label: "⭐ Normal",    color: "#D4AF37" },
  { value: "plus tard", label: "🕐 Plus tard", color: "#6366F1" },
];

export default function FiltersPanel({ open, onClose, filters, onFiltersChange, works = [] }) {
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
    setTimeout(() => onClose(), 0);
  };

  const resetFilters = () => {
    setLocal(EMPTY_FILTERS);
    onFiltersChange(EMPTY_FILTERS);
  };

  const pendingCount = countFilters(local);
  const isDirty = JSON.stringify(local) !== JSON.stringify(filters);

  // Build dynamic genre list from works
  const allGenres = useMemo(() => {
    const counts = {};
    works.forEach(w => (w.genre || []).forEach(g => { counts[g] = (counts[g] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([g]) => g);
  }, [works]);

  const genreCount = (g) => works.filter(w => (w.genre || []).includes(g)).length;

  // Tags dynamiques (triés par fréquence), comme les genres
  const allTags = useMemo(() => {
    const counts = {};
    works.forEach(w => (w.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [works]);
  const tagCount = (t) => works.filter(w => (w.tags || []).includes(t)).length;
  const platformCount = (p) => works.filter(w => {
    const pl = Array.isArray(w.platform) ? w.platform : (w.platform ? [w.platform] : []);
    return pl.includes(p);
  }).length;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        className="lumina-filter-sheet w-[320px] flex flex-col p-0 overflow-hidden"
        style={{ backgroundColor: "#0B2040", borderLeft: "1px solid rgba(255,255,255,0.08)", color: "#EEF2F8" }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" style={{ color: "#D4AF37" }} />
              <SheetTitle className="text-[15px] font-bold text-white">Filtres</SheetTitle>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: "#E56B3A", minWidth: 18, textAlign: "center" }}>
                  {pendingCount}
                </span>
              )}
            </div>
            <button onClick={resetFilters}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{ color: "#94A3B8", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <RotateCcw className="w-3 h-3" /> Réinitialiser
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>

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

          {/* Genre — dynamique */}
          {allGenres.length > 0 && (
            <Section label="Genre">
              <div className="flex flex-wrap gap-1.5">
                {allGenres.map(g => (
                  <Chip key={g} label={g} count={genreCount(g)}
                    active={(local.genre || []).includes(g)}
                    onClick={() => toggleArr("genre", g)} />
                ))}
              </div>
            </Section>
          )}

          {/* Tags — dynamique */}
          {allTags.length > 0 && (
            <Section label="Tags">
              <div className="flex flex-wrap gap-1.5">
                {allTags.map(t => (
                  <Chip key={t} label={`#${t}`} color="#8B5CF6" count={tagCount(t)}
                    active={(local.tags || []).includes(t)}
                    onClick={() => toggleArr("tags", t)} />
                ))}
              </div>
            </Section>
          )}

          {/* Platform */}
          <Section label="Plateforme">
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map(p => {
                const c = platformCount(p);
                return c > 0 ? (
                  <Chip key={p} label={p} color="#2AA6A0" count={c}
                    active={(local.platform || []).includes(p)}
                    onClick={() => toggleArr("platform", p)} />
                ) : null;
              })}
            </div>
          </Section>

          {/* Year range */}
          <Section label="Période">
            <div className="flex items-center gap-2">
              <input type="number" value={local.year_min || ""}
                onChange={e => upd("year_min", e.target.value)}
                placeholder="1930"
                className="flex-1 px-3 py-2 text-[13px] rounded-xl focus:outline-none"
                style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#EEF2F8" }}
              />
              <span className="text-sm" style={{ color: "#4A6080" }}>→</span>
              <input type="number" value={local.year_max || ""}
                onChange={e => upd("year_max", e.target.value)}
                placeholder="2030"
                className="flex-1 px-3 py-2 text-[13px] rounded-xl focus:outline-none"
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
        <div className="px-5 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#071830" }}>
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
            {isDirty ? "Appliquer les filtres" : `Voir les résultats (${pendingCount > 0 ? pendingCount + " filtre" + (pendingCount > 1 ? "s" : "") : "tous"})`}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}