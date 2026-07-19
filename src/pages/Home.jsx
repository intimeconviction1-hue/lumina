import React, { useState, useMemo } from "react";
import { useWorks } from "@/hooks/useWorks";
import { effectiveStatus } from "@/lib/statusActions";
import StatsCards from "../components/home/StatsCards";
import SurpriseCard from "../components/home/SurpriseCard";
import HorizontalScroll from "../components/home/HorizontalScroll";
import TypeDistribution from "../components/home/TypeDistribution";
import ResumeSection from "../components/home/ResumeSection";
import RecentlyFinished from "../components/home/RecentlyFinished";
import MoodSuggestions from "../components/home/MoodSuggestions";
import TonightPick from "../components/home/TonightPick";
import TypeShortcuts from "../components/home/TypeShortcuts";
import RecentWorks from "../components/home/RecentWorks";
import TagCloud from "../components/home/TagCloud";
import { motion } from "framer-motion";
import { Clapperboard } from "lucide-react";

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bonjour";
  if (h >= 12 && h < 18) return "Bon après-midi";
  return "Bonsoir";
}

const Section = ({ children }) => (
  <div
    className="p-5"
    style={{
      backgroundColor: "var(--card-bg)",
      borderRadius: "var(--radius-card)",
      border: "1px solid var(--border)",
      boxShadow: "var(--shadow-sm)",
    }}
  >
    {children}
  </div>
);

const SkelStats = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="skeleton" style={{ height: 110, borderRadius: "var(--radius-card)" }} />
    ))}
  </div>
);

const SkelBlock = ({ h = 160 }) => (
  <div className="skeleton" style={{ height: h, borderRadius: "var(--radius-card)" }} />
);

export default function Home({ onAddWork }) {
  const [activeTags, setActiveTags] = useState([]);

  const { data: works = [], isLoading } = useWorks();

  const toggleTag = (tag) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  // Filtre cumulatif par tags (AND)
  const filteredWorks = useMemo(() => {
    if (activeTags.length === 0) return works;
    return works.filter(w => activeTags.every(t => (w.tags || []).includes(t)));
  }, [works, activeTags]);

  // Découpage par statut logique (type-aware), calculé une fois par liste filtrée.
  const { inProgress, aVoir, finished, pasSorti, favorites, filmsSeries, toConsume } = useMemo(() => {
    const g = { inProgress: [], aVoir: [], finished: [], pasSorti: [], favorites: [], filmsSeries: [], toConsume: [] };
    for (const w of filteredWorks) {
      const s = effectiveStatus(w);
      if (s === "En cours") g.inProgress.push(w);
      else if (s === "À voir") { g.aVoir.push(w); g.toConsume.push(w); }
      else if (s === "Envie de lire") g.toConsume.push(w);
      else if (s === "Pas sorti") g.pasSorti.push(w);
      if (s === "Visionné" || s === "Lu") g.finished.push(w);
      if (w.favorite) g.favorites.push(w);
      if (w.type === "film" || w.type === "série") g.filmsSeries.push(w);
    }
    return g;
  }, [filteredWorks]);

  return (
    <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="pt-1">
        <span className="text-[9px] sm:text-[10.5px] font-bold uppercase tracking-[0.15em]" style={{ color: "#E56B3A" }}>
          ✦ Tableau de bord
        </span>
        <h1 className="text-[20px] sm:text-[28px] font-bold leading-snug mt-1" style={{ color: "var(--text-primary)" }}>
          {getGreeting()}, bienvenue 👋
        </h1>
        {works.length > 0 && (
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: "rgba(229,107,58,0.1)", border: "1px solid rgba(229,107,58,0.25)" }}>
            <span className="w-2 h-2 rounded-full bg-[#E56B3A]" />
            <p className="text-[12px] sm:text-[13px] font-semibold" style={{ color: "#E56B3A" }}>
              {works.length.toLocaleString("fr-FR")} œuvre{works.length > 1 ? "s" : ""} dans votre collection
            </p>
          </div>
        )}
        <div className="hidden sm:flex items-center gap-3 mt-3">
          <kbd className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: "var(--border)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>/</kbd>
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Rechercher</span>
          <kbd className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: "var(--border)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>N</kbd>
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Nouvelle œuvre</span>
        </div>
      </motion.div>

      {/* Type shortcuts */}
      {!isLoading && works.length > 0 && (
        <TypeShortcuts works={works} />
      )}

      {/* Tag cloud — filtrage cumulatif */}
      {!isLoading && works.length > 0 && (
        <TagCloud
          works={works}
          activeTags={activeTags}
          onTagToggle={toggleTag}
          onReset={() => setActiveTags([])}
        />
      )}

      {/* Derniers ajouts sous forme de cartes miniatures */}
      {!isLoading && works.length > 0 && (
        <RecentWorks works={works} />
      )}

      {/* ── MODULE 1 : Reprendre ── */}
      {isLoading ? (
        <SkelBlock h={180} />
      ) : (
        <ResumeSection works={inProgress} onAddWork={onAddWork} />
      )}

      {/* ── MODULE 2 : Terminé récemment (vus + lus) ── */}
      {!isLoading && <RecentlyFinished works={finished} />}

      {/* ── MODULE 3 : Selon ton humeur (à voir + à lire) ── */}
      {isLoading ? (
        <SkelBlock h={200} />
      ) : (
        <MoodSuggestions works={works} enVeille={toConsume} onAddWork={onAddWork} />
      )}

      {/* ── MODULE 4 : Ce soir je regarde quoi ? ── */}
      {!isLoading && (
        <TonightPick enVeille={aVoir} onAddWork={onAddWork} />
      )}

      {/* À voir */}
      {!isLoading && aVoir.length > 0 && (
        <Section>
          <HorizontalScroll title="À voir" works={aVoir} seeAllStatus="À voir" accentColor="#94A3B8" />
        </Section>
      )}

      {/* Surprise — films/séries uniquement */}
      {!isLoading && filmsSeries.length > 0 && (
        <SurpriseCard works={filmsSeries} />
      )}

      {/* Favoris */}
      {!isLoading && favorites.length > 0 && (
        <Section>
          <HorizontalScroll title="❤ Favoris" works={favorites} accentColor="#F472B6" />
        </Section>
      )}

      {/* Pas sorti */}
      {!isLoading && pasSorti.length > 0 && (
        <Section>
          <HorizontalScroll title="Pas sorti" works={pasSorti} seeAllStatus="Pas sorti" accentColor="#6366F1" />
        </Section>
      )}

      {/* ── BAS DE PAGE : Stats + Répartition ── */}
      {!isLoading && works.length > 0 && (
        <>
          <StatsCards works={works} />
          <TypeDistribution works={works} />
        </>
      )}

      {/* Empty state */}
      {!isLoading && works.length === 0 && (
        <div className="text-center py-20">
          <div
            className="w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #E56B3A, #9B6A6C)" }}
          >
            <Clapperboard className="w-7 h-7" style={{ color: "#C9A84C" }} />
          </div>
          <h3 className="text-[17px] font-bold mb-2" style={{ color: "var(--text-primary)" }}>Bibliothèque vide</h3>
          <p className="text-[13px] mb-4" style={{ color: "var(--text-muted)" }}>
            Commencez par ajouter votre première œuvre.
          </p>
          <button
            onClick={onAddWork}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "#E56B3A", color: "#FFFFFF" }}
          >
            + Ajouter une œuvre
          </button>
        </div>
      )}

    </div>
  );
}