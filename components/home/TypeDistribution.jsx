import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { typeColors, typeIcons } from "../works/WorkCard";

const TYPE_ORDER = ["film", "série", "livre", "documentaire", "podcast", "vidéo", "article"];

export default function TypeDistribution({ works }) {
  const navigate = useNavigate();
  const counts = TYPE_ORDER.reduce((acc, t) => {
    acc[t] = works.filter(w => w.type === t).length;
    return acc;
  }, {});

  const nonZero = TYPE_ORDER.filter(t => counts[t] > 0);
  const max = Math.max(...nonZero.map(t => counts[t]), 1);
  const total = works.length;

  return (
    <div
      className="p-5"
      style={{
        backgroundColor: "var(--card-bg)",
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-4" style={{ color: "var(--text-muted)" }}>
        Répartition par type
      </p>
      <div className="space-y-2">
        {nonZero.map((type, i) => {
          const count = counts[type];
          const pct = (count / max) * 100;
          const totalPct = total > 0 ? Math.round((count / total) * 100) : 0;
          const color = typeColors[type] || "#94A3B8";
          const Icon = typeIcons[type];
          return (
            <motion.button
              key={type}
              onClick={() => navigate(`/AllWorks?type=${type}`)}
              className="w-full flex items-center gap-3 p-2 rounded-[10px] transition-all text-left group"
              style={{ backgroundColor: "transparent" }}
              whileHover={{ backgroundColor: `${color}08`, x: 2 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                {Icon && (
                  <div className="w-5 h-5 rounded-[5px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
                    <Icon className="w-3 h-3" style={{ color }} />
                  </div>
                )}
                <span className="text-[11.5px] font-medium capitalize" style={{ color: "var(--text-secondary)" }}>{type}</span>
              </div>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: color, opacity: 0.8 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, delay: i * 0.07, ease: "easeOut" }}
                />
              </div>
              <span className="text-[11px] font-semibold w-8 text-right flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                {count}
              </span>
              <span className="text-[10px] font-bold opacity-0 group-hover:opacity-60 transition-opacity w-8 text-right flex-shrink-0" style={{ color }}>
                {totalPct}%
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}