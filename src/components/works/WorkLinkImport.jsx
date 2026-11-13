import React, { useEffect, useId, useRef, useState } from "react";
import { Link2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function WorkLinkImport({ onFill, onSource, onAddGqSelection }) {
  const inputId = useId();
  const request = useRef(null);
  const unrecognizedLink = useRef(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState(null);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState([]);

  useEffect(() => () => request.current?.abort(), []);

  const importMetadata = async (payload, candidate) => {
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/cover?mode=import-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 422 && payload.url) unrecognizedLink.current = payload.url;
        throw new Error(data.error || "Impossible de lire ce lien.");
      }
      if (payload.url && data.source_url) {
        unrecognizedLink.current = data.source_url;
        onSource(data.source_url);
        setInput(data.query || "");
      }
      if (data.work?.title) {
        const fields = Object.fromEntries(Object.entries(data.work).filter(([, value]) => value != null && value !== ""));
        onFill({ ...candidate, ...fields, source_url: unrecognizedLink.current || fields.source_url || candidate?.source_url });
        setResults(null);
        setMessage("Fiche préremplie. Vérifie les informations, puis ajoute l’œuvre.");
      } else if (data.matches?.length) {
        setResults(data);
        if (data.collection === "gq-documentaries") setSelected(data.matches.map(work => work.id));
      } else if (data.source_url) {
        setMessage("La fiche Fnac est conservée comme source. Saisis ou précise le titre pour relancer la recherche, ou complète la fiche.");
      } else {
        setMessage(`Aucune œuvre trouvée pour « ${data.query || input} ». Essaie avec le titre complet.`);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if (candidate) {
        onFill({ ...candidate, source_url: unrecognizedLink.current || candidate.source_url });
        setResults(null);
        setMessage("Les informations de base ont été récupérées. La source des détails est indisponible.");
      } else {
        setMessage(error.message);
      }
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  };

  const addSelection = async () => {
    if (pending || !selected.length) return;
    setPending(true);
    setMessage("");
    try {
      const { added, completed, skipped } = await onAddGqSelection(selected);
      setResults(null);
      setSelected([]);
      setMessage(`${added} documentaire${added === 1 ? " ajouté" : "s ajoutés"}${completed ? ` · ${completed} complété${completed > 1 ? "s" : ""}` : ""}${skipped ? ` · ${skipped} déjà dans la bibliothèque` : ""}.`);
    } catch {
      setMessage("Impossible d’ajouter la sélection. Réessaie.");
    } finally {
      setPending(false);
    }
  };

  const startSearch = value => {
    if (!value.trim() || pending) return;
    setResults(null);
    const query = value.trim();
    if (/^https?:\/\//i.test(query)) {
      unrecognizedLink.current = null;
      try {
        const link = new URL(query);
        if (!link.username && !link.password) onSource(link.href);
      } catch {
        // L’API valide les adresses incomplètes.
      }
      importMetadata({ url: query });
    } else {
      importMetadata({ title: query });
    }
  };

  return (
    <section className="space-y-3 rounded-xl border p-3 sm:p-4"
      style={{ backgroundColor: "var(--accent-soft)", borderColor: "var(--border)" }}>
      <form onSubmit={event => {
        event.preventDefault();
        startSearch(input);
      }} className="space-y-2">
        <label htmlFor={inputId} className="flex items-center gap-2 text-sm font-bold">
          <Link2 className="h-4 w-4" aria-hidden="true" /> Ajouter avec un lien ou un titre
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Input id={inputId} type="search" autoComplete="off" maxLength={4096}
            placeholder="Coller un lien ou saisir un titre"
            className="min-w-[150px] flex-1"
            style={{ backgroundColor: "var(--bg)", color: "var(--text-primary)", borderColor: "var(--border)" }}
            value={input} disabled={pending}
            onPaste={event => {
              const value = event.clipboardData.getData("text").trim();
              if (!/^https?:\/\/\S+$/i.test(value) || value.length > 4096) return;
              event.preventDefault();
              setInput(value);
              startSearch(value);
            }}
            onChange={event => {
              setInput(event.target.value);
              setResults(null);
              setMessage("");
            }} />
          <Button type="submit" disabled={!input.trim() || pending}
            style={{ backgroundColor: "var(--accent)", color: "#23150e" }}>
            <Search className="mr-2 h-4 w-4" aria-hidden="true" /> {pending ? "Recherche…" : "Préremplir"}
          </Button>
        </div>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Colle un lien de livre Amazon, une fiche Allociné, un livre Fnac, un replay France TV, une vidéo OK.ru ou saisis le titre.
        </p>
      </form>
      {results?.collection === "gq-documentaries" && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">{results.matches.length} documentaires dans la sélection GQ</p>
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {results.matches.map(work => (
              <li key={work.id}>
                <label className="flex min-h-11 items-center gap-3 rounded-lg border p-2 text-sm"
                  style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
                  <input type="checkbox" checked={selected.includes(work.id)} disabled={pending} onChange={event => {
                    const checked = event.target.checked;
                    setSelected(current => checked ? [...current, work.id] : current.filter(id => id !== work.id));
                  }} />
                  <img src={work.cover_image} alt="" loading="lazy" className="h-12 w-8 rounded object-cover" />
                  <span>
                    <span className="block font-semibold">{work.title}</span>
                    <span className="block text-xs" style={{ color: "var(--text-secondary)" }}>{work.year} · {work.creator}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <Button type="button" disabled={pending || !selected.length} onClick={addSelection}
            style={{ backgroundColor: "var(--accent)", color: "#23150e" }}>
            {pending ? "Ajout en cours…" : selected.length === 1 ? "Ajouter le documentaire" : `Ajouter les ${selected.length} documentaires`}
          </Button>
        </div>
      )}
      {results && !results.collection && (
        <div>
          <p className="mb-2 text-sm font-semibold">Choisis l’œuvre pour « {results.query} »</p>
          {results.incomplete && (
            <p className="mb-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              Certains catalogues sont indisponibles. Les résultats affichés sont partiels.
            </p>
          )}
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {results.matches.map(({ provider, id, ...candidate }) => (
              <li key={`${provider}-${id}`}>
                <button type="button" disabled={pending}
                  onClick={() => importMetadata({ provider, id }, candidate)}
                  className="flex w-full items-center gap-3 rounded-lg border p-2 text-left text-sm hover:opacity-80"
                  style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--border)" }}>
                  {candidate.cover_image && <img src={candidate.cover_image} alt="" loading="lazy" className="h-12 w-8 rounded object-cover" />}
                  <span className="min-w-0">
                    <span className="block font-semibold">{candidate.title}</span>
                    <span className="block text-xs capitalize" style={{ color: "var(--text-secondary)" }}>
                      {[candidate.type, candidate.year, candidate.creator].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {message && <p role="status" className="text-sm" style={{ color: "var(--text-primary)" }}>{message}</p>}
    </section>
  );
}
