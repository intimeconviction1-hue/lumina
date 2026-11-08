import React from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, Film, Tv, Mic, Video, FileText, Radio, Heart
} from "lucide-react";
import WorkCardActions from "./WorkCardActions";
import { motion } from "framer-motion";
import { STATUS_CONFIG, TYPE_COLORS, effectiveStatus, isFinished } from "@/lib/statusActions";

export const typeIcons = {
  livre: BookOpen, film: Film, série: Tv, documentaire: Radio,
  podcast: Mic, vidéo: Video, article: FileText,
};

export const typeColors = TYPE_COLORS;

export const statusConfig = STATUS_CONFIG;

const GENRE_COLORS_MAP = {
  "juifs": "#8B5CF6", "polar": "#0B2545", "procès": "#D4AF37",
  "cinéma": "#2AA6A0", "biopic": "#EC4899", "histoire": "#6366F1",
  "true crime": "#EF4444", "BD": "#F59E0B",
};
const genreColor = (g) => GENRE_COLORS_MAP[g] || "#C9A84C";

export default function WorkCard({ work, onEdit, onDelete, onStatusChange, onToggleFavorite, onFilter, onOpenWork, index = 0, selectMode = false, selected = false, onToggleSelect }) {
  const navigate = useNavigate();
  const TypeIcon = typeIcons[work.type] || Film;
  const tColor = typeColors[work.type] || "#C9A84C";
  const logicalStatus = effectiveStatus(work);
  const sConfig = statusConfig[logicalStatus] || statusConfig["À voir"];
  const displayYear = work.year || work.released_year;
  const mainPlatform = Array.isArray(work.platform) ? work.platform[0] : work.platform;

  const goFilter = (e, key, val) => {
    e.preventDefault();
    e.stopPropagation();
    onFilter?.(key, val);
  };

  const goDetail = (e) => {
    if (selectMode) { e.stopPropagation(); onToggleSelect?.(work.id); return; }
    e.stopPropagation();
    if (onOpenWork) onOpenWork(work);
    else navigate(`/WorkDetail?id=${work.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.35) }}
      className="group cinema-card"
    >
      <div
        className="relative"
        style={{
          backgroundColor: "var(--card-bg)",
          borderRadius: "var(--radius-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
          transition: "box-shadow 200ms ease, border-color 200ms ease",
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 12px 32px rgba(201,168,76,0.18), 0 2px 8px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.35)"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = "var(--shadow-card)"; e.currentTarget.style.borderColor = "var(--border)"; }}
      >
        {/* Cover zone */}
        <div
          className="relative overflow-hidden"
          style={{ aspectRatio: "2/3", borderRadius: "var(--radius-card) var(--radius-card) 0 0" }}
        >
          {/* Image / placeholder — cliquable pour naviguer */}
          <div
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer"
            style={{ background: `linear-gradient(160deg, ${tColor}18 0%, ${tColor}30 50%, ${tColor}10 100%)`, backgroundColor: "var(--card-bg)" }}
            onClick={goDetail}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${tColor}22`, border: `1px solid ${tColor}30` }}>
              <TypeIcon className="w-6 h-6" style={{ color: tColor }} />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: `${tColor}99` }}>{work.type}</span>
          </div>
          {work.cover_image && (
            <img
              key={work.cover_image}
              src={work.cover_image}
              alt={work.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06] cursor-pointer"
              loading="lazy"
              onError={e => { e.currentTarget.style.display = "none"; }}
              onClick={goDetail}
            />
          )}

          {/* Checkbox en mode sélection */}
          {selectMode && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onToggleSelect?.(work.id); }}
              className="absolute top-2 left-2 z-20 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
              style={{
                backgroundColor: selected ? "#E56B3A" : "rgba(0,0,0,0.5)",
                borderColor: selected ? "#E56B3A" : "rgba(255,255,255,0.6)",
              }}
            >
              {selected && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </button>
          )}

          {/* Top badges */}
          <div className="absolute top-2 left-2 right-2 flex items-start justify-end gap-1.5 pointer-events-none">
            {work.favorite && (
              <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
                <Heart className="w-3 h-3 fill-[#EC4899] text-[#EC4899]" />
              </span>
            )}
          </div>

          {/* Overlay sélection */}
          {selectMode && selected && (
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: "rgba(229,107,58,0.25)", zIndex: 5 }} />
          )}

        </div>

        {/* Card body */}
        <div style={{ padding: "12px 12px 14px" }}>
          {/* Status pill */}
          <div className="mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ backgroundColor: sConfig.bg, color: sConfig.color }}>
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${logicalStatus === "En cours" ? "animate-pulse" : ""}`}
                style={{ backgroundColor: sConfig.dot }}
              />
              {sConfig.label}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-bold" style={{ color: "var(--text-primary)", lineHeight: 1.35 }}>
            <button type="button" onClick={goDetail} className="line-clamp-2 text-left hover:underline">
              {work.title}
            </button>
          </h3>

          {/* Creator */}
          {(work.creator || work.creator_name) && (
            <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)", wordBreak: "break-word" }}>
              {work.creator || work.creator_name}
            </p>
          )}

          {/* Genre chips */}
          {work.genre?.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {work.genre.slice(0, 2).map(g => {
                const gc = genreColor(g);
                return (
                  <button key={g} type="button" onClick={e => goFilter(e, "genre", g)}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-md capitalize hover:opacity-70 transition-opacity cursor-pointer"
                    style={{ backgroundColor: `${gc}15`, color: gc, border: `1px solid ${gc}35` }}>
                    {g}
                  </button>
                );
              })}
              {work.genre.length > 2 && (
                <button type="button" onClick={e => goFilter(e, "genre", work.genre[2])}
                  className="text-[10px] hover:opacity-70 transition-opacity cursor-pointer"
                  style={{ color: "var(--text-muted)" }}>
                  +{work.genre.length - 2}
                </button>
              )}
            </div>
          )}

          {/* Metadata chips */}
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            {displayYear && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: "var(--border-subtle)", color: "var(--text-muted)" }}>
                {displayYear}
              </span>
            )}
            {mainPlatform && (
              <button type="button" onClick={e => goFilter(e, "platform", mainPlatform)}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-md hover:opacity-70 transition-opacity cursor-pointer"
                style={{ backgroundColor: "rgba(126,154,115,0.12)", color: "#7E9A73" }}>
                {mainPlatform}
              </button>
            )}
            {work.rating > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                style={{ backgroundColor: "rgba(233,196,106,0.15)", color: "#D4A600" }}>
                ★ {work.rating}/5
              </span>
            )}
            {work.tags?.slice(0, 1).map(tag => (
              <button key={tag} type="button" onClick={e => goFilter(e, "tag", tag)}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-md hover:opacity-70 transition-opacity cursor-pointer"
                style={{ backgroundColor: "rgba(155,106,108,0.1)", color: "#9B6A6C" }}>
                #{tag}
              </button>
            ))}
          </div>

          {/* Date contextuelle */}
          {(logicalStatus === "En cours" && work.started_at) && (
            <p className="text-[10px] mt-2 font-medium" style={{ color: "var(--text-muted)" }}>
              ▶ Commencé le {new Date(work.started_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </p>
          )}
          {(isFinished(work) && work.finished_at) && (
            <p className="text-[10px] mt-2 font-medium" style={{ color: "#7E9A73" }}>
              ✓ Terminé le {new Date(work.finished_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </p>
          )}

          {!selectMode && (
            <div className="mt-2 border-t pt-1" style={{ borderColor: "var(--border-subtle)" }}>
              <WorkCardActions work={work} onEdit={onEdit} onDelete={onDelete}
                onStatusChange={onStatusChange} onToggleFavorite={onToggleFavorite} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
