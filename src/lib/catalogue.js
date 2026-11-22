import { effectiveStatus, matchesStatusFilter, STATUS_ALIASES } from "./statusActions.js";

export const SORT_OPTIONS = [
  { value: "-created_date", label: "Plus récents" },
  { value: "-year", label: "Année (récent → ancien)" },
  { value: "year", label: "Année (ancien → récent)" },
  { value: "-rating", label: "Mieux notés" },
  { value: "title", label: "Alphabétique" },
  { value: "relevance", label: "Pertinence" },
  { value: "urgent", label: "Urgents d’abord" },
];

const arrays = { status: "status", genre: "genre", platform: "platform", tags: "tag" };
const scalars = ["type", "year_min", "year_max", "min_rating", "priority"];

export function defaultSort(query) {
  return query?.trim() ? "relevance" : "-created_date";
}

export function readCatalogueFilters(params) {
  const filters = { favorite: params.get("favorite") === "1", sort: defaultSort(params.get("q")) };
  for (const key of scalars) filters[key] = params.get(key) || "";
  for (const [key, param] of Object.entries(arrays)) {
    const values = params.getAll(param).filter(Boolean);
    filters[key] = [...new Set(key === "status" ? values.map(value => STATUS_ALIASES[value] || value) : values)];
  }
  const sort = params.get("sort");
  if (SORT_OPTIONS.some(option => option.value === sort)) filters.sort = sort;
  return filters;
}

export const EMPTY_FILTERS = readCatalogueFilters(new URLSearchParams());

export function writeCatalogueFilters(params, filters) {
  const updated = new URLSearchParams(params);
  for (const key of [...scalars, "favorite", "sort", ...Object.values(arrays)]) updated.delete(key);
  for (const key of scalars) if (filters[key]) updated.set(key, filters[key]);
  for (const [key, param] of Object.entries(arrays)) {
    for (const value of filters[key] || []) updated.append(param, value);
  }
  if (filters.favorite) updated.set("favorite", "1");
  if (filters.sort && filters.sort !== defaultSort(updated.get("q"))) updated.set("sort", filters.sort);
  return updated;
}

export function normalizeCatalogueText(value) {
  return String(value ?? "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
    .replace(/œ/g, "oe").replace(/æ/g, "ae").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function closeWord(term, word) {
  if (Math.abs(term.length - word.length) > 1) return false;
  let index = 0;
  while (index < term.length && term[index] === word[index]) index++;
  const a = term.slice(index);
  const b = word.slice(index);
  if (a.length > b.length) return a.slice(1) === b;
  if (b.length > a.length) return b.slice(1) === a;
  return a.slice(1) === b.slice(1) ||
    (a[0] === b[1] && a[1] === b[0] && a.slice(2) === b.slice(2));
}

// Cache per immutable React Query work object. Updated rows receive new objects,
// so a changed title/tag/creator automatically gets a fresh search index.
const SEARCH_INDEX = new WeakMap();

function indexedWork(work) {
  let item = SEARCH_INDEX.get(work);
  if (item) return item;

  const title = normalizeCatalogueText(work.title);
  const tags = normalizeCatalogueText((work.tags || []).join(" "));
  const searchable = normalizeCatalogueText([
    work.title, work.creator, work.creator_name, work.type, work.year || work.released_year,
    ...(work.genre || []), ...(work.tags || []), work.platform, work.country,
  ].join(" "));
  const titleAndCreators = normalizeCatalogueText([work.title, work.creator, work.creator_name].join(" "));
  item = { title, tags, searchable, words: titleAndCreators.split(" ") };
  SEARCH_INDEX.set(work, item);
  return item;
}

export function searchCatalogue(works, query) {
  const text = normalizeCatalogueText(query);
  if (!text) return works;
  const terms = text.split(" ");
  const tagsOnly = query.trimStart().startsWith("#");
  const matches = [];

  for (const work of works) {
    const index = indexedWork(work);
    const searchable = tagsOnly ? index.tags : index.searchable;
    const exact = terms.every(term => searchable.includes(term));
    if (!exact && (tagsOnly || !terms.every(term =>
      searchable.includes(term) || (term.length >= 5 && index.words.some(word => closeWord(term, word)))
    ))) continue;

    const ranking = !exact ? 0 : index.title === text ? 4 :
      index.title.startsWith(text) ? 3 :
      terms.every(term => index.title.includes(term)) ? 2 : 1;
    matches.push({ work, ranking });
  }

  // Native stable sorting retains the original order for ties.
  matches.sort((a, b) => b.ranking - a.ranking);
  return matches.map(item => item.work);
}

export function hasPriority(work, priority) {
  if ((work.priority || "normal") !== priority) return false;
  const status = effectiveStatus(work);
  return status !== "Visionné" && status !== "Lu";
}

export function filterCatalogue(works, filters) {
  let result = works;
  if (filters.type) {
    result = result.filter(w => w.type === filters.type);
  }

  // Status: statut canonique unique (alias legacy + vocabulaire livre),
  // centralisé dans matchesStatusFilter (statusActions.js).
  if (filters.status?.length > 0) {
    result = result.filter(w => matchesStatusFilter(w, filters.status));
  }

  // Priorité (urgent / normal / plus tard) — on exclut les œuvres déjà
  // terminées : une priorité de visionnage ne concerne que ce qui reste à consommer.
  if (filters.priority) result = result.filter(work => hasPriority(work, filters.priority));

  // Genre: multi-select (OR logic within genre, AND between sections)
  if (filters.genre?.length > 0) {
    result = result.filter(w => filters.genre.some(g => (w.genre || []).includes(g)));
  }

  // Platform: multi-select
  if (filters.platform?.length > 0) {
    result = result.filter(w => {
      const wPlat = Array.isArray(w.platform) ? w.platform : (w.platform ? [w.platform] : []);
      return filters.platform.some(p => wPlat.includes(p));
    });
  }

  // Tags: multi-select
  if (filters.tags?.length > 0) {
    result = result.filter(w => filters.tags.some(t => (w.tags || []).includes(t)));
  }

  // Year range
  if (filters.year_min) result = result.filter(w => (w.year || w.released_year || 0) >= Number(filters.year_min));
  if (filters.year_max) result = result.filter(w => (w.year || w.released_year || 9999) <= Number(filters.year_max));

  if (filters.favorite) result = result.filter(w => w.favorite);
  if (filters.min_rating) result = result.filter(w => (w.rating || 0) >= filters.min_rating);

  return result;
}
