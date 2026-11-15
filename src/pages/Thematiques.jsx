import { Scale } from "lucide-react";
import { useMemo } from "react";
import WorksGrid from "@/components/works/WorksGrid";
import WorksLoadError from "@/components/works/WorksLoadError";
import { useWorks } from "@/hooks/useWorks";
import { useWorkMutations } from "@/hooks/useWorkMutations";
import { statusPatch } from "@/lib/statusActions";
import { isProcesJustice } from "@/lib/thematiques";

export default function Thematiques({ onEditWork, onDeleteWork }) {
  const { data, isLoading, isError, isFetching, refetch } = useWorks();
  const { updateWork } = useWorkMutations();
  const works = useMemo(() => (data || []).filter(isProcesJustice)
    .sort((a, b) => a.title.localeCompare(b.title, "fr")), [data]);

  if (isError) return <WorksLoadError retry={refetch} retrying={isFetching} />;

  return (
    <section className="mx-auto max-w-6xl space-y-5" aria-labelledby="theme-title">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Thématiques</h1>
        <h2 id="theme-title" className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          <Scale className="h-6 w-6 shrink-0" aria-hidden="true" /> Procès / Justice
        </h2>
        <p className="text-sm" role="status" style={{ color: "var(--text-secondary)" }}>
          {isLoading ? "Chargement…" : `${works.length} film${works.length === 1 ? "" : "s"}`}
        </p>
        <a className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          href="https://www.senscritique.com/liste/coupable_ou_non_coupable/176872"
          target="_blank" rel="noreferrer">Liste d’origine sur SensCritique</a>
      </header>
      {!isLoading && (
        <WorksGrid
          works={works}
          onEdit={onEditWork}
          onDelete={onDeleteWork}
          onToggleFavorite={work => updateWork(work.id, { favorite: !work.favorite })}
          onStatusChange={(work, status) => updateWork(work.id, statusPatch(work, status))}
          emptyMessage="Aucun film dans cette thématique"
        />
      )}
    </section>
  );
}
