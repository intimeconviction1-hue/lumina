import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Search, Film, Tv, BookOpen, Radio, Mic, Video, FileText, X } from "lucide-react";

const TYPE_ICONS = {
  film: Film, série: Tv, livre: BookOpen, documentaire: Radio,
  podcast: Mic, vidéo: Video, article: FileText,
};
const TYPE_COLORS = {
  film: "#0B2545", série: "#D4AF37", livre: "#6366F1",
  documentaire: "#2AA6A0", podcast: "#475569", vidéo: "#475569", article: "#475569",
};

function fuzzyMatch(query, text) {
  if (!text) return false;
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (t.includes(q)) return true;
  if (q.length >= 4) {
    for (let i = 0; i < q.length; i++) {
      const variant = q.slice(0, i) + q.slice(i + 1);
      if (t.includes(variant)) return true;
    }
  }
  return false;
}

export default function SearchBar({ value, onChange, works = [], searchRef }) {
  const [focused, setFocused] = useState(false);
  const [rect, setRect] = useState(null);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  const suggestions = React.useMemo(() => {
    if (!value || value.length < 2) return [];
    const matched = works.filter(w =>
      fuzzyMatch(value, w.title) ||
      fuzzyMatch(value, w.creator) ||
      fuzzyMatch(value, w.creator_name) ||
      (w.genre || []).some(g => fuzzyMatch(value, g))
    );
    return matched.slice(0, 7);
  }, [value, works]);

  const suggestedTypes = React.useMemo(() => {
    if (!value || value.length < 2) return [];
    const q = value.toLowerCase();
    return Object.keys(TYPE_ICONS).filter(t => t.includes(q));
  }, [value]);

  const showDropdown = focused && value.length >= 1 && (suggestions.length > 0 || suggestedTypes.length > 0 || value.length >= 2);

  // Mesure la position du champ pour positionner le portail
  useLayoutEffect(() => {
    if (!showDropdown) return;
    const update = () => {
      if (containerRef.current) setRect(containerRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [showDropdown, value]);

  // Fermeture au clic en dehors (champ + panneau portail)
  useEffect(() => {
    const handler = (e) => {
      const inContainer = containerRef.current && containerRef.current.contains(e.target);
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!inContainer && !inDropdown) setFocused(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectWork = (work) => { onChange(work.title); setFocused(false); };
  const selectType = (type) => { onChange(type); setFocused(false); };

  const dropdown = showDropdown && rect ? createPortal(
    <div
      ref={dropdownRef}
      className="rounded-[14px] overflow-hidden"
      style={{
        position: "fixed",
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-elevated)",
      }}
    >
      {suggestedTypes.length > 0 && (
        <div className="px-3 pt-3 pb-1">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: "var(--text-muted)" }}>
            Catégories
          </p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {suggestedTypes.map(t => {
              const Icon = TYPE_ICONS[t];
              return (
                <button key={t} onClick={() => selectType(t)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-all capitalize"
                  style={{ borderColor: `${TYPE_COLORS[t]}40`, backgroundColor: `${TYPE_COLORS[t]}10`, color: TYPE_COLORS[t] }}>
                  <Icon className="w-3 h-3" />
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className={suggestedTypes.length > 0 ? "border-t" : ""} style={{ borderColor: "var(--border)" }}>
          <div className="px-3 pt-2.5 pb-1">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
              Résultats ({suggestions.length})
            </p>
          </div>
          {suggestions.map(w => {
            const Icon = TYPE_ICONS[w.type] || Film;
            const color = TYPE_COLORS[w.type] || "#667085";
            return (
              <button
                key={w.id}
                onClick={() => selectWork(w)}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--bg)"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <div className="w-8 h-10 rounded-[6px] overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: `${color}18` }}>
                  {w.cover_image
                    ? <img src={w.cover_image} alt="" className="w-full h-full object-cover" />
                    : <Icon className="w-4 h-4" style={{ color }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{w.title}</p>
                  <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                    {w.creator || w.creator_name || w.type}{w.year ? ` · ${w.year}` : ""}
                  </p>
                </div>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 capitalize"
                  style={{ backgroundColor: `${color}12`, color }}>
                  {w.type}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {suggestions.length === 0 && suggestedTypes.length === 0 && value.length >= 2 && (
        <div className="px-4 py-4 text-center">
          <p className="text-[12.5px]" style={{ color: "var(--text-muted)" }}>Aucun résultat pour «&nbsp;{value}&nbsp;»</p>
        </div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-lg mx-auto">
      <Search
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[14px] h-[14px] z-10 pointer-events-none"
        style={{ color: focused ? "#D4AF37" : "var(--text-muted)" }}
      />
      <input
        ref={searchRef}
        type="text"
        placeholder="Titre, auteur, genre, type…"
        value={value}
        onChange={e => { onChange(e.target.value); setFocused(true); }}
        onFocus={() => setFocused(true)}
        onKeyDown={e => { if (e.key === "Enter") setFocused(false); }}
        className="w-full pl-9 pr-10 py-2.5 text-[13px] outline-none transition-all border"
        style={{
          backgroundColor: "var(--bg)",
          borderColor: focused ? "rgba(212,175,55,0.5)" : "var(--border)",
          borderRadius: "var(--radius-input)",
          color: "var(--text-primary)",
          boxShadow: focused ? "0 0 0 3px rgba(212,175,55,0.08)" : "none",
        }}
      />
      {value && (
        <button
          onClick={() => { onChange(""); setFocused(false); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
          style={{ backgroundColor: "var(--border)" }}
        >
          <X className="w-2.5 h-2.5" style={{ color: "var(--text-muted)" }} />
        </button>
      )}
      {!value && (
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-semibold pointer-events-none"
          style={{ backgroundColor: "var(--border)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
          /
        </kbd>
      )}
      {dropdown}
    </div>
  );
}