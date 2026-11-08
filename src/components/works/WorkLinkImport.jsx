import React, { useEffect, useId, useRef, useState } from "react";
import { Link2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function WorkLinkImport({ onFill, onSource }) {
  const inputId = useId();
  const request = useRef(null);
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => () => request.current?.abort(), []);

  const importMetadata = async (payload, candidate) => {
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/import-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de lire ce lien.");
      if (data.work?.title) {
        const fields = Object.fromEntries(Object.entries(data.work).filter(([, value]) => value != null && value !== ""));
        onFill({ ...candidate, ...fields });
        setResults(null);
        setMessage("Fiche préremplie. Vérifie les informations, puis ajoute l’œuvre.");
      } else if (data.matches?.length) {
        setResults(data);
      } else {
        setMessage(`Aucune œuvre trouvée pour « ${data.query || url} ». Essaie avec le titre complet.`);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if (candidate) {
        onFill(candidate);
        setResults(null);
        setMessage("Les informations de base ont été récupérées. La source des détails est indisponible.");
      } else {
        setMessage(error.message);
      }
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  };

  const startSearch = value => {
    if (!value.trim() || pending) return;
    setResults(null);
    try {
      const link = new URL(value.trim());
      if (["https:", "http:"].includes(link.protocol) && !link.username && !link.password) onSource(link.href);
    } catch {
      // L’API renvoie le message de validation du lien.
    }
    importMetadata({ url: value.trim() });
  };

  return (
    <section className="space-y-3 rounded-xl border p-3 sm:p-4"
      style={{ backgroundColor: "var(--accent-soft)", borderColor: "var(--border)" }}>
      <form onSubmit={event => {
        event.preventDefault();
        startSearch(url);
      }} className="space-y-2">
        <label htmlFor={inputId} className="flex items-center gap-2 text-sm font-bold">
          <Link2 className="h-4 w-4" aria-hidden="true" /> Ajouter avec un lien
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Input id={inputId} type="url" inputMode="url" autoComplete="off" maxLength={4096}
            placeholder="Coller un lien"
            className="min-w-[150px] flex-1"
            style={{ backgroundColor: "var(--bg)", color: "var(--text-primary)", borderColor: "var(--border)" }}
            value={url} disabled={pending}
            onPaste={event => {
              const value = event.clipboardData.getData("text").trim();
              if (!/^https?:\/\/\S+$/i.test(value) || value.length > 4096) return;
              event.preventDefault();
              setUrl(value);
              startSearch(value);
            }}
            onChange={event => {
              setUrl(event.target.value);
              setResults(null);
              setMessage("");
            }} />
          <Button type="submit" disabled={!url.trim() || pending}
            style={{ backgroundColor: "var(--accent)", color: "#23150e" }}>
            <Search className="mr-2 h-4 w-4" aria-hidden="true" /> {pending ? "Recherche…" : "Préremplir"}
          </Button>
        </div>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Recherche Google, IMDb, TMDB, Google Books, Open Library ou YouTube.
        </p>
      </form>
      {results && (
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
