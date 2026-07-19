/**
 * Système de statuts et d'actions — source de vérité unique
 * Utilisé par : WorkCard, WorkDetail, WorkFormModal, AllWorks, FiltersPanel, Home, Sidebar
 */

// Les statuts officiels
export const STATUSES = ["À voir", "En cours", "Visionné", "Pas sorti", "Envie de lire"];

// Couleurs canoniques par type — source unique (carte, filtres, badges).
export const TYPE_COLORS = {
  film:         "#0B2545",
  série:        "#D4AF37",
  livre:        "#6366F1",
  documentaire: "#2AA6A0",
  podcast:      "#475569",
  vidéo:        "#475569",
  article:      "#475569",
};

// Config visuelle par statut
export const STATUS_CONFIG = {
  "À voir":         { color: "#94A3B8", bg: "rgba(148,163,184,0.1)", dot: "#94A3B8", label: "À voir" },
  "En cours":       { color: "#D4AF37", bg: "rgba(212,175,55,0.1)",  dot: "#D4AF37", label: "En cours" },
  "Visionné":       { color: "#2AA6A0", bg: "rgba(42,166,160,0.1)",  dot: "#2AA6A0", label: "Visionné" },
  "Pas sorti":      { color: "#6366F1", bg: "rgba(99,102,241,0.1)",  dot: "#6366F1", label: "Pas sorti" },
  "Envie de lire":  { color: "#8B5CF6", bg: "rgba(139,92,246,0.1)", dot: "#8B5CF6", label: "À lire" },
  // Livres terminés — vert, distinct du turquoise "Visionné" (films/séries).
  "Lu":             { color: "#22C55E", bg: "rgba(34,197,94,0.1)",   dot: "#22C55E", label: "Lu" },
};

// Actions contextuelles par statut logique
export const STATUS_ACTIONS = {
  "À voir": [
    { id: "start",   label: "Commencer",       icon: "Play",         targetStatus: "En cours",  variant: "primary" },
  ],
  "Envie de lire": [
    { id: "start",   label: "Commencer",       icon: "Play",         targetStatus: "En cours",  variant: "primary" },
  ],
  "En cours": [
    { id: "pause",   label: "Mettre en pause", icon: "Pause",        targetStatus: "À voir",    variant: "secondary" },
    { id: "finish",  label: "Terminer",         icon: "CheckCircle2", targetStatus: "Visionné",  variant: "primary" },
  ],
  "Visionné": [
    { id: "rewatch", label: "Revoir",           icon: "RotateCcw",   targetStatus: "En cours",  variant: "secondary" },
  ],
  "Lu": [
    { id: "rewatch", label: "Relire",           icon: "RotateCcw",   targetStatus: "En cours",  variant: "secondary" },
  ],
  "Pas sorti": [],
};

// Migration legacy → statut officiel
export function normalizeStatus(status) {
  if (!status) return "À voir";
  const map = {
    "terminé":     "Visionné",
    "à découvrir": "À voir",
    "abandonné":   "À voir",
    "done":        "Visionné",
    "en cours":    "En cours",
    "En cours":    "En cours",
    "En veille":   "À voir",
    "À voir":      "À voir",
    "Visionné":    "Visionné",
    "Pas sorti":   "Pas sorti",
  };
  return map[status] || "À voir";
}
// Alias des statuts LEGACY → vocabulaire de filtrage courant.
// NB : on ne mappe PAS "Lu" ici — "Lu" est un statut logique valide (livres terminés),
// distinct de "Visionné" (films/séries terminés). Réutilisé par Layout (nav) et AllWorks (URL).
export const STATUS_ALIASES = {
  "En veille":   "À voir",
  "terminé":     "Visionné",
  "à découvrir": "À voir",
  "abandonné":   "À voir",
  "done":        "Visionné",
};

// Normalise une valeur de statut venant de la nav / d'un paramètre d'URL
// (legacy → vocabulaire courant), en préservant "Lu" et "Envie de lire".
export function normalizeNavStatus(status) {
  if (!status) return status;
  return STATUS_ALIASES[status] || status;
}

// STATUT LOGIQUE d'une œuvre — SOURCE UNIQUE pour filtrer, compter et afficher.
// Applique les alias legacy + le vocabulaire par type :
//   • livre  : à lire → "Envie de lire", terminé → "Lu"
//   • autres : terminé → "Visionné" (un "Lu" legacy sur un non-livre est ramené à "Visionné")
export function effectiveStatus(work) {
  const s = STATUS_ALIASES[work?.status] || work?.status || "À voir";
  if (work?.type === "livre") {
    if (s === "À voir" || s === "Envie de lire") return "Envie de lire";
    if (s === "Visionné" || s === "Lu") return "Lu";
    return s; // "En cours", "Pas sorti"
  }
  if (s === "Lu") return "Visionné";
  return s;
}

// Alias historique — même logique que effectiveStatus (conservé pour la lisibilité des appels de filtrage).
export const filterStatus = effectiveStatus;

// L'œuvre est-elle terminée (vue OU lue) ?
export function isFinished(work) {
  const s = effectiveStatus(work);
  return s === "Visionné" || s === "Lu";
}

// L'œuvre correspond-elle à la sélection de statuts du panneau de filtres ?
export function matchesStatusFilter(work, selected) {
  if (!selected || selected.length === 0) return true;
  return selected.includes(effectiveStatus(work));
}
