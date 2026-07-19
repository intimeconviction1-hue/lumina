import React, { useMemo } from "react";
import { LayoutGrid, Clock, Eye, BookOpen, BookCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { effectiveStatus } from "@/lib/statusActions";

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

  // Comptes cohérents (statut logique, type-aware) — calculés une seule fois par liste.
  const counts = useMemo(() => {
    const c = { enCours: 0, visionne: 0, envieDeVoir: 0, enviedeLire: 0, lu: 0 };
    for (const w of works) {
      const s = effectiveStatus(w);
      if (s === "En cours") c.enCours++;
      else if (s === "Visionné") c.visionne++;
      else if (s === "À voir") c.envieDeVoir++;
      else if (s === "Envie de lire") c.enviedeLire++;
      else if (s === "Lu") c.lu++;
    }
    return c;
  }, [works]);

  const pct = (n) => (total > 0 ? (n / total) * 100 : 0);

  const cards = [
    {
      key: "en_cours", label: "En cours", value: counts.enCours,
      icon: Clock, iconColor: "#D4AF37", iconBg: "rgba(212,175,55,0.15)",
      ring: true, ringColor: "#D4AF37", pct: pct(counts.enCours),
      link: "/AllWorks?status=En+cours",
    },
    {
      key: "envie_voir", label: "Envie de voir", value: counts.envieDeVoir,
      icon: LayoutGrid, iconColor: "#94A3B8", iconBg: "rgba(148,163,184,0.12)",
      ring: true, ringColor: "#94A3B8", pct: pct(counts.envieDeVoir),
      link: "/AllWorks?status=%C3%80+voir",
    },
    {
      key: "visionne", label: "Vus", value: counts.visionne,
      icon: Eye, iconColor: "#2AA6A0", iconBg: "rgba(42,166,160,0.12)",
      ring: true, ringColor: "#2AA6A0", pct: pct(counts.visionne),
      link: "/AllWorks?status=Visionn%C3%A9",
    },
    {
      key: "envie_lire", label: "Envie de lire", value: counts.enviedeLire,
      icon: BookOpen, iconColor: "#8B5CF6", iconBg: "rgba(139,92,246,0.12)",
      ring: true, ringColor: "#8B5CF6", pct: pct(counts.enviedeLire),
      link: "/AllWorks?status=Envie+de+lire",
    },
    {
      key: "lu", label: "Lus", value: counts.lu,
      icon: BookCheck, iconColor: "#22C55E", iconBg: "rgba(34,197,94,0.12)",
      ring: true, ringColor: "#22C55E", pct: pct(counts.lu),
      link: "/AllWorks?status=Lu",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
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