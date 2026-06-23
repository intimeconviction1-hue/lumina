import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Bookmark, Clock, Eye } from "lucide-react";

const navItems = [
  { label: "Accueil",     icon: Home,        path: "/",            exact: true,  color: "#E56B3A" },
  { label: "Bibliothèque",icon: LayoutGrid,  path: "/AllWorks",                  color: "#E56B3A" },
  { label: "Envie",       icon: Bookmark,    path: "/WantToWatch",               color: "#EC4899" },
  { label: "En cours",    icon: Clock,       path: "/AllWorks?status=En+cours",  color: "#D4AF37" },
  { label: "Visionné",    icon: Eye,         path: "/AllWorks?status=Visionn%C3%A9", color: "#2AA6A0" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 40) { setVisible(true); return; }
      setVisible(currentY < lastScrollY.current);
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const currentPath = location.pathname + location.search;

  const isActive = (item) => {
    if (item.exact) return location.pathname === "/";
    if (item.path === "/AllWorks") return location.pathname === "/AllWorks" && !location.search;
    return currentPath === item.path || currentPath.startsWith(item.path.split("?")[0] + "?");
  };

  const handleNav = (item) => {
    navigate(item.path);
    if (item.path === "/AllWorks") {
      window.dispatchEvent(new CustomEvent("sidebar-filter", { detail: { clear: true } }));
    } else if (item.path.includes("?status=")) {
      const status = decodeURIComponent(item.path.split("?status=")[1]);
      window.dispatchEvent(new CustomEvent("sidebar-filter", { detail: { status } }));
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around lg:hidden transition-transform duration-300"
      style={{
        backgroundColor: "var(--surface)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -2px 10px rgba(0,0,0,0.10)",
        minHeight: 56,
        transform: visible ? "translateY(0)" : "translateY(100%)",
      }}
    >
      {navItems.map((item) => {
        const active = isActive(item);
        const accentColor = item.color || "#E56B3A";
        return (
          <button
            key={item.path}
            onClick={() => handleNav(item)}
            className="flex items-center justify-center flex-1 py-2 transition-all"
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
              {/* Dot indicateur actif */}
              {active && (
                <div
                  className="w-1 h-1 rounded-full mt-0.5"
                  style={{ backgroundColor: accentColor }}
                />
              )}
            </div>
          </button>
        );
      })}
    </nav>
  );
}