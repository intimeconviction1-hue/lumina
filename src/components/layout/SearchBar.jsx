import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
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

export default function SearchBar({ value, onChange, onSelectType, works = [], searchRef }) {
  const navigate = useNavigate();
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [rect, setRect] = useState(null);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  const suggestedTypes = Object.keys(TYPE_ICONS).filter(type =>
    value.trim().length > 1 && type === value.trim().toLowerCase());
  const suggestions = value.trim().length >= 2 ? works.slice(0, 6) : [];
  const showDropdown = focused && value.trim().length >= 2;

  // Mesure la position du champ pour positionner le portail
  useLayoutEffect(() => {
    if (!showDropdown) return;
    const update = () => {
      if (containerRef.current) setRect(containerRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
    };
  }, [showDropdown]);

  // Fermeture au clic en dehors (champ + panneau portail)
  useEffect(() => {
    const handler = (e) => {
      const inContainer = containerRef.current && containerRef.current.contains(e.target);
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!inContainer && !inDropdown) setFocused(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  const selectWork = (work) => {
    finishSearch();
    navigate("/WorkDetail?id=" + encodeURIComponent(work.id));
  };
  const selectType = (type) => {
    finishSearch();
    onSelectType(type);
  };

  const finishSearch = () => {
    setFocused(false);
    setActiveIndex(-1);
    searchRef.current?.blur();
  };

  const handleKeys = event => {
    if (event.nativeEvent.isComposing) return;
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && showDropdown && suggestions.length) {
      event.preventDefault();
      const index = event.key === "ArrowDown" ? (activeIndex + 1) % suggestions.length
        : (activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1);
      setActiveIndex(index);
      document.getElementById(`catalogue-suggestion-${index}`)?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" || event.key === "Escape") {
      event.preventDefault();
      if (event.key === "Enter" && showDropdown && suggestions[activeIndex]) selectWork(suggestions[activeIndex]);
      else finishSearch();
    }
  };

  const dropdown = showDropdown && rect ? createPortal(
    <div
      ref={dropdownRef}
      className="rounded-[14px] overflow-y-auto overscroll-contain"
      style={{
        position: "fixed",
        top: rect.bottom + 6,
        left: window.innerWidth < 640 ? 8 : rect.left,
        width: window.innerWidth < 640 ? window.innerWidth - 16 : rect.width,
        maxHeight: Math.max(80, (window.visualViewport?.height || window.innerHeight) - rect.bottom - 14),
        zIndex: 45,
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
              Suggestions
            </p>
          </div>
          <div id="catalogue-suggestions" role="listbox" aria-label="Suggestions du catalogue">
            {suggestions.map((w, index) => {
              const Icon = TYPE_ICONS[w.type] || Film;
              const color = TYPE_COLORS[w.type] || "#667085";
              return (
                <button
                  key={w.id}
                  id={`catalogue-suggestion-${index}`}
                  role="option"
                  tabIndex={-1}
                  aria-selected={activeIndex === index}
                  onClick={() => selectWork(w)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg)] aria-selected:bg-[var(--bg)]"
                  style={{ color: "var(--text-primary)" }}
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
        </div>
      )}

      {suggestions.length > 0 && (
        <button type="button" onClick={finishSearch}
          className="flex min-h-11 w-full items-center justify-center border-t px-4 py-2 text-sm font-semibold"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
          Voir les {works.length} résultat{works.length > 1 ? "s" : ""}
        </button>
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
    <div ref={containerRef} className="relative min-w-0 flex-1 max-w-lg mx-auto">
      <Search
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[14px] h-[14px] z-10 pointer-events-none"
        style={{ color: focused ? "#D4AF37" : "var(--text-muted)" }}
      />
      <input
        ref={searchRef}
        type="text"
        role="combobox"
        aria-expanded={showDropdown && suggestions.length > 0}
        aria-controls={showDropdown && rect && suggestions.length ? "catalogue-suggestions" : undefined}
        aria-activedescendant={showDropdown && rect && suggestions[activeIndex] ? `catalogue-suggestion-${activeIndex}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        maxLength={180}
        enterKeyHint="search"
        aria-label="Rechercher dans la bibliothèque"
        placeholder="Rechercher…"
        value={value}
        onChange={e => { onChange(e.target.value); setFocused(true); setActiveIndex(-1); }}
        onFocus={() => { setFocused(true); setActiveIndex(-1); }}
        onKeyDown={handleKeys}
        className="w-full min-h-11 pl-9 pr-11 py-2 text-base lg:text-sm outline-none transition-all border"
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
          type="button"
          aria-label="Effacer la recherche"
          onClick={() => { onChange(""); setActiveIndex(-1); searchRef.current?.focus(); }}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
        >
          <X className="w-2.5 h-2.5" style={{ color: "var(--text-muted)" }} />
        </button>
      )}
      {!value && (
        <kbd className="hidden lg:block absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-semibold pointer-events-none"
          style={{ backgroundColor: "var(--border)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
          /
        </kbd>
      )}
      {dropdown}
    </div>
  );
}