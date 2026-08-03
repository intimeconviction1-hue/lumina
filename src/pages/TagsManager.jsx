import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tags, Search, Pencil, Trash2, Loader2, GitMerge, X, AlertTriangle } from "lucide-react";
import { tagsApi } from "@/api/tags";
import { WORKS_KEY } from "@/hooks/useWorks";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

const TAGS_KEY = ["tags"];

// Le serveur enregistre toujours le tag cible en minuscules (cohérent avec la
// saisie dans le formulaire d'œuvre et avec le corpus Babelio). On applique la
// même règle ici pour AFFICHER la valeur réelle avant d'appliquer — plus de
// message qui annonce « Polar France » quand la base reçoit « polar france ».
const normalizeTag = (s) => String(s || "").trim().toLowerCase();

export default function TagsManager() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({ queryKey: TAGS_KEY, queryFn: tagsApi.list });

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [mergeTarget, setMergeTarget] = useState("");
  const [renaming, setRenaming] = useState(null);   // { tag, value }
  const [confirm, setConfirm] = useState(null);     // { action, from[], to, preview }

  const tags = data?.tags || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? tags.filter(t => t.tag.toLowerCase().includes(q)) : tags;
  }, [tags, search]);

  const onError = (err) => toast({ title: "Échec de l'opération", description: String(err?.message || err) });

  // ÉTAPE 1 — aperçu : calcule l'impact sans rien écrire, puis ouvre la confirmation.
  const previewMut = useMutation({
    mutationFn: ({ action, from, to }) => tagsApi.preview(action, from, to),
    onSuccess: (preview, vars) => setConfirm({ ...vars, preview }),
    onError,
  });

  // ÉTAPE 2 — application réelle, seulement après confirmation explicite.
  const applyMut = useMutation({
    mutationFn: ({ action, from, to }) => {
      if (action === "rename") return tagsApi.rename(from[0], to);
      if (action === "merge") return tagsApi.merge(from, to);
      return tagsApi.remove(from[0]);
    },
    onSuccess: (result, vars) => {
      queryClient.invalidateQueries({ queryKey: TAGS_KEY });
      queryClient.invalidateQueries({ queryKey: WORKS_KEY });
      // On affiche la cible RENVOYÉE PAR LE SERVEUR, pas la saisie brute.
      const done = vars.action === "delete"
        ? `Tag « ${vars.from[0]} » supprimé`
        : `Appliqué : « ${result?.target ?? vars.to} »`;
      toast({ title: done, description: `${result?.changedWorks ?? 0} œuvre(s) mise(s) à jour.` });
      setSelected(new Set());
      setMergeTarget("");
      setRenaming(null);
      setConfirm(null);
    },
    onError,
  });

  const busy = previewMut.isPending || applyMut.isPending;

  const toggle = (tag) => setSelected(prev => {
    const n = new Set(prev);
    n.has(tag) ? n.delete(tag) : n.add(tag);
    return n;
  });

  const askRename = () => {
    const to = normalizeTag(renaming?.value);
    if (!to) return;
    previewMut.mutate({ action: "rename", from: [renaming.tag], to });
  };

  const askMerge = () => {
    const to = normalizeTag(mergeTarget);
    if (!to) { toast({ title: "Indique d'abord le tag cible" }); return; }
    if (selected.size < 2) { toast({ title: "Sélectionne au moins 2 tags à fusionner" }); return; }
    previewMut.mutate({ action: "merge", from: [...selected], to });
  };

  const askDelete = (tag) => previewMut.mutate({ action: "delete", from: [tag], to: null });

  const label = { fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--text-muted)" };

  // Aperçu de la normalisation, affiché sous le champ quand la saisie diffère.
  const NormHint = ({ value }) => {
    const norm = normalizeTag(value);
    if (!norm || norm === String(value || "").trim()) return null;
    return (
      <p className="text-[11.5px] mt-1.5" style={{ color: "var(--text-muted)" }}>
        Sera enregistré : <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{norm}</span>
      </p>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-1">
        <span className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#6366F118" }}>
          <Tags className="w-4 h-4" style={{ color: "#6366F1" }} />
        </span>
        <div>
          <h1 className="text-[20px] font-bold leading-none" style={{ color: "var(--text-primary)" }}>Gestion des tags</h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>
            Renomme, fusionne ou supprime tes tags sur toute la bibliothèque — avec aperçu avant application.
          </p>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative mt-5 mb-3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Chercher un tag…"
          className="pl-9"
        />
      </div>

      {/* Barre de fusion (si sélection) */}
      {selected.size >= 1 && (
        <div className="flex flex-wrap items-center gap-2 p-3 mb-3 rounded-[12px]"
             style={{ backgroundColor: "#6366F110", border: "1px solid #6366F130" }}>
          <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
            {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
          </span>
          <GitMerge className="w-4 h-4" style={{ color: "#6366F1" }} />
          <Input
            value={mergeTarget}
            onChange={e => setMergeTarget(e.target.value)}
            placeholder="fusionner en… (tag cible)"
            className="w-52 h-9"
          />
          <Button onClick={askMerge} disabled={busy || selected.size < 2}
                  style={{ backgroundColor: "#6366F1", color: "#fff" }}>
            {previewMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aperçu de la fusion"}
          </Button>
          <button onClick={() => { setSelected(new Set()); setMergeTarget(""); }}
                  className="text-[12px] flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
            <X className="w-3.5 h-3.5" /> annuler
          </button>
          <div className="w-full"><NormHint value={mergeTarget} /></div>
        </div>
      )}

      {/* Compteur */}
      <div className="flex items-center justify-between px-1 mb-2">
        <span style={label}>{filtered.length} tag{filtered.length > 1 ? "s" : ""}</span>
        {data?.totalWorks != null && <span style={label}>{data.totalWorks} œuvres</span>}
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-secondary)" }} />
        </div>
      ) : isError ? (
        <div className="p-4 rounded-[12px] text-[13px]" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}>
          Erreur de chargement : {String(error?.message || error)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-[13px] py-8 text-center" style={{ color: "var(--text-muted)" }}>Aucun tag.</p>
      ) : (
        <div className="rounded-[14px] overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {filtered.map((t, i) => {
            const isSel = selected.has(t.tag);
            return (
              <div key={t.tag}
                   className="flex items-center gap-3 px-3 py-2.5"
                   style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)", backgroundColor: isSel ? "#6366F10D" : "transparent" }}>
                <input type="checkbox" checked={isSel} onChange={() => toggle(t.tag)}
                       className="w-4 h-4 cursor-pointer accent-indigo-500 flex-shrink-0" />
                <span className="flex-1 text-[13.5px] truncate" style={{ color: "var(--text-primary)" }}>{t.tag}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: "var(--bg)", color: "var(--text-muted)" }}>{t.count}</span>
                <button title="Renommer" disabled={busy} onClick={() => setRenaming({ tag: t.tag, value: t.tag })}
                        className="p-1.5 rounded-[8px] hover:opacity-70 disabled:opacity-40" style={{ color: "var(--text-secondary)" }}>
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button title="Supprimer" disabled={busy} onClick={() => askDelete(t.tag)}
                        className="p-1.5 rounded-[8px] hover:opacity-70 disabled:opacity-40" style={{ color: "#EF4444" }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog renommer — saisie du nouveau nom */}
      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer le tag</DialogTitle>
            <DialogDescription>Le nouveau nom remplacera « {renaming?.tag} » sur toutes les œuvres concernées.</DialogDescription>
          </DialogHeader>
          <div>
            <Input
              autoFocus
              value={renaming?.value ?? ""}
              onChange={e => setRenaming(r => ({ ...r, value: e.target.value }))}
              onKeyDown={e => { if (e.key === "Enter") askRename(); }}
            />
            <NormHint value={renaming?.value} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>Annuler</Button>
            <Button
              onClick={askRename}
              disabled={busy || !normalizeTag(renaming?.value)}
              style={{ backgroundColor: "#6366F1", color: "#fff" }}>
              {previewMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Voir l'aperçu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation — affiche l'impact réel avant d'écrire quoi que ce soit */}
      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm?.action === "delete" ? "Supprimer ce tag ?"
                : confirm?.action === "merge" ? "Fusionner ces tags ?"
                : "Renommer ce tag ?"}
            </DialogTitle>
            <DialogDescription>
              {confirm?.action === "delete"
                ? <>« {confirm?.from?.[0]} » sera retiré de toutes les œuvres qui le portent. Les œuvres ne sont pas supprimées.</>
                : <>{confirm?.from?.join(" , ")} → <strong>{confirm?.preview?.target ?? confirm?.to}</strong></>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Impact chiffré */}
            <div className="p-3 rounded-[12px] text-[13px]"
                 style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              <strong>{confirm?.preview?.changedWorks ?? 0}</strong> œuvre(s) seront modifiées.
              {confirm?.preview?.sample?.length > 0 && (
                <p className="text-[12px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                  Par exemple : {confirm.preview.sample.join(" · ")}
                  {confirm.preview.changedWorks > confirm.preview.sample.length && " …"}
                </p>
              )}
            </div>

            {/* Avertissement de collision : un « renommage » qui est en fait une fusion */}
            {confirm?.preview?.collision && (
              <div className="flex gap-2 p-3 rounded-[12px] text-[12.5px]"
                   style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.35)", color: "#B45309" }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Le tag « {confirm?.preview?.target} » existe déjà sur {confirm.preview.collisionCount} œuvre(s).
                  Cette opération va donc <strong>fusionner</strong> les deux, pas simplement renommer. C'est irréversible.
                </span>
              </div>
            )}

            {confirm?.preview?.changedWorks === 0 && (
              <p className="text-[12.5px]" style={{ color: "var(--text-muted)" }}>
                Aucune œuvre concernée — l'opération n'aurait aucun effet.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>Annuler</Button>
            <Button
              onClick={() => applyMut.mutate({ action: confirm.action, from: confirm.from, to: confirm.to })}
              disabled={applyMut.isPending || !confirm?.preview?.changedWorks}
              className={confirm?.action === "delete" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
              style={confirm?.action === "delete" ? undefined : { backgroundColor: "#6366F1", color: "#fff" }}>
              {applyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Appliquer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
