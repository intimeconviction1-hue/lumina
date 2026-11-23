import { paletteText } from "@/lib/palette";
import React from "react";
import { SlidersHorizontal, Plus, User, Menu, X } from "lucide-react";
import SearchBar from "./SearchBar";
import HeaderClock from "./HeaderClock";

export default function Header({ searchQuery, onSearchChange, onSelectType, onOpenFilters, onAddWork, onOpenSidebar, sidebarOpen, menuRef, searchRef, works = [] }) {
  return (
    <header
      className="sticky top-0 z-30 flex flex-wrap items-center gap-x-2 gap-y-1.5 px-2 py-2 sm:px-4 lg:flex-nowrap lg:px-6 lg:py-3.5"
      style={{
        backgroundColor: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
      }}
    >
      {/* Menu (mobile only) — seul point d'accès à la Sidebar (Lus, Pas sorti, Audit, Tags, mode sombre…) sur petit écran. */}
      <button
        ref={menuRef}
        type="button"
        onClick={onOpenSidebar}
        aria-expanded={sidebarOpen}
        aria-controls={sidebarOpen ? "mobile-navigation" : undefined}
        className="lg:hidden flex-shrink-0 w-11 h-11 touch-manipulation rounded-[10px] flex items-center justify-center"
        style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg)", border: "1px solid var(--border)" }}
        aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
      >
        {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Search with autocomplete */}
      <SearchBar
        value={searchQuery}
        onChange={onSearchChange}
        onSelectType={onSelectType}
        works={works}
        searchRef={searchRef}
      />

      <HeaderClock />

      {/* Right utilities */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          aria-label="Filtrer la bibliothèque"
          onClick={onOpenFilters}
          className="flex items-center gap-1.5 justify-center min-h-11 min-w-11 touch-manipulation lg:px-3 py-2.5 text-[12.5px] font-medium transition-all border"
          style={{
            borderRadius: "var(--radius-btn)",
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
            backgroundColor: "var(--surface)",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(229,107,58,0.4)"; e.currentTarget.style.color = paletteText("#E56B3A"); e.currentTarget.style.backgroundColor = "rgba(229,107,58,0.06)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.backgroundColor = "var(--surface)"; }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Filtrer</span>
        </button>

        <button
          type="button"
          aria-label="Ajouter une œuvre"
          onClick={onAddWork}
          className="flex items-center gap-1.5 justify-center min-h-11 min-w-11 touch-manipulation lg:px-4 py-2.5 text-[12.5px] font-semibold text-[#23150e] transition-all motion-safe:active:scale-95"
          style={{
            borderRadius: "var(--radius-btn)",
            backgroundColor: "#E56B3A",
            boxShadow: "0 2px 8px rgba(229,107,58,0.3)",
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ajouter</span>
        </button>

        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "rgba(229,107,58,0.1)", border: "1.5px solid rgba(229,107,58,0.25)" }}
        >
          <User className="w-3.5 h-3.5" style={{ color: paletteText("#E56B3A") }} />
        </div>
      </div>
    </header>
  );
}
