import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Film, Tv, BookOpen, FileText, Mic, Video, Radio, Sparkles, RotateCcw, Plus, ArrowRight } from "lucide-react";

const TYPE_ICONS = {
  film: Film, série: Tv, livre: BookOpen,
  documentaire: FileText, podcast: Mic, vidéo: Video, article: Radio,
};
const TYPE_COLORS = {
  film: "#6366F1", série: "#2AA6A0", livre: "#D4AF37",
  documentaire: "#8B5CF6", podcast: "#F59E0B", vidéo: "#EF4444", article: "#14B8A6",
};

const TIME_OPTIONS = [
  { value: "moins de 30 min", label: "< 30 min" },
  { value: "environ 1 heure", label: "1 heure" },
  { value: "environ 2 heures", label: "2 heures" },
  { value: "toute la soirée", label: "Toute la soirée" },
];
const MOOD_OPTIONS = [
  { value: "légère et divertissante", label: "Légère" },
  { value: "intense et prenante", label: "Intense" },
  { value: "peu importe", label: "Peu importe" },
];
const CONTEXT_OPTIONS = [
  { value: "seul(e)", label: "Solo" },
  { value: "en groupe ou en famille", label: "À plusieurs" },
];

const TIME_MAX_MIN = {
  "moins de 30 min": 30,
  "environ 1 heure": 75,
  "environ 2 heures": 150,
  "toute la soirée": Infinity,
};

// Durée par défaut quand l'œuvre n'a pas de durée saisie (≈ minutes).
// null = format à durée libre (un livre se lit en plusieurs séances).
const DEFAULT_DURATION = {
  film: 115, série: 50, documentaire: 90, vidéo: 20, article: 12, podcast: 45, livre: null,
};

const WATCHABLE = new Set(["film", "série", "documentaire", "vidéo"]);

const MOOD_GENRES = {
  "légère et divertissante": ["comédie", "comedy", "feel", "aventure", "famille", "familial", "animation", "romance", "musical", "jeunesse", "humour"],
  "intense et prenante": ["thriller", "drame", "policier", "polar", "horreur", "guerre", "crime", "suspense", "noir", "procès", "enquête", "espionnage", "mystère", "action"],
};

const GENRE_LABEL = {
  polar: "Polar", thriller: "Thriller", drame: "Drame", comédie: "Comédie",
  guerre: "Film de guerre", procès: "Drame judiciaire", "enquête": "Enquête",
  famille: "Film familial", familial: "Film familial", religion: "Récit", classique: "Classique",
  mystère: "Mystère", action: "Action",
};

function effectiveDuration(w) {
  if (typeof w.duration_minutes === "number" && w.duration_minutes > 0) return w.duration_minutes;
  const def = DEFAULT_DURATION[w.type];
  return def === undefined ? null : def;
}

// Système de score pondéré — correspond autant que la donnée le permet, sans rien exclure inutilement.
function localSuggest({ time, mood, context, candidates }) {
  if (!candidates || candidates.length === 0) {
    return { no_match: true, reason: "Ta liste en veille est vide." };
  }

  const groupe = context === "en groupe ou en famille";
  const maxMin = TIME_MAX_MIN[time] ?? Infinity;
  const moodGenres = MOOD_GENRES[mood] || null;

  // Contexte « à plusieurs » : on ne garde que le visionnable (filtre dur, c'est le signal fiable).
  let pool = candidates;
  if (groupe) {
    pool = candidates.filter((w) => WATCHABLE.has(w.type));
    if (pool.length === 0) {
      return { no_match: true, reason: "Rien à regarder à plusieurs — ajoute des films ou séries." };
    }
  }

  const scored = pool.map((w) => {
    let score = 0;
    const matched = { mood: null, timeFits: false };

    // — Temps disponible —
    const eff = effectiveDuration(w);
    if (eff === null) {
      // Format libre (livre) : pénalisé pour un court créneau, neutre sinon.
      if (maxMin <= 30) score -= 4;
    } else if (eff <= maxMin) {
      score += 2; matched.timeFits = true;
    } else if (eff <= maxMin * 1.3) {
      score += 0; // limite, toléré
    } else {
      score -= 4; // trop long pour le créneau
    }

    // — Humeur ↔ genre —
    if (moodGenres) {
      const genres = (w.genre || []).map((g) => String(g).toLowerCase());
      const hit = genres.find((g) => moodGenres.some((mg) => g.includes(mg)));
      if (hit) { score += 3; matched.mood = hit; }
    }

    // — Contexte (solo : léger bonus aux formats immersifs ; groupe déjà filtré) —
    if (!groupe && WATCHABLE.has(w.type)) score += 0.3;

    // Aléa pour varier les suggestions à chaque clic.
    score += Math.random() * 1.6;

    return { w, score, matched };
  });

  // On garde les meilleurs (à 1.5 pt du max) puis tirage parmi eux.
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score >= scored[0].score - 1.5);
  const pick = top[Math.floor(Math.random() * top.length)];
  const w = pick.w;

  // — Raison, selon le critère le plus fort —
  let reason;
  if (pick.matched.mood) {
    const lbl = GENRE_LABEL[pick.matched.mood] || (pick.matched.mood.charAt(0).toUpperCase() + pick.matched.mood.slice(1));
    reason = mood === "intense et prenante" ? `${lbl}, pour une soirée intense` : `${lbl}, léger et plaisant`;
  } else if (groupe) {
    reason = "Idéal à regarder à plusieurs";
  } else if (pick.matched.timeFits && time === "moins de 30 min") {
    reason = "Format court pour ce soir";
  } else if (pick.matched.timeFits && time === "toute la soirée") {
    reason = "Parfait pour toute la soirée";
  } else if (pick.matched.timeFits) {
    reason = "Tient dans ton créneau";
  } else {
    reason = "Pioché dans ta liste en veille";
  }

  return { work: w, reason };
}

function Pill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all"
      style={{
        borderColor: active ? "#C9A84C" : "var(--border)",
        backgroundColor: active ? "rgba(201,168,76,0.12)" : "var(--bg)",
        color: active ? "#B8942E" : "var(--text-secondary)",
      }}
    >
      {label}
    </button>
  );
}

export default function TonightPick({ enVeille, onAddWork }) {
  const [time, setTime] = useState("environ 2 heures");
  const [mood, setMood] = useState("peu importe");
  const [context, setContext] = useState("seul(e)");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { work, reason } | { no_match, reason }
  const [error, setError] = useState(null);

  const handleAsk = () => {
    if (enVeille.length === 0) return;
    setLoading(true);
    setResult(null);
    setError(null);

    // Petit délai pour l'animation, puis calcul local instantané
    setTimeout(() => {
      const data = localSuggest({ time, mood, context, candidates: enVeille });
      setLoading(false);
      setResult(data);
    }, 450);
  };

  const reset = () => { setResult(null); setError(null); };

  const ResultWork = ({ work, reason }) => {
    const Icon = TYPE_ICONS[work.type] || FileText;
    const color = TYPE_COLORS[work.type] || "#667085";
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Link
          to={`/WorkDetail?id=${work.id}`}
          className="flex items-center gap-3.5 p-4 rounded-[14px] border group transition-all hover:shadow-sm"
          style={{ backgroundColor: "var(--bg)", borderColor: "rgba(201,168,76,0.3)" }}
        >
          <div
            className="w-14 h-14 rounded-[10px] flex-shrink-0 overflow-hidden flex items-center justify-center"
            style={{ backgroundColor: `${color}18` }}
          >
            {work.cover_image ? (
              <img src={work.cover_image} alt="" className="w-full h-full object-cover" />
            ) : (
              <Icon className="w-6 h-6" style={{ color }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold truncate" style={{ color: "var(--text-primary)" }}>{work.title}</p>
            <p className="text-[11.5px] mt-0.5 font-medium" style={{ color: "#C9A84C" }}>✦ {reason}</p>
          </div>
          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: "var(--text-muted)" }} />
        </Link>
        <button
          onClick={handleAsk}
          className="flex items-center gap-1.5 mt-2 mx-auto text-[11.5px] font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--text-muted)" }}
        >
          <RotateCcw className="w-3 h-3" /> Autre suggestion
        </button>
      </motion.div>
    );
  };

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
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <motion.div
          animate={{ rotate: [0, -8, 8, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 4 }}
        >
          <span className="text-[18px]">🎬</span>
        </motion.div>
        <div>
          <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
            Ce soir je regarde quoi ?
          </span>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Basé sur ta liste</p>
        </div>
      </div>

      {/* Empty state */}
      {enVeille.length === 0 ? (
        <div className="py-3 text-center">
          <p className="text-[13px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
            Ta liste En veille est vide.
          </p>
          <p className="text-[12px] mb-3" style={{ color: "var(--text-muted)" }}>
            Ajoute des œuvres pour obtenir une recommandation.
          </p>
          <button
            onClick={onAddWork}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12px] font-semibold"
            style={{ backgroundColor: "rgba(201,168,76,0.1)", color: "#B8942E", border: "1px solid rgba(201,168,76,0.25)" }}
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter une œuvre
          </button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Formulaire */}
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: "var(--text-muted)" }}>Temps disponible</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TIME_OPTIONS.map(o => (
                      <Pill key={o.value} label={o.label} active={time === o.value} onClick={() => setTime(o.value)} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: "var(--text-muted)" }}>Humeur</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MOOD_OPTIONS.map(o => (
                      <Pill key={o.value} label={o.label} active={mood === o.value} onClick={() => setMood(o.value)} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: "var(--text-muted)" }}>Contexte</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CONTEXT_OPTIONS.map(o => (
                      <Pill key={o.value} label={o.label} active={context === o.value} onClick={() => setContext(o.value)} />
                    ))}
                  </div>
                </div>
              </div>

              <motion.button
                onClick={handleAsk}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="mt-4 w-full py-3 rounded-[12px] text-[13px] font-bold transition-all flex items-center justify-center gap-2 relative overflow-hidden"
                style={{
                  background: loading ? "rgba(201,168,76,0.4)" : "linear-gradient(135deg, #C9A84C, #D4AF37)",
                  color: "#0B2545",
                  boxShadow: loading ? "none" : "0 4px 16px rgba(201,168,76,0.35)",
                }}
              >
                {!loading && (
                  <motion.div
                    className="absolute inset-0 rounded-[12px]"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)" }}
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                  />
                )}
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#0B2545]/30 border-t-[#0B2545] rounded-full animate-spin" />
                    Analyse en cours…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Surprends-moi 🎬
                  </>
                )}
              </motion.button>

              {error && (
                <p className="text-[11.5px] mt-2 text-center" style={{ color: "#EF4444" }}>{error}</p>
              )}
            </motion.div>
          ) : result.no_match ? (
            <motion.div key="nomatch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-3">
              <p className="text-[13px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                {result.reason}
              </p>
              <button onClick={reset} className="mt-2 text-[11.5px] font-medium transition-opacity hover:opacity-70 flex items-center gap-1.5 mx-auto" style={{ color: "var(--text-muted)" }}>
                <RotateCcw className="w-3 h-3" /> Modifier les critères
              </button>
            </motion.div>
          ) : (
            <ResultWork key="result" work={result.work} reason={result.reason} />
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
