import React, { useState } from "react";
import { X, Check, ChevronDown } from "lucide-react";

const ALL_TYPES = ["film", "série", "livre", "documentaire", "podcast", "vidéo", "article"];
const ALL_STATUSES = ["À voir", "En cours", "Visionné", "Pas sorti"];

export default function BulkActionBar({ count, onApply, onCancel }) {
  const [tags, setTags] = useState("");
  const [genres, setGenres] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    setLoading(true);
    await onApply({
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      genres: genres.split(",").map(g => g.trim()).filter(Boolean),
      type: type || null,
      status: status || null,
    });
    setLoading(false);
  };

  const inputStyle = {
    backgroundColor: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 8,
    color: "#fff",
    padding: "6px 10px",
    fontSize: 12,
    outline: "none",
    width: "100%",
  };

  const selectStyle = {
    ...inputStyle,
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 lg:left-[272px]"
      style={{
        backgroundColor: "#0B2545",
        borderTop: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.4)",
        padding: "14px 20px 20px",
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-bold text-[13.5px]">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full mr-2 text-[11px] font-bold"
            style={{ backgroundColor: "#E56B3A" }}>{count}</span>
          œuvre{count > 1 ? "s" : ""} sélectionnée{count > 1 ? "s" : ""}
        </span>
        <button onClick={onCancel} className="text-white/60 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-white/60 block mb-1">
            Ajouter tags
          </label>
          <input
            type="text"
            placeholder="tag1, tag2…"
            value={tags}
            onChange={e => setTags(e.target.value)}
            style={inputStyle}
            className="placeholder-white/40"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-white/60 block mb-1">
            Ajouter genres
          </label>
          <input
            type="text"
            placeholder="genre1, genre2…"
            value={genres}
            onChange={e => setGenres(e.target.value)}
            style={inputStyle}
            className="placeholder-white/40"
          />
        </div>
        <div className="relative">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-white/60 block mb-1">
            Changer le type
          </label>
          <select value={type} onChange={e => setType(e.target.value)} style={selectStyle}>
            <option value="">— inchangé —</option>
            {ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-[28px] w-3 h-3 text-white/50 pointer-events-none" />
        </div>
        <div className="relative">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-white/60 block mb-1">
            Changer le statut
          </label>
          <select value={status} onChange={e => setStatus(e.target.value)} style={selectStyle}>
            <option value="">— inchangé —</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-[28px] w-3 h-3 text-white/50 pointer-events-none" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-[8px] text-[12.5px] font-semibold transition-all"
          style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={loading}
          className="flex items-center gap-1.5 px-5 py-2 rounded-[8px] text-[12.5px] font-bold transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#E56B3A", color: "#fff" }}
        >
          <Check className="w-3.5 h-3.5" />
          {loading ? "Application…" : "Appliquer"}
        </button>
      </div>
    </div>
  );
}