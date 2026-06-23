import React, { useMemo, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWorks, WORKS_KEY } from "@/hooks/useWorks";
import { base44 } from "@/api/base44Client";
import { BookImage } from "lucide-react";

const PAUSE_MS = 400;
const RETRY_WAIT_MS = 2000;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchCoverOpenLibrary(title, author) {
  const q = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=1`;
  try {
    const res = await fetch(q);
    if (!res.ok) return null;
    const data = await res.json();
    const coverId = data?.docs?.[0]?.cover_i;
    if (coverId) return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
  } catch { /* ignore */ }
  return null;
}

// Returns { image, limited }
async function fetchCoverGoogle(title, author) {
  const q = encodeURIComponent(`${title} ${author}`.trim());
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&country=FR`;
  const tryFetch = async () => {
    const res = await fetch(url);
    return res;
  };
  try {
    let res = await tryFetch();
    if (res.status === 429) {
      await sleep(RETRY_WAIT_MS);
      res = await tryFetch();
      if (res.status === 429) return { image: null, limited: true };
    }
    if (!res.ok) return { image: null, limited: false };
    const data = await res.json();
    const info = data?.items?.[0]?.volumeInfo?.imageLinks;
    const raw = info?.thumbnail || info?.smallThumbnail || null;
    if (!raw) return { image: null, limited: false };
    return { image: raw.replace(/^http:/, "https:").replace(/&edge=curl/g, ""), limited: false };
  } catch {
    return { image: null, limited: false, networkError: true };
  }
}

export default function Enrichissement() {
  const { data: works = [] } = useWorks();
  const queryClient = useQueryClient();
  const cancelRef = useRef(false);

  const booksWithoutCover = useMemo(
    () => works.filter(w => w.type === "livre" && !w.cover_image),
    [works]
  );

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);

  const runEnrichment = async (books) => {
    setRunning(true);
    setResult(null);
    setDiagnostics([]);
    cancelRef.current = false;

    let found = 0;
    let noImage = 0;
    let limited = 0;
    let errors = 0;
    const diagItems = [];

    for (let i = 0; i < books.length; i++) {
      if (cancelRef.current) break;
      const book = books[i];
      const author = book.creator || book.creator_name || "";
      const isDiag = i < 3;

      try {
        // 1. Open Library first
        let image = await fetchCoverOpenLibrary(book.title, author);

        // 2. Google Books fallback
        let isLimited = false;
        let isNetworkError = false;
        if (!image) {
          const gResult = await fetchCoverGoogle(book.title, author);
          image = gResult.image;
          isLimited = gResult.limited;
          isNetworkError = gResult.networkError;
        }

        if (isDiag) {
          diagItems.push({
            title: book.title,
            image: image ? image.slice(0, 60) + "…" : null,
            limited: isLimited,
          });
          setDiagnostics([...diagItems]);
        }

        if (image) {
          await base44.entities.Works.update(book.id, { cover_image: image });
          found++;
        } else if (isLimited) {
          limited++;
        } else if (isNetworkError) {
          errors++;
        } else {
          noImage++;
        }
      } catch {
        errors++;
      }

      setProgress({ done: i + 1, total: books.length });
      if (i < books.length - 1) await sleep(PAUSE_MS);
    }

    queryClient.invalidateQueries({ queryKey: WORKS_KEY });
    queryClient.invalidateQueries({ queryKey: ["works-all"] });
    setResult({ found, noImage, limited, errors });
    setRunning(false);
  };

  const handleEnrichAll = () => runEnrichment(booksWithoutCover);
  const handleEnrichTest = () => runEnrichment(booksWithoutCover.slice(0, 20));
  const handleCancel = () => { cancelRef.current = true; };

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-[12px] flex items-center justify-center" style={{ backgroundColor: "#6366F110" }}>
          <BookImage className="w-5 h-5" style={{ color: "#6366F1" }} />
        </div>
        <div>
          <h1 className="text-[20px] font-bold" style={{ color: "var(--text-primary)" }}>Enrichissement des couvertures</h1>
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>Open Library en priorité, Google Books en secours</p>
        </div>
      </div>

      {/* Counter card */}
      <div
        className="rounded-[14px] p-6 mb-6 flex items-center gap-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="text-[40px] font-bold" style={{ color: "#6366F1" }}>
          {booksWithoutCover.length}
        </div>
        <div>
          <p className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
            livre{booksWithoutCover.length !== 1 ? "s" : ""} sans couverture
          </p>
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            sur {works.filter(w => w.type === "livre").length} livres au total
          </p>
        </div>
      </div>

      {/* Action buttons */}
      {booksWithoutCover.length > 0 && !running && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleEnrichTest}
            className="flex-1 py-3 rounded-[12px] text-[13px] font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "var(--surface)", color: "#6366F1", border: "2px solid #6366F1" }}
          >
            Tester sur 20 livres
          </button>
          <button
            onClick={handleEnrichAll}
            className="flex-1 py-3 rounded-[12px] text-[13px] font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "#6366F1", color: "#fff" }}
          >
            Chercher les couvertures
          </button>
        </div>
      )}

      {/* Progress */}
      {running && (
        <div
          className="rounded-[14px] p-6 text-center mb-6"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          {progress && (
            <p className="text-[22px] font-bold mb-1" style={{ color: "#6366F1" }}>
              {progress.done} / {progress.total}
            </p>
          )}
          <p className="text-[13px] mb-3" style={{ color: "var(--text-muted)" }}>Recherche en cours…</p>
          {progress && (
            <div className="mb-4 rounded-full overflow-hidden h-2" style={{ backgroundColor: "var(--border)" }}>
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.done / progress.total) * 100}%`, backgroundColor: "#6366F1" }}
              />
            </div>
          )}
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-[10px] text-[12px] font-medium"
            style={{ backgroundColor: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            Arrêter
          </button>
        </div>
      )}

      {/* Diagnostics panel */}
      {diagnostics.length > 0 && (
        <div
          className="rounded-[14px] p-5 mb-6"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-[13px] font-bold mb-3" style={{ color: "var(--text-primary)" }}>
            Diagnostic — 3 premiers livres
          </p>
          <div className="space-y-2">
            {diagnostics.map((d, i) => (
              <div key={i} className="rounded-[10px] p-3 text-[11.5px]" style={{ backgroundColor: "var(--bg)" }}>
                <p className="font-semibold truncate mb-1" style={{ color: "var(--text-primary)" }}>{d.title}</p>
                {d.image
                  ? <span style={{ color: "#2AA6A0" }}>✓ Image trouvée : {d.image}</span>
                  : d.limited
                  ? <span style={{ color: "#F59E0B" }}>⚠ Rate-limited (429)</span>
                  : <span style={{ color: "var(--text-muted)" }}>✗ Aucune image</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div
          className="rounded-[14px] p-6"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-[16px] font-bold mb-3" style={{ color: "var(--text-primary)" }}>Résultat</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-[10px] p-4 text-center" style={{ backgroundColor: "rgba(99,102,241,0.08)" }}>
              <p className="text-[26px] font-bold" style={{ color: "#6366F1" }}>{result.found}</p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>ajoutées</p>
            </div>
            <div className="rounded-[10px] p-4 text-center" style={{ backgroundColor: "rgba(148,163,184,0.08)" }}>
              <p className="text-[26px] font-bold" style={{ color: "var(--text-secondary)" }}>{result.noImage}</p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>sans image</p>
            </div>
            <div className="rounded-[10px] p-4 text-center" style={{ backgroundColor: "rgba(245,158,11,0.08)" }}>
              <p className="text-[26px] font-bold" style={{ color: "#F59E0B" }}>{result.limited}</p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>limité (429)</p>
            </div>
            <div className="rounded-[10px] p-4 text-center" style={{ backgroundColor: "rgba(239,68,68,0.07)" }}>
              <p className="text-[26px] font-bold" style={{ color: "#EF4444" }}>{result.errors}</p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>erreurs réseau</p>
            </div>
          </div>
          {booksWithoutCover.length > 0 && (
            <div className="flex gap-3">
              <button
                onClick={handleEnrichTest}
                className="flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: "var(--bg)", color: "#6366F1", border: "2px solid #6366F1" }}
              >
                Tester sur 20
              </button>
              <button
                onClick={handleEnrichAll}
                className="flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: "#6366F1", color: "#fff" }}
              >
                Relancer tout
              </button>
            </div>
          )}
        </div>
      )}

      {booksWithoutCover.length === 0 && !running && (
        <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
          <p className="text-[14px]">Tous les livres ont déjà une couverture 🎉</p>
        </div>
      )}
    </div>
  );
}