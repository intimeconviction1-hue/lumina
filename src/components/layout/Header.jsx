import React from "react";
import { SlidersHorizontal, Plus, User, BookMarked } from "lucide-react";
import SearchBar from "./SearchBar";

export default function Header({ searchQuery, onSearchChange, onOpenFilters, onAddWork, searchRef, works = [] }) {
  return (
    <header
      className="sticky top-0 z-50 flex items-center gap-2 px-4 py-2.5 lg:px-6 lg:py-3.5"
      style={{
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #E8E4DF",
        boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
      }}
    >
      {/* Logo zone (mobile only) */}
      <div className="flex items-center gap-2.5 lg:hidden flex-shrink-0">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#E56B3A" }}>
          <BookMarked className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-[13px] font-bold hidden sm:inline" style={{ color: "#1E1E24" }}>Ma Culture</span>
      </div>

      {/* Search with autocomplete */}
      <SearchBar
        value={searchQuery}
        onChange={onSearchChange}
        works={works}
        searchRef={searchRef}
      />

      {/* Right utilities */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onOpenFilters}
          className="flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-medium transition-all border"
          style={{
            borderRadius: "var(--radius-btn)",
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
            backgroundColor: "var(--surface)",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(229,107,58,0.4)"; e.currentTarget.style.color = "#E56B3A"; e.currentTarget.style.backgroundColor = "rgba(229,107,58,0.06)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8E4DF"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.backgroundColor = "#FFFFFF"; }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Filtrer</span>
        </button>

        <button
          onClick={onAddWork}
          className="flex items-center gap-1.5 px-4 py-2.5 text-[12.5px] font-semibold text-white transition-all"
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
          <User className="w-3.5 h-3.5" style={{ color: "#E56B3A" }} />
        </div>
      </div>
    </header>
  );
}