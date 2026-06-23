import React from "react";
import { LayoutGrid, Clock, Eye, BookOpen, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const RADIUS = 22;
const CIRC = 2 * Math.PI * RADIUS;

function RingProgress({ pct, color, size = 60 }) {
  const dash = (pct / 100) * CIRC;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="3" />
      <motion.circle
        cx={size/2} cy={size/2} r={RADIUS} fill="none"
        stroke={color} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={CIRC}
        initial={{ strokeDashoffset: CIRC }}
        animate={{ strokeDashoffset: CIRC - dash }}
        transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
      />
    </svg>
  );
}

export default function StatsCards({ works }) {
  const navigate = useNavigate();
  const total = works.length;
  const enCours = works.filter(x => x.status === "En cours").length;
  const visionne = works.filter(x => x.status === "Visionné").length;
  const envieDeVoir = works.filter(x => x.status === "À voir").length;
  const enviedeLire = works.filter(x => x.status === "Envie de lire").length;

  const cards = [
    {
      key: "en_cours", label: "En cours", value: enCours,
      icon: Clock, iconColor: "#D4AF37", iconBg: "rgba(212,175,55,0.15)",
      ring: true, ringColor: "#D4AF37", pct: total > 0 ? (enCours / total) * 100 : 0,
      link: "/AllWorks?status=En+cours",
    },
    {
      key: "visionne", label: "Visionné", value: visionne,
      icon: Eye, iconColor: "#2AA6A0", iconBg: "rgba(42,166,160,0.12)",
      ring: true, ringColor: "#2AA6A0", pct: total > 0 ? (visionne / total) * 100 : 0,
      link: "/AllWorks?status=Visionn%C3%A9",
    },
    {
      key: "envie_voir", label: "Envie de voir", value: envieDeVoir,
      icon: LayoutGrid, iconColor: "#94A3B8", iconBg: "rgba(148,163,184,0.12)",
      ring: true, ringColor: "#94A3B8", pct: total > 0 ? (envieDeVoir / total) * 100 : 0,
      link: "/AllWorks?status=%C3%80+voir",
    },
    {
      key: "envie_lire", label: "Envie de lire", value: enviedeLire,
      icon: BookOpen, iconColor: "#8B5CF6", iconBg: "rgba(139,92,246,0.12)",
      ring: true, ringColor: "#8B5CF6", pct: total > 0 ? (enviedeLire / total) * 100 : 0,
      link: "/AllWorks?status=Envie+de+lire",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          onClick={() => card.link && navigate(card.link)}
          className="transition-all duration-200 cursor-pointer group"
          style={{
            backgroundColor: "var(--card-bg)",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
            padding: "14px",
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-elevated)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "rgba(229,107,58,0.3)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "var(--shadow-card)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "var(--border)"; }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ backgroundColor: card.iconBg }}>
              <card.icon className="w-3.5 h-3.5" style={{ color: card.iconColor, strokeWidth: 1.75 }} />
            </div>
            {card.ring && total > 0 && (
              <RingProgress pct={card.pct} color={card.ringColor} size={40} />
            )}
          </div>

          <p className="text-[22px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
            {card.value}
          </p>
          <p className="text-[11px] font-medium mt-1" style={{ color: "var(--text-muted)" }}>{card.label}</p>
        </motion.div>
      ))}
    </div>
  );
}