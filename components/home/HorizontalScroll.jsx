import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowRight, BookOpen, Film, Tv, Mic, Video, FileText, Radio, Star, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { typeColors, typeIcons, statusConfig } from "../works/WorkCard";

function MiniCard({ work, index }) {
  const TypeIcon = typeIcons[work.type] || FileText;
  const tColor = typeColors[work.type] || "#667085";
  const sConf = statusConfig[work.status] || statusConfig["En veille"];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="flex-shrink-0 w-36 group"
    >
      <Link to={createPageUrl("WorkDetail") + `?id=${work.id}`}>
        <div
          className="overflow-hidden transition-all duration-[180ms]"
          style={{
            borderRadius: 14,
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-card)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          {/* Cover */}
          <div style={{ aspectRatio: "2/3", overflow: "hidden" }}>
            {work.cover_image ? (
              <img src={work.cover_image} alt={work.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(145deg, ${tColor}18, ${tColor}35)`, backgroundColor: "var(--bg)" }}>
                <TypeIcon className="w-8 h-8" style={{ color: tColor }} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-2.5" style={{ backgroundColor: "var(--card-bg)" }}>
            <h4 className="text-[12px] font-semibold leading-tight line-clamp-2" style={{ color: "var(--text-primary)" }}>
              {work.title}
            </h4>
            {(work.creator || work.creator_name) && (
              <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{work.creator || work.creator_name}</p>
            )}
            <div className="flex items-center justify-between mt-1.5">
              {work.rating > 0 ? (
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className="w-2.5 h-2.5" fill={s <= work.rating ? "#D4AF37" : "transparent"} stroke={s <= work.rating ? "#D4AF37" : "var(--text-muted)"} />
                  ))}
                </div>
              ) : <span />}
              {work.favorite && <Heart className="w-3 h-3 fill-[#EC4899] text-[#EC4899]" />}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function HorizontalScroll({ title, works, seeAllPage, seeAllStatus, accentColor, emptyText }) {
  const navigate = useNavigate();

  const handleSeeAll = (e) => {
    e.preventDefault();
    if (seeAllStatus) {
      navigate(`/AllWorks?status=${encodeURIComponent(seeAllStatus)}`);
    } else if (seeAllPage) {
      navigate(createPageUrl(seeAllPage));
    }
  };

  const hasSeeAll = seeAllPage || seeAllStatus;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
          <span className="ml-2 text-[12px] font-normal" style={{ color: "var(--text-muted)" }}>
            ({works.length})
          </span>
        </h3>
        {hasSeeAll && works.length > 0 && (
          <button
            onClick={handleSeeAll}
            className="flex items-center gap-1 text-[12.5px] font-medium transition-opacity hover:opacity-70"
            style={{ color: accentColor || "#2AA6A0" }}
          >
            Voir tout <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {works.length === 0 ? (
        <p className="text-[13px] py-6 text-center" style={{ color: "var(--text-muted)" }}>
          {emptyText || "Aucune œuvre"}
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {works.slice(0, 12).map((work, i) => (
            <MiniCard key={work.id} work={work} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}