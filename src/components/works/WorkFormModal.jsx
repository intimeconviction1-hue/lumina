import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Upload, Heart, Link2, Search, ChevronDown, ChevronUp } from "lucide-react";
import { STATUSES, STATUS_CONFIG } from "@/lib/statusActions";
import { useWorks } from "@/hooks/useWorks";
import StarRating from "./StarRating";

const TYPES = ["film", "série", "livre", "documentaire", "podcast", "vidéo", "article"];
const GENRES = [
  "polar", "thriller", "drame", "comédie", "psychologique", "famille",
  "enquête", "procès", "justice", "politique", "société", "guerre",
  "résistance", "huis clos", "satire", "religion", "éducation", "institutions", "classique"
];
const PLATFORMS = [
  "Netflix", "Prime Video", "Disney+", "Canal+", "HBO", "Apple TV+", "Arte", "FranceTV",
  "Ciné", "OneDrive", "Yggtorrent", "Khan Israël", "IKROMI", "Lenny", "OKRU"
];

const PRIORITIES = [
  { value: "urgent",     label: "🔥 Urgent",     color: "#EF4444" },
  { value: "normal",     label: "⭐ Normal",     color: "#D4AF37" },
  { value: "plus tard",  label: "🕐 Plus tard",  color: "#6366F1" },
];

// Couleurs pilotées par les tokens du thème (clair + sombre) — cf. globals.css.
const FIELD_STYLE = { backgroundColor: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)" };
const INACTIVE_PILL = { borderColor: "var(--border)", backgroundColor: "transparent", color: "var(--text-secondary)" };

const emptyForm = {
  title: "", type: "film", creator: "",
  status: "À voir", priority: "normal", genre: [], platform: [],
  year: "", description: "", rating: 0, favorite: false,
  cover_image: "", source_url: "", tags: [],
  duration_minutes: "", country: "", language: "",
  personal_note: "", recommended_by: "",
};

// Libellé de champ — couleur pilotée par le token --text-muted (s'adapte au thème).
function Label({ children, className = "mb-1.5" }) {
  return (
    <label className={`text-[11.5px] font-semibold uppercase tracking-[0.1em] block ${className}`} style={{ color: "var(--text-muted)" }}>
      {children}
    </label>
  );
}

function Chips({ items, selected = [], onChange, color = "#D4AF37" }) {
  const toggle = (item) => {
    onChange(selected.includes(item) ? selected.filter(x => x !== item) : [...selected, item]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => {
        const active = selected.includes(item);
        return (
          <button key={item} type="button" onClick={() => toggle(item)}
            className="px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-all capitalize"
            style={active
              ? { borderColor: color, backgroundColor: `${color}15`, color }
              : INACTIVE_PILL}>
            {item}
          </button>
        );
      })}
    </div>
  );
}

function TagInput({ tags = [], onChange, suggestions = [] }) {
  const [input, setInput] = useState("");
  const add = (val) => {
    const v = (val ?? input).trim().toLowerCase();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput("");
  };
  // Suggestions : tags existants qui correspondent à la saisie et pas déjà ajoutés.
  const matches = React.useMemo(() => {
    const q = input.trim().toLowerCase();
    return suggestions
      .filter(t => !tags.includes(t) && (q === "" ? true : t.includes(q)))
      .slice(0, 10);
  }, [input, suggestions, tags]);
  const exactExists = suggestions.includes(input.trim().toLowerCase());

  return (
    <div>
      <div className="flex items-center gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Ajouter un tag…"
          className="text-[13px]"
          style={FIELD_STYLE}
        />
        <button type="button" onClick={() => add()}
          className="px-3 py-2 rounded-[10px] text-[12px] font-semibold border transition-colors flex-shrink-0 hover:opacity-80"
          style={INACTIVE_PILL}>
          +
        </button>
      </div>

      {/* Suggestions (tags déjà utilisés ailleurs) — évite les doublons */}
      {matches.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {input.trim() && !exactExists && (
            <span className="text-[11px] self-center mr-1" style={{ color: "var(--text-muted)" }}>Nouveau : #{input.trim().toLowerCase()} — ou réutiliser :</span>
          )}
          {matches.map(t => (
            <button key={t} type="button" onClick={() => add(t)}
              className="px-2.5 py-1 rounded-full text-[11.5px] font-medium border border-dashed transition-all"
              style={{ borderColor: "rgba(139,92,246,0.35)", color: "#7C3AED", backgroundColor: "rgba(139,92,246,0.04)" }}>
              #{t}
            </button>
          ))}
        </div>
      )}

      {/* Tags sélectionnés */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-medium"
              style={{ backgroundColor: "rgba(139,92,246,0.08)", color: "#7C3AED", border: "1px solid rgba(139,92,246,0.2)" }}>
              #{t}
              <button type="button" onClick={() => onChange(tags.filter(x => x !== t))} className="hover:opacity-70 transition-opacity">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkFormModal({ open, onClose, work, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showExtra, setShowExtra] = useState(false);

  // Tags déjà utilisés dans la bibliothèque (pour l'autocomplétion)
  const { data: allWorks = [] } = useWorks();
  const allTags = React.useMemo(() => {
    const s = new Set();
    allWorks.forEach(w => (w.tags || []).forEach(t => s.add(t)));
    return [...s].sort((a, b) => a.localeCompare(b, "fr"));
  }, [allWorks]);

  useEffect(() => {
    if (work) {
      setForm({
        ...emptyForm, ...work,
        creator: work.creator || work.creator_name || "",
        genre: work.genre || [],
        platform: Array.isArray(work.platform) ? work.platform : (work.platform ? [work.platform] : []),
        year: work.year || work.released_year || "",
        duration_minutes: work.duration_minutes || "",
        tags: work.tags || [],
        status: work.status || "À voir",
      });
    } else {
      setForm(emptyForm);
    }
    setShowExtra(false);
  }, [work, open]);

  const set = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const uploadCover = async (dataUrl, filename = "cover") => {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl, filename }),
    });
    if (!res.ok) {
      let msg = "Échec de l'upload";
      try { const d = await res.json(); if (d?.error) msg = d.error; } catch { /* */ }
      throw new Error(msg);
    }
    const { url } = await res.json();
    return url;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const url = await uploadCover(dataUrl, file.name);
      set("cover_image", url);
    } catch (err) {
      console.error("Image upload failed:", err);
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      let cover_image = form.cover_image;
      // Si la couverture est encore une data-URL base64, on l'envoie au Blob avant de sauver.
      if (cover_image && cover_image.startsWith("data:")) {
        try {
          cover_image = await uploadCover(cover_image, "cover");
        } catch (uploadErr) {
          console.error("Image upload failed:", uploadErr);
          cover_image = "";
        }
      }
      const data = {
        ...form,
        cover_image: cover_image || null,
        creator: form.creator || null,
        creator_name: form.creator || null,
        year: form.year ? Number(form.year) : null,
        rating: form.rating || null,
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      };
      await onSave(data);
      setSaving(false);
    } catch (err) {
      console.error("Save failed:", err);
      setSaving(false);
    }
  };

  const isWatched = form.status === "Visionné" || form.status === "Lu";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[92vh] overflow-hidden flex flex-col p-0"
        style={{ borderRadius: "20px", backgroundColor: "var(--card-bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
      >
        {/* Header */}
        <div className="px-8 pt-7 pb-4 flex-shrink-0 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <h2 className="text-[18px] font-bold" style={{ color: "var(--text-primary)" }}>
            {work ? "Modifier l'œuvre" : "Nouvelle œuvre"}
          </h2>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {work ? "Mettez à jour les informations" : "Ajoutez une œuvre à votre bibliothèque"}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

          {/* — RECHERCHE — préparation auto-import */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Rechercher pour pré-remplir… (bientôt disponible)"
              disabled
              className="w-full pl-9 pr-4 py-2.5 rounded-[12px] text-[13px] border border-dashed cursor-not-allowed"
              style={{ ...FIELD_STYLE, color: "var(--text-muted)" }}
            />
          </div>

          {/* — TITRE + CRÉATEUR — */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Titre *</Label>
              <Input
                value={form.title}
                onChange={e => set("title", e.target.value)}
                placeholder="Titre de l'œuvre"
                className="text-[14px] font-medium"
                style={FIELD_STYLE}
              />
            </div>
            <div>
              <Label>Créateur</Label>
              <Input value={form.creator} onChange={e => set("creator", e.target.value)} placeholder="Réalisateur, auteur…" style={FIELD_STYLE} />
            </div>
            <div>
              <Label>Type</Label>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map(t => (
                  <button key={t} type="button" onClick={() => set("type", t)}
                    className="px-2.5 py-1 rounded-full text-[11.5px] font-medium border transition-all capitalize"
                    style={form.type === t
                      ? { borderColor: "#0B2545", backgroundColor: "#0B254520", color: "var(--text-primary)" }
                      : INACTIVE_PILL}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* — STATUT — */}
          <div>
            <Label className="mb-2">Statut</Label>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map(s => {
                const isBook = form.type === "livre";
                // Livres : pas de "À voir" — le vocabulaire lecture est "À lire" (= Envie de lire).
                if (isBook && s === "À voir") return null;
                // Libellés livres : "Envie de lire" → "À lire", "Visionné" → "Lu".
                const displayLabel = isBook
                  ? (s === "Visionné" ? "Lu" : s === "Envie de lire" ? "À lire" : s)
                  : s;
                const conf = STATUS_CONFIG[s];
                // Statut canonique en base : on stocke toujours "Visionné" (jamais "Lu").
                // L'affichage "Lu" est géré par le libellé ci-dessus.
                const storeVal = s;
                let isActive = form.status === storeVal;
                // Récupère les livres legacy (stockés "À voir" ou "Lu").
                if (isBook && s === "Envie de lire" && form.status === "À voir") isActive = true;
                if (isBook && s === "Visionné" && form.status === "Lu") isActive = true;
                return (
                  <button key={s} type="button" onClick={() => set("status", storeVal)}
                    className="px-4 py-2 rounded-full text-[12.5px] font-semibold border transition-all"
                    style={isActive
                      ? { borderColor: conf.color, backgroundColor: conf.bg, color: conf.color }
                      : INACTIVE_PILL}>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full inline-block mr-1.5 -mb-0.5" style={{ backgroundColor: conf.dot }} />}
                    {displayLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* — PRIORITÉ (visible si à consommer : "À voir" ou "Envie de lire") — */}
          {(form.status === "À voir" || form.status === "Envie de lire") && (
            <div>
              <Label className="mb-2">Priorité</Label>
              <div className="flex gap-2">
                {PRIORITIES.map(p => (
                  <button key={p.value} type="button" onClick={() => set("priority", p.value)}
                    className="flex-1 py-2 rounded-[12px] text-[12.5px] font-semibold border transition-all"
                    style={form.priority === p.value
                      ? { borderColor: p.color, backgroundColor: `${p.color}12`, color: p.color }
                      : INACTIVE_PILL}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* — GENRES + PLATEFORMES — */}
          <div>
            <Label className="mb-2">Genres</Label>
            <Chips items={GENRES} selected={form.genre} onChange={v => set("genre", v)} color="#D4AF37" />
          </div>

          <div>
            <Label className="mb-2">Plateformes</Label>
            <Chips items={PLATFORMS} selected={form.platform} onChange={v => set("platform", v)} color="#2AA6A0" />
          </div>

          {/* — RÉSUMÉ — */}
          <div>
            <Label>Résumé</Label>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Synopsis, contexte…" className="h-24 resize-none text-[13px]" style={FIELD_STYLE} />
          </div>

          {/* — ANNÉE + DURÉE — */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Année</Label>
              <Input type="number" value={form.year} onChange={e => set("year", e.target.value)} placeholder="2024" style={FIELD_STYLE} />
            </div>
            <div>
              <Label>Durée (min)</Label>
              <Input type="number" value={form.duration_minutes} onChange={e => set("duration_minutes", e.target.value)} placeholder="120" style={FIELD_STYLE} />
            </div>
          </div>

          {/* — IMAGE — */}
          <div>
            <Label className="mb-2">Image de couverture</Label>
            <div className="flex items-start gap-3">
              {/* Preview */}
              <div className="relative flex-shrink-0 w-16 h-[88px] rounded-[10px] overflow-hidden border flex items-center justify-center" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
                {form.cover_image ? (
                  <>
                    <img src={form.cover_image} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => set("cover_image", "")}
                      className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5">
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </>
                ) : (
                  <Upload className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                )}
              </div>
              {/* Controls */}
              <div className="flex-1 space-y-2">
                <label className="flex items-center gap-2 px-3 py-2 rounded-[10px] border text-[12.5px] cursor-pointer transition-colors hover:opacity-80"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)", color: "var(--text-secondary)" }}>
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? "Upload en cours…" : "Choisir un fichier"}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                <Input
                  value={form.cover_image}
                  onChange={e => set("cover_image", e.target.value)}
                  placeholder="Ou coller une URL…"
                  className="text-[12.5px]"
                  style={FIELD_STYLE}
                />
              </div>
            </div>
          </div>

          {/* — URL SOURCE — */}
          <div>
            <Label>URL source</Label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              <Input
                type="text"
                value={form.source_url}
                onChange={e => set("source_url", e.target.value)}
                placeholder="https://..."
                className="pl-8 text-[13px]"
                style={FIELD_STYLE}
              />
            </div>
          </div>

          {/* — TAGS — */}
          <div>
            <Label className="mb-2">Tags</Label>
            <TagInput tags={form.tags} onChange={v => set("tags", v)} suggestions={allTags} />
          </div>

          {/* — NOTE (visible uniquement si Visionné) — */}
          {isWatched && (
            <div>
              <label className="text-[11.5px] font-semibold uppercase tracking-[0.1em] mb-2 block" style={{ color: "var(--text-muted)" }}>
                Votre note <span className="normal-case font-normal" style={{ color: "var(--text-muted)" }}>(clic gauche = demi-étoile, droit = étoile pleine)</span>
              </label>
              <StarRating value={form.rating || 0} onChange={v => set("rating", v)} size="lg" />
            </div>
          )}

          {/* — FAVORI — */}
          <button type="button" onClick={() => set("favorite", !form.favorite)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border text-[13px] font-medium transition-all"
            style={form.favorite
              ? { borderColor: "#EC4899", color: "#EC4899", backgroundColor: "rgba(236,72,153,0.06)" }
              : { borderColor: "var(--border)", color: "var(--text-muted)", backgroundColor: "transparent" }}>
            <Heart className={`w-4 h-4 ${form.favorite ? "fill-[#EC4899]" : ""}`} />
            {form.favorite ? "Dans les favoris" : "Ajouter aux favoris"}
          </button>

          {/* — INFORMATIONS COMPLÉMENTAIRES (repliable) — */}
          <div>
            <button type="button" onClick={() => setShowExtra(v => !v)}
              className="flex items-center gap-2 text-[12px] font-semibold transition-colors w-full py-1 hover:opacity-80"
              style={{ color: "var(--text-muted)" }}>
              {showExtra ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Informations complémentaires
              <span className="flex-1 h-px ml-1" style={{ backgroundColor: "var(--border-subtle)" }} />
            </button>

            {showExtra && (
              <div className="mt-4 space-y-4 pl-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Langue</Label>
                    <div className="flex gap-2">
                      {["VO", "VF"].map(l => (
                        <button key={l} type="button" onClick={() => set("language", form.language === l ? "" : l)}
                          className="flex-1 py-2 rounded-[10px] text-[12.5px] font-semibold border transition-all"
                          style={form.language === l
                            ? { borderColor: "#0B2545", backgroundColor: "#0B254520", color: "var(--text-primary)" }
                            : INACTIVE_PILL}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Pays</Label>
                    <Input value={form.country} onChange={e => set("country", e.target.value)} placeholder="France" style={FIELD_STYLE} />
                  </div>
                </div>
                <div>
                  <Label>Note personnelle</Label>
                  <Textarea value={form.personal_note} onChange={e => set("personal_note", e.target.value)} placeholder="Réflexions, apprentissages…" className="h-24 resize-none text-[13px]" style={FIELD_STYLE} />
                </div>
                <div>
                  <Label>Recommandé par</Label>
                  <Input value={form.recommended_by} onChange={e => set("recommended_by", e.target.value)} placeholder="Nom d'une personne ou source…" style={FIELD_STYLE} />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 px-8 py-5 border-t flex-shrink-0" style={{ borderColor: "var(--border-subtle)", backgroundColor: "transparent" }}>
          <button type="button" onClick={onClose}
            className="px-6 py-3 rounded-[12px] text-[13.5px] font-medium border transition-colors hover:opacity-80"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)", backgroundColor: "transparent" }}>
            Annuler
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving || !form.title.trim()}
            className="flex-1 py-3 rounded-[12px] text-[13.5px] font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #0B2545, #163a6b)", boxShadow: "0 4px 14px rgba(11,37,69,0.2)" }}>
            {saving ? "Enregistrement…" : work ? "Enregistrer les modifications" : "Ajouter à la bibliothèque"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
