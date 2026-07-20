import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tags, Search, Pencil, Trash2, Loader2, GitMerge, X } from "lucide-react";
import { tagsApi } from "@/api/tags";
import { WORKS_KEY } from "@/hooks/useWorks";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TAGS_KEY = ["tags"];

export default function TagsManager() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({ queryKey: TAGS_KEY, queryFn: tagsApi.list });

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [mergeTarget, setMergeTarget] = useState("");
  const [renaming, setRenaming] = useState(null);   // { tag, value }
  const [deleting, setDeleting] = useState(null);    // tag string

  const tags = data?.tags || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? tags.filter(t => t.tag.toLowerCase().includes(q)) : tags;
  }, [tags, search]);

  const afterChange = (title, result) => {
    queryClient.invalidateQueries({ queryKey: TAGS_KEY });
    queryClient.invalidateQueries({ queryKey: WORKS_KEY });
    toast({ title, description: `${result?.changedWorks ?? 0} œuvre(s) mise(s) à jour.` });
  };
  const onError = (err) => toast({ title: "Échec de l'opération", description: String(err?.message || err) });

  const renameMut = useMutation({
    mutationFn: ({ from, to }) => tagsApi.rename(from, to),
    onSuccess: (r, v) => afterChange(`Tag renommé en « ${v.to} »`, r),
    onError,
    onSettled: () => setRenaming(null),
  });

  const mergeMut = useMutation({
    mutationFn: ({ from, to }) => tagsApi.merge(from, to),
    onSuccess: (r, v) => { afterChange(`Tags fusionnés dans « ${v.to} »`, r); setSelected(new Set()); setMergeTarget(""); },
    onError,
  });

  const deleteMut = useMutation({
    mutationFn: (tag) => tagsApi.remove(tag),
    onSuccess: (r, tag) => {
      afterChange(`Tag « ${tag} » supprimé`, r);
      setSelected(prev => { const n = new Set(prev); n.delete(tag); return n; });
    },
    onError,
    onSettled: () => setDeleting(null),
  });

  const busy = renameMut.isPending || mergeMut.isPending || deleteMut.isPending;

  const toggle = (tag) => setSelected(prev => {
    const n = new Set(prev);
    n.has(tag) ? n.delete(tag) : n.add(tag);
    return n;
  });

  const doMerge = () => {
    const to = mergeTarget.trim();
    if (!to) { toast({ title: "Indique d'abord le tag cible" }); return; }
    if (selected.size < 2) { toast({ title: "Sélectionne au moins 2 tags à fusionner" }); return; }
    mergeMut.mutate({ from: [...selected], to });
  };

  const label = { fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--text-muted)" };

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
            Renomme, fusionne ou supprime tes tags sur toute la bibliothèque — sans scripting.
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

      {/* Barre de fusion (si sélection multiple) */}
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
          <Button onClick={doMerge} disabled={busy || selected.size < 2}
                  style={{ backgroundColor: "#6366F1", color: "#fff" }}>
            {mergeMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fusionner"}
          </Button>
          <button onClick={() => { setSelected(new Set()); setMergeTarget(""); }}
                  className="text-[12px] flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
            <X className="w-3.5 h-3.5" /> annuler
          </button>
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
                <button title="Renommer" onClick={() => setRenaming({ tag: t.tag, value: t.tag })}
                        className="p-1.5 rounded-[8px] hover:opacity-70" style={{ color: "var(--text-secondary)" }}>
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button title="Supprimer" onClick={() => setDeleting(t.tag)}
                        className="p-1.5 rounded-[8px] hover:opacity-70" style={{ color: "#EF4444" }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog renommer */}
      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer le tag</DialogTitle>
            <DialogDescription>Le nouveau nom remplacera « {renaming?.tag} » sur toutes les œuvres concernées.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={renaming?.value ?? ""}
            onChange={e => setRenaming(r => ({ ...r, value: e.target.value }))}
            onKeyDown={e => { if (e.key === "Enter") { const to = (renaming?.value || "").trim(); if (to) renameMut.mutate({ from: renaming.tag, to }); } }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>Annuler</Button>
            <Button
              onClick={() => { const to = (renaming?.value || "").trim(); if (to) renameMut.mutate({ from: renaming.tag, to }); }}
              disabled={renameMut.isPending || !(renaming?.value || "").trim()}
              style={{ backgroundColor: "#6366F1", color: "#fff" }}>
              {renameMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Renommer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le tag « {deleting} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le tag sera retiré de toutes les œuvres qui le portent. Les œuvres, elles, ne sont pas supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMut.mutate(deleting)} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
