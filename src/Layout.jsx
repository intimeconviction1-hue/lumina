import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import BottomNav from "./components/layout/BottomNav";
import WorkFormModal from "./components/works/WorkFormModal";
import FiltersPanel from "./components/works/FiltersPanel";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useWorks } from "@/hooks/useWorks";
import { useWorkMutations } from "@/hooks/useWorkMutations";
import { normalizeNavStatus } from "@/lib/statusActions";

const CHILD_SCREENS = ["WorkDetail"]; // pages that get a back button on mobile

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("cg-dark-mode");
    // Par défaut : mode clair. Dark mode uniquement si explicitement activé.
    return saved === "true";
  });
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (q) => {
    setSearchQuery(q);
    // Naviguer vers AllWorks si on n'y est pas déjà
    if (q && currentPageName !== "AllWorks") {
      navigate("/AllWorks");
    }
  };
  const [showFilters, setShowFilters] = useState(false);
  const [showAddWork, setShowAddWork] = useState(false);
  const [editingWork, setEditingWork] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchRef = useRef(null);
  const isChildScreen = CHILD_SCREENS.includes(currentPageName);
  const [filters, setFilters] = useState({
    type: "", status: [], genre: [], platform: [], tags: [], year_min: "", year_max: "",
    favorite: false, min_rating: "", priority: "", sort: "-created_date",
  });


  const { updateWork, createWork } = useWorkMutations();

  // Écoute navigation sidebar avec filtre
  useEffect(() => {
    const handler = (e) => {
      const { status, clear } = e.detail || {};
      if (clear) {
        setFilters({ type: "", status: [], genre: [], platform: [], tags: [], year_min: "", year_max: "", favorite: false, min_rating: "", priority: "", sort: "-created_date" });
      } else if (status) {
        // Normalise les statuts legacy (ex. "En veille" → "À voir"), en préservant "Lu".
        const normalizedStatus = normalizeNavStatus(status);
        setFilters({ type: "", status: [normalizedStatus], genre: [], platform: [], tags: [], year_min: "", year_max: "", favorite: false, min_rating: "", priority: "", sort: "-created_date" });
      }
    };
    window.addEventListener("sidebar-filter", handler);
    return () => window.removeEventListener("sidebar-filter", handler);
  }, []);

  // Raccourcis clavier globaux
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable;
      if (e.key === "/" && !isInput) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "n" && !isInput) {
        e.preventDefault();
        setEditingWork(null);
        setShowAddWork(true);
      }
      if (e.key === "Escape") {
        if (searchRef.current === document.activeElement) searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { data: works = [] } = useWorks();
  const worksAll = works;

  const allTags = React.useMemo(() => {
    const s = new Set();
    works.forEach(w => (w.tags || []).forEach(t => s.add(t)));
    return [...s].sort();
  }, [works]);

  // Migration des données déjà effectuée lors de l'import Neon — plus rien à lancer ici.

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("cg-dark-mode", String(darkMode));
  }, [darkMode]);

  const handleSaveWork = async (data) => {
    // useWorkMutations gère l'invalidation + le toast d'erreur.
    if (editingWork) await updateWork(editingWork.id, data);
    else await createWork(data);
    setShowAddWork(false);
    setEditingWork(null);
  };

  const childProps = {
    searchQuery,
    filters,
    onFiltersChange: setFilters,
    onEditWork: (work) => { setEditingWork(work); setShowAddWork(true); },
    onAddWork: () => { setEditingWork(null); setShowAddWork(true); },
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: "var(--bg)" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar desktop */}
      <div className="hidden lg:block">
        <Sidebar currentPage={currentPageName} darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} />
      </div>

      {/* Sidebar mobile */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar currentPage={currentPageName} darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} />
      </div>

      {/* Main */}
      <div className="lg:ml-[272px] min-h-screen flex flex-col">
        {/* Mobile header: back button for child screens, hidden on main screens */}
        {isChildScreen ? (
          <div className="lg:hidden flex items-center px-4 pt-4 pb-0">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-[13px] font-medium"
              style={{ color: "var(--text-secondary)", backgroundColor: "var(--surface)", border: "1px solid var(--border)", userSelect: "none" }}
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          </div>
        ) : null}

        <Header
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onOpenFilters={() => setShowFilters(true)}
          onAddWork={() => { setEditingWork(null); setShowAddWork(true); }}
          searchRef={searchRef}
          works={works}
        />

        <main className="flex-1 px-3 py-4 lg:px-8 lg:py-8 pb-24 lg:pb-8">
          {React.isValidElement(children) ? React.cloneElement(children, childProps) : children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />

      <WorkFormModal
        open={showAddWork}
        onClose={() => { setShowAddWork(false); setEditingWork(null); }}
        work={editingWork}
        onSave={handleSaveWork}
      />

      <FiltersPanel
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={setFilters}
        works={worksAll}
      />
    </div>
  );
}