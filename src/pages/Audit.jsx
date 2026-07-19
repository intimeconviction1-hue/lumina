import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useWorks } from "@/hooks/useWorks";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { STATUSES } from "@/lib/statusActions";

const VALID_TYPES = ["film", "série", "livre", "documentaire", "podcast", "vidéo", "article"];
// "Lu" est un statut stocké légitime (livres terminés) même s'il n'est pas dans STATUSES
// (liste du formulaire) — on l'accepte ici pour ne pas signaler les livres à tort.
const VALID_STATUSES = [...STATUSES, "Lu"];

function Section({ title, works, emptyMsg, badStatusSummary }) {
  if (works.length === 0) {
    return (
      <div className="rounded-[12px] p-4" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle className="w-4 h-4" style={{ color: "#2AA6A0" }} />
          <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{title}</span>
          <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#2AA6A018", color: "#2AA6A0" }}>0</span>
        </div>
        <p className="text-[12px] pl-6" style={{ color: "var(--text-muted)" }}>{emptyMsg}</p>
      </div>
    );
  }
  return (
    <div className="rounded-[12px] p-4" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4" style={{ color: "#E56B3A" }} />
        <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{title}</span>
        <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#E56B3A18", color: "#E56B3A" }}>{works.length}</span>
      </div>
      {badStatusSummary && badStatusSummary.length > 0 && (
        <div className="pl-6 mb-3 flex flex-wrap gap-1.5">
          {badStatusSummary.map(([status, count]) => (
            <span key={status} className="text-[11.5px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(229,107,58,0.1)", color: "#E56B3A", border: "1px solid rgba(229,107,58,0.2)" }}>
              {status} : {count}
            </span>
          ))}
        </div>
      )}
      <ul className="space-y-1 pl-6">
        {works.map(w => (
          <li key={w.id}>
            <Link
              to={`/WorkDetail?id=${w.id}`}
              className="text-[12.5px] hover:underline"
              style={{ color: "#0B2545" }}
            >
              {w.title || <em style={{ color: "var(--text-muted)" }}>(sans titre)</em>}
              {w._extra && <span className="ml-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>{w._extra}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Audit() {
  const { data: works = [], isLoading } = useWorks();

  const checks = useMemo(() => {
    if (!works.length) return null;

    const noTitle = works.filter(w => !w.title || !w.title.trim());

    const badType = works.filter(w => !w.type || !VALID_TYPES.includes(w.type));

    const badStatus = works.filter(w => w.status && !VALID_STATUSES.includes(w.status));
    const badStatusCounts = {};
    badStatus.forEach(w => { badStatusCounts[w.status] = (badStatusCounts[w.status] || 0) + 1; });
    const badStatusSummary = Object.entries(badStatusCounts).sort((a, b) => b[1] - a[1]);

    const noYear = works.filter(w => !w.year && !w.released_year);

    const yearOnlyLegacy = works.filter(w => !w.year && w.released_year);

    const creatorOnlyLegacy = works.filter(w => !w.creator && w.creator_name);

    const noGenre = works.filter(w => !w.genre || w.genre.length === 0);

    const noTags = works.filter(w => !w.tags || w.tags.length === 0);

    const noCover = works.filter(w => !w.cover_image);

    // Doublons : même titre insensible à la casse
    const titleMap = {};
    works.forEach(w => {
      if (!w.title) return;
      const key = w.title.trim().toLowerCase();
      titleMap[key] = (titleMap[key] || []);
      titleMap[key].push(w);
    });
    const duplicates = Object.values(titleMap)
      .filter(arr => arr.length > 1)
      .flat()
      .map(w => ({ ...w, _extra: `(×${titleMap[w.title.trim().toLowerCase()].length})` }));

    return { noTitle, badType, badStatus, badStatusSummary, noYear, yearOnlyLegacy, creatorOnlyLegacy, noGenre, noTags, noCover, duplicates };
  }, [works]);

  const totalFlagged = useMemo(() => {
    if (!checks) return 0;
    const seen = new Set();
    Object.values(checks).forEach(arr => arr.forEach(w => seen.add(w.id)));
    return seen.size;
  }, [checks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="rounded-[14px] p-5" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
        <h1 className="text-[18px] font-bold mb-1" style={{ color: "var(--text-primary)" }}>Audit de la bibliothèque</h1>
        <p className="text-[12.5px]" style={{ color: "var(--text-muted)" }}>Lecture seule — aucune donnée n'est modifiée.</p>
        <div className="flex gap-4 mt-4">
          <div className="text-center">
            <p className="text-[22px] font-bold" style={{ color: "var(--text-primary)" }}>{works.length}</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>œuvres</p>
          </div>
          <div className="text-center">
            <p className="text-[22px] font-bold" style={{ color: totalFlagged > 0 ? "#E56B3A" : "#2AA6A0" }}>{totalFlagged}</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>fiches signalées</p>
          </div>
        </div>
      </div>

      {checks && (
        <>
          <Section title="Sans titre" works={checks.noTitle} emptyMsg="Toutes les fiches ont un titre." />
          <Section title="Type manquant ou invalide" works={checks.badType} emptyMsg="Tous les types sont valides." />
          <Section title="Statut invalide" works={checks.badStatus} emptyMsg="Tous les statuts sont valides." badStatusSummary={checks.badStatusSummary} />
          <Section title="Sans année (ni year ni released_year)" works={checks.noYear} emptyMsg="Toutes les fiches ont une année." />
          <Section title="Année uniquement dans released_year (champ legacy)" works={checks.yearOnlyLegacy} emptyMsg="Aucune fiche avec année uniquement en legacy." />
          <Section title="Créateur uniquement dans creator_name (champ legacy)" works={checks.creatorOnlyLegacy} emptyMsg="Aucune fiche avec créateur uniquement en legacy." />
          <Section title="Sans genre" works={checks.noGenre} emptyMsg="Toutes les fiches ont au moins un genre." />
          <Section title="Sans tags" works={checks.noTags} emptyMsg="Toutes les fiches ont au moins un tag." />
          <Section title="Sans couverture" works={checks.noCover} emptyMsg="Toutes les fiches ont une couverture." />
          <Section title="Doublons (même titre)" works={checks.duplicates} emptyMsg="Aucun doublon détecté." />
        </>
      )}
    </div>
  );
}