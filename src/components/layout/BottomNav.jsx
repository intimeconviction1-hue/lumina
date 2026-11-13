import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Bookmark, Clock, Eye, Gift } from "lucide-react";

const navItems = [
  { label: "Accueil",     icon: Home,        path: "/",  color: "#E56B3A" },
  { label: "Bibliothèque",icon: LayoutGrid,  path: "/AllWorks",                  color: "#E56B3A" },
  { label: "Envie",       icon: Bookmark,    path: "/WantToWatch",               color: "#EC4899" },
  { label: "En cours",    icon: Clock,       path: "/AllWorks?status=En+cours",  color: "#D4AF37" },
  { label: "Visionné",    icon: Eye,         path: "/AllWorks?status=Visionn%C3%A9", color: "#2AA6A0" },
  { label: "Cadeaux", icon: Gift, path: "/Gifts" },
];

export default function BottomNav({ onNavigate }) {
  const { pathname, search } = useLocation();
  const currentStatus = new URLSearchParams(search).get("status");

  const isActive = item => {
    const [path, query] = item.path.split("?");
    return pathname === path && (path !== "/AllWorks" ||
      currentStatus === new URLSearchParams(query).get("status"));
  };

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch lg:hidden"
      style={{
        backgroundColor: "var(--surface)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -2px 10px rgba(0,0,0,0.10)",
        minHeight: 56,
      }}
    >
      {navItems.map((item) => {
        const active = isActive(item);
        const accentColor = item.color || "#E56B3A";
        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={active ? "page" : undefined}
            onClick={event => {
              if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                window.scrollTo(0, 0);
                onNavigate();
              }
            }}
            className="flex min-h-14 min-w-0 flex-1 touch-manipulation items-center justify-center py-1"
            style={{
              color: active ? accentColor : "var(--text-muted)",
              userSelect: "none",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <div className="flex flex-col items-center gap-0.5">
              <div
                className="w-8 h-7 flex items-center justify-center rounded-full transition-all"
                style={{
                  backgroundColor: active ? `${accentColor}18` : "transparent",
                }}
              >
                <item.icon
                  className="w-4.5 h-4.5"
                  style={{ strokeWidth: active ? 2.3 : 1.6, width: 18, height: 18 }}
                />
              </div>
              <span style={{
                fontSize: "9px",
                fontWeight: active ? 700 : 500,
                letterSpacing: "0.01em",
                color: active ? accentColor : "var(--text-muted)",
              }}>
                {item.label}
              </span>
              <div
                  className="w-1 h-1 rounded-full mt-0.5"
                  style={{ backgroundColor: active ? accentColor : "transparent" }}
              />
            </div>
          </Link>
        );
      })}
    </nav>
  );
}