import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Shuffle, ArrowRight, FileText, Star } from "lucide-react";
import { typeColors, typeIcons } from "../works/WorkCard";
import { effectiveStatus } from "@/lib/statusActions";

function pick(works) {
  return works[Math.floor(Math.random() * works.length)];
}

export default function SurpriseCard({ works }) {
  // Proposer films/séries en priorité ; sinon exclure les livres à lire.
  const pool = useMemo(() => {
    const filmsSeries = works.filter(w => w.type === "film" || w.type === "série");
    return filmsSeries.length > 0 ? filmsSeries : works.filter(w => effectiveStatus(w) !== "Envie de lire");
  }, [works]);

  const [selectedId, setSelectedId] = useState(() => pick(pool)?.id);
  const [preview, setPreview] = useState(null);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const randomWork = pool.find(work => work.id === selectedId) || pool[0];
  if (!randomWork) return null;

  const roll = () => {
    if (preview || pool.length < 2) return;

    const result = pick(pool.filter(work => work.id !== randomWork.id));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSelectedId(result.id);
      return;
    }

    const candidates = pool.filter(work => work.id !== result.id);
    const frames = [];
    let previousId = randomWork.id;
    for (let index = 0; index < 3; index += 1) {
      const options = candidates.filter(work => work.id !== previousId);
      const next = pick(options.filter(work => !frames.includes(work)))
        || pick(options)
        || pick(pool.filter(work => work.id !== previousId));
      frames.push(next);
      previousId = next.id;
    }

    setPreview({ work: frames[0], frame: 0 });
    timers.current = [
      ...frames.slice(1).map((work, index) =>
        setTimeout(() => setPreview({ work, frame: index + 1 }), (index + 1) * 150)
      ),
      setTimeout(() => {
        setSelectedId(result.id);
        setPreview(null);
        timers.current = [];
      }, 450),
    ];
  };

  const TypeIcon = typeIcons[randomWork.type] || FileText;
  const tColor = typeColors[randomWork.type] || "#667085";
  const cover = preview?.work || randomWork;
  const CoverIcon = typeIcons[cover.type] || FileText;
  const coverColor = typeColors[cover.type] || "#667085";
  const canRoll = pool.length > 1;

  return (
    <div
      className="relative overflow-hidden"
      style={{
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
        backgroundColor: "var(--card-bg)",
      }}
    >
      {/* Background cover blur */}
      {randomWork.cover_image && (
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url(${randomWork.cover_image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(24px)",
            transform: "scale(1.2)",
          }}
        />
      )}

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "#C9A84C" }}>
              ✦ Surprenez-vous
            </p>
            <h3 className="text-[16px] font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
              Œuvre au hasard
            </h3>
          </div>
          <button
            type="button"
            onClick={roll}
            disabled={!canRoll}
            aria-disabled={Boolean(preview)}
            aria-label="Tirer une œuvre au hasard"
            className="h-11 w-11 rounded-full flex items-center justify-center border motion-safe:transition-transform motion-safe:hover:scale-105 disabled:opacity-50 aria-disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--bg)" }}
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>

        {/* Main content */}
        <div className="flex gap-3 sm:gap-5">
          {/* Cover */}
          <div className="h-[130px] w-[90px] shrink-0 overflow-hidden rounded-[14px] shadow-lg">
            <div
              key={preview ? `preview-${preview.frame}` : randomWork.id}
              className="lumina-surprise-cover flex h-full w-full items-center justify-center"
              style={{ background: `linear-gradient(145deg, ${coverColor}22, ${coverColor}55)` }}
              aria-hidden="true"
            >
              {cover.cover_image ? (
                <img src={cover.cover_image} alt="" className="h-full w-full object-cover" />
              ) : (
                <CoverIcon className="h-8 w-8" style={{ color: coverColor }} />
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 py-1">
            {/* Type badge */}
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold mb-2"
              style={{ backgroundColor: `${tColor}18`, color: tColor }}
            >
              <TypeIcon className="w-3 h-3" />
              {randomWork.type}
            </span>

            <h4 aria-live="polite" className="text-[17px] font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
              {randomWork.title}
            </h4>

            {(randomWork.creator || randomWork.creator_name) && (
              <p className="text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>
                {randomWork.creator || randomWork.creator_name}
              </p>
            )}

            {(randomWork.released_year || randomWork.year) && (
              <p className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>{randomWork.released_year || randomWork.year}</p>
            )}

            {randomWork.rating > 0 && (
              <div className="flex gap-0.5 mt-2">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className="w-3.5 h-3.5" fill={s <= randomWork.rating ? "#D4AF37" : "transparent"} stroke={s <= randomWork.rating ? "#D4AF37" : "var(--text-muted)"} />
                ))}
              </div>
            )}

            {randomWork.description_preview && (
              <p className="text-[12.5px] mt-2.5 line-clamp-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {randomWork.description_preview}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Link
                to={`/WorkDetail?id=${randomWork.id}`}
                aria-disabled={Boolean(preview)}
                onClick={event => { if (preview) event.preventDefault(); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90 aria-disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #0A1628, #1a3a6b)", boxShadow: "0 4px 12px rgba(10,22,40,0.25)" }}
              >
                Découvrir <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={roll}
                disabled={!canRoll}
                aria-disabled={Boolean(preview)}
                className="px-4 py-2 rounded-[10px] text-[13px] font-medium border transition-all hover:opacity-80 disabled:opacity-50 aria-disabled:opacity-50"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                Autre
              </button>
            </div>
          </div>
        </div>

        {/* Tags */}
        {randomWork.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            {randomWork.tags.slice(0, 4).map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-full text-[11px] font-medium border" style={{ backgroundColor: "var(--bg)", color: "var(--text-secondary)", borderColor: "var(--border)" }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
