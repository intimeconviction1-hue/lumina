import React, { useState, useEffect, useLayoutEffect, useRef, Suspense } from "react";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import BottomNav from "./components/layout/BottomNav";
import WorkFormModal from "./components/works/WorkFormModal";
import FiltersPanel from "./components/works/FiltersPanel";
import { useNavigate, useLocation, useNavigationType } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { worksApi } from "@/api/works";
import { toast } from "@/components/ui/use-toast";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft } from "lucide-react";
import { useWorks } from "@/hooks/useWorks";
import { useWorkMutations } from "@/hooks/useWorkMutations";

const CHILD_SCREENS = ["WorkDetail"]; // pages that get a back button on mobile
const EMPTY_FILTERS = {
  type: "", status: [], genre: [], platform: [], tags: [], year_min: "", year_max: "",
  favorite: false, min_rating: "", priority: "", sort: "-created_date",
};

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (navigationType !== "POP") window.scrollTo(0, 0);
  }, [location.key, navigationType]);
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
  const [filters, setFilters] = useState(EMPTY_FILTERS);


  const { update, create } = useWorkMutations();
  const queryClient = useQueryClient();
  const editRequest = useRef(null);

  useEffect(() => () => { editRequest.current = null; }, [location.key]);

  const openEdit = async (work) => {
    const request = {};
    editRequest.current = request;
    try {
      const details = await queryClient.fetchQuery({
        queryKey: ["work", work.id],
        queryFn: ({ signal }) => worksApi.get(work.id, signal),
        retry: false,
      });
      if (editRequest.current !== request) return;
      setEditingWork(details);
      setShowAddWork(true);
    } catch (error) {
      if (editRequest.current === request) {
        toast({ title: "Impossible d’ouvrir la fiche", description: error.message });
      }
    }
  };

  const openAdd = () => {
    editRequest.current = null;
    setEditingWork(null);
    setShowAddWork(true);
  };

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
        editRequest.current = null;
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
    if (editingWork) await update.mutateAsync({ id: editingWork.id, patch: data });
    else await create.mutateAsync(data);
    setShowAddWork(false);
    setEditingWork(null);
  };

  const childProps = {
    searchQuery,
    filters,
    onFiltersChange: setFilters,
    onEditWork: openEdit,
    onAddWork: openAdd,
  };

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: "var(--bg)" }}>
      {/* Sidebar desktop — le wrapper porte tout le positionnement fixe ; Sidebar lui-même n'est plus qu'un flex simple. */}
      <div className="hidden lg:block fixed left-0 top-0 bottom-0 z-40">
        <Sidebar currentPage={currentPageName} darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} />
      </div>

      <Dialog.Root open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content
            id="mobile-navigation"
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 w-[min(19rem,100vw)] outline-none"
            onCloseAutoFocus={event => {
              event.preventDefault();
              menuRef.current?.focus();
            }}
          >
            <Dialog.Title className="sr-only">Navigation Lumina</Dialog.Title>
            <Sidebar currentPage={currentPageName} darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} onNavigate={() => {
              setSearchQuery("");
              setSidebarOpen(false);
            }} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Main */}
      <div className="lg:ml-[272px] min-h-screen flex flex-col">
        {/* Mobile header: back button for child screens, hidden on main screens */}
        {isChildScreen ? (
          <div className="lg:hidden flex items-center px-4 pt-4 pb-0">
            <button
              onClick={() => window.history.state?.idx > 0 ? navigate(-1) : navigate("/AllWorks", { replace: true })}
              className="flex items-center gap-2 min-h-11 px-3 py-2 rounded-[10px] text-[13px] font-medium"
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
          onOpenFilters={() => {
            if (currentPageName !== "AllWorks") {
              setFilters(EMPTY_FILTERS);
              setSearchQuery("");
              navigate("/AllWorks");
            }
            setShowFilters(true);
          }}
          onAddWork={openAdd}
          onOpenSidebar={() => setSidebarOpen(v => !v)}
          sidebarOpen={sidebarOpen}
          menuRef={menuRef}
          searchRef={searchRef}
          works={works}
        />

        <main className="lumina-main min-w-0 flex-1 px-3 py-4 lg:px-8 lg:py-8">
          <Suspense fallback={
            <div className="flex items-center justify-center py-24">
              <div className="w-6 h-6 border-2 rounded-full animate-spin"
                style={{ borderColor: "var(--border)", borderTopColor: "var(--text-secondary)" }} />
            </div>
          }>
            {React.isValidElement(children) ? React.cloneElement(children, childProps) : children}
          </Suspense>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav onNavigate={() => setSearchQuery("")} />

      <WorkFormModal
        open={showAddWork}
        onClose={() => { setShowAddWork(false); setEditingWork(null); }}
        work={editingWork}
        onSave={handleSaveWork}
        onAddGqSelection={ids => create.mutateAsync({ gqDocumentaries: ids })}
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
