import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Pencil, Trash2, Heart, Film, Tv, Mic, Video, FileText, Radio,
  Calendar, MapPin, Globe, Clock, Monitor, BookMarked, Zap, Play, Pause, CheckCircle2, RotateCcw, Flag, PlayCircle, BookOpen
} from "lucide-react";
import StarRating from "../components/works/StarRating";
import { motion } from "framer-motion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { typeIcons, typeColors } from "../components/works/WorkCard";
import { STATUS_CONFIG, STATUS_ACTIONS } from "@/lib/statusActions";
import { useWorks, WORKS_KEY } from "@/hooks/useWorks";
import { worksApi } from "@/api/works";

const ACTION_ICONS = { Play, Pause, CheckCircle2, RotateCcw };

function MetaItem({ icon: IconComp, label, value }) {
  const Icon = IconComp;
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>{label}</p>
        <p className="text-[13.5px] font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>{value}</p>
      </div>
    </div>
  );
}

export default function WorkDetail({ onEditWork }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [searchParams] = useSearchParams();
  const workId = searchParams.get("id") || new URLSearchParams(window.location.search).get("id");

  const { data: allWorks = [] } = useWorks();
  
  const { data: work, isLoading } = useQuery({
    queryKey: ["work", workId],
    queryFn: async () => {
      if (!workId) return null;
      // Try cache first (WORKS_KEY)
      const found = allWorks.find(w => w.id === workId);
      if (found) return found;
      // Fallback: try worksApi.get
      try {
        return await worksApi.get(workId);
      } catch {
        // Last resort: list + find
        const list = await worksApi.list();
        return list.find(w => w.id === workId) || null;
      }
    },
    enabled: !!workId,
  });

  const optimisticUpdate = (patch) => {
    queryClient.setQueryData(["work", workId], (old) => old ? { ...old, ...patch } : old);
    queryClient.setQueryData(WORKS_KEY, (old = []) =>
      old.map(w => w.id === workId ? { ...w, ...patch } : w)
    );
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["work", workId] });
    queryClient.invalidateQueries({ queryKey: WORKS_KEY });
  };

  const handleStatusChange = async (_, newStatus) => {
    optimisticUpdate({ status: newStatus });
    await worksApi.update(workId, { status: newStatus });
    invalidateAll();
  };
  const handleRatingChange = async (r) => {
    const newRating = r === work.rating ? 0 : r;
    optimisticUpdate({ rating: newRating });
    await worksApi.update(workId, { rating: newRating });
    invalidateAll();
  };

  const handleToggleFavorite = async () => {
    const newFav = !work.favorite;
    optimisticUpdate({ favorite: newFav });
    await worksApi.update(workId, { favorite: newFav });
    invalidateAll();
  };
  const handleDelete = async () => {
    await worksApi.remove(workId);
    queryClient.invalidateQueries({ queryKey: WORKS_KEY });
    navigate("/AllWorks");
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="skeleton h-6 w-32 mb-8 rounded-lg" />
        <div className="rounded-[24px] overflow-hidden border" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-col md:flex-row">
            <div className="skeleton md:w-72 h-96 md:h-auto" />
            <div className="p-8 flex-1 space-y-4">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-8 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!workId || (!isLoading && !work)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "var(--border-subtle)" }}>
          <FileText className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
        </div>
        <p className="text-[16px] font-bold mb-1" style={{ color: "var(--text-primary)" }}>Œuvre introuvable</p>
        <p className="text-[13px] mb-5" style={{ color: "var(--text-muted)" }}>
          {workId ? "Cette œuvre n'existe pas ou a été supprimée." : "Aucun identifiant fourni."}
        </p>
        <Link to="/AllWorks" className="px-4 py-2.5 rounded-[12px] text-[13px] font-semibold transition-all hover:opacity-90"
          style={{ backgroundColor: "rgba(229,107,58,0.1)", color: "#E56B3A", border: "1.5px solid rgba(229,107,58,0.3)" }}>
          <ArrowLeft className="w-4 h-4 inline mr-1.5" />Retour à la bibliothèque
        </Link>
      </div>
    );
  }

  const TypeIcon = typeIcons[work.type] || FileText;
  const tColor = typeColors[work.type] || "#667085";

  const goGenre = (g) => navigate(`/AllWorks?genre=${encodeURIComponent(g)}`);
  const sConf = STATUS_CONFIG[work.status] || STATUS_CONFIG["À voir"];
  const actions = STATUS_ACTIONS[work.status] || [];

  return (
    <div className="max-w-5xl mx-auto">
      <Link to="/AllWorks" className="inline-flex items-center gap-2 text-[13px] font-medium mb-7 transition-opacity hover:opacity-70" style={{ color: "var(--text-secondary)" }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Retour à la bibliothèque
      </Link>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="overflow-hidden" style={{ borderRadius: "var(--radius-modal)", border: "1px solid var(--border)", boxShadow: "var(--shadow-elevated)", backgroundColor: "var(--card-bg)" }}>
          <div className="flex flex-col lg:flex-row">
            {/* Cover */}
            <div className="lg:w-[320px] flex-shrink-0 relative">
              {work.cover_image ? (
                <img src={work.cover_image} alt={work.title} className="w-full h-72 lg:h-full object-cover" style={{ minHeight: 400 }} />
              ) : (
                <div className="w-full h-72 lg:h-full flex flex-col items-center justify-center gap-4"
                  style={{ background: `linear-gradient(145deg, ${tColor}18 0%, ${tColor}35 100%)`, minHeight: 400 }}>
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ backgroundColor: `${tColor}25` }}>
                    <TypeIcon className="w-10 h-10" style={{ color: tColor }} />
                  </div>
                  <span className="text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: tColor }}>{work.type}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              <button onClick={handleToggleFavorite}
                className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
                style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}>
                <Heart className={`w-5 h-5 ${work.favorite ? "fill-[#EC4899] text-[#EC4899]" : "text-white"}`} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-8 lg:p-10 overflow-y-auto">
              {/* Type + Modify/Delete */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                  style={{ backgroundColor: `${tColor}15`, color: tColor }}>
                  <TypeIcon className="w-3.5 h-3.5" />
                  {work.type}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => onEditWork?.(work)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] border text-[12.5px] font-medium transition-all hover:shadow-sm"
                    style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                    <Pencil className="w-3.5 h-3.5" /> Modifier
                  </button>
                  <button onClick={() => setShowDeleteDialog(true)}
                    className="p-2 rounded-[10px] border text-red-500 transition-colors hover:bg-red-50"
                    style={{ borderColor: "var(--border)" }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-[28px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{work.title}</h1>
              {(work.creator || work.creator_name) && (
                <p className="text-[15px] font-medium mt-2" style={{ color: "var(--text-secondary)" }}>
                  par {work.creator || work.creator_name}
                </p>
              )}

              {/* Statut + Actions contextuelles */}
              <div className="flex flex-wrap items-center gap-3 mt-5">
                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-semibold"
                  style={{ backgroundColor: sConf.bg, color: sConf.color }}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${work.status === "En cours" ? "animate-pulse" : ""}`}
                    style={{ backgroundColor: sConf.dot }} />
                  {sConf.label}
                </span>
                {actions.map(action => {
                  const Icon = ACTION_ICONS[action.icon];
                  return (
                    <button key={action.id}
                      onClick={() => handleStatusChange(work, action.targetStatus)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-semibold border transition-all hover:opacity-90"
                      style={action.variant === "primary" ? {
                        backgroundColor: "#D4AF37", color: "#0B2545", borderColor: "#D4AF37",
                      } : {
                        backgroundColor: "var(--bg)", color: "var(--text-secondary)", borderColor: "var(--border)",
                      }}>
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      {action.label}
                    </button>
                  );
                })}
              </div>

              {/* Note — demi-étoiles */}
              <div className="mt-4">
                {work.status === "Visionné" ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: "var(--text-muted)" }}>Ma note</p>
                    <StarRating value={work.rating || 0} onChange={handleRatingChange} size="md" />
                  </div>
                ) : work.rating > 0 ? (
                  <StarRating value={work.rating} size="sm" />
                ) : null}
              </div>

              {/* Bouton Regarder maintenant */}
              {work.source_url && (
                <div className="mt-4">
                  <a
                    href={work.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 px-5 py-3 rounded-[12px] text-[13.5px] font-semibold transition-all hover:opacity-90 hover:shadow-lg"
                    style={{ backgroundColor: "#D4AF37", color: "#0B2545", boxShadow: "0 4px 14px rgba(212,175,55,0.3)" }}
                  >
                    <PlayCircle className="w-4.5 h-4.5 w-5 h-5" />
                    Regarder maintenant
                  </a>
                </div>
              )}

              {/* Description */}
              {work.description && (
                <div className="mt-6 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
                  <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] mb-3" style={{ color: "var(--text-muted)" }}>Synopsis</h3>
                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{work.description}</p>
                </div>
              )}

              {/* Personal note */}
              {work.personal_note && (
                <div className="mt-6 pt-5 border-t" style={{ borderColor: "var(--border)" }}>
                  <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] mb-3" style={{ color: "var(--text-muted)" }}>Note personnelle</h3>
                  <div className="p-4 rounded-[14px] text-[13.5px] leading-relaxed italic whitespace-pre-wrap"
                    style={{ backgroundColor: "rgba(212,175,55,0.05)", borderLeft: "3px solid #D4AF37", color: "var(--text-secondary)" }}>
                    {work.personal_note}
                  </div>
                </div>
              )}

              {/* Short review */}
              {work.short_review && (
                <div className="mt-5">
                  <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] mb-3" style={{ color: "var(--text-muted)" }}>Mini critique</h3>
                  <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    «&nbsp;{work.short_review}&nbsp;»
                  </p>
                </div>
              )}

              {/* Genres — cliquables */}
              {work.genre?.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {work.genre.map(g => (
                    <button key={g} onClick={() => goGenre(g)}
                      className="px-2.5 py-1 rounded-full text-[12px] font-medium capitalize hover:opacity-70 transition-opacity cursor-pointer"
                      style={{ backgroundColor: "rgba(229,107,58,0.08)", color: "#C9613A", border: "1px solid rgba(229,107,58,0.2)" }}>
                      {g}
                    </button>
                  ))}
                </div>
              )}

              {/* Metadata */}
              <div className="mt-6 pt-5 border-t" style={{ borderColor: "var(--border)" }}>
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] mb-3" style={{ color: "var(--text-muted)" }}>Informations</h3>
                <MetaItem icon={Calendar} label="Année" value={work.year} />
                <MetaItem icon={MapPin} label="Pays" value={work.country} />
                <MetaItem icon={Globe} label="Langue" value={work.language} />
                <MetaItem icon={Monitor} label="Plateforme" value={Array.isArray(work.platform) ? work.platform.join(", ") : work.platform} />
                {work.duration_minutes && <MetaItem icon={Clock} label="Durée" value={`${work.duration_minutes} min`} />}
                {work.page_count && <MetaItem icon={BookMarked} label="Pages" value={`${work.page_count} pages`} />}
                {work.difficulty_level && <MetaItem icon={Flag} label="Difficulté" value={work.difficulty_level} />}
                {work.mood && <MetaItem icon={Zap} label="Ambiance" value={work.mood} />}
                {work.recommended_by && <MetaItem icon={BookOpen} label="Recommandé par" value={work.recommended_by} />}
              </div>

              {work.tags?.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {work.tags.map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-full text-[12px] font-medium"
                      style={{ backgroundColor: "rgba(139,92,246,0.08)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.2)" }}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent style={{ borderRadius: "var(--radius-modal)" }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette œuvre ?</AlertDialogTitle>
            <AlertDialogDescription>
              «&nbsp;{work.title}&nbsp;» sera supprimée définitivement. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}