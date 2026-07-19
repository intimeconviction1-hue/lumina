import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Shuffle, ArrowRight, FileText, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { typeColors, typeIcons } from "../works/WorkCard";

export default function SurpriseCard({ works }) {
  const [key, setKey] = useState(0);

  // Exclure les livres "Envie de lire", proposer films/séries en priorité
  const pool = useMemo(() => {
    const filmsSeries = works.filter(w => w.type === "film" || w.type === "série");
    return filmsSeries.length > 0 ? filmsSeries : works.filter(w => w.status !== "Envie de lire");
  }, [works]);

  const randomWork = useMemo(() => {
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [pool, key]);

  if (!randomWork) return null;

  const TypeIcon = typeIcons[randomWork.type] || FileText;
  const tColor = typeColors[randomWork.type] || "#667085";

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
      <AnimatePresence mode="wait">
        <motion.div
          key={randomWork.id + key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
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
                onClick={() => setKey(k => k + 1)}
                className="w-9 h-9 rounded-full flex items-center justify-center border transition-all hover:scale-105"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--bg)" }}
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>

            {/* Main content */}
            <div className="flex gap-5">
              {/* Cover */}
              <div
                className="flex-shrink-0 overflow-hidden shadow-lg"
                style={{ width: 90, height: 130, borderRadius: 14 }}
              >
                {randomWork.cover_image ? (
                  <img src={randomWork.cover_image} alt={randomWork.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(145deg, ${tColor}22, ${tColor}55)` }}>
                    <TypeIcon className="w-8 h-8" style={{ color: tColor }} />
                  </div>
                )}
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

                <h4 className="text-[17px] font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
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

                {randomWork.description && (
                  <p className="text-[12.5px] mt-2.5 line-clamp-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {randomWork.description}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-4">
                  <Link
                    to={`/WorkDetail?id=${randomWork.id}`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #0A1628, #1a3a6b)", boxShadow: "0 4px 12px rgba(10,22,40,0.25)" }}
                  >
                    Découvrir <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => setKey(k => k + 1)}
                    className="px-4 py-2 rounded-[10px] text-[13px] font-medium border transition-all hover:opacity-80"
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
}