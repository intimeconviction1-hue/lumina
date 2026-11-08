import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, Clapperboard, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorks } from "@/hooks/useWorks";
import { useWorkMutations } from "@/hooks/useWorkMutations";
import { effectiveStatus, isFinished } from "@/lib/statusActions";

const roles = { directing: "Réalisation", acting: "Interprétation", writing: "Scénario / Création", author: "Auteur" };
const panel = { backgroundColor: "var(--card-bg)", borderColor: "var(--border)" };
const secondary = { color: "var(--text-secondary)" };
const normalize = text => String(text || "").trim().toLowerCase();
const isLink = value => /^(?:https?:\/\/|www\.)/i.test(value);

async function getStudies(params, signal) {
  const query = new URLSearchParams({ mode: "person-studies", ...params });
  const response = await fetch(`/api/cover?${query}`, { signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Catalogue indisponible.");
  return data;
}

function CatalogueError({ query }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border p-4" style={panel}>
      <p>{query.error?.message}</p>
      <Button type="button" variant="outline" onClick={() => query.refetch()}>Réessayer</Button>
    </div>
  );
}

function StudyWorks({ person, catalogue }) {
  const { data: works = [] } = useWorks();
  const { create } = useWorkMutations();
  const [role, setRole] = useState("all");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState([]);
  const [addedIds, setAddedIds] = useState([]);
  const [message, setMessage] = useState("");

  const linked = useMemo(() => {
    const bySource = new Map(works.filter(work => work.source_url).map(work => [work.source_url, work]));
    const byTitle = new Map();
    for (const work of works) {
      const key = normalize(work.title);
      const candidates = byTitle.get(key) || [];
      candidates.push(work);
      byTitle.set(key, candidates);
    }
    return new Map(person.works.map(entry => [entry.id, bySource.get(entry.source_url) ||
      byTitle.get(normalize(entry.title))?.find(work =>
        entry.type === "livre"
          ? work.type === "livre" && normalize(work.creator || work.creator_name) === normalize(person.name)
          : entry.year && Number(work.year || work.released_year) === entry.year
            && (work.type === entry.type || ["documentaire", "vidéo"].includes(work.type)
              || (entry.type === "documentaire" && ["film", "série"].includes(work.type)))
      )]));
  }, [works, person]);
  const availableRoles = Object.keys(roles).filter(key => person.works.some(work => work.roles.includes(key)));
  const scoped = person.works.filter(work => role === "all" || work.roles.includes(role));
  const visible = scoped.filter(work => normalize(work.title).includes(normalize(filter)));
  const added = new Set(addedIds);
  const known = work => Boolean(linked.get(work.id) || added.has(work.id));
  const candidates = scoped.filter(work => !known(work));
  const visibleCandidates = visible.filter(work => !known(work));
  const visibleIds = new Set(visibleCandidates.map(work => work.id));
  const selectedVisible = selected.filter(id => visibleIds.has(id));
  const finished = scoped.filter(work => linked.get(work.id) && isFinished(linked.get(work.id))).length;

  const add = async ids => {
    setMessage("");
    try {
      const { added, skipped } = await create.mutateAsync({ personStudy: { catalogue, personId: person.id, workIds: ids } });
      setAddedIds(current => [...new Set([...current, ...ids])]);
      setSelected(current => current.filter(id => !ids.includes(id)));
      setMessage(`${added} œuvre${added === 1 ? " ajoutée" : "s ajoutées"}${skipped ? ` · ${skipped} déjà dans la bibliothèque` : ""}.`);
    } catch (error) {
      setMessage(error.message || "L’ajout a échoué.");
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border p-4 sm:p-6" style={panel}>
        <div className="flex items-start gap-4">
          {person.image ? <img src={person.image} alt="" className="h-24 w-16 shrink-0 rounded-lg object-cover sm:h-32 sm:w-24" />
            : <UserRound className="h-12 w-12 shrink-0" style={secondary} aria-hidden="true" />}
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider" style={secondary}>{catalogue === "books" ? "Bibliographie" : "Filmographie"}</p>
            <h2 className="mt-1 break-words text-xl font-bold sm:text-3xl">{person.name}</h2>
            <p className="mt-2 text-sm" style={secondary}>
              {scoped.length} œuvre{scoped.length === 1 ? "" : "s"} · {scoped.length - candidates.length} en bibliothèque · {finished} terminée{finished === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {person.bio && (
          <details className="mt-4 text-sm" style={secondary}>
            <summary className="cursor-pointer font-semibold">Biographie</summary>
            <p className="mt-2 whitespace-pre-line">{person.bio}</p>
          </details>
        )}
      </div>

      <div className="space-y-3 rounded-xl border p-3 sm:p-4" style={panel}>
        {availableRoles.length > 1 && (
          <div className="flex flex-wrap gap-2" aria-label="Filtrer les rôles">
            {["all", ...availableRoles].map(key => (
              <Button key={key} type="button" size="sm" variant={role === key ? "default" : "outline"}
                aria-pressed={role === key} onClick={() => { setRole(key); setSelected([]); }}>
                {key === "all" ? "Tous les rôles" : roles[key]}
              </Button>
            ))}
          </div>
        )}
        <Input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Filtrer les titres" aria-label="Filtrer les titres" />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled={create.isPending || !candidates.length}
            onClick={() => add(candidates.map(work => work.id))}>
            {create.isPending ? "Ajout en cours…" : `Tout ajouter (${candidates.length})`}
          </Button>
          <Button type="button" variant="outline" disabled={create.isPending || !selectedVisible.length}
            onClick={() => add(selectedVisible)}>
            Ajouter la sélection ({selectedVisible.length})
          </Button>
          {visibleCandidates.length > 1 && (
            <button type="button" className="px-2 py-2 text-xs font-semibold underline" disabled={create.isPending}
              onClick={() => setSelected(selectedVisible.length === visibleCandidates.length ? [] : visibleCandidates.map(work => work.id))}>
              {selectedVisible.length === visibleCandidates.length ? "Tout décocher" : "Cocher les titres affichés"}
            </button>
          )}
        </div>
        <p className="text-xs" style={secondary}>« Tout ajouter » importe les titres manquants du rôle sélectionné, même si la recherche masque certains titres.</p>
        {message && <p role="status" className="text-sm font-semibold">{message}</p>}
      </div>

      {!visible.length && <p className="py-4 text-sm" style={secondary}>Aucun titre à afficher.</p>}
      <ul className="grid gap-2 sm:grid-cols-2">
        {visible.map(work => {
          const saved = linked.get(work.id);
          return (
            <li key={work.id} className="flex min-w-0 items-center gap-3 rounded-xl border p-2.5" style={panel}>
              {!known(work) && (
                <input type="checkbox" aria-label={`Sélectionner ${work.title}`} checked={selected.includes(work.id)}
                  disabled={create.isPending} onChange={event => {
                    const checked = event.target.checked;
                    setSelected(current => checked ? [...current, work.id] : current.filter(id => id !== work.id));
                  }} />
              )}
              <div className="flex h-14 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md" style={{ backgroundColor: "var(--bg)" }}>
                {work.cover_image ? <img src={work.cover_image} alt="" loading="lazy" className="h-full w-full object-cover" />
                  : catalogue === "books" ? <BookOpen className="h-4 w-4" /> : <Clapperboard className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                {saved ? <Link className="break-words text-sm font-bold underline" to={`/WorkDetail?id=${encodeURIComponent(saved.id)}`}>{work.title}</Link>
                  : <p className="break-words text-sm font-bold">{work.title}</p>}
                <p className="text-xs" style={secondary}>{[work.year, work.type, ...work.roles.map(key => roles[key])].filter(Boolean).join(" · ")}</p>
                {known(work) && <p className="text-xs font-semibold" style={secondary}>{saved ? effectiveStatus(saved) : "En bibliothèque"}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs" style={secondary}>Catalogue {catalogue === "books" ? "Open Library" : "TMDB"}.</p>
    </section>
  );
}

export default function PersonStudies() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("catalogue") === "books" ? "books" : "cinema";
  const rawQuery = params.get("q") || "";
  const url = params.get("url") || "";
  const [draft, setDraft] = useState(url || rawQuery);
  useEffect(() => setDraft(url || rawQuery), [url, rawQuery]);

  const link = useQuery({
    queryKey: ["person-studies", tab, "link", url],
    queryFn: ({ signal }) => getStudies({ catalogue: tab, url }, signal),
    enabled: Boolean(url),
    retry: false,
  });
  const catalogue = link.data?.catalogue || tab;
  const q = link.data?.name || rawQuery;
  const id = link.data?.id || params.get("id") || "";
  const submitSearch = (value, target = catalogue) => {
    const query = value.trim();
    if (isLink(query)) {
      setParams({ catalogue: target, url: /^www\./i.test(query) ? `https://${query}` : query });
    } else {
      setParams({ catalogue: target, ...(query.length >= 2 ? { q: query } : {}) });
    }
  };
  const people = useQuery({
    queryKey: ["person-studies", catalogue, "search", q],
    queryFn: ({ signal }) => getStudies({ catalogue, q }, signal),
    enabled: q.length >= 2 && !id,
    retry: false,
  });
  const profile = useQuery({
    queryKey: ["person-studies", catalogue, "profile", id],
    queryFn: ({ signal }) => getStudies({ catalogue, id }, signal),
    enabled: Boolean(id),
    retry: false,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-3 py-5 sm:px-6" style={{ color: "var(--text-primary)" }}>
      <header>
        <p className="text-xs font-bold uppercase tracking-widest" style={secondary}>Bibliothèque</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-4xl">Études de personnes</h1>
        <p className="mt-2 text-sm" style={secondary}>Explore une filmographie ou une bibliographie et ajoute les œuvres à ta collection.</p>
      </header>
      <div className="space-y-3 rounded-2xl border p-3 sm:p-4" style={panel}>
        <div className="flex flex-wrap gap-2">
          {[["cinema", "Cinéma et séries"], ["books", "Auteurs de livres"]].map(([key, label]) => (
            <Button key={key} type="button" size="sm" variant={catalogue === key ? "default" : "outline"} aria-pressed={catalogue === key}
              onClick={() => submitSearch(draft, key)}>{label}</Button>
          ))}
        </div>
        <form className="flex flex-wrap gap-2" onSubmit={event => {
          event.preventDefault();
          submitSearch(draft);
        }}>
          <Input value={draft} onChange={event => setDraft(event.target.value)} className="min-w-40 flex-1" maxLength={4096}
            placeholder="Saisir un nom ou coller un lien"
            aria-label="Nom ou lien de la personne"
            onPaste={event => {
              const value = event.clipboardData.getData("text").trim();
              if (!isLink(value) || value.length > 4096) return;
              event.preventDefault();
              setDraft(value);
              submitSearch(value);
            }} />
          <Button type="submit" disabled={draft.trim().length < 2 || (!isLink(draft.trim()) && draft.trim().length > 120)}>
            <Search className="mr-2 h-4 w-4" aria-hidden="true" /> Rechercher
          </Button>
        </form>
      </div>

      {link.isLoading && <p role="status" style={secondary}>Lecture du lien…</p>}
      {link.isError && <CatalogueError query={link} />}
      {link.data?.name && <p className="text-sm" style={secondary}>Nom repéré dans le lien <strong>{link.data.name}</strong></p>}
      {(people.isLoading || profile.isLoading) && <p role="status" style={secondary}>Chargement du catalogue…</p>}
      {id && profile.isError && <CatalogueError query={profile} />}
      {!id && people.isError && <CatalogueError query={people} />}
      {!id && people.isSuccess && (
        people.data.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {people.data.map(person => (
              <li key={person.id}>
                <button type="button" className="flex h-full w-full items-center gap-3 rounded-xl border p-3 text-left" style={panel}
                  onClick={() => setParams({ catalogue, q, id: person.id })}>
                  {person.image && <img src={person.image} alt="" className="h-12 w-9 rounded object-cover" />}
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{person.name}</span>
                    {person.detail && <span className="block text-xs" style={secondary}>{person.detail}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p style={secondary}>Aucune personne trouvée pour « {q} ».</p>
      )}
      {id && profile.data && <StudyWorks key={`${catalogue}:${id}`} person={profile.data} catalogue={catalogue} />}
    </div>
  );
}
