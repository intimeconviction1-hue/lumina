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
  // Statut spécifique aux livres terminés (le formulaire stocke "Lu" et non "Visionné").
  "Lu":             { color: "#2AA6A0", bg: "rgba(42,166,160,0.1)",  dot: "#2AA6A0", label: "Lu" },
};

// Actions contextuelles par statut
export const STATUS_ACTIONS = {
  "À voir": [
    { id: "start",   label: "Commencer",       icon: "Play",         targetStatus: "En cours",  variant: "primary" },
  ],
  "En cours": [
    { id: "pause",   label: "Mettre en pause", icon: "Pause",        targetStatus: "À voir",    variant: "secondary" },
    { id: "finish",  label: "Terminer",         icon: "CheckCircle2", targetStatus: "Visionné",  variant: "primary" },
  ],
  "Visionné": [
    { id: "rewatch", label: "Revoir",           icon: "RotateCcw",   targetStatus: "En cours",  variant: "secondary" },
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
// Statut "effectif" pour l'affichage : applique le vocabulaire livres
// (À voir → Envie de lire, Visionné → Lu). Utilisé par WorkCard / WorksGrid.
export function effectiveStatus(work) {
  if (work?.type === "livre") {
    if (work.status === "À voir") return "Envie de lire";
    if (work.status === "Visionné") return "Lu";
  }
  return work?.status;
}

// Alias des statuts legacy → statut canonique officiel.
// Source unique, réutilisée par Layout (nav sidebar) et AllWorks (params URL).
export const STATUS_ALIASES = {
  "En veille":   "À voir",
  "terminé":     "Visionné",
  "à découvrir": "À voir",
  "abandonné":   "À voir",
  "done":        "Visionné",
  "Lu":          "Visionné",
};

// Statut canonique d'une chaîne brute (applique les alias legacy).
export function canonicalStatus(status) {
  if (!status) return "À voir";
  return STATUS_ALIASES[status] || status;
}

// Statut d'une œuvre tel qu'il doit être comparé aux filtres :
// alias legacy + vocabulaire livre (À voir → Envie de lire).
export function filterStatus(work) {
  let s = canonicalStatus(work?.status);
  if (work?.type === "livre" && s === "À voir") s = "Envie de lire";
  return s;
}

// L'œuvre correspond-elle à la sélection de statuts du panneau de filtres ?
export function matchesStatusFilter(work, selected) {
  if (!selected || selected.length === 0) return true;
  return selected.includes(filterStatus(work));
}
