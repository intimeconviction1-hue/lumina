import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, LayoutGrid, Clock, Eye, Sun, Moon, Clapperboard, Calendar, Bookmark, Trash2, PlayCircle, BookOpen, ShieldAlert, BookImage } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useWorks } from "@/hooks/useWorks";
import { worksApi } from "@/api/works";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const navItems = [
  { label: "Accueil", icon: Home, path: "/", exact: true },
  { label: "Bibliothèque", icon: LayoutGrid, path: "/AllWorks" },
  { label: "Envie de voir",  icon: Bookmark,  path: "/WantToWatch",                        color: "#EC4899" },
  { label: "Envie de lire", icon: BookOpen,  path: "/AllWorks?status=Envie+de+lire",       color: "#8B5CF6" },
  { label: "En cours",   icon: Clock,    path: "/AllWorks?status=En+cours",        color: "#D4AF37" },
  { label: "Visionné",   icon: Eye,       path: "/AllWorks?status=Visionn%C3%A9",   color: "#2AA6A0" },
  { label: "Pas sorti",  icon: Calendar,  path: "/AllWorks?status=Pas+sorti",       color: "#6366F1" },
  { label: "Audit",      icon: ShieldAlert, path: "/Audit",                            color: "#E56B3A" },
  { label: "Enrichissement", icon: BookImage, path: "/Enrichissement",                  color: "#6366F1" },
];

const TOP_GENRES = ["juifs", "polar", "procès", "cinéma", "biopic", "histoire"];
const GENRE_COLORS = ["#8B5CF6", "#0B2545", "#D4AF37", "#2AA6A0", "#EC4899", "#6366F1"];

export default function Sidebar({ currentPage, darkMode, onToggleDark }) {
  const navigate = useNavigate();
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const { data: works = [] } = useWorks();

  // Compute top genres dynamically, with priority order
  const genreCounts = {};
  works.forEach(w => (w.genre || []).forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; }));
  const topGenres = TOP_GENRES
    .filter(g => genreCounts[g] > 0)
    .concat(
      Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([g]) => g)
        .filter(g => !TOP_GENRES.includes(g))
    )
    .slice(0, 6);

  const queryClient = useQueryClient();
  const handleDeleteAccount = async () => {
    await worksApi.list("-created_date", 500).then(async (works) => {
      await Promise.all(works.map(w => worksApi.remove(w.id)));
    });
    queryClient.invalidateQueries({ queryKey: ["works"] });
  };
  const currentPath = window.location.pathname + window.location.search;

  const isActive = (item) => {
    if (item.exact) return window.location.pathname === item.path;
    if (item.path === "/AllWorks" && !item.path.includes("?")) {
      return window.location.pathname === "/AllWorks" && !window.location.search;
    }
    return currentPath === item.path || currentPath.startsWith(item.path);
  };

  const handleNav = (e, item) => {
    e.preventDefault();
    navigate(item.path);
    if (item.path.includes("?status=")) {
      const status = decodeURIComponent(item.path.split("?status=")[1]);
      window.dispatchEvent(new CustomEvent("sidebar-filter", { detail: { status } }));
    } else if (item.path === "/AllWorks") {
      window.dispatchEvent(new CustomEvent("sidebar-filter", { detail: { clear: true } }));
    }
  };

  return (
    <aside
      className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 flex-col"
      style={{
        width: "var(--sidebar-width)",
        backgroundColor: "var(--surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#0B2545" }}
          >
            <Clapperboard className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[14px] font-bold tracking-tight leading-none" style={{ color: "var(--text-primary)" }}>
              Ma Culture
            </p>
            <p className="text-[10px] mt-0.5 font-medium" style={{ color: "var(--text-muted)" }}>Bibliothèque personnelle</p>
          </div>
        </div>
      </div>

      {/* Nav label */}
      <div className="px-5 mb-1.5">
        <span className="text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
          Navigation
        </span>
      </div>

      {/* Navigation */}
      <nav className="px-3 space-y-0.5 mb-2">
        {navItems.map((item) => {
          const active = isActive(item);
          const accentColor = item.color || "#0B2545";
          return (
            <a
              key={item.path}
              href={item.path}
              onClick={e => handleNav(e, item)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[11px] text-[13px] font-medium transition-all"
              style={{
                backgroundColor: active ? `${accentColor}12` : "transparent",
                color: active ? accentColor : "var(--text-secondary)",
                fontWeight: active ? "600" : "500",
                userSelect: "none",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span
                className="w-6 h-6 rounded-[8px] flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: active ? `${accentColor}18` : "transparent" }}
              >
                <item.icon className="w-3.5 h-3.5" style={{ strokeWidth: 1.8, color: active ? accentColor : undefined }} />
              </span>
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* Genres populaires */}
      {topGenres.length > 0 && (
        <div className="px-3 pb-3 flex-1 overflow-y-auto">
          <div className="px-3 mb-1.5">
            <span className="text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
              Genres populaires
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 px-3 pb-1">
            {topGenres.map((g, i) => {
              const color = GENRE_COLORS[i % GENRE_COLORS.length];
              return (
                <button
                  key={g}
                  onClick={() => navigate(`/AllWorks?genre=${encodeURIComponent(g)}`)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium capitalize transition-all hover:opacity-80"
                  style={{ backgroundColor: `${color}12`, color, border: `1px solid ${color}30` }}
                >
                  {g}
                  <span className="ml-1 text-[10px] opacity-60">{genreCounts[g]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation par type */}
      <div className="px-3 pb-3">
        <div className="px-3 mb-1.5">
          <span className="text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
            Par type
          </span>
        </div>
        {[
          { label: "Films",    emoji: "🎬", type: "film",         color: "#0B2545" },
          { label: "Livres",   emoji: "📚", type: "livre",        color: "#6366F1" },
          { label: "Séries",   emoji: "📺", type: "série",        color: "#D4AF37" },
          { label: "Docs",     emoji: "🎙️", type: "documentaire", color: "#2AA6A0" },
        ].map(({ label, emoji, type, color }) => (
          <a
            key={type}
            href={`/AllWorks?type=${encodeURIComponent(type)}`}
            onClick={e => {
              e.preventDefault();
              navigate(`/AllWorks?type=${encodeURIComponent(type)}`);
            }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[12.5px] font-medium transition-all mb-0.5"
            style={{
              color: "var(--text-secondary)",
              userSelect: "none",
              WebkitTapHighlightColor: "transparent",
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${color}10`; e.currentTarget.style.color = color; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            <span className="text-[15px] w-5 text-center leading-none">{emoji}</span>
            {label}
          </a>
        ))}
        <a
          href="https://www.youtube.com/playlist?list=WL"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[12.5px] font-medium transition-all mb-0.5"
          style={{ color: "var(--text-secondary)", userSelect: "none" }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,0,0,0.07)"; e.currentTarget.style.color = "#CC2200"; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          <span className="text-[15px] w-5 text-center leading-none">▶️</span>
          YouTube
        </a>
      </div>

      {/* YouTube link */}
      <div className="px-3 pb-2">
        <div className="px-3 mb-1.5">
          <span className="text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
            Externe
          </span>
        </div>
        <a
          href="https://www.youtube.com/playlist?list=WL"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-[11px] text-[13px] font-medium transition-all hover:opacity-90"
          style={{
            backgroundColor: "rgba(255,0,0,0.07)",
            color: "#CC2200",
            userSelect: "none",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <span
            className="w-6 h-6 rounded-[8px] flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "rgba(255,0,0,0.1)" }}
          >
            <PlayCircle className="w-3.5 h-3.5" style={{ color: "#CC2200", strokeWidth: 1.8 }} />
          </span>
          YouTube — À regarder
        </a>
      </div>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-2">
        <div
          className="px-3 py-3 rounded-[12px]"
          style={{ backgroundColor: "var(--bg)" }}
        >
          <button
            onClick={onToggleDark}
            className="flex items-center gap-2.5 w-full text-[12.5px] font-medium transition-opacity hover:opacity-75"
            style={{ color: "var(--text-secondary)", userSelect: "none" }}
          >
            <span
              className="w-6 h-6 rounded-[8px] flex items-center justify-center"
              style={{ backgroundColor: "var(--border)" }}
            >
              {darkMode
                ? <Sun className="w-3 h-3" style={{ color: "#D4AF37" }} />
                : <Moon className="w-3 h-3" />
              }
            </span>
            {darkMode ? "Mode clair" : "Mode sombre"}
          </button>
        </div>

        <button
          onClick={() => setShowDeleteAccount(true)}
          className="flex items-center gap-2 px-3 py-2.5 w-full rounded-[11px] text-[12px] font-medium transition-all hover:bg-red-50"
          style={{ color: "#EF4444", userSelect: "none" }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Supprimer mon compte
        </button>
      </div>

      <AlertDialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer votre compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes vos œuvres et données seront définitivement supprimées. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}