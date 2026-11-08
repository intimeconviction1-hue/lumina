import { IMG, tmdbJSON } from './tmdb.js';
import { resolveStudyLink } from './personStudyLink.js';

const OPEN_LIBRARY = 'https://openlibrary.org';
const pageSize = 1000;
const writerJobs = new Set(['Writer', 'Screenplay', 'Teleplay', 'Story', 'Original Story', 'Adaptation', 'Co-Writer', 'Series Writer', 'Scenario Writer', 'Dialogue', 'Script']);
const isCinemaId = id => /^\d{1,12}$/.test(id);
const isAuthorId = id => /^OL\d{1,12}A$/.test(id);
const yearOf = value => Number(String(value || '').match(/\b(?:18|19|20|21)\d{2}\b/)?.[0]) || null;
const textOf = value => typeof value === 'string' ? value : value?.value || '';

async function libraryJSON(path, params = {}) {
  const url = new URL(path, OPEN_LIBRARY);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error('Open Library indisponible.');
  return response.json();
}

function cinemaJSON(path, params) {
  if (!process.env.TMDB_API_KEY) {
    const error = new Error('Le catalogue cinéma nécessite la clé TMDB du projet Lumina.');
    error.status = 503;
    throw error;
  }
  return tmdbJSON(path, process.env.TMDB_API_KEY, params);
}

function cinemaWork(credit) {
  const movie = credit.media_type === 'movie';
  const date = movie ? credit.release_date : credit.first_air_date;
  const genres = credit.genre_ids || [];
  return {
    id: `${credit.media_type}:${credit.id}`,
    title: movie ? credit.title : credit.name,
    year: yearOf(date),
    type: genres.includes(99) ? 'documentaire' : movie ? 'film' : 'série',
    status: date && date > new Date().toISOString().slice(0, 10) ? 'Pas sorti' : 'À voir',
    cover_image: credit.poster_path ? IMG + credit.poster_path : null,
    description: credit.overview || null,
    source_url: `https://www.themoviedb.org/${credit.media_type}/${credit.id}`,
    roles: [],
  };
}

async function cinemaProfile(id) {
  const [person, credits] = await Promise.all([
    cinemaJSON(`/person/${id}`),
    cinemaJSON(`/person/${id}/combined_credits`),
  ]);
  const works = new Map();
  const add = (credit, role) => {
    if (!role || !['movie', 'tv'].includes(credit.media_type) || !isCinemaId(credit.id)) return;
    const work = cinemaWork(credit);
    if (!work.title) return;
    const existing = works.get(work.id) || work;
    if (!existing.roles.includes(role)) existing.roles.push(role);
    works.set(work.id, existing);
  };
  for (const credit of credits.cast || []) add(credit, 'acting');
  for (const credit of credits.crew || []) {
    add(credit, credit.job === 'Director' ? 'directing' : writerJobs.has(credit.job) ? 'writing' : credit.job === 'Creator' ? 'writing' : null);
  }
  return {
    id, name: person.name, bio: person.biography, image: person.profile_path ? IMG + person.profile_path : null,
    works: [...works.values()],
  };
}

async function authorProfile(id) {
  const path = `/authors/${id}/works.json`;
  const [author, first] = await Promise.all([
    libraryJSON(`/authors/${id}.json`),
    libraryJSON(path, { limit: pageSize }),
  ]);
  const entries = first.entries || [];
  if (!entries.length && first.size > 0) throw new Error('Bibliographie indisponible.');
  const step = entries.length;
  const remaining = Math.ceil((first.size || step) / (step || 1)) - 1;
  for (let i = 0; i < remaining; i += 3) {
    const count = Math.min(3, remaining - i);
    const pages = await Promise.all(Array.from({ length: count }, (_, offset) =>
      libraryJSON(path, { limit: step, offset: step * (i + offset + 1) })
    ));
    for (const page of pages) entries.push(...(page.entries || []));
  }
  const unique = new Map();
  for (const book of entries) {
    if (!/^\/works\/OL\d{1,12}W$/.test(book.key) || !book.title) continue;
    const cover = book.covers?.find(id => Number.isInteger(id) && id > 0);
    unique.set(book.key, {
      id: book.key.slice('/works/'.length),
      title: book.title,
      year: yearOf(book.first_publish_date),
      type: 'livre',
      status: 'Envie de lire',
      cover_image: cover ? `https://covers.openlibrary.org/b/id/${cover}-M.jpg` : null,
      description: textOf(book.description) || null,
      source_url: OPEN_LIBRARY + book.key,
      roles: ['author'],
    });
  }
  return {
    id, name: author.name, bio: textOf(author.bio),
    image: author.photos?.[0] > 0 ? `https://covers.openlibrary.org/a/id/${author.photos[0]}-M.jpg` : null,
    works: [...unique.values()],
  };
}

export function validStudyId(catalogue, id) {
  return typeof id === 'string' && (
    (catalogue === 'cinema' && isCinemaId(id)) || (catalogue === 'books' && isAuthorId(id))
  );
}

export async function studyProfile(catalogue, id) {
  const profile = catalogue === 'cinema' ? await cinemaProfile(id) : await authorProfile(id);
  profile.works.sort((a, b) => (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title, 'fr'));
  return profile;
}

async function searchPeople(catalogue, q) {
  if (catalogue === 'books') {
    const data = await libraryJSON('/search/authors.json', { q, limit: 10 });
    return (data.docs || []).filter(item => isAuthorId(item.key) && item.name).slice(0, 10).map(item => ({
      id: item.key, name: item.name, detail: item.top_work || item.birth_date,
    }));
  }
  const data = await cinemaJSON('/search/person', { query: q, include_adult: 'false' });
  return (data.results || []).filter(item => isCinemaId(item.id) && item.name).slice(0, 10).map(item => ({
    id: String(item.id), name: item.name, detail: item.known_for?.map(work => work.title || work.name).filter(Boolean).join(' · '),
    image: item.profile_path ? IMG + item.profile_path : null,
  }));
}

export default async function personStudies(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }
  const { catalogue, id, q, url } = req.query;
  if (!['cinema', 'books'].includes(catalogue)) return res.status(400).json({ error: 'Catalogue inconnu.' });
  if (typeof url === 'string' && url.length <= 4096) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      return res.json(await resolveStudyLink(url, catalogue));
    } catch {
      return res.status(422).json({ error: 'Impossible de reconnaître un nom dans ce lien. Saisis directement le nom de la personne.' });
    }
  }
  try {
    if (validStudyId(catalogue, id)) return res.json(await studyProfile(catalogue, id));
    if (typeof q === 'string' && q.trim().length >= 2 && q.length <= 120) {
      return res.json(await searchPeople(catalogue, q.trim()));
    }
    return res.status(400).json({ error: 'Indique un nom ou une personne valide.' });
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.status ? error.message : 'Le catalogue est momentanément indisponible.' });
  }
}
